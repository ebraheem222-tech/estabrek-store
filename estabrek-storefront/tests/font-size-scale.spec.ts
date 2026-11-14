import { expect, test, type Page } from "@playwright/test";

// Font sizes as design variables, in a real browser: the ready set brings a scale of seven sizes, they go on
// another scale in one press, a heading takes one by name, and from then on it follows that variable.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&contrast";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const rootVar = (page: Page, name: string) => frame(page).locator("html").evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
const styleOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__canvasHarness.getNode(x)?.node?.style?.base ?? {}, id);
async function pick(page: Page, id: string) {
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-info")).toContainText(id);
}
async function sizesTab(page: Page) {
  await page.getByRole("tab", { name: "Styles", exact: true }).click();
  await page.getByTestId("variables-tab-sizes").click();
  return page.getByTestId("variables-sizes");
}

test("a scale of font sizes becomes the shop's variables, and a heading that takes one by name follows it", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  const heading = frame(page).locator('[data-tree-node="clear"]');
  const designed = await heading.evaluate((el) => getComputedStyle(el).fontSize);

  // The ready set: seven sizes, 13 px times 1.25 at each step, in the shop's frame as variables.
  await page.getByRole("tab", { name: "Styles", exact: true }).click();
  await page.getByTestId("variables-starter").click();
  await ready(page);
  const sizes = await sizesTab(page);
  await expect(sizes.locator("[data-token]")).toHaveCount(7);
  await expect(sizes.locator('[data-token="h1"] [data-testid="variable-number"]')).toHaveValue("40");
  await expect.poll(() => rootVar(page, "--tk-z-h1")).toBe("40px");
  expect(await rootVar(page, "--tk-z-small")).toBe("13px");
  // Each size is shown at its own size.
  await expect(sizes.locator('[data-token="lead"] [data-testid="variable-size-sample"]')).toHaveCSS("font-size", "20px");

  // Another scale: seen first, then applied.
  const preview = page.getByTestId("variables-size-scale-preview");
  await expect(preview).toHaveText("13 · 16 · 20 · 25 · 32 · 40 · 50");
  await page.getByTestId("variables-size-scale-ratio").selectOption(String(4 / 3));
  await page.getByTestId("variables-size-scale-base").fill("14");
  await expect(preview).toHaveText("14 · 19 · 25 · 33 · 44 · 59 · 79");
  await page.getByTestId("variables-size-scale-apply").click();
  await ready(page);
  await expect.poll(() => rootVar(page, "--tk-z-h1")).toBe("59px");
  await expect(sizes.locator('[data-token="h1"] [data-testid="variable-number"]')).toHaveValue("59");

  // A heading takes the big heading's size by name.
  await pick(page, "clear");
  const byName = page.getByTestId("studio-style-size-variable");
  await expect(byName).toHaveValue("");
  await byName.selectOption("$h1");
  await ready(page);
  await expect(heading).toHaveCSS("font-size", "59px");
  expect((await styleOf(page, "clear")).size).toBe("$h1");
  await expect(byName).toHaveValue("$h1");
  await expect(page.getByTestId("studio-style-size")).toHaveValue("");

  // The variable changes: the heading follows, with nothing changed on the heading itself.
  const again = await sizesTab(page);
  const number = again.locator('[data-token="h1"] [data-testid="variable-number"]');
  await number.fill("72");
  await number.blur();
  await ready(page);
  await expect.poll(() => rootVar(page, "--tk-z-h1")).toBe("72px");
  await expect(heading).toHaveCSS("font-size", "72px");
  expect((await styleOf(page, "clear")).size).toBe("$h1");

  // Its own number again, then none: back to the size it was designed with.
  await pick(page, "clear");
  await page.getByTestId("studio-style-size").fill("31");
  await page.getByTestId("studio-style-size").blur();
  await ready(page);
  await expect(heading).toHaveCSS("font-size", "31px");
  await expect(byName).toHaveValue("");
  await byName.selectOption("$body");
  await ready(page);
  await expect(heading).toHaveCSS("font-size", "19px");
  await byName.selectOption("");
  await ready(page);
  await expect(heading).toHaveCSS("font-size", designed);
  expect("size" in (await styleOf(page, "clear"))).toBe(false);
});
