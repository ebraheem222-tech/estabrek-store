import { expect, test, type Page } from "@playwright/test";

// An element is never left unmovable on the canvas without a way out, and the view goes with a drag:
//  - under a part with a perspective of its own the shop can't measure an element as a plane; a flat one is still
//    moved and sized by hand (by its plain box);
//  - one that really can't be (turned into depth there, or in a holder with no height) says why and offers ways
//    out: back in its rows, measure again, pick what holds it;
//  - pan mode (Space) can't stay on: not with the Windows key (the keyboard's language switch), not after its
//    key-up was missed, not after the window lost the keyboard;
//  - zoomed in, a drag held at the canvas's right edge moves the canvas until the page's hidden side shows.

const base = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
async function canvasPoint(page: Page, selector: string) {
  const rect = await frame(page).locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = await page.getByTestId("studio-frame").boundingBox();
  const width = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const scale = box!.width / width;
  return { x: box!.x + rect.x * scale, y: box!.y + rect.y * scale };
}
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const styleOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__canvasHarness.getNode(x)?.node?.style?.base ?? {}, id);
async function open(page: Page, variant: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}&${variant}`);
  await ready(page);
}
async function pick(page: Page, id: string) {
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-info")).toContainText(id);
}
/** Presses on an element and carries it by (dx, dy) screen pixels; lets go unless told to hold. */
async function carry(page: Page, selector: string, dx: number, dy: number, hold = false) {
  const at = await canvasPoint(page, selector);
  await page.mouse.move(at.x - 4, at.y);
  await page.mouse.move(at.x, at.y, { steps: 3 });
  await page.mouse.down();
  await page.mouse.move(at.x + dx / 2, at.y + dy / 2, { steps: 10 });
  await page.mouse.move(at.x + dx, at.y + dy, { steps: 10 });
  if (!hold) await page.mouse.up();
  return at;
}

test("under a part with a perspective of its own, a flat element is still moved and sized by hand", async ({ page }) => {
  test.setTimeout(150000);
  await open(page, "stuck");
  // The shop can't measure it as a plane there (what holds it has a perspective), and says so.
  const measured = await page.evaluate(() => (window as any).__canvasHarness.getLayout().items.find((i: any) => i.kind === "node" && i.id === "flat")?.geometry);
  expect(measured).toMatchObject({ unsupported: true, why: "ancestor" });
  await pick(page, "flat");
  // It isn't refused: its handles show and nothing says it can't be moved.
  await expect(page.getByTestId("studio-stuck")).toHaveCount(0);
  await expect(page.getByTestId("studio-handle")).toHaveCount(8);
  const was = (await styleOf(page, "flat")).layer;
  await carry(page, '[data-tree-node="flat"]', 130, 0);
  await expect.poll(async () => (await styleOf(page, "flat")).layer?.x).toBeGreaterThan(was.x + 8);
  await ready(page);
  // Sized by its right-hand handle.
  await expect(page.getByTestId("studio-handle")).toHaveCount(8);
  const handle = (await page.locator('[data-testid="studio-handle"][data-handle="e"]').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 60, handle.y + handle.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => parseFloat(String((await styleOf(page, "flat")).width))).toBeGreaterThan(180);
});

test("what really can't be moved says why and offers a way out", async ({ page }) => {
  test.setTimeout(150000);
  await open(page, "stuck");
  // Turned into depth, inside the part with a perspective: it can't go by its plain box either.
  await pick(page, "tipped");
  const note = page.getByTestId("studio-stuck");
  await expect(note).toHaveAttribute("data-why", "ancestor");
  await expect(note).toContainText("turned into depth");
  await expect(page.getByTestId("studio-handle")).toHaveCount(0);
  // Back in its rows: its free place and its turn are taken off, and it can be held again.
  await page.getByTestId("studio-stuck-reset").click();
  await expect.poll(async () => { const s = await styleOf(page, "tipped"); return [s.layer, s.rotateX]; }).toEqual([undefined, undefined]);
  await ready(page);
  await expect(note).toHaveCount(0);
  await expect.poll(() => page.getByTestId("studio-handle").count()).toBeGreaterThan(0);

  // In a holder with no height there is nowhere to place it: the note says so, and picks the holder.
  await pick(page, "lost");
  await expect(note).toHaveAttribute("data-why", "holder");
  await expect(note).toContainText("no room");
  // Measured again, it is still so (the page is just read again).
  await page.getByTestId("studio-stuck-measure").click();
  await ready(page);
  await expect(note).toHaveAttribute("data-why", "holder");
  await page.getByTestId("studio-stuck-holder").click();
  await expect(page.getByTestId("studio-info")).toContainText("Thin holder");
  await expect(note).toHaveCount(0);
});

test("pan mode can't stay on: the Windows key with Space, a missed key-up, a window that lost the keyboard", async ({ page }) => {
  test.setTimeout(150000);
  await open(page, "stuck");
  const canvas = page.getByTestId("studio-canvas");
  const empty = await canvasPoint(page, '[data-tree-node="plain"]');
  await page.mouse.click(empty.x + 300, empty.y + 20);
  await expect(canvas).toHaveCSS("cursor", "default");

  // Space by itself: pan mode, until the key comes up.
  await page.keyboard.down("Space");
  await expect(canvas).toHaveCSS("cursor", "grab");
  await page.keyboard.up("Space");
  await expect(canvas).toHaveCSS("cursor", "default");

  // With the Windows key (the keyboard's language switch), Ctrl or Alt it is the system's: no pan mode.
  for (const key of ["Meta", "Control", "Alt"]) {
    await page.keyboard.down(key);
    await page.keyboard.down("Space");
    await expect(canvas).toHaveCSS("cursor", "default");
    await page.keyboard.up("Space");
    await page.keyboard.up(key);
  }

  // The window loses the keyboard while Space is down: pan mode goes.
  await page.keyboard.down("Space");
  await expect(canvas).toHaveCSS("cursor", "grab");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(canvas).toHaveCSS("cursor", "default");
  await page.keyboard.up("Space");

  // The key-up never arrives (it went to another window): after a moment with no word from Space, a press on an
  // element moves the element, not the canvas, and pan mode is over. (The button is brought into the frame first.)
  await pick(page, "free");
  await ready(page);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })));
  await expect(canvas).toHaveCSS("cursor", "grab");
  await page.waitForTimeout(1700);
  const framed = (await page.getByTestId("studio-frame").boundingBox())!;
  const was = (await styleOf(page, "free")).layer;
  await carry(page, '[data-tree-node="free"]', 110, 0);
  await expect.poll(async () => (await styleOf(page, "free")).layer?.x).toBeGreaterThan(was.x + 6);
  await expect(canvas).toHaveCSS("cursor", "default");
  // The canvas itself stayed where it was.
  expect(Math.abs((await page.getByTestId("studio-frame").boundingBox())!.x - framed.x)).toBeLessThan(1);
});

test("zoomed in, a drag held at the canvas's right edge brings the page's hidden side into sight", async ({ page }) => {
  test.setTimeout(180000);
  await open(page, "twoParts");
  await page.getByTestId("studio-drag-toggle").click();
  await page.getByTestId("studio-drag-follow").uncheck();
  await page.getByTestId("studio-drag-toggle").click();
  // Closer, around the button (about one and a half times): the page is now wider than the canvas, its right side
  // out of sight.
  const first = await canvasPoint(page, '[data-tree-node="action"]');
  await page.mouse.move(first.x, first.y);
  await page.keyboard.down("Control");
  for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, -260); await page.waitForTimeout(150); }
  await page.keyboard.up("Control");
  await page.waitForTimeout(500);
  const canvas = (await page.getByTestId("studio-canvas").boundingBox())!;
  const before = (await page.getByTestId("studio-frame").boundingBox())!;
  const right = canvas.x + canvas.width;
  expect(before.x + before.width).toBeGreaterThan(right + 150);
  const was = (await styleOf(page, "action")).layer;
  /** How far across the page the button's middle is (0 = its left edge, 1 = its right edge). */
  const across = async () => { const f = (await page.getByTestId("studio-frame").boundingBox())!; return ((await canvasPoint(page, '[data-tree-node="action"]')).x - f.x) / f.width; };
  const start = await across();

  // Carried to the canvas's right edge and held there: the canvas moves until the page's right edge shows.
  const at = await canvasPoint(page, '[data-tree-node="action"]');
  await page.mouse.move(at.x - 4, at.y);
  await page.mouse.move(at.x, at.y, { steps: 3 });
  await page.mouse.down();
  await page.mouse.move(at.x + 20, at.y, { steps: 4 });
  await page.mouse.move(right - 10, at.y, { steps: 16 });
  await expect.poll(async () => { const f = (await page.getByTestId("studio-frame").boundingBox())!; return f.x + f.width; }, { timeout: 30000 }).toBeLessThanOrEqual(right - 20);
  const after = (await page.getByTestId("studio-frame").boundingBox())!;
  expect(before.x - after.x).toBeGreaterThan(140);
  // It stops there: the page doesn't wander off the canvas.
  await page.waitForTimeout(500);
  expect(Math.abs((await page.getByTestId("studio-frame").boundingBox())!.x - after.x)).toBeLessThan(2);
  // The button went with the pointer while the canvas went by under it, as far as its part lets it (it stays
  // inside its holder): it is now at the right of the page, and in sight.
  const held = await canvasPoint(page, '[data-tree-node="action"]');
  expect(await across()).toBeGreaterThan(Math.max(0.8, start + 0.3));
  expect(held.x).toBeGreaterThan(canvas.x + canvas.width / 2);
  expect(held.x).toBeLessThan(right);
  expect(Math.abs(held.y - at.y)).toBeLessThan(30);
  // Let go: it is saved at the right of its part.
  await page.mouse.up();
  await expect.poll(async () => (await styleOf(page, "action")).layer?.x).toBeGreaterThan(Math.max(85, was.x + 30));
});
