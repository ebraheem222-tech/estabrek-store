import { expect, test, type Page } from "@playwright/test";

// Signing in with Google (admin → الزبائن → الدخول بحساب Google, header.signIn.google): off, the account page has the
// email code only and Google's script is never loaded; on, Google's own button is above the email form with the
// store's client ID, and the token it hands back signs the shopper in (or says why not). Google's script is played
// here (the page asks for it and gets a stand-in): nothing reaches Google.

const API = "http://127.0.0.1:4100";
const CLIENT = "123456789012-abcdefgh12345678.apps.googleusercontent.com";

/** Google Identity Services, played: a button that hands back `window.__credential` (a good one unless a test says). */
const FAKE_GSI = `
window.google = { accounts: { id: {
  initialize(o) { window.__gsi = o; },
  renderButton(el, opts) {
    window.__gsiButton = opts;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "Continue with Google";
    b.setAttribute("data-testid", "fake-google-button");
    b.onclick = () => window.__gsi.callback({ credential: window.__credential || "fixture-google-ok-credential" });
    el.appendChild(b);
  },
} } };`;

async function settings(page: Page, signIn: Record<string, unknown>) {
  await page.request.post(`${API}/__test/sign-in`, { data: signIn });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
async function playGoogle(page: Page) {
  const asked: string[] = [];
  await page.route("https://accounts.google.com/gsi/client", (route) => {
    asked.push(route.request().url());
    return route.fulfill({ contentType: "text/javascript", body: FAKE_GSI });
  });
  return asked;
}

test.beforeEach(async ({ page }) => {
  await page.request.get(`${API}/__test/customer-reset`);
  await page.request.get(`${API}/__test/accounts?on=1`);
});
test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/sign-in`, { data: {} });
  await request.get(`${API}/__test/accounts?on=0`);
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

test("off: the email code only, and Google's script is never asked for", async ({ page }) => {
  await settings(page, {});
  const asked = await playGoogle(page);
  await page.goto("/ar/account");
  await expect(page.getByTestId("account-signin")).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByTestId("google-sign-in")).toHaveCount(0);
  expect(asked).toEqual([]);
  // A client ID that isn't one keeps it off too.
  await settings(page, { google: { enabled: true, clientId: "my-client" } });
  await page.reload();
  await expect(page.getByTestId("account-signin")).toBeVisible();
  await expect(page.getByTestId("google-sign-in")).toHaveCount(0);
});

test("on: Google's button with the store's client ID above the email form; its token signs the shopper in", async ({ page }) => {
  await settings(page, { google: { enabled: true, clientId: CLIENT } });
  const asked = await playGoogle(page);
  await page.goto("/ar/account");
  await expect(page.getByTestId("fake-google-button")).toBeVisible();
  expect(asked).toHaveLength(1);
  expect(await page.evaluate(() => ({ client: (window as any).__gsi.client_id, ux: (window as any).__gsi.ux_mode, text: (window as any).__gsiButton.text, locale: (window as any).__gsiButton.locale }))).toEqual({ client: CLIENT, ux: "popup", text: "continue_with", locale: "ar" });
  await expect(page.getByTestId("account-or")).toContainText("أو بكود على الإيميل");
  // The email form is still there, under it.
  await expect(page.getByPlaceholder("name@example.com")).toBeVisible();
  await page.getByTestId("fake-google-button").click();
  await expect(page.getByTestId("account-home")).toBeVisible();
  await expect(page.getByTestId("account-home")).toContainText("google.shopper@example.com");
  // Signed in for real: a reload keeps it (the refresh cookie came with it).
  await page.reload();
  await expect(page.getByTestId("account-home")).toBeVisible();
});

test("a token that isn't Google's is refused, saying so; the email code stays", async ({ page }) => {
  await settings(page, { google: { enabled: true, clientId: CLIENT } });
  await playGoogle(page);
  await page.goto("/en/account");
  await expect(page.getByTestId("fake-google-button")).toBeVisible();
  await page.evaluate(() => ((window as any).__credential = "not-a-real-google-credential"));
  await page.getByTestId("fake-google-button").click();
  await expect(page.getByTestId("google-sign-in-error")).toHaveText("Signing in with Google didn't work this time. It can be tried again.");
  await expect(page.getByTestId("account-signin")).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gsiButton.locale)).toBe("en");
});
