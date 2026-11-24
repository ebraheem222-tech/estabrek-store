/**
 * The theme library's pointer tricks as the page tree's settings (PointerParts.tsx draws them), safe and bounded:
 * a picture's flashlight (a second picture seen through a light that follows the pointer) and a section's trail
 * (pictures left along the pointer's way).
 */
const SRC = /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/i;
const src = (v: unknown) => (typeof v === "string" && v.length <= 2000 && SRC.test(v) ? v : null);

export type FlashSpec = { src: string; radius: number };
export function flashOf(raw: unknown): FlashSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const s = src(r.src);
  if (!s) return null;
  return { src: s, radius: typeof r.radius === "number" && r.radius >= 60 && r.radius <= 400 ? r.radius : 170 };
}

export type TrailSpec = { images: string[]; size: number };
export function trailOf(raw: unknown): TrailSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const images = (Array.isArray(r.images) ? r.images : []).map(src).filter((x): x is string => Boolean(x)).slice(0, 8);
  if (!images.length) return null;
  return { images, size: typeof r.size === "number" && r.size >= 80 && r.size <= 280 ? Math.round(r.size) : 140 };
}
