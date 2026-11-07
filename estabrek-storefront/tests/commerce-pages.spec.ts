import { expect, test, type Page } from "@playwright/test";

async function configure(page: Page, patch = {}) {
  await page.request.post("http://127.0.0.1:4100/__test/commerce", { data: { on: true, ...patch } });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages", "cms:bootstrap", "settings"], paths: ["/shop", "/cart"] } });
}
test.beforeEach(async ({ page }) => { await configure(page); });
test.afterEach(async ({ page }) => { await configure(page, { on: false }); });

test("the editable shop keeps real search, sorting, and product purchase links", async ({ page }) => {
  await page.goto("/en/shop");
  const shop = page.locator('[data-tree-node="fixture-shop"]');
  await expect(shop).toBeVisible();
  await expect(shop.locator('[data-commerce-grid]')).toHaveAttribute("data-columns", "3");
  await expect(shop.locator('a[href*="/p/rose-hijab"]').first()).toBeVisible();
  const query = shop.getByRole("searchbox");
  await query.fill("فستان");
  await expect(shop.locator('a[href*="/p/rose-dress"]').first()).toBeVisible();
  await expect(shop.locator('a[href*="/p/rose-hijab"]')).toHaveCount(0);
  await shop.getByRole("combobox", { name: "Sort by" }).selectOption("price_desc");
  await expect(page).toHaveURL(/sort=price_desc/);
  await expect(page).toHaveURL(/\/en\/shop\?/);
  await shop.locator('a[href*="/p/rose-dress"]').first().click();
  await expect(page).toHaveURL(/\/p\/rose-dress/);
});

test("independent cart objects share quantity, coupon and checkout state", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
  await page.goto("/en/cart");
  const items = page.locator('[data-tree-node="fixture-cartItems"]');
  const summary = page.locator('[data-tree-node="fixture-cartSummary"]');
  const checkout = page.locator('[data-tree-node="fixture-cartCheckout"]');
  await expect(items.locator(".rose-cart-line")).toHaveCount(1);
  await expect(summary.getByTestId("cart-total")).toContainText("320.50");
  await items.getByRole("button", { name: "More", exact: true }).click();
  await expect(summary.getByTestId("cart-total")).toContainText("641.00");
  await summary.getByRole("button", { name: "Have a coupon?" }).click();
  await summary.getByLabel("Coupon code").fill("ROSE10");
  await summary.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(summary.getByTestId("cart-total")).toContainText("576.90");
  await checkout.getByLabel(/^Name/).fill("Fixture buyer");
  await checkout.getByLabel(/^Phone/).fill("0599123456");
  await checkout.getByRole("button", { name: "Or send the order and we'll call you" }).click();
  await expect(items).toContainText("Thank you");
  const order = await (await page.request.get("http://127.0.0.1:4100/__test/last-order")).json();
  expect(order.items).toEqual([{ variantId: "m", quantity: 2 }]);
  expect(order.couponCode).toBe("ROSE10");
  expect(order).not.toHaveProperty("total");
});

test("an invalid or disabled native cart override retains the functioning default cart", async ({ page }) => {
  await configure(page, { invalidCart: true });
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Your bag is empty." })).toBeVisible();
  await expect(page.locator('[data-tree-node="fixture-cartItems"]')).toHaveCount(0);
  await configure(page, { disabled: true });
  await page.goto("/en/shop");
  await expect(page.locator('[data-tree-node="fixture-shop"]')).toHaveCount(0);
  await expect(page.locator('a[href*="/p/rose-dress"]').first()).toBeVisible();
});

test("studio commerce preview never reads or changes the live cart or submits a purchase", async ({ page }) => {
  const bag = JSON.stringify([{ variantId: "one", quantity: 9 }]);
  await page.addInitScript(value => localStorage.setItem("estabrak_cart_v1", value), bag);
  const requests: string[] = [];
  page.on("request", request => { if (/cart-quote|order-requests|checkout\/session|account\/profile/.test(request.url())) requests.push(request.url()); });
  await page.goto("/en/studio-frame?token=commerce-preview");
  await expect(page.locator('[data-commerce-preview="cart"]')).toHaveCount(1);
  await expect(page.getByText("Sample product", { exact: true })).toBeVisible();
  await expect(page.locator('[data-tree-node="fixture-cartCheckout"] button')).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("estabrak_cart_v1"))).toBe(bag);
  expect(requests).toEqual([]);
});

for (const kind of ["shop", "cart"] as const) test(`${kind}: SVG edits update the commerce preview without reloading its document`, async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&commerce=${kind}`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const frame = page.frameLocator('[data-testid="studio-frame"]');
  await expect(frame.locator(`[data-commerce-preview="${kind}"]`)).toHaveCount(1);
  await frame.locator("html").evaluate(() => { (window as any).__commerceDocument = "same-document"; });
  await page.getByTestId("studio-page-motion-open").click();
  const id = kind === "shop" ? "commerce-shop" : "commerce-cartItems";
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-commerce")).toBeVisible();
  await page.getByTestId("studio-edge-pick-top").click();
  await page.getByTestId("decor-grid").locator("button[data-decor]").first().click();
  await expect(frame.locator(`[data-tree-node="${id}"] > .pt-edge-top svg`)).toHaveCount(1);
  expect(await frame.locator("html").evaluate(() => (window as any).__commerceDocument)).toBe("same-document");
  if (kind === "shop") {
    await expect(frame.locator("[data-commerce-preview-filters]")).toBeVisible();
    await page.getByTestId("commerce-filters").uncheck();
    await expect(frame.locator("[data-commerce-preview-filters]")).toHaveCount(0);
    expect(await frame.locator("html").evaluate(() => (window as any).__commerceDocument)).toBe("same-document");
  }
});

test("studio providers ignore live cart storage and signed-in account sessions", async ({ page, context }) => {
  await configure(page, { accounts: true });
  await context.addCookies([{ name: "estabrek_signed_in", value: "1", domain: "127.0.0.1", path: "/" }]);
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    set.call(localStorage, "estabrak_cart_v1", JSON.stringify([{ variantId: "private-live-bag", quantity: 9 }]));
    const touches: string[] = []; (window as any).__commerceStorage = touches;
    Storage.prototype.getItem = function(key) { if (key === "estabrak_cart_v1") touches.push("read"); return get.call(this, key); };
    Storage.prototype.setItem = function(key, value) { if (key === "estabrak_cart_v1") touches.push("write"); return set.call(this, key, value); };
  });
  const accountRequests: string[] = [];
  page.on("request", request => { if (/\/api\/account\/|\/storefront\/account\//.test(request.url())) accountRequests.push(request.url()); });
  await page.goto("/en/studio-frame?token=commerce-preview");
  await expect(page.getByText("Sample product", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__commerceStorage)).toEqual([]);
  expect(accountRequests).toEqual([]);
});

test("a pre-existing native design remains published until its owner upgrades it", async ({ page }) => {
  await configure(page, { legacyCart: true });
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Legacy cart design" })).toBeVisible();
});

test("the CMS shop keeps desktop category selection in its shareable URL", async ({ page }) => {
  await page.goto("/en/shop");
  const shop = page.locator('[data-tree-node="fixture-shop"]');
  await shop.locator("aside").getByRole("button", { name: "حجاب", exact: true }).click();
  await expect(page).toHaveURL(/categoryId=hijabs/);
  await page.reload();
  await expect(shop.locator('a[href*="/p/rose-dress"]')).toHaveCount(0);
});

test("quick add in the CMS catalog reaches the actual CMS cart", async ({ page }) => {
  await page.goto("/en/shop");
  const shop = page.locator('[data-tree-node="fixture-shop"]');
  const card = shop.locator(".product-card-3d").filter({ has: page.locator('a[href*="/p/rose-hijab"]') });
  await card.getByRole("button", { name: "Quick add", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("estabrak_cart_v1") || "[]"))).toEqual([{ variantId: "one", quantity: 1 }]);
  await page.goto("/en/cart");
  await expect(page.locator('[data-tree-node="fixture-cartItems"] .rose-cart-line')).toHaveCount(1);
  await expect(page.getByTestId("cart-total")).toContainText("190.00");
});
