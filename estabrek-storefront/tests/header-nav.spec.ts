import { expect, test, type Page } from "@playwright/test";

// Editing a header in the page editor, as the owner reported it (2026-11-24): "a lot of problems when editing the
// header, the navigation or the footer", "sometimes an object can't be moved, dragged or resized", "in the nav, when
// you edit it, the search moves from its place". Each test below is one of what was found:
//  - moving the menu in a header row took it out of the row: the search jumped into its place, the menu landed on
//    it, and its size was frozen (a link added later spilled out of it);
//  - a header's search dragged a little fell out of its column (the gap between the columns) into the header, and
//    the view jumped away to frame the whole header;
//  - a short, wide menu or search had no handles at its ends, so it couldn't be made wider alone; sizing it took it
//    out of its column;
//  - a second click on the menu picked its list of links (drawn as the menu itself), Escape went back through it,
//    and dragging it pulled the links out of their menu;
//  - a press on things that couldn't be carried together was swallowed whole (not even a click).
// The test page: the admin's editor fixture with the Add panel's ready header (`?header`: name, menu and search in
// three columns, a part, the ready footer) or a header row built by hand (`&row`: one stack).

const base = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&header";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const zoomNow = async (page: Page) => Number(((await page.getByTestId("studio-zoom").textContent()) ?? "").replace(/[^\d.]/g, ""));
/** Where something in the frame is on the page (a fraction of the way across and down it). */
async function canvasPoint(page: Page, selector: string, fx = 0.5, fy = 0.5) {
  const rect = await frame(page).locator(selector).first().evaluate((el, [fx, fy]) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width * fx, y: r.y + r.height * fy }; }, [fx, fy]);
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const width = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const scale = box.width / width;
  return { x: box.x + rect.x * scale, y: box.y + rect.y * scale };
}
/** Its box in the frame's own pixels (the same at any zoom). */
const boxIn = (page: Page, id: string) => frame(page).locator(`[data-tree-node="${id}"]`).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const nodeOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__canvasHarness.getNode(x), id);
const styleOf = async (page: Page, id: string) => ((await nodeOf(page, id))?.node?.style?.base ?? {}) as Record<string, any>;
const writes = (page: Page) => page.evaluate(() => (window as any).__canvasHarness.getWrites()) as Promise<Array<{ ops: any[] }>>;
async function open(page: Page, extra = "") {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}${extra}`);
  await ready(page);
}
/** The pointer rests on it (the hover is voted over time), then a click. */
async function clickAt(page: Page, at: { x: number; y: number }, modifiers: Array<"Shift"> = []) {
  await page.mouse.move(at.x - 4, at.y);
  await page.mouse.move(at.x, at.y, { steps: 3 });
  for (const m of modifiers) await page.keyboard.down(m);
  await page.mouse.click(at.x, at.y);
  for (const m of modifiers) await page.keyboard.up(m);
}
/** Presses at a point and carries it by (dx, dy) screen px, checking `whileHeld` before letting go. */
async function carry(page: Page, at: { x: number; y: number }, dx: number, dy: number, whileHeld?: () => Promise<void>) {
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + dx / 2, at.y + dy / 2, { steps: 8 });
  await page.mouse.move(at.x + dx, at.y + dy, { steps: 8 });
  if (whileHeld) await whileHeld();
  await page.mouse.up();
}
const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

test("moving the menu in a header row leaves the search where it is, and the menu keeps its own size", async ({ page }) => {
  test.setTimeout(150000);
  await open(page, "&row");
  const search = await boxIn(page, "find");
  const menu = await boxIn(page, "nav");
  await clickAt(page, await canvasPoint(page, '[data-tree-node="nav"]'));
  await expect(page.getByTestId("studio-info")).toContainText("nav");
  // Carried 20 px along and a little down: while it is held, and after, the search and the name don't move.
  const name = await boxIn(page, "brand");
  await carry(page, await canvasPoint(page, '[data-tree-node="nav"]'), 20, 16, async () => {
    expect(near(await boxIn(page, "find"), search)).toBeLessThan(1);
    expect(near(await boxIn(page, "brand"), name)).toBeLessThan(1);
    // What it shows is how far it is from its place in the row.
    await expect(page.getByTestId("studio-placing-at")).toContainText("px");
  });
  await expect.poll(async () => (await styleOf(page, "nav")).moveX ?? 0).toBeGreaterThan(10);
  await ready(page);
  // It is still in the row (moved by its own offset), at its own size.
  const style = await styleOf(page, "nav");
  expect(style.layer).toBeUndefined();
  expect(style.width).toBeUndefined();
  expect(style.height).toBeUndefined();
  expect(near(await boxIn(page, "find"), search)).toBeLessThan(1);
  expect(near(await boxIn(page, "brand"), name)).toBeLessThan(1);
  const moved = await boxIn(page, "nav");
  expect(moved.x - menu.x).toBeGreaterThan(14);
  // A link added to it: the menu grows to hold it (its size wasn't frozen).
  await page.getByTestId("block-item-add").first().click();
  await ready(page);
  await expect.poll(async () => (await boxIn(page, "nav")).w).toBeGreaterThan(menu.w + 30);
  expect((await boxIn(page, "nav")).h).toBeLessThan(menu.h + 4);
});

test("the ready header: the search dragged a little stays in its column; the menu is sized at its end, in its column", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  const zoom = await zoomNow(page);
  const search = await boxIn(page, "srch-7");
  // Its column is as wide as it is: carried 60 px towards the menu (into the gap between the columns) it stays in
  // its column and says why it won't go sideways; nothing is saved, and the view stays where it is.
  await clickAt(page, await canvasPoint(page, '[data-tree-node="srch-7"]', 0.3));
  await expect(page.getByTestId("studio-info")).toContainText("srch-7");
  const before = (await writes(page)).length;
  await carry(page, await canvasPoint(page, '[data-tree-node="srch-7"]', 0.3), -60, 0, async () => {
    await expect(page.getByTestId("studio-into")).toHaveCount(0);
    await expect(page.getByTestId("studio-placing-held")).toHaveAttribute("data-axis", "x");
  });
  await page.waitForTimeout(800);
  expect((await nodeOf(page, "srch-7")).parent.id).toBe("cell-8");
  expect((await writes(page)).slice(before).flatMap((w) => w.ops).some((op) => op.op === "move")).toBe(false);
  expect(near(await boxIn(page, "srch-7"), search)).toBeLessThan(1);
  expect(await zoomNow(page)).toBe(zoom);

  // The menu is short and wide: it has a handle at each end, and is made wider by one alone.
  await clickAt(page, await canvasPoint(page, '[data-tree-node="menu-5"]'));
  await expect(page.getByTestId("studio-info")).toContainText("menu-5");
  await expect(page.locator('[data-testid="studio-handle"][data-handle="e"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="studio-handle"][data-handle="w"]')).toHaveCount(1);
  const menu = await boxIn(page, "menu-5");
  const end = (await page.locator('[data-testid="studio-handle"][data-handle="e"]').boundingBox())!;
  await carry(page, { x: end.x + end.width / 2, y: end.y + end.height / 2 }, 50, 0);
  await expect.poll(async () => parseFloat(String((await styleOf(page, "menu-5")).width ?? 0))).toBeGreaterThan(menu.w + 30);
  await ready(page);
  // Sized where it is: still in its column, not placed over it; its height and the search are as they were.
  expect((await styleOf(page, "menu-5")).layer).toBeUndefined();
  expect((await styleOf(page, "menu-5")).height).toBeUndefined();
  expect((await nodeOf(page, "menu-5")).parent.id).toBe("cell-6");
  expect(near(await boxIn(page, "srch-7"), search)).toBeLessThan(1);
  // Its left side stayed where it was (it grew to the right, where the handle went).
  expect(Math.abs((await boxIn(page, "menu-5")).x - menu.x)).toBeLessThan(3);
});

test("a second click on the menu picks a link, Escape goes back to the menu, and pressing its list carries the menu", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  const link = await canvasPoint(page, '[data-tree-node="menu-5"] li:first-child a');
  await clickAt(page, link);
  await expect(page.getByTestId("studio-info")).toContainText("menu-5");
  await page.waitForTimeout(350);
  await clickAt(page, link);
  // The link itself (not the list drawn as the menu, nor the list item that only wraps the link).
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", /^n:menu-5\/~ul\.1\.li\.1\.a\.1$/);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("studio-look-target")).toHaveCount(0);
  await expect(page.getByTestId("studio-info")).toContainText("menu-5");

  // Between two links is the list itself: picked, it is still the menu that moves when pressed, links and all.
  const [first, second] = await frame(page).locator('[data-tree-node="menu-5"] li a').evaluateAll((els) => els.slice(0, 2).map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const scale = box.width / await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const between = { x: box.x + ((first.x + first.w + second.x) / 2) * scale, y: box.y + (first.y + first.h / 2) * scale };
  await page.waitForTimeout(350);
  await clickAt(page, between);
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", "n:menu-5/~ul.1");
  const links = await frame(page).locator('[data-tree-node="menu-5"] ul').first().evaluate((el) => el.getBoundingClientRect().x - el.closest("[data-tree-node]")!.getBoundingClientRect().x);
  const before = (await writes(page)).length;
  await carry(page, between, 40, 0);
  await expect.poll(async () => (await writes(page)).length).toBeGreaterThan(before);
  const ops = (await writes(page)).slice(before).flatMap((w) => w.ops);
  expect(ops.some((op) => op.op === "setStyle" && op.nodeId === "menu-5" && op.style.moveX > 10)).toBe(true);
  expect(ops.some((op) => op.op === "setLookStyle")).toBe(false);
  await ready(page);
  // The links are where they were in their menu.
  expect(Math.abs(await frame(page).locator('[data-tree-node="menu-5"] ul').first().evaluate((el) => el.getBoundingClientRect().x - el.closest("[data-tree-node]")!.getBoundingClientRect().x) - links)).toBeLessThan(1);
});

test("the name carried from the header into the part under it goes there, and the view doesn't jump away", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  const zoom = await zoomNow(page);
  const name = await canvasPoint(page, '[data-tree-node="h-3"]');
  await clickAt(page, name);
  await expect(page.getByTestId("studio-info")).toContainText("h-3");
  const middle = await canvasPoint(page, '[data-tree-node="middle"]', 0.3, 0.6);
  await carry(page, name, middle.x - name.x, middle.y - name.y, async () => {
    await expect(page.getByTestId("studio-into")).toHaveAttribute("data-node", "middle");
  });
  await expect.poll(async () => (await nodeOf(page, "h-3"))?.parent?.id).toBe("middle");
  await ready(page);
  await page.waitForTimeout(1500);
  // The part is in sight already: the view isn't made smaller to frame it whole.
  expect(await zoomNow(page)).toBe(zoom);
});

test("a press on two that can't be carried together is still a click", async ({ page }) => {
  test.setTimeout(150000);
  await open(page, "&row&axes");
  // The name moves only sideways, the search only up and down: both selected, they can't go one way together.
  await clickAt(page, await canvasPoint(page, '[data-tree-node="brand"]'));
  await expect(page.getByTestId("studio-info")).toContainText("brand");
  await clickAt(page, await canvasPoint(page, '[data-tree-node="find"]', 0.3), ["Shift"]);
  await expect(page.getByTestId("studio-multi")).toHaveAttribute("data-count", "2");
  // A plain click on the search picks it alone (the press used to be dropped, and nothing happened at all).
  await page.waitForTimeout(350);
  await clickAt(page, await canvasPoint(page, '[data-tree-node="find"]', 0.3));
  await expect(page.getByTestId("studio-multi")).toHaveCount(0);
  await expect(page.getByTestId("studio-info")).toContainText("find");
});
