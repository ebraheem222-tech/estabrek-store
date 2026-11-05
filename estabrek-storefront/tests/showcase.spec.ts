import { expect, test } from "@playwright/test";

test("showcase expands with click and keyboard while keeping links separate", async ({ page }) => {
  await page.goto("/en/showcase-demo");
  const gallery = page.locator('[data-tree-node="showcase-click"]');
  const controls = gallery.locator(".pt-showcase-toggle");
  await expect(controls).toHaveCount(2);
  await expect(controls.nth(1)).toHaveAttribute("aria-expanded", "true");
  await controls.nth(0).click();
  await expect(controls.nth(0)).toHaveAttribute("aria-expanded", "true");
  await controls.nth(0).press("End");
  await expect(controls.nth(1)).toBeFocused();
  await expect(controls.nth(1)).toHaveAttribute("aria-expanded", "true");
  await controls.nth(1).press("Home");
  await expect(controls.nth(0)).toBeFocused();
  await controls.nth(0).press("ArrowRight");
  await expect(controls.nth(1)).toBeFocused();
  const link = gallery.getByRole("link", { name: "Explore" });
  await expect(link).toHaveAttribute("href", "/en/shop");
  await expect(gallery.locator("button a, a button")).toHaveCount(0);
  await controls.nth(1).press("Tab");
  await expect(link).toBeFocused();
});

test("fine pointer hover enhances expansion and RTL arrows follow visual order", async ({ page }) => {
  await page.goto("/en/showcase-demo");
  const gallery = page.locator('[data-tree-node="showcase-hover"]');
  const controls = gallery.locator(".pt-showcase-toggle");
  await controls.nth(1).hover();
  await expect(controls.nth(1)).toHaveAttribute("aria-expanded", "true");
  const focusedLink = gallery.getByRole("link", { name: "Explore" });
  await focusedLink.focus();
  await controls.nth(0).hover();
  await expect(focusedLink).toBeVisible();
  await expect(focusedLink).toBeFocused();
  await expect(controls.nth(1)).toHaveAttribute("aria-expanded", "true");
  await controls.nth(0).focus();
  await gallery.evaluate((element) => element.setAttribute("dir", "rtl"));
  await controls.nth(0).press("ArrowLeft");
  await expect(controls.nth(1)).toBeFocused();
  const vertical = page.locator('[data-tree-node="showcase-vertical"] .pt-showcase-toggle');
  await vertical.nth(0).focus();
  await vertical.nth(0).press("ArrowDown");
  await expect(vertical.nth(1)).toBeFocused();
});

test("vertical panel labels stay inside their controls with long merchant titles", async ({ page }) => {
  await page.goto("/en/showcase-demo");
  const gallery = page.locator('[data-tree-node="showcase-vertical"]');
  await gallery.locator(".pt-showcase-title").evaluateAll((titles) => titles.forEach((title) => { title.textContent = "A long collection title that must fit inside the collapsed panel and remain usable"; }));
  const control = gallery.locator(".pt-showcase-toggle").nth(1);
  const panel = gallery.locator(".pt-showcase-panel").nth(1);
  const title = control.locator(".pt-showcase-title");
  const frame = await panel.boundingBox();
  const box = await control.boundingBox();
  const text = await title.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(frame!.height + 1);
  expect(text!.height).toBeLessThanOrEqual(36);
  await control.click();
  await expect(control).toHaveAttribute("aria-expanded", "true");
});

test("mobile panels stack, touch always expands, and reduced motion disables transitions", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3000/en/showcase-demo");
    const gallery = page.locator('[data-tree-node="showcase-hover"]');
    await gallery.scrollIntoViewIfNeeded();
    const panels = gallery.locator(".pt-showcase-panel");
    const first = await panels.nth(0).boundingBox();
    const second = await panels.nth(1).boundingBox();
    expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height);
    await gallery.locator(".pt-showcase-toggle").nth(1).tap();
    await expect(gallery.locator(".pt-showcase-toggle").nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect(panels.nth(1)).toHaveCSS("transition-duration", "0s");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally { await context.close(); }
});

test("all eight panels remain reachable at the minimum height and on a phone", async ({ page }) => {
  await page.goto("/en/showcase-demo");
  const gallery = page.locator('[data-tree-node="showcase-eight"]');
  await gallery.locator(".pt-showcase-panels").evaluate((element) => (element as HTMLElement).style.setProperty("--showcase-ratio", "6"));
  const controls = gallery.locator(".pt-showcase-toggle");
  await expect(controls).toHaveCount(8);
  for (let index = 0; index < 8; index++) {
    const panel = await gallery.locator(".pt-showcase-panel").nth(index).boundingBox();
    const button = await controls.nth(index).boundingBox();
    expect(button!.height).toBeLessThanOrEqual(panel!.height + 1);
  }
  await controls.nth(7).click();
  await expect(controls.nth(7)).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await controls.nth(0).scrollIntoViewIfNeeded();
  await controls.nth(0).click();
  await expect(controls.nth(0)).toHaveAttribute("aria-expanded", "true");
  const width = await gallery.boundingBox();
  expect(width!.x + width!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
