import { expect, test, type Page } from "@playwright/test";

// Focus mode (admin studio/focus, docs/cms-big-engine-plan.ar.md A1): a double-click opens an object on its own.
// The canvas glides to it, the rest dims, the path runs along the top, its parts go down the side, and its own
// editor opens. A drawing's shape is edited alone. Esc closes the part, then the mode, and the view comes back.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

async function pointOf(page: Page, id: string) {
  const rect = await frame(page).locator(`[data-tree-node="${id}"]`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = await page.getByTestId("studio-frame").boundingBox();
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box!.width / viewport.w;
  return { x: box!.x + rect.x * scale, y: box!.y + rect.y * scale, scale };
}
async function ready(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);
}
const frameWidth = async (page: Page) => (await page.getByTestId("studio-frame").boundingBox())!.width;

test("a double-click opens a drawing on its own; one of its shapes is edited alone; Esc comes back out", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await ready(page);
  const before = await frameWidth(page);
  const at = await pointOf(page, "drawing");
  await page.mouse.dblclick(at.x, at.y);

  // In: the bar, the dim with its hole, the drawing's own editor, and the canvas closer.
  await expect(page.getByTestId("studio-focus-bar")).toHaveAttribute("data-group", "svg");
  await expect(page.getByTestId("studio-focus-mask")).toBeVisible();
  await expect(page.getByTestId("studio-focus-panel")).toHaveAttribute("data-node", "drawing");
  await expect(page.getByTestId("studio-svg")).toBeVisible();
  await expect.poll(() => frameWidth(page)).toBeGreaterThan(before * 1.5);
  // Only its own controls: the event recipes and the scroll effects wait under «All settings».
  await expect(page.getByTestId("studio-info").getByTestId("studio-triggers")).toHaveCount(0);

  // Its shapes down the side; the circle opens alone and takes a fill of its own.
  const part = page.getByTestId("studio-focus-part").first();
  await expect(part).toHaveAttribute("data-part", "0");
  await part.click();
  await expect(page.getByTestId("studio-focus-svg-part")).toBeVisible();
  await expect(page.getByTestId("studio-focus-crumb-part")).toBeVisible();
  await page.getByTestId("studio-focus-svg-fill").selectOption("accent");
  await expect.poll(async () => (await readNode(page, "drawing"))?.props?.art?.nodes?.[0]?.a?.fill).toBe("accent");
  await expect(frame(page).locator('[data-tree-node="drawing"] circle')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("focus-drawing.png") });

  // «All settings» shows the whole list again, inside the mode.
  await page.getByTestId("studio-focus-all").check();
  await expect(page.getByTestId("studio-focus-panel")).toHaveCount(0);
  await expect(page.getByTestId("studio-focus-bar")).toBeVisible();
  await page.getByTestId("studio-focus-all").uncheck();

  // Esc: the part first, then the mode; the view goes back to where it was.
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("studio-focus-svg-part")).toHaveCount(0);
  await expect(page.getByTestId("studio-svg")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("studio-focus-bar")).toHaveCount(0);
  await expect(page.getByTestId("studio-focus-mask")).toHaveCount(0);
  await expect.poll(async () => Math.abs((await frameWidth(page)) - before)).toBeLessThan(2);
});

test("F opens a section on its own: its elements are its parts, a double-click opens one inside, a press outside leaves", async ({ page }) => {
  test.setTimeout(120000);
  await ready(page);
  const before = await frameWidth(page);
  // Pick the section through its path, then F.
  const at = await pointOf(page, "drawing");
  await page.mouse.click(at.x, at.y);
  await expect(page.getByTestId("studio-info")).toContainText("drawing");
  await page.getByTestId("studio-path").getByRole("button").nth(1).click();
  await expect(page.getByTestId("studio-info")).toContainText("objects");
  await page.keyboard.press("f");
  await expect(page.getByTestId("studio-focus-bar")).toHaveAttribute("data-group", "container");
  const parts = page.getByTestId("studio-focus-part");
  await expect(parts).toHaveCount(3);
  await expect(parts.nth(1)).toHaveAttribute("data-part", "model");

  // A click picks an element inside (its editor opens beside); the path grows.
  await parts.nth(1).click();
  await expect(page.getByTestId("studio-focus-panel")).toHaveAttribute("data-node", "model");
  await expect(page.getByTestId("studio-focus-panel")).toHaveAttribute("data-group", "model");
  await expect(page.getByTestId("studio-focus-crumb").last()).toHaveText(/model/i);
  // A double-click opens it on its own, in the same mode.
  await parts.nth(1).dblclick();
  await expect(page.getByTestId("studio-focus-bar")).toHaveAttribute("data-group", "model");
  await expect(page.getByTestId("studio-focus-parts")).toBeVisible();

  // A press on the page outside the opened element (the canvas's corner: the page fills it, zoomed in) leaves the mode.
  const canvas = (await page.getByTestId("studio-canvas").boundingBox())!;
  await page.mouse.click(canvas.x + 24, canvas.y + canvas.height - 24);
  await expect(page.getByTestId("studio-focus-bar")).toHaveCount(0);
  await expect.poll(async () => Math.abs((await frameWidth(page)) - before)).toBeLessThan(2);
});
