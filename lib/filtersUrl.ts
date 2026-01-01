// src/lib/filtersUrl.ts
// Canonical, URL-driven filters for SEO + shareable links.

export type CatalogFilters = {
  colors: string[];
  sizeIds: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  q?: string;
  inStock?: boolean;
  categoryId?: string;
  lm?: 1 | true;
};

function getFirst(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function uniqCaseInsensitive(list: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of list) {
    const key = raw.toLowerCase();
    if (!seen.has(key)) seen.set(key, raw);
  }
  return Array.from(seen.values());
}

export function normalizeFiltersFromSearchParams(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const colorsRaw = parseCsv(getFirst(sp, "colors") ?? getFirst(sp, "color") ?? "");
  const sizeRaw = parseCsv(getFirst(sp, "sizeIds") ?? getFirst(sp, "sizeId") ?? "");

  let colors = uniqCaseInsensitive(colorsRaw);
  let sizeIds = uniqCaseInsensitive(sizeRaw);

  // stable ordering (canonical)
  colors = colors.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  sizeIds = sizeIds.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const minStr = getFirst(sp, "minPrice") ?? getFirst(sp, "min");
  const maxStr = getFirst(sp, "maxPrice") ?? getFirst(sp, "max");
  const minPrice = minStr != null && minStr !== "" ? Number(minStr) : undefined;
  const maxPrice = maxStr != null && maxStr !== "" ? Number(maxStr) : undefined;

  const sort = getFirst(sp, "sort") ?? undefined;

  const q = getFirst(sp, "q") ?? undefined;
  const inStockStr = getFirst(sp, "inStock");
  const inStock = inStockStr === "1" || inStockStr === "true" ? true : undefined;
  const categoryId = getFirst(sp, "categoryId") ?? undefined;
  const pageStr = getFirst(sp, "page");
  const page = pageStr ? Math.max(1, Number(pageStr) || 1) : undefined;
  const lmStr = getFirst(sp, "lm");
  const lm = lmStr === "1" || lmStr === "true" ? 1 : undefined;

  let out: CatalogFilters = { colors, sizeIds };
  if (Number.isFinite(minPrice as any)) out.minPrice = minPrice;
  if (Number.isFinite(maxPrice as any)) out.maxPrice = maxPrice;
  if (out.minPrice != null && out.maxPrice != null && out.minPrice > out.maxPrice) {
    const a = out.minPrice;
    out.minPrice = out.maxPrice;
    out.maxPrice = a;
  }
  if (sort) out.sort = sort;
  if (q) out.q = q;
  if (inStock) out.inStock = true;
  if (categoryId) out.categoryId = categoryId;
  if (page && page > 1) out.page = page;
  if (lm) out.lm = lm;
  return out;
}

export function buildCanonicalQuery(filters: CatalogFilters): string {
  const usp = new URLSearchParams();

  if (filters.colors.length) usp.set("colors", filters.colors.join(","));
  if (filters.sizeIds.length) usp.set("sizeIds", filters.sizeIds.join(","));
  if (filters.minPrice != null) usp.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) usp.set("maxPrice", String(filters.maxPrice));
  if (filters.sort && filters.sort !== "latest") usp.set("sort", filters.sort);
  if (filters.page && filters.page > 1) usp.set("page", String(filters.page));

  if (filters.q) usp.set("q", filters.q);
  if (filters.inStock) usp.set("inStock", "1");
  if (filters.categoryId) usp.set("categoryId", filters.categoryId);
  if (filters.lm) usp.set("lm", "1");

  // stable key ordering
  const orderedKeys = ["q", "categoryId", "inStock", "colors", "sizeIds", "minPrice", "maxPrice", "sort", "page", "lm"];
  const ordered = new URLSearchParams();
  for (const k of orderedKeys) {
    const v = usp.get(k);
    if (v != null) ordered.set(k, v);
  }
  return ordered.toString();
}

export function canonicalizeSearchParams(sp: Record<string, string | string[] | undefined>): string {
  const filters = normalizeFiltersFromSearchParams(sp);
  return buildCanonicalQuery(filters);
}
