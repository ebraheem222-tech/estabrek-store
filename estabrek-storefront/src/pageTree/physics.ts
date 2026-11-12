/**
 * Physics (docs/cms-big-engine-plan.ar.md I), as the shop reads it. The backend checks it first (lib/pageTree.ts
 * NodePhysics, NodeWorld, NodeBody).
 *  - An element's own physics (motion.physics), with no engine, just springs and gravity worked out every frame:
 *    it leans after the pointer (follow), is pulled to it when near (magnet), can be grabbed and thrown in its
 *    box (throw), falls into its place and bounces (drop), hangs and swings (pendulum), floats as if on water
 *    (float), or lags behind the scroll's speed (scroll).
 *  - A world (props.world on a section, grid, stack, columns, cell or popup): what it holds become bodies of a
 *    real engine (Matter.js, loaded only then), with gravity (or the phone's tilt), walls, bounce, friction, air,
 *    wind, dragging and throwing, the pointer pushing or pulling, a click bursting them apart or turning gravity
 *    over. Each body can be round or a box, fixed in place, bouncier or heavier, or hang from a rope or a spring
 *    (props.body).
 *  - Baking a world into keyframes: its run sampled, cut to the moments that matter (at most 16), each moment's
 *    curve picked to match, so the page plays plain keyframes and runs no physics at all.
 * Plain data in, plain data out: no DOM and no "@/" imports, so tests load this file directly.
 */
import type { KeyFrameSpec } from "./keyframes";

export const PHYSICS_KINDS = ["follow", "magnet", "throw", "drop", "pendulum", "float", "scroll"] as const;
export type PhysicsKind = (typeof PHYSICS_KINDS)[number];
export type PhysicsSpec = {
  kind: PhysicsKind;
  /** The spring's pull (20–600) and its calm (1–60), the element's weight (0.2–5). */
  stiffness?: number; damping?: number; mass?: number;
  /** How strong or far (0.1–3). */
  amount?: number;
  /** How much of its speed it keeps hitting the floor or a wall (0–0.95). */
  bounce?: number;
  /** Thrown: back to its place after a rest, or it stays where it lands. */
  home?: "back" | "stay";
};

export const WORLD_HOSTS = ["section", "grid", "stack", "columns", "cell", "popup"] as const;
export const WORLD_ON = ["view", "load", "click", "hover"] as const;
export const WORLD_START = ["place", "drop", "burst"] as const;
export const WORLD_WALLS = ["box", "open", "floor", "none"] as const;
export const WORLD_POINTER = ["none", "push", "pull"] as const;
export const WORLD_CLICK = ["none", "burst", "flip"] as const;
export type WorldSpec = {
  /** When it starts: once seen, at once, on a click in it, with the pointer over it. */
  on: (typeof WORLD_ON)[number];
  /** How it starts: from where they are, dropped in from above, burst apart from the middle. */
  start: (typeof WORLD_START)[number];
  /** Gravity, sideways and down (−2…2; 0, 1 = as on earth). */
  gx: number; gy: number;
  /** The phone's tilt moves gravity. */
  tilt: boolean;
  /** Its walls: all four, open at the top, a floor only, none. */
  walls: (typeof WORLD_WALLS)[number];
  bounce: number; friction: number; air: number;
  /** Bodies can be grabbed and thrown. */
  drag: boolean;
  pointer: (typeof WORLD_POINTER)[number];
  /** A wind sideways, in gusts (−1…1). */
  wind: number;
  click: (typeof WORLD_CLICK)[number];
  /** Back in place and again every so many seconds (0 = never). */
  again: number;
  /** Baked into its bodies' keyframes: it runs no physics. */
  baked?: boolean;
};
export const WORLD_DEFAULTS: WorldSpec = { on: "view", start: "drop", gx: 0, gy: 1, tilt: false, walls: "open", bounce: 0.4, friction: 0.1, air: 0.01, drag: true, pointer: "none", wind: 0, click: "none", again: 0 };

export const BODY_SHAPES = ["auto", "box", "circle"] as const;
export const BODY_HANG = ["none", "rope", "spring"] as const;
export type BodySpec = { shape?: (typeof BODY_SHAPES)[number]; fixed?: boolean; bounce?: number; mass?: number; hang?: (typeof BODY_HANG)[number]; out?: boolean };

const obj = (v: unknown): Record<string, unknown> | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const within = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const inList = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const drop = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** An element's own physics the shop may play: a known kind and numbers in range only, else null. */
export function physicsOf(raw: unknown): PhysicsSpec | null {
  const r = obj(raw);
  const kind = inList(r?.kind, PHYSICS_KINDS);
  if (!r || !kind) return null;
  return drop({ kind, stiffness: within(r.stiffness, 20, 600), damping: within(r.damping, 1, 60), mass: within(r.mass, 0.2, 5), amount: within(r.amount, 0.1, 3), bounce: within(r.bounce, 0, 0.95), home: inList(r.home, ["back", "stay"] as const) });
}

/** A world's settings with what it leaves out at its defaults, or null when it has none. */
export function worldOf(raw: unknown): WorldSpec | null {
  const r = obj(raw);
  if (!r) return null;
  const d = WORLD_DEFAULTS;
  return {
    on: inList(r.on, WORLD_ON) ?? d.on,
    start: inList(r.start, WORLD_START) ?? d.start,
    gx: within(r.gx, -2, 2) ?? d.gx,
    gy: within(r.gy, -2, 2) ?? d.gy,
    tilt: r.tilt === true,
    walls: inList(r.walls, WORLD_WALLS) ?? d.walls,
    bounce: within(r.bounce, 0, 0.95) ?? d.bounce,
    friction: within(r.friction, 0, 1) ?? d.friction,
    air: within(r.air, 0, 0.2) ?? d.air,
    drag: r.drag !== false,
    pointer: inList(r.pointer, WORLD_POINTER) ?? d.pointer,
    wind: within(r.wind, -1, 1) ?? d.wind,
    click: inList(r.click, WORLD_CLICK) ?? d.click,
    again: within(r.again, 0, 60) ?? d.again,
    ...(r.baked === true ? { baked: true } : {}),
  };
}

/** A body's own settings in a world, or null when it has none. */
export function bodyOf(raw: unknown): BodySpec | null {
  const r = obj(raw);
  if (!r) return null;
  const b = drop({ shape: inList(r.shape, BODY_SHAPES), fixed: r.fixed === true ? true : undefined, bounce: within(r.bounce, 0, 0.95), mass: within(r.mass, 0.2, 5), hang: inList(r.hang, BODY_HANG), out: r.out === true ? true : undefined });
  return Object.keys(b).length ? b : null;
}

/* ------------------------------------------------------------------ an element's own physics */

/** Each kind's own feel when the settings leave it out. */
export const PHYSICS_FEEL: Record<PhysicsKind, { stiffness: number; damping: number; bounce: number }> = {
  follow: { stiffness: 120, damping: 14, bounce: 0 },
  magnet: { stiffness: 170, damping: 15, bounce: 0 },
  throw: { stiffness: 90, damping: 12, bounce: 0.55 },
  drop: { stiffness: 0, damping: 0, bounce: 0.42 },
  pendulum: { stiffness: 0, damping: 0.9, bounce: 0 },
  float: { stiffness: 60, damping: 5, bounce: 0 },
  scroll: { stiffness: 160, damping: 18, bounce: 0 },
};
export const feelOf = (s: PhysicsSpec) => {
  const f = PHYSICS_FEEL[s.kind];
  return { stiffness: s.stiffness ?? f.stiffness, damping: s.damping ?? f.damping, mass: s.mass ?? 1, amount: s.amount ?? 1, bounce: s.bounce ?? f.bounce };
};

export type Spring = { x: number; v: number };
/** One step of a spring towards `target` (semi-implicit Euler: steady at a frame's length). */
export function springStep(s: Spring, target: number, k: number, c: number, m: number, dt: number) {
  const a = (-k * (s.x - target) - c * s.v) / m;
  s.v += a * dt;
  s.x += s.v * dt;
}
export const springRests = (s: Spring, target: number, eps = 0.05) => Math.abs(s.x - target) < eps && Math.abs(s.v) < eps * 6;

/**
 * A fall from `height` px above its place under gravity `g` (px/s²), bouncing back each time with `bounce` of its
 * speed: where it is (px above its place, ≥ 0) and how fast, one step on. `squash` how flat it is just after a hit.
 */
export function fallStep(s: Spring, g: number, bounce: number, dt: number): { hit: number } {
  s.v -= g * dt;
  s.x += s.v * dt;
  if (s.x <= 0) {
    const speed = -s.v;
    s.x = 0;
    s.v = speed * bounce > 40 ? speed * bounce : 0;
    return { hit: speed };
  }
  return { hit: 0 };
}

/** A pendulum of length `len` px: its angle (radians) and turn speed, one step on (gravity `g`, calm `c`). */
export function pendulumStep(s: Spring, len: number, g: number, c: number, dt: number) {
  const a = -(g / Math.max(20, len)) * Math.sin(s.x) - c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

/* ------------------------------------------------------------------ baking a world into keyframes */

/** A body's place along a world's run: seconds, px from its place, degrees turned. */
export type Sample = { t: number; x: number; y: number; a: number };
type EaseName = "linear" | "smooth" | "fall" | "soft";
const EASE_FN: Record<EaseName, (u: number) => number> = {
  linear: (u) => u,
  smooth: (u) => 1 - (1 - u) * (1 - u), // power2.out
  fall: (u) => u * u, // power2.in
  soft: (u) => -(Math.cos(Math.PI * u) - 1) / 2, // sine.inOut
};

/** How far a sample lies from the straight line between two others (time, place and turn weighed together). */
function offLine(s: Sample[], i0: number, i1: number, j: number) {
  const a = s[i0], b = s[i1], p = s[j];
  const u = b.t === a.t ? 0 : (p.t - a.t) / (b.t - a.t);
  const dx = p.x - (a.x + (b.x - a.x) * u), dy = p.y - (a.y + (b.y - a.y) * u), da = (p.a - (a.a + (b.a - a.a) * u)) * 0.6;
  return Math.hypot(dx, dy, da);
}

/** The samples that matter (Ramer–Douglas–Peucker), at most `max`, the first and last always kept. */
export function keepSamples(s: Sample[], max = 16): number[] {
  if (s.length <= 2) return s.map((_, i) => i);
  const pick = (eps: number) => {
    const keep = new Set([0, s.length - 1]);
    const walk = (i0: number, i1: number) => {
      let far = -1, at = -1;
      for (let j = i0 + 1; j < i1; j++) {
        const d = offLine(s, i0, i1, j);
        if (d > far) { far = d; at = j; }
      }
      if (at >= 0 && far > eps) {
        keep.add(at);
        walk(i0, at);
        walk(at, i1);
      }
    };
    walk(0, s.length - 1);
    return [...keep].sort((a, b) => a - b);
  };
  let eps = 0.5;
  let kept = pick(eps);
  while (kept.length > max && eps < 1e5) {
    eps *= 1.4;
    kept = pick(eps);
  }
  return kept;
}

/** The curve between two kept samples that matches the samples between them best. */
export function fitEase(s: Sample[], i0: number, i1: number): EaseName {
  const a = s[i0], b = s[i1];
  const ch = ([["x", b.x - a.x], ["y", b.y - a.y], ["a", (b.a - a.a) * 0.6]] as const).reduce((best, c) => (Math.abs(c[1]) > Math.abs(best[1]) ? c : best));
  if (Math.abs(ch[1]) < 0.5 || i1 - i0 < 2) return "linear";
  const key = ch[0];
  const span = (b[key] - a[key]) || 1;
  let best: EaseName = "linear", err = Infinity;
  for (const name of Object.keys(EASE_FN) as EaseName[]) {
    let e = 0;
    for (let j = i0 + 1; j < i1; j++) {
      const u = (s[j].t - a.t) / (b.t - a.t || 1);
      const p = (s[j][key] - a[key]) / span;
      e += (EASE_FN[name](u) - p) ** 2;
    }
    if (e < err - 1e-9) { err = e; best = name; }
  }
  return best;
}

const clampTo = (v: number, lim: number) => Math.max(-lim, Math.min(lim, Math.round(v * 10) / 10));

/** A body's run as keyframes: the moments that matter, each with the curve that gets it there. */
export function bakeFrames(s: Sample[], max = 16): KeyFrameSpec[] {
  if (!s.length) return [];
  const end = s[s.length - 1].t || 1;
  const kept = keepSamples(s, max);
  const frames: KeyFrameSpec[] = [];
  let lastAt = -1;
  kept.forEach((i, n) => {
    let at = Math.round((s[i].t / end) * 1000) / 10;
    if (n === kept.length - 1) at = 100;
    if (at <= lastAt) at = Math.min(100, lastAt + 0.1);
    lastAt = at;
    const f: KeyFrameSpec = { at, x: clampTo(s[i].x, 2000), y: clampTo(s[i].y, 2000), rz: clampTo(s[i].a, 1440) };
    if (n > 0) {
      f.ease = fitEase(s, kept[n - 1], i);
    }
    frames.push(f);
  });
  if (frames.length < 2) frames.push({ ...frames[0], at: 100 });
  return frames;
}

/** A small steady random (the same run each time: a bake matches what was tried). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
