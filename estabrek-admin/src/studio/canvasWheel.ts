/**
 * What the wheel does over the page on the canvas. The page scrolls inside its frame; but a frame bigger than the
 * canvas (zoomed in, or brought closer for a pick) has parts the canvas doesn't show, and the page's scroll alone
 * never brings those into sight: the top of the page stays above the canvas, its end below it. So the wheel scrolls
 * the page as far as it goes, and what is left of it then moves the canvas until that edge of the frame is in sight
 * (never further: the frame doesn't wander off). Pure (tested).
 */
import type { Pt } from "./geometry";
import type { View } from "./focus/focusView";

export type WheelPage = { scroll: Pt; doc: { w: number; h: number }; viewport: { w: number; h: number } };
export type WheelStep = {
  /** For the page, in its own pixels. */
  scroll: Pt;
  /** For the canvas, in screen pixels (added to the pan). */
  pan: Pt;
};

const EDGE = 24;

function axis(delta: number, zoom: number, at: number, max: number, lo: number, size: number, room: number): { scroll: number; pan: number } {
  if (!delta) return { scroll: 0, pan: 0 };
  // The page first: as far as it still scrolls that way.
  const left = delta > 0 ? Math.max(0, max - at) * zoom : Math.max(0, at) * zoom;
  const taken = Math.min(Math.abs(delta), left);
  const rest = Math.abs(delta) - taken;
  let pan = 0;
  if (rest > 0) {
    // Then the canvas, until the frame's edge on that side shows (with a little room around it).
    const hidden = delta > 0 ? lo + size - (room - EDGE) : EDGE - lo;
    if (hidden > 0) pan = Math.min(rest, hidden) * (delta > 0 ? -1 : 1);
  }
  return { scroll: taken ? (taken * Math.sign(delta)) / zoom : 0, pan };
}

/**
 * One turn of the wheel (`delta`, screen pixels) over a frame of `frame` size (page pixels) shown under `view` on a
 * canvas of `canvas` size. Without the page's measures (not heard from yet) it all goes to the page, as before.
 */
export function wheelOver(delta: Pt, view: View, frame: { w: number; h: number }, canvas: { w: number; h: number }, page: WheelPage | null): WheelStep {
  if (!page || !(view.zoom > 0)) return { scroll: { x: delta.x / (view.zoom || 1), y: delta.y / (view.zoom || 1) }, pan: { x: 0, y: 0 } };
  const x = axis(delta.x, view.zoom, page.scroll.x, Math.max(0, page.doc.w - page.viewport.w), view.pan.x, frame.w * view.zoom, canvas.w);
  const y = axis(delta.y, view.zoom, page.scroll.y, Math.max(0, page.doc.h - page.viewport.h), view.pan.y, frame.h * view.zoom, canvas.h);
  return { scroll: { x: x.scroll, y: y.scroll }, pan: { x: x.pan, y: y.pan } };
}
