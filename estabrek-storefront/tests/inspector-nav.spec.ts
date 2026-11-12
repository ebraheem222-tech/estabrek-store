import { expect, test } from "@playwright/test";

// The inspector's order and way around it: a button's own words and link come first, under "Content", before its
// look and its motion; the bar at the top jumps to a group and finds a setting by its words; a 3D model's stage is
// set from its panel and shows in the page.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&shapes";
const readNode = (page: import("@playwright/test").Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

test("a button's content comes first; the bar jumps to its motion and finds a setting", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator('[data-testid="studio-layer"][data-node="cta"]').click();
  const info = page.getByTestId("studio-info");
  await expect(info.getByTestId("studio-insp-chip").first()).toBeVisible();
  expect(await info.getByTestId("studio-insp-chip").evaluateAll((els) => els.map((e) => e.getAttribute("data-group")))).toEqual(["content", "look", "motion", "decor", "behaviour", "layout"]);
  // Its words and link are above its look, which is above its motion.
  const top = (testId: string) => info.getByTestId(testId).first().evaluate((el) => el.getBoundingClientRect().top + (el.closest("aside")?.scrollTop ?? 0));
  expect(await top("studio-element")).toBeLessThan(await top("studio-button-style"));
  expect(await top("studio-button-style")).toBeLessThan(await top("studio-motion"));
  expect(await top("studio-motion")).toBeLessThan(await top("studio-movement"));
  await expect(info.getByTestId("studio-prop-label")).toBeInViewport();

  // A jump to its motion.
  await expect(info.getByTestId("studio-motion")).not.toBeInViewport();
  await info.locator('[data-testid="studio-insp-chip"][data-group="motion"]').click();
  await expect(info.getByTestId("studio-motion")).toBeInViewport({ timeout: 10000 });

  // Finding a setting: only the cards that mention it stay; clearing brings everything back.
  await info.getByTestId("studio-insp-find").fill("equations");
  await expect(info.getByTestId("studio-form")).toBeVisible();
  await expect(info.getByTestId("studio-motion")).toBeHidden();
  await expect(info.getByTestId("studio-element")).toBeHidden();
  await info.getByTestId("studio-insp-find").fill("");
  await expect(info.getByTestId("studio-motion")).toBeVisible();
  await expect(info.getByTestId("studio-element")).toBeVisible();
});

test("a 3D model's stage set from its panel shows in the page", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en");
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator('[data-testid="studio-layer"][data-node="model"]').click();
  const info = page.getByTestId("studio-info");
  // One click: on a display stand, a glow behind it, popping in.
  await info.getByTestId("model3d-looks").locator('[data-look="stand"]').click();
  await expect.poll(async () => (await readNode(page, "model"))?.props?.floor).toBe("pedestal");
  expect((await readNode(page, "model")).props).toMatchObject({ backdrop: { kind: "glow" }, intro: "pop" });
  const stage = page.frameLocator('[data-testid="studio-frame"]').locator('[data-tree-node="model"] .pt-model3d-stage');
  await expect(stage).toHaveAttribute("data-backdrop", "glow", { timeout: 20000 });
  // Then a spotlight behind it instead.
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 30000 });
  await info.getByTestId("model3d-backdrop").locator('[data-value="spot"]').click();
  await expect(stage).toHaveAttribute("data-backdrop", "spot", { timeout: 20000 });
  await expect(stage).toHaveAttribute("data-model-state", "ready", { timeout: 30000 });
});
