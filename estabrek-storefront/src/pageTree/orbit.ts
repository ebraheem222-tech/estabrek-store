/**
 * "orbit" (motion.scroll): what a box holds travels with the scroll, each thing at its own place:
 * - circle: a ring seen a little from above (the ones in front bigger and on top), turning;
 * - arc: a rainbow, each thing coming in at one end and going out at the other;
 * - wave: along a wave across the box, coming in at one side and going out at the other.
 * Pure: where each thing is for a moment of the scroll, and how tall the box is for it.
 */
export type OrbitShape = "circle" | "arc" | "wave";
export type OrbitSpot = { x: number; y: number; scale: number; opacity: number; z: number };

const TAU = Math.PI * 2;
const wrap = (v: number) => v - Math.floor(v);

/** The `i`th of `n` things at moment `p` (0–1) of the scroll; x/y from the box's middle, in px. */
export function orbitSpot(shape: OrbitShape, i: number, n: number, p: number, turn: number, width: number, radius: number, rtl = false): OrbitSpot {
  const R = (Math.max(10, Math.min(100, radius)) / 100) * (width / 2);
  const dir = rtl ? -1 : 1;
  if (shape === "circle") {
    const a = (TAU * i) / Math.max(1, n) + p * turn * TAU + Math.PI / 2;
    const depth = (Math.sin(a) + 1) / 2; // 1 = in front
    return { x: dir * R * Math.cos(a), y: R * 0.32 * Math.sin(a), scale: 0.62 + 0.38 * depth, opacity: 0.45 + 0.55 * depth, z: Math.round(depth * 100) };
  }
  // Along a line from one end to the other: things spaced evenly, the scroll moving them along.
  const t = wrap(i / Math.max(1, n) + p * turn);
  const fade = Math.min(1, Math.sin(t * Math.PI) * 2.2);
  if (shape === "arc") {
    const a = Math.PI + t * Math.PI; // left end, over the top, right end
    return { x: dir * R * Math.cos(a), y: R * 0.8 * Math.sin(a) + R * 0.4, scale: 0.8 + 0.2 * Math.sin(t * Math.PI), opacity: fade, z: Math.round(Math.sin(t * Math.PI) * 100) };
  }
  return { x: dir * (t - 0.5) * width * 1.05, y: Math.sin(t * TAU * 1.25) * R * 0.35, scale: 1, opacity: fade, z: 0 };
}

/** How tall the box is for its things to fit along their way. */
export function orbitHeight(shape: OrbitShape, width: number, radius: number, tallest: number): number {
  const R = (Math.max(10, Math.min(100, radius)) / 100) * (width / 2);
  const reach = shape === "circle" ? R * 0.64 : shape === "arc" ? R * 0.8 : R * 0.7;
  return Math.ceil(reach + tallest * 1.15);
}
