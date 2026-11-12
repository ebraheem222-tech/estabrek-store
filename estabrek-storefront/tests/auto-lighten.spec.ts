import { expect, test, type Page } from "@playwright/test";

// The shop's automatic lightening (J3): the page's first picture loads first; a far section that cuts what sticks
// out is drawn only near the screen; on a weak device no frosted glass; saving data, clips don't play by themselves.
// A page can turn it all off.

const weakAndSaving = async (page: Page) => page.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => 2, configurable: true });
  Object.defineProperty(Navigator.prototype, "connection", { get: () => ({ saveData: true, effectiveType: "3g", addEventListener() {}, removeEventListener() {} }), configurable: true });
});
const css = (page: Page, id: string, prop: string) => page.locator(`[data-tree-node="${id}"]`).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

test("the first picture first, far sections drawn near the screen; nothing else changes on a strong device", async ({ page }) => {
  await page.goto("/en/speed-demo");
  await expect(page.locator('[data-tree-node="lead"]')).toHaveAttribute("loading", "eager");
  await expect(page.locator('[data-tree-node="lead"]')).toHaveAttribute("fetchpriority", "high");
  await expect(page.locator('[data-tree-node="later"]')).toHaveAttribute("loading", "lazy");
  expect(await css(page, "third", "content-visibility")).toBe("auto");
  expect(await css(page, "glass", "backdrop-filter")).toContain("blur");
  await expect(page.locator("html")).not.toHaveAttribute("data-weak", "");
});

test("a weak device saving data: no frosted glass, the clip doesn't play by itself", async ({ page }) => {
  await weakAndSaving(page);
  await page.goto("/en/speed-demo");
  await expect(page.locator("html")).toHaveAttribute("data-weak", "", { timeout: 15000 });
  await expect(page.locator("html")).toHaveAttribute("data-save-data", "");
  expect(await css(page, "glass", "backdrop-filter")).toBe("none");
  const clip = page.locator('[data-tree-node="clip"]');
  await expect.poll(() => clip.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(false);
  expect(await clip.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

test("turned off for a page: none of it, even on a weak device saving data", async ({ page }) => {
  await weakAndSaving(page);
  await page.goto("/en/speed-off");
  await expect(page.locator('[data-tree-node="lead"]')).toHaveAttribute("loading", "lazy");
  expect(await css(page, "third", "content-visibility")).toBe("visible");
  await page.waitForTimeout(1500);
  await expect(page.locator("html")).not.toHaveAttribute("data-weak", "");
  expect(await css(page, "glass", "backdrop-filter")).toContain("blur");
});
