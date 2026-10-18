import { test, expect, type Page } from "@playwright/test";

// Maintenance mode against the mock API (tests/catalog-server.mjs).
const MOCK = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";

async function setMaintenance(page: Page, on: boolean, message = "") {
  await page.request.get(`${MOCK}/__test/maintenance?on=${on ? 1 : 0}&key=owner-key-123&message=${encodeURIComponent(message)}`);
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

test.describe.serial("maintenance mode", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setMaintenance(page, false);
    await page.close();
  });

  test("visitors get the 'back soon' screen with the owner's message", async ({ page }) => {
    await setMaintenance(page, true, "راجعين الساعة 6 مساءً");
    await page.goto(SITE + "/");
    const screen = page.getByTestId("maintenance-screen");
    await expect(screen).toBeVisible();
    await expect(screen.getByRole("heading", { name: "راجعين قريباً" })).toBeVisible();
    await expect(screen).toContainText("راجعين الساعة 6 مساءً");
    await expect(page.locator(".atelier-header, .cart-link").first()).toBeHidden();
    // A wrong key changes nothing.
    await page.goto(SITE + "/shop?preview=wrong");
    await expect(page.getByTestId("maintenance-screen")).toBeVisible();
  });

  test("the owner's preview link opens the site (and stays open on this device)", async ({ page }) => {
    await setMaintenance(page, true);
    await page.goto(SITE + "/?preview=owner-key-123");
    await expect(page.getByTestId("maintenance-preview")).toBeVisible();
    await expect(page.getByTestId("maintenance-screen")).toHaveCount(0);
    await expect(page).not.toHaveURL(/preview=/);
    await page.goto(SITE + "/shop");
    await expect(page.getByTestId("maintenance-preview")).toBeVisible();
    await page.getByRole("button", { name: "إنهاء المعاينة" }).click();
    await expect(page.getByTestId("maintenance-screen")).toBeVisible();
  });

  test("phone: the screen fits", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setMaintenance(page, true, "منحدّث المتجر وراجعين خلال ساعة.");
    await page.goto(SITE + "/");
    await expect(page.getByTestId("maintenance-screen")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: "/tmp/claude-0/shots/maint-phone.png" });
  });

  test("off: the site is back for everyone", async ({ page }) => {
    await setMaintenance(page, false);
    await page.goto(SITE + "/");
    await expect(page.getByTestId("maintenance-screen")).toHaveCount(0);
    await expect(page.locator(".cart-link").first()).toBeVisible();
  });
});
