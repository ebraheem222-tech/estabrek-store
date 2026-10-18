import type { CatalogProduct } from "@/lib/catalog";
import { piecesLeftText, SCARCITY_MAX, showsLeft, type ScarcitySettings } from "@/lib/scarcity";

export type ProductBadgeKind = "new" | "limited";
export type ProductBadge = {
  kind: ProductBadgeKind;
  ar: string;
  en: string;
  /** "limited": pieces left across all colours and sizes. */
  left?: number;
  /** "limited": also a recent arrival, so it reads "new" when the count is hidden. */
  isNew?: boolean;
};

/** Products added within this window are labelled "new". */
const NEW_FOR_DAYS = 30;
const NEW: ProductBadge = { kind: "new", ar: "جديد", en: "New" };

function isModelUrl(url?: string | null) {
  const clean = String(url ?? "").trim().toLowerCase().split("?")[0].split("#")[0];
  return clean.endsWith(".glb") || clean.endsWith(".gltf");
}

function renderable(im?: { url?: string | null; view?: string | null } | null) {
  if (!im?.url || isModelUrl(im.url)) return false;
  return String(im.view ?? "").trim().toLowerCase() !== "3d";
}

/** A second photo (back view, fabric detail…) to reveal on hover. */
export function getProductSecondaryImage(p: CatalogProduct, primary?: string | null): string | null {
  if (p.secondaryImageUrl) return p.secondaryImageUrl;
  const seen = new Set([String(primary ?? "").trim().toLowerCase()]);
  const pick = (url?: string | null) => {
    const value = String(url ?? "").trim();
    if (!value || seen.has(value.toLowerCase())) return null;
    return value;
  };
  for (const im of ((p as any).images ?? []) as Array<{ url?: string | null; view?: string | null }>) {
    if (!renderable(im)) continue;
    const url = pick(im.url);
    if (url) return url;
  }
  const first = p.items?.[0];
  for (const im of first?.images ?? []) {
    if (!renderable(im)) continue;
    const url = pick(im.url);
    if (url) return url;
  }
  return null;
}

/**
 * How many pieces are left when only a few remain, otherwise "new" for recent arrivals.
 * The count is an exact one ("آخر قطعة", "باقي قطعتان"): a vague "limited quantity" on
 * most of a small boutique's pieces read like a sales trick. Counts go up to the
 * highest the owner can pick; `visibleBadge` applies the owner's setting where it's shown.
 */
export function getProductBadge(p: CatalogProduct, now = Date.now()): ProductBadge | null {
  const created = Date.parse(String((p as any).createdAt ?? ""));
  const isNew = Number.isFinite(created) && now - created <= NEW_FOR_DAYS * 86_400_000;
  let stock = 0;
  let counted = false;
  for (const item of p.items ?? []) {
    for (const v of (item as any).variants ?? []) {
      if (typeof v?.stock === "number") {
        counted = true;
        stock += Math.max(0, v.stock);
      }
    }
  }
  if (counted && stock > 0 && stock <= SCARCITY_MAX) {
    return { kind: "limited", ar: piecesLeftText(stock, true), en: piecesLeftText(stock, false), left: stock, isNew };
  }
  return isNew ? NEW : null;
}

/** The badge to show on a photo with the owner's "pieces left" setting (admin → تنبيهات المخزون). */
export function visibleBadge(badge: ProductBadge | null | undefined, scarcity: ScarcitySettings): ProductBadge | null {
  if (!badge) return null;
  if (badge.kind !== "limited") return badge;
  if (showsLeft(scarcity, badge.left, "photo")) return badge;
  return badge.isNew ? NEW : null;
}
