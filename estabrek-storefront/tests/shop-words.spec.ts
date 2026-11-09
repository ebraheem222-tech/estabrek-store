import { expect, test, type Page } from "@playwright/test";

// The shop element's own words (its search, filters, sorting, count and more): the live shop draws them,
// the editor's sample shop shows every one, and each can be written in place or from the side panel.

const shopPage = (props: Record<string, unknown>) => ({
  id: "shop-words", slug: "/publication-fixture-en", name: "Shop words", status: "PUBLISHED", format: 2, sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: { contained: true }, children: [{ id: "shop", type: "shop", props }] }] } },
});

test.describe("the shop's own words", () => {
  test.afterEach(async ({ request }) => {
    await request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("the live shop draws its own words, and its usual ones where it has none", async ({ page }) => {
    await page.request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: shopPage({ categoriesLabel: { en: "Browse" }, sortLabel: { en: "Order by" }, countLabel: { en: "items" }, inStockLabel: { ar: "متوفر" } }) } });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/publication-fixture-en");
    const shop = page.locator(".cms-shop");
    await expect(shop.locator('[data-cms-part="shop-categories-title"]').first()).toHaveText("Browse");
    await expect(shop).toContainText("Order by");
    await expect(shop).toContainText("items");
    // Only Arabic of its own for this one: in English, the shop's usual English word.
    await expect(shop).toContainText("In stock only");
  });

  test("the editor's sample shop shows every word, its own or the usual one", async ({ page }) => {
    await page.request.post("http://127.0.0.1:4100/__test/preview-draft", { data: { pageId: "shop-words", sections: [], rev: 1, updatedAt: "", slug: "/shop", tree: shopPage({ allLabel: { en: "Everything" } }).tree } });
    await page.goto("/en/studio-frame?token=good-draft");
    await expect(page.locator('[data-pt-field="allLabel"]')).toHaveText("Everything");
    for (const [field, words] of [["searchLabel", "Search products"], ["categoriesLabel", "Categories"], ["sortLabel", "Sort by"], ["priceLabel", "Price range"], ["coloursLabel", "Colours"], ["sizesLabel", "Sizes"], ["filtersLabel", "Filters"], ["inStockLabel", "In stock only"], ["clearLabel", "Clear all"], ["countLabel", "pieces"], ["moreLabel", "Load more"]]) {
      await expect(page.locator(`[data-pt-field="${field}"]`)).toHaveText(words);
    }
  });
});

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });

test("a shop word is written in place in the editor, and another from the side panel", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-item"][data-kind="shop"]').click();
  await ready(page);
  await page.waitForTimeout(3000);
  const shopId = () => page.evaluate(() => {
    const find = (n: any): any => (n.type === "shop" ? n : (n.children ?? []).map(find).find(Boolean));
    return find((window as any).__canvasHarness.getDraft().tree.root);
  });
  const word = frame(page).locator('[data-pt-field="categoriesLabel"]');
  await word.evaluate((x) => x.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(900);
  const r = await word.evaluate((x) => { const b = x.getBoundingClientRect(); return { x: b.x + Math.min(b.width / 2, 20), y: b.y + b.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const scale = box.width / (await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w));
  await page.mouse.dblclick(box.x + r.x * scale, box.y + r.y * scale);
  await expect(frame(page).locator("[contenteditable]")).toHaveCount(1);
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Browse");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await shopId())?.props?.categoriesLabel).toEqual({ en: "Browse" });
  // From the side panel: the shop's words, the usual ones shown faded.
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${(await shopId()).id}"]`).click();
  await page.getByTestId("commerce-words").locator("summary").click();
  const more = page.locator('[data-shop-word="moreLabel"]');
  await expect(more).toHaveAttribute("placeholder", "Load more");
  await more.fill("Show more");
  await more.blur();
  await expect.poll(async () => (await shopId())?.props?.moreLabel).toEqual({ en: "Show more" });
  await ready(page);
  await expect(frame(page).locator('[data-pt-field="moreLabel"]')).toHaveText("Show more");
});
