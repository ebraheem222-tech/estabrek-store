import { expect, test, type Page } from "@playwright/test";

// The page's speed before publishing (J3–J5): the budget says what the shop lightens by itself and lightens the
// heaviest in one click; the publish dialog checks the page's speed in the frame (scrolled top to bottom, everything
// moving) and gives a verdict.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

test("the budget's automatic lightening and «lighten them all»; the speed checked in the publish dialog", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);

  // The page itself: through the path from an element.
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator('[data-testid="studio-layer"][data-node="model"]').click();
  await page.getByTestId("studio-path").getByRole("button").first().click();
  const auto = page.getByTestId("studio-budget-auto");
  await expect(auto).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("studio-budget-auto-on")).toBeChecked();
  await expect(auto.locator('[data-testid="studio-budget-auto-item"][data-key="canvases"]')).toBeVisible();
  await page.getByTestId("studio-budget-fix-all").click();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.perf?.fps).toBe(30);
  await expect(frame(page).locator('[data-tree-node="model"]')).toHaveAttribute("data-perf-fps", "30", { timeout: 20000 });

  // Turned off for the page, then on again.
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 30000 });
  await page.getByTestId("studio-budget-auto-on").uncheck();
  await expect.poll(async () => (await readNode(page, "page"))?.props?.perfAuto).toBe(false);
  await page.getByTestId("studio-budget-auto-on").check();

  // The publish dialog checks the page's speed first.
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 30000 });
  await page.getByTestId("studio-publish").click();
  const check = page.getByTestId("studio-speed-check");
  await expect(check).toBeVisible();
  await expect(check).toHaveAttribute("data-state", "done", { timeout: 30000 });
  expect(["good", "okay", "poor"]).toContain(await check.getAttribute("data-verdict"));
  await expect(check).toContainText("frames a second");
  await page.screenshot({ path: testInfo.outputPath("speed-publish.png") });
});
