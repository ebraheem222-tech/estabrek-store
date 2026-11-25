import { describe, expect, test } from "vitest";
import { PHYSICS, type FlowCtx } from "../../../estabrek-storefront/src/pageTree/glPhysics";
import { formPoints, rng } from "../../../estabrek-storefront/src/pageTree/glShapes";
import { GL_FORMS } from "../../../estabrek-storefront/src/pageTree/glScene";

// The WebGL scene's maths and physics (the shop's pageTree/glPhysics.ts and glShapes.ts), checked as maths: what
// stays bounded stays bounded, what keeps its energy keeps it, a wave spreads and calms, a cloth keeps its threads.
function ctx(n: number, more: Partial<FlowCtx> = {}): FlowCtx {
  return {
    n, p: new Float32Array(n * 3), v: new Float32Array(n * 3), a: new Float32Array(n * 3), age: new Float32Array(n), seed: new Float32Array(n).map((_, i) => (i * 0.618) % 1),
    rand: rng(7), t: 0, sp: 1, aspect: 2, S: 0.95, cx: 0, cy: 0, depth: 0.3, ptr: { on: false, x: 0, y: 0 }, press: null, mem: {}, ...more,
  };
}
const run = (name: keyof typeof PHYSICS, c: FlowCtx, steps: number) => {
  const f = PHYSICS[name]!;
  f.start(c);
  for (let i = 0; i < steps; i++) { c.t += 1 / 60; f.step(c); }
  return f;
};

describe("strange attractors", () => {
  test.each(["lorenz", "aizawa", "thomas"] as const)("%s: every particle stays on the attractor, within the box, and keeps moving", (name) => {
    const c = ctx(400);
    const f = run(name, c, 600);
    const out = new Float32Array(3);
    let moved = 0;
    const before = Float32Array.from(c.a);
    f.step(c);
    for (let i = 0; i < c.n; i++) {
      f.place!(c, i, out);
      for (const x of out) { expect(Number.isFinite(x)).toBe(true); expect(Math.abs(x)).toBeLessThan(1.6); }
      if (Math.abs(c.a[i * 3] - before[i * 3]) + Math.abs(c.a[i * 3 + 1] - before[i * 3 + 1]) > 1e-6) moved++;
    }
    expect(moved).toBe(c.n);
  });
});

describe("double pendulums", () => {
  test("Runge–Kutta keeps a pendulum's energy, and pendulums a hair apart part ways (chaos)", () => {
    const c = ctx(60);
    const energy = (i: number) => {
      // Two unit arms, unit weights, g = 9.81: kinetic plus potential (the usual formulas).
      const t1 = c.a[i * 3], t2 = c.a[i * 3 + 1], w1 = c.v[i * 3], w2 = c.v[i * 3 + 1];
      const T = w1 * w1 + 0.5 * w2 * w2 + w1 * w2 * Math.cos(t1 - t2);
      const V = -9.81 * (2 * Math.cos(t1) + Math.cos(t2));
      return T + V;
    };
    const f = PHYSICS.pendulum!;
    f.start(c);
    const e0 = energy(0);
    const tipsApart = () => Math.hypot(c.p[0] - c.p[59 * 3], c.p[1] - c.p[59 * 3 + 1]);
    f.step(c);
    expect(tipsApart()).toBeLessThan(0.01);
    for (let i = 0; i < 1800; i++) { c.t += 1 / 60; f.step(c); }
    expect(Math.abs(energy(0) - e0) / Math.abs(e0)).toBeLessThan(0.01);
    expect(tipsApart()).toBeGreaterThan(0.1);
  });
});

describe("a pond", () => {
  test("a drop sends a ring outwards, then the water calms", () => {
    const c = ctx(1600);
    const f = PHYSICS.pond!;
    f.start(c);
    // No rain: only the press.
    c.rand = () => 0.99;
    c.press = { x: 0, y: 0 };
    f.step(c);
    c.press = null;
    const P = c.mem.pond as { gw: number; gh: number; h: Float32Array };
    const mid = Math.floor(P.gh / 2) * P.gw + Math.floor(P.gw / 2), side = mid + 8;
    expect(Math.abs(P.h[mid])).toBeGreaterThan(0.05);
    expect(Math.abs(P.h[side])).toBeLessThan(1e-6);
    for (let i = 0; i < 20; i++) f.step(c);
    expect(Math.abs(P.h[side])).toBeGreaterThan(1e-4);
    for (let i = 0; i < 1500; i++) f.step(c);
    expect(Math.max(...Array.from(P.h).map(Math.abs))).toBeLessThan(0.01);
  });
});

describe("cloth", () => {
  test("its top edge stays where it hangs, a push moves it, and its threads keep their length", () => {
    const c = ctx(600);
    const f = run("cloth", c, 300);
    const { cols, rows, rest } = c.mem.cloth as { cols: number; rows: number; rest: number };
    const top = Array.from(c.p.slice(0, cols * 3));
    // A push (as the pointer gives one) on the middle of it.
    const m = (Math.floor(rows / 2) * cols + Math.floor(cols / 2)) * 3;
    c.p[m] += 0.2;
    for (let i = 0; i < 120; i++) { c.t += 1 / 60; f.step(c); }
    expect(Array.from(c.p.slice(0, cols * 3))).toEqual(top);
    let worst = 0;
    for (let r = 1; r < rows; r++) for (let k = 0; k < cols - 1; k++) {
      const i = (r * cols + k) * 3, j = i + 3;
      worst = Math.max(worst, Math.abs(Math.hypot(c.p[j] - c.p[i], c.p[j + 1] - c.p[i + 1], c.p[j + 2] - c.p[i + 2]) - rest) / rest);
    }
    expect(worst).toBeLessThan(0.25);
  });
});

describe("a flock and gravity", () => {
  test("birds keep within their speeds and shy from the pointer; bodies in orbit stay bounded", () => {
    const c = ctx(500, { ptr: { on: true, x: 0, y: 0 } });
    run("flock", c, 400);
    let near = 0;
    for (let i = 0; i < c.n; i++) {
      const s = Math.hypot(c.v[i * 3], c.v[i * 3 + 1]);
      expect(s).toBeGreaterThan(0.0039);
      expect(s).toBeLessThan(0.0111);
      if (Math.hypot(c.p[i * 3], c.p[i * 3 + 1]) < 0.15) near++;
    }
    expect(near).toBeLessThan(c.n * 0.02);
    const g = ctx(800);
    run("gravity", g, 900);
    for (let i = 0; i < g.n * 3; i++) expect(Number.isFinite(g.p[i])).toBe(true);
  });
  test("field lines leave the positive charges and end at the negative ones", () => {
    const c = ctx(300);
    run("charge", c, 900);
    for (let i = 0; i < c.n; i++) expect(Math.abs(c.p[i * 3])).toBeLessThan(2.3);
  });
});

describe("the maths forms", () => {
  test("every form gives every point, finite and (all but a few of a cloud's) within the unit space", () => {
    for (const form of GL_FORMS) {
      if (form === "text" || form === "image") continue;
      const pts = formPoints(form, 3000, rng(3));
      let max = 0, out = 0;
      for (const x of pts) { expect(Number.isFinite(x), form).toBe(true); max = Math.max(max, Math.abs(x)); if (Math.abs(x) > 1.3) out++; }
      // A cloud is a Gaussian: a few of its points rightly fall far out.
      expect(out / pts.length, form).toBeLessThan(0.005);
      expect(max, form).toBeGreaterThan(0.3);
    }
  });
  test("the gyroid's points lie on its surface, and the Sierpiński pyramid has its holes", () => {
    const g = formPoints("gyroid", 2000, rng(5));
    for (let i = 0; i < 2000; i++) {
      const [x, y, z] = [g[i * 3], g[i * 3 + 1], g[i * 3 + 2]].map((v) => (v / 0.9) * Math.PI);
      expect(Math.abs(Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x))).toBeLessThan(0.1);
    }
    // The pyramid's middle (the octahedron left out at the first step) holds no point.
    const s = formPoints("sierpinski", 4000, rng(9));
    let inside = 0;
    for (let i = 0; i < 4000; i++) if (Math.abs(s[i * 3]) + Math.abs(s[i * 3 + 1]) + Math.abs(s[i * 3 + 2]) < 0.5) inside++;
    expect(inside).toBe(0);
  });
});
