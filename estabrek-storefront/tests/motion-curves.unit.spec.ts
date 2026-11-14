import { expect, test } from "@playwright/test";
import { easeText, playEase } from "../src/pageTree/motionCurve";
import { staggerOf, staggerSteps } from "../src/pageTree/stagger";
import { EASES, motionOf, type TreeNode } from "../src/pageTree/tree";
import { keysSpecOf } from "../src/pageTree/keyframes";

// A motion's free curve (a GSAP name, a cubic-bezier, a spring) and the order of a stagger, as the shop reads and
// plays them (pageTree/motionCurve.ts, pageTree/stagger.ts).

const NAMES = { smooth: "power2.out", bounce: "bounce.out" };

test("a curve's text passes when it is an own name or a free curve, and nothing else does", () => {
  for (const ok of ["smooth", "fall", "power3.out", "none", "cubic-bezier(0.2,0.8,0.2,1)", "spring(1,120,14)"]) expect(easeText(ok, EASES), ok).toBe(ok);
  expect(easeText("  back.inOut ", EASES)).toBe("back.inOut");
  for (const bad of ["wild", "power9.out", "cubic-bezier(1.4,0,0.2,1)", "spring(0,120,14)", "steps(4)", 5, null, undefined]) expect(easeText(bad, EASES), String(bad)).toBeUndefined();
});

test("an own name plays as its GSAP curve, a named free curve as itself, handles and springs as functions", () => {
  expect(playEase("smooth", NAMES, "power2.out")).toBe("power2.out");
  expect(playEase("bounce", NAMES, "power2.out")).toBe("bounce.out");
  expect(playEase("power4.inOut", NAMES, "power2.out")).toBe("power4.inOut");
  expect(playEase(undefined, NAMES, "none")).toBe("none");
  expect(playEase("wild", NAMES, "power2.out")).toBe("power2.out");

  const handles = playEase("cubic-bezier(0.2,0.8,0.2,1)", NAMES, "none");
  expect(typeof handles).toBe("function");
  const curve = handles as (t: number) => number;
  expect(curve(0)).toBe(0);
  expect(curve(1)).toBe(1);
  // Fast at first: well past the half way mark at a quarter of the time.
  expect(curve(0.25)).toBeGreaterThan(0.6);

  // A loose spring goes past its end and comes back; a stiff, well damped one doesn't.
  const samples = (f: (t: number) => number) => Array.from({ length: 101 }, (_, i) => f(i / 100));
  const loose = samples(playEase("spring(1,100,4)", NAMES, "none") as (t: number) => number);
  expect(Math.max(...loose)).toBeGreaterThan(1.1);
  expect(loose[100]).toBeCloseTo(1, 2);
  const calm = samples(playEase("spring(1,100,40)", NAMES, "none") as (t: number) => number);
  expect(Math.max(...calm)).toBeLessThanOrEqual(1.001);
});

test("a stagger's steps follow its order", () => {
  expect(staggerSteps(5)).toEqual([0, 1, 2, 3, 4]);
  expect(staggerSteps(5, "first")).toEqual([0, 1, 2, 3, 4]);
  expect(staggerSteps(5, "last")).toEqual([4, 3, 2, 1, 0]);
  // The middle one first; with an even count the middle two start together.
  expect(staggerSteps(5, "center")).toEqual([2, 1, 0, 1, 2]);
  expect(staggerSteps(4, "center")).toEqual([1, 0, 0, 1]);
  // The two ends first.
  expect(staggerSteps(5, "edges")).toEqual([0, 1, 2, 1, 0]);
  expect(staggerSteps(4, "edges")).toEqual([0, 1, 1, 0]);
  expect(staggerSteps(1, "center")).toEqual([0]);
  expect(staggerSteps(0, "random")).toEqual([]);

  // Mixed: every one a step of its own, not in a row, and the same every time.
  const mixed = staggerSteps(8, "random");
  expect([...mixed].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(mixed).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(staggerSteps(8, "random")).toEqual(mixed);
});

test("the usual order stays a number of seconds; another order gives each thing its own wait", () => {
  expect(staggerOf(0.1, undefined)).toBe(0.1);
  expect(staggerOf(0.1, "first")).toBe(0.1);
  expect(staggerOf(0, "last")).toBe(0);
  const last = staggerOf(0.1, "last") as (i: number, t: unknown, list: ArrayLike<unknown>) => number;
  const list = { length: 3 };
  expect([0, 1, 2].map((i) => last(i, null, list))).toEqual([0.2, 0.1, 0]);
  const center = staggerOf(0.5, "center") as (i: number, t: unknown, list: ArrayLike<unknown>) => number;
  expect([0, 1, 2, 3].map((i) => center(i, null, { length: 4 }))).toEqual([0.5, 0, 0, 0.5]);
});

test("an element's entrance keeps a free curve and its order, and drops what isn't one", () => {
  const node = (enter: Record<string, unknown>) => ({ id: "n", type: "stack", props: {}, motion: { enter: { kind: "up", ...enter } } }) as unknown as TreeNode;
  expect(motionOf(node({ ease: "spring(1,120,14)", stagger: 0.1, order: "center" }))?.enter).toMatchObject({ kind: "up", ease: "spring(1,120,14)", stagger: 0.1, order: "center" });
  expect(motionOf(node({ ease: "strong", order: "random" }))?.enter).toMatchObject({ ease: "strong", order: "random" });
  const dropped = motionOf(node({ ease: "wild", order: "spiral" }))?.enter;
  expect(dropped?.ease).toBeUndefined();
  expect(dropped?.order).toBeUndefined();
});

test("keyframes keep a free curve for the whole animation and for one moment", () => {
  const spec = keysSpecOf({ on: "view", ease: "spring(1,90,8)", parts: { self: [{ at: 0, opacity: 0 }, { at: 100, opacity: 1, ease: "cubic-bezier(0.6,0,0.4,1)" }] } });
  expect(spec?.ease).toBe("spring(1,90,8)");
  expect(spec?.parts.self?.[1].ease).toBe("cubic-bezier(0.6,0,0.4,1)");
  expect(keysSpecOf({ on: "view", ease: "wild", parts: { self: [{ at: 0, opacity: 0 }, { at: 100, opacity: 1 }] } })?.ease).toBeUndefined();
});
