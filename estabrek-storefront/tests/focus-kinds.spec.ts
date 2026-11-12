import { expect, test, type Page } from "@playwright/test";

// The other kinds in focus mode (A6): a heading opened with F goes onto an arc (SVG textPath in the page, its own
// font and colour), bent; a slider's slides are its parts: one picked is shown in the page, moved and captioned.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&kinds";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

async function pointOf(page: Page, id: string) {
  const rect = await frame(page).locator(`[data-tree-node="${id}"]`).evaluate((el) => { el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.waitForTimeout(400);
  const again = await frame(page).locator(`[data-tree-node="${id}"]`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box.width / viewport.w;
  void rect;
  return { x: box.x + again.x * scale, y: box.y + again.y * scale };
}

test("a heading's words go onto an arc; a slider's slides are picked, shown, moved and captioned", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);

  // The heading, chosen and opened with F (a double-click on words writes them in place).
  const h = await pointOf(page, "curved");
  await page.mouse.click(h.x, h.y);
  await expect(page.getByTestId("studio-info")).toContainText("curved");
  await page.keyboard.press("f");
  await expect(page.getByTestId("studio-focus-bar")).toHaveAttribute("data-group", "text");
  await page.locator('[data-testid="studio-curve-kind"][data-kind="arc"]').click();
  await expect.poll(async () => (await readNode(page, "curved"))?.props?.curve?.kind).toBe("arc");
  const curve = frame(page).locator('[data-tree-node="curved"] svg.pt-curve');
  await expect(curve).toHaveAttribute("data-curve", "arc");
  await expect(curve.locator("textPath")).toHaveText("Summer sale on every scarf");
  await page.getByTestId("studio-curve-bend").fill("-60");
  await page.getByTestId("studio-curve-bend").blur();
  await expect.poll(async () => (await readNode(page, "curved"))?.props?.curve?.bend).toBe(-60);
  await page.screenshot({ path: testInfo.outputPath("curve.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("studio-focus-bar")).toHaveCount(0);

  // The slider: its slides are its parts.
  const s = await pointOf(page, "slides");
  await page.mouse.dblclick(s.x, s.y);
  await expect(page.getByTestId("studio-focus-bar")).toBeVisible();
  const parts = page.getByTestId("studio-focus-part");
  await expect(parts).toHaveCount(3);
  await parts.nth(2).click();
  await expect(page.getByTestId("studio-focus-slide")).toHaveAttribute("data-i", "2");
  // Shown in the page: the row goes to the third slide.
  await expect.poll(() => frame(page).locator('[data-tree-node="slides"] .pt-slides').evaluate((el) => el.scrollLeft), { timeout: 10000 }).toBeGreaterThan(50);
  await page.getByTestId("studio-focus-slide-before").click();
  await expect.poll(async () => (await readNode(page, "slides"))?.props?.slides?.[1]?.src).toBe("/editorial/rose-campaign-poster.webp");
  await parts.nth(0).click();
  await page.getByTestId("studio-focus-slide-caption").fill("Silk scarves");
  await page.getByTestId("studio-focus-slide-caption").blur();
  await expect.poll(async () => (await readNode(page, "slides"))?.props?.slides?.[0]?.caption?.en).toBe("Silk scarves");
});
