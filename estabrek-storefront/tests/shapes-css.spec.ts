import { expect, test, type Page } from "@playwright/test";

// Shapes by equations and an element's own CSS (G, C): a card cut by a ready ticket shape, then a wave picked for its
// bottom edge (a polygon in the page, its corners in px); a flowing blob; a button given Tailwind classes and
// written CSS, built for it alone and shown in the page, an unknown class refused.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&shapes";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);
const css = (page: Page, id: string, prop: string) => frame(page).locator(`[data-tree-node="${id}"]`).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
const pick = async (page: Page, id: string) => {
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-info")).toContainText(id);
};

test("a card shaped by equations, corner by corner and edge by edge; a button with its own Tailwind and CSS", async ({ page }, testInfo) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });

  await pick(page, "card");
  const panel = page.getByTestId("studio-form");
  await panel.locator("summary").filter({ hasText: /Ready shapes/ }).click();
  await panel.locator('[data-testid="studio-form-preset"][data-key="ticket"]').click();
  await expect.poll(async () => (await readNode(page, "card"))?.style?.base?.form?.edges?.left?.kind).toBe("notch");
  await expect.poll(() => css(page, "card", "clip-path"), { timeout: 20000 }).toContain("polygon(");
  // Its bottom edge becomes a wave.
  await panel.locator('[data-testid="studio-form-target"][data-target="bottom"]').click();
  await panel.locator('[data-testid="studio-form-edge-kind"][data-kind="wave"]').click();
  await expect.poll(async () => (await readNode(page, "card"))?.style?.base?.form?.edges?.bottom?.kind).toBe("wave");
  // The round corners keep 12px: the first point is 12px down the left side.
  await expect.poll(() => css(page, "card", "clip-path"), { timeout: 20000 }).toMatch(/^polygon\(0(px|%) 12px/);
  await page.screenshot({ path: testInfo.outputPath("shape-ticket-wave.png") });

  // A whole shape that breathes: its own animation in the page.
  await panel.locator('[data-testid="studio-form-preset"][data-key="blob"]').click();
  await expect.poll(async () => (await readNode(page, "card"))?.style?.base?.form?.whole?.kind).toBe("blob");
  await expect.poll(() => css(page, "card", "animation-name"), { timeout: 20000 }).toBe("pt-form-card-base");

  // The button's own CSS.
  await pick(page, "cta");
  const code = page.getByTestId("studio-code");
  await code.locator("summary").first().click();
  await code.getByTestId("studio-code-tw").fill("rounded-none tracking-widest nope-nope");
  await code.getByTestId("studio-code-apply").click();
  await expect(code.getByTestId("studio-code-error")).toContainText("nope-nope", { timeout: 20000 });
  await code.getByTestId("studio-code-tw").fill("rounded-none tracking-widest");
  await code.getByTestId("studio-code-css").fill("color: rgb(10, 120, 60);\n&:hover { color: rgb(200, 0, 0); }");
  await code.getByTestId("studio-code-apply").click();
  await expect.poll(async () => (await readNode(page, "cta"))?.props?.code?.out ?? "", { timeout: 20000 }).toContain(".pt-cta{");
  await expect.poll(() => css(page, "cta", "color"), { timeout: 20000 }).toBe("rgb(10, 120, 60)");
  expect(await css(page, "cta", "border-top-left-radius")).toBe("0px");
  expect(await css(page, "cta", "letter-spacing")).not.toBe("normal");
  await page.screenshot({ path: testInfo.outputPath("code-panel.png") });
});
