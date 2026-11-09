import { expect, test, type Page } from "@playwright/test";

// Collections (W3) in the editor: a list of a collection's items on a page, its order and size,
// and elements connected to the collection's fields.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression&collections";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const draftList = (page: Page) => page.evaluate(() => {
  const find = (n: any): any => (n.type === "collectionList" ? n : (n.children ?? []).map(find).find(Boolean));
  return find((window as any).__canvasHarness.getDraft().tree.root);
});

test("a list of the blog shows a card per item, in its order and size, connected to the fields", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  // From the Add panel: a list of the blog, its card connected to the fields.
  await page.getByTestId("add-list-blog").click();
  await expect.poll(async () => (await draftList(page))?.props.collectionId).toBe("col-blog");
  const list = await draftList(page);
  const card = list.children[0];
  expect(card.children.map((c: any) => c.props.bind)).toEqual([{ src: "cover", href: "$url" }, { text: "title" }, { text: "excerpt" }, { href: "$url" }]);
  await ready(page);
  // The preview: one card per item, newest first, with the items' own words, pictures and links.
  const grid = frame(page).locator(`[data-tree-node="${list.id}"]`);
  await expect(grid.locator(":scope > *")).toHaveCount(2);
  await expect(grid.locator(":scope > *").nth(0)).toContainText("Autumn edit");
  await expect(grid.locator(":scope > *").nth(1)).toContainText("Spring notes");
  await expect(grid.locator(":scope > *").nth(1)).toContainText("Light colours for warm days");
  await expect(grid.locator("a[href*='/blog/spring']").first()).toBeVisible();
  // Oldest first, one only.
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${list.id}"]`).click();
  await page.getByTestId("list-sort").selectOption("oldest");
  await expect.poll(async () => (await draftList(page))?.props.sort).toBe("oldest");
  const limit = page.getByTestId("list-limit");
  await limit.fill("1");
  await limit.blur();
  await expect.poll(async () => (await draftList(page))?.props.limit).toBe(1);
  await ready(page);
  await expect(grid.locator(":scope > *")).toHaveCount(1);
  await expect(grid).toContainText("Spring notes");
  // The card's heading is connected to the title; it can take another field instead.
  const heading = card.children[1].id;
  await page.locator(`[data-testid="studio-layer"][data-node="${heading}"]`).click();
  await expect(page.getByTestId("bind-panel")).toContainText("Blog");
  await expect(page.getByTestId("bind-text")).toHaveValue("title");
  await page.getByTestId("bind-text").selectOption("excerpt");
  await expect.poll(async () => (await draftList(page))?.children[0].children[1].props.bind).toEqual({ text: "excerpt" });
  await ready(page);
  await expect(grid.locator("h3").first()).toHaveText("Light colours for warm days");
});
