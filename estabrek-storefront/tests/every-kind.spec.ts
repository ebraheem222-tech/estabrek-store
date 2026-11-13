import { expect, test, type Page } from "@playwright/test";

// What every kind of element takes: its corners reach what it draws inside itself (a reviews block's cards, a
// chart's panel, a form's box), the inspector says so where corners can't show yet, and the ready looks (cards,
// backgrounds, frames) are offered for every kind that draws a box or is shown like a picture.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&everyKind";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const info = (page: Page) => page.getByTestId("studio-info");
async function open(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await page.getByTestId("studio-tab-layers").click();
}
async function pick(page: Page, kind: string) {
  await page.locator(`[data-testid="studio-layer"][data-node="kind-${kind}"]`).click();
  await expect(info(page)).toContainText(`kind-${kind}`);
}
const node = (page: Page, kind: string) => frame(page).locator(`[data-tree-node="kind-${kind}"]`);

test("corners set on a block reach its cards, panel or box; the inspector says where they can't show yet", async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  const parts: Array<[string, string]> = [
    ["testimonials", ".pt-tst-card"], ["pricing", ".pt-plan"], ["countdown", ".pt-count-part"], ["chart", "figure"], ["form", "section"], ["instrument", ":scope > div"],
  ];
  for (const [kind, part] of parts) {
    await pick(page, kind);
    const before = await node(page, kind).locator(part).first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(before, kind).not.toBe("36px");
    const range = info(page).getByTestId("studio-box-radius");
    await range.fill("36");
    await range.blur();
    await expect(node(page, kind).locator(part).first(), kind).toHaveCSS("border-top-left-radius", "36px");
    // These show their corners by themselves: no word about needing a background.
    await expect(info(page).getByTestId("studio-box-radius-needs")).toHaveCount(0);
  }
  // One step back: the cards have their own corners again.
  await page.getByTestId("studio-undo").click();
  await expect(node(page, "instrument").locator(":scope > div").first()).not.toHaveCSS("border-top-left-radius", "36px");

  // Words have no surface: the inspector says what makes corners show. A drawing is cut to its corners.
  await pick(page, "heading");
  await expect(info(page).getByTestId("studio-box-radius")).toBeVisible();
  await expect(info(page).getByTestId("studio-box-radius-needs")).toBeVisible();
  await pick(page, "svg");
  await expect(info(page).getByTestId("studio-box-radius-needs")).toHaveCount(0);
  const art = info(page).getByTestId("studio-box-radius");
  await art.fill("40");
  await art.blur();
  await expect(node(page, "svg")).toHaveCSS("border-top-left-radius", "40px");
  await expect(node(page, "svg")).toHaveCSS("overflow", "hidden");
  // A line has no corners to round; a gap has no box at all.
  await pick(page, "divider");
  await expect(info(page).getByTestId("studio-box")).toBeVisible();
  await expect(info(page).getByTestId("studio-box-radius")).toHaveCount(0);
});

test("the ready looks fit every kind: a card around a block, a frame on what's shown like a picture", async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  await pick(page, "testimonials");
  await page.getByTestId("studio-tab-looks").click();
  await expect(page.getByTestId("studio-looks")).toBeVisible();
  for (const kind of ["card", "background", "shadow", "hover", "entrance"]) await expect(page.locator(`[data-testid="studio-looks-kind"][data-kind="${kind}"]`)).toBeVisible();
  await expect(page.locator('[data-testid="studio-looks-kind"][data-kind="edge"]')).toHaveCount(0);
  // A card look goes on the block itself: its box gets a surface, a frame and corners, and its cards the corners.
  await page.locator('[data-testid="studio-looks-kind"][data-kind="card"]').click();
  await page.getByTestId("studio-looks-find").fill("frame");
  const tile = page.locator('[data-testid="studio-look"]').first();
  await expect(tile).toBeVisible();
  const was = await node(page, "testimonials").evaluate((el) => getComputedStyle(el).backgroundColor);
  await tile.click();
  await expect.poll(async () => (await page.evaluate(() => (window as any).__canvasHarness.getNode("kind-testimonials").node.style?.base ?? {})).bg).toBeTruthy();
  await expect(node(page, "testimonials")).not.toHaveCSS("background-color", was);
  const radius = await node(page, "testimonials").evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  expect(radius).not.toBe("0px");
  await expect(node(page, "testimonials").locator(".pt-tst-card").first()).toHaveCSS("border-top-left-radius", radius);

  // Things shown like a picture take a frame.
  for (const kind of ["svg", "model3d", "map", "beforeAfter"]) {
    await page.getByTestId("studio-tab-layers").click();
    await pick(page, kind);
    await page.getByTestId("studio-tab-looks").click();
    await expect(page.locator('[data-testid="studio-looks-kind"][data-kind="frame"]'), kind).toBeVisible();
  }
});

test("a products block shows a category's products or ones picked by hand; a categories block only the ones ticked", async ({ page }) => {
  test.setTimeout(240000);
  await open(page);
  await pick(page, "products");
  const cards = node(page, "products").locator('a[href*="/p/"]');
  const slugs = async () => [...new Set(await cards.evaluateAll((els) => els.map((a) => (a.getAttribute("href") ?? "").split("/p/")[1])))].sort();
  const source = (value: string) => info(page).locator(`[data-testid="studio-products-source"] [data-value="${value}"]`).click();

  // Picked by hand: found by name, and only that one shows on the page.
  await source("picked");
  await info(page).getByTestId("studio-products-find").fill("hijab");
  await info(page).getByTestId("studio-products-pick").click();
  await expect.poll(async () => (await page.evaluate(() => (window as any).__canvasHarness.getNode("kind-products").node.props)).productIds).toEqual(["bag"]);
  await expect.poll(slugs).toEqual(["rose-hijab"]);

  // From a category: the store's categories are listed; the page shows that category's products.
  await source("category");
  await expect(info(page).getByTestId("studio-products-category")).toHaveValue("dresses");
  await expect.poll(slugs).toContain("rose-dress");
  await expect.poll(slugs).not.toContain("rose-hijab");
  await info(page).getByTestId("studio-products-category").selectOption("hijabs");
  await expect.poll(slugs).toContain("rose-hijab");
  await expect.poll(slugs).not.toContain("rose-dress");

  // A categories block: only the ones ticked.
  await pick(page, "categories");
  const tiles = node(page, "categories").locator(".pt-tile");
  const all = await tiles.count();
  expect(all).toBeGreaterThan(1);
  await info(page).locator('[data-testid="studio-categories-which"] [data-value="some"]').click();
  await info(page).locator('[data-testid="studio-categories-list"] [data-category="hijabs"]').check();
  await expect.poll(async () => (await page.evaluate(() => (window as any).__canvasHarness.getNode("kind-categories").node.props)).ids).toEqual(["hijabs"]);
  await expect(tiles).toHaveCount(1);
  await info(page).locator('[data-testid="studio-categories-which"] [data-value="all"]').click();
  await expect(tiles).toHaveCount(all);
});
