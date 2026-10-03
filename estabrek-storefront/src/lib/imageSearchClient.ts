import type { CatalogProduct } from "./catalog";

export type ImageSearchPayload = {
  ok: true;
  caption?: string;
  tags?: string[];
  products: CatalogProduct[];
  matches?: Array<{ productId: string; score: number }>;
  totalCandidates?: number;
  createdAt: number;
};

const CACHE_KEY = "image_search_results_v1";

export async function searchProductsByImage(file: File, opts?: { limit?: number; locale?: string }) {
  const form = new FormData();
  form.append("file", file);
  if (opts?.limit != null) form.append("limit", String(opts.limit));
  if (opts?.locale) form.append("locale", opts.locale);

  const res = await fetch("/api/search/image", {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.message || (json as any)?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return {
    ...(json as any),
    createdAt: Date.now(),
  } as ImageSearchPayload;
}

export function saveImageSearchPayload(payload: ImageSearchPayload) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadImageSearchPayload(maxAgeMs = 10 * 60 * 1000): ImageSearchPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImageSearchPayload;
    if (!parsed || !parsed.createdAt) return null;
    if (Date.now() - parsed.createdAt > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearImageSearchPayload() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
