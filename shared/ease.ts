/**
 * Motion curves written as text (docs/cms-big-engine-plan.ar.md H), shared by the editor (it draws and edits them)
 * and the shop (it plays them; the backend checks the same text on save):
 *  - a named curve: "none", "power2.out", "back.inOut", "elastic.out", "bounce.out"… (GSAP's names);
 *  - "cubic-bezier(x1,y1,x2,y2)": two handles, x between 0 and 1;
 *  - "spring(mass,stiffness,damping)": a real spring, settling at the end of the motion's time.
 * Every curve is also a function of time (0–1 → 0–1, a spring overshoots) and can be baked into CSS `linear()`, so
 * the same motion runs without any script. Plain TypeScript: no React, no "@/" imports (the admin imports it too).
 */

export const EASE_FAMILIES = ["power1", "power2", "power3", "power4", "sine", "expo", "circ", "back", "elastic", "bounce"] as const;
export const EASE_WAYS = ["in", "out", "inOut"] as const;
export const NAMED_EASES: string[] = ["none", ...EASE_FAMILIES.flatMap((f) => EASE_WAYS.map((w) => `${f}.${w}`))];

const N = "(-?\\d+(?:\\.\\d+)?)";
const BEZIER = new RegExp(`^cubic-bezier\\(\\s*${N}\\s*,\\s*${N}\\s*,\\s*${N}\\s*,\\s*${N}\\s*\\)$`);
const SPRING = new RegExp(`^spring\\(\\s*${N}\\s*,\\s*${N}\\s*,\\s*${N}\\s*\\)$`);

export type Ease =
  | { kind: "named"; name: string }
  | { kind: "bezier"; p: [number, number, number, number] }
  | { kind: "spring"; mass: number; stiffness: number; damping: number };

export const SPRING_LIMITS = { mass: [0.1, 10], stiffness: [1, 1000], damping: [0, 100] } as const;

/** The curve a text names, or null when it isn't one (too long, out of range, unknown). */
export function readEase(text: unknown): Ease | null {
  if (typeof text !== "string" || text.length > 60) return null;
  const t = text.trim();
  if (NAMED_EASES.includes(t)) return { kind: "named", name: t };
  const b = BEZIER.exec(t);
  if (b) {
    const p = b.slice(1).map(Number) as [number, number, number, number];
    if (p[0] < 0 || p[0] > 1 || p[2] < 0 || p[2] > 1 || p[1] < -2 || p[1] > 3 || p[3] < -2 || p[3] > 3) return null;
    return { kind: "bezier", p };
  }
  const s = SPRING.exec(t);
  if (s) {
    const [mass, stiffness, damping] = s.slice(1).map(Number);
    const inside = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi;
    if (!inside(mass, SPRING_LIMITS.mass) || !inside(stiffness, SPRING_LIMITS.stiffness) || !inside(damping, SPRING_LIMITS.damping)) return null;
    return { kind: "spring", mass, stiffness, damping };
  }
  return null;
}

const r3 = (v: number) => String(Math.round(v * 1000) / 1000);
/** The curve written as text (the form readEase reads). */
export function writeEase(e: Ease): string {
  if (e.kind === "named") return e.name;
  if (e.kind === "bezier") return `cubic-bezier(${e.p.map(r3).join(",")})`;
  return `spring(${r3(e.mass)},${r3(e.stiffness)},${r3(e.damping)})`;
}

/* ------------------------------------------------------------------ the curves as functions */

/** A CSS cubic-bezier as a function (Newton's method, then halving when it stalls). */
export function bezierFn([x1, y1, x2, y2]: [number, number, number, number]): (t: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
  const X = (s: number) => ((ax * s + bx) * s + cx) * s;
  const Y = (s: number) => ((ay * s + by) * s + cy) * s;
  const dX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const err = X(s) - t, d = dX(s);
      if (Math.abs(err) < 1e-6) return Y(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0, hi = 1;
    s = t;
    for (let i = 0; i < 30; i++) {
      const v = X(s);
      if (Math.abs(v - t) < 1e-6) break;
      if (v < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return Y(s);
  };
}

/**
 * A spring from rest to 1 (unit displacement), its time squeezed so it has settled (within 0.1%) at t = 1.
 * Under-damped springs overshoot and swing; over-damped ones creep in.
 */
export function springFn(mass: number, stiffness: number, damping: number): (t: number) => number {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x = (T: number): number => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * T) * (Math.cos(wd * T) + ((zeta * w0) / wd) * Math.sin(wd * T));
    }
    if (zeta === 1) return 1 - Math.exp(-w0 * T) * (1 + w0 * T);
    const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1)), r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
    return 1 - (r2 * Math.exp(r1 * T) - r1 * Math.exp(r2 * T)) / (r2 - r1);
  };
  // When it has settled: the slowest decay reaching 0.1% (capped, an undamped spring never settles).
  const decay = zeta < 1 ? zeta * w0 : w0 * (zeta - Math.sqrt(Math.max(0, zeta * zeta - 1)));
  const settle = Math.min(60, decay > 1e-6 ? Math.log(1000) / decay : 60);
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : x(t * settle));
}

/* GSAP's named curves, for the editor's drawing (the shop hands the name to GSAP itself). */
const POWER: Record<string, number> = { power1: 2, power2: 3, power3: 4, power4: 5 };
const outBounce = (t: number) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
function namedIn(family: string): (t: number) => number {
  if (family in POWER) return (t) => Math.pow(t, POWER[family]);
  switch (family) {
    case "sine": return (t) => 1 - Math.cos((t * Math.PI) / 2);
    case "expo": return (t) => (t ? Math.pow(2, 10 * (t - 1)) : 0);
    case "circ": return (t) => 1 - Math.sqrt(1 - t * t);
    case "back": return (t) => t * t * (2.70158 * t - 1.70158);
    case "elastic": return (t) => (t === 0 || t === 1 ? t : -Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1.075) * 2 * Math.PI) / 0.3));
    case "bounce": return (t) => 1 - outBounce(1 - t);
    default: return (t) => t;
  }
}
function namedFn(name: string): (t: number) => number {
  if (name === "none") return (t) => t;
  const [family, way] = name.split(".");
  const f = namedIn(family);
  if (way === "in") return f;
  if (way === "out") return (t) => 1 - f(1 - t);
  return (t) => (t < 0.5 ? f(2 * t) / 2 : 1 - f(2 - 2 * t) / 2);
}

/** The curve as a function of time (0–1). */
export function easeFn(e: Ease): (t: number) => number {
  if (e.kind === "bezier") return bezierFn(e.p);
  if (e.kind === "spring") return springFn(e.mass, e.stiffness, e.damping);
  return namedFn(e.name);
}

/** The curve as CSS `linear()`, `points` steps along it (so a spring or a bounce plays from CSS alone). */
export function cssLinear(e: Ease, points = 40): string {
  if (e.kind === "bezier") return writeEase(e);
  const f = easeFn(e);
  const out: string[] = [];
  for (let i = 0; i <= points; i++) out.push(r3(f(i / points)));
  return `linear(${out.join(", ")})`;
}
