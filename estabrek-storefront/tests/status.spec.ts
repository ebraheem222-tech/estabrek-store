import { test, expect } from "@playwright/test";

test("a missing product shows the rose 'not found' page with ways back, kept out of search engines", async ({ page }) => {
  // The product page streams (loading skeleton), so Next marks the missing page "noindex" instead of a 404 status.
  await page.goto("/p/this-piece-does-not-exist-at-all");
  await expect(page.getByTestId("not-found")).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toHaveCount(1);
  await expect(page.getByTestId("not-found").getByRole("link", { name: "تسوّقي الجديد" })).toHaveAttribute("href", "/shop");
});

test("titles carry the store name from the settings", async ({ page }) => {
  await page.goto("/cart");
  await expect(page).toHaveTitle("سلة المشتريات | متجر استبرق");
  await page.goto("/");
  await expect(page).toHaveTitle(/متجر استبرق/);
  const og = await page.locator('meta[property="og:site_name"]').getAttribute("content");
  expect(og).toBe("متجر استبرق");
});
