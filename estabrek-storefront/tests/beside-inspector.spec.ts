import { expect, test, type Page } from "@playwright/test";

// The inspector beside what's selected (what a new browser gets; the other editor tests keep it docked): a picked
// button comes closer on the canvas, its settings open beside it one section at a time — its content on its left,
// its look and motion on its right, from the two strips of tabs standing by it — a search looks through every
// section, and both choices (sections, beside) can be turned back.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&shapes&beside";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const info = (page: Page) => page.getByTestId("studio-info");
async function canvasBox(page: Page, id: string) {
  const r = await frame(page).locator(`[data-tree-node="${id}"]`).first().evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const width = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const scale = box.width / width;
  return { x: box.x + r.x * scale, y: box.y + r.y * scale, w: r.w * scale, h: r.h * scale };
}
const zoomNow = async (page: Page) => Number((await page.getByText(/^\d+%$/).first().innerText()).replace("%", ""));

test("a picked button comes closer; its settings open beside it, one section at a time, from the strips by it", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect(info(page)).toHaveAttribute("data-dock", "beside");
  const before = await zoomNow(page);

  const at = await canvasBox(page, "cta");
  await page.mouse.click(at.x + at.w / 2, at.y + at.h / 2);
  await expect(info(page)).toContainText("cta");
  // It comes closer (a button is small on the page), and stays whole on the canvas.
  await expect.poll(() => zoomNow(page), { timeout: 10000 }).toBeGreaterThan(before + 20);
  await page.waitForTimeout(600);
  const button = await canvasBox(page, "cta");

  // Its content first, in the panel on its left; the other sections wait.
  await expect(info(page)).toHaveAttribute("data-side", "left");
  const panel = (await info(page).boundingBox())!;
  expect(panel.x + panel.width).toBeLessThanOrEqual(button.x);
  await expect(page.getByTestId("studio-insp-open")).toHaveAttribute("data-group", "content");
  await expect(info(page).getByTestId("studio-element")).toBeVisible();
  await expect(info(page).getByTestId("studio-prop-label")).toBeInViewport();
  await expect(info(page).getByTestId("studio-motion")).toBeHidden();
  await expect(info(page).getByTestId("studio-button-style")).toBeHidden();
  // The strips: settings on its left, look and adding on its right.
  const tabs = (side: string) => page.locator(`[data-testid="studio-beside-strip"][data-side="${side}"] [data-testid="studio-beside-tab"]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-group")));
  expect(await tabs("left")).toEqual(["content", "behaviour", "layout"]);
  expect(await tabs("right")).toEqual(["look", "motion", "decor"]);
  await expect(page.getByTestId("studio-beside-add")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("beside-content.png") });

  // Its motion: the panel goes to its right, with only that section.
  await page.locator('[data-testid="studio-beside-tab"][data-group="motion"]').click();
  await expect(info(page)).toHaveAttribute("data-side", "right");
  await expect(info(page).getByTestId("studio-motion")).toBeVisible();
  await expect(info(page).getByTestId("studio-element")).toBeHidden();
  const right = (await info(page).boundingBox())!;
  expect(right.x).toBeGreaterThanOrEqual(button.x + button.w);
  await page.screenshot({ path: testInfo.outputPath("beside-motion.png") });

  // A search looks through every section.
  await info(page).getByTestId("studio-insp-find").fill("equations");
  await expect(info(page).getByTestId("studio-form")).toBeVisible();
  await expect(info(page).getByTestId("studio-motion")).toBeHidden();
  await info(page).getByTestId("studio-insp-find").fill("");
  await expect(info(page).getByTestId("studio-motion")).toBeVisible();

  // The open tab pressed again closes the panel (the element in full view); pressed once more, it's back.
  await page.locator('[data-testid="studio-beside-tab"][data-group="motion"]').click();
  await expect(info(page)).toBeHidden();
  await page.locator('[data-testid="studio-beside-tab"][data-group="motion"]').click();
  await expect(info(page)).toBeVisible();

  // Every setting in one list again, then docked at the side as before.
  await info(page).getByTestId("studio-insp-sections").click();
  await expect(info(page).getByTestId("studio-element")).toBeVisible();
  await expect(info(page).getByTestId("studio-motion")).toBeVisible();
  await info(page).getByTestId("studio-insp-dock").click();
  await expect(info(page)).toHaveAttribute("data-dock", "side");
  await expect(page.getByTestId("studio-beside-strip")).toHaveCount(0);
});
