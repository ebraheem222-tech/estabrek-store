/**
 * Motion along a path (an element's keyframes can carry one: keys.path): the element travels a drawn curve over
 * the animation's time, and can turn to face the way it goes. The curves are ready shapes given by equations, each
 * `w` px wide and `h` px tall (up is the way a positive `h` goes):
 *  - arc: across, rising to its height in the middle and back down      (x = w·t, y = h·sin πt)
 *  - wave: across, up and down `turns` times                            (y = h·sin 2π·turns·t)
 *  - s: across while it climbs to its height, slow – fast – slow        (y = h·(3t² − 2t³))
 *  - zigzag: across in `turns` straight peaks
 *  - loop: round an ellipse `turns` times, back to where it began
 *  - eight: a figure of eight `turns` times, back to where it began
 *  - spiral: round and round `turns` times, closing in on its place
 * `rest` says where the element's own place is on the curve: at its end (it arrives; the default) or at its start
 * (it leaves). `turn`: it turns with the curve, upright at its own place. Across goes toward the line's end, so
 * it mirrors in a right-to-left page.
 *
 * Plain TypeScript: no DOM, no React and no "@/" imports (the editor draws the same curve from this file).
 */
export const PATH_KINDS = ["arc", "wave", "s", "zigzag", "loop", "eight", "spiral"] as const;
export type PathKind = (typeof PATH_KINDS)[number];
export type PathSpec = { kind: PathKind; w: number; h: number; turns?: number; rest?: "end" | "start"; turn?: boolean };
/** The limits the backend checks too (lib/pageTree.ts NodeKeys.path). */
export const PATH_LIMITS = { w: [0, 2000], h: [-1000, 1000], turns: [0.5, 8] } as const;
/** How many times a shape goes round or up and down when it doesn't say. */
export const PATH_TURNS: Record<PathKind, number> = { arc: 1, wave: 2, s: 1, zigzag: 3, loop: 1, eight: 1, spiral: 2 };
/** Shapes that end where they began (their place is the same at both ends). */
export const CLOSED_PATHS: ReadonlySet<PathKind> = new Set(["loop", "eight"]);

const num = (v: unknown, [lo, hi]: readonly [number, number]) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);

/** A path as the shop may play it: a known shape and numbers in range only, else nothing. */
export function pathOf(raw: unknown): PathSpec | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const kind = (PATH_KINDS as readonly string[]).includes(r.kind as string) ? (r.kind as PathKind) : undefined;
  const w = num(r.w, PATH_LIMITS.w);
  const h = num(r.h, PATH_LIMITS.h);
  if (!kind || w === undefined || h === undefined) return undefined;
  const turns = num(r.turns, PATH_LIMITS.turns);
  return { kind, w, h, ...(turns !== undefined ? { turns } : {}), ...(r.rest === "start" ? { rest: "start" as const } : {}), ...(r.turn === true ? { turn: true } : {}) };
}

const TAU = Math.PI * 2;
/** The shape itself at `t` (0–1), in px from where it begins: x across (toward the line's end), y down the screen. */
export function pathShape(p: PathSpec, t: number): { x: number; y: number } {
  const n = p.turns ?? PATH_TURNS[p.kind];
  const { w, h } = p;
  switch (p.kind) {
    case "arc":
      return { x: w * t, y: -h * Math.sin(Math.PI * t) };
    case "wave":
      return { x: w * t, y: -h * Math.sin(TAU * n * t) };
    case "s":
      return { x: w * t, y: -h * (3 * t * t - 2 * t * t * t) };
    case "zigzag": {
      const u = (n * t) % 1;
      // A whole number of peaks ends back on the line (the last moment is the end of a peak, not the start of one).
      const tri = t >= 1 && Number.isInteger(n) ? 0 : 1 - Math.abs(2 * u - 1);
      return { x: w * t, y: -h * tri };
    }
    case "loop":
      return { x: (w / 2) * Math.sin(TAU * n * t), y: -(h / 2) * (1 - Math.cos(TAU * n * t)) };
    case "eight":
      return { x: (w / 2) * Math.sin(TAU * n * t), y: -(h / 2) * Math.sin(2 * TAU * n * t) };
    case "spiral": {
      const r = 1 - t;
      return { x: (w / 2) * r * Math.cos(TAU * n * t), y: -(h / 2) * r * Math.sin(TAU * n * t) };
    }
  }
}

export type PathPoint = { x: number; y: number; angle: number };
/**
 * Where the element stands at `t` (0–1): px from its own place (x toward the line's end unless `rtl`, y down the
 * screen) and how far it has turned from upright (degrees; 0 unless the path turns it).
 */
export function pathTrack(p: PathSpec, rtl = false, samples = 120): (t: number) => PathPoint {
  const leaves = p.rest === "start";
  // A spiral that leaves its place runs the other way round: from its place outward.
  const shape = (t: number) => (p.kind === "spiral" && leaves ? pathShape(p, 1 - t) : pathShape(p, t));
  const home = shape(leaves ? 0 : 1);
  const side = rtl ? -1 : 1;
  const at = (t: number) => {
    const s = shape(Math.min(1, Math.max(0, t)));
    return { x: (s.x - home.x) * side, y: s.y - home.y };
  };
  // The way it faces at each sample (the curve's direction), unwrapped so it never jumps a whole turn.
  const n = Math.max(8, samples);
  const angles: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = at(Math.max(0, (i - 0.5) / n)), b = at(Math.min(1, (i + 0.5) / n));
    let angle = b.x === a.x && b.y === a.y ? (angles[i - 1] ?? 0) : (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (i) while (angle - angles[i - 1] > 180) angle -= 360;
    if (i) while (angle - angles[i - 1] < -180) angle += 360;
    angles.push(angle);
  }
  const upright = angles[leaves ? 0 : n];
  return (t: number) => {
    const u = Math.min(1, Math.max(0, t));
    const point = at(u);
    if (!p.turn) return { ...point, angle: 0 };
    const f = u * n, i = Math.min(n - 1, Math.floor(f));
    return { ...point, angle: angles[i] + (angles[i + 1] - angles[i]) * (f - i) - upright };
  };
}

const r1 = (v: number) => String(Math.round(v * 10) / 10);
/** The curve as an SVG path (px from the element's place), for the editor's drawing of it. */
export function pathD(p: PathSpec, rtl = false, samples = 64): string {
  const track = pathTrack({ ...p, turn: false }, rtl, samples);
  return Array.from({ length: samples + 1 }, (_, i) => {
    const { x, y } = track(i / samples);
    return `${i ? "L" : "M"}${r1(x)} ${r1(y)}`;
  }).join(" ");
}
