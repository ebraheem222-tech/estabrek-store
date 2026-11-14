import { expect, test, type Page } from "@playwright/test";

// A world's field of force on a shop page (physicsWorld.ts, physics.ts fieldForce): with no gravity, the bodies of
// a world that pulls to a point at its right travel right towards it, while those of the same world without a
// field stay where the design put them.

const varOf = (page: Page, id: string, name: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el, n) => parseFloat((el as HTMLElement).style.getPropertyValue(n)) || 0, name);

test("a pull draws a world's bodies to its point; without a field they stay where they are", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/physics-field");
  await expect(page.locator('[data-tree-node="pulls"]')).toHaveAttribute("data-pt-world-on", "", { timeout: 20000 });
  // Both bodies start at the left; the point is at the right.
  await expect.poll(() => varOf(page, "pulls-a", "--pt-qx"), { timeout: 30000 }).toBeGreaterThan(200);
  await expect.poll(() => varOf(page, "pulls-b", "--pt-qx"), { timeout: 30000 }).toBeGreaterThan(200);
  // No field and no gravity: nothing moves the other world's bodies.
  expect(Math.abs(await varOf(page, "still-a", "--pt-qx"))).toBeLessThan(2);
  expect(Math.abs(await varOf(page, "still-a", "--pt-qy"))).toBeLessThan(2);
});
