import type { CatalogProduct } from "@/lib/catalog";

export type ProductBadgeKind = "new" | "limited";
export type ProductBadge = { kind: ProductBadgeKind; ar: string; en: string };

/** Products added within this window are labelled "new". */
const NEW_FOR_DAYS = 30;
/**
 * At or below this many pieces left (across all colours/sizes) the card says how
 * many remain ("آخر قطعة", "باقي قطعتان"). A vague "limited quantity" on most of a
 * small boutique's pieces read like a sales trick; an exact count reads true.
 */
const LIMITED_AT = 3;

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

/** How many pieces are left when only a few remain, otherwise "new" for recent arrivals. */
export function getProductBadge(p: CatalogProduct, now = Date.now()): ProductBadge | null {
  const created = Date.parse(String((p as any).createdAt ?? ""));
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
  if (counted && stock > 0 && stock <= LIMITED_AT) {
    if (stock === 1) return { kind: "limited", ar: "آخر قطعة", en: "Last one" };
    return { kind: "limited", ar: stock === 2 ? "باقي قطعتان" : `باقي ${stock} قطع`, en: `Only ${stock} left` };
  }
  if (Number.isFinite(created) && now - created <= NEW_FOR_DAYS * 86_400_000) return { kind: "new", ar: "جديد", en: "New" };
  return null;
}
