import { expect, test, type Page } from "@playwright/test";

// A picture's edit (focus mode, A3): crop, filters and turns show at once on the picture in the page (CSS), "Apply"
// makes the real copy on the server (the test page's stand-in answers like the backend), the page shows it and the
// original is kept, so the edit is undone.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&sparkle";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

test("a picture is cropped and filtered live in the page, made for real, and taken back to its original", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);
  const img = frame(page).locator('img[data-tree-node="photo"], [data-tree-node="photo"] img').first();
  await img.evaluate((el: HTMLImageElement) => el.decode?.());
  const rect = await img.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box.width / viewport.w;
  await page.mouse.dblclick(box.x + rect.x * scale, box.y + rect.y * scale);
  await expect(page.getByTestId("studio-image-edit")).toBeVisible();

  // Live in the page: a square crop, black and white, turned.
  await page.locator('[data-testid="studio-image-ratio"][data-ratio="1:1"]').click();
  await expect.poll(() => img.evaluate((el) => el.style.getPropertyValue("object-view-box"))).toMatch(/^inset\(/);
  await page.locator('[data-testid="studio-image-filter"][data-filter="mono"]').click();
  await expect.poll(() => img.evaluate((el) => el.style.filter)).toContain("grayscale(1)");
  await page.getByTestId("studio-image-right").click();
  await expect.poll(() => img.evaluate((el) => el.style.transform)).toContain("rotate(90deg)");
  await page.screenshot({ path: testInfo.outputPath("image-edit-live.png") });

  // Made for real: the page shows the copy; the original and the edit are kept.
  await page.getByTestId("studio-image-apply").click();
  await expect.poll(async () => (await readNode(page, "photo"))?.props?.src).toMatch(/^\/editorial\/scarves\.webp\?edit=/);
  const saved = (await readNode(page, "photo")).props.edit;
  expect(saved.from).toBe("/editorial/scarves.webp");
  expect(saved.recipe).toMatchObject({ mono: true, rotate: 90 });
  await expect.poll(() => img.getAttribute("src")).toMatch(/edit=/);

  // Back to the original.
  await page.getByTestId("studio-image-undo").click();
  await expect.poll(async () => (await readNode(page, "photo"))?.props?.src).toBe("/editorial/scarves.webp");
  expect((await readNode(page, "photo")).props.edit).toBeUndefined();
});
