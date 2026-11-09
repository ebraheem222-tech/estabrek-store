import { expect, test, type Page } from "@playwright/test";

// In the editor: a ready ring that turns with the scroll from the Add panel, and the page's cursor.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const draft = (page: Page) => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree);

test("a ready ring from the Add panel turns in the preview, and the page takes a cursor", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-item"][data-kind="ready-orbit"]').click();
  await expect.poll(async () => JSON.stringify((await draft(page)).root.children)).toContain('"orbit"');
  const ring = ((await draft(page)).root.children as any[]).flatMap((s) => s.children ?? []).find((n) => n.motion?.scroll?.kind === "orbit");
  await ready(page);
  const shown = frame(page).locator(`[data-tree-node="${ring.id}"]`);
  await expect(shown).toHaveAttribute("data-pt-orbit", "circle");
  await expect(shown.locator(":scope > [data-tree-node]")).toHaveCount(6);
  // Its things are placed around the ring, each somewhere else.
  const spots = await shown.locator(":scope > [data-tree-node]").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.translate));
  expect(new Set(spots).size).toBe(6);

  // The page's cursor, from the page's own settings.
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  const root = (await draft(page)).root.id;
  await page.locator(`[data-testid="studio-layer"][data-node="${root}"]`).click();
  await page.locator('[data-testid="studio-page-cursor"] [data-cursor-kind="ring"]').click();
  await expect.poll(async () => (await draft(page)).root.props.cursor).toEqual({ kind: "ring" });
});
