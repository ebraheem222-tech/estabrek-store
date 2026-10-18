import { test, expect } from "@playwright/test";

// Product type fields against the mock API (tests/catalog-server.mjs):
// فستان الورد is chiffon (سهرة، عرس); the two hijabs are crepe (يومي).

test("the product page shows the piece's details from its type", async ({ page }) => {
  await page.goto("/p/rose-dress");
  const specs = page.getByTestId("product-specs");
  await expect(specs).toBeVisible();
  await expect(specs.locator("dt")).toHaveText(["القماش", "الطول", "المناسبة"]);
  await expect(specs.locator("dd")).toHaveText(["شيفون", "140 سم", "سهرة، عرس"]);
  await expect(page.locator(".rose-pdp-option-head span").first()).toHaveText("اللون");
});

test("the shop filters by the type's fields, and the choice is in the address", async ({ page }) => {
  await page.goto("/shop");
  const filters = page.getByTestId("attribute-filters").first();
  await expect(filters).toBeVisible();
  await expect(filters.getByRole("group", { name: "القماش" })).toContainText("كريب");
  await filters.getByRole("button", { name: /شيفون/ }).click();
  await expect(page).toHaveURL(/attr_fabric=/);
  await expect(page.locator(".rose-product-tile, .product-card, [data-product-id]").filter({ hasText: "فستان الورد" }).first()).toBeVisible();
  await expect(page.getByText("حجاب لؤلؤي")).toHaveCount(0);

  // Opening the address directly gives the same list.
  await page.goto("/shop?attr_occasion=" + encodeURIComponent("يومي"));
  await expect(page.getByTestId("attribute-filters").first().getByRole("button", { name: /يومي/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("فستان الورد")).toHaveCount(0);
});

test("phone: the filters fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop");
  await expect(page.getByTestId("attribute-filters").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
