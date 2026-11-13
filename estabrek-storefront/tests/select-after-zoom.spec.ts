import { expect, test, type Page } from "@playwright/test";

// Picking and dragging keep working when the canvas has zoomed (by itself for a pick, with the inspector beside
// the element, or by hand): a press while the canvas is still coming closer isn't lost, a picked object can be
// dragged at once, a big object never shrinks the page, the wheel reaches the whole page when the frame is bigger
// than the canvas, and the highlight is always what a click would pick.

const base = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const info = (page: Page) => page.getByTestId("studio-info");
async function canvasBox(page: Page, selector: string) {
  const r = await frame(page).locator(selector).first().evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const width = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const scale = box.width / width;
  return { x: box.x + r.x * scale, y: box.y + r.y * scale, w: r.w * scale, h: r.h * scale, scale };
}
const zoomNow = async (page: Page) => Number((await page.getByTestId("studio-zoom").innerText()).replace("%", ""));
const selectedName = (page: Page) => page.getByTestId("studio-selected-name").first();
async function open(page: Page, query: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  // The canvas glides to a pick (it jumps there for someone who asked for less motion).
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${base}${query}`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__canvasHarness.getLayout()))).toBe(true);
}
/** The pointer comes to rest on a point (the highlight is a vote over the last moments). */
async function rest(page: Page, x: number, y: number) {
  await page.mouse.move(x - 6, y - 4);
  await page.mouse.move(x - 2, y - 1, { steps: 3 });
  await page.mouse.move(x, y, { steps: 2 });
}
const inside = (p: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }) => p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h;

test.describe("with the inspector beside the element", () => {
  test("a press while the canvas is still coming closer to the last pick isn't lost", async ({ page }) => {
    test.setTimeout(150000);
    await open(page, "&middle&beside");
    const before = await zoomNow(page);
    const b = await canvasBox(page, '[data-tree-node="action"]');
    const p = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    await rest(page, p.x, p.y);
    await page.mouse.click(p.x, p.y);
    // The canvas is on its way to the button now (or about to be). A click on the same spot with Alt goes round
    // what's under the pointer: from the button to the section it's in.
    await page.waitForTimeout(480);
    await page.keyboard.down("Alt");
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.keyboard.up("Alt");
    await expect(selectedName(page)).toContainText("Section");
    // The button comes closer around the pointer: what was clicked is still under it.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(selectedName(page)).toHaveCount(0);
    await page.mouse.click(p.x, p.y);
    await expect(selectedName(page)).toContainText("Button");
    await expect.poll(() => zoomNow(page), { timeout: 10000 }).toBeGreaterThan(before + 15);
    await page.waitForTimeout(700);
    expect(inside(p, await canvasBox(page, '[data-tree-node="action"]'))).toBe(true);
  });

  test("a picked object can be dragged at once, while the canvas is still coming closer", async ({ page }) => {
    test.setTimeout(150000);
    await open(page, "&middle&beside");
    const b = await canvasBox(page, '[data-tree-node="action"]');
    const p = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const was = (await frame(page).locator('[data-tree-node="action"]').boundingBox())!;
    await rest(page, p.x, p.y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(480);
    await page.mouse.down();
    await page.mouse.move(p.x + 40, p.y + 30, { steps: 8 });
    await page.mouse.move(p.x + 90, p.y + 70, { steps: 8 });
    // The strips and the panel are out of the way while it moves.
    await expect(page.getByTestId("studio-placing")).toBeVisible();
    await expect(page.getByTestId("studio-beside-strip")).toHaveCount(0);
    await expect(info(page)).toBeHidden();
    await page.mouse.up();
    await expect.poll(async () => (await page.evaluate(() => (window as any).__canvasHarness.getWrites())).some((w: any) => w.ops.some((op: any) => op.nodeId === "action" && op.op === "setStyle"))).toBe(true);
    await expect.poll(async () => (await frame(page).locator('[data-tree-node="action"]').boundingBox())!.y).toBeGreaterThan(was.y + 20);
    await expect(page.getByTestId("studio-beside-strip").first()).toBeVisible();
  });

  test("a big object never makes the page smaller; both clicks of a slow double click land on the same words", async ({ page }) => {
    test.setTimeout(150000);
    await open(page, "&middle&beside");
    const before = await zoomNow(page);
    const frameWas = (await page.getByTestId("studio-frame").boundingBox())!;
    // The section itself (its empty part): taller than the screen, wider than the canvas's free part.
    const head = await canvasBox(page, '[data-tree-node="headline"]');
    const empty = { x: head.x + 120, y: head.y + 420 * head.scale };
    await rest(page, empty.x, empty.y);
    await page.mouse.click(empty.x, empty.y);
    await expect(selectedName(page)).toContainText("Section");
    await page.waitForTimeout(1200);
    expect(await zoomNow(page)).toBe(before);
    const frameNow = (await page.getByTestId("studio-frame").boundingBox())!;
    expect(Math.abs(frameNow.x - frameWas.x)).toBeLessThan(1);
    expect(Math.abs(frameNow.y - frameWas.y)).toBeLessThan(1);
    expect(Math.abs(frameNow.width - frameWas.width)).toBeLessThan(1);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    // A slow double click on the button: the canvas waits (and then comes closer around the pointer), so both
    // clicks land on it and its words open for writing.
    const b = await canvasBox(page, '[data-tree-node="action"]');
    const p = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    await rest(page, p.x, p.y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(230);
    await page.mouse.click(p.x, p.y, { clickCount: 2 });
    await expect(page.getByTestId("studio-overlay")).toHaveAttribute("data-editing", "1");
    await expect(frame(page).locator('[data-tree-node="action"][contenteditable], [data-tree-node="action"] [contenteditable]').first()).toBeVisible();
  });

  test("with nothing selected the panel stays off the page until asked for", async ({ page }) => {
    test.setTimeout(150000);
    await open(page, "&middle&beside");
    await expect(info(page)).toHaveAttribute("data-dock", "beside");
    await expect(info(page)).toBeHidden();
    await page.getByTestId("studio-insp-show").click();
    await expect(info(page)).toBeVisible();
    await expect(info(page).getByTestId("studio-insp-dock")).toBeVisible();
    await page.getByTestId("studio-insp-show").click();
    await expect(info(page)).toBeHidden();

    // The page itself (a click on its empty part selects the section; Escape goes up to the page): its settings
    // show, and the panel's own ✕ takes it off the page again, so what's under it can be reached.
    const head = await canvasBox(page, '[data-tree-node="headline"]');
    await page.mouse.click(head.x + 120, head.y + 420 * head.scale);
    await expect(selectedName(page)).toContainText("Section");
    await expect(info(page)).toBeVisible();
    await info(page).getByTestId("studio-insp-hide").click();
    await expect(info(page)).toBeHidden();
    // Its tab on the strip beside it brings it back.
    await page.getByTestId("studio-beside-tab").first().click();
    await expect(info(page)).toBeVisible();
  });
});

test("showing an element from the layers never moves the canvas's own content: the settings stay around it and a click still lands", async ({ page }) => {
  test.setTimeout(180000);
  // One of every kind, the inspector beside the element: a small one comes closer, so the frame is bigger than
  // the canvas; then another is shown from the layers (the frame scrolls its own page to it).
  await open(page, "&everyKind&beside");
  await page.getByTestId("studio-tab-layers").click();
  const scrolled = () => page.getByTestId("studio-canvas").evaluate((el) => `${el.scrollLeft},${el.scrollTop}`);
  const layer = (kind: string) => page.locator(`[data-testid="studio-layer"][data-node="kind-${kind}"]`).click();
  await layer("icon");
  await expect.poll(() => zoomNow(page), { timeout: 10000 }).toBeGreaterThan(120);
  for (const kind of ["map", "button", "image"]) {
    await layer(kind);
    await expect(info(page)).toContainText(`kind-${kind}`);
    await page.waitForTimeout(1500);
    expect(await scrolled(), kind).toBe("0,0");
    // The outline is where the element really is, and the two strips stand on its two sides.
    const real = await canvasBox(page, `[data-tree-node="kind-${kind}"]`);
    const outline = (await page.getByTestId("studio-selected").first().boundingBox())!;
    expect(Math.abs(outline.x - real.x), kind).toBeLessThan(3);
    const strips = await page.getByTestId("studio-beside-strip").evaluateAll((els) => Object.fromEntries(els.map((e) => { const b = e.getBoundingClientRect(); return [e.getAttribute("data-side"), { x: b.x, w: b.width }]; })));
    expect(strips.left.x + strips.left.w, kind).toBeLessThanOrEqual(outline.x + 1);
    expect(strips.right.x, kind).toBeGreaterThanOrEqual(outline.x + outline.width - 1);
  }
  // A click on the page still picks what's under the pointer.
  const pic = await canvasBox(page, '[data-tree-node="kind-image"]');
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  const again = await canvasBox(page, '[data-tree-node="kind-image"]');
  expect(pic.w).toBeGreaterThan(0);
  await rest(page, again.x + again.w / 2, again.y + Math.min(again.h / 2, 120));
  await page.mouse.click(again.x + again.w / 2, again.y + Math.min(again.h / 2, 120));
  await expect(info(page)).toContainText("kind-image");
  expect(await scrolled()).toBe("0,0");
});

test("words and buttons the shop lets clicks through are picked themselves, not the picture behind them", async ({ page }) => {
  test.setTimeout(150000);
  // A converted store's home: the opening's words lie over its picture and take no pointer on the shop itself.
  await open(page, "&home");
  const h1 = frame(page).locator("h1.hero-headline").first();
  await expect(h1).toBeVisible({ timeout: 30000 });
  expect(await h1.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  const words = await canvasBox(page, "h1.hero-headline");
  await rest(page, words.x + Math.min(60, words.w / 2), words.y + words.h / 2);
  await page.mouse.click(words.x + Math.min(60, words.w / 2), words.y + words.h / 2);
  await expect(selectedName(page)).toContainText("Big title");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  const cta = await canvasBox(page, ".atelier-hero a.atelier-button");
  await rest(page, cta.x + cta.w / 2, cta.y + cta.h / 2);
  await page.mouse.click(cta.x + cta.w / 2, cta.y + cta.h / 2);
  await expect(selectedName(page)).toContainText("First button");
  // Beside the words, the picture is what's there.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  const picture = await canvasBox(page, ".hero-image-wrap");
  await rest(page, picture.x + picture.w * 0.86, words.y);
  await page.mouse.click(picture.x + picture.w * 0.86, words.y);
  await expect(selectedName(page)).toContainText("Opening picture");
});

test("zoomed in by hand, the wheel reaches the page's end and its top; the highlight follows the page", async ({ page }) => {
  test.setTimeout(150000);
  await open(page, "&middle");
  const canvas = (await page.getByTestId("studio-canvas").boundingBox())!;
  const mid = { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 };
  await page.mouse.move(mid.x, mid.y);
  await page.keyboard.down("Control");
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -200); await page.waitForTimeout(60); }
  await page.keyboard.up("Control");
  await expect.poll(() => zoomNow(page)).toBeGreaterThan(150);
  // The frame is now taller than the canvas: its top and its bottom are both out of sight.
  const start = (await page.getByTestId("studio-frame").boundingBox())!;
  expect(start.y).toBeLessThan(canvas.y);
  expect(start.y + start.height).toBeGreaterThan(canvas.y + canvas.height);

  // The highlight is what's under the pointer, also after the page moved under a still pointer.
  const b = await canvasBox(page, '[data-tree-node="action"]');
  const p = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  expect(p.y).toBeGreaterThan(canvas.y + 10);
  expect(p.y).toBeLessThan(canvas.y + canvas.height - 10);
  await rest(page, p.x, p.y);
  await expect(page.getByTestId("studio-hover-name")).toContainText("Button");
  await page.mouse.wheel(0, 500);
  await expect(page.getByTestId("studio-hover-name").filter({ hasText: "Button" })).toHaveCount(0);

  // Down to the page's end: the frame's bottom comes into sight.
  await page.mouse.move(mid.x, mid.y);
  for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(60); }
  await expect.poll(async () => { const f = (await page.getByTestId("studio-frame").boundingBox())!; return f.y + f.height; }).toBeLessThanOrEqual(canvas.y + canvas.height);
  // And back to its top: the frame's top comes into sight, and the first object can be picked.
  for (let i = 0; i < 24; i++) { await page.mouse.wheel(0, -600); await page.waitForTimeout(60); }
  await expect.poll(async () => (await page.getByTestId("studio-frame").boundingBox())!.y).toBeGreaterThanOrEqual(canvas.y);
  const top = await canvasBox(page, '[data-tree-node="headline"]');
  const px = Math.min(Math.max(top.x + 40, canvas.x + 20), canvas.x + canvas.width - 20);
  await rest(page, px, top.y + top.h / 2);
  await page.mouse.click(px, top.y + top.h / 2);
  await expect(info(page)).toContainText("headline");
});
