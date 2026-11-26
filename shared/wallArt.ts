/**
 * «شوفها على حيطك»: a piece that hangs on a wall (a painting, a print, a mirror, a clock…) seen at its real size: in a
 * drawn room on the product page, and on the shopper's own wall through the phone's camera (estabrek-storefront
 * lib/wallAr.ts: WebXR on Android, AR Quick Look on an iPhone).
 *
 * Here: its size and frame as the owner set them (Product.wallWidthCm / wallHeightCm / wallFrame), a size read from
 * the name of the size chosen («50×70 سم», «٥٠×٧٠», «A3»), and where a picture goes on a wall the camera found.
 * Plain TypeScript: no React, no "@/" imports (the admin, the shop and the server's tests read it).
 */

export const WALL_FRAMES = ["none", "black", "white", "wood", "gold"] as const;
export type WallFrame = (typeof WALL_FRAMES)[number];
/** Centimetres: the smallest and largest piece a wall takes. */
export const WALL_CM = { min: 5, max: 500 } as const;
export type WallArt = { w: number; h: number; frame: WallFrame };

/** A frame's look: its colour and how wide it shows (cm). "none": a canvas print, its edge only. */
export const FRAME_LOOK: Record<WallFrame, { color: string; cm: number }> = {
  none: { color: "#d9d4cc", cm: 0 },
  black: { color: "#1c1c1c", cm: 2.5 },
  white: { color: "#f4f2ee", cm: 2.5 },
  wood: { color: "#a0703f", cm: 3 },
  gold: { color: "#c9a44c", cm: 3.5 },
};

const cm = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= WALL_CM.min && v <= WALL_CM.max ? Math.round(v * 10) / 10 : null);

/** The product's wall size as it may be shown, or null (not a piece for a wall). */
export function wallArtOf(p: { wallWidthCm?: unknown; wallHeightCm?: unknown; wallFrame?: unknown } | null | undefined): WallArt | null {
  if (!p) return null;
  const w = cm(p.wallWidthCm), h = cm(p.wallHeightCm);
  if (w === null || h === null) return null;
  const frame = typeof p.wallFrame === "string" && (WALL_FRAMES as readonly string[]).includes(p.wallFrame) ? (p.wallFrame as WallFrame) : "none";
  return { w, h, frame };
}

// Paper sizes, portrait (cm).
const PAPER: Record<string, [number, number]> = { A0: [84.1, 118.9], A1: [59.4, 84.1], A2: [42, 59.4], A3: [29.7, 42], A4: [21, 29.7], A5: [14.8, 21] };
const DIGITS: Record<string, string> = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9", "٫": ".", "،": "," };

/**
 * A size read from a size's name: «50×70», «50 x 70 cm», «٥٠×٧٠ سم», «50*70», «0.5×0.7 م», «20×30 in» or a paper
 * size («A3»). Width first, as people write it. Null when the name says no size (S, M, «كبير»…).
 */
export function sizeFromName(name: unknown): { w: number; h: number } | null {
  if (typeof name !== "string") return null;
  const s = name.replace(/[٠-٩۰-۹٫،]/g, (d) => DIGITS[d] ?? d).trim();
  const paper = /\b(A[0-5])\b/i.exec(s);
  const m = /(\d+(?:[.,]\d+)?)\s*(?:[x×X*✕]|\bby\b|في)\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|m|in|inch|inches|"|سم|مم|م|انش|إنش)?/i.exec(s);
  if (!m) {
    if (!paper) return null;
    const [w, h] = PAPER[paper[1].toUpperCase()];
    return { w, h };
  }
  const unit = (m[3] ?? "").toLowerCase();
  const k = unit === "mm" || unit === "مم" ? 0.1 : unit === "m" || unit === "م" ? 100 : unit === "in" || unit === "inch" || unit === "inches" || unit === '"' || unit === "انش" || unit === "إنش" ? 2.54 : 1;
  const w = cm(parseFloat(m[1].replace(",", ".")) * k), h = cm(parseFloat(m[2].replace(",", ".")) * k);
  return w !== null && h !== null ? { w, h } : null;
}

/** What to show: the size chosen's own size when its name says one, else the product's. */
export function wallSizeFor(art: WallArt, sizeName?: string | null): WallArt {
  const own = sizeFromName(sizeName);
  return own ? { ...art, ...own } : art;
}

type V3 = [number, number, number];
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Where a picture hangs on the surface the camera found (a hit test's pose, a 4×4 column-major matrix whose y axis
 * is the surface's normal). Only a wall takes it (a surface standing up, within ~30° of upright): its face toward the
 * room, its top up. The rotation is a 3×3 column-major matrix (x right, y up, z out of the wall), or null for a
 * floor, a table, a ceiling.
 */
export function wallPose(m: ArrayLike<number>): { position: V3; basis: number[] } | null {
  const n = norm([m[4], m[5], m[6]]);
  if (Math.abs(n[1]) > 0.5) return null;
  // The wall's own "up": the world's up with the part along the normal taken away.
  const up = norm([-n[0] * n[1], 1 - n[1] * n[1], -n[2] * n[1]]);
  const right = norm(cross(up, n));
  return { position: [m[12], m[13], m[14]], basis: [...right, ...up, ...n] };
}

/**
 * The drawn room (the product page's «على حيطك»): how many pixels a centimetre is when `wallCm` of wall fills
 * `widthPx`, and the piece's box in it (centred, its middle at eye level, 150 cm, or above the sofa's back when it
 * would come down onto it).
 */
export const ROOM = { wallCm: 360, eyeCm: 150, sofaCm: 210, sofaBackCm: 85, floorCm: 0 } as const;
export function roomBox(art: { w: number; h: number }, widthPx: number, frameCm = 0) {
  const k = widthPx / ROOM.wallCm;
  const w = art.w + frameCm * 2, h = art.h + frameCm * 2;
  // Its lowest edge stays 20 cm over the sofa's back.
  const middle = Math.max(ROOM.eyeCm, ROOM.sofaBackCm + 20 + h / 2);
  return { pxPerCm: k, w: w * k, h: h * k, left: (ROOM.wallCm - w) / 2 * k, bottomCm: middle - h / 2 };
}
