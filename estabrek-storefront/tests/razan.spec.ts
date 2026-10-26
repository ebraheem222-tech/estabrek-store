import { test, expect, type Page } from "@playwright/test";

// Razan's settings from the admin (header.razan) against the mock API.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

async function setRazan(page: Page, razan: Record<string, unknown>) {
  await page.request.post(`${API}/__test/razan`, { data: razan });
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/razan`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

test("the owner can hide her", async ({ page }) => {
  await setRazan(page, { enabled: false });
  await page.goto("/p/rose-dress");
  await expect(page.locator(".rose-pdp-add").first()).toBeVisible();
  await expect(page.locator(".rose-companion")).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator(".hero-mascot")).toHaveCount(0);
});

test("her hello is the owner's text, and the bubble budget stops her talking", async ({ page }) => {
  await setRazan(page, { texts: { welcome: { ar: "هلا فيكِ يا قمر 🌸", en: "" } }, seasonal: { mode: "off" }, maxBubbles: 1 });
  await page.goto("/");
  const bubble = page.locator(".hero-mascot .rose-mascot-bubble");
  await expect(bubble).toHaveAttribute("data-show", "true", { timeout: 8000 });
  await expect(bubble).toContainText("هلا فيكِ يا قمر");
  // The one bubble of this visit is used: a colour pick makes her move, not talk.
  await page.waitForTimeout(3200);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#9fb3a1" })));
  await page.waitForTimeout(800);
  await expect(bubble).not.toContainText(/اللون|colour/);
});

test("quiet pages and her outfit rules", async ({ page }) => {
  await setRazan(page, { quietPaths: ["/p"], outfits: { default: "abaya", rules: [{ match: "فسات", outfit: "coat", pearls: false }] }, seasonal: { mode: "off" } });
  await page.goto("/p/rose-dress");
  const rose = page.locator(".rose-companion");
  await expect(rose).toHaveCount(1);
  await page.getByRole("button", { name: /أضيفي للحقيبة|Add to bag/ }).first().click();
  await page.waitForTimeout(1200);
  await expect(rose.locator(".rose-mascot-bubble")).not.toHaveAttribute("data-show", "true");
  await page.goto("/c/dresses");
  await expect(page.locator(".rose-companion .rose-mascot")).toHaveAttribute("data-outfit", "coat", { timeout: 8000 });
});

test("phones: the owner can keep her hidden there", async ({ page }) => {
  await setRazan(page, { phone: "hidden" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/rose-dress");
  await expect(page.locator(".rose-pdp-add").first()).toBeVisible();
  await expect(page.locator(".rose-companion")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/p/rose-dress");
  await expect(page.locator(".rose-companion")).toHaveCount(1);
});

test("the owner's preview link, and opening her panel is counted", async ({ page }) => {
  await setRazan(page, {});
  await page.goto("/?razan-preview=try-me-1234567890");
  const bar = page.getByTestId("razan-preview");
  await expect(bar).toBeVisible();
  await expect(page).not.toHaveURL(/razan-preview/);
  // The preview stays for the visit, until ended.
  await page.goto("/p/rose-dress");
  await expect(bar).toBeVisible();
  await page.locator(".rose-companion").getByRole("button", { name: /رزان|Rose/ }).first().click();
  await expect.poll(async () => (await (await page.request.get(`${API}/__test/razan-events`)).json())).toContain("open");
  await bar.getByRole("button", { name: "إنهاء المعاينة" }).click();
  await expect(bar).toHaveCount(0);
  await page.goto("/?razan-preview=expired-link");
  await expect(page.getByTestId("razan-preview")).toHaveCount(0);
});
