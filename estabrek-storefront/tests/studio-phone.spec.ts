import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// The page editor on a phone (the admin's studio/phone.ts), in a real browser at a phone's size with touch:
// one bar on top, one at the bottom, a sheet that shows one job at a time, the phone frame fitted to the screen,
// and two fingers that zoom the canvas.
const url = (more = "") => `http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en${more}`;
const W = 390, H = 844;

async function phone(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(url());
  await expect(page.getByTestId("studio-phone-bar")).toBeVisible({ timeout: 90000 });
  await expect(page.getByTestId("studio-waiting")).toHaveCount(0, { timeout: 90000 });
  // The frame has been fitted (the canvas knows its size) and the page in it has been measured.
  await expect.poll(async () => Number(await page.getByTestId("studio-canvas").getAttribute("data-zoom")), { timeout: 30000 }).toBeGreaterThan(90);
  return { context, page };
}
const rect = async (page: Page, id: string) => (await page.getByTestId(id).boundingBox())!;
const zoomOf = async (page: Page) => Number(await page.getByTestId("studio-canvas").getAttribute("data-zoom"));
const kids = (page: Page) => page.evaluate(() => ((window as unknown as { __canvasHarness: { getDraft(): { tree: { root: { children: Array<{ children?: unknown[] }> } } } } }).__canvasHarness.getDraft().tree.root.children[0].children ?? []).length);
/** Picks an element by its row in the layers sheet (the sheet closes, and the bar under the canvas names it). */
async function pick(page: Page, name: string) {
  await page.getByTestId("studio-phone-tab-layers").tap();
  await expect(page.getByTestId("studio-sheet")).toHaveAttribute("data-view", "layers");
  await page.locator('[data-testid="studio-layer"]', { hasText: name }).first().tap();
  await expect(page.getByTestId("studio-sheet")).toHaveCount(0);
  await expect(page.getByTestId("studio-bar-name")).toContainText(name);
}
/** Fingers on the canvas, through the browser's own touch input (one point, or two the same distance from a middle). */
async function fingers(context: BrowserContext, page: Page, steps: Array<Array<{ x: number; y: number }>>) {
  const cdp = await context.newCDPSession(page);
  const send = (type: string, points: Array<{ x: number; y: number }>) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })) } as never);
  await send("touchStart", steps[0]);
  for (const step of steps.slice(1)) { await send("touchMove", step); await page.waitForTimeout(30); }
  await send("touchEnd", []);
  await cdp.detach();
}

test("the bars leave the screen to the page: one row on top, the jobs at the bottom, the frame fitted", async ({ browser }) => {
  test.setTimeout(180000);
  const { context, page } = await phone(browser);
  const head = await rect(page, "studio-phone-head"), canvas = await rect(page, "studio-canvas"), frame = await rect(page, "studio-frame"), bar = await rect(page, "studio-phone-bar");
  // One row on top (it was five rows of buttons), and nothing wider than the screen.
  expect(head.height).toBeLessThanOrEqual(60);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(W);
  // The canvas has most of the screen, and the phone frame fills it: as wide as it can be, none of it under the bars.
  expect(canvas.height).toBeGreaterThanOrEqual(640);
  expect(frame.width).toBeGreaterThanOrEqual(360);
  expect(frame.x).toBeGreaterThanOrEqual(0);
  expect(frame.x + frame.width).toBeLessThanOrEqual(W);
  expect(frame.y + frame.height).toBeLessThanOrEqual(canvas.y + canvas.height + 1);
  expect(frame.height).toBeGreaterThanOrEqual(canvas.height - 24);
  expect(bar.y + bar.height).toBeLessThanOrEqual(H + 1);
  // What is pressed all the time is in reach, at a finger's size; the computer's columns aren't drawn at all.
  for (const id of ["studio-undo", "studio-redo", "studio-publish", "studio-more-toggle"]) {
    const b = await rect(page, id);
    expect(b.height, id).toBeGreaterThanOrEqual(40);
  }
  for (const tab of ["add", "layers", "settings", "looks", "styles"]) {
    const b = await rect(page, `studio-phone-tab-${tab}`);
    expect(b.height, tab).toBeGreaterThanOrEqual(48);
    expect(b.width, tab).toBeGreaterThanOrEqual(64);
  }
  await expect(page.getByTestId("studio-info")).toHaveCount(0);
  await expect(page.getByTestId("studio-tab-layers")).toHaveCount(0);
  await expect(page.getByTestId("studio-bar-hint")).toBeVisible();

  // A tap on the page selects what is there, and the bar under the canvas names it without the canvas changing size.
  await page.touchscreen.tap(canvas.x + canvas.width / 2, canvas.y + 260);
  await expect(page.getByTestId("studio-bar-name")).toBeVisible();
  expect((await rect(page, "studio-canvas")).height).toBe(canvas.height);
  await page.getByTestId("studio-bar-clear").tap();
  await expect(page.getByTestId("studio-bar-hint")).toBeVisible();
  await context.close();
});

test("an element's settings open in a sheet, one group at a time, with the element still in sight", async ({ browser }) => {
  test.setTimeout(180000);
  const { context, page } = await phone(browser);
  // Low on the page: its settings sheet would cover it, so the page brings it up.
  await pick(page, "Questions");
  await page.getByTestId("studio-phone-tab-settings").tap();
  const sheet = page.getByTestId("studio-sheet");
  await expect(sheet).toHaveAttribute("data-view", "settings");
  await expect(page.getByTestId("studio-sheet-title")).toContainText("Settings");
  // The sheet sits above the row of jobs (they stay in reach) and leaves the top of the canvas to the page.
  const s = (await sheet.boundingBox())!, tabs = await rect(page, "studio-phone-tab-settings"), canvas = await rect(page, "studio-canvas");
  expect(s.y + s.height).toBeLessThanOrEqual(tabs.y + 1);
  expect(s.y).toBeGreaterThanOrEqual(canvas.y + 200);
  await expect.poll(async () => {
    const ring = await page.getByTestId("studio-selected-size").boundingBox();
    return ring ? ring.y > canvas.y && ring.y + ring.height < s.y : false;
  }, { timeout: 10000 }).toBe(true);
  // Its settings: the element's name and path, and its groups as tabs (one shown at a time), the first one open.
  await expect(sheet.getByTestId("studio-path")).toContainText("Questions");
  const chips = sheet.getByTestId("studio-insp-chip");
  expect(await chips.count()).toBeGreaterThanOrEqual(3);
  await expect(chips.first()).toHaveAttribute("aria-selected", "true");
  for (const chip of await chips.all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(28);
  const look = sheet.locator('[data-testid="studio-insp-chip"][data-group="look"]');
  await look.tap();
  await expect(look).toHaveAttribute("aria-selected", "true");
  await expect(chips.first()).toHaveAttribute("aria-selected", "false");
  // The search bar stays flush with the sheet's top as the settings scroll under it, and finds a setting by name.
  const body = page.getByTestId("studio-sheet-body");
  await body.evaluate((el) => el.scrollBy(0, 400));
  await expect.poll(() => page.evaluate(() => {
    const b = document.querySelector('[data-testid="studio-sheet-body"]')!;
    return Math.round(b.querySelector('[data-testid="studio-insp-jump"]')!.getBoundingClientRect().top - b.getBoundingClientRect().top);
  })).toBe(0);
  // A field in the sheet is written at 16px (a phone's browser zooms the page in on smaller ones).
  expect(await sheet.getByTestId("studio-insp-find").evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
  // Pulled up, the sheet takes nearly the whole screen; pressed again, it comes back.
  await page.getByTestId("studio-sheet-size").tap();
  await expect.poll(async () => (await sheet.boundingBox())!.height).toBeGreaterThan(600);
  await page.getByTestId("studio-sheet-size").tap();
  await expect.poll(async () => (await sheet.boundingBox())!.height).toBeLessThan(520);
  // Another job takes the sheet's place, from its top; the job's own tab pressed again closes it.
  await page.getByTestId("studio-phone-tab-looks").tap();
  await expect(sheet).toHaveAttribute("data-view", "looks");
  expect(await page.getByTestId("studio-sheet-body").evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByTestId("studio-phone-tab-looks").tap();
  await expect(sheet).toHaveCount(0);
  await context.close();
});

test("adding from the sheet puts the element on the page and gets out of its way; undo is one press", async ({ browser }) => {
  test.setTimeout(180000);
  const { context, page } = await phone(browser);
  await pick(page, "Editable drawing");
  const before = await kids(page);
  await page.getByTestId("studio-phone-tab-add").tap();
  await expect(page.getByTestId("studio-sheet")).toHaveAttribute("data-view", "add");
  const item = page.locator('[data-testid="studio-add-item"][data-kind="heading"]');
  await item.scrollIntoViewIfNeeded();
  expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(40);
  await item.tap();
  await expect.poll(() => kids(page), { timeout: 20000 }).toBe(before + 1);
  // The new heading is selected and the sheet has closed, so it shows.
  await expect(page.getByTestId("studio-sheet")).toHaveCount(0);
  await expect(page.getByTestId("studio-bar-name")).toContainText("Heading");
  await expect(page.getByTestId("studio-draft-state")).toContainText("Draft");
  // Its words are written in the page from the bar (a finger has no double-click to count on); while they are, the
  // top bar has one button, and pressing it keeps them.
  await page.getByTestId("studio-bar-edit").tap();
  const done = page.getByTestId("studio-write-done");
  await expect(done).toBeVisible();
  await expect(page.getByTestId("studio-publish")).toHaveCount(0);
  // The page's own writing toolbar sits clear of the words being written (above them, or under them), not over them.
  const inFrame = page.frameLocator('[data-testid="studio-frame"]');
  const words = (await inFrame.locator('[contenteditable="true"]').boundingBox())!, toolbar = (await inFrame.locator("[data-studio-bar]").boundingBox())!;
  expect(toolbar.y + toolbar.height <= words.y || toolbar.y >= words.y + words.height).toBe(true);
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Written on a phone");
  await done.tap();
  await expect(done).toHaveCount(0);
  await expect(page.frameLocator('[data-testid="studio-frame"]').getByText("Written on a phone")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("studio-publish")).toBeEnabled({ timeout: 20000 });
  // Undo twice: the words, then the heading itself.
  await page.getByTestId("studio-undo").tap();
  await expect(page.frameLocator('[data-testid="studio-frame"]').getByText("Written on a phone")).toHaveCount(0, { timeout: 20000 });
  await expect(page.getByTestId("studio-undo")).toBeEnabled({ timeout: 20000 });
  await page.getByTestId("studio-undo").tap();
  await expect.poll(() => kids(page), { timeout: 20000 }).toBe(before);
  await context.close();
});

test("the rest of the editor's tools wait behind 'more': another screen size, and back", async ({ browser }) => {
  test.setTimeout(180000);
  const { context, page } = await phone(browser);
  await page.getByTestId("studio-more-toggle").tap();
  const sheet = page.getByTestId("studio-sheet");
  await expect(sheet).toHaveAttribute("data-view", "more");
  for (const id of ["studio-refresh-view", "studio-zoom", "studio-canvas-mode-free", "studio-motion-live", "studio-theme-toggle", "studio-deep-selection", "studio-history-toggle"]) await expect(sheet.getByTestId(id), id).toHaveCount(1);
  // A computer's screen, seen whole on the phone; then the phone's own, fitted again.
  await sheet.locator('[data-testid="studio-device"][data-device="desktop"]').tap();
  await expect(page.getByTestId("studio-frame")).toHaveAttribute("width", "1280");
  await expect.poll(() => zoomOf(page)).toBeLessThan(40);
  const wide = await rect(page, "studio-frame");
  expect(wide.x).toBeGreaterThanOrEqual(0);
  expect(wide.x + wide.width).toBeLessThanOrEqual(W);
  await sheet.locator('[data-testid="studio-device"][data-device="phone"]').tap();
  await expect(page.getByTestId("studio-frame")).toHaveAttribute("width", "390");
  await expect.poll(() => zoomOf(page)).toBeGreaterThan(90);
  await page.getByTestId("studio-more-toggle").tap();
  await expect(sheet).toHaveCount(0);
  await context.close();
});

test("two fingers zoom the canvas and pick nothing; one finger scrolls the page", async ({ browser }) => {
  test.setTimeout(180000);
  const { context, page } = await phone(browser);
  const canvas = await rect(page, "studio-canvas");
  const cx = canvas.x + canvas.width / 2, cy = canvas.y + 300;
  const start = await zoomOf(page);
  const apart = (d: number) => [{ x: cx - d, y: cy }, { x: cx + d, y: cy }];
  await fingers(context, page, [40, 50, 65, 80, 100, 120].map(apart));
  await expect.poll(() => zoomOf(page)).toBeGreaterThan(start * 2);
  await expect(page.getByTestId("studio-bar-hint")).toBeVisible();
  await fingers(context, page, [120, 100, 80, 65, 50, 40].map(apart));
  await expect.poll(() => zoomOf(page)).toBeLessThan(start * 1.1);
  // "Fit" (behind "more") brings the fitted view back whatever the fingers did.
  await fingers(context, page, [40, 60, 90].map(apart));
  await page.getByTestId("studio-more-toggle").tap();
  await page.getByTestId("studio-zoom").tap();
  await expect.poll(() => zoomOf(page)).toBe(start);
  await page.getByTestId("studio-sheet-close").tap();

  // One finger dragged up the page scrolls it (the shop's own page, inside the frame), and selects nothing.
  const scrolled = () => page.frameLocator('[data-testid="studio-frame"]').locator("html").evaluate(() => window.scrollY);
  expect(await scrolled()).toBe(0);
  await fingers(context, page, [520, 460, 400, 340, 280, 220].map((y) => [{ x: cx, y: canvas.y + y }]));
  await expect.poll(scrolled, { timeout: 10000 }).toBeGreaterThan(100);
  await expect(page.getByTestId("studio-bar-hint")).toBeVisible();
  await context.close();
});

test("a finger takes a selection's handle from a little way round it and resizes the element", async ({ browser }) => {
  test.setTimeout(180000);
  const { context, page } = await phone(browser);
  await pick(page, "Editable drawing");
  const size = page.getByTestId("studio-selected-size");
  await expect(size).toHaveText("180×180");
  // The corner handle furthest down and to the right; the finger lands 9px off its middle (outside the square itself).
  const handles = await page.locator("[data-studio-handle]").all();
  const boxes = await Promise.all(handles.map(async (h) => (await h.boundingBox())!));
  const corner = boxes.reduce((best, b) => (b.x + b.y > best.x + best.y ? b : best));
  expect(corner.width).toBeGreaterThanOrEqual(13);
  const hx = corner.x + corner.width / 2 + 9, hy = corner.y + corner.height / 2 + 9;
  await fingers(context, page, [0, 8, 16, 24, 32, 40].map((d) => [{ x: hx + d, y: hy + d }]));
  await expect(size).not.toHaveText("180×180", { timeout: 20000 });
  const [w, h] = ((await size.textContent()) ?? "").split("×").map(Number);
  expect(w).toBeGreaterThan(200);
  expect(h).toBeGreaterThan(200);
  await expect(page.getByTestId("studio-undo")).toBeEnabled({ timeout: 20000 });
  await page.getByTestId("studio-undo").tap();
  await expect(size).toHaveText("180×180", { timeout: 20000 });
  await context.close();
});

test("a phone held sideways gets the phone's layout too, and a pull at the page's edge doesn't reload the editor", async ({ browser }) => {
  test.setTimeout(180000);
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(url());
  await expect(page.getByTestId("studio-phone-bar")).toBeVisible({ timeout: 90000 });
  await expect(page.getByTestId("studio-waiting")).toHaveCount(0, { timeout: 90000 });
  // One row on top, the jobs at the bottom, the phone's own frame in the canvas between them.
  expect((await rect(page, "studio-phone-head")).height).toBeLessThanOrEqual(60);
  await expect(page.getByTestId("studio-info")).toHaveCount(0);
  await expect(page.getByTestId("studio-frame")).toHaveAttribute("width", "390");
  const canvas = await rect(page, "studio-canvas"), frame = await rect(page, "studio-frame");
  expect(canvas.height).toBeGreaterThanOrEqual(200);
  expect(frame.y + frame.height).toBeLessThanOrEqual(canvas.y + canvas.height + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(844);
  // The page under the editor doesn't answer a pull at its edge (a phone's pull-to-refresh, a swipe back).
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)).toBe("none");
  // A sheet still opens above the row of jobs and leaves some of the canvas in sight.
  await page.getByTestId("studio-phone-tab-layers").tap();
  const sheet = (await page.getByTestId("studio-sheet").boundingBox())!;
  expect(sheet.y).toBeGreaterThanOrEqual(canvas.y);
  expect(sheet.y + sheet.height).toBeLessThanOrEqual((await rect(page, "studio-phone-tab-layers")).y + 1);
  await context.close();
});

test("the video editor is not left under the sheet it was opened from, and fits the phone: stacked, trimmed and cut by finger", async ({ browser }) => {
  test.setTimeout(180000);
  const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(url("&video"));
  await expect(page.getByTestId("studio-phone-bar")).toBeVisible({ timeout: 90000 });
  await expect(page.getByTestId("studio-waiting")).toHaveCount(0, { timeout: 90000 });
  await page.getByTestId("studio-phone-tab-layers").tap();
  await page.locator('[data-testid="studio-layer"][data-node="clip"]').tap();
  await page.getByTestId("studio-phone-tab-settings").tap();
  const tool = page.locator('[data-testid="studio-tool"][data-tool="video-editor"]');
  await expect(tool).toBeVisible();
  await tool.tap();
  await expect(page.getByTestId("studio-video-editor")).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("studio-sheet")).toHaveCount(0);

  // The video editor itself fits the phone: its parts are stacked, none wider than the screen.
  const editor = page.getByTestId("studio-video-editor");
  const preview = editor.getByTestId("video-preview");
  await expect(preview).toBeVisible({ timeout: 30000 });
  const part = async (id: string) => (await editor.getByTestId(id).first().boundingBox())!;
  await expect.poll(async () => (await part("video-preview")).height, { timeout: 10000 }).toBeLessThanOrEqual(Math.round(H * 0.3) + 1);
  const pre = await part("video-preview"), insp = await part("video-inspector"), line = await part("video-timeline"), clips = await part("video-clips");
  expect(pre.x).toBeGreaterThanOrEqual(0);
  expect(pre.x + pre.width).toBeLessThanOrEqual(W);
  expect(insp.y).toBeGreaterThanOrEqual(pre.y + pre.height);
  expect(insp.width).toBe(W);
  expect(insp.height).toBeGreaterThanOrEqual(120);
  expect(line.y).toBeGreaterThanOrEqual(insp.y + insp.height - 1);
  expect(line.y + line.height).toBeLessThanOrEqual(H + 1);
  expect(clips.width).toBeGreaterThanOrEqual(340);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(W);
  for (const id of ["video-close", "video-save", "video-split", "video-add-words", "video-play"]) expect((await part(id)).height, id).toBeGreaterThanOrEqual(40);

  // A tap on the clip opens its settings under the preview, with fields at 16px.
  await editor.getByTestId("video-clip").first().tap();
  const out = editor.getByTestId("video-clip-out");
  await expect(out).toBeVisible();
  expect(await out.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
  const whole = Number(await out.inputValue());
  expect(whole).toBeGreaterThan(5);
  // Its end is trimmed with a finger on its edge, which is wide enough to take.
  const grip = await part("video-trim-out");
  expect(grip.width).toBeGreaterThanOrEqual(18);
  const gx = grip.x + grip.width / 2, gy = grip.y + grip.height / 2;
  await fingers(context, page, [0, 20, 40, 60, 80, 100].map((d) => [{ x: gx - d, y: gy }]));
  await expect.poll(async () => Number(await out.inputValue()), { timeout: 10000 }).toBeLessThan(whole - 1);
  // Cut at the play head (moved by a tap on the ruler): two clips.
  const ruler = await part("video-ruler");
  await page.touchscreen.tap(ruler.x + ruler.width * 0.3, ruler.y + ruler.height / 2);
  await editor.getByTestId("video-split").tap();
  await expect(editor.getByTestId("video-clip")).toHaveCount(2);
  // Closed, the phone's editor is back.
  await editor.getByTestId("video-close").tap();
  await expect(editor).toHaveCount(0);
  await expect(page.getByTestId("studio-phone-bar")).toBeVisible();
  await context.close();
});

test("a finger on a selected element moves it, and undo puts it back", async ({ browser }) => {
  test.setTimeout(180000);
  const { context, page } = await phone(browser);
  await pick(page, "Editable drawing");
  const place = () => page.frameLocator('[data-testid="studio-frame"]').locator('[data-tree-node="drawing"]').evaluate((el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; });
  const before = await place();
  // Its middle on the screen: half way between its handles (clear of them: they take a finger from a little way round).
  const spots = await page.locator("[data-studio-handle]").evaluateAll((els) => els.map((el) => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }));
  const cx = (Math.min(...spots.map((s) => s.x)) + Math.max(...spots.map((s) => s.x))) / 2;
  const ys = spots.map((s) => s.y).sort((a, b) => a - b).slice(1);
  const cy = (ys[0] + ys[ys.length - 1]) / 2;
  await fingers(context, page, [0, 8, 16, 24, 32, 40, 50, 60].map((d) => [{ x: cx + d, y: cy + d }]));
  // Dropped 60px down and to the right on the screen: about as far in the page (the frame is shown at 96%), the same size.
  await expect.poll(async () => (await place()).x - before.x, { timeout: 20000 }).toBeGreaterThan(40);
  const after = await place();
  expect(after.y - before.y).toBeGreaterThan(40);
  expect(after.x - before.x).toBeLessThan(80);
  expect([after.w, after.h]).toEqual([before.w, before.h]);
  await expect(page.getByTestId("studio-undo")).toBeEnabled({ timeout: 20000 });
  await page.getByTestId("studio-undo").tap();
  await expect.poll(place, { timeout: 20000 }).toEqual(before);
  await context.close();
});

test("a tablet gets the touch layout too, with its own frame fitted; a computer's screen keeps the computer's", async ({ browser }) => {
  test.setTimeout(240000);
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(url());
  await expect(page.getByTestId("studio-phone-bar")).toBeVisible({ timeout: 90000 });
  await expect(page.getByTestId("studio-waiting")).toHaveCount(0, { timeout: 90000 });
  // The tablet's own frame (820 wide), fitted to the canvas by its width: nearly life size, none of it under the bars.
  await expect(page.getByTestId("studio-frame")).toHaveAttribute("width", "820");
  await expect.poll(() => zoomOf(page), { timeout: 30000 }).toBeGreaterThan(90);
  const head = await rect(page, "studio-phone-head"), canvas = await rect(page, "studio-canvas"), frame = await rect(page, "studio-frame");
  expect(head.height).toBeLessThanOrEqual(60);
  expect(frame.width).toBeGreaterThanOrEqual(780);
  expect(frame.x).toBeGreaterThanOrEqual(0);
  expect(frame.x + frame.width).toBeLessThanOrEqual(820);
  expect(frame.y + frame.height).toBeLessThanOrEqual(canvas.y + canvas.height + 1);
  expect(frame.height).toBeGreaterThanOrEqual(canvas.height - 24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(820);
  await expect(page.getByTestId("studio-info")).toHaveCount(0);
  await expect(page.getByTestId("studio-tab-layers")).toHaveCount(0);
  // An element's settings open in the sheet, as on a phone.
  await pick(page, "Editable drawing");
  await page.getByTestId("studio-phone-tab-settings").tap();
  await expect(page.getByTestId("studio-sheet").getByTestId("studio-path")).toContainText("Drawing");
  await context.close();

  // A computer's screen, from 1024px: the computer's layout, with its inspector and no bar at the bottom.
  const desk = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const wide = await desk.newPage();
  await wide.goto(url());
  await expect(wide.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect(wide.getByTestId("studio-phone-bar")).toHaveCount(0);
  await expect(wide.getByTestId("studio-info")).toHaveCount(1);
  await desk.close();
});
