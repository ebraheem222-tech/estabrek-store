import { expect, test, type Page } from "@playwright/test";

// Bodies by their real outline, and bodies linked to each other, on a shop page (physicsWorld.ts, physicsShape.ts).
// One world each on the test page, so nothing meets anything else:
//  - a triangle put upright lands on its base, its base on the floor (its weight sits low, not at its box's middle);
//  - a diamond dropped as it looks comes to rest on one of its sides, its middle lower than a box's could ever be;
//    the same diamond told to be a box keeps a box's height; a leaf (a curved outline the browser measures) and a
//    three-cornered shape by equations (a polygon clip) rest lower than a box could, too;
//  - a button linked by a rope to a fixed one swings down and hangs right under it, a rope's length away; one on a
//    spring hangs there too; a loose one falls to the floor.

const varOf = (page: Page, id: string, name: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el, n) => parseFloat((el as HTMLElement).style.getPropertyValue(n)) || 0, name);
/** The world is running and its body has stopped moving. */
async function rested(page: Page, world: string, id: string) {
  const w = page.locator(`[data-tree-node="${world}"]`);
  await w.scrollIntoViewIfNeeded();
  await expect(w).toHaveAttribute("data-pt-world-on", "", { timeout: 20000 });
  await page.waitForTimeout(1500);
  let last = NaN;
  await expect.poll(async () => {
    const now = Math.round(((await varOf(page, id, "--pt-qy")) + (await varOf(page, id, "--pt-qx"))) * 2) / 2;
    const same = now === last;
    last = now;
    return same;
  }, { timeout: 30000, intervals: [700] }).toBe(true);
}
/** Where an element's middle is in its world: across from the world's left, and up from its floor. */
const placeOf = (page: Page, world: string, id: string) => page.evaluate(([a, b]) => {
  const W = document.querySelector(`[data-tree-node="${a}"]`)!.getBoundingClientRect(), E = document.querySelector(`[data-tree-node="${b}"]`)!.getBoundingClientRect();
  return { x: E.left + E.width / 2 - W.left, up: W.bottom - (E.top + E.height / 2), under: W.bottom - E.bottom };
}, [world, id]);
async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/physics-shapes");
}

test("a body takes its element's real outline: a triangle stands on its base, a diamond lies on its side", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  // The triangle fell straight and stands: not turned, its base on the floor.
  await rested(page, "stands", "tri");
  expect(Math.abs(await varOf(page, "tri", "--pt-qrz"))).toBeLessThan(2);
  expect(await varOf(page, "tri", "--pt-qy")).toBeGreaterThan(150);
  expect(Math.abs((await placeOf(page, "stands", "tri")).under)).toBeLessThan(3);

  // The diamond (120 across): on a side its middle is half that side's square above the floor, 42 px.
  await rested(page, "tips", "gem");
  const gem = await placeOf(page, "tips", "gem");
  expect(gem.up).toBeGreaterThan(37);
  expect(gem.up).toBeLessThan(48);
  // Turned an eighth of a turn from how it was drawn, one way or the other.
  const turned = Math.abs(await varOf(page, "gem", "--pt-qrz")) % 90;
  expect(Math.abs(turned - 45)).toBeLessThan(6);

  // The same picture as a box: a box's middle is never nearer the floor than half its side, 60 px.
  await rested(page, "flat", "crate");
  expect((await placeOf(page, "flat", "crate")).up).toBeGreaterThan(58);
});

test("a curved outline and a shape by equations are bodies by their outline too", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  // A leaf is a lens along its box's diagonal: lying on its side its middle is about half its thickness up (38 px).
  await rested(page, "lies", "leaf");
  const leaf = (await placeOf(page, "lies", "leaf")).up;
  expect(leaf).toBeGreaterThan(24);
  expect(leaf).toBeLessThan(52);
  // Three corners by equations (a polygon clip): whichever side it lies on, its middle is nearer the floor than a box's.
  await rested(page, "cuts", "wedge");
  await expect(page.locator('[data-tree-node="wedge"]')).toHaveCSS("clip-path", /^polygon\(/);
  expect((await placeOf(page, "cuts", "wedge")).up).toBeLessThan(56);
});

test("two bodies are linked: one hangs from the other by a rope or a spring; a loose one falls", async ({ page }) => {
  test.setTimeout(150000);
  await open(page);
  // The two buttons are drawn side by side, 120 px apart: that is the rope's length.
  await rested(page, "ropes", "rope-bob");
  const peg = await placeOf(page, "ropes", "rope-peg"), bob = await placeOf(page, "ropes", "rope-bob");
  expect(Math.abs(await varOf(page, "rope-peg", "--pt-qy"))).toBeLessThan(1);
  // It swung down and hangs right under the fixed one, a rope's length below, well off the floor.
  expect(Math.abs(bob.x - peg.x)).toBeLessThan(8);
  expect(Math.abs(Math.hypot(bob.x - peg.x, bob.up - peg.up) - 120)).toBeLessThan(5);
  expect(peg.up - bob.up).toBeGreaterThan(110);
  expect(bob.under).toBeGreaterThan(100);
  await expect(page.locator('[data-tree-node="ropes"] svg line[data-pt-link="rope"]')).toHaveCount(1);

  // On a spring it hangs under its own fixed one too, and the line is a spring's.
  await rested(page, "springs", "spring-bob");
  const hook = await placeOf(page, "springs", "spring-peg"), weight = await placeOf(page, "springs", "spring-bob");
  expect(Math.abs(weight.x - hook.x)).toBeLessThan(12);
  expect(hook.up - weight.up).toBeGreaterThan(110);
  expect(weight.under).toBeGreaterThan(100);
  await expect(page.locator('[data-tree-node="springs"] svg line[data-pt-link="spring"]')).toHaveCount(1);

  // With nothing holding it, the same button falls to the floor.
  await rested(page, "falls", "loose");
  expect(Math.abs((await placeOf(page, "falls", "loose")).under)).toBeLessThan(3);
  await expect(page.locator('[data-tree-node="falls"] svg line')).toHaveCount(0);
});
