import { test, expect } from "@playwright/test";

// Read where a preview shows: the header (previews colour the hovered section and the
// header, never the page shell; at rest the header takes the shell's own colours).
const accent = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.querySelector(".atelier-header")!).getPropertyValue("--selection-accent").trim());

test("the product photo opens full screen, zooms on click and closes with Escape", async ({ page }) => {
  await page.goto("/p/rose-dress");
  const photo = page.getByRole("button", { name: "عرض الصور بحجم كبير" });
  await expect(photo).toBeVisible();
  await photo.click();
  const viewer = page.getByRole("dialog", { name: /صور فستان الورد/ });
  await expect(viewer).toBeVisible();
  const stage = viewer.locator(".rose-viewer-stage");
  await stage.click();
  await expect(stage).toHaveClass(/zoomed/);
  await stage.click();
  await expect(stage).not.toHaveClass(/zoomed/);
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
});

test("hovering add to bag keeps changing the colours, leaving restores them", async ({ page }) => {
  await page.goto("/p/rose-dress");
  await page.waitForLoadState("networkidle");
  // The page first takes the piece's own colour; hovering previews others on top of it.
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", /#/);
  await page.waitForTimeout(900);
  const before = await accent(page);
  await page.locator(".rose-pdp-add").hover();
  const seen = new Set<string>();
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(1000);
    seen.add(await accent(page));
  }
  expect(seen.size).toBeGreaterThanOrEqual(2);
  await page.mouse.move(5, 5);
  await expect.poll(() => accent(page), { timeout: 4000 }).toBe(before);
});

test("passing quickly over add to bag leaves the colours alone", async ({ page }) => {
  await page.goto("/p/rose-dress");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", /#/);
  await page.waitForTimeout(900);
  const before = await accent(page);
  await page.locator(".rose-pdp-add").hover();
  await page.waitForTimeout(150);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(900);
  expect(await accent(page)).toBe(before);
  await expect(page.locator(".cinematic-shell")).not.toHaveAttribute("data-theme-preview", /.*/);
});

test("the chosen colour survives scrolling the homepage down and back to the top", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#5f8f9b" })));
  await page.waitForTimeout(900);
  const chosen = await accent(page);
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.mouse.move(700, 450);
  for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(80); }
  for (let i = 0; i < 24; i++) { await page.mouse.wheel(0, -900); await page.waitForTimeout(80); }
  await expect.poll(() => accent(page), { timeout: 5000 }).toBe(chosen);
});
