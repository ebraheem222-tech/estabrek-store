import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// Notifications (the shop as an app, part two; admin → الإعدادات → التطبيق → الإشعارات, header.app.push): off, the
// shop never asks and its worker has no API address; on, it asks once after a while with its own small card (the
// browser's question only after the shopper's tap), subscribes with the shop's key and tells the API, which ties the
// phone to the shopper signed in on it; closed, the card waits a month; the account page's switch turns them on and
// off; and the worker shows what the API sends, with the app's icon and the store's mark. The browser's push service
// is played here (a subscription kept in the page's storage): nothing leaves this computer.

const API = "http://127.0.0.1:4100";
/** The install offer stays out of the way ("off"), so only the notifications card is ever on the screen. */
const APP = { enabled: true, shortName: "استبرق", prompt: "off", push: { enabled: true } };
const AFTER = 30_000;

async function setApp(request: Page["request"], app: Record<string, unknown>) {
  await request.post(`${API}/__test/app`, { data: app });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
type Said = { act: string; endpoint?: string; lang?: string; signedIn?: boolean; keys?: Record<string, string> };
const said = async (request: Page["request"]) => (await (await request.get(`${API}/__test/push-log`)).json()) as Said[];
const forget = (request: Page["request"]) => request.post(`${API}/__test/push-log`);

/** The browser's push service, played: PushManager keeps one subscription in the page's storage. */
function playPushService() {
  const KEY = "fake-push-sub";
  const endpoint = "https://fcm.googleapis.com/fcm/send/shop-spec";
  const sub = (key: ArrayBuffer) => ({
    endpoint,
    options: { applicationServerKey: key, userVisibleOnly: true },
    toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: "BPhoneKey", auth: "phoneSecret" } }),
    unsubscribe: async () => {
      localStorage.removeItem(KEY);
      return true;
    },
  });
  PushManager.prototype.getSubscription = async function () {
    const kept = localStorage.getItem(KEY);
    return (kept ? sub(Uint8Array.from(JSON.parse(kept) as number[]).buffer) : null) as never;
  };
  PushManager.prototype.subscribe = async function (opts?: PushSubscriptionOptionsInit) {
    const key = new Uint8Array(opts!.applicationServerKey as ArrayBuffer);
    localStorage.setItem(KEY, JSON.stringify([...key]));
    return sub(key.buffer) as never;
  };
}

async function phone(context: BrowserContext) {
  await context.grantPermissions(["notifications"]);
  await context.addInitScript(playPushService);
  const page = await context.newPage();
  await page.clock.install();
  return page;
}
async function controlled(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 30000 }).toBe(true);
}

test.beforeEach(async ({ request }) => {
  await forget(request);
});
test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/app`, { data: {} });
  await request.get(`${API}/__test/accounts?on=0`);
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

test("off: never asked, and the worker has no API address", async ({ browser, request }) => {
  await setApp(request, { ...APP, push: { enabled: false } });
  const context = await browser.newContext();
  const page = await phone(context);
  await page.goto("/ar");
  await controlled(page);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL ?? "")).not.toContain("api=");
  await page.clock.fastForward(AFTER);
  await page.waitForTimeout(500);
  await expect(page.getByTestId("push-ask")).toHaveCount(0);
  expect((await request.get(`${API}/v1/push/key`)).status()).toBe(404);
  expect(await said(request)).toEqual([]);
  await context.close();
});

test("on: asked once after a while; yes subscribes with the shop's key and tells the API; never asked again", async ({ browser, request }) => {
  await setApp(request, APP);
  const context = await browser.newContext();
  const page = await phone(context);
  await page.goto("/ar");
  await controlled(page);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL ?? "")).toContain("&api=http%3A%2F%2F127.0.0.1%3A4100%2Fv1");
  // Not straight away.
  await page.waitForTimeout(800);
  await expect(page.getByTestId("push-ask")).toHaveCount(0);
  await page.clock.fastForward(AFTER);
  const card = page.getByTestId("push-ask");
  await expect(card).toBeVisible();
  await expect(card).toContainText("إشعارات استبرق");
  await expect(card).toContainText("ووين صار الطلب");
  await page.getByTestId("push-ask-yes").click();
  await expect(page.getByTestId("push-ask-done")).toBeVisible();
  await expect.poll(() => said(request)).toEqual([{ act: "subscribe", endpoint: "https://fcm.googleapis.com/fcm/send/shop-spec", keys: { p256dh: "BPhoneKey", auth: "phoneSecret" }, lang: "ar", signedIn: false }]);
  // Subscribed with the shop's own key.
  const key = (await (await request.get(`${API}/v1/push/key`)).json()).key as string;
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("fake-push-sub") || "[]") as number[]);
  expect(Buffer.from(kept).toString("base64url")).toBe(key);
  await page.clock.fastForward(3000);
  await expect(card).toHaveCount(0);

  // Said yes: not asked again, and the API isn't told twice in one visit.
  await page.reload();
  await page.clock.fastForward(AFTER);
  await page.waitForTimeout(800);
  await expect(page.getByTestId("push-ask")).toHaveCount(0);
  expect((await said(request)).filter((s) => s.act === "subscribe")).toHaveLength(1);
  // A new visit: the API hears from the phone again (who is on it, its language).
  const again = await context.newPage();
  await again.goto("/en");
  await expect.poll(async () => (await said(request)).filter((s) => s.act === "subscribe").map((s) => s.lang)).toEqual(["ar", "en"]);
  // The shop's key made again (the server couldn't open the old one): on the next visit the phone says the same yes
  // with the new key, and nothing is asked.
  const renewed = (await (await request.post(`${API}/__test/push-key`)).json()).key as string;
  const third = await context.newPage();
  await third.clock.install();
  await third.goto("/ar");
  await expect.poll(async () => (await said(request)).filter((s) => s.act === "subscribe")).toHaveLength(3);
  expect(Buffer.from(await third.evaluate(() => JSON.parse(localStorage.getItem("fake-push-sub") || "[]") as number[])).toString("base64url")).toBe(renewed);
  await third.clock.fastForward(AFTER);
  await third.waitForTimeout(800);
  await expect(third.getByTestId("push-ask")).toHaveCount(0);
  await context.close();
});

test("closed: the card waits a month", async ({ browser, request }) => {
  await setApp(request, APP);
  const context = await browser.newContext();
  const page = await phone(context);
  await page.goto("/en");
  await controlled(page);
  await page.clock.fastForward(AFTER);
  await expect(page.getByTestId("push-ask")).toContainText("استبرق notifications");
  await page.getByTestId("push-ask-close").click();
  await expect(page.getByTestId("push-ask")).toHaveCount(0);
  await page.reload();
  await page.clock.fastForward(AFTER);
  await page.waitForTimeout(800);
  await expect(page.getByTestId("push-ask")).toHaveCount(0);
  expect(await said(request)).toEqual([]);
  await context.close();
});

test("the account page's switch: on and off on this phone, tied to the signed-in shopper; no card when the owner chose the account page", async ({ browser, request }) => {
  await request.get(`${API}/__test/customer-reset`);
  await request.get(`${API}/__test/accounts?on=1`);
  await setApp(request, { ...APP, push: { enabled: true, ask: "account" } });
  const context = await browser.newContext();
  const page = await phone(context);
  await page.goto("/ar/account");
  await controlled(page);
  await page.getByPlaceholder("name@example.com").fill("sara@example.com");
  await page.getByRole("button", { name: "ابعتيلي الكود" }).click();
  await page.getByPlaceholder("••••••").fill("123456");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page.getByTestId("account-home")).toBeVisible();
  await page.getByRole("tab", { name: "معلوماتي" }).click();
  const box = page.getByTestId("push-switch");
  await expect(box).toHaveAttribute("data-state", "off");
  await expect(box).toContainText("الإشعارات على هالجهاز");
  await page.getByTestId("push-switch-toggle").click();
  await expect(box).toHaveAttribute("data-state", "on");
  await expect(page.getByTestId("push-switch-toggle")).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await said(request)).filter((s) => s.act === "subscribe").map((s) => s.signedIn)).toEqual([true]);
  await page.getByTestId("push-switch-toggle").click();
  await expect(box).toHaveAttribute("data-state", "off");
  await expect.poll(async () => (await said(request)).map((s) => s.act)).toEqual(["subscribe", "unsubscribe"]);
  // The owner chose the account page: no card, however long the shopper stays.
  await page.clock.fastForward(AFTER);
  await page.waitForTimeout(800);
  await expect(page.getByTestId("push-ask")).toHaveCount(0);
  await context.close();
});

test("the worker shows what the API sends: its words, the app's icon and the store's small mark", async ({ browser, request }) => {
  await setApp(request, APP);
  const context = await browser.newContext();
  const page = await phone(context);
  await page.goto("/ar");
  await controlled(page);
  const cdp = await context.newCDPSession(page);
  const regs: Array<{ registrationId: string; scopeURL: string }> = [];
  cdp.on("ServiceWorker.workerRegistrationUpdated", (e: { registrations: Array<{ registrationId: string; scopeURL: string }> }) => regs.push(...e.registrations));
  await cdp.send("ServiceWorker.enable");
  await expect.poll(() => regs.length).toBeGreaterThan(0);
  const origin = new URL(page.url()).origin;
  const reg = regs.find((r) => r.scopeURL === `${origin}/`)!;
  // A browser with no screen (this one) shows nothing and lists nothing: what the worker asks to show is written down
  // inside the worker itself.
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  await sw.evaluate(() => {
    const me = self as unknown as { shown: unknown[]; registration: { showNotification: (t: string, o: Record<string, unknown>) => Promise<void> } };
    me.shown = [];
    me.registration.showNotification = async (title, opts) => void me.shown.push({ title, ...opts });
  });
  await cdp.send("ServiceWorker.deliverPushMessage", {
    origin,
    registrationId: reg.registrationId,
    data: JSON.stringify({ title: "خصم ٢٠٪ اليوم", body: "على كل الفساتين", url: "/ar/shop", tag: "m-cmspec12345", lang: "ar", dir: "rtl" }),
  });
  type Shown = { title: string; body: string; tag: string; lang: string; dir: string; data: unknown; icon: string; badge: string };
  const shown = () => sw.evaluate(() => (self as unknown as { shown: unknown[] }).shown) as Promise<Shown[]>;
  await expect.poll(shown, { timeout: 15000 }).toHaveLength(1);
  const [n] = await shown();
  expect(n).toMatchObject({ title: "خصم ٢٠٪ اليوم", body: "على كل الفساتين", tag: "m-cmspec12345", lang: "ar", dir: "rtl", data: { url: `${origin}/ar/shop`, id: "cmspec12345" } });
  expect(n.icon).toMatch(/\/api\/app-icon\?size=192&purpose=any&c=[0-9a-f]+&v=/);
  expect(n.badge).toMatch(/\/api\/app-icon\?size=96&purpose=badge&c=[0-9a-f]+&v=/);
  const badge = await request.get(new URL(n.badge, origin).href);
  expect(badge.headers()["content-type"]).toBe("image/png");
  const png = await badge.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([96, 96]);
  await context.close();
});
