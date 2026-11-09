import { expect, test, type Page } from "@playwright/test";

// The canvas feels like a design tool: pressing anywhere on an object (even on a quote inside it)
// moves the whole object with its guides and distances, nothing is left drawn after letting go,
// a click picks the object and a second click goes inside it, and "?" lists the shortcuts.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
async function canvasPoint(page: Page, selector: string) {
  const rect = await frame(page).locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = await page.getByTestId("studio-frame").boundingBox();
  const width = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const scale = box!.width / width;
  return { x: box!.x + rect.x * scale, y: box!.y + rect.y * scale };
}
const info = (page: Page) => page.getByTestId("studio-info");

test("an object moves when pressed on its inner part, shows distances while moving and leaves nothing drawn", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const quote = await canvasPoint(page, '[data-tree-node="reviews"] blockquote');
  const before = await frame(page).locator('[data-tree-node="reviews"]').boundingBox();
  await page.mouse.move(quote.x, quote.y);
  await page.mouse.down();
  await page.mouse.move(quote.x + 60, quote.y - 40, { steps: 12 });
  // While moving: how far it is from what's around it, with numbers.
  await expect.poll(() => page.getByTestId("studio-gap").count()).toBeGreaterThan(0);
  const label = await page.locator('[data-testid="studio-overlay"] span.bg-rose-500, span.bg-rose-500').first().textContent();
  expect(Number(label)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("dragging.png") });
  await page.mouse.up();
  // The whole widget moved and is the selection; no guide or distance stays on the canvas.
  await expect(info(page)).toContainText("reviews");
  await expect.poll(async () => (await frame(page).locator('[data-tree-node="reviews"]').boundingBox())!.x).toBeGreaterThan(before!.x + 20);
  await expect(page.getByTestId("studio-guide")).toHaveCount(0);
  await expect(page.getByTestId("studio-gap")).toHaveCount(0);
  expect((await page.evaluate(() => (window as any).__canvasHarness.getWrites())).at(-1).ops.some((op: any) => op.nodeId === "reviews")).toBe(true);
});

test("a click picks the object, a second click goes inside it, Ctrl+click goes to the deepest part", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const quote = await canvasPoint(page, '[data-tree-node="reviews"] blockquote');
  await page.mouse.click(quote.x, quote.y);
  await expect(info(page)).toContainText("reviews");
  await expect(page.getByTestId("studio-look-target")).toHaveCount(0);
  await page.mouse.click(quote.x, quote.y);
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", /^n:reviews\//);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.keyboard.down("Control");
  await page.mouse.click(quote.x, quote.y);
  await page.keyboard.up("Control");
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", /^n:reviews\/~.+blockquote/);
});

test("? lists the editor's shortcuts", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await page.keyboard.press("Shift+Slash");
  await expect(page.getByTestId("studio-shortcuts")).toContainText("The deepest part under the pointer, at once");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("studio-shortcuts")).toHaveCount(0);
  await page.getByTestId("studio-shortcuts-open").click();
  await expect(page.getByTestId("studio-shortcuts")).toBeVisible();
});
