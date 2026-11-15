/**
 * A live effect on a picture, drawn by the graphics card (WebGL) in the shop: the picture is a texture on a
 * canvas laid exactly over it, and a small program bends it:
 *  - ripple: rings of water spread from where the pointer is,
 *  - liquid: the picture flows a little while the pointer is on it,
 *  - shift: its red and blue slide apart round the pointer (a lens's colour split),
 *  - reveal: it comes out of a soft grain the first time it scrolls into view.
 * The picture itself stays in the page under the canvas (for search engines, for people who can't see it, and for
 * whoever asked for less motion or whose browser can't do it): at rest the page shows the picture, not the canvas.
 *
 * Here: the kinds, how a picture's setting is read, and where a point of the picture's box falls in the picture
 * (object-fit and object-position, the same sum the shader does). Plain TypeScript: no React, no "@/" imports
 * (the admin and the shop both import it).
 */

export const PICTURE_FX = ["ripple", "liquid", "shift", "reveal"] as const;
export type PictureFxKind = (typeof PICTURE_FX)[number];
export type PictureFx = { kind: PictureFxKind; strength?: number };
export const PICTURE_FX_STRENGTH = { min: 0.1, max: 1, normal: 0.6 } as const;
/** At most this many pictures draw at once (a browser allows only so many WebGL canvases on a page). */
export const PICTURE_FX_LIVE = 6;
/** The kinds that answer the pointer (the other plays once, when the picture comes into view). */
export const pictureFxOnPointer = (kind: PictureFxKind) => kind !== "reveal";

/** A picture's effect as it may be drawn (its kind known, its strength in range), or null. */
export function pictureFxOf(raw: unknown): PictureFx | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { kind?: unknown; strength?: unknown };
  if (typeof r.kind !== "string" || !(PICTURE_FX as readonly string[]).includes(r.kind)) return null;
  const s = typeof r.strength === "number" && Number.isFinite(r.strength) ? Math.max(PICTURE_FX_STRENGTH.min, Math.min(PICTURE_FX_STRENGTH.max, r.strength)) : undefined;
  return { kind: r.kind as PictureFxKind, ...(s !== undefined ? { strength: s } : {}) };
}

export type Size = { w: number; h: number };
/**
 * Where a point of the picture's box (0–1 across and down) falls in the picture itself (0–1), as CSS places it:
 * `cover` fills the box and cuts what is left over, `contain` shows it whole with empty bands; `focus` is
 * object-position as fractions (0.5, 0.5 is the middle). Null in a contained picture's empty bands.
 */
export function fitUv(x: number, y: number, box: Size, pic: Size, fit: "cover" | "contain", focus = { x: 0.5, y: 0.5 }): { u: number; v: number } | null {
  if (!(box.w > 0 && box.h > 0 && pic.w > 0 && pic.h > 0)) return null;
  const rb = box.w / box.h, ri = pic.w / pic.h;
  if (fit === "cover") {
    // The part of the picture that shows: all of it one way, a share of it the other.
    const sx = Math.min(1, rb / ri), sy = Math.min(1, ri / rb);
    return { u: (1 - sx) * focus.x + x * sx, v: (1 - sy) * focus.y + y * sy };
  }
  // The part of the box the picture takes.
  const sx = Math.min(1, ri / rb), sy = Math.min(1, rb / ri);
  const u = (x - (1 - sx) * focus.x) / sx, v = (y - (1 - sy) * focus.y) / sy;
  return u < 0 || u > 1 || v < 0 || v > 1 ? null : { u, v };
}

/** The canvas's size in real pixels for a box on a screen: the screen's own density up to 2, and no more than `most` pixels in all. */
export function canvasSize(box: Size, density: number, most = 1_600_000): Size {
  const d = Math.max(1, Math.min(2, density || 1));
  let w = Math.max(1, Math.round(box.w * d)), h = Math.max(1, Math.round(box.h * d));
  if (w * h > most) {
    const k = Math.sqrt(most / (w * h));
    w = Math.max(1, Math.floor(w * k));
    h = Math.max(1, Math.floor(h * k));
  }
  return { w, h };
}
