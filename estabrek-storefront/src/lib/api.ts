import { cache } from "react";
import { z } from "zod";
import type { StorefrontBootstrap, StorefrontPage, SitePublicSettings } from "./types";
import { normalizeStorefrontSettings } from "./storefrontSettings";
import type { CatalogCategory, CatalogProduct, CatalogProductsList } from "./catalog";

function baseUrl() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000/v1"
  ).replace(/\/$/, "");
}

const BootstrapZ = z.any();
const PageZ = z.any();
const CategoriesTreeZ = z.any();
const ProductsListZ = z.any();
const ProductZ = z.any();
const SettingsZ = z.any();
const IdsZ = z.any();
const RecommendZ = z.any();

function parseMaybeJson<T>(value: T) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

function normalizeSiteSettings(site: any) {
  if (!site || typeof site !== "object") return site;
  const header = parseMaybeJson(site.header);
  const footer = parseMaybeJson(site.footer);
  const rawStorefront =
    (header && typeof header === "object" ? (header as any).storefront : undefined) ?? (site as any).storefront;
  if (rawStorefront !== undefined) {
    const normalizedStorefront = normalizeStorefrontSettings(rawStorefront);
    const nextHeader = header && typeof header === "object" ? { ...(header as any), storefront: normalizedStorefront } : { storefront: normalizedStorefront };
    return { ...site, header: nextHeader, footer };
  }
  return { ...site, header, footer };
}

export const getBootstrap = cache(async (): Promise<StorefrontBootstrap> => {
  const url = `${baseUrl()}/storefront/bootstrap`;
  const res = await fetch(url, { next: { revalidate: 60, tags: ["cms", "cms:bootstrap"] } });
  if (!res.ok) {
    throw new Error(`bootstrap failed (${res.status})`);
  }
  const json = await res.json();
  const parsed = BootstrapZ.parse(json) as StorefrontBootstrap;
  return { ...parsed, site: normalizeSiteSettings((parsed as any).site) } as StorefrontBootstrap;
});

export const getPageBySlug = cache(async (slug: string): Promise<StorefrontPage | null> => {
  const url = `${baseUrl()}/storefront/page?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { next: { revalidate: 60, tags: ["cms", "cms:pages"] } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`page failed (${res.status})`);
  const json = await res.json();
  return PageZ.parse(json) as StorefrontPage;
});

// -------------------------------
// Catalog (public)
// -------------------------------

export const getCategoriesTree = cache(async (): Promise<CatalogCategory[]> => {
  const url = `${baseUrl()}/catalog/categories/tree`;
  const res = await fetch(url, { next: { revalidate: 300, tags: ["catalog", "catalog:categories"] } });
  if (!res.ok) throw new Error(`categories tree failed (${res.status})`);
  const json = await res.json();
  return CategoriesTreeZ.parse(json) as CatalogCategory[];
});

export const listCategories = cache(async (): Promise<CatalogCategory[]> => {
  const url = `${baseUrl()}/catalog/categories`;
  const res = await fetch(url, { next: { revalidate: 300, tags: ["catalog", "catalog:categories"] } });
  if (!res.ok) throw new Error(`categories failed (${res.status})`);
  const json = await res.json();
  return CategoriesTreeZ.parse(json) as CatalogCategory[];
});


export const listProducts = cache(
  async (params: {
    q?: string;
    category?: string;
    // multi-select (CSV)
    colors?: string;
    sizeIds?: string;
    // legacy single-select
    color?: string;
    sizeId?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "latest" | "title_asc" | "title_desc" | "price_asc" | "price_desc";
    categoryId?: string;
    inStock?: boolean;
    limit?: number;
    page?: number;
    pageSize?: number;
    // cursor pagination
    cursorMode?: boolean;
    cursor?: string;
    take?: number;
  }): Promise<CatalogProductsList> => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      usp.set(k, String(v));
    }
    const url = `${baseUrl()}/catalog/products?${usp.toString()}`;
    const res = await fetch(url, { next: { revalidate: 60, tags: ["catalog", "catalog:products"] } });
    if (!res.ok) throw new Error(`products failed (${res.status})`);
    const json = await res.json();
    return ProductsListZ.parse(json) as CatalogProductsList;
  }
);

export const getProductById = cache(async (id: string): Promise<CatalogProduct | null> => {
  const url = `${baseUrl()}/catalog/products/${encodeURIComponent(id)}`;
  const res = await fetch(url, { next: { revalidate: 60, tags: ["catalog", "catalog:products"] } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`product failed (${res.status})`);
  const json = await res.json();
  return ProductZ.parse(json) as CatalogProduct;
});

export const getProductBySlug = cache(async (slug: string): Promise<CatalogProduct | null> => {
  const url = `${baseUrl()}/catalog/products/slug/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { next: { revalidate: 60, tags: ["catalog", "catalog:products"] } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`product failed (${res.status})`);
  const json = await res.json();
  return ProductZ.parse(json) as CatalogProduct;
});

// -------------------------------
// Public settings (for global UI like announcement bar)
// -------------------------------

export const getPublicSettings = cache(async (): Promise<{ site: SitePublicSettings }> => {
  const url = `${baseUrl()}/settings`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`settings failed (${res.status})`);
  const json = await res.json();
  const parsed = SettingsZ.parse(json) as { site: SitePublicSettings };
  return { ...parsed, site: normalizeSiteSettings((parsed as any).site) } as { site: SitePublicSettings };
});

// -------------------------------
// Storefront discovery (landing sections)
// -------------------------------

export const getNewArrivalsIds = cache(async (limit: number = 12): Promise<string[]> => {
  const url = `${baseUrl()}/storefront/products/new-arrivals?limit=${encodeURIComponent(String(limit))}`;
  const res = await fetch(url, { next: { revalidate: 60, tags: ["catalog", "catalog:products"] } });
  if (!res.ok) throw new Error(`new-arrivals failed (${res.status})`);
  const json = await res.json();
  const parsed = IdsZ.parse(json) as any;
  return Array.isArray(parsed?.productIds) ? parsed.productIds : [];
});

export const getBestSellersIds = cache(async (limit: number = 12): Promise<string[]> => {
  const url = `${baseUrl()}/storefront/products/best-sellers?limit=${encodeURIComponent(String(limit))}`;
  const res = await fetch(url, { next: { revalidate: 60, tags: ["catalog", "catalog:products"] } });
  if (!res.ok) throw new Error(`best-sellers failed (${res.status})`);
  const json = await res.json();
  const parsed = IdsZ.parse(json) as any;
  return Array.isArray(parsed?.productIds) ? parsed.productIds : [];
});

// -------------------------------
// Storefront AI helpers (recommendations)
// -------------------------------

export type RecommendedProduct = {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string | null;
  imageBlurDataUrl?: string | null;
  minPrice?: number | null;
  categoryName?: string | null;
};

export const recommendProducts = cache(async (params: {
  locale?: "ar" | "he" | "en";
  message?: string;
  productId?: string;
  limit?: number;
  excludeIds?: string[];
}): Promise<{ ok: true; source: "openai" | "fallback"; products: RecommendedProduct[] }> => {
  const url = `${baseUrl()}/storefront/recommend/products`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params ?? {}),
      next: { revalidate: 60, tags: ["catalog", "catalog:products"] },
    });
    if (!res.ok) {
      return { ok: true, source: "fallback", products: [] };
    }
    const json = await res.json();
    const parsed = RecommendZ.parse(json) as any;
    return {
      ok: true,
      source: parsed?.source === "openai" ? "openai" : "fallback",
      products: Array.isArray(parsed?.products) ? (parsed.products as RecommendedProduct[]) : [],
    };
  } catch {
    return { ok: true, source: "fallback", products: [] };
  }
});


// List CMS pages (for sitemap)
export const listPages = cache(async (): Promise<Array<{ slug: string }>> => {
  const url = `${baseUrl()}/storefront/pages`;
  const res = await fetch(url, { next: { revalidate: 300, tags: ["cms", "cms:pages"] } });
  if (!res.ok) return [];
  const json = await res.json();
  const arr = Array.isArray((json as any)?.pages) ? (json as any).pages : json;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p: any) => ({ slug: String(p?.slug || "") }))
    .filter((p: any) => p.slug);
});
