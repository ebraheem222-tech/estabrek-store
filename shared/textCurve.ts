/**
 * Words on a curve (docs/cms-big-engine-plan.ar.md A6): a heading or a text drawn along an arc (bent up or down), a
 * wave, or a circle (a badge's words around it), as SVG `textPath` in the element (its colour, font and weight
 * stay the element's own). The curve lives in a 1000-wide box that stretches with the element; the words' size and
 * spacing are in that box's own units. Plain TypeScript: no React, no "@/" imports (the admin and the shop use it).
 */

export const CURVES = ["arc", "wave", "circle"] as const;
export type CurveKind = (typeof CURVES)[number];
export type Curve = { kind: CurveKind; bend?: number; size?: number; space?: number };

const r1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The curve's box and path: `bend` from -100 (down) to 100 (up). */
export function curvePath(kind: CurveKind, bend = 50): { viewBox: string; d: string } {
  const b = clamp(bend, -100, 100);
  if (kind === "circle") {
    // From the bottom, clockwise: the words' middle (half way) is at the top.
    return { viewBox: "0 0 1000 1000", d: "M500 900 A400 400 0 1 1 500 100 A400 400 0 1 1 500 900" };
  }
  if (kind === "wave") {
    const a = r1(b * 1.4);
    return { viewBox: "0 0 1000 300", d: `M40 150 C270 ${r1(150 - a)} 270 ${r1(150 + a)} 500 150 S730 ${r1(150 - a)} 960 150` };
  }
  // An arc: its middle lifted (or lowered) by the bend, the box tall enough for the words above it.
  const mid = r1(170 + Math.max(0, b) * 1.1);
  return { viewBox: "0 0 1000 300", d: `M40 ${mid} Q500 ${r1(mid - b * 2.2)} 960 ${mid}` };
}

/** A saved curve the shop may draw, or null. */
export function safeCurve(raw: unknown): Curve | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.kind !== "string" || !(CURVES as readonly string[]).includes(r.kind)) return null;
  const n = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
  const out: Curve = { kind: r.kind as CurveKind };
  const bend = n(r.bend, -100, 100), size = n(r.size, 20, 240), space = n(r.space, -10, 60);
  if (bend !== undefined) out.bend = bend;
  if (size !== undefined) out.size = size;
  if (space !== undefined) out.space = space;
  return out;
}

/** Words without the editor's rich marks ([b]…[/b], [color=…]…), for the curve. */
export const plainWords = (t: string) => t.replace(/\[\/?(b|i|u|mark|color(=[^\]\s]+)?|link(=[^\]\s]+)?)\]/g, "").replace(/\s+/g, " ").trim();
