/**
 * Sparkling stars on a picture (docs/cms-big-engine-plan.ar.md A3+): where they go, and what they look like.
 *
 * Where: the picture's pixels (small, about 320 px across) are read once, in the editor's frame, never on a
 * shopper's phone:
 *  - corners (Harris: where the light changes in two directions at once: a gem's facet, a buckle's tip),
 *  - edges (Sobel: where it changes at all: an outline),
 *  - highlights (the brightest spots, as on polished metal or satin),
 * then the strongest points, spread apart, as fractions of the picture (0–1) so they stay put at any size. A
 * cut-out picture (transparent around the product) can keep the stars on the product only.
 *
 * Look: a star's drawing (a four-pointed glint, a six-pointed star, a soft flare, a cross of light), as SVG paths in
 * a 24×24 box. Plain TypeScript: no React, no "@/" imports (the admin and the shop both import it).
 */

export type SparkleMode = "corners" | "edges" | "highlights" | "all";
export type SparklePoint = { x: number; y: number; s?: number };
export type SparkleShape = "glint" | "star" | "flare" | "cross";
export const SPARKLE_SHAPES: SparkleShape[] = ["glint", "star", "flare", "cross"];
export const SPARKLE_LIMITS = { points: 80, size: [4, 64], speed: [0.3, 6] } as const;

/** The stars' drawings, in a 24×24 box (filled with the star's colour). */
export const SPARKLE_PATHS: Record<SparkleShape, string> = {
  glint: "M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z",
  star: "M12 1L14.2 8.2L21.5 6.5L16.4 12L21.5 17.5L14.2 15.8L12 23L9.8 15.8L2.5 17.5L7.6 12L2.5 6.5L9.8 8.2Z",
  flare: "M12 4A8 8 0 1 0 12 20A8 8 0 1 0 12 4ZM11.4 0H12.6L12.9 12L12.6 24H11.4L11.1 12ZM0 11.4V12.6L12 12.9L24 12.6V11.4L12 11.1Z",
  cross: "M11.3 0H12.7L13.2 10.8L24 11.3V12.7L13.2 13.2L12.7 24H11.3L10.8 13.2L0 12.7V11.3L10.8 10.8Z",
};

export type FindOptions = { mode?: SparkleMode; count?: number; spread?: number; productOnly?: boolean };

/**
 * The strongest places for stars in a picture's pixels (RGBA, `w`×`h`), as fractions of it, strongest first.
 * `count` stars at most, at least `spread` (a fraction of the picture's longer side) apart.
 */
export function findSparkles(px: Uint8ClampedArray, w: number, h: number, opts: FindOptions = {}): SparklePoint[] {
  const mode = opts.mode ?? "all", count = Math.max(1, Math.min(SPARKLE_LIMITS.points, Math.round(opts.count ?? 18)));
  const spread = Math.max(0.005, Math.min(0.5, opts.spread ?? 0.06));
  if (w < 3 || h < 3 || px.length < w * h * 4) return [];
  // Light (0–1) and whether a pixel is part of the product (not see-through).
  const L = new Float32Array(w * h), solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3] / 255;
    L[i] = ((0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255) * a + (1 - a);
    solid[i] = a > 0.5 ? 1 : 0;
  }
  const at = (x: number, y: number) => L[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  // Sobel gradients.
  const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      gx[y * w + x] = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      gy[y * w + x] = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
    }
  // Harris response over a 5×5 window, and the edges' strength.
  const score = new Float32Array(w * h);
  let top = 0;
  for (let y = 2; y < h - 2; y++)
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      if (opts.productOnly && !solid[i]) continue;
      let sxx = 0, syy = 0, sxy = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const j = (y + dy) * w + x + dx;
          sxx += gx[j] * gx[j]; syy += gy[j] * gy[j]; sxy += gx[j] * gy[j];
        }
      const corner = Math.max(0, sxx * syy - sxy * sxy - 0.04 * (sxx + syy) * (sxx + syy));
      const edge = Math.hypot(gx[i], gy[i]);
      const light = L[i];
      const v =
        mode === "corners" ? corner
        : mode === "edges" ? edge * (0.4 + 0.6 * light)
        : mode === "highlights" ? Math.max(0, light - 0.7) * (1 + edge)
        : Math.sqrt(corner) * (0.5 + light) + Math.max(0, light - 0.8) * 2;
      score[i] = v;
      if (v > top) top = v;
    }
  if (top <= 0) return [];
  // Local tops only, then the strongest first, kept `spread` apart.
  const tops: Array<{ x: number; y: number; v: number }> = [];
  const r = 2;
  for (let y = 2; y < h - 2; y++)
    for (let x = 2; x < w - 2; x++) {
      const v = score[y * w + x];
      if (v < top * 0.06) continue;
      let peak = true;
      for (let dy = -r; dy <= r && peak; dy++) for (let dx = -r; dx <= r; dx++) if ((dx || dy) && score[(y + dy) * w + x + dx] > v) { peak = false; break; }
      if (peak) tops.push({ x, y, v });
    }
  tops.sort((a, b) => b.v - a.v);
  const apart = spread * Math.max(w, h);
  const out: SparklePoint[] = [];
  for (const t of tops) {
    if (out.length >= count) break;
    if (out.some((o) => Math.hypot(o.x * w - t.x, o.y * h - t.y) < apart)) continue;
    out.push({ x: Math.round((t.x / w) * 1000) / 1000, y: Math.round((t.y / h) * 1000) / 1000, s: Math.round((0.6 + 0.6 * Math.sqrt(t.v / top)) * 100) / 100 });
  }
  return out;
}

/**
 * Points found on the picture's own pixels, moved to where the picture shows them in its box (object-fit cover
 * crops it, contain leaves room around it); the ones cropped away drop out.
 */
export function toShownBox(points: SparklePoint[], natural: { w: number; h: number }, box: { w: number; h: number }, fit: string, position: { x: number; y: number } = { x: 0.5, y: 0.5 }): SparklePoint[] {
  if (!natural.w || !natural.h || !box.w || !box.h) return points;
  let sw = box.w, sh = box.h;
  if (fit === "cover" || fit === "contain" || fit === "scale-down") {
    const k = fit === "cover" ? Math.max(box.w / natural.w, box.h / natural.h) : Math.min(box.w / natural.w, box.h / natural.h, fit === "scale-down" ? 1 : Infinity);
    sw = natural.w * k; sh = natural.h * k;
  } else if (fit === "none") {
    sw = natural.w; sh = natural.h;
  }
  const ox = (box.w - sw) * position.x, oy = (box.h - sh) * position.y;
  return points
    .map((p) => ({ ...p, x: (ox + p.x * sw) / box.w, y: (oy + p.y * sh) / box.h }))
    .filter((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)
    .map((p) => ({ ...p, x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 }));
}

/* ------------------------------------------------------------------ the saved stars, as the shop draws them */

export type Sparkle = {
  points: SparklePoint[];
  shape?: SparkleShape;
  /** A colour (#hex) or the store's ("accent"), white by default. */
  color?: string;
  /** The stars' size in px (each point may be bigger or smaller: `s`). */
  size?: number;
  /** Seconds for one twinkle. */
  speed?: number;
  /** Always twinkling, only while the pointer is on the picture, or a few times as the page opens. */
  when?: "always" | "hover" | "few";
  glow?: boolean;
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const COLOR_TOKENS = ["accent", "accent-soft", "text", "white"];
const inRange = (v: unknown, [lo, hi]: readonly [number, number]) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** A saved set of stars the shop may draw (checked again as the backend did), or null. */
export function safeSparkle(raw: unknown): Sparkle | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.points)) return null;
  const points = r.points
    .filter((p): p is SparklePoint => Boolean(p) && typeof p === "object" && inRange((p as SparklePoint).x, [0, 1]) && inRange((p as SparklePoint).y, [0, 1]))
    .slice(0, SPARKLE_LIMITS.points)
    .map((p) => (inRange(p.s, [0.2, 3]) ? { x: p.x, y: p.y, s: p.s } : { x: p.x, y: p.y }));
  if (!points.length) return null;
  const out: Sparkle = { points };
  if (typeof r.shape === "string" && (SPARKLE_SHAPES as string[]).includes(r.shape)) out.shape = r.shape as SparkleShape;
  if (typeof r.color === "string" && (HEX.test(r.color) || COLOR_TOKENS.includes(r.color))) out.color = r.color;
  if (inRange(r.size, SPARKLE_LIMITS.size)) out.size = r.size as number;
  if (inRange(r.speed, SPARKLE_LIMITS.speed)) out.speed = r.speed as number;
  if (r.when === "always" || r.when === "hover" || r.when === "few") out.when = r.when;
  if (r.glow === true) out.glow = true;
  return out;
}

/** A star's colour as CSS (the store's colours through their variables). */
export const sparkleColour = (c: string | undefined) => (!c || c === "white" ? "#fff" : c === "accent" ? "var(--accent)" : c === "accent-soft" ? "var(--accent-soft)" : c === "text" ? "var(--text)" : c);
