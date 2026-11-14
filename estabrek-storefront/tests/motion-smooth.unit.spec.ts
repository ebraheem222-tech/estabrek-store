import { expect, test } from "@playwright/test";
import { keyGlide, keySteps, keysSpecOf, type KeyFrameSpec } from "../src/pageTree/keyframes";
import { glideTrack } from "../src/pageTree/spline";

// Smooth keyframes (pageTree/spline.ts, keyframes.ts keyGlide): the element passes through each moment's place at
// its time, along one curve whose speed never jumps at a moment, starting and ending at rest.

/** The speed at `t`, measured over a small step. */
const speed = (f: (t: number) => number, t: number, h = 1e-4) => (f(t + h) - f(t - h)) / (2 * h);

test("the curve passes through every value at its time, and holds before the first and after the last", () => {
  const f = glideTrack([0, 0.3, 0.7, 1], [0, 80, -20, 50]);
  for (const [t, v] of [[0, 0], [0.3, 80], [0.7, -20], [1, 50]]) expect(f(t)).toBeCloseTo(v, 6);
  expect(f(-1)).toBe(0);
  expect(f(2)).toBe(50);
  expect(glideTrack([], [])(0.5)).toBe(0);
  expect(glideTrack([0.4], [7])(0.9)).toBe(7);
});

test("its speed never jumps at a moment, and it starts and ends at rest", () => {
  const f = glideTrack([0, 0.3, 0.7, 1], [0, 80, -20, 50]);
  // Just before and just after a moment the speed is the same (it changes fast there, so the two looks are taken very close).
  for (const t of [0.3, 0.7]) expect(speed(f, t - 1e-5, 1e-6)).toBeCloseTo(speed(f, t + 1e-5, 1e-6), 0);
  expect(Math.abs(speed(f, 1e-6, 1e-7))).toBeLessThan(0.1);
  expect(Math.abs(speed(f, 1 - 1e-6, 1e-7))).toBeLessThan(0.1);
  // Going straight from one value to the next, the speed would jump at 0.3 from +267 a unit of time to −250.
  expect(Math.abs(speed(f, 0.3))).toBeLessThan(60);
});

test("values in a straight line, evenly spaced, keep to the line between them", () => {
  const f = glideTrack([0, 0.25, 0.5, 0.75, 1], [0, 25, 50, 75, 100]);
  // In the middle stretch it moves evenly; only the two ends ease.
  for (const t of [0.3, 0.4, 0.5, 0.6, 0.7]) expect(f(t)).toBeCloseTo(t * 100, 6);
});

const corner: KeyFrameSpec[] = [{ at: 0, x: 0, y: 0 }, { at: 50, x: 100, y: 0 }, { at: 100, x: 100, y: 100 }];

test("an element glides round a corner of its moments instead of turning on the spot", () => {
  const glide = keyGlide(corner, false)!;
  expect(glide(0)).toEqual({ x: 0, y: 0 });
  expect(glide(0.5)).toEqual({ x: 100, y: 0 });
  expect(glide(1)).toEqual({ x: 100, y: 100 });
  // Before the corner it already swings out a little, and after it it is still carried past: a round turn.
  expect(glide(0.45).y!).toBeLessThan(-2);
  expect(glide(0.55).x!).toBeGreaterThan(102);
  // Across is toward the line's end: mirrored where the page reads from the right.
  expect(keyGlide(corner, true)!(0.5)).toEqual({ x: -100, y: 0 });
});

test("only the places moments name glide; with none there is nothing to glide", () => {
  expect(keyGlide([{ at: 0, y: 0 }, { at: 100, y: 40 }], false)!(1)).toEqual({ y: 40 });
  expect(keyGlide([{ at: 0, opacity: 0 }, { at: 100, opacity: 1 }], false)).toBeNull();
  expect(keyGlide([{ at: 0, x: 0 }], false)).toBeNull();
});

test("smooth steps leave the element's place to the glide and keep the rest", () => {
  const frames: KeyFrameSpec[] = [{ at: 0, x: 0, y: 0, opacity: 0 }, { at: 100, x: 50, y: 20, opacity: 1 }];
  const env = { self: true, rtl: false, resolve: (c: string) => c };
  const usual = keySteps(frames, env);
  expect(usual[1].vars).toMatchObject({ "--pt-kx": "50px", "--pt-ky": "20px", opacity: 1 });
  const smooth = keySteps(frames, { ...env, glide: true });
  expect(smooth[1].vars).toEqual({ opacity: 1 });
  expect(keysSpecOf({ on: "view", smooth: true, parts: { self: frames } })?.smooth).toBe(true);
  expect(keysSpecOf({ on: "view", smooth: "yes", parts: { self: frames } })?.smooth).toBeUndefined();
});
