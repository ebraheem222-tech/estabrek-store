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
