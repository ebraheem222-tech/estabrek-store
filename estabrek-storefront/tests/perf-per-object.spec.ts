import { expect, test, type Page } from "@playwright/test";

// Speed per element (J1–J2): the 3D model shows as heavy with why; a click on a reason lightens it (a frame cap),
// light makes it so in the page (no endless motion, drawn once, marked by TreePerf); the page's budget counts it and
// measures the page in the frame.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

async function pointOf(page: Page, id: string) {
  const rect = await frame(page).locator(`[data-tree-node="${id}"]`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box.width / viewport.w;
  return { x: box.x + rect.x * scale, y: box.y + rect.y * scale };
}

test("a heavy element is lightened from its reasons and its speed settings, honoured in the page; the page is budgeted and measured", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);

  const at = await pointOf(page, "model");
  await page.mouse.click(at.x, at.y);
  await expect(page.getByTestId("studio-info")).toContainText("model");
  const perf = page.getByTestId("studio-info").getByTestId("studio-perf");
  await expect(perf.getByTestId("studio-perf-badge")).toHaveAttribute("data-level", "high");
  await expect(perf).toHaveAttribute("open", "");
  await page.screenshot({ path: testInfo.outputPath("perf-heavy.png") });

  // The 3D's reason, lightened: its frames capped, carried to the page.
  await perf.locator('[data-testid="studio-perf-fix"][data-key="3d"]').click();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.perf?.fps).toBe(30);
  await expect(frame(page).locator('[data-tree-node="model"]')).toHaveAttribute("data-perf-fps", "30");

  // Light: marked in the page, and TreePerf (loaded for it) marks it light now.
  await perf.locator('[data-testid="studio-perf-tier"][data-tier="light"]').click();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.perf?.tier).toBe("light");
  const model = frame(page).locator('[data-tree-node="model"]');
  await expect(model).toHaveAttribute("data-perf-tier", "light");
  await expect(model).toHaveAttribute("data-perf-light-now", { timeout: 15000 });
  await expect(perf.getByTestId("studio-perf-badge")).not.toHaveAttribute("data-level", "high");
  // Its endless motion is taken away by the light look.
  expect(await model.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

  // The page's budget: the model counted, the page measured in the frame.
  await page.getByTestId("studio-path").getByRole("button").first().click();
  await expect(page.getByTestId("studio-page-budget")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("studio-budget-canvases")).not.toHaveText("0");
  await page.getByTestId("studio-budget-measure").click();
  await expect(page.getByTestId("studio-budget-sample")).toBeVisible({ timeout: 15000 });
  expect(Number(await page.getByTestId("studio-budget-sample").getAttribute("data-fps"))).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("perf-budget.png") });
});
