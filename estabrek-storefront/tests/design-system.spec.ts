import { expect, test, type Page } from "@playwright/test";

// The design system (W2) in the editor: variables taken by name, so changing one changes every
// element that uses it.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });

test("a heading takes the brand colour by name, and changing the variable changes it", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  // Start from the ready set of variables.
  await page.getByRole("tab", { name: "Styles", exact: true }).click();
  await page.getByTestId("variables-starter").click();
  await expect(page.getByTestId("variables-colors").locator("[data-token]")).toHaveCount(5);
  await ready(page);
  // The heading's colour from the variables.
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator('[data-testid="studio-layer"][data-node="headline"]').click();
  await page.getByTestId("studio-style-color").selectOption("$brand");
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness.getNode("headline").node.style.base.color)).toBe("$brand");
  await ready(page);
  const headline = frame(page).locator('[data-tree-node="headline"]');
  await expect(headline).toHaveCSS("color", "rgb(200, 107, 152)");
  // Change the variable: the heading follows without touching it.
  await page.getByRole("tab", { name: "Styles", exact: true }).click();
  const brand = page.getByTestId("variables-colors").locator('[data-token="brand"] [data-testid="variable-colour"]');
  await brand.focus();
  await brand.fill("#2255aa");
  await brand.blur();
  await expect.poll(() => page.getByTestId("variables-colors").locator('[data-token="brand"] [data-testid="variable-colour"]').inputValue()).toBe("#2255aa");
  await ready(page);
  await expect(headline).toHaveCSS("color", "rgb(34, 85, 170)");
  // Publishing makes the draft the variables everyone sees.
  await page.getByTestId("variables-publish").click();
  await expect(page.getByTestId("variables-publish")).toHaveCount(0);
  await expect(headline).toHaveCSS("color", "rgb(34, 85, 170)");
});

test("an element becomes a main component; an instance changes its own words; another is added; one is detached", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  const draft = () => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree.root.children[0].children.map((n: any) => ({ id: n.id, type: n.type, props: n.props })));
  // The button becomes a main component: an instance takes its place, drawn as the button.
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator('[data-testid="studio-layer"][data-node="action"]').click();
  await page.getByTestId("component-make-open").click();
  await page.getByTestId("component-make-name").fill("Buy button");
  await page.getByTestId("component-make-save").click();
  await expect.poll(async () => (await draft()).find((n: any) => n.type === "component")?.props.componentId).toBe("comp-1");
  const inst = (await draft()).find((n: any) => n.type === "component")!.id;
  await ready(page);
  await expect(frame(page).locator(`[data-tree-node="${inst}"]`)).toContainText("Editable action");
  await expect(page.getByTestId("component-instance")).toContainText("Buy button");
  // This one says something else; the main component doesn't change.
  const label = page.getByTestId("component-override-action-label");
  await label.fill("Only here");
  await label.blur();
  await expect.poll(async () => (await draft()).find((n: any) => n.id === inst)?.props.overrides?.action?.label?.en).toBe("Only here");
  await ready(page);
  await expect(frame(page).locator(`[data-tree-node="${inst}"]`)).toContainText("Only here");
  // A second instance from the Add panel shows the main component's words.
  await page.getByRole("tab", { name: "+ Add", exact: true }).click();
  await page.getByTestId("add-component-comp-1").click();
  await expect.poll(async () => (await draft()).filter((n: any) => n.type === "component").length).toBe(2);
  const second = (await draft()).filter((n: any) => n.type === "component").find((n: any) => n.id !== inst)!.id;
  await ready(page);
  await expect(frame(page).locator(`[data-tree-node="${second}"]`)).toContainText("Editable action");
  // Detached: a plain button with this instance's words, not linked any more.
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${inst}"]`).click();
  await page.getByTestId("component-detach").click();
  await expect.poll(async () => (await draft()).find((n: any) => n.id === inst)?.type).toBe("button");
  expect((await draft()).find((n: any) => n.id === inst)!.props.label).toMatchObject({ en: "Only here" });
});
