// State, validation and save payload for the one-screen product page (add and edit).
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
  /** Editing: the saved photo this is (kept when it stays in its colour). */
  imageId?: string;
  /** Editing: the colour it was saved under. */
  origItemId?: string;
};

export type ColorGroup = {
  key: string;
  name: string;
  hex: string | null;
  /** Photo keys in order; the first one is the main photo. */
  photoKeys: string[];
  /** The owner typed the name herself: detection must not rename it. */
  nameTouched?: boolean;
  /** Editing: the saved colour row, and what the page doesn't edit but must keep. */
  itemId?: string;
  skuBase?: string;
  boxLabel?: string;
  /** Hidden from the store (a colour with orders that was removed, or hidden on purpose). */
  hidden?: boolean;
};

/** What was loaded, so a save of an existing product updates rows instead of adding new ones. */
export type EditMeta = {
  productId: string;
  isActive: boolean;
  /** `${groupKey}:${sizeId}` → saved variant id */
  variantIds: Record<string, string>;
  loadedStock: Record<string, number>;
  loadedLow: Record<string, number>;
  itemIds: string[];
  imageIds: string[];
};

export type ComposerDraft = {
  title: string;
  categoryId: string;
  description: string;
  /** Kind of product (أنواع المنتجات); null = the store's first type. */
  typeId: string | null;
  /** The type's fields: { fieldKey: value }. */
  attributes: Record<string, unknown>;
  /** Bookings: date/time (datetime-local, the browser's time) and place. */
  event: { startsAt: string; endsAt: string; location: string };
  /** Search-engine title and description; empty = the product's own title and description. */
  seoTitle: string;
  seoDescription: string;
  price: string;
  onSale: boolean;
  compareAt: string;
  sizeIds: string[];
  /** Stock per colour and size: key `${groupKey}:${sizeId}`. Missing = defaultStock. */
  stock: Record<string, string>;
  defaultStock: string;
  /** Different price for some sizes (advanced). */
  priceBySize: Record<string, string>;
  /** Per colour × size (key `${groupKey}:${sizeId}`): own SKU, price, low-stock alert. Missing = automatic. */
  skus: Record<string, string>;
  priceBy: Record<string, string>;
  lowBy: Record<string, string>;
  slug: string;
  slugTouched: boolean;
  lowStock: string;
  groups: ColorGroup[];
  photos: Record<string, ComposerPhoto>;
  /** Set when editing a saved product. */
  edit?: EditMeta;
};

let seq = 0;
export const newKey = (prefix = "k") => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function emptyDraft(partial?: Partial<ComposerDraft>): ComposerDraft {
  return {
    title: "",
    categoryId: "",
    description: "",
    typeId: null,
    attributes: {},
    event: { startsAt: "", endsAt: "", location: "" },
    seoTitle: "",
    seoDescription: "",
    price: "",
    onSale: false,
    compareAt: "",
    sizeIds: [],
    stock: {},
    defaultStock: "3",
    priceBySize: {},
    skus: {},
    priceBy: {},
    lowBy: {},
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

export function lowOf(d: ComposerDraft, groupKey: string, sizeId: string): number {
  const raw = d.lowBy[stockKey(groupKey, sizeId)] ?? d.lowStock;
  return Math.max(0, parseInt(String(raw ?? "").replace(/[^\d]/g, "") || "0", 10) || 0);
}

/** The price a colour × size sells for: its own, else its size's, else the product price. */
export function priceOf(d: ComposerDraft, groupKey: string, sizeId: string): number {
  const own = parsePrice(d.priceBy[stockKey(groupKey, sizeId)] ?? "");
  if (own && own > 0) return own;
  const bySize = parsePrice(d.priceBySize[sizeId] ?? "");
  if (bySize && bySize > 0) return bySize;
  return parsePrice(d.price) ?? 0;
}

/** Tidy a typed SKU: capitals, no spaces or odd signs (kept readable for labels and scanners). */
export function cleanSku(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9._\-/]+/g, "").replace(/-+/g, "-").slice(0, 60);
}

export function effectiveSlug(d: ComposerDraft) {
  return d.slugTouched && d.slug.trim() ? makeSlug(d.slug) : makeSlug(d.title);
}

export function categoryLabel(c: CatalogCategory, all: CatalogCategory[]) {
  const parent = c.parentId ? all.find((p) => p.id === c.parentId) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
}

/* ------------------------------------------------------------ checks */

export type ComposerErrors = Partial<Record<"photos" | "title" | "category" | "price" | "compareAt" | "sizes" | "colors" | "uploads" | "skus", string>>;

export function validateDraft(d: ComposerDraft, opts: { publish: boolean; sizes?: CatalogSize[] }): ComposerErrors {
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
    const names = d.groups.map((g) => `${g.name.trim()}|${(g.boxLabel ?? "").trim()}`);
    if (d.groups.some((g) => !g.name.trim())) e.colors = "اكتبي اسم كل لون";
    else if (new Set(names).size !== names.length) e.colors = "يوجد لونان بنفس الاسم";
  }
  const dup = duplicateSkus(d, opts.sizes ?? []);
  if (dup.length) e.skus = `نفس كود SKU مكتوب أكثر من مرة: ${dup.join("، ")}`;
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

/** Automatic SKU for every colour × size: PRODUCT-COLOUR-SIZE (a saved colour keeps its own base). */
export function autoSkus(d: ComposerDraft, sizes: CatalogSize[], opts?: { skuSalt?: string }): Record<string, string> {
  const prefix = skuPart(effectiveSlug(d), 16) + (opts?.skuSalt ? `-${opts.skuSalt.toUpperCase()}` : "");
  const usedCodes = new Set<string>();
  const sizeById = new Map(sizes.map((s) => [s.id, s]));
  const out: Record<string, string> = {};
  d.groups.forEach((g, gi) => {
    let code = colorCode(g.name) || `C${gi + 1}`;
    if (usedCodes.has(code)) code = `${code}${gi + 1}`;
    usedCodes.add(code);
    const base = g.skuBase?.trim() && !opts?.skuSalt ? g.skuBase.trim() : `${prefix}-${code}`;
    const usedSize = new Set<string>();
    d.sizeIds.forEach((sid, si) => {
      let sc = skuPart(sizeById.get(sid)?.name ?? "", 12) || `S${si + 1}`;
      if (usedSize.has(sc)) sc = `${sc}-${si + 1}`;
      usedSize.add(sc);
      out[stockKey(g.key, sid)] = `${base}-${sc}`;
    });
  });
  return out;
}

/** The SKU each colour × size will be saved with (typed, else automatic). */
export function finalSkus(d: ComposerDraft, sizes: CatalogSize[], opts?: { skuSalt?: string }): Record<string, string> {
  const auto = autoSkus(d, sizes, opts);
  const out: Record<string, string> = {};
  for (const [key, sku] of Object.entries(auto)) out[key] = cleanSku(d.skus[key] ?? "") || sku;
  return out;
}

export function duplicateSkus(d: ComposerDraft, sizes: CatalogSize[]): string[] {
  const seen = new Map<string, number>();
  for (const sku of Object.values(finalSkus(d, sizes))) seen.set(sku, (seen.get(sku) ?? 0) + 1);
  return [...seen].filter(([, n]) => n > 1).map(([sku]) => sku);
}

const groupBase = (d: ComposerDraft, g: ColorGroup, skus: Record<string, string>) => {
  if (g.skuBase?.trim()) return g.skuBase.trim();
  const first = d.sizeIds.map((sid) => skus[stockKey(g.key, sid)]).find(Boolean) ?? "";
  return first.replace(/-[^-]+$/, "") || first || "SKU";
};

/**
 * Colours, photos and size variants for PUT /products/:id/full.
 * New product: everything is new. Editing: saved rows keep their ids, and only
 * what changed is sent for stock/alerts (so a sale in the meantime isn't undone).
 */
export function buildItems(d: ComposerDraft, sizes: CatalogSize[], opts?: { skuSalt?: string; keepUnchangedStock?: boolean }): NonNullable<ProductDeepUpdateBody["items"]> {
  const compareAt = d.onSale ? parsePrice(d.compareAt) : null;
  const skus = finalSkus(d, sizes, opts);
  const edit = d.edit;

  return d.groups.map((g) => {
    const photos = g.photoKeys.map((k) => d.photos[k]).filter((p): p is ComposerPhoto => Boolean(p?.url));
    return {
      ...(g.itemId ? { id: g.itemId } : {}),
      colorName: g.name.trim(),
      ...(g.boxLabel ? { boxLabel: g.boxLabel } : {}),
      colorHex: g.hex,
      skuBase: groupBase(d, g, skus),
      isActive: !g.hidden,
      images: photos.map((p, i) => ({
        // A saved photo moved to another colour is added there anew (and removed from the old one).
        ...(p.imageId && g.itemId && p.origItemId === g.itemId ? { id: p.imageId } : {}),
        url: p.url!,
        position: i,
        isPrimary: i === 0,
        alt: `${d.title.trim()} — ${g.name.trim()}`,
      })),
      variants: d.sizeIds.map((sid) => {
        const key = stockKey(g.key, sid);
        const variantId = edit?.variantIds[key];
        const price = priceOf(d, g.key, sid);
        const stock = stockOf(d, g.key, sid);
        const low = lowOf(d, g.key, sid);
        const unchangedStock = Boolean(variantId && opts?.keepUnchangedStock && edit?.loadedStock[key] === stock);
        const unchangedLow = Boolean(variantId && opts?.keepUnchangedStock && edit?.loadedLow[key] === low);
        return {
          ...(variantId ? { id: variantId } : {}),
          sizeId: sid,
          sku: skus[key],
          price,
          compareAt: compareAt && compareAt > price ? compareAt : null,
          ...(unchangedStock ? {} : { stock }),
          ...(unchangedLow ? {} : { lowStockThreshold: low }),
        };
      }),
    };
  });
}

/** Rows of the saved product that this save removes. */
export function removedIds(d: ComposerDraft) {
  const edit = d.edit;
  if (!edit) return { deleteItemIds: [], deleteImageIds: [], deleteVariantIds: [] };
  const keptItems = new Set(d.groups.map((g) => g.itemId).filter(Boolean) as string[]);
  const keptImages = new Set<string>();
  for (const g of d.groups) for (const k of g.photoKeys) {
    const p = d.photos[k];
    if (p?.imageId && g.itemId && p.origItemId === g.itemId) keptImages.add(p.imageId);
  }
  const keptVariants = new Set<string>();
  for (const g of d.groups) for (const sid of d.sizeIds) {
    const id = edit.variantIds[stockKey(g.key, sid)];
    if (id) keptVariants.add(id);
  }
  const allVariants = Object.values(edit.variantIds);
  return {
    deleteItemIds: edit.itemIds.filter((id) => !keptItems.has(id)),
    deleteImageIds: edit.imageIds.filter((id) => !keptImages.has(id)),
    // Sizes of removed colours go with the colour.
    deleteVariantIds: allVariants.filter((id) => !keptVariants.has(id)),
  };
}

/* ----------------------------------------------------- edit a saved product */

/** A draft of a saved product, keeping every id so the save updates it in place. */
export function draftForEdit(p: ProductDeep): ComposerDraft {
  const items = (p.items ?? []).filter((it) => it.colorName !== "Default" || (it.images?.length ?? 0) > 0 || (it.variants ?? []).some((v) => Number(v.price) > 0) || p.items.length === 1);
  const variants = items.flatMap((it) => it.variants ?? []);
  const sizeIds: string[] = [];
  for (const v of [...variants].sort((a, b) => (a.size?.order ?? 0) - (b.size?.order ?? 0))) if (!sizeIds.includes(v.sizeId)) sizeIds.push(v.sizeId);
  // The most common price is the product price; others are kept per colour × size.
  const counts = new Map<number, number>();
  for (const v of variants) counts.set(Number(v.price), (counts.get(Number(v.price)) ?? 0) + 1);
  const base = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? NaN;
  const compares = variants.map((v) => Number(v.compareAt ?? 0)).filter((n) => n > 0);
  const compare = compares.length ? Math.max(...compares) : NaN;
  const lows = new Map<number, number>();
  for (const v of variants) lows.set(v.lowStockThreshold ?? 0, (lows.get(v.lowStockThreshold ?? 0) ?? 0) + 1);
  const low = [...lows].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 2;

  const photos: Record<string, ComposerPhoto> = {};
  const stock: Record<string, string> = {};
  const skus: Record<string, string> = {};
  const priceBy: Record<string, string> = {};
  const lowBy: Record<string, string> = {};
  const meta: EditMeta = { productId: p.id, isActive: p.isActive, variantIds: {}, loadedStock: {}, loadedLow: {}, itemIds: [], imageIds: [] };
  const groups: ColorGroup[] = items.map((it) => {
    const key = newKey("g");
    meta.itemIds.push(it.id);
    const photoKeys: string[] = [];
    for (const im of [...(it.images ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)) {
      const pk = newKey("p");
      photos[pk] = { key: pk, url: im.url, preview: im.url, status: "done", color: it.colorHex ?? null, imageId: im.id, origItemId: it.id };
      photoKeys.push(pk);
      meta.imageIds.push(im.id);
    }
    for (const v of it.variants ?? []) {
      const k = stockKey(key, v.sizeId);
      meta.variantIds[k] = v.id;
      meta.loadedStock[k] = v.stock ?? 0;
      meta.loadedLow[k] = v.lowStockThreshold ?? 0;
      stock[k] = String(v.stock ?? 0);
      skus[k] = v.sku;
      if (Number(v.price) !== base) priceBy[k] = String(Number(v.price));
      if ((v.lowStockThreshold ?? 0) !== low) lowBy[k] = String(v.lowStockThreshold ?? 0);
    }
    // A size this colour doesn't have yet starts at 0 when added.
    for (const sid of sizeIds) if (stock[stockKey(key, sid)] === undefined) stock[stockKey(key, sid)] = "0";
    return {
      key,
      name: it.colorName === "Default" ? "لون واحد" : it.colorName,
      hex: it.colorHex ?? null,
      photoKeys,
      nameTouched: true,
      itemId: it.id,
      skuBase: it.skuBase,
      boxLabel: it.boxLabel || undefined,
      hidden: it.isActive === false,
    };
  });
  return emptyDraft({
    title: p.title,
    slug: p.slug,
    slugTouched: true,
    categoryId: p.categoryId,
    description: p.description ?? "",
    typeId: p.typeId ?? null,
    attributes: (p.attributes as Record<string, unknown> | null) ?? {},
    event: eventOf(p),
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    price: Number.isFinite(base) && base > 0 ? String(base) : "",
    onSale: Number.isFinite(compare) && compare > base,
    compareAt: Number.isFinite(compare) && compare > base ? String(compare) : "",
    sizeIds,
    stock,
    defaultStock: "0",
    skus,
    priceBy,
    lowBy,
    lowStock: String(low),
    groups,
    photos,
    edit: meta,
  });
}

/** Has anything changed since the draft was loaded? (photo previews/upload state don't count) */
export function draftSignature(d: ComposerDraft) {
  const photos = Object.fromEntries(Object.entries(d.photos).map(([k, p]) => [k, p.url ?? p.key]));
  const { photos: _p, edit: _e, ...rest } = d;
  return JSON.stringify({ ...rest, photos });
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
    typeId: p.typeId ?? null,
    attributes: (p.attributes as Record<string, unknown> | null) ?? {},
    event: eventOf(p),
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

/** ISO time → the value of an <input type="datetime-local"> (the browser's own time). */
export function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO time (null when empty or invalid). */
export function fromLocalInput(v: string) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function eventOf(p: { eventStartsAt?: string | null; eventEndsAt?: string | null; eventLocation?: string | null }) {
  return { startsAt: toLocalInput(p.eventStartsAt), endsAt: toLocalInput(p.eventEndsAt), location: p.eventLocation ?? "" };
}

/** The booking's when/where as the server takes them. */
export function eventForSave(d: Pick<ComposerDraft, "event">) {
  return {
    eventStartsAt: fromLocalInput(d.event?.startsAt ?? ""),
    eventEndsAt: fromLocalInput(d.event?.endsAt ?? ""),
    eventLocation: d.event?.location?.trim() || null,
  };
}
