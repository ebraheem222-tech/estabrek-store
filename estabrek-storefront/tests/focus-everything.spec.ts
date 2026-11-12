import { expect, test, type Page } from "@playwright/test";

// Focus mode for everything (the editor's "open it on its own"): a store scene and an old section have no editor of
// their own, yet open zoomed to on their own with the rest dimmed and their usual settings; Esc and «Back» return.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&home";
const readout = (page: Page) => page.getByText(/^\d+%$/).first().innerText();

test("a store scene and an old section open on their own; Esc and «Back» return", async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await page.getByRole("tab", { name: "Layers", exact: true }).click();

  // A store scene: chosen, then F.
  await page.locator('[data-testid="studio-layer"]').filter({ hasText: "Fabric study" }).first().click();
  await expect(page.getByTestId("studio-focus-enter")).toBeVisible();
  const before = await readout(page);
  await page.keyboard.press("f");
  const bar = page.getByTestId("studio-focus-bar");
  await expect(bar).toHaveAttribute("data-group", "lite");
  await expect(bar).toContainText("Fabric");
  await expect.poll(() => readout(page), { timeout: 5000 }).not.toBe(before);
  await page.keyboard.press("Escape");
  await expect(bar).toHaveCount(0);
  await expect.poll(() => readout(page), { timeout: 5000 }).toBe(before);

  // An old section: chosen, then the ✎ button; «Back» returns.
  await page.locator('[data-testid="studio-layer"]').filter({ hasText: /^⋮⋮Section$|Section/ }).first().click();
  await page.getByTestId("studio-focus-enter").click();
  await expect(bar).toHaveAttribute("data-group", "lite");
  await page.getByTestId("studio-focus-exit").click();
  await expect(bar).toHaveCount(0);
});
