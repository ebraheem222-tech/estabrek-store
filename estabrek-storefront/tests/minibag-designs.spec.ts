import { expect, test, type Page } from "@playwright/test";

// The small bag in one of its 100 designs (admin → الإعدادات → السلة والدفع; lib/miniBagDesigns.ts).
const API = "http://127.0.0.1:4100";
const refresh = async (page: Page) => {
  const r = await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["settings", "cms:bootstrap"] } });
  expect(r.ok()).toBe(true);
};
const setBag = async (page: Page, data: { design?: string; onIcon?: boolean }) => {
  await page.request.post(`${API}/__test/minibag`, { data });
  await refresh(page);
};
const addToBag = (page: Page) => page.getByRole("button", { name: /أضيفي للحقيبة|Add to bag/ }).first().click();
const dialogOf = (page: Page) => page.getByRole("dialog", { name: /حقيبتكِ|Your bag/ });

test.describe("the small bag's designs", () => {
  test.afterEach(async ({ page }) => {
    await page.request.get(`${API}/__test/delivery?on=0`);
    await setBag(page, {});
  });

  test("the design picked in the admin: adding a piece opens the bag in it, and it works as the bag does", async ({ page }) => {
    await setBag(page, { design: "pearl" });
    await page.goto("/p/rose-dress");
    await addToBag(page);
    const bag = page.locator('.mb[data-mb="pearl"]');
    await expect(bag).toHaveAttribute("data-open", "true", { timeout: 15000 });
    await expect(bag).toHaveAttribute("data-mb-place", "float");
    await expect(bag).toHaveAttribute("data-mb-tone", "glass");
    // The bag as it always was is not drawn beside it.
    await expect(page.locator(".rose-minibag-panel")).toHaveCount(0);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".mb-title strong")).toContainText(/انضافت|Added/);
    await expect(dialog.locator("li[data-fresh]")).toHaveCount(1);
    await expect(dialog.locator("li[data-fresh] strong")).toContainText("فستان الورد");
    await expect(dialog.locator(".mb-total strong")).not.toHaveText("—");
    // A card near the top of the page, not the whole height.
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeLessThan(40);
    expect(box.width).toBeLessThanOrEqual(421);
    expect(box.height).toBeLessThan(page.viewportSize()!.height - 100);
    // Glass: frosted.
    expect(await dialog.evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("blur");
    // A card at the top leaves the screen's foot to the floating helpers, as the bag always did.
    await expect(page.locator("html")).not.toHaveAttribute("data-ui-bag-tall", "true");
    await dialog.getByRole("button", { name: /قطعة كمان|One more/ }).click();
    await expect(dialog.locator("li[data-fresh] output")).toHaveText("2");
    await expect(page.locator(".atelier-cart-count")).toHaveText("2");
    await page.keyboard.press("Escape");
    await expect(bag).not.toHaveAttribute("data-open", "true");
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    // Again, then checkout: the bag page.
    await addToBag(page);
    await expect(bag).toHaveAttribute("data-open", "true");
    await dialog.getByRole("link", { name: /إتمام الطلب|Checkout/ }).click();
    await expect(page).toHaveURL(/\/cart$/, { timeout: 60000 });
    await expect(bag).not.toHaveAttribute("data-open", "true");
  });

  test("a drawer the bag's full height; on a phone, a card becomes a sheet from the bottom", async ({ page }) => {
    await setBag(page, { design: "silk" });
    await page.goto("/p/rose-dress");
    await addToBag(page);
    const dialog = dialogOf(page);
    await expect(page.locator('.mb[data-mb="silk"]')).toHaveAttribute("data-open", "true", { timeout: 15000 });
    const side = (await dialog.boundingBox())!;
    expect(side.y).toBe(0);
    expect(Math.round(side.height)).toBe(page.viewportSize()!.height);
    // Reaching the screen's foot, the floating helpers step aside while it is open.
    await expect(page.locator("html")).toHaveAttribute("data-ui-bag-tall", "true");
    const helper = page.locator(".a11y-fab").first();
    if (await helper.count()) await expect(helper).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveAttribute("data-ui-bag-tall", "true");

    await setBag(page, { design: "pearl" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/p/rose-dress");
    await addToBag(page);
    await expect(page.locator('.mb[data-mb="pearl"]')).toHaveAttribute("data-open", "true", { timeout: 15000 });
    await expect.poll(async () => {
      const b = (await dialog.boundingBox())!;
      return [Math.round(b.x), Math.round(b.width), Math.round(b.y + b.height)];
    }).toEqual([0, 390, 844]);
  });

  test("free delivery: how much more, on the designs that show it", async ({ page }) => {
    await page.request.get(`${API}/__test/delivery?on=1`);
    await setBag(page, { design: "silk" });
    await page.goto("/p/rose-dress");
    await addToBag(page);
    const free = dialogOf(page).getByTestId("minibag-free");
    await expect(free).toBeVisible({ timeout: 15000 });
    await expect(free).toContainText(/كمان والتوصيل علينا|more for free delivery/);
    const width = await free.locator(".mb-free-bar > i").evaluate((el) => (el as HTMLElement).style.width);
    expect(parseInt(width, 10)).toBeGreaterThan(0);
    expect(parseInt(width, 10)).toBeLessThan(100);
  });

  test("taking a piece out (designs with a remove button), down to the empty bag", async ({ page }) => {
    await setBag(page, { design: "ledger" });
    await page.goto("/p/rose-dress");
    await addToBag(page);
    const dialog = dialogOf(page);
    await expect(dialog.locator(".mb-line")).toHaveCount(1, { timeout: 15000 });
    // A receipt: no photos.
    await expect(dialog.locator(".mb-pic img")).toHaveCount(0);
    await dialog.getByRole("button", { name: /إزالة|Remove/ }).click();
    await expect(dialog.locator(".mb-line")).toHaveCount(0);
    await expect(dialog.locator(".mb-empty")).toContainText(/فاضية|empty/);
    await expect(dialog.getByRole("link", { name: /تسوّقي من المتجر|Shop the store/ })).toHaveAttribute("href", /\/shop$/);
  });

  test("the bag icon at the top opens the small bag when the owner chose so, and the bag page when not", async ({ page }) => {
    await setBag(page, { design: "receipt", onIcon: true });
    await page.goto("/shop");
    await page.locator(".atelier-header .cart-link").click();
    const bag = page.locator('.mb[data-mb="receipt"]');
    await expect(bag).toHaveAttribute("data-open", "true", { timeout: 15000 });
    await expect(page).toHaveURL(/\/shop$/);
    // Nothing was just added: the bag's own title.
    await expect(dialogOf(page).locator(".mb-title strong")).toHaveText(/حقيبتكِ|حقيبتك|Your bag/);
    await page.keyboard.press("Escape");

    await setBag(page, { design: "receipt" });
    await page.goto("/shop");
    await page.locator(".atelier-header .cart-link").click();
    await expect(page).toHaveURL(/\/cart$/, { timeout: 60000 });
  });

  test("?miniBag= opens that design at once (the admin's «شوفها على متجري»), whatever is saved", async ({ page }) => {
    await page.goto("/shop?miniBag=midnight");
    const bag = page.locator('.mb[data-mb="midnight"]');
    await expect(bag).toHaveAttribute("data-open", "true", { timeout: 15000 });
    await expect(bag).toHaveAttribute("data-mb-tone", "night");
    // An unknown design: the bag as it always was, closed.
    await page.goto("/shop?miniBag=nope");
    await expect(page.locator(".mb")).toHaveCount(0);
    await expect(page.locator(".rose-minibag")).not.toHaveAttribute("data-open", "true");
  });
});
