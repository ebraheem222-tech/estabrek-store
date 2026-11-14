import { expect, test, type Page } from "@playwright/test";

// Hits that start recipes, on a shop page (physicsWorld.ts tellHits, TreeTriggers.tsx "hit"). Each recipe changes
// one of the page's variables, read here from where the page keeps them.
//  - a ball alone in its world falls to the floor: its recipe for the floor runs (again at each bounce), its
//    recipe for another body never does;
//  - a puck pulled sideways into a fixed block: its recipe for that block runs once, the block's own recipe says
//    it was struck, and the puck's recipe for a wall never runs (it only ever leans on one).

const vars = (page: Page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("pt_vars_v1") || "{}") as Record<string, unknown>);
async function start(page: Page, world: string) {
  const w = page.locator(`[data-tree-node="${world}"]`);
  await w.scrollIntoViewIfNeeded();
  await expect(w).toHaveAttribute("data-pt-world-on", "", { timeout: 20000 });
}

test("a body's hits start its recipes: the floor, one element by name, and never what it didn't meet", async ({ page }) => {
  test.setTimeout(150000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/physics-hits");

  await start(page, "drops");
  await expect.poll(async () => Number((await vars(page)).floor ?? 0), { timeout: 30000 }).toBeGreaterThanOrEqual(1);
  // It bounces: the floor is met more than once, and the recipe runs each time.
  await expect.poll(async () => Number((await vars(page)).floor ?? 0), { timeout: 30000 }).toBeGreaterThanOrEqual(2);
  expect((await vars(page)).wrong).toBeUndefined();

  await start(page, "meets");
  await expect.poll(async () => (await vars(page)).met, { timeout: 30000 }).toBe(1);
  expect((await vars(page)).struck).toBe("yes");
  // Once is once, however long the puck leans on the block; and it never hit a wall.
  await page.waitForTimeout(1500);
  const after = await vars(page);
  expect(after.met).toBe(1);
  expect(after.puckWall).toBeUndefined();
  expect(after.wrong).toBeUndefined();
});

test("with reduce motion a world doesn't run, so nothing is hit", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/physics-hits");
  await page.locator('[data-tree-node="drops"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  expect(await vars(page)).toEqual({});
});
