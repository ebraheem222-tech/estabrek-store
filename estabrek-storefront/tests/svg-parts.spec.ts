import { expect, test, type Page } from "@playwright/test";

// A drawing opened on its own (focus mode, A2): its shapes are outlined on the canvas and a click picks the one under
// it; a circle turns into a path whose points are dragged on the canvas; it morphs into a ready heart, played in the
// page (GSAP MorphSVG, loaded only there) when the editor's "try it" is pressed.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

async function pointOf(page: Page, selector: string) {
  const rect = await frame(page).locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = await page.getByTestId("studio-frame").boundingBox();
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box!.width / viewport.w;
  return { x: box!.x + rect.x * scale, y: box!.y + rect.y * scale };
}

test("a drawing's shape is picked on the canvas, its points dragged, and it morphs into a heart in the page", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);
  await expect(frame(page).locator('[data-tree-node="drawing"] [data-art-part="0"]')).toHaveCount(1);

  const at = await pointOf(page, '[data-tree-node="drawing"]');
  await page.mouse.dblclick(at.x, at.y);
  await expect(page.getByTestId("studio-focus-bar")).toHaveAttribute("data-group", "svg");
  // Its shapes, as the frame measured them, outlined on the canvas.
  await expect(page.getByTestId("studio-art-part")).toHaveCount(1);

  // A click on the circle picks it (the frame says which shape is under the point).
  const circle = await pointOf(page, '[data-tree-node="drawing"] [data-art-part="0"]');
  await page.mouse.click(circle.x, circle.y);
  await expect(page.getByTestId("studio-focus-svg-part")).toHaveAttribute("data-part", "0");
  await expect(page.locator('[data-testid="studio-art-part"][data-on="1"]')).toHaveCount(1);

  // A path now, whose points show on the canvas.
  await page.getByTestId("studio-focus-svg-topath").click();
  await expect.poll(async () => (await readNode(page, "drawing"))?.props?.art?.nodes?.[0]?.t).toBe("path");
  await expect(frame(page).locator('[data-tree-node="drawing"] path[data-art-part="0"]')).toHaveCount(1);
  await expect.poll(() => page.getByTestId("studio-path-point").count(), { timeout: 30000 }).toBeGreaterThanOrEqual(4);

  // Dragging a point moves it in the drawing, saved when let go.
  const before = (await readNode(page, "drawing")).props.art.nodes[0].a.d as string;
  const point = page.getByTestId("studio-path-point").nth(1);
  const pb = (await point.boundingBox())!;
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.mouse.down();
  await page.mouse.move(pb.x + pb.width / 2 + 40, pb.y + pb.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await readNode(page, "drawing"))?.props?.art?.nodes?.[0]?.a?.d).not.toBe(before);
  await page.screenshot({ path: testInfo.outputPath("svg-points.png") });

  // It morphs into a ready heart, played in the page by "try it".
  await page.getByTestId("studio-focus-svg-morph-to").selectOption("shape:heart");
  await expect.poll(async () => (await readNode(page, "drawing"))?.props?.morph?.pairs?.[0]?.part).toBe("0");
  await page.getByTestId("studio-morph-ease-spring").click();
  await expect.poll(async () => (await readNode(page, "drawing"))?.props?.morph?.ease).toMatch(/^spring\(/);
  const path = frame(page).locator('[data-tree-node="drawing"] path[data-art-part="0"]');
  await expect.poll(async () => (await readNode(page, "drawing"))?.props?.art?.nodes?.[0]?.a?.d).toBeTruthy();
  const still = await path.getAttribute("d");
  const seen = new Set<string>();
  await expect.poll(async () => {
    await page.getByTestId("studio-morph-try").click({ timeout: 5000 });
    for (let i = 0; i < 6; i++) {
      seen.add((await path.getAttribute("d")) ?? "");
      await page.waitForTimeout(80);
    }
    return [...seen].some((d) => d && d !== still);
  }, { timeout: 30000 }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("svg-morph.png") });

  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("studio-focus-bar")).toHaveCount(0);
});
