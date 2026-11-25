/**
 * The WebGL scene's flows that follow real maths and physics (glScene.ts GL_FLOWS), each worked out here a 60th of a
 * second at a time on the particles' own numbers:
 * - strange attractors: Lorenz's butterfly, Aizawa's apple and Thomas's cyclic one, each particle a point flowing
 *   along the attractor (Runge–Kutta, second order);
 * - a flock (boids: keep apart, fly the same way, stay together; it shies from the pointer), found through a grid;
 * - gravity: three suns turning round each other, particles in orbit, flung out or swallowed (and the pointer a sun);
 * - double pendulums started a hair apart (chaos: they part ways), fourth-order Runge–Kutta;
 * - electric field lines: particles leave the positive charges and run along the field to the negative ones;
 * - cloth: a Verlet sheet hung from its top edge, in gravity and wind, that the pointer pushes;
 * - a pond: the wave equation on a grid, rippled by the pointer, a press and a little rain.
 * Plain maths on typed arrays (no WebGL, no DOM): glEngine.ts calls it.
 */
import { gauss, type Rand } from "./glShapes";
import type { GlFlow } from "./glScene";

/** What a flow reads and writes in one step. Positions are the scene's units (the box is 2 high, `aspect` wide). */
export type FlowCtx = {
  n: number;
  p: Float32Array;
  v: Float32Array;
  a: Float32Array;
  age: Float32Array;
  seed: Float32Array;
  rand: Rand;
  t: number;
  sp: number;
  aspect: number;
  /** The layer's size in the box (its scale, fitted), where its middle is, and its depth. */
  S: number;
  cx: number;
  cy: number;
  depth: number;
  /** The pointer at the scene's middle depth, and a press this step. */
  ptr: { on: boolean; x: number; y: number };
  press: { x: number; y: number } | null;
  /** The flow's own memory (grids, suns…). */
  mem: Record<string, unknown>;
};
export type PhysicsFlow = {
  /** The most particles it moves. */
  cap: number;
  /** Its places are its own numbers turned with the camera (place gives them). */
  turning?: boolean;
  /** What the shared pointer and press do to it: move it, add to its speed, or nothing (it answers them itself). */
  hands: "push" | "speed" | "none";
  start(c: FlowCtx): void;
  step(c: FlowCtx): void;
  place?(c: FlowCtx, i: number, out: Float32Array): void;
  /** A particle's size and light, times the layer's. */
  look?(c: FlowCtx, i: number): [number, number];
};

/* ----------------------------------------------------------- attractors */

type Deriv = (x: number, y: number, z: number, out: Float32Array) => void;
function attractor(d: Deriv, dt: number, start: [number, number, number], centre: [number, number, number], scale: number, axes: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2]): PhysicsFlow {
  const k1 = new Float32Array(3), k2 = new Float32Array(3);
  const advance = (a: Float32Array, j: number, h: number) => {
    const x = a[j], y = a[j + 1], z = a[j + 2];
    d(x, y, z, k1);
    d(x + k1[0] * h * 0.5, y + k1[1] * h * 0.5, z + k1[2] * h * 0.5, k2);
    a[j] = x + k2[0] * h;
    a[j + 1] = y + k2[1] * h;
    a[j + 2] = z + k2[2] * h;
  };
  return {
    cap: 30000,
    turning: true,
    hands: "none",
    start(c) {
      // One long path, the particles spread along it (each a little off it), so it shows whole at once.
      const s = new Float32Array(start);
      for (let i = 0; i < 1500; i++) advance(s, 0, dt);
      for (let i = 0; i < c.n; i++) {
        for (let k = 0; k < 4; k++) advance(s, 0, dt);
        const j = i * 3;
        c.a[j] = s[0] + gauss(c.rand) * 0.02;
        c.a[j + 1] = s[1] + gauss(c.rand) * 0.02;
        c.a[j + 2] = s[2] + gauss(c.rand) * 0.02;
      }
    },
    step(c) {
      const h = dt * Math.max(0.05, c.sp);
      for (let i = 0; i < c.n; i++) {
        advance(c.a, i * 3, h);
        // One that wandered off (rounding at a high speed) starts again on the path.
        if (!Number.isFinite(c.a[i * 3]) || Math.abs(c.a[i * 3] - centre[0]) > 200) {
          const o = ((i * 7919) % c.n) * 3;
          c.a[i * 3] = c.a[o] || start[0];
          c.a[i * 3 + 1] = c.a[o + 1] || start[1];
          c.a[i * 3 + 2] = c.a[o + 2] || start[2];
        }
      }
    },
    place(c, i, out) {
      const j = i * 3, k = scale * c.S;
      out[0] = (c.a[j + axes[0]] - centre[axes[0]]) * k;
      out[1] = (c.a[j + axes[1]] - centre[axes[1]]) * k;
      out[2] = (c.a[j + axes[2]] - centre[axes[2]]) * k;
    },
  };
}
const lorenz = attractor((x, y, z, o) => { o[0] = 10 * (y - x); o[1] = x * (28 - z) - y; o[2] = x * y - (8 / 3) * z; }, 0.0045, [0.1, 0, 20], [0, 0, 25], 1 / 24, [0, 2, 1]);
const aizawa = attractor((x, y, z, o) => {
  o[0] = (z - 0.7) * x - 3.5 * y;
  o[1] = 3.5 * x + (z - 0.7) * y;
  o[2] = 0.6 + 0.95 * z - (z * z * z) / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x * x * x;
}, 0.012, [0.1, 0, 0], [0, 0, 0.6], 0.62, [0, 2, 1]);
const thomas = attractor((x, y, z, o) => { o[0] = Math.sin(y) - 0.208186 * x; o[1] = Math.sin(z) - 0.208186 * y; o[2] = Math.sin(x) - 0.208186 * z; }, 0.06, [1.1, 1.1, -0.01], [0, 0, 0], 0.23, [0, 1, 2]);

/* ----------------------------------------------------------- a flock */

const flock: PhysicsFlow = {
  cap: 2500,
  hands: "speed",
  start(c) {
    for (let i = 0; i < c.n; i++) {
      const j = i * 3, a = c.rand() * Math.PI * 2;
      c.p[j] = c.cx + (c.rand() * 2 - 1) * c.aspect * c.S;
      c.p[j + 1] = c.cy + (c.rand() * 2 - 1) * 0.85 * c.S;
      c.p[j + 2] = (c.rand() * 2 - 1) * c.depth * 0.3;
      c.v[j] = Math.cos(a) * 0.006;
      c.v[j + 1] = Math.sin(a) * 0.006;
    }
  },
  step(c) {
    const R = 0.11, cell = new Map<number, number[]>();
    const key = (x: number, y: number) => (Math.floor(x / R) + 512) * 4096 + (Math.floor(y / R) + 512);
    for (let i = 0; i < c.n; i++) {
      const k = key(c.p[i * 3], c.p[i * 3 + 1]);
      const list = cell.get(k);
      if (list) list.push(i);
      else cell.set(k, [i]);
    }
    const W = c.aspect * c.S * 0.98, H = 0.92 * c.S, top = 0.011 * Math.max(0.3, c.sp), low = 0.004 * Math.max(0.3, c.sp);
    for (let i = 0; i < c.n; i++) {
      const j = i * 3, x = c.p[j], y = c.p[j + 1];
      let sx = 0, sy = 0, ax = 0, ay = 0, mx = 0, my = 0, m = 0;
      const gx = Math.floor(x / R), gy = Math.floor(y / R);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const list = cell.get((gx + dx + 512) * 4096 + (gy + dy + 512));
          if (!list) continue;
          for (const o of list) {
            if (o === i) continue;
            const ox = c.p[o * 3] - x, oy = c.p[o * 3 + 1] - y, d2 = ox * ox + oy * oy;
            if (d2 > R * R) continue;
            if (d2 < 0.0018) { sx -= ox / (d2 + 1e-5); sy -= oy / (d2 + 1e-5); }
            ax += c.v[o * 3]; ay += c.v[o * 3 + 1];
            mx += ox; my += oy; m++;
          }
        }
      }
      let vx = c.v[j], vy = c.v[j + 1];
      vx += sx * 0.000012; vy += sy * 0.000012;
      if (m) {
        vx += (ax / m - vx) * 0.045; vy += (ay / m - vy) * 0.045;
        vx += (mx / m) * 0.0009; vy += (my / m) * 0.0009;
      }
      // The walls turn them round softly; the pointer is a hawk.
      if (x < c.cx - W) vx += 0.0005; else if (x > c.cx + W) vx -= 0.0005;
      if (y < c.cy - H) vy += 0.0005; else if (y > c.cy + H) vy -= 0.0005;
      if (c.ptr.on) {
        const hx = x - c.ptr.x, hy = y - c.ptr.y, d = Math.hypot(hx, hy);
        if (d < 0.32 && d > 1e-4) { vx += (hx / d) * 0.0011; vy += (hy / d) * 0.0011; }
      }
      const s = Math.hypot(vx, vy) || 1e-6, k = s > top ? top / s : s < low ? low / s : 1;
      c.v[j] = vx * k;
      c.v[j + 1] = vy * k;
    }
    for (let i = 0; i < c.n * 3; i += 3) { c.p[i] += c.v[i]; c.p[i + 1] += c.v[i + 1]; }
  },
};

/* ----------------------------------------------------------- gravity */

const SUNS = 3;
const gravity: PhysicsFlow = {
  cap: 12000,
  hands: "none",
  start(c) {
    const suns = new Float32Array(SUNS * 2);
    c.mem.suns = suns;
    sunsAt(c, suns);
    for (let i = 0; i < c.n; i++) orbitAround(c, i, suns, i < SUNS ? -1 : Math.floor(c.rand() * SUNS));
  },
  step(c) {
    const suns = c.mem.suns as Float32Array;
    sunsAt(c, suns);
    const GM = 1.2e-5 * Math.max(0.3, c.sp) ** 2 * c.S, soft = 0.0005;
    for (let sub = 0; sub < 2; sub++) {
      for (let i = SUNS; i < c.n; i++) {
        const j = i * 3;
        let ax = 0, ay = 0;
        for (let k = 0; k < SUNS + (c.ptr.on ? 1 : 0); k++) {
          const sx = k < SUNS ? suns[k * 2] : c.ptr.x, sy = k < SUNS ? suns[k * 2 + 1] : c.ptr.y;
          const dx = sx - c.p[j], dy = sy - c.p[j + 1], d2 = dx * dx + dy * dy + soft, f = (GM * (k < SUNS ? 1 : 1.6)) / (d2 * Math.sqrt(d2));
          ax += dx * f; ay += dy * f;
        }
        c.v[j] += ax * 0.5; c.v[j + 1] += ay * 0.5;
        c.p[j] += c.v[j] * 0.5; c.p[j + 1] += c.v[j + 1] * 0.5;
      }
    }
    for (let i = 0; i < c.n; i++) {
      const j = i * 3;
      if (i < SUNS) { c.p[j] = suns[i * 2]; c.p[j + 1] = suns[i * 2 + 1]; continue; }
      // Flung far away or fallen into a sun: a new orbit.
      let near = false;
      for (let k = 0; k < SUNS; k++) if (Math.hypot(suns[k * 2] - c.p[j], suns[k * 2 + 1] - c.p[j + 1]) < 0.012 * c.S) near = true;
      if (near || Math.abs(c.p[j] - c.cx) > c.aspect * 1.6 || Math.abs(c.p[j + 1] - c.cy) > 1.6) orbitAround(c, i, suns, Math.floor(c.rand() * SUNS));
    }
    if (c.press) for (let i = SUNS; i < c.n; i++) { c.v[i * 3] += (c.rand() - 0.5) * 0.01; c.v[i * 3 + 1] += (c.rand() - 0.5) * 0.01; }
  },
  look(_c, i) {
    return i < SUNS ? [6, 1] : [1, 1];
  },
};
function sunsAt(c: FlowCtx, suns: Float32Array) {
  for (let k = 0; k < SUNS; k++) {
    const a = c.t * 0.12 * Math.max(0.3, c.sp) + (k * Math.PI * 2) / SUNS, r = 0.32 * c.S * (1 + 0.25 * Math.sin(c.t * 0.07 + k));
    suns[k * 2] = c.cx + Math.cos(a) * r * Math.max(1, c.aspect * 0.6);
    suns[k * 2 + 1] = c.cy + Math.sin(a) * r;
  }
}
function orbitAround(c: FlowCtx, i: number, suns: Float32Array, k: number) {
  const j = i * 3;
  if (k < 0) { c.p[j] = suns[i * 2]; c.p[j + 1] = suns[i * 2 + 1]; c.v[j] = c.v[j + 1] = 0; return; }
  const r = (0.05 + Math.pow(c.rand(), 0.6) * 0.32) * c.S, a = c.rand() * Math.PI * 2, GM = 1.2e-5 * Math.max(0.3, c.sp) ** 2 * c.S;
  const s = Math.sqrt(GM / r) * (0.9 + c.rand() * 0.2), dir = c.rand() < 0.85 ? 1 : -1;
  c.p[j] = suns[k * 2] + Math.cos(a) * r;
  c.p[j + 1] = suns[k * 2 + 1] + Math.sin(a) * r;
  c.p[j + 2] = (c.rand() - 0.5) * c.depth * 0.2;
  c.v[j] = -Math.sin(a) * s * dir;
  c.v[j + 1] = Math.cos(a) * s * dir;
}

/* ----------------------------------------------------------- double pendulums */

const G_ = 9.81;
/** Two equal arms of equal weights: the angles' speeds and how those change (the usual Lagrangian form). */
function pendulumDeriv(t1: number, t2: number, w1: number, w2: number, o: Float32Array) {
  const d = t1 - t2, sd = Math.sin(d), cd = Math.cos(d), den = 3 - Math.cos(2 * d);
  o[0] = w1;
  o[1] = w2;
  o[2] = (-3 * G_ * Math.sin(t1) - G_ * Math.sin(t1 - 2 * t2) - 2 * sd * (w2 * w2 + w1 * w1 * cd)) / den;
  o[3] = (2 * sd * (2 * w1 * w1 + 2 * G_ * Math.cos(t1) + w2 * w2 * cd)) / den;
}
const pendulum: PhysicsFlow = {
  cap: 4000,
  hands: "none",
  start(c) {
    c.mem.k = [new Float32Array(4), new Float32Array(4), new Float32Array(4), new Float32Array(4)];
    restartPendulums(c);
  },
  step(c) {
    if (c.press) restartPendulums(c);
    const [k1, k2, k3, k4] = c.mem.k as Float32Array[];
    const h = 0.012 * Math.max(0.1, c.sp);
    for (let sub = 0; sub < 2; sub++) {
      for (let i = 0; i < c.n; i++) {
        const j = i * 3, t1 = c.a[j], t2 = c.a[j + 1], w1 = c.v[j], w2 = c.v[j + 1];
        pendulumDeriv(t1, t2, w1, w2, k1);
        pendulumDeriv(t1 + k1[0] * h / 2, t2 + k1[1] * h / 2, w1 + k1[2] * h / 2, w2 + k1[3] * h / 2, k2);
        pendulumDeriv(t1 + k2[0] * h / 2, t2 + k2[1] * h / 2, w1 + k2[2] * h / 2, w2 + k2[3] * h / 2, k3);
        pendulumDeriv(t1 + k3[0] * h, t2 + k3[1] * h, w1 + k3[2] * h, w2 + k3[3] * h, k4);
        c.a[j] = t1 + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        c.a[j + 1] = t2 + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        c.v[j] = w1 + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
        c.v[j + 1] = w2 + (h / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
      }
    }
    const L = 0.4 * c.S, px = c.cx, py = c.cy + 0.12 * c.S;
    for (let i = 0; i < c.n; i++) {
      const j = i * 3;
      c.p[j] = px + L * Math.sin(c.a[j]) + L * Math.sin(c.a[j + 1]);
      c.p[j + 1] = py - L * Math.cos(c.a[j]) - L * Math.cos(c.a[j + 1]);
      c.p[j + 2] = (c.seed[i] - 0.5) * c.depth * 0.2;
    }
  },
};
function restartPendulums(c: FlowCtx) {
  const t1 = 2.1 + c.rand() * 0.4, t2 = 2.4 + c.rand() * 0.4;
  for (let i = 0; i < c.n; i++) {
    // A hair apart: a ten-thousandth of a radian between neighbours, and still they part.
    c.a[i * 3] = t1 + i * 1e-4;
    c.a[i * 3 + 1] = t2;
    c.v[i * 3] = c.v[i * 3 + 1] = 0;
  }
}

/* ----------------------------------------------------------- electric field lines */

const charge: PhysicsFlow = {
  cap: 8000,
  hands: "push",
  start(c) {
    c.mem.q = chargesOf(c);
    for (let i = 0; i < c.n; i++) leaveCharge(c, i, true);
  },
  step(c) {
    const q = chargesOf(c);
    c.mem.q = q;
    const n = q.length / 3, sp = 0.006 * Math.max(0.2, c.sp);
    for (let i = 0; i < c.n; i++) {
      const j = i * 3, x = c.p[j], y = c.p[j + 1];
      let ex = 0, ey = 0, hit = false;
      for (let k = 0; k < n; k++) {
        const dx = x - q[k * 3], dy = y - q[k * 3 + 1], d2 = dx * dx + dy * dy + 1e-4, f = q[k * 3 + 2] / (d2 * Math.sqrt(d2));
        ex += dx * f; ey += dy * f;
        if (q[k * 3 + 2] < 0 && d2 < 0.0009) hit = true;
      }
      const e = Math.hypot(ex, ey) || 1;
      c.p[j] += (ex / e) * sp;
      c.p[j + 1] += (ey / e) * sp;
      c.age[i] += 1;
      if (hit || c.age[i] > 700 || Math.abs(x - c.cx) > c.aspect * 1.1 || Math.abs(y - c.cy) > 1.1) leaveCharge(c, i, false);
    }
  },
  look(c, i) {
    return [1, Math.min(1, c.age[i] / 25)];
  },
};
/** Two positive and two negative charges round the middle, and the pointer one more positive. */
function chargesOf(c: FlowCtx) {
  const w = 0.55 * c.S * Math.max(1, c.aspect * 0.7), h = 0.42 * c.S, turn = Math.sin(c.t * 0.1) * 0.15;
  const q = [c.cx - w, c.cy + h + turn, 1, c.cx + w, c.cy - h - turn, 1, c.cx + w, c.cy + h - turn, -1, c.cx - w, c.cy - h + turn, -1];
  if (c.ptr.on) q.push(c.ptr.x, c.ptr.y, 1.2);
  return q;
}
function leaveCharge(c: FlowCtx, i: number, first: boolean) {
  const q = (c.mem.q as number[]) ?? [];
  const plus: number[] = [];
  for (let k = 0; k < q.length / 3; k++) if (q[k * 3 + 2] > 0) plus.push(k);
  const k = plus[Math.floor(c.rand() * plus.length)] ?? 0, a = c.rand() * Math.PI * 2, j = i * 3;
  c.p[j] = (q[k * 3] ?? c.cx) + Math.cos(a) * 0.03;
  c.p[j + 1] = (q[k * 3 + 1] ?? c.cy) + Math.sin(a) * 0.03;
  c.p[j + 2] = (c.rand() - 0.5) * c.depth * 0.2;
  c.age[i] = first ? -Math.floor(c.rand() * 600) : 0;
}

/* ----------------------------------------------------------- cloth */

const cloth: PhysicsFlow = {
  cap: 3000,
  hands: "push",
  start(c) {
    const cols = Math.max(4, Math.round(Math.sqrt(c.n * 1.6))), rows = Math.max(3, Math.floor(c.n / cols));
    const W = 1.5 * c.S * Math.min(1.4, c.aspect), H = (W * rows) / cols, rest = W / (cols - 1);
    c.mem.cloth = { cols, rows, rest };
    for (let i = 0; i < c.n; i++) {
      const j = i * 3, col = i % cols, row = Math.min(rows - 1, Math.floor(i / cols));
      c.p[j] = c.cx - W / 2 + col * rest;
      c.p[j + 1] = c.cy + 0.72 * c.S - row * (H / Math.max(1, rows - 1)) * 0.98;
      c.p[j + 2] = 0;
      c.a[j] = c.p[j]; c.a[j + 1] = c.p[j + 1]; c.a[j + 2] = 0;
    }
  },
  step(c) {
    const { cols, rows, rest } = c.mem.cloth as { cols: number; rows: number; rest: number };
    const used = cols * rows, g = 0.0005 * Math.max(0.3, c.sp), gust = 0.5 + 0.5 * Math.sin(c.t * 0.35);
    for (let i = 0; i < used; i++) {
      const j = i * 3;
      // The top edge hangs where it was hung, whatever pushed it.
      if (i < cols) { c.p[j] = c.a[j]; c.p[j + 1] = c.a[j + 1]; c.p[j + 2] = c.a[j + 2]; continue; }
      const x = c.p[j], y = c.p[j + 1], z = c.p[j + 2];
      const wind = (Math.sin(c.t * 1.3 + x * 3 + y * 2) * 0.5 + 0.5) * 0.00035 * gust * Math.max(0.3, c.sp);
      c.p[j] += (x - c.a[j]) * 0.985 + wind * 0.4;
      c.p[j + 1] += (y - c.a[j + 1]) * 0.985 - g;
      c.p[j + 2] += (z - c.a[j + 2]) * 0.985 + wind;
      c.a[j] = x; c.a[j + 1] = y; c.a[j + 2] = z;
    }
    // Each thread kept to its length (to the right and downwards), three times over.
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < used; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        if (col < cols - 1 && row > 0) tie(c, i, i + 1, rest, false);
        if (row < rows - 1) tie(c, i, i + cols, rest, row === 0);
      }
    }
    // What's left over (when the count isn't a whole sheet) sits with the last thread.
    for (let i = used; i < c.n; i++) { c.p[i * 3] = c.p[(used - 1) * 3]; c.p[i * 3 + 1] = c.p[(used - 1) * 3 + 1]; c.p[i * 3 + 2] = c.p[(used - 1) * 3 + 2]; }
  },
};
function tie(c: FlowCtx, a: number, b: number, rest: number, pinnedA: boolean) {
  const ja = a * 3, jb = b * 3;
  const dx = c.p[jb] - c.p[ja], dy = c.p[jb + 1] - c.p[ja + 1], dz = c.p[jb + 2] - c.p[ja + 2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, diff = (d - rest) / d;
  const wa = pinnedA ? 0 : 0.5, wb = pinnedA ? 1 : 0.5;
  c.p[ja] += dx * diff * wa; c.p[ja + 1] += dy * diff * wa; c.p[ja + 2] += dz * diff * wa;
  c.p[jb] -= dx * diff * wb; c.p[jb + 1] -= dy * diff * wb; c.p[jb + 2] -= dz * diff * wb;
}

/* ----------------------------------------------------------- a pond */

const pond: PhysicsFlow = {
  cap: 9600,
  turning: true,
  hands: "none",
  start(c) {
    const gw = Math.max(8, Math.round(Math.sqrt(c.n * 1.6))), gh = Math.max(6, Math.floor(c.n / gw));
    c.mem.pond = { gw, gh, h: new Float32Array(gw * gh), prev: new Float32Array(gw * gh), next: new Float32Array(gw * gh) };
  },
  step(c) {
    const P = c.mem.pond as { gw: number; gh: number; h: Float32Array; prev: Float32Array; next: Float32Array };
    const { gw, gh } = P;
    const drop = (gx: number, gy: number, r: number, depth: number) => {
      for (let y = Math.max(1, gy - r); y <= Math.min(gh - 2, gy + r); y++) {
        for (let x = Math.max(1, gx - r); x <= Math.min(gw - 2, gx + r); x++) {
          const d = Math.hypot(x - gx, y - gy) / Math.max(1, r);
          if (d <= 1) P.h[y * gw + x] -= depth * (0.5 + 0.5 * Math.cos(Math.PI * d));
        }
      }
    };
    const cell = (wx: number, wy: number) => [Math.round((0.5 + (wx - c.cx) / (2.4 * c.S)) * (gw - 1)), Math.round((0.5 - (wy - c.cy) / (1.4 * c.S)) * (gh - 1))];
    if (c.ptr.on) { const [x, y] = cell(c.ptr.x, c.ptr.y); drop(x, y, 2, 0.012); }
    if (c.press) { const [x, y] = cell(c.press.x, c.press.y); drop(x, y, 4, 0.18); }
    if (c.rand() < 0.03 * Math.max(0.3, c.sp)) drop(1 + Math.floor(c.rand() * (gw - 2)), 1 + Math.floor(c.rand() * (gh - 2)), 2, 0.05);
    const k2 = Math.min(0.48, 0.3 * Math.max(0.3, c.sp));
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x, h = P.h[i];
        P.next[i] = (2 * h - P.prev[i] + k2 * (P.h[i - 1] + P.h[i + 1] + P.h[i - gw] + P.h[i + gw] - 4 * h)) * 0.992;
      }
    }
    P.prev.set(P.h);
    P.h.set(P.next);
  },
  place(c, i, out) {
    const P = c.mem.pond as { gw: number; gh: number; h: Float32Array };
    const used = P.gw * P.gh, k = Math.min(i, used - 1), x = k % P.gw, y = Math.floor(k / P.gw);
    out[0] = (x / (P.gw - 1) - 0.5) * 2.4 * c.S;
    out[1] = P.h[k] * 1.4 * c.S;
    out[2] = (y / (P.gh - 1) - 0.5) * 2.4 * c.S * (P.gh / P.gw);
  },
  look(c, i) {
    const P = c.mem.pond as { gw: number; gh: number; h: Float32Array };
    const k = Math.min(i, P.gw * P.gh - 1);
    // The crests catch the light.
    return [1, 0.55 + Math.min(0.45, Math.abs(P.h[k]) * 12)];
  },
};

/** The flows worked out here (the others are glEngine.ts's own). */
export const PHYSICS: Partial<Record<GlFlow, PhysicsFlow>> = { lorenz, aizawa, thomas, flock, gravity, pendulum, charge, cloth, pond };
