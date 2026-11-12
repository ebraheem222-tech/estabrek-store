import { expect, test, type Page } from "@playwright/test";

// The canvas's picking for tiny and turned things: an 8 px dot placed over a card is picked by a press just outside
// it (not the card), shows with a ring around it, keeps its middle free of handles and moves when dragged from just
// outside it; a box turned by 25° is outlined along its real sides, its bounding box only hinted.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&tiny";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const info = (page: Page) => page.getByTestId("studio-info");
/** An element's box on the canvas, in the editor's screen px. */
async function canvasBox(page: Page, id: string) {
  const r = await frame(page).locator(`[data-tree-node="${id}"]`).first().evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const width = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const scale = box.width / width;
  return { x: box.x + r.x * scale, y: box.y + r.y * scale, w: r.w * scale, h: r.h * scale };
}

test("a tiny dot is picked, seen and moved from just outside it; a turned box is outlined along its real sides", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);

  // The dot is under 8 px on the canvas; a press 4 px to its left is on the card it sits over.
  const dot = await canvasBox(page, "dot");
  expect(dot.w).toBeLessThan(9);
  const beside = { x: dot.x - 4, y: dot.y + dot.h / 2 };
  // The highlight follows a short vote of where the pointer has been: it rests there a moment, as a hand does.
  for (let i = 0; i < 8; i++) { await page.mouse.move(beside.x + (i % 2), beside.y); await page.waitForTimeout(80); }
  // About to be picked: the ring shows around it before the click.
  await expect(page.getByTestId("studio-hover-ring")).toBeVisible({ timeout: 10000 });
  await page.mouse.click(beside.x, beside.y);
  await expect(info(page)).toContainText("dot");
  await expect(page.getByTestId("studio-selected-ring")).toBeVisible();
  // Its name stands beside it, clear of its handles.
  const name = (await page.getByTestId("studio-selected-name").boundingBox())!;
  expect(name.x).toBeGreaterThan(dot.x + dot.w + 12);
  // Its handles stand off it, four at its corners: its middle stays free.
  const handles = page.getByTestId("studio-handle");
  await expect(handles).toHaveCount(4);
  expect(await handles.evaluateAll((els) => els.every((e) => e.getAttribute("data-off") === "1"))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("tiny-selected.png") });

  // 20 px further left is the card's own.
  await page.mouse.click(dot.x - 24, beside.y);
  await expect(info(page)).toContainText("card");

  // Dragged from just outside it, the dot moves (not the card).
  const cardBefore = await canvasBox(page, "card");
  await page.mouse.move(beside.x, beside.y);
  await page.mouse.down();
  await page.mouse.move(beside.x + 90, beside.y + 50, { steps: 12 });
  await page.mouse.up();
  await expect(info(page)).toContainText("dot");
  await expect.poll(async () => (await canvasBox(page, "dot")).x, { timeout: 20000 }).toBeGreaterThan(dot.x + 40);
  expect(Math.abs((await canvasBox(page, "card")).x - cardBefore.x)).toBeLessThan(1);

  // The turned box: its real outline, and the box around it only hinted.
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 30000 });
  const tilted = await canvasBox(page, "tilted");
  await page.mouse.click(tilted.x + tilted.w / 2, tilted.y + tilted.h / 2);
  await expect(info(page)).toContainText("tilted");
  const quad = page.getByTestId("studio-selected-quad").locator("polygon");
  await expect(quad).toHaveCount(1);
  const points = (await quad.getAttribute("points"))!.split(" ").map((p) => p.split(",").map(Number));
  expect(points).toHaveLength(4);
  // Turned: its top side isn't level.
  expect(Math.abs(points[0][1] - points[1][1])).toBeGreaterThan(10);
  await expect(page.getByTestId("studio-selected")).toHaveAttribute("data-quad", "1");
  // Its size is along its own sides (180 × 100), not the box around it.
  await expect(page.getByTestId("studio-selected-size")).toHaveText("180×100");
  await page.screenshot({ path: testInfo.outputPath("turned-selected.png") });
});
