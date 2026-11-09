/**
 * The geometry of changing an element directly on the page: resizing by its handles
 * (Shift keeps its proportions), turning by the handle above it (Shift snaps to 15°),
 * snapping a freely placed element to its container and the things beside it, the
 * distances shown with Alt, and Alt+arrow nudges. Screen pixels in, screen pixels out.
 */
import type { Box, Pt } from "./geometry";
import type { Mat3 } from "../../../shared/geometry/plane";

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
/** Explicit local size in canvas pixels; only the element's own 2D rotation. */
export type ResizeFrame = { w: number; h: number; rotation: number };
export type RatioLimits = { min: number; max: number };
export type ResizeChange = {
  handle: Handle;
  /** Original and final rendered AABBs in canvas pixels. */
  start: Box;
  box: Box;
  zoom: number;
  keepProportions: boolean;
  /** For an explicit rotated frame, offset is the CSS layout top-left shift in canvas pixels. */
  frame?: { start: ResizeFrame; current: ResizeFrame; offset: Pt };
  /** A measured planar result: dimensions are local CSS px, matrix/quad use canvas px. */
  plane?: { matrix: Mat3; w: number; h: number; quad: Pt[]; patch: Record<string, unknown> };
};
export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
/** Where a handle sits on a box. */
export function handleAt(b: Box, h: Handle, frame?: ResizeFrame): Pt {
  if (frame) {
    const at = handleAt({ x: -frame.w / 2, y: -frame.h / 2, w: frame.w, h: frame.h }, h);
    const rotated = rotate(at, frame.rotation);
    return { x: b.x + b.w / 2 + rotated.x, y: b.y + b.h / 2 + rotated.y };
  }
  const x = h.includes("w") ? b.x : h.includes("e") ? b.x + b.w : b.x + b.w / 2;
  const y = h.includes("n") ? b.y : h.includes("s") ? b.y + b.h : b.y + b.h / 2;
  return { x, y };
}
export const CURSOR: Record<Handle, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };

/** The box after dragging a handle by (dx, dy); `keep` keeps its proportions (from the corner opposite). */
export function resizeBox(start: Box, h: Handle, dx: number, dy: number, keep = false, min = 8): Box {
  let { x, y, w, h: ht } = start;
  if (h.includes("e")) w = start.w + dx;
  if (h.includes("w")) w = start.w - dx;
  if (h.includes("s")) ht = start.h + dy;
  if (h.includes("n")) ht = start.h - dy;
  w = Math.max(min, w);
  ht = Math.max(min, ht);
  if (keep && start.w > 0 && start.h > 0) {
    const ratio = start.w / start.h;
    // The side dragged further leads; an edge handle leads by its own side.
    const byWidth = h === "e" || h === "w" || (h.length === 2 && Math.abs(w - start.w) / start.w >= Math.abs(ht - start.h) / start.h);
    if (byWidth) {
      w = Math.max(w, min, min * ratio);
      ht = w / ratio;
    } else {
      ht = Math.max(ht, min, min / ratio);
      w = ht * ratio;
    }
  }
  if (h.includes("w")) x = start.x + start.w - w;
  if (h.includes("n")) y = start.y + start.h - ht;
  return { x, y, w, h: ht };
}

function rotate(p: Pt, deg: number): Pt {
  const radians = deg * Math.PI / 180;
  const clean = (n: number) => Math.abs(n) < 1e-12 ? 0 : n;
  const cos = clean(Math.cos(radians));
  const sin = clean(Math.sin(radians));
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/**
 * Resize an explicitly measured local frame about its opposite corner/edge.
 * `box` is its rendered AABB, not a source for inferring the local dimensions.
 * Parent rotation, skew and perspective require a full affine frame from the caller.
 */
export function resizeFrame(box: Box, frame: ResizeFrame, h: Handle, dx: number, dy: number, keep = false, min = 8, limits?: RatioLimits): { box: Box; current: ResizeFrame; offset: Pt } {
  const delta = rotate({ x: dx, y: dy }, -frame.rotation);
  const next = resizeBox({ x: -frame.w / 2, y: -frame.h / 2, w: frame.w, h: frame.h }, h, delta.x, delta.y, keep, min);
  if (keep && limits && frame.w > 0 && frame.h > 0) {
    const wanted = next.w / frame.w;
    const ratio = Math.max(limits.min, Math.min(limits.max, wanted));
    if (ratio !== wanted) {
      next.w = frame.w * ratio;
      next.h = frame.h * ratio;
      next.x = -frame.w / 2 + (h.includes("w") ? frame.w - next.w : 0);
      next.y = -frame.h / 2 + (h.includes("n") ? frame.h - next.h : 0);
    }
  }
  const centerShift = rotate({ x: next.x + next.w / 2, y: next.y + next.h / 2 }, frame.rotation);
  const across = rotate({ x: next.w, y: 0 }, frame.rotation);
  const down = rotate({ x: 0, y: next.h }, frame.rotation);
  const w = Math.abs(across.x) + Math.abs(down.x);
  const ht = Math.abs(across.y) + Math.abs(down.y);
  return {
    box: { x: box.x + box.w / 2 + centerShift.x - w / 2, y: box.y + box.h / 2 + centerShift.y - ht / 2, w, h: ht },
    current: { w: next.w, h: next.h, rotation: frame.rotation },
    offset: { x: centerShift.x + (frame.w - next.w) / 2, y: centerShift.y + (frame.h - next.h) / 2 },
  };
}

/** The angle from a centre to a point, in degrees clockwise from straight up. */
export const angleAt = (c: Pt, p: Pt) => (Math.atan2(p.x - c.x, -(p.y - c.y)) * 180) / Math.PI;
/** A turn kept within ±180°, snapped to `step` degrees when asked. */
export function turnTo(deg: number, step = 0): number {
  let d = ((deg + 180) % 360 + 360) % 360 - 180;
  if (step) d = Math.round(d / step) * step;
  return Math.round(d * 10) / 10 === -180 ? 180 : Math.round(d * 10) / 10;
}

export type Guide = { x1: number; y1: number; x2: number; y2: number };
/**
 * A dragged box pulled onto the nearest edge or middle of the targets (its container and
 * the things beside it) when within `tol` pixels, across and down separately; the guide
 * lines show what it lines up with.
 */
export function snapBox(box: Box, targets: Box[], tol = 6): { box: Box; guides: Guide[] } {
  const xs = (b: Box) => [b.x, b.x + b.w / 2, b.x + b.w];
  const ys = (b: Box) => [b.y, b.y + b.h / 2, b.y + b.h];
  let best: { d: number; shift: number; at: number } | null = null;
  let bestY: { d: number; shift: number; at: number } | null = null;
  for (const t of targets) {
    for (const tx of xs(t)) for (const bx of xs(box)) {
      const d = Math.abs(tx - bx);
      if (d <= tol && (!best || d < best.d)) best = { d, shift: tx - bx, at: tx };
    }
    for (const ty of ys(t)) for (const by of ys(box)) {
      const d = Math.abs(ty - by);
      if (d <= tol && (!bestY || d < bestY.d)) bestY = { d, shift: ty - by, at: ty };
    }
  }
  const out = { ...box, x: box.x + (best?.shift ?? 0), y: box.y + (bestY?.shift ?? 0) };
  const guides: Guide[] = [];
  const all = [out, ...targets];
  if (best) guides.push({ x1: best.at, y1: Math.min(...all.map((b) => b.y)), x2: best.at, y2: Math.max(...all.map((b) => b.y + b.h)) });
  if (bestY) guides.push({ x1: Math.min(...all.map((b) => b.x)), y1: bestY.at, x2: Math.max(...all.map((b) => b.x + b.w)), y2: bestY.at });
  return { box: out, guides };
}

export type Gap = Guide & { length: number };
/**
 * The distances between two boxes (Alt over another element): the gaps across and down
 * when they're apart; from each edge inside when one holds the other.
 */
export function gapsBetween(a: Box, b: Box): Gap[] {
  const out: Gap[] = [];
  const midY = (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2;
  const midX = (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2;
  const yAcross = Number.isFinite(midY) && Math.max(a.y, b.y) < Math.min(a.y + a.h, b.y + b.h) ? midY : a.y + a.h / 2;
  const xDown = Number.isFinite(midX) && Math.max(a.x, b.x) < Math.min(a.x + a.w, b.x + b.w) ? midX : a.x + a.w / 2;
  const holds = (o: Box, i: Box) => i.x >= o.x && i.y >= o.y && i.x + i.w <= o.x + o.w && i.y + i.h <= o.y + o.h;
  if (holds(b, a) || holds(a, b)) {
    const [o, i] = holds(b, a) ? [b, a] : [a, b];
    const cx = i.x + i.w / 2;
    const cy = i.y + i.h / 2;
    out.push({ x1: o.x, y1: cy, x2: i.x, y2: cy, length: i.x - o.x });
    out.push({ x1: i.x + i.w, y1: cy, x2: o.x + o.w, y2: cy, length: o.x + o.w - i.x - i.w });
    out.push({ x1: cx, y1: o.y, x2: cx, y2: i.y, length: i.y - o.y });
    out.push({ x1: cx, y1: i.y + i.h, x2: cx, y2: o.y + o.h, length: o.y + o.h - i.y - i.h });
    return out.filter((g) => g.length > 0.5);
  }
  if (b.x >= a.x + a.w) out.push({ x1: a.x + a.w, y1: yAcross, x2: b.x, y2: yAcross, length: b.x - a.x - a.w });
  else if (a.x >= b.x + b.w) out.push({ x1: b.x + b.w, y1: yAcross, x2: a.x, y2: yAcross, length: a.x - b.x - b.w });
  if (b.y >= a.y + a.h) out.push({ x1: xDown, y1: a.y + a.h, x2: xDown, y2: b.y, length: b.y - a.y - a.h });
  else if (a.y >= b.y + b.h) out.push({ x1: xDown, y1: b.y + b.h, x2: xDown, y2: a.y, length: a.y - b.y - b.h });
  return out;
}

/** Alt+arrow: the nudge in screen directions (1 step; Shift = 10). */
export function nudgeOf(key: string, big: boolean): Pt | null {
  const n = big ? 10 : 1;
  if (key === "ArrowLeft") return { x: -n, y: 0 };
  if (key === "ArrowRight") return { x: n, y: 0 };
  if (key === "ArrowUp") return { x: 0, y: -n };
  if (key === "ArrowDown") return { x: 0, y: n };
  return null;
}

/**
 * How far a dragged box is from what's around it, as a design tool shows while dragging: to the
 * nearest thing beside it (or its holder's edge) on each of its four sides, along its middle.
 */
export function distancesAround(box: Box, holder: Box, others: Box[]): Gap[] {
  const out: Gap[] = [];
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const acrossY = (o: Box) => o.y < box.y + box.h && o.y + o.h > box.y;
  const acrossX = (o: Box) => o.x < box.x + box.w && o.x + o.w > box.x;
  const left = others.filter((o) => acrossY(o) && o.x + o.w <= box.x).reduce((m, o) => Math.max(m, o.x + o.w), holder.x);
  const right = others.filter((o) => acrossY(o) && o.x >= box.x + box.w).reduce((m, o) => Math.min(m, o.x), holder.x + holder.w);
  const top = others.filter((o) => acrossX(o) && o.y + o.h <= box.y).reduce((m, o) => Math.max(m, o.y + o.h), holder.y);
  const bottom = others.filter((o) => acrossX(o) && o.y >= box.y + box.h).reduce((m, o) => Math.min(m, o.y), holder.y + holder.h);
  if (box.x - left > 0.5) out.push({ x1: left, y1: cy, x2: box.x, y2: cy, length: box.x - left });
  if (right - box.x - box.w > 0.5) out.push({ x1: box.x + box.w, y1: cy, x2: right, y2: cy, length: right - box.x - box.w });
  if (box.y - top > 0.5) out.push({ x1: cx, y1: top, x2: cx, y2: box.y, length: box.y - top });
  if (bottom - box.y - box.h > 0.5) out.push({ x1: cx, y1: box.y + box.h, x2: cx, y2: bottom, length: bottom - box.y - box.h });
  return out;
}
