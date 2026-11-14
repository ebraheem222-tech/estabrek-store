import { expect, test, type Page } from "@playwright/test";

// The Variables panel's maths in a real browser: each colour says how it reads on the store's paper and ink, a
// colour's tones and its opposite become variables, and the spaces go on a scale; all of it reaches the shop's
// frame as CSS variables.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const rootVar = (page: Page, name: string) => frame(page).locator("html").evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);

test("a colour's tones, its opposite and a scale of spaces become the shop's variables", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "Styles", exact: true }).click();
  await page.getByTestId("variables-starter").click();
  const colours = page.getByTestId("variables-colors");
  await expect(colours.locator("[data-token]")).toHaveCount(5);
  await ready(page);

  // The brand colour is an edge on the paper, and takes the ink's dark words best.
  const brand = colours.locator('[data-token="brand"]');
  await expect(brand.locator('[data-testid="variable-reading"][data-on="paper"]')).toHaveAttribute("data-grade", "large");
  await expect(brand.locator('[data-testid="variable-reading"][data-on="ink"]')).toHaveAttribute("data-grade", "AA");
  await expect(brand.locator('[data-testid="variable-reading"][data-on="ink"]')).toHaveAttribute("data-best", "1");
  await expect(page.getByTestId("variables-weak")).toHaveCount(0);

  // Its tones: nine more colours, light to dark, in the shop's frame too.
  await expect(brand.getByTestId("variable-tones")).toContainText("+9");
  await brand.getByTestId("variable-tones").click();
  await expect(colours.locator("[data-token]")).toHaveCount(14);
  await ready(page);
  await expect.poll(() => rootVar(page, "--tk-c-brand-900")).toMatch(/^#[0-9a-f]{6}$/);
  expect(await rootVar(page, "--tk-c-brand-50")).toMatch(/^#f[0-9a-f]{5}$/);
  // Added once.
  await expect(brand.getByTestId("variable-tones")).toBeDisabled();

  // The colour that goes with it.
  await brand.getByTestId("variable-mates").selectOption("complement");
  await expect(colours.locator('[data-token="brand-opposite"]')).toHaveCount(1);
  await ready(page);

  // The spaces on the golden ratio: seen first, then applied.
  await page.getByTestId("variables-tab-spaces").click();
  const preview = page.getByTestId("variables-scale-preview");
  await expect(preview).toHaveText("4 · 6 · 9 · 14 · 20");
  await page.getByTestId("variables-scale-ratio").selectOption(String((1 + Math.sqrt(5)) / 2));
  await page.getByTestId("variables-scale-base").fill("8");
  await expect(preview).toHaveText("8 · 13 · 21 · 34 · 55");
  await page.getByTestId("variables-scale-apply").click();
  await ready(page);
  await expect.poll(() => rootVar(page, "--tk-s-md")).toBe("21px");
  await expect(page.getByTestId("variables-spaces").locator('[data-token="md"] [data-testid="variable-number"]')).toHaveValue("21");
});
