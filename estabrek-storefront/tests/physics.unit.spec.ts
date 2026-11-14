import { expect, test } from "@playwright/test";
import { bakeFrames, bodyOf, fallStep, fieldForce, fitEase, keepSamples, pendulumStep, physicsOf, seeded, springRests, springStep, worldOf, WORLD_DEFAULTS, type Sample } from "../src/pageTree/physics";
import { motionOf, treeNeeds, TREE_TRANSFORM, TREE_TRANSFORM_REST, type PageTree } from "../src/pageTree/tree";
import { treeCss } from "../src/pageTree/css";

// Physics as the shop reads it (pageTree/physics.ts): the settings checked again, the springs and falls that move
// an element, and a world's run baked into keyframes.

test("an element's physics, a world and a body: known values only, a world's defaults filled in", () => {
  expect(physicsOf({ kind: "drop", amount: 1.5, bounce: 0.4, home: "stay" })).toEqual({ kind: "drop", amount: 1.5, bounce: 0.4, home: "stay" });
  expect(physicsOf({ kind: "fly" })).toBeNull();
  expect(physicsOf({ kind: "follow", stiffness: 9999 })).toEqual({ kind: "follow" });
  expect(worldOf({ gy: -1, walls: "box", click: "flip" })).toEqual({ ...WORLD_DEFAULTS, gy: -1, walls: "box", click: "flip" });
  expect(worldOf({ gy: 9 })?.gy).toBe(1);
  expect(worldOf(null)).toBeNull();
  expect(bodyOf({ shape: "circle", hang: "rope", fixed: false })).toEqual({ shape: "circle", hang: "rope" });
  expect(bodyOf({})).toBeNull();
});

test("a world's field of force: read with its point and power, pulling like gravity, pushing, going round, whirling", () => {
  expect(worldOf({ field: "orbit", fieldX: 20, fieldY: 80, fieldPower: 1 })).toMatchObject({ field: "orbit", fieldX: 20, fieldY: 80, fieldPower: 1 });
  expect(worldOf({ field: "black-hole", fieldX: 140, fieldPower: 3 })).toMatchObject({ field: "none", fieldX: 50, fieldY: 50, fieldPower: 0.5 });
  expect(WORLD_DEFAULTS.field).toBe("none");

  const reach = 1000, mass = 2;
  // A body 100 to the right of the point is pulled left, pushed right, by the same amount.
  const pull = fieldForce("pull", 1, 100, 0, mass, reach), push = fieldForce("push", 1, 100, 0, mass, reach);
  expect(pull.x).toBeLessThan(0);
  expect(pull.y).toBeCloseTo(0, 12);
  expect(push.x).toBeCloseTo(-pull.x, 12);
  // Its size: power × mass × 0.002 × s² / (r² + s²), s = 0.3 × reach; half its most at r = s.
  const size = (f: { x: number; y: number }) => Math.hypot(f.x, f.y);
  expect(size(pull)).toBeCloseTo(1 * mass * 0.002 * (300 * 300) / (100 * 100 + 300 * 300), 12);
  expect(size(fieldForce("pull", 1, 300, 0, mass, reach))).toBeCloseTo(mass * 0.002 / 2, 12);
  // Weaker further away, and in proportion to the power and the mass.
  const far = [50, 150, 300, 600, 900].map((r) => size(fieldForce("pull", 1, 0, r, mass, reach)));
  for (let i = 1; i < far.length; i++) expect(far[i]).toBeLessThan(far[i - 1]);
  expect(size(fieldForce("pull", 0.5, 100, 0, mass, reach))).toBeCloseTo(size(pull) / 2, 12);
  expect(size(fieldForce("pull", 1, 100, 0, mass * 3, reach))).toBeCloseTo(size(pull) * 3, 12);
  // Towards the point from anywhere: the force and the way to the point agree.
  for (const [dx, dy] of [[70, 70], [-120, 40], [0, -300], [-5, -5]]) {
    const f = fieldForce("pull", 1, dx, dy, mass, reach);
    expect(f.x * -dx + f.y * -dy).toBeGreaterThan(0);
    expect(Math.abs(f.x * dy - f.y * dx)).toBeLessThan(1e-12);
  }
  // Going round: a pull with a part sideways, the same way round on both sides of the point.
  const right = fieldForce("orbit", 1, 100, 0, mass, reach), left = fieldForce("orbit", 1, -100, 0, mass, reach);
  expect(right.x).toBeLessThan(0);
  expect(Math.abs(right.y)).toBeGreaterThan(0);
  expect(Math.sign(left.y)).toBe(-Math.sign(right.y));
  expect(Math.abs(right.y / right.x)).toBeCloseTo(0.35, 6);
  // A whirl: mostly sideways, a little inwards.
  const whirl = fieldForce("swirl", 1, 100, 0, mass, reach);
  expect(whirl.x).toBeLessThan(0);
  expect(Math.abs(whirl.y)).toBeGreaterThan(Math.abs(whirl.x) * 3);
  // Nothing at the point itself, with no power, or with no field.
  for (const f of [fieldForce("pull", 1, 0, 0, mass, reach), fieldForce("pull", 0, 100, 0, mass, reach), fieldForce("none", 1, 100, 0, mass, reach), fieldForce("pull", 1, 100, 0, mass, 0)]) expect(f).toEqual({ x: 0, y: 0 });
});

test("a spring settles at its target; a fall bounces lower each time and rests; a pendulum swings back and slows", () => {
  const s = { x: 0, v: 0 };
  for (let i = 0; i < 240; i++) springStep(s, 30, 170, 15, 1, 1 / 60);
  expect(springRests(s, 30, 0.1)).toBe(true);

  const f = { x: 300, v: 0 };
  const hits: number[] = [];
  for (let i = 0; i < 600; i++) { const { hit } = fallStep(f, 2600, 0.45, 1 / 120); if (hit) hits.push(hit); }
  expect(hits.length).toBeGreaterThan(2);
  expect(hits[1]).toBeLessThan(hits[0]);
  expect(f).toEqual({ x: 0, v: 0 });

  const p = { x: 0.6, v: 0 };
  let crossed = false;
  for (let i = 0; i < 120; i++) { pendulumStep(p, 200, 2400, 0.9, 1 / 60); if (p.x < 0) crossed = true; }
  expect(crossed).toBe(true);
  for (let i = 0; i < 2000; i++) pendulumStep(p, 200, 2400, 0.9, 1 / 60);
  expect(Math.abs(p.x)).toBeLessThan(0.01);
});

test("baking: the moments that matter (16 at most), a fall's moments speeding up, the last at 100 %", () => {
  // A drop: 300 px above, falling to its place, bouncing once.
  const s: Sample[] = [];
  const f = { x: 300, v: 0 };
  for (let i = 0; i <= 180; i++) {
    if (i % 2 === 0) s.push({ t: i / 60, x: 0, y: -f.x, a: 0 });
    fallStep(f, 2600, 0.4, 1 / 60);
  }
  const kept = keepSamples(s, 16);
  expect(kept.length).toBeLessThanOrEqual(16);
  expect(kept[0]).toBe(0);
  expect(kept[kept.length - 1]).toBe(s.length - 1);
  const frames = bakeFrames(s);
  expect(frames[0]).toMatchObject({ at: 0, y: -300 });
  expect(frames[frames.length - 1].at).toBe(100);
  expect(frames.every((fr, i) => i === 0 || fr.at > frames[i - 1].at)).toBe(true);
  // The first stretch falls faster and faster.
  expect(frames[1].ease).toBe("fall");
  expect(fitEase([{ t: 0, x: 0, y: 0, a: 0 }, { t: 0.5, x: 0, y: 75, a: 0 }, { t: 1, x: 0, y: 100, a: 0 }], 0, 2)).toBe("smooth");
  // The same randomness every time.
  const r1 = seeded(7), r2 = seeded(7);
  expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
});

test("the page: physics in the motion, the transform's own physics values, a world's bodies turned, needing the runtime", () => {
  const tree: PageTree = {
    version: 1,
    root: { id: "page", type: "page", props: {}, children: [
      { id: "w", type: "section", props: { world: { start: "drop" } }, children: [{ id: "b1", type: "heading", props: { text: { en: "Hi" } } }] },
      { id: "s", type: "section", props: {}, children: [{ id: "p1", type: "button", props: {}, motion: { physics: { kind: "magnet" } } }] },
    ] },
  };
  expect(motionOf(tree.root.children![1].children![0])?.physics).toEqual({ kind: "magnet" });
  expect(TREE_TRANSFORM).toContain("var(--pt-qx,0px)");
  expect(TREE_TRANSFORM).toContain("var(--pt-qrz,0deg)");
  expect(TREE_TRANSFORM_REST).toContain("--pt-qsy:1");
  expect(treeNeeds(tree).physics).toBe(true);
  const css = treeCss(tree);
  expect(css).toMatch(/\.pt-b1[,{]/);
  // Baked: the page needs no physics at all.
  const baked: PageTree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "w", type: "section", props: { world: { baked: true } }, children: [] }] } };
  expect(treeNeeds(baked).physics).toBe(false);
  // Speed styles only on a page that has speed marks.
  expect(css).not.toContain("data-perf-away");
  expect(treeCss({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "l", type: "heading", props: {}, motion: { loop: { kind: "float" } } }] } })).toContain("data-perf-away");
});
