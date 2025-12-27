// Client-side API helpers (no React cache). Used for quick actions like "Add to cart".

import type { CatalogProduct } from "./catalog";

type CacheEntry<T> = { v: T; t: number };
const SLUG_CACHE = new Map<string, CacheEntry<CatalogProduct | null>>();
const ID_CACHE = new Map<string, CacheEntry<CatalogProduct | null>>();
const MAX_AGE_MS = 60_000; // 60s - speeds up hover/quick add while keeping it fairly fresh

function getFresh<T>(m: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const e = m.get(key);
  if (!e) return undefined;
  if (Date.now() - e.t > MAX_AGE_MS) {
    m.delete(key);
    return undefined;
  }
  return e.v;
}

function setFresh<T>(m: Map<string, CacheEntry<T>>, key: string, v: T) {
  m.set(key, { v, t: Date.now() });
}

export function apiBaseClient() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/\/+$/, "") ||
    "http://localhost:4000/v1"
  );
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    // do not cache on the client for fresh stock/pricing
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function getProductBySlugClient(slug: string): Promise<CatalogProduct | null> {
  const cached = getFresh(SLUG_CACHE, slug);
  if (cached !== undefined) return cached;
  const url = `${apiBaseClient()}/catalog/products/slug/${encodeURIComponent(slug)}`;
  try {
    const p = (await fetchJson(url)) as CatalogProduct;
    setFresh(SLUG_CACHE, slug, p);
    if (p?.id) setFresh(ID_CACHE, p.id, p);
    return p;
  } catch (e: any) {
    // treat 404 as null
    if (String(e?.message || "").includes("404")) {
      setFresh(SLUG_CACHE, slug, null);
      return null;
    }
    throw e;
  }
}

export async function getProductByIdClient(id: string): Promise<CatalogProduct | null> {
  const cached = getFresh(ID_CACHE, id);
  if (cached !== undefined) return cached;
  const url = `${apiBaseClient()}/catalog/products/${encodeURIComponent(id)}`;
  try {
    const p = (await fetchJson(url)) as CatalogProduct;
    setFresh(ID_CACHE, id, p);
    if (p?.slug) setFresh(SLUG_CACHE, p.slug, p);
    return p;
  } catch (e: any) {
    if (String(e?.message || "").includes("404")) {
      setFresh(ID_CACHE, id, null);
      return null;
    }
    throw e;
  }
}

export async function prefetchProductQuickAdd(opts: { slug?: string; id?: string }) {
  // fire-and-forget helper for hover prefetch
  try {
    if (opts.slug) await getProductBySlugClient(opts.slug);
    else if (opts.id) await getProductByIdClient(opts.id);
  } catch {
    // ignore
  }
}


export async function listProductsClient(params: Record<string, any>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const url = `${apiBaseClient()}/catalog/products?${usp.toString()}`;
  return (await fetchJson(url)) as any;
}
