import { expect, test, type Page } from "@playwright/test";

// A 3D model opened on its own (focus mode, A5): the frame lists its parts; a click on the model picks the part
// under it (a raycast in the page) and its look changes; views are chosen live and saved, with when the camera
// moves between them; with the pen, a click adds a labelled point where it's clicked, drawn on the model.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

async function pointOf(page: Page, selector: string) {
  const rect = await frame(page).locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box.width / viewport.w;
  return { x: box.x + rect.x * scale, y: box.y + rect.y * scale };
}

test("a model's part is picked on the canvas and dressed; views and labelled points are saved", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);
  await expect(frame(page).locator('[data-tree-node="model"] canvas')).toHaveCount(1, { timeout: 30000 });

  const at = await pointOf(page, '[data-tree-node="model"]');
  await page.mouse.dblclick(at.x, at.y);
  await expect(page.getByTestId("studio-focus-bar")).toHaveAttribute("data-group", "model");
  // Its parts, read from the model in the page.
  await expect.poll(() => page.getByTestId("studio-focus-part").count(), { timeout: 30000 }).toBeGreaterThan(1);

  // A click on the model picks the part under the point.
  const middle = await pointOf(page, '[data-tree-node="model"] canvas');
  await page.mouse.click(middle.x, middle.y);
  await expect(page.getByTestId("studio-model-part")).toBeVisible({ timeout: 15000 });
  const key = await page.getByTestId("studio-model-part").getAttribute("data-part");
  await page.getByTestId("studio-model-metal").fill("0.35");
  await page.getByTestId("studio-model-metal").blur();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.parts?.[key!]?.metal).toBe(0.35);
  await page.getByTestId("studio-model-hide").click();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.parts?.[key!]?.hide).toBe(true);
  await page.getByTestId("studio-model-hide").click();
  await page.keyboard.press("Escape");

  // Two views, chosen live and saved, and the camera moves between them with the scroll.
  await page.getByTestId("studio-model-az").fill("60");
  await page.getByTestId("studio-model-save-view").click();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.views?.length).toBe(1);
  await page.getByTestId("studio-model-az").fill("-45");
  await page.getByTestId("studio-model-el").fill("30");
  await page.getByTestId("studio-model-save-view").click();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.views?.length).toBe(2);
  expect((await readNode(page, "model")).props.views.map((v: { az: number }) => v.az)).toEqual([60, -45]);
  await page.getByTestId("studio-model-viewon").selectOption("scroll");
  await expect.poll(async () => (await readNode(page, "model"))?.props?.viewOn).toBe("scroll");

  // A labelled point where the model is clicked, drawn on it in the page.
  await page.getByTestId("studio-model-pen").check();
  await expect(page.getByTestId("studio-model-pen")).toBeChecked();
  const again = await pointOf(page, '[data-tree-node="model"] canvas');
  await page.mouse.click(again.x, again.y);
  await expect.poll(async () => (await readNode(page, "model"))?.props?.spots?.length ?? 0, { timeout: 15000 }).toBe(1);
  const spot = (await readNode(page, "model")).props.spots[0];
  expect(spot.at).toHaveLength(3);
  await page.getByTestId("studio-model-spot-label").fill("Real leather");
  await page.getByTestId("studio-model-spot-label").blur();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.spots?.[0]?.label?.en).toBe("Real leather");
  await expect(frame(page).locator('[data-tree-node="model"] .pt-3d-spot')).toHaveCount(1, { timeout: 30000 });
  await page.screenshot({ path: testInfo.outputPath("model-parts.png") });
});
