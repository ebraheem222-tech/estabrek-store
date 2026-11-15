import { expect, test, type Page } from "@playwright/test";

// The page editor's words helper in a real browser (the API's answers are the test fixture's, made of what was
// asked): a heading gets new words, better ones, and a translation into the shop's other language; a button
// shorter ones; a picture its description. Switched off for the store, it says where it is switched on.

const url = (more: string) => `http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&beside${more}`;
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const tool = (page: Page, id: string) => page.locator(`[data-testid="studio-tool"][data-tool="${id}"]`);
const propsOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__canvasHarness.getNode(x)?.node?.props ?? {}, id);
const asked = (page: Page) => page.evaluate(() => ((window as any).__aiAsked ?? []) as Array<Record<string, unknown>>);
async function pick(page: Page, id: string) {
  await page.getByTestId("studio-tab-layers").click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-tools")).toBeVisible();
}

test("a heading's words are written, made better and translated; a button's are made shorter", async ({ page }) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url("&contrast"));
  await ready(page);
  await pick(page, "clear");
  await tool(page, "ai-words").click();
  const card = page.getByTestId("studio-ai-words");
  await expect(card).toHaveAttribute("data-status", "on");
  await expect(card).toHaveAttribute("data-kind", "heading");

  // New words about something: three options; the one picked is the heading's words on the page.
  await card.getByTestId("studio-ai-about").fill("Summer sale");
  await card.getByTestId("studio-ai-write").click();
  await expect(card.getByTestId("studio-ai-option")).toHaveCount(3);
  await card.getByTestId("studio-ai-option").first().click();
  await ready(page);
  await expect(frame(page).locator('[data-tree-node="clear"]')).toHaveText("Summer sale: made for you");
  expect((await propsOf(page, "clear")).text.en).toBe("Summer sale: made for you");
  expect((await asked(page)).at(-1)).toMatchObject({ action: "write", kind: "heading", lang: "en", about: "Summer sale", text: "Dark words on a light ground" });

  // Made better: asked with the words as they are now.
  await card.getByTestId("studio-ai-improve").click();
  await expect(card.getByTestId("studio-ai-option").nth(1)).toHaveText("Summer sale: made for you (improve 2)");
  await card.getByTestId("studio-ai-option").nth(1).click();
  await ready(page);
  await expect(frame(page).locator('[data-tree-node="clear"]')).toHaveText("Summer sale: made for you (improve 2)");

  // Into the shop's other language: its Arabic words change, the English ones on the page stay.
  await card.getByTestId("studio-ai-translate").click();
  await expect(card.getByTestId("studio-ai-option")).toHaveCount(1);
  await expect(card.getByTestId("studio-ai-options")).toContainText("Arabic");
  await card.getByTestId("studio-ai-option").click();
  await ready(page);
  const text = (await propsOf(page, "clear")).text;
  expect(text.ar).toBe("[ar] Summer sale: made for you (improve 2)");
  expect(text.en).toBe("Summer sale: made for you (improve 2)");
  await expect(frame(page).locator('[data-tree-node="clear"]')).toHaveText("Summer sale: made for you (improve 2)");
  expect((await asked(page)).at(-1)).toMatchObject({ action: "translate", to: "ar", lang: "en" });

  // A button: its label, shorter. The card is the button's own (the heading's is gone with its selection).
  await pick(page, "cta");
  await expect(card).toHaveCount(0);
  await tool(page, "ai-words").click();
  await expect(card).toHaveAttribute("data-kind", "button");
  await card.getByTestId("studio-ai-shorter").click();
  await card.getByTestId("studio-ai-option").first().click();
  await ready(page);
  expect((await propsOf(page, "cta")).label.en).toBe("Shop now (shorter 1)");
  expect((await asked(page)).at(-1)).toMatchObject({ action: "shorter", kind: "button", text: "Shop now" });
});

test("a picture's description is written from the picture", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url("&subject"));
  await ready(page);
  await pick(page, "target");
  await tool(page, "ai-alt").click();
  const card = page.getByTestId("studio-ai-words");
  await expect(card).toHaveAttribute("data-kind", "picture");
  await card.getByTestId("studio-ai-describe").click();
  await expect(card.getByTestId("studio-ai-option")).toHaveText("A red disc beside a navy one on a pale ground");
  await card.getByTestId("studio-ai-option").click();
  await ready(page);
  expect((await propsOf(page, "target")).alt.en).toBe("A red disc beside a navy one on a pale ground");
  await expect(frame(page).locator('img[data-tree-node="target"], [data-tree-node="target"] img').first()).toHaveAttribute("alt", "A red disc beside a navy one on a pale ground");
  // The picture is given by its whole address, as the provider needs it.
  const last = (await asked(page)).at(-1)!;
  expect(String(last.imageUrl)).toMatch(/^https?:\/\/.+\/templates\/fixture-subject\.svg$/);
  expect(last.lang).toBe("en");
});

test("switched off for the store, the helper says where it is switched on", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url("&contrast&aiOff"));
  await ready(page);
  await pick(page, "clear");
  await tool(page, "ai-words").click();
  const card = page.getByTestId("studio-ai-words");
  await expect(card).toHaveAttribute("data-status", "off");
  await expect(card.getByTestId("studio-ai-off")).toContainText("Page writer");
  await expect(card.getByTestId("studio-ai-settings")).toHaveAttribute("href", "/admin/ai");
  await expect(card.getByTestId("studio-ai-write")).toHaveCount(0);
  expect(await asked(page)).toEqual([]);
});
