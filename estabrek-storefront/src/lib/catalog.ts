// Lightweight public catalog types (keep flexible; backend may evolve).

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  iconUrl?: string | null;
  children?: CatalogCategory[];
};

export type CatalogImage = {
  id?: string;
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  position?: number;
  blurDataUrl?: string | null;
  view?: string | null;
};

export type CatalogSize = { id: string; name: string; value?: string | null };

export type CatalogVariant = {
  id: string;
  sizeId?: string | null;
  sku?: string | null;
  price: any;
  compareAt?: any;
  originalPrice?: any;
  salePrice?: any;
  saleStartsAt?: string | Date | null;
  saleEndsAt?: string | Date | null;
  stock?: number | null;
  size?: CatalogSize | null;
};

export type CatalogItem = {
  id: string;
  colorName?: string | null;
  boxLabel?: string | null;
  colorHex?: string | null;
  // Palette extracted / suggested for UI swatches (array of hex strings)
  suggestedColors?: string[] | null;
  images?: CatalogImage[];
  // convenience fields from backend
  primaryImageUrl?: string | null;
  secondaryImageUrl?: string | null;
  variants?: CatalogVariant[];
};

export type CatalogProduct = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: CatalogCategory | null;
  items?: CatalogItem[];
  minPrice?: number | null;
  // convenience fields from backend
  primaryImageUrl?: string | null;
  secondaryImageUrl?: string | null;
  defaultItemId?: string | null;
};

export type CatalogProductsList = {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets?: {
    colors: Array<{ name: string; hex?: string | null; count: number }>;
    sizes: Array<{ id: string; name: string; count: number }>;
  };
};

function normalizeLabel(value?: string | null): string {
  return String(value ?? "").trim();
}

export function catalogItemKey(
  it: { colorName?: string | null; boxLabel?: string | null },
  idx = 0
): string {
  const name = normalizeLabel(it.colorName);
  const box = normalizeLabel(it.boxLabel);
  if (name) return box ? `${name}::${box}` : name;
  return `__item_${idx}`;
}

export function catalogItemLabel(
  it: { colorName?: string | null; boxLabel?: string | null },
  idx = 0
): string {
  const name = normalizeLabel(it.colorName) || `Color ${idx + 1}`;
  const box = normalizeLabel(it.boxLabel);
  return box ? `${name} — ${box}` : name;
}

function num(v: any): number | null {
  if (v == null) return null;

  // Prisma Decimal / Decimal.js / objects with toString()
  if (typeof v === "object") {
    if (typeof v.toNumber === "function") {
      const n = v.toNumber();
      return Number.isFinite(n) ? n : null;
    }
    if (typeof v.toString === "function") {
      const s = v.toString();
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function isModelUrl(url?: string | null): boolean {
  const raw = String(url ?? "").trim().toLowerCase();
  if (!raw) return false;
  const clean = raw.split("?")[0].split("#")[0];
  return clean.endsWith(".glb") || clean.endsWith(".gltf");
}

function isRenderableImage(im?: { url?: string | null; view?: string | null } | null): boolean {
  if (!im?.url) return false;
  if (isModelUrl(im.url)) return false;
  const view = String(im.view ?? "").trim().toLowerCase();
  if (view === "3d") return false;
  return true;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSaleActive(now: Date, startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

function getEffectiveVariantPrice(v: CatalogVariant, now = new Date()): number | null {
  const base = num(v.price);
  const salePrice = num((v as any).salePrice);
  if (salePrice == null || salePrice <= 0) return base;
  const start = toDate((v as any).saleStartsAt);
  const end = toDate((v as any).saleEndsAt);
  return isSaleActive(now, start, end) ? salePrice : base;
}

export function getProductPrimaryImage(p: CatalogProduct): string | null {
  const images = (p as any).images as Array<{ url?: string; isPrimary?: boolean }> | undefined;
  if (Array.isArray(images) && images.length) {
    const primary = images.find((im) => im.isPrimary && isRenderableImage(im))?.url ?? images.find((im) => isRenderableImage(im))?.url;
    if (primary) return primary;
  }

  if ((p as any).image) {
    const single = String((p as any).image).trim();
    if (single && !isModelUrl(single)) return single;
  }

  if (p.primaryImageUrl) return p.primaryImageUrl;
  const items = p.items ?? [];
  for (const it of items) {
    const imgs = it.images ?? [];
    const primary = imgs.find((im) => im.isPrimary && isRenderableImage(im)) ?? imgs.find((im) => isRenderableImage(im)) ?? null;
    if (primary?.url) return primary.url;
  }
  return null;
}

export function getProductImageBlurDataUrl(p: CatalogProduct, url?: string | null): string | null {
  const target = String(url ?? "").trim();
  if (!target) return null;
  if (isModelUrl(target)) return null;

  const productImages = (p as any).images as Array<{ url?: string; blurDataUrl?: string | null }> | undefined;
  if (Array.isArray(productImages)) {
    const hit = productImages.find((im) => im?.url === target);
    if (hit?.blurDataUrl) return hit.blurDataUrl;
  }

  for (const it of p.items ?? []) {
    for (const im of it.images ?? []) {
      if ((im as any)?.url === target) return (im as any)?.blurDataUrl ?? null;
    }
  }

  return null;
}

export function getProductMinPrice(p: CatalogProduct): number | null {
  if (typeof p.minPrice === "number") return p.minPrice;
  let out: number | null = null;
  for (const it of p.items ?? []) {
    for (const v of it.variants ?? []) {
      const price = getEffectiveVariantPrice(v);
      if (price == null) continue;
      if (out == null || price < out) out = price;
    }
  }
  return out;
}

export function formatMoney(amount: number | null, currencyCode?: string | null): string {
  if (amount == null) return "";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return "";
  const code = currencyCode || "ILS";
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency: code }).format(n);
  } catch {
    // Lightweight symbol mapping fallback.
    const sym = code === "USD" ? "$" : code === "EUR" ? "€" : "₪";
    return `${sym}${n.toFixed(2)}`;
  }
}
