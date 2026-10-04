// State, validation and save payload for the one-screen "add product" page.
import type { CatalogCategory, CatalogSize, ProductDeep, ProductDeepUpdateBody } from "../../../api/catalog.api";
import { colorCode, makeSlug, parsePrice, skuPart } from "../../../lib/productComposer";

export type PhotoStatus = "queued" | "uploading" | "done" | "error";

export type ComposerPhoto = {
  key: string;
  /** Uploaded URL (set once the upload finished, or for photos copied from another product). */
  url?: string;
  /** What the page shows: a local blob preview until the upload finishes. */
  preview: string;
  file?: File;
  status: PhotoStatus;
  color?: string | null;
  error?: string;
};

export type ColorGroup = {
  key: string;
  name: string;
  hex: string | null;
  /** Photo keys in order; the first one is the main photo. */
  photoKeys: string[];
  /** The owner typed the name herself: detection must not rename it. */
  nameTouched?: boolean;
};

export type ComposerDraft = {
  title: string;
  categoryId: string;
  description: string;
  price: string;
  onSale: boolean;
  compareAt: string;
  sizeIds: string[];
  /** Stock per colour and size: key `${groupKey}:${sizeId}`. Missing = defaultStock. */
  stock: Record<string, string>;
  defaultStock: string;
  /** Different price for some sizes (advanced). */
  priceBySize: Record<string, string>;
  slug: string;
  slugTouched: boolean;
  lowStock: string;
  groups: ColorGroup[];
  photos: Record<string, ComposerPhoto>;
};

let seq = 0;
export const newKey = (prefix = "k") => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function emptyDraft(partial?: Partial<ComposerDraft>): ComposerDraft {
  return {
    title: "",
    categoryId: "",
    description: "",
    price: "",
    onSale: false,
    compareAt: "",
    sizeIds: [],
    stock: {},
    defaultStock: "3",
    priceBySize: {},
    slug: "",
    slugTouched: false,
    lowStock: "2",
    groups: [],
    photos: {},
    ...partial,
  };
}

export const stockKey = (groupKey: string, sizeId: string) => `${groupKey}:${sizeId}`;

export function stockOf(d: ComposerDraft, groupKey: string, sizeId: string): number {
  const raw = d.stock[stockKey(groupKey, sizeId)] ?? d.defaultStock;
  const n = parseInt(String(raw).replace(/[^\d]/g, "") || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

export function effectiveSlug(d: ComposerDraft) {
  return d.slugTouched && d.slug.trim() ? makeSlug(d.slug) : makeSlug(d.title);
}

export function categoryLabel(c: CatalogCategory, all: CatalogCategory[]) {
  const parent = c.parentId ? all.find((p) => p.id === c.parentId) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

/* ------------------------------------------------------------ checks */

export type ComposerErrors = Partial<Record<"photos" | "title" | "category" | "price" | "compareAt" | "sizes" | "colors" | "uploads", string>>;

export function validateDraft(d: ComposerDraft, opts: { publish: boolean }): ComposerErrors {
  const e: ComposerErrors = {};
  const photos = Object.values(d.photos);
  if (!d.title.trim()) e.title = "اكتبي اسم المنتج";
  if (!d.categoryId) e.category = "اختاري القسم";
  const price = parsePrice(d.price);
  if (price == null || price <= 0) e.price = "اكتبي السعر";
  if (d.onSale) {
    const before = parsePrice(d.compareAt);
    if (before == null || price == null || before <= price) e.compareAt = "السعر قبل الخصم لازم يكون أعلى من السعر الحالي";
  }
  if (!d.sizeIds.length) e.sizes = "اختاري مقاساً واحداً على الأقل";
  if (!d.groups.length) e.colors = "أضيفي لوناً واحداً على الأقل";
  else {
    const names = d.groups.map((g) => g.name.trim());
    if (names.some((n) => !n)) e.colors = "اكتبي اسم كل لون";
    else if (new Set(names).size !== names.length) e.colors = "يوجد لونان بنفس الاسم";
  }
  if (opts.publish && !photos.length) e.photos = "أضيفي صورة واحدة على الأقل قبل النشر";
  if (opts.publish && d.groups.some((g) => !g.photoKeys.length)) e.photos = "كل لون يحتاج صورة قبل النشر";
  if (photos.some((p) => p.status === "error")) e.uploads = "بعض الصور لم تُرفع. أعيدي المحاولة أو احذفيها";
  return e;
}

/** What is still missing, as a checklist for the side panel. */
export function checklist(d: ComposerDraft) {
  const price = parsePrice(d.price);
  return [
    { key: "photos", label: "الصور", done: Object.keys(d.photos).length > 0 && d.groups.every((g) => g.photoKeys.length > 0) },
    { key: "title", label: "اسم المنتج", done: Boolean(d.title.trim()) },
    { key: "category", label: "القسم", done: Boolean(d.categoryId) },
    { key: "price", label: "السعر", done: price != null && price > 0 },
    { key: "sizes", label: "المقاسات والكمية", done: d.sizeIds.length > 0 && d.groups.length > 0 },
  ];
}

/* ------------------------------------------------------------ payload */

/** Colours, photos and size variants for PUT /products/:id/full (all new). */
export function buildItems(d: ComposerDraft, sizes: CatalogSize[], opts?: { skuSalt?: string }): NonNullable<ProductDeepUpdateBody["items"]> {
  const slug = effectiveSlug(d);
  const prefix = skuPart(slug, 24) + (opts?.skuSalt ? `-${opts.skuSalt.toUpperCase()}` : "");
  const price = parsePrice(d.price) ?? 0;
  const compareAt = d.onSale ? parsePrice(d.compareAt) : null;
  const low = Math.max(0, parseInt(d.lowStock || "0", 10) || 0);
  const usedCodes = new Set<string>();
  const sizeById = new Map(sizes.map((s) => [s.id, s]));

  return d.groups.map((g, gi) => {
    let code = colorCode(g.name) || `C${gi + 1}`;
    if (usedCodes.has(code)) code = `${code}${gi + 1}`;
    usedCodes.add(code);
    const skuBase = `${prefix}-${code}`;
    const usedSize = new Set<string>();
    return {
      colorName: g.name.trim(),
      colorHex: g.hex,
      skuBase,
      isActive: true,
      images: g.photoKeys
        .map((k) => d.photos[k])
        .filter((p): p is ComposerPhoto => Boolean(p?.url))
        .map((p, i) => ({ url: p.url!, position: i, isPrimary: i === 0, alt: `${d.title.trim()} — ${g.name.trim()}` })),
      variants: d.sizeIds.map((sid, si) => {
        let sc = skuPart(sizeById.get(sid)?.name ?? "", 12) || `S${si + 1}`;
        if (usedSize.has(sc)) sc = `${sc}-${si + 1}`;
        usedSize.add(sc);
        const sizePrice = parsePrice(d.priceBySize[sid] ?? "");
        const variantPrice = sizePrice && sizePrice > 0 ? sizePrice : price;
        return {
          sizeId: sid,
          sku: `${skuBase}-${sc}`,
          price: variantPrice,
          compareAt: compareAt && compareAt > variantPrice ? compareAt : null,
          stock: stockOf(d, g.key, sid),
          lowStockThreshold: low,
        };
      }),
    };
  });
}

/* ------------------------------------------------- copy from a product */

/** A new draft that starts from an existing product ("نسخ منتج" / "منتج مشابه"). */
export function draftFromProduct(p: ProductDeep, opts: { keepPhotos: boolean; titleSuffix?: string }): ComposerDraft {
  const items = (p.items ?? []).filter((it) => it.colorName !== "Default" || (it.images?.length ?? 0) > 0 || p.items.length === 1);
  const firstVariant = items.flatMap((it) => it.variants ?? [])[0];
  const price = firstVariant ? Number(firstVariant.price) : NaN;
  const compare = firstVariant?.compareAt != null ? Number(firstVariant.compareAt) : NaN;
  const sizeIds: string[] = [];
  for (const it of items) for (const v of it.variants ?? []) if (!sizeIds.includes(v.sizeId)) sizeIds.push(v.sizeId);
  const photos: Record<string, ComposerPhoto> = {};
  const stock: Record<string, string> = {};
  const groups: ColorGroup[] = items.map((it) => {
    const key = newKey("g");
    const photoKeys: string[] = [];
    if (opts.keepPhotos) {
      for (const im of [...(it.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)) {
        const pk = newKey("p");
        photos[pk] = { key: pk, url: im.url, preview: im.url, status: "done", color: it.colorHex ?? null };
        photoKeys.push(pk);
      }
    }
    for (const v of it.variants ?? []) stock[stockKey(key, v.sizeId)] = String(v.stock ?? 0);
    return { key, name: it.colorName === "Default" ? "لون واحد" : it.colorName, hex: it.colorHex ?? null, photoKeys, nameTouched: true };
  });
  return emptyDraft({
    title: opts.titleSuffix ? `${p.title}${opts.titleSuffix}` : "",
    categoryId: p.categoryId,
    description: p.description ?? "",
    price: Number.isFinite(price) && price > 0 ? String(price) : "",
    onSale: Number.isFinite(compare) && compare > price,
    compareAt: Number.isFinite(compare) && compare > price ? String(compare) : "",
    sizeIds,
    stock: opts.keepPhotos ? stock : {},
    groups: opts.keepPhotos ? groups : [],
    photos,
  });
}

/* ------------------------------------------------------ local storage */

const DRAFT_KEY = "estabrek_admin_product_draft_v1";
const PREFS_KEY = "estabrek_admin_product_prefs_v1";

export type ComposerPrefs = { recentCategories: string[]; sizesByCategory: Record<string, string[]>; defaultStock?: string };

export function readPrefs(): ComposerPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return { recentCategories: v.recentCategories ?? [], sizesByCategory: v.sizesByCategory ?? {}, defaultStock: v.defaultStock };
  } catch {
    return { recentCategories: [], sizesByCategory: {} };
  }
}

export function rememberChoices(d: ComposerDraft) {
  const prefs = readPrefs();
  if (d.categoryId) {
    prefs.recentCategories = [d.categoryId, ...prefs.recentCategories.filter((c) => c !== d.categoryId)].slice(0, 6);
    if (d.sizeIds.length) prefs.sizesByCategory[d.categoryId] = d.sizeIds;
  }
  prefs.defaultStock = d.defaultStock;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage blocked */ }
}

/** Saved work in progress. Photos still uploading can't be kept, uploaded ones can. */
export function saveDraftLocally(d: ComposerDraft) {
  const photos: Record<string, ComposerPhoto> = {};
  for (const [k, p] of Object.entries(d.photos)) if (p.url) photos[k] = { key: k, url: p.url, preview: p.url, status: "done", color: p.color ?? null };
  const groups = d.groups.map((g) => ({ ...g, photoKeys: g.photoKeys.filter((k) => photos[k]) }));
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, photos, groups, savedAt: Date.now() })); } catch { /* storage blocked */ }
}

export function readLocalDraft(): (ComposerDraft & { savedAt: number }) | null {
  try {
    const v = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!v || typeof v !== "object" || !Array.isArray(v.groups)) return null;
    return { ...emptyDraft(), ...v };
  } catch {
    return null;
  }
}

export function clearLocalDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage blocked */ }
}

/** Anything worth keeping? (an empty page is not a draft) */
export function hasContent(d: ComposerDraft) {
  return Boolean(d.title.trim() || d.price.trim() || Object.keys(d.photos).length || d.description.trim());
}
