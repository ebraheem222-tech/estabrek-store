// Lightweight public catalog types (keep flexible; backend may evolve).

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: CatalogCategory[];
};

export type CatalogImage = {
  id?: string;
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  position?: number;
};

export type CatalogSize = { id: string; name: string; value?: string | null };

export type CatalogVariant = {
  id: string;
  sku?: string | null;
  price: any;
  stock?: number | null;
  size?: CatalogSize | null;
};

export type CatalogItem = {
  id: string;
  colorName?: string | null;
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

export function getProductPrimaryImage(p: CatalogProduct): string | null {
  const images = (p as any).images as Array<{ url?: string; isPrimary?: boolean }> | undefined;
  if (Array.isArray(images) && images.length) {
    const primary = images.find((im) => im.isPrimary)?.url ?? images[0]?.url;
    if (primary) return primary;
  }

  if ((p as any).image) {
    const single = String((p as any).image).trim();
    if (single) return single;
  }

  if (p.primaryImageUrl) return p.primaryImageUrl;
  const items = p.items ?? [];
  for (const it of items) {
    const imgs = it.images ?? [];
    const primary = imgs.find((im) => im.isPrimary) ?? imgs[0];
    if (primary?.url) return primary.url;
  }
  return null;
}

export function getProductMinPrice(p: CatalogProduct): number | null {
  if (typeof p.minPrice === "number") return p.minPrice;
  let out: number | null = null;
  for (const it of p.items ?? []) {
    for (const v of it.variants ?? []) {
      const price = num(v.price);
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
