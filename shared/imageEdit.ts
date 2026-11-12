/**
 * A picture's edit (docs/cms-big-engine-plan.ar.md A3): what's kept of it (crop), its turn and mirror, its light,
 * contrast, colour, warmth and sharpness, and ready filters that set those. The editor previews it in its frame with
 * CSS (recipeCss); the backend makes the real picture from the original with sharp (its lib/imageEdit.ts reads the
 * same numbers), so the shop shows a ready file and no shopper's phone does the work. The original stays, so an edit
 * is changed or undone later. Plain TypeScript: no React, no "@/" imports.
 */

export type Crop = { x: number; y: number; w: number; h: number };
export type Recipe = {
  /** What's kept, as fractions of the turned picture. */
  crop?: Crop;
  rotate?: 0 | 90 | 180 | 270;
  flipX?: boolean;
  flipY?: boolean;
  /** Each from -1 to 1 (0 = as it is). */
  light?: number;
  contrast?: number;
  saturate?: number;
  warmth?: number;
  /** 0 to 1. */
  sharpen?: number;
  /** Black and white. */
  mono?: boolean;
};

export const FILTERS = ["none", "warm", "cool", "mono", "soft", "vivid", "vintage"] as const;
export type Filter = (typeof FILTERS)[number];
/** What a ready filter sets (the sliders take it from there). */
export const FILTER_RECIPE: Record<Filter, Partial<Recipe>> = {
  none: { light: 0, contrast: 0, saturate: 0, warmth: 0, mono: false },
  warm: { warmth: 0.45, saturate: 0.1, mono: false },
  cool: { warmth: -0.45, saturate: 0.05, mono: false },
  mono: { mono: true, contrast: 0.15 },
  soft: { contrast: -0.25, light: 0.08, saturate: -0.2, mono: false },
  vivid: { saturate: 0.45, contrast: 0.15, mono: false },
  vintage: { warmth: 0.35, saturate: -0.35, contrast: -0.1, mono: false },
};

export const RATIOS: Array<[string, number | null]> = [["free", null], ["1:1", 1], ["4:5", 4 / 5], ["3:4", 3 / 4], ["4:3", 4 / 3], ["16:9", 16 / 9], ["9:16", 9 / 16]];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * The crop for a ratio (width / height), a zoom (1 = as big as the ratio allows) and where its middle is (0–1 each
 * way, kept inside), as fractions of a picture of `aspect` (its width / height).
 */
export function cropFor(ratio: number | null, zoom: number, mid: { x: number; y: number }, aspect: number): Crop {
  const z = clamp(zoom, 1, 8);
  let w = 1, h = 1;
  if (ratio && aspect > 0) {
    if (ratio > aspect) h = aspect / ratio;
    else w = ratio / aspect;
  }
  w /= z;
  h /= z;
  const x = clamp(mid.x - w / 2, 0, 1 - w), y = clamp(mid.y - h / 2, 0, 1 - h);
  return { x: r3(x), y: r3(y), w: r3(w), h: r3(h) };
}

/** An edit the backend and the preview may use: values in range, nothing else. */
export function safeRecipe(raw: unknown): Recipe {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? r3(clamp(v, lo, hi)) : undefined);
  const out: Recipe = {};
  const c = r.crop as Record<string, unknown> | undefined;
  if (c && typeof c === "object") {
    const x = n(c.x, 0, 1), y = n(c.y, 0, 1), w = n(c.w, 0.01, 1), h = n(c.h, 0.01, 1);
    if (x !== undefined && y !== undefined && w !== undefined && h !== undefined && x + w <= 1.0005 && y + h <= 1.0005 && (x > 0 || y > 0 || w < 1 || h < 1)) out.crop = { x, y, w, h };
  }
  if (r.rotate === 90 || r.rotate === 180 || r.rotate === 270) out.rotate = r.rotate;
  if (r.flipX === true) out.flipX = true;
  if (r.flipY === true) out.flipY = true;
  for (const k of ["light", "contrast", "saturate", "warmth"] as const) {
    const v = n(r[k], -1, 1);
    if (v) out[k] = v;
  }
  const s = n(r.sharpen, 0, 1);
  if (s) out.sharpen = s;
  if (r.mono === true) out.mono = true;
  return out;
}

export const isPlain = (r: Recipe) => Object.keys(safeRecipe(r)).length === 0;

/**
 * The crop (measured on the turned and mirrored picture, as the backend cuts it) on the original picture, where
 * CSS cuts before it turns: the mirror is undone, then the turn.
 */
export function cropOnOriginal(c: Crop, r: Pick<Recipe, "rotate" | "flipX" | "flipY">): Crop {
  let { x, y } = c;
  const { w, h } = c;
  if (r.flipX) x = 1 - x - w;
  if (r.flipY) y = 1 - y - h;
  const out = r.rotate === 90 ? { x: y, y: 1 - x - w, w: h, h: w }
    : r.rotate === 180 ? { x: 1 - x - w, y: 1 - y - h, w, h }
    : r.rotate === 270 ? { x: 1 - y - h, y: x, w: h, h: w }
    : { x, y, w, h };
  return { x: r3(out.x), y: r3(out.y), w: r3(out.w), h: r3(out.h) };
}

/**
 * The edit as CSS, for the editor's live look in its frame: a filter, a turn and mirror, and the crop
 * (object-view-box). Close to what sharp makes, not the same to the pixel.
 */
export function recipeCss(raw: Recipe): { filter: string; transform: string; viewBox: string } {
  const r = safeRecipe(raw);
  const f: string[] = [];
  if (r.light) f.push(`brightness(${r3(1 + r.light * 0.6)})`);
  if (r.contrast) f.push(`contrast(${r3(1 + r.contrast * 0.8)})`);
  if (r.mono) f.push("grayscale(1)");
  else if (r.saturate) f.push(`saturate(${r3(1 + r.saturate)})`);
  if (r.warmth && !r.mono) f.push(r.warmth > 0 ? `sepia(${r3(r.warmth * 0.35)})` : `hue-rotate(${r3(r.warmth * -18)}deg) saturate(${r3(1 + r.warmth * -0.1)})`);
  const t: string[] = [];
  if (r.rotate) t.push(`rotate(${r.rotate}deg)`);
  if (r.flipX || r.flipY) t.push(`scale(${r.flipX ? -1 : 1}, ${r.flipY ? -1 : 1})`);
  const c = r.crop ? cropOnOriginal(r.crop, r) : undefined;
  const pct = (v: number) => `${r3(v * 100)}%`;
  return {
    filter: f.join(" "),
    transform: t.join(" "),
    viewBox: c ? `inset(${pct(c.y)} ${pct(1 - c.x - c.w)} ${pct(1 - c.y - c.h)} ${pct(c.x)})` : "",
  };
}
