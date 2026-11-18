import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// The shop as an app (admin → الإعدادات → التطبيق, header.app): off, a new store has no manifest and no worker; on,
// it has a manifest with its name, colours and icons, icons of the right sizes, a phone's own tags, a worker that
// opens pages seen before and the "no internet" page with no connection, and an offer to install it. Switched off
// again, the worker and what it kept go.

const API = "http://127.0.0.1:4100";
const APP = { enabled: true, shortName: "استبرق", themeColor: "#123456", prompt: "banner" };

async function setApp(request: Page["request"], app: Record<string, unknown>) {
  await request.post(`${API}/__test/app`, { data: app });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
/** The PNG's own width and height (its header). */
const pngSize = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];
/** The page once the worker has started and controls it. */
async function controlled(page: Page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 30000 }).toBe(true);
}
const offline = (context: BrowserContext, on: boolean) => context.setOffline(on);

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/app`, { data: {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

test("off, as a new store: no manifest, no worker, no offer", async ({ page, request }) => {
  await setApp(request, {});
  expect((await request.get("/manifest.webmanifest")).status()).toBe(404);
  await page.goto("/ar");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  await expect(page.getByTestId("app-install")).toHaveCount(0);
});

test("on: the manifest, the icons and a phone's own tags, in the store's name and colours", async ({ page, request }) => {
  await setApp(request, APP);
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/manifest+json");
  const m = await res.json();
  expect(m).toMatchObject({ name: "متجر استبرق", short_name: "استبرق", lang: "ar", dir: "rtl", start_url: "/", display: "standalone", theme_color: "#123456" });
  for (const icon of m.icons) {
    const png = await request.get(icon.src);
    expect(png.headers()["content-type"]).toBe("image/png");
    expect(pngSize(await png.body())).toEqual([Number(icon.sizes.split("x")[0]), Number(icon.sizes.split("x")[1])]);
  }
  expect((await request.get("/api/app-icon?size=100")).status()).toBe(400);

  await page.goto("/ar");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#123456");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /\/api\/app-icon\?size=180&purpose=any&c=123456&v=/);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "استبرق");
  const apple = await request.get((await page.locator('link[rel="apple-touch-icon"]').getAttribute("href"))!);
  expect(pngSize(await apple.body())).toEqual([180, 180]);
});

test("on: the worker opens pages seen before with no internet, and the store's own page for the others", async ({ page, context, request }) => {
  await setApp(request, APP);
  await page.goto("/ar");
  await controlled(page);
  const worker = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL ?? "");
  expect(worker).toMatch(/\/sw\.js\?v=[a-z0-9]+&langs=ar,en&dev=1$/);
  // The offline page is kept from the start, with its styles.
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some((k) => k.startsWith("shell-")))).toBe(true);
  await page.goto("/ar/about");
  await expect(page.locator("main")).toBeVisible();

  await offline(context, true);
  // Seen before: it opens from what was kept.
  await page.goto("/ar/about");
  await expect(page.getByTestId("offline-page")).toHaveCount(0);
  await expect(page.locator("main")).toBeVisible();
  // Never seen: the store's "no internet" page, under the address asked for.
  await page.goto("/ar/search?q=never-opened");
  await expect(page.getByTestId("offline-page")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("ما في إنترنت هلّق");
  expect(page.url()).toContain("/ar/search?q=never-opened");
  // The shopper's own pages are never kept.
  await page.goto("/ar/cart");
  await expect(page.getByTestId("offline-page")).toBeVisible();
  await offline(context, false);
});

test("on: the offer to install, once; closed, not again for a while", async ({ page, request }) => {
  await setApp(request, APP);
  await page.goto("/ar");
  const ask = () =>
    page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & Record<string, unknown>;
      e.prompt = () => ((window as unknown as { asked: boolean }).asked = true, Promise.resolve());
      e.userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(e);
    });
  await page.waitForTimeout(500);
  await ask();
  const banner = page.getByTestId("app-install");
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute("data-kind", "banner");
  await expect(banner).toContainText("استبرق على شاشتك");
  await page.getByTestId("app-install-go").click();
  expect(await page.evaluate(() => (window as unknown as { asked?: boolean }).asked)).toBe(true);
  await expect(banner).toHaveCount(0);

  // Closed: not offered again on the next visit.
  await page.reload();
  await page.waitForTimeout(500);
  await ask();
  await expect(banner).toBeVisible();
  await page.getByTestId("app-install-close").click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(500);
  await ask();
  await page.waitForTimeout(300);
  await expect(banner).toHaveCount(0);

  // The small button, in English.
  await setApp(request, { ...APP, prompt: "button" });
  await page.evaluate(() => localStorage.removeItem("shop-app-install-closed"));
  await page.goto("/en");
  await page.waitForTimeout(500);
  await ask();
  await expect(page.getByTestId("app-install")).toHaveAttribute("data-kind", "button");
  await expect(page.getByTestId("app-install-go")).toContainText("Install the app");
});

test("switched off again: the worker and what it kept go", async ({ page, request }) => {
  await setApp(request, APP);
  await page.goto("/ar");
  await controlled(page);
  await setApp(request, {});
  await page.reload();
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), { timeout: 15000 }).toBe(0);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((k) => /^(shell-|pages-v|assets-v)/.test(k)).length)).toBe(0);
  expect((await request.get("/manifest.webmanifest")).status()).toBe(404);
});
