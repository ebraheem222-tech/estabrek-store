import { expect, test, type Page } from "@playwright/test";

// Sparkling stars on a picture (focus mode, A3+): the frame reads the photo's pixels and finds its corners and
// highlights; the stars are drawn over it in the page and twinkle in CSS; the pen adds one with a click; a star is
// dragged to move it and double-clicked to take it away; their look changes.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&sparkle";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);
const stars = (page: Page) => readNode(page, "photo").then((n) => (n?.props?.sparkle?.points ?? []) as Array<{ x: number; y: number }>);

async function pointOf(page: Page, selector: string, fx = 0.5, fy = 0.5) {
  const rect = await frame(page).locator(selector).first().evaluate((el, [a, b]) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width * a, y: r.y + r.height * b }; }, [fx, fy] as const);
  const box = await page.getByTestId("studio-frame").boundingBox();
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box!.width / viewport.w;
  return { x: box!.x + rect.x * scale, y: box!.y + rect.y * scale };
}

test("stars are found on a photo, drawn over it in the page, added, moved and taken away by hand", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);
  await frame(page).locator('[data-tree-node="photo"]').evaluate((el: HTMLImageElement) => el.decode?.());

  const at = await pointOf(page, '[data-tree-node="photo"]');
  await page.mouse.dblclick(at.x, at.y);
  await expect(page.getByTestId("studio-focus-bar")).toHaveAttribute("data-group", "image");
  await expect(page.getByTestId("studio-sparkle")).toHaveAttribute("data-count", "0");

  // Found on the photo itself (the frame reads its pixels), saved, and drawn over it in the page.
  await page.getByTestId("studio-sparkle-count").fill("12");
  await page.getByTestId("studio-sparkle-find").click();
  await expect.poll(async () => (await stars(page)).length, { timeout: 30000 }).toBeGreaterThanOrEqual(4);
  const found = (await stars(page)).length;
  await expect(frame(page).locator('[data-tree-node="photo"] .pt-spark')).toHaveCount(found);
  const anim = await frame(page).locator('[data-tree-node="photo"] .pt-spark').first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe("pt-twinkle");
  await expect(page.getByTestId("studio-sparkle-dot")).toHaveCount(found);
  await page.screenshot({ path: testInfo.outputPath("sparkle-found.png") });

  // The pen: a click on the photo adds one there.
  await page.getByTestId("studio-sparkle-pen").check();
  const corner = await pointOf(page, '[data-tree-node="photo"]', 0.1, 0.9);
  await page.mouse.click(corner.x, corner.y);
  await expect.poll(async () => (await stars(page)).length).toBe(found + 1);
  const added = (await stars(page)).at(-1)!;
  expect(added.x).toBeCloseTo(0.1, 1);
  expect(added.y).toBeCloseTo(0.9, 1);

  // A star dragged moves; a double-click takes it away.
  const dot = page.getByTestId("studio-sparkle-dot").last();
  await expect(dot).toHaveClass(/cursor-move/);
  const db = (await dot.boundingBox())!;
  await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
  await page.mouse.down();
  await page.mouse.move(db.x + db.width / 2 + 60, db.y + db.height / 2 - 40, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await stars(page)).at(-1)!.x).toBeGreaterThan(added.x + 0.05);
  // (Once the move is saved: the studio takes nothing while it saves.)
  await expect(page.getByTestId("studio-sparkle-dot").last()).toHaveClass(/cursor-move/);
  await page.getByTestId("studio-sparkle-dot").last().dblclick();
  await expect.poll(async () => (await stars(page)).length).toBe(found);

  // Their look: a six-pointed star in gold, twinkling while the pointer is on the picture.
  await page.getByTestId("studio-sparkle-shape").nth(1).click();
  await expect.poll(async () => (await readNode(page, "photo"))?.props?.sparkle?.shape).toBe("star");
  await page.getByTestId("studio-sparkle-colour").selectOption("#ffd76a");
  await expect.poll(async () => frame(page).locator('[data-tree-node="photo"] .pt-sparkles').evaluate((el) => (el as HTMLElement).style.getPropertyValue("--sp-color"))).toBe("#ffd76a");
  await page.getByTestId("studio-sparkle-when").selectOption("hover");
  await expect(frame(page).locator('[data-tree-node="photo"] .pt-sparkles')).toHaveAttribute("data-when", "hover");
  await page.screenshot({ path: testInfo.outputPath("sparkle-look.png") });
});
