import { expect, test, type Page } from "@playwright/test";

// Physics on a shop page (TreePhysics, physicsWorld.ts): a heading drops into its place; a world waits with its
// bodies above (out of sight) until it's seen, then they fall to its floor; the tag hangs from its rope; a body is
// grabbed and thrown. With "reduce motion" nothing moves and everything shows where the design put it.

const varOf = (page: Page, id: string, name: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el, n) => (el as HTMLElement).style.getPropertyValue(n), name);

test("a heading drops in; a world's bodies fall in once seen, hang from a rope, and can be thrown", async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/physics-demo");
  const falls = page.locator('[data-tree-node="falls"]');
  await expect(falls).toHaveAttribute("data-pt-physics", "");
  await expect.poll(async () => { const v = parseFloat(await varOf(page, "falls", "--pt-qy")); return Number.isNaN(v) ? 99 : Math.abs(v); }, { timeout: 15000 }).toBeLessThan(1);
  await expect(falls).toBeVisible();

  // The world waits: its bodies are above it (it clips them) until it's seen.
  const world = page.locator('[data-tree-node="world"]');
  await expect(world).toHaveAttribute("data-pt-world-on", "", { timeout: 15000 });
  expect(parseFloat(await varOf(page, "ball", "--pt-qy"))).toBeLessThan(-50);
  await world.scrollIntoViewIfNeeded();
  await expect.poll(async () => parseFloat(await varOf(page, "ball", "--pt-qy")), { timeout: 15000 }).toBeGreaterThan(40);
  await expect(world.locator("svg line")).toHaveCount(1);

  // Grabbed and thrown: it leaves where it lay.
  await page.waitForTimeout(1500);
  const before = parseFloat(await varOf(page, "ball", "--pt-qx")) || 0;
  const box = (await page.locator('[data-tree-node="ball"]').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width / 2 + i * 40, box.y + box.height / 2 - i * 15);
  await page.mouse.up();
  await expect.poll(async () => Math.abs((parseFloat(await varOf(page, "ball", "--pt-qx")) || 0) - before), { timeout: 10000 }).toBeGreaterThan(60);
});

test("with reduce motion nothing moves, and the world's bodies show where the design put them", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/physics-demo");
  await page.locator('[data-tree-node="world"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(await varOf(page, "ball", "--pt-qy")).toBe("");
  expect(await varOf(page, "falls", "--pt-qy")).toBe("");
  await expect(page.locator('[data-tree-node="world"]')).not.toHaveAttribute("data-pt-world-on", "");
  await expect(page.locator('[data-tree-node="ball"]')).toBeVisible();
});
