import { expect, test, type Page } from "@playwright/test";

// Physics (I1, I2, I4): a section made a world, tried in the page (its bodies dropped in, falling to its floor, one
// hung from a rope drawn as a line), put back, baked into each body's keyframes (the page then runs no physics) and
// made live again; a heading of its own physics drops into place when played.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&physics";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const readNode = (page: Page, id: string) => page.evaluate((nodeId) => (window as any).__canvasHarness.getNode(nodeId)?.node, id);
const varOf = (page: Page, id: string, name: string) => frame(page).locator(`[data-tree-node="${id}"]`).evaluate((el, n) => (el as HTMLElement).style.getPropertyValue(n), name);
const pick = async (page: Page, id: string) => {
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  await expect(page.getByTestId("studio-info")).toContainText(id);
};

test("a world tried, put back, baked into keyframes and made live again; an element's own drop", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect(frame(page).locator('[data-tree-node="world"]')).toHaveAttribute("data-pt-world", /"start":"drop"/, { timeout: 30000 });

  await pick(page, "world");
  const panel = page.getByTestId("studio-world");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("3 bodies");

  // Tried: the bodies drop in from above and land on the world's floor; the tag hangs from its rope.
  await page.getByTestId("studio-world-play").click();
  const host = frame(page).locator('[data-tree-node="world"]');
  await expect(host).toHaveAttribute("data-pt-world-on", "", { timeout: 20000 });
  await expect(host.locator("svg line")).toHaveCount(1);
  await expect.poll(async () => parseFloat(await varOf(page, "ball", "--pt-qy")), { timeout: 20000 }).toBeGreaterThan(60);
  await page.screenshot({ path: testInfo.outputPath("physics-world.png") });
  // The tag stays near the top, on its rope.
  expect(Math.abs(parseFloat(await varOf(page, "tag", "--pt-qy")) || 0)).toBeLessThan(120);

  // Put back where the design has them.
  await page.getByTestId("studio-world-stop").click();
  await expect(host).not.toHaveAttribute("data-pt-world-on", "");
  await expect.poll(() => varOf(page, "ball", "--pt-qy")).toBe("");

  // Baked: each body that moved has its run as keyframes, the world runs no physics.
  await page.getByTestId("studio-world-bake").click();
  await expect.poll(async () => (await readNode(page, "world"))?.props?.world?.baked, { timeout: 30000 }).toBe(true);
  const keys = (await readNode(page, "ball"))?.motion?.keys;
  expect(keys?.on).toBe("view");
  expect(keys?.parts?.self?.length).toBeGreaterThanOrEqual(2);
  expect(keys?.parts?.self?.length).toBeLessThanOrEqual(16);
  expect(keys.parts.self[0].y).toBeLessThan(0);
  await expect(page.getByTestId("studio-world")).toHaveAttribute("data-baked", "");
  await expect(host).not.toHaveAttribute("data-pt-world", /.*/, { timeout: 20000 });
  await expect(frame(page).locator('[data-tree-node="ball"]')).toHaveAttribute("data-pt-motion", /"keys"/);

  // Live again: the keyframes come off.
  await page.getByTestId("studio-world-unbake").click();
  await expect.poll(async () => (await readNode(page, "ball"))?.motion?.keys ?? null).toBeNull();
  await expect(host).toHaveAttribute("data-pt-world", /"start":"drop"/, { timeout: 20000 });

  // An element's own physics: a drop into its place.
  await pick(page, "falls");
  await page.getByTestId("studio-physics").locator("summary").click();
  await page.getByTestId("studio-physics-kind").selectOption("drop");
  await expect.poll(async () => (await readNode(page, "falls"))?.motion?.physics?.kind).toBe("drop");
  const falls = frame(page).locator('[data-tree-node="falls"]');
  await expect(falls).toHaveAttribute("data-pt-physics", "", { timeout: 20000 });
  await page.getByTestId("studio-motion-play").click();
  await expect.poll(() => varOf(page, "falls", "--pt-qy"), { timeout: 15000 }).not.toBe("");
  await expect.poll(async () => Math.abs(parseFloat(await varOf(page, "falls", "--pt-qy"))), { timeout: 15000 }).toBeLessThan(1);
  await page.screenshot({ path: testInfo.outputPath("physics-panel.png") });
});
