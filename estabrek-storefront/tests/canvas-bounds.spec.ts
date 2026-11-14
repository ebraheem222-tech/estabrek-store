import { expect, test, type Page } from "@playwright/test";

// The canvas shows where every part of the page begins and ends (asked for in the Dragging menu, and by itself while
// something is dragged), and a part's name picks it. An element dropped into another part takes the view to that
// part. Carried to the frame's bottom edge it scrolls the page by itself, and stays under the pointer while the page
// moves (by itself or with the wheel), so it can be dropped into a part that was out of sight.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&twoParts";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
/** The middle of an element of the page, as a point of the editor's window. */
async function canvasPoint(page: Page, selector: string) {
  const rect = await frame(page).locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = await page.getByTestId("studio-frame").boundingBox();
  const width = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const scale = box!.width / width;
  return { x: box!.x + rect.x * scale, y: box!.y + rect.y * scale };
}
const scrolled = (page: Page) => page.evaluate(() => (window as any).__canvasHarness.getLayout()?.scroll.y ?? 0);
const zoomNow = async (page: Page) => Number(((await page.getByTestId("studio-zoom").textContent()) ?? "").replace(/[^\d.]/g, ""));
const parentOf = (page: Page, id: string) => page.evaluate((x) => {
  const find = (n: any): string | null => (n.children ?? []).some((c: any) => c.id === x) ? n.id : (n.children ?? []).map(find).find(Boolean) ?? null;
  return find((window as any).__canvasHarness.getDraft().tree.root);
}, id);
const bound = (page: Page, id: string) => page.locator(`[data-testid="studio-bound"][data-node="${id}"]`);
async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
}
/** Presses on the button and starts carrying it. */
async function pickUp(page: Page) {
  const at = await canvasPoint(page, '[data-tree-node="action"]');
  await page.mouse.move(at.x - 4, at.y);
  await page.mouse.move(at.x, at.y, { steps: 3 });
  await page.mouse.down();
  await page.mouse.move(at.x + 12, at.y + 12, { steps: 4 });
  return at;
}

test("the Dragging menu shows every part's boundaries, and a part's name picks it", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  await expect(page.getByTestId("studio-bound")).toHaveCount(0);
  await page.getByTestId("studio-drag-toggle").click();
  await page.getByTestId("studio-drag-bounds").check();
  await page.getByTestId("studio-drag-toggle").click();
  // The section and the tray inside it; the second section is out of sight, and what isn't a holder has none.
  await expect(bound(page, "first")).toHaveAttribute("data-section", "1");
  await expect(bound(page, "tray")).toBeVisible();
  await expect(bound(page, "second")).toHaveCount(0);
  await expect(bound(page, "action")).toHaveCount(0);
  await expect(page.locator('[data-testid="studio-bound-name"][data-node="first"]')).toContainText("First part");
  // The tray's outline is where the tray is.
  const tray = await canvasPoint(page, '[data-tree-node="tray"]');
  const box = (await bound(page, "tray").boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - tray.x)).toBeLessThan(3);
  expect(Math.abs(box.y + box.height / 2 - tray.y)).toBeLessThan(3);
  // A name picks its part (a section is hard to press on once it is full).
  await page.locator('[data-testid="studio-bound-name"][data-node="tray"]').click();
  await expect(page.getByTestId("studio-info")).toContainText("Tray");
  await page.locator('[data-testid="studio-bound-name"][data-node="first"]').click();
  await expect(page.getByTestId("studio-info")).toContainText("First part");
  // It is remembered in this browser, and goes when turned off.
  await page.reload();
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect(bound(page, "first")).toBeVisible();
  await page.getByTestId("studio-drag-toggle").click();
  await page.getByTestId("studio-drag-bounds").uncheck();
  await expect(page.getByTestId("studio-bound")).toHaveCount(0);
});

test("dropped into another part it goes there, and the view comes to that part", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await open(page);
  const before = await zoomNow(page);
  await pickUp(page);
  // While it is carried, every part's boundaries show by themselves.
  await expect(bound(page, "first")).toBeVisible();
  await expect(bound(page, "tray")).toBeVisible();
  const tray = await canvasPoint(page, '[data-tree-node="tray"]');
  await page.mouse.move(tray.x, tray.y + 40, { steps: 14 });
  await expect(page.getByTestId("studio-into")).toHaveAttribute("data-node", "tray");
  await page.screenshot({ path: testInfo.outputPath("over-the-tray.png") });
  await page.mouse.up();
  await expect.poll(() => parentOf(page, "action")).toBe("tray");
  await expect(page.getByTestId("studio-bound")).toHaveCount(0);
  // The tray is small on the canvas: the view comes closer to it.
  await expect.poll(() => zoomNow(page), { timeout: 15000 }).toBeGreaterThan(before + 10);
  await page.screenshot({ path: testInfo.outputPath("the-view-came.png") });
});

test("with that turned off in the Dragging menu the view stays where it is", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  await page.getByTestId("studio-drag-toggle").click();
  await page.getByTestId("studio-drag-follow").uncheck();
  await page.getByTestId("studio-drag-toggle").click();
  const before = await zoomNow(page);
  await pickUp(page);
  const tray = await canvasPoint(page, '[data-tree-node="tray"]');
  await page.mouse.move(tray.x, tray.y + 40, { steps: 14 });
  await expect(page.getByTestId("studio-into")).toHaveAttribute("data-node", "tray");
  await page.mouse.up();
  await expect.poll(() => parentOf(page, "action")).toBe("tray");
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  await page.waitForTimeout(1500);
  expect(await zoomNow(page)).toBe(before);
});

test("held at the frame's bottom edge the page scrolls by itself, and it lands in the part that came into sight", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await open(page);
  const at = await pickUp(page);
  expect(await scrolled(page)).toBe(0);
  // Down to the bottom of what shows of the frame, and held there.
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const bottom = Math.min(box.y + box.height, 900) - 8;
  await page.mouse.move(at.x, bottom, { steps: 16 });
  await expect.poll(() => scrolled(page), { timeout: 30000 }).toBeGreaterThan(900);
  // It stayed under the pointer while the page went by under it.
  const held = await canvasPoint(page, '[data-tree-node="action"]');
  expect(Math.abs(held.x - at.x)).toBeLessThan(40);
  expect(Math.abs(held.y - bottom)).toBeLessThan(60);
  // Up, off the edge: the page stops where it is.
  await page.mouse.move(at.x, bottom - 200, { steps: 6 });
  let stopped = -1;
  await expect.poll(async () => { const was = stopped; stopped = await scrolled(page); return stopped === was; }, { intervals: [300] }).toBe(true);
  // The shelf of the second part is in sight now: over it, it would go into it.
  const shelf = await canvasPoint(page, '[data-tree-node="shelf"]');
  await page.mouse.move(shelf.x, shelf.y + 40, { steps: 14 });
  await expect(page.getByTestId("studio-into")).toHaveAttribute("data-node", "shelf");
  await page.screenshot({ path: testInfo.outputPath("over-the-shelf.png") });
  expect(await scrolled(page)).toBe(stopped);
  await page.mouse.up();
  await expect.poll(() => parentOf(page, "action")).toBe("shelf");
});

test("the wheel turned while something is carried keeps it under the pointer", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  const at = await pickUp(page);
  await page.mouse.move(at.x + 60, at.y + 80, { steps: 8 });
  await page.mouse.wheel(0, 300);
  await expect.poll(() => scrolled(page)).toBeGreaterThan(250);
  // The page went up under it; the button is still where the pointer is.
  await expect.poll(async () => Math.abs((await canvasPoint(page, '[data-tree-node="action"]')).y - (at.y + 80))).toBeLessThan(12);
  const first = await canvasPoint(page, '[data-tree-node="headline"]');
  await page.mouse.up();
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  // Saved where it was let go: as far below the headline as it was seen there (not 300 higher or lower).
  await expect.poll(async () => {
    const now = await canvasPoint(page, '[data-tree-node="action"]');
    const head = await canvasPoint(page, '[data-tree-node="headline"]');
    return Math.abs((now.y - head.y) - (at.y + 80 - first.y));
  }).toBeLessThan(14);
  expect(await parentOf(page, "action")).toBe("first");
});
