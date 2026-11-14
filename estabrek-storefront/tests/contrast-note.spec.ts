import { expect, test, type Page } from "@playwright/test";

// The contrast note in an element's settings: the shop says what the words are drawn in and on, the editor says
// whether they read, and offers the nearest colour of the same hue that would.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&contrast";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const styleOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__canvasHarness.getNode(x)?.node?.style?.base ?? {}, id);
async function pick(page: Page, id: string) {
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-info")).toContainText(id);
}
/** Relative luminance and contrast of two "rgb(r, g, b)" colours, worked out here on its own. */
const contrastOf = (a: string, b: string) => {
  const lum = (text: string) => {
    const [r, g, bl] = (text.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => { const c = Number(v) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

test("pale words on a light ground are warned about, and one press makes them read", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);

  // Dark words on the light part: they read, and the note is quiet.
  await pick(page, "clear");
  const note = page.getByTestId("studio-contrast");
  await expect(note).toHaveAttribute("data-ok", "1");
  await expect(page.getByTestId("studio-contrast-fix")).toHaveCount(0);

  // Pale words on the same ground: a warning with the numbers.
  await pick(page, "faint");
  await expect(note).toHaveAttribute("data-ok", "0");
  await expect(note).toContainText("hard to read");
  await expect(note).toContainText("at least 4.5");
  const before = await frame(page).locator('[data-tree-node="faint"]').evaluate((el) => getComputedStyle(el).color);
  const ground = await frame(page).locator('[data-tree-node="light"]').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(contrastOf(before, ground)).toBeLessThan(2);

  // One press: its colour becomes the nearest one of the same hue that reads, and the note is quiet.
  await page.getByTestId("studio-contrast-fix").click();
  await expect.poll(async () => (await styleOf(page, "faint")).color).not.toBe("#e8b7cf");
  await ready(page);
  await expect(note).toHaveAttribute("data-ok", "1", { timeout: 20000 });
  const after = await frame(page).locator('[data-tree-node="faint"]').evaluate((el) => getComputedStyle(el).color);
  expect(contrastOf(after, ground)).toBeGreaterThanOrEqual(4.5);
  expect(contrastOf(after, ground)).toBeLessThan(5.5);
});

test("the ground is what is really behind the words: the same pale colour reads on a dark card", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  // The card is dark, though the part it sits in is light.
  await pick(page, "carded");
  await expect(page.getByTestId("studio-contrast")).toHaveAttribute("data-ok", "1");
  // A button's words are judged on the button itself; its colour isn't changed from here.
  await pick(page, "cta");
  await expect(page.getByTestId("studio-contrast")).toBeVisible();
  await expect(page.getByTestId("studio-contrast-fix")).toHaveCount(0);
  // An element with no words has no note.
  await pick(page, "card");
  await expect(page.getByTestId("studio-contrast")).toHaveCount(0);
});
