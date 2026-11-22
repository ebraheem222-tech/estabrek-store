import { expect, test, type Page } from "@playwright/test";

// Signing in with Discord and linking Steam (a game server's site; admin → الزبائن → الدخول بحساب Discord وربط Steam,
// header.signIn.discord / .steam). Off, the account page has neither. On: «ادخل بحساب Discord» goes through the shop's
// own route to Discord and back to its callback, which signs the shopper in, only in the browser that began it; signed
// in, Steam is linked the same way and unlinked. Discord's and Steam's pages are played here (they answer at once and
// send the shopper back): nothing reaches either.

const API = "http://127.0.0.1:4100";
const CLIENT = "1234567890123456789";

async function settings(page: Page, signIn: Record<string, unknown>) {
  await page.request.post(`${API}/__test/sign-in`, { data: signIn });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
/**
 * Discord's page, played: the shop's own start route runs for real, and where it sends the shopper (Discord, with the
 * one-time cookie it leaves) is caught there; Discord says yes or no at once and sends them back to the shop's callback
 * ("stop": stays on Discord's page). A browser follows a redirect without asking the test, so it is caught at the start.
 */
async function playDiscord(page: Page, answer: "yes" | "no" | "stop" = "yes") {
  const asked: URL[] = [];
  const links: string[] = [];
  await page.route("**/api/account/discord/start**", async (route) => {
    const res = await route.fetch({ maxRedirects: 0 });
    const to = new URL(res.headers()["location"]);
    if (to.origin !== "https://discord.com") return route.fulfill({ response: res });
    asked.push(to);
    const back = new URL(to.searchParams.get("redirect_uri")!);
    if (answer === "no") back.searchParams.set("error", "access_denied");
    else back.searchParams.set("code", "fixture-discord-ok-code");
    back.searchParams.set("state", to.searchParams.get("state")!);
    links.push(back.toString());
    const cookie = { "set-cookie": res.headers()["set-cookie"] ?? "" };
    if (answer === "stop") return route.fulfill({ status: 200, contentType: "text/html", headers: cookie, body: "<p>Discord</p>" });
    return route.fulfill({ status: 302, headers: { ...cookie, location: back.toString() } });
  });
  return { asked, links };
}
/** Steam's page, played: signed in there, it sends the shopper back with its answer. */
async function playSteam(page: Page) {
  await page.route("https://steamcommunity.com/openid/login**", (route) => {
    const u = new URL(route.request().url());
    const ret = u.searchParams.get("openid.return_to")!;
    const back = new URL(ret);
    const claimed = "https://steamcommunity.com/openid/id/76561198000000001";
    const answer = { "openid.ns": "http://specs.openid.net/auth/2.0", "openid.mode": "id_res", "openid.op_endpoint": "https://steamcommunity.com/openid/login", "openid.claimed_id": claimed, "openid.identity": claimed, "openid.return_to": ret, "openid.sig": "c2lnbmF0dXJl" };
    for (const [k, v] of Object.entries(answer)) back.searchParams.set(k, v);
    return route.fulfill({ status: 302, headers: { location: back.toString() } });
  });
}

test.beforeEach(async ({ page }) => {
  // Never Discord or Steam themselves.
  await page.context().route(/^https:\/\/(discord\.com|steamcommunity\.com)\//, (route) => route.abort());
  await page.request.get(`${API}/__test/customer-reset`);
  await page.request.get(`${API}/__test/accounts?on=1`);
});
test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/sign-in`, { data: {} });
  await request.get(`${API}/__test/accounts?on=0`);
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

test("off: no Discord on the account page", async ({ page }) => {
  await settings(page, {});
  await page.goto("/ar/account");
  await expect(page.getByTestId("account-signin")).toBeVisible();
  await expect(page.getByTestId("discord-sign-in")).toHaveCount(0);
  // A client ID that isn't one keeps it off too.
  await settings(page, { discord: { enabled: true, clientId: "my-app" } });
  await page.reload();
  await expect(page.getByTestId("account-signin")).toBeVisible();
  await expect(page.getByTestId("discord-sign-in")).toHaveCount(0);
});

test("on: to Discord and back through the shop's own callback, signed in; then Steam linked and unlinked", async ({ page }) => {
  await settings(page, { discord: { enabled: true, clientId: CLIENT }, steam: { enabled: true } });
  const { asked } = await playDiscord(page);
  await playSteam(page);
  await page.goto("/en/account");
  const button = page.getByTestId("discord-sign-in");
  await expect(button).toHaveText("Continue with Discord");
  await expect(page.getByTestId("account-or")).toBeVisible();
  await button.click();
  await expect(page.getByTestId("account-home")).toBeVisible();
  await expect(page.getByTestId("account-home")).toContainText("discord.player@example.com");
  // Discord was asked for this shop, to come back to its own callback.
  expect(asked).toHaveLength(1);
  expect(asked[0].searchParams.get("client_id")).toBe(CLIENT);
  expect(new URL(asked[0].searchParams.get("redirect_uri")!).pathname).toBe("/api/account/discord/callback");
  await expect(page.getByTestId("discord-account")).toContainText("Linked");
  // Signed in for real: a reload keeps it.
  await page.reload();
  await expect(page.getByTestId("account-home")).toBeVisible();

  await page.getByTestId("steam-link").click();
  await expect(page.getByTestId("steam-linked")).toHaveText("Your Steam account is linked.");
  await expect(page.getByTestId("steam-account")).toContainText("76561198000000001");
  expect(new URL(page.url()).searchParams.get("steam")).toBe("linked");
  await page.getByTestId("steam-account").getByRole("button", { name: "Unlink" }).click();
  await expect(page.getByTestId("steam-link")).toBeVisible();
});

test("said no on Discord's page: the account page says so, nobody signed in", async ({ page }) => {
  await settings(page, { discord: { enabled: true, clientId: CLIENT } });
  await playDiscord(page, "no");
  await page.goto("/en/account");
  await page.getByTestId("discord-sign-in").click();
  await expect(page.getByTestId("sign-in-problem")).toHaveText("Signing in with Discord wasn't finished. Signing in with an email code still works.");
  await expect(page.getByTestId("account-signin")).toBeVisible();
});

test("a sign-in begun in another browser never finishes here", async ({ page, browser }) => {
  await settings(page, { discord: { enabled: true, clientId: CLIENT } });
  // Begun here, but stopped on Discord's page: the link it would come back with is kept.
  const { links } = await playDiscord(page, "stop");
  await page.goto("/en/account");
  await page.getByTestId("discord-sign-in").click();
  await expect.poll(() => links.length).toBe(1);
  const link = links[0];
  // Someone else opens it (a new browser: the account page in the store's main language).
  const other = await browser.newContext();
  const theirs = await other.newPage();
  await theirs.goto(link);
  await expect(theirs.getByTestId("sign-in-problem")).toHaveText("هالرابط خلص وقته أو انستعمل قبل. ممكن نبلّش من جديد.");
  await expect(theirs.getByTestId("account-signin")).toBeVisible();
  await other.close();
});
