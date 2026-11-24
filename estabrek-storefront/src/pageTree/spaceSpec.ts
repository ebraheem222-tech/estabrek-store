/**
 * The theme library's 3D pieces (its Premium "3D Carousel Ring", "Flip Book", "Puzzle Cube", "Scroll Phone 3D" and
 * its Heros' "DNA Helix" and "Hologram Cube") as a way any box lays out what it holds (Space3D.tsx places them):
 * - ring: around a ring that turns, dragged round by hand, snapping to the nearest;
 * - helix: up a turning helix, like a DNA strand;
 * - cube: its first six on the faces of a cube that turns and is turned by hand;
 * - book: its pages, two by two (front and back of a leaf), turned with a click, a swipe or the arrow keys;
 * - phone: its screens one by one in a phone that turns as the page scrolls past it.
 * What it holds stays the owner's own boxes, each edited as usual. Safe, bounded settings; plain maths, no imports
 * (the backend's check and the admin read them by path).
 */
export const SPACE_KINDS = ["ring", "helix", "cube", "book", "phone"] as const;
export type SpaceKind = (typeof SPACE_KINDS)[number];
export type SpaceSpec = { kind: SpaceKind; speed: number; drag: boolean; tilt: number };

const num = (v: unknown, min: number, max: number, usual: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : usual);

export function spaceOf(raw: unknown): SpaceSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!(SPACE_KINDS as readonly string[]).includes(r.kind as string)) return null;
  return { kind: r.kind as SpaceKind, speed: num(r.speed, -3, 3, 1), drag: r.drag !== false, tilt: num(r.tilt, -30, 30, r.kind === "ring" ? -8 : 0) };
}

/** How many of what it holds each kind places (the rest stay where they are). */
export const SPACE_MAX: Record<SpaceKind, number> = { ring: 16, helix: 24, cube: 6, book: 12, phone: 6 };

const f = (n: number) => n.toFixed(2);

/** A ring's radius for n cards this wide: their edges apart, and wide enough that three of them face the eye. */
export const ringRadius = (n: number, width: number) => Math.max(width * 1.5, (width * 0.5 + 24) / Math.tan(Math.PI / Math.max(3, n)));

/**
 * The i-th of n around a ring turned by `angle` degrees, tilted by `tilt`, and how much it faces the eye (1 front, -1 back).
 * The ring stands back by its radius, so the card in front is at its own size.
 */
export function ringPose(i: number, n: number, angle: number, radius: number, tilt: number): { transform: string; facing: number } {
  const a = (i * 360) / n + angle;
  return { transform: `translate(-50%,-50%) translateZ(${f(-radius)}px) rotateX(${f(tilt)}deg) rotateY(${f(a)}deg) translateZ(${f(radius)}px)`, facing: Math.cos((a * Math.PI) / 180) };
}

/** The i-th of n up a helix turned by `angle`: `step` degrees and `rise` px apart. */
export function helixPose(i: number, n: number, angle: number, radius: number, rise: number, step = 36): { transform: string; facing: number } {
  const a = i * step + angle;
  const y = (i - (n - 1) / 2) * rise;
  return { transform: `translate(-50%,-50%) translateZ(${f(-radius)}px) translateY(${f(y)}px) rotateY(${f(a)}deg) translateZ(${f(radius)}px)`, facing: Math.cos((a * Math.PI) / 180) };
}

/** Where each of a cube's six faces sits before the cube turns. */
const CUBE_FACES = ["", "rotateY(90deg)", "rotateY(180deg)", "rotateY(-90deg)", "rotateX(90deg)", "rotateX(-90deg)"];
/** Face i of a cube `size` px wide, the cube turned by `ax` and `ay` degrees. */
export const cubePose = (i: number, size: number, ax: number, ay: number) =>
  `translate(-50%,-50%) rotateX(${f(ax)}deg) rotateY(${f(ay)}deg) ${CUBE_FACES[i] ?? ""} translateZ(${f(size / 2)}px)`;

/**
 * Page i of a book whose leaves are turned by `turn` (each leaf's angle, 0 lying open on the right … 180 turned over
 * to the left): even pages are a leaf's front, odd ones its back. Hinged at the spine (transform-origin left).
 * In a right-to-left book the spine is on the right and leaves turn the other way.
 */
export function bookPose(i: number, turn: number[], width: number, rtl: boolean): { transform: string; z: number } {
  const leaf = Math.floor(i / 2), leaves = turn.length;
  const t = turn[leaf] ?? 0;
  const s = rtl ? 1 : -1;
  const z = t > 90 ? leaf + 1 : leaves - leaf;
  return i % 2 === 0
    ? { transform: `rotateY(${f(s * t)}deg)`, z }
    : { transform: `rotateY(${f(s * t)}deg) translateX(${f(rtl ? -width : width)}px) rotateY(180deg)`, z };
}

/** The phone's turn as the page scrolls past it (0 … 1): it swings one way and the other, and settles facing the eye. */
export function phonePose(p: number): { ry: number; rx: number; scale: number } {
  const at = (stops: number[], vals: number[]) => {
    const x = Math.min(1, Math.max(0, p));
    for (let k = 1; k < stops.length; k++) if (x <= stops[k]) { const u = (x - stops[k - 1]) / (stops[k] - stops[k - 1]); return vals[k - 1] + (vals[k] - vals[k - 1]) * u; }
    return vals[vals.length - 1];
  };
  return { ry: at([0, 0.3, 0.6, 0.85, 1], [-28, 16, -14, -6, 0]), rx: at([0, 0.3, 0.6, 1], [10, -6, 8, 0]), scale: at([0, 0.5, 1], [0.92, 1, 1.04]) };
}
