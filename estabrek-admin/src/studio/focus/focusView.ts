/**
 * Focus mode's camera: the zoom and pan that bring an opened element to the middle of the canvas, filling most
 * of it, and the glide there and back. Pure (tested).
 */
import type { Box, Pt } from "../geometry";

export type View = { zoom: number; pan: Pt };
export const FOCUS_ZOOM = { min: 0.1, max: 4 } as const;

/**
 * The view that shows `box` (on the canvas now, under `view`) at the middle of a canvas of `canvas` size, filling
 * `fill` of it, leaving `top` pixels free above (the path bar). Never closer than FOCUS_ZOOM.max.
 */
export function focusView(box: Box, view: View, canvas: { w: number; h: number }, fill = 0.78, top = 44): View {
  const w = box.w / view.zoom, h = box.h / view.zoom;
  const roomH = Math.max(1, canvas.h - top);
  const zoom = Math.min(FOCUS_ZOOM.max, Math.max(FOCUS_ZOOM.min, Math.min((canvas.w * fill) / Math.max(w, 1), (roomH * fill) / Math.max(h, 1))));
  const pageX = (box.x + box.w / 2 - view.pan.x) / view.zoom;
  const pageY = (box.y + box.h / 2 - view.pan.y) / view.zoom;
  return { zoom, pan: { x: canvas.w / 2 - pageX * zoom, y: top + roomH / 2 - pageY * zoom } };
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** The view `t` (0–1) of the way from `a` to `b`, easing out; the zoom glides evenly through its scale. */
export function viewAt(a: View, b: View, t: number): View {
  const k = easeOut(Math.min(1, Math.max(0, t)));
  // Zooming by a ratio (not a difference) keeps the speed even, close up and far away.
  const zoom = a.zoom * Math.pow(b.zoom / a.zoom, k);
  // The point that ends in the middle stays on its straight way there: pan follows the zoom.
  const s = (zoom - a.zoom) / ((b.zoom - a.zoom) || 1);
  const f = b.zoom === a.zoom ? k : s;
  return { zoom, pan: { x: a.pan.x + (b.pan.x - a.pan.x) * f, y: a.pan.y + (b.pan.y - a.pan.y) * f } };
}

/** Whether two views are the same, near enough. */
export const sameView = (a: View, b: View) => Math.abs(a.zoom - b.zoom) < 1e-3 && Math.abs(a.pan.x - b.pan.x) < 0.5 && Math.abs(a.pan.y - b.pan.y) < 0.5;
