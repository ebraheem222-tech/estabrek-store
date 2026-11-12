/**
 * The inspector beside what's selected (instead of docked at the side): where its panel floats, where the two
 * strips of section tabs stand (settings on one side of the element, its look and adding on the other), and the
 * view that brings a newly selected element to a comfortable size with room for the panel. Pure (tested); the
 * editor's preferences for it are kept in this browser.
 *
 * Sides are of the screen: "left" and "right" as seen, whatever the page's direction.
 */
import type { Box } from "./geometry";
import type { View } from "./focus/focusView";

export type Side = "left" | "right";
/** The groups of settings on each side of the element (InspectorNav's groups). */
export const SIDE_GROUPS: Record<Side, readonly string[]> = { left: ["content", "behaviour", "layout"], right: ["look", "motion", "decor"] };
export const sideOf = (group: string | null | undefined): Side => (group && SIDE_GROUPS.left.includes(group) ? "left" : "right");

export const PANEL_W = 288;
export const STRIP_W = 36;
const GAP = 8;
/** What a panel and a strip take beside the element. */
export const RESERVE = PANEL_W + STRIP_W + GAP * 3;

export type Rect = { x: number; y: number; w: number; h: number };
export type Place = {
  /** The panel, in the window's pixels. */
  panel: { left: number; top: number; maxHeight: number };
  /** The strips' top-left corners. */
  strips: Record<Side, { left: number; top: number }>;
  side: Side;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Where the panel and the strips go: `box` is the element on the canvas (the canvas's own pixels), `canvas` the
 * canvas in the window. The panel stands beyond the strip on its side; with no room there it stays inside the
 * canvas's edge (over the element's far part, never off the canvas). With no element (the page itself, or
 * nothing), it sits at the canvas's top corner on that side.
 */
export function besidePlace(box: Box | null, canvas: Rect, side: Side, stripH = 120): Place {
  const minLeft = canvas.x + 4, maxLeft = canvas.x + canvas.w - PANEL_W - 4;
  const top0 = canvas.y + 8;
  if (!box) {
    const left = side === "right" ? maxLeft : minLeft;
    return { side, panel: { left, top: top0, maxHeight: Math.max(160, canvas.h - 16) }, strips: { left: { left: -9999, top: 0 }, right: { left: -9999, top: 0 } } };
  }
  const ox = canvas.x + box.x, oy = canvas.y + box.y;
  const stripTop = clamp(oy, top0, canvas.y + canvas.h - stripH - 8);
  const strips = {
    left: { left: clamp(ox - GAP - STRIP_W, minLeft, canvas.x + canvas.w - STRIP_W - 4), top: stripTop },
    right: { left: clamp(ox + box.w + GAP, minLeft, canvas.x + canvas.w - STRIP_W - 4), top: stripTop },
  };
  const want = side === "right" ? strips.right.left + STRIP_W + GAP : strips.left.left - GAP - PANEL_W;
  // At the element's height, but high enough to be a good size (most of the canvas's height when it's low down).
  const tall = Math.min(560, canvas.h - 16);
  const top = clamp(Math.min(oy - 4, canvas.y + canvas.h - 8 - tall), top0, canvas.y + canvas.h - 248);
  return { side, strips, panel: { left: clamp(want, minLeft, maxLeft), top, maxHeight: Math.max(160, canvas.y + canvas.h - 8 - top) } };
}

/**
 * The view that brings a newly selected element to a comfortable size, in the part of the canvas the panel and
 * strips leave free: room on both sides when the element still shows well that way (so the panel can change sides
 * without the canvas moving), else on the side away from the panel. Null when it already sits well (wholly in that
 * part, neither tiny nor cramped): then the canvas doesn't move.
 */
export function frameFor(box: Box, view: View, canvas: { w: number; h: number }, side: Side, opts: { top?: number; maxZoom?: number; minZoom?: number } = {}): View | null {
  if (!(box.w > 0 && box.h > 0) || canvas.w < 320 || canvas.h < 200) return null;
  const top = opts.top ?? 48, bottom = 16;
  const w = box.w / view.zoom, h = box.h / view.zoom;
  const areaH = Math.max(80, canvas.h - top - bottom);
  const both = { x: RESERVE, w: canvas.w - 2 * RESERVE };
  const one = side === "right" ? { x: STRIP_W + GAP * 3, w: canvas.w - RESERVE - STRIP_W - GAP * 3 } : { x: RESERVE, w: canvas.w - RESERVE - STRIP_W - GAP * 3 };
  // The zoom an area would give it: something bigger than the area is fitted into it; something smaller is brought
  // closer only until it takes a good part of the area, and never closer than the cap (1.5 times its size).
  const zoomIn = (a: { w: number }) => {
    const fit = Math.min(a.w / w, areaH / h);
    const z = fit * 0.9 <= 1 ? fit * 0.9 : Math.min(opts.maxZoom ?? 1.5, Math.max(1, fit * 0.6));
    return clamp(z, opts.minZoom ?? 0.1, 4);
  };
  const area = both.w >= 240 && zoomIn(both) >= 0.75 * zoomIn(one) ? both : one;
  if (area.w < 120) return null;
  const want = zoomIn(area);
  // Already well placed: inside the free part, and close enough to the size it would be given.
  const inside = box.x >= area.x - 8 && box.x + box.w <= area.x + area.w + 8 && box.y >= top - 8 && box.y + box.h <= canvas.h - bottom + 8;
  if (inside && view.zoom >= want * 0.55 && view.zoom <= want * 1.3) return null;
  const pageX = (box.x + box.w / 2 - view.pan.x) / view.zoom;
  const pageY = (box.y + box.h / 2 - view.pan.y) / view.zoom;
  return { zoom: want, pan: { x: area.x + area.w / 2 - pageX * want, y: top + areaH / 2 - pageY * want } };
}

/* ------------------------------------------------------------------ preferences (this browser) */

const KEY = { dock: "estabrek.studio.dock", sections: "estabrek.studio.sections" } as const;
const read = (key: string) => { try { return typeof localStorage === "undefined" ? null : localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* kept for this visit only */ } };
/** Beside the element (the default) or docked at the side as before. */
export const dockPref = (): "beside" | "side" => (read(KEY.dock) === "side" ? "side" : "beside");
export const saveDock = (v: "beside" | "side") => write(KEY.dock, v);
/** One section of settings at a time (the default) or all of them in one long list. */
export const sectionsPref = (): boolean => read(KEY.sections) !== "all";
export const saveSections = (on: boolean) => write(KEY.sections, on ? "sections" : "all");
