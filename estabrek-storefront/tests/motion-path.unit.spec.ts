import { expect, test } from "@playwright/test";
import { keysSpecOf } from "../src/pageTree/keyframes";
import { pathD, pathOf, pathShape, pathTrack, type PathSpec } from "../src/pageTree/motionPath";

// Motion along a path (pageTree/motionPath.ts): the shapes by their equations, where the element stands from its
// own place at each moment, and how it turns with the curve.

const near = (a: { x: number; y: number }, x: number, y: number, by = 0.01) => {
  expect(a.x).toBeCloseTo(x, -Math.log10(by));
  expect(a.y).toBeCloseTo(y, -Math.log10(by));
};

test("a path is a known shape with its size in range, and nothing else", () => {
  expect(pathOf({ kind: "arc", w: 160, h: 60 })).toEqual({ kind: "arc", w: 160, h: 60 });
  expect(pathOf({ kind: "wave", w: 300, h: -40, turns: 2.5, rest: "start", turn: true })).toEqual({ kind: "wave", w: 300, h: -40, turns: 2.5, rest: "start", turn: true });
  // What isn't known is left out; a shape or a size that isn't right gives no path.
  expect(pathOf({ kind: "arc", w: 160, h: 60, turns: 99, rest: "middle", turn: "yes" })).toEqual({ kind: "arc", w: 160, h: 60 });
  for (const bad of [null, "arc", { kind: "square", w: 1, h: 1 }, { kind: "arc", w: 5000, h: 1 }, { kind: "arc", w: 100 }, { kind: "arc", w: "100", h: 5 }]) expect(pathOf(bad), JSON.stringify(bad)).toBeUndefined();
});

test("an arc arrives at the element's own place, rising to its height on the way", () => {
  const arc = pathTrack({ kind: "arc", w: 200, h: 100 });
  near(arc(0), -200, 0);
  near(arc(0.5), -100, -100);
  near(arc(1), 0, 0);
  // Its place at the path's start: it leaves instead.
  const leaves = pathTrack({ kind: "arc", w: 200, h: 100, rest: "start" });
  near(leaves(0), 0, 0);
  near(leaves(1), 200, 0);
  // Across is toward the line's end: mirrored in a right-to-left page.
  near(pathTrack({ kind: "arc", w: 200, h: 100 }, true)(0), 200, 0);
  // A minus height goes downward.
  near(pathTrack({ kind: "arc", w: 200, h: -100 })(0.5), -100, 100);
});

test("each shape follows its equation", () => {
  const at = (p: PathSpec, t: number) => pathShape(p, t);
  near(at({ kind: "wave", w: 400, h: 50, turns: 2 }, 0.125), 50, -50);
  near(at({ kind: "wave", w: 400, h: 50, turns: 2 }, 0.375), 150, 50);
  near(at({ kind: "s", w: 100, h: 80 }, 0.5), 50, -40);
  near(at({ kind: "s", w: 100, h: 80 }, 1), 100, -80);
  near(at({ kind: "zigzag", w: 300, h: 40, turns: 3 }, 1 / 6), 50, -40);
  near(at({ kind: "zigzag", w: 300, h: 40, turns: 3 }, 1 / 3), 100, 0);
  // A loop and a figure of eight end where they began.
  for (const kind of ["loop", "eight"] as const) {
    near(at({ kind, w: 120, h: 80 }, 0), 0, 0);
    near(at({ kind, w: 120, h: 80 }, 1), 0, 0);
  }
  near(at({ kind: "loop", w: 120, h: 80 }, 0.25), 60, -40);
  near(at({ kind: "loop", w: 120, h: 80 }, 0.5), 0, -80);
  near(at({ kind: "eight", w: 120, h: 80 }, 0.125), 60 * Math.SQRT1_2, -40);
  // A spiral starts half its width away and closes in on its place.
  const spiral = pathTrack({ kind: "spiral", w: 200, h: 200, turns: 2 });
  near(spiral(0), 100, 0);
  near(spiral(1), 0, 0);
  expect(Math.hypot(spiral(0.5).x, spiral(0.5).y)).toBeCloseTo(50, 1);
  // One that leaves its place runs outward.
  const out = pathTrack({ kind: "spiral", w: 200, h: 200, turns: 2, rest: "start" });
  near(out(0), 0, 0);
  near(out(1), 100, 0);
});

test("it turns with the curve only when asked, upright at its own place and never jumping round", () => {
  const still = pathTrack({ kind: "arc", w: 200, h: 100 });
  for (const t of [0, 0.3, 0.7, 1]) expect(still(t).angle).toBe(0);

  const turning = pathTrack({ kind: "arc", w: 200, h: 100, turn: true });
  expect(turning(1).angle).toBeCloseTo(0, 5);
  // It climbs at first and comes down at the end: about 57° each side of level, so 115° from start to end.
  expect(turning(0).angle).toBeGreaterThan(-120);
  expect(turning(0).angle).toBeLessThan(-108);
  expect(turning(0.5).angle).toBeCloseTo(turning(0).angle / 2, 0);

  // Round a loop it turns a whole turn, a little at a time.
  const loop = pathTrack({ kind: "loop", w: 120, h: 120, turn: true });
  const angles = Array.from({ length: 101 }, (_, i) => loop(i / 100).angle);
  for (let i = 1; i < angles.length; i++) expect(Math.abs(angles[i] - angles[i - 1])).toBeLessThan(15);
  expect(Math.abs(angles[100] - angles[0])).toBeGreaterThan(340);
  expect(Math.abs(angles[100] - angles[0])).toBeLessThan(380);
});

test("the curve is drawn for the editor, and keyframes keep their path", () => {
  const d = pathD({ kind: "arc", w: 200, h: 100 });
  expect(d.startsWith("M-200 0")).toBe(true);
  expect(d.match(/L/g)).toHaveLength(64);
  expect(d.endsWith("L0 0")).toBe(true);

  const frames = { self: [{ at: 0 }, { at: 100 }] };
  expect(keysSpecOf({ on: "view", parts: frames, path: { kind: "eight", w: 80, h: 40, turn: true } })?.path).toEqual({ kind: "eight", w: 80, h: 40, turn: true });
  expect(keysSpecOf({ on: "view", parts: frames, path: { kind: "square", w: 80, h: 40 } })?.path).toBeUndefined();
  expect(keysSpecOf({ on: "view", parts: frames })?.path).toBeUndefined();
});
