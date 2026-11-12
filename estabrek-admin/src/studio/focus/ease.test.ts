import { expect, test } from "vitest";
import { bezierFn, cssLinear, easeFn, readEase, springFn, writeEase, NAMED_EASES } from "../../../../shared/ease";

test("curves are read from text and written back; anything else is refused", () => {
  expect(readEase("power2.out")).toEqual({ kind: "named", name: "power2.out" });
  expect(readEase("cubic-bezier(0.2, 0.8, 0.2, 1)")).toEqual({ kind: "bezier", p: [0.2, 0.8, 0.2, 1] });
  expect(writeEase(readEase("cubic-bezier(0.2,0.8,0.2,1)")!)).toBe("cubic-bezier(0.2,0.8,0.2,1)");
  expect(writeEase(readEase("spring(1, 170, 26)")!)).toBe("spring(1,170,26)");
  for (const bad of ["power9.out", "cubic-bezier(1.5,0,0,1)", "cubic-bezier(0,9,0,1)", "spring(0,1,1)", "spring(1,5000,1)", "url(x)", 3, "x".repeat(70)]) expect(readEase(bad)).toBeNull();
  expect(NAMED_EASES).toContain("elastic.inOut");
});

test("a cubic-bezier passes through its ends and matches known values", () => {
  const ease = bezierFn([0.42, 0, 0.58, 1]);
  expect(ease(0)).toBe(0);
  expect(ease(1)).toBe(1);
  expect(ease(0.5)).toBeCloseTo(0.5, 3);
  // CSS "ease" at half its time is about 0.8 of the way.
  expect(bezierFn([0.25, 0.1, 0.25, 1])(0.5)).toBeCloseTo(0.8024, 2);
});

test("a spring starts at rest, overshoots when lightly damped, and has settled at the end", () => {
  const bouncy = springFn(1, 170, 8);
  expect(bouncy(0)).toBe(0);
  expect(bouncy(1)).toBe(1);
  const peak = Math.max(...Array.from({ length: 200 }, (_, i) => bouncy(i / 200)));
  expect(peak).toBeGreaterThan(1.1);
  expect(Math.abs(bouncy(0.97) - 1)).toBeLessThan(0.01);
  // Heavily damped: it never passes the end.
  const slow = springFn(1, 100, 60);
  expect(Math.max(...Array.from({ length: 200 }, (_, i) => slow(i / 200)))).toBeLessThanOrEqual(1.0001);
});

test("named curves behave like GSAP's (out = mirrored in), and any curve bakes into CSS linear()", () => {
  const out = easeFn({ kind: "named", name: "power2.out" });
  expect(out(0.5)).toBeCloseTo(1 - Math.pow(0.5, 3), 6);
  expect(easeFn({ kind: "named", name: "bounce.out" })(1)).toBeCloseTo(1, 6);
  const css = cssLinear({ kind: "spring", mass: 1, stiffness: 170, damping: 8 }, 10);
  expect(css).toMatch(/^linear\(0, .+, 1\)$/);
  expect(css.split(",")).toHaveLength(11);
  expect(cssLinear({ kind: "bezier", p: [0.2, 0.8, 0.2, 1] })).toBe("cubic-bezier(0.2,0.8,0.2,1)");
});
