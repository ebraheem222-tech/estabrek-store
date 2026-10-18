import { test, expect, type Page } from "@playwright/test";

// "بلّغيني لما يرجع" against the mock API (tests/catalog-server.mjs): Berry L can be made sold out.
const MOCK = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";

async function setup(page: Page, opts: { on: boolean; soldOut: boolean; reset?: boolean }) {
  const res = await page.request.get(`${MOCK}/__test/stock-alerts?on=${opts.on ? 1 : 0}&soldOut=${opts.soldOut ? 1 : 0}&reset=${opts.reset ? 1 : 0}`);
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
  return (await res.json()).alerts as Array<{ email: string; variantId: string; status: string; token: string }>;
}

async function openBerryL(page: Page) {
  await page.goto(SITE + "/p/rose-dress");
  await page.locator(".rose-pdp-swatch[aria-label*='Berry']").click();
  return page.locator(".rose-pdp-sizes button", { hasText: "L" });
}

test.describe.serial("back-in-stock alert", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setup(page, { on: false, soldOut: false, reset: true });
    await page.close();
  });

  test("switched off (default): a sold-out size can't be picked and there's no form", async ({ page }) => {
    await setup(page, { on: false, soldOut: true, reset: true });
    const l = await openBerryL(page);
    await expect(l).toBeDisabled();
    await expect(page.getByTestId("stock-alert")).toHaveCount(0);
  });

  test("on: pick the sold-out size, leave an email, get a confirmation", async ({ page }) => {
    await setup(page, { on: true, soldOut: true, reset: true });
    const l = await openBerryL(page);
    await expect(l).toBeEnabled();
    await expect(l).toHaveClass(/sold-out/);
    await l.click();
    await expect(page.locator(".rose-pdp-add")).toBeDisabled();
    const form = page.getByTestId("stock-alert");
    await expect(form).toContainText("بلّغيني لما يرجع");
    await expect(form).toContainText("مقاس L");
    await form.getByPlaceholder("name@example.com").fill("sara@");
    await form.getByRole("button", { name: "بلّغيني" }).click();
    await expect(form.locator(".rose-form-error")).toContainText("إيميل صحيح");
    await form.getByPlaceholder("name@example.com").fill("Sara@Example.com");
    await form.getByRole("button", { name: "بلّغيني" }).click();
    await expect(page.getByTestId("stock-alert-done")).toContainText("Sara@Example.com");
    const alerts = await setup(page, { on: true, soldOut: true });
    expect(alerts).toEqual([expect.objectContaining({ email: "sara@example.com", variantId: "berry-l", status: "WAITING" })]);

    // An in-stock size has no form.
    await page.locator(".rose-pdp-sizes button", { hasText: "M" }).click();
    await expect(page.getByTestId("stock-alert")).toHaveCount(0);
    await expect(page.locator(".rose-pdp-add")).toBeEnabled();
  });

  test("the email's stop link stops it", async ({ page }) => {
    const [alert] = await setup(page, { on: true, soldOut: true });
    await page.goto(`${SITE}/stock-alert/stop?t=${alert.token}`);
    await page.getByRole("button", { name: "إيقاف هالتنبيه" }).click();
    await expect(page.getByRole("heading", { name: "وقّفنا التنبيه." })).toBeVisible();
    expect((await setup(page, { on: true, soldOut: true }))[0].status).toBe("CANCELLED");
    await page.goto(`${SITE}/stock-alert/stop?t=nope-nope-nope-nope`);
    await page.getByRole("button", { name: "إيقاف هالتنبيه" }).click();
    await expect(page.getByRole("heading", { name: "هالرابط ما عاد شغّال." })).toBeVisible();
  });

  test("phone: the form fits the screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page, { on: true, soldOut: true });
    const l = await openBerryL(page);
    await l.click();
    await expect(page.getByTestId("stock-alert")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.getByTestId("stock-alert").screenshot({ path: "/tmp/claude-0/shots/stock-alert-phone.png" });
  });
});
