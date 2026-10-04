import type { CatalogItem, CatalogProduct, CatalogVariant } from "@/lib/catalog";
import { getProductPrimaryImage } from "@/lib/catalog";

/** Shared by the rose product page, quick view and quick add. */

const isModel = (url?: string | null) => /\.(glb|gltf)(\?|#|$)/i.test(String(url ?? ""));
const renderable = (im?: { url?: string | null; view?: string | null } | null) =>
  Boolean(im?.url) && !isModel(im!.url) && String(im!.view ?? "").toLowerCase() !== "3d";

export function itemHex(item?: CatalogItem | null) {
  const raw = item?.colorHex || item?.suggestedColors?.[0] || "";
  if (!raw) return null;
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
}

/** Photos for a colour: its own first, else any colour's, else the product's own. */
export function imagesFor(product: CatalogProduct, item?: CatalogItem | null): string[] {
  const out: string[] = [];
  const push = (url?: string | null) => { if (url && !isModel(url) && !out.includes(url)) out.push(url); };
  const sorted = (list?: CatalogItem["images"]) =>
    (list ?? []).filter(renderable).sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)) || (a.position ?? 0) - (b.position ?? 0));
  sorted(item?.images).forEach((im) => push(im.url));
  push(item?.primaryImageUrl);
  push(item?.secondaryImageUrl);
  if (!out.length) {
    (((product as any).images ?? []) as Array<{ url?: string; view?: string }>).filter(renderable).forEach((im) => push(im.url));
    push(getProductPrimaryImage(product));
    for (const other of product.items ?? []) sorted(other.images).forEach((im) => push(im.url));
  }
  return out;
}

export const sizeKeyOf = (v: CatalogVariant) => (v.size?.name ?? "").trim() || "default";
export const inStock = (v?: CatalogVariant | null) => Boolean(v) && (v!.stock == null || v!.stock > 0);
