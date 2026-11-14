import { expect, test, type Page } from "@playwright/test";

// The editor's motion maths, from the panel to the shop's frame: a free curve for an entrance, the order of a
// stagger, a path for keyframes and smooth keyframes are picked in the inspector and reach the element in the
// frame (its data-pt-motion is what the shop plays).

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
/** What the shop will play for an element, as its frame holds it. */
const motion = (page: Page, id: string) => frame(page).locator(`[data-tree-node="${id}"]`).evaluate((el) => JSON.parse((el as HTMLElement).dataset.ptMotion ?? "null"));

async function pick(page: Page, id: string) {
  await page.goto(url);
  await expect(frame(page).locator(`[data-tree-node="${id}"]`)).toBeVisible();
  await page.getByTestId("studio-tab-layers").click();
  await page.locator(`[data-testid="studio-layer"][data-node="${id}"]`).click();
  // The inspector shows one group of settings at a time: the motion one.
  await page.locator('[data-testid="studio-insp-chip"][data-group="motion"]').click();
  await expect(page.getByTestId("keys-start")).toBeVisible();
}

test("keyframes get a path and a smooth way from the panel, and the frame holds them", async ({ page }) => {
  await pick(page, "headline");
  // A ready animation along a path.
  await page.locator('[data-key-preset="path-arc"]').click();
  await expect(page.getByTestId("keys-path-kind")).toHaveValue("arc");
  await expect(page.getByTestId("keys-path-drawing")).toBeVisible();
  await expect.poll(async () => (await motion(page, "headline"))?.keys?.path).toEqual({ kind: "arc", w: 160, h: 60 });

  // Another shape keeps its size and shows what that shape has: its turns.
  await expect(page.getByTestId("keys-path-kind")).toBeEnabled();
  await page.getByTestId("keys-path-kind").selectOption("spiral");
  await expect(page.getByTestId("keys-path-turns")).toBeVisible();
  await expect.poll(async () => (await motion(page, "headline"))?.keys?.path?.kind).toBe("spiral");

  // It turns with the curve.
  await expect(page.getByTestId("keys-path-turn")).toBeEnabled();
  await page.getByTestId("keys-path-turn").check();
  await expect.poll(async () => (await motion(page, "headline"))?.keys?.path?.turn).toBe(true);

  // A smooth way between the moments, and a spring for the whole animation.
  await expect(page.getByTestId("keys-smooth")).toBeEnabled();
  await page.getByTestId("keys-smooth").check();
  await expect.poll(async () => (await motion(page, "headline"))?.keys?.smooth).toBe(true);
  await expect(page.getByTestId("keys-ease")).toBeEnabled();
  await page.getByTestId("keys-ease").selectOption("__free");
  await expect(page.getByTestId("keys-ease-field")).toBeVisible();
  await expect.poll(async () => (await motion(page, "headline"))?.keys?.ease).toBe("cubic-bezier(0.2,0.8,0.2,1)");
});

test("an entrance gets a free curve from the panel, and the frame holds it", async ({ page }) => {
  await pick(page, "headline");
  // "How it comes in" is folded until the element has an entrance.
  await page.getByText("How it comes in", { exact: true }).click();
  await page.getByTestId("studio-enter-kind").selectOption("up");
  await expect(page.getByTestId("studio-enter-ease")).toBeEnabled();
  await page.getByTestId("studio-enter-ease").selectOption("__free");
  await expect(page.getByTestId("studio-enter-ease-field")).toBeVisible();
  await expect.poll(async () => (await motion(page, "headline"))?.enter).toMatchObject({ kind: "up", ease: "cubic-bezier(0.2,0.8,0.2,1)" });
  // Back to one of the panel's names: the curve field goes.
  await expect(page.getByTestId("studio-enter-ease")).toBeEnabled();
  await page.getByTestId("studio-enter-ease").selectOption("bounce");
  await expect(page.getByTestId("studio-enter-ease-field")).toHaveCount(0);
  await expect.poll(async () => (await motion(page, "headline"))?.enter?.ease).toBe("bounce");
});
