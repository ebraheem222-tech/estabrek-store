import { expect, test } from "@playwright/test";
import { cornerProfile, formFlows, formKeyframes, formPath, formPoints, formPolygon, parseFn, safeForm } from "../../shared/shapeForm";

// Shapes by equations (shared/shapeForm.ts): corners and edges each their own, a whole shape, a typed y = f(x) read
// safely, and the outline as a CSS polygon whose corners keep their px on any box.

test("typed equations are read safely: numbers, x, functions; anything else is refused", () => {
  const f = parseFn("0.5 + 0.5*sin(x*PI*2)")!;
  expect(f({ x: 0.25 })).toBeCloseTo(1, 5);
  expect(parseFn("x^2")!({ x: 3 })).toBe(9);
  expect(parseFn("max(x, 1 - x)")!({ x: 0.2 })).toBeCloseTo(0.8);
  for (const bad of ["alert(1)", "x.constructor", "window", "x +", "1/(", "constructor", "constructor(1)+1", "toString+1", "hasOwnProperty(1)", "this", "a".repeat(130)]) expect(parseFn(bad)).toBeNull();
  // Polar curves read a (the angle) and t (time).
  expect(parseFn("1 + 0.2*cos(6*a)", ["a", "t"])!({ a: 0, t: 0 })).toBeCloseTo(1.2);
});

test("a saved shape is read again: known kinds and numbers in range, square corners and straight edges dropped", () => {
  expect(safeForm({ corners: { tl: { kind: "round", size: 30 }, tr: { kind: "square" }, br: { kind: "fly" } }, edges: { bottom: { kind: "wave", depth: 12, count: 5 }, top: { kind: "straight" } } }))
    .toEqual({ corners: { tl: { kind: "round", size: 30 } }, edges: { bottom: { kind: "wave", depth: 12, count: 5 } } });
  expect(safeForm({ edges: { top: { kind: "fn", fn: "alert(1)" } } })).toBeNull();
  expect(safeForm({ whole: { kind: "polygon", n: 5, inner: 0.5 } })).toEqual({ whole: { kind: "polygon", n: 5, inner: 0.5 } });
  expect(safeForm({ corners: { tl: { kind: "round", size: 9000 } } })).toEqual({ corners: { tl: { kind: "round" } } });
});

test("corners: each profile runs from the edge before to the edge after; a round one keeps its px on any box", () => {
  for (const kind of ["round", "squircle", "bevel", "notch", "scoop", "bezier"] as const) {
    const p = cornerProfile({ kind });
    expect(p[0][0]).toBeCloseTo(0);
    expect(p[0][1]).toBeCloseTo(1);
    expect(p[p.length - 1][0]).toBeCloseTo(1);
    expect(p[p.length - 1][1]).toBeCloseTo(0);
  }
  const poly = formPolygon({ corners: { tl: { kind: "bevel", size: 20 } } });
  expect(poly).toBe("polygon(0% 20px,20px 0%,100% 0%,100% 100%,0% 100%)");
  // The top-right corner turned a quarter: it starts on the top edge, 30px from the right.
  expect(formPolygon({ corners: { tr: { kind: "bevel", size: 30 } } })).toContain("calc(100% - 30px) 0%,100% 30px");
  expect(formPath({ corners: { tl: { kind: "bevel", size: 20 } } }, 200, 100)).toBe("M0 20L20 0L200 0L200 100L0 100Z");
});

test("edges: cut in, bulging out from a line set in (its corners with it), waves that flow", () => {
  const cut = formPoints({ edges: { bottom: { kind: "curve", depth: 30 } } });
  // The deepest point of the bottom curve is 30px up from the bottom, in the middle.
  const mid = cut.reduce((a, b) => (b.y === 100 && b.dy < a.dy ? b : a), { x: 0, dx: 0, y: 100, dy: 0 });
  expect(mid.dy).toBeCloseTo(-30, 0);
  const out = formPoints({ edges: { bottom: { kind: "curve", depth: -30 } } });
  // The bottom corners sit 30px up; the bulge's middle reaches the bottom.
  expect(out.find((p) => p.x === 100 && p.y === 100)?.dy).toBe(-30);
  expect(Math.max(...out.filter((p) => p.y === 100).map((p) => p.dy))).toBeCloseTo(0, 0);
  const wave = { edges: { top: { kind: "wave" as const, depth: 10, count: 6, flow: 4 } } };
  expect(formFlows(wave)).toBe(4);
  const kf = formKeyframes(wave, "pt-form-x");
  expect(kf.startsWith("@keyframes pt-form-x{0%{clip-path:polygon(")).toBe(true);
  // Every step has the same number of points, so they glide.
  const counts = [...kf.matchAll(/polygon\(([^)]*\))*[^)]*\)/g)].map((m) => m[0].split(",").length);
  expect(new Set(counts).size).toBe(1);
});

test("whole shapes: a star, a squircle, a blob and a typed polar curve stay inside the box", () => {
  for (const whole of [{ kind: "polygon", n: 5, inner: 0.45 }, { kind: "superellipse", n: 5 }, { kind: "blob", seed: 3, amount: 0.3 }, { kind: "polar", fn: "1 + 0.25*sin(5*a)" }] as const) {
    const pts = formPoints({ whole });
    expect(pts.length).toBeGreaterThan(5);
    expect(pts.every((p) => p.x >= -0.01 && p.x <= 100.01 && p.y >= -0.01 && p.y <= 100.01 && p.dx === 0)).toBe(true);
  }
  expect(formPoints({ whole: { kind: "polygon", n: 5, inner: 0.45 } })).toHaveLength(10);
});
