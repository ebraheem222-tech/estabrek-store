// src/api/inventory.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import { getProductFull } from "./catalog.api";

export type LowStockRow = {
  variantId: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  shortage: number;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  productId: string | null;
  productTitle: string | null;
  productSlug: string | null;
  categoryId: string | null;
  categoryName: string | null;
  updatedAt: string;
  createdAt: string;
};

export type LowStockResponse = {
  total: number;
  take: number;
  skip: number;
  rows: LowStockRow[];
};

export async function getLowStock(params?: { q?: string; onlyBelow?: boolean; take?: number; skip?: number }) {
  const res = await api.get(ENDPOINTS.admin.inventory.lowStock, {
    params: {
      q: params?.q || undefined,
      onlyBelow: params?.onlyBelow ? 1 : undefined,
      take: params?.take ?? 50,
      skip: params?.skip ?? 0,
    },
  });
  return res.data as LowStockResponse;
}

export type InventoryAdjustmentRow = {
  id: string;
  variantId: string;
  sku: string | null;
  productTitle: string | null;
  productId?: string | null;
  colorName?: string | null;
  size: string | null;
  delta: number;
  beforeStock: number;
  afterStock: number;
  reason: string | null;
  adminUser: { id: string; email: string; name: string | null } | null;
  createdAt: string;
};

export type AdjustmentsResponse = {
  total: number;
  take: number;
  skip: number;
  rows: InventoryAdjustmentRow[];
};

export async function listAdjustments(params?: { variantId?: string; adminUserId?: string; productId?: string; q?: string; take?: number; skip?: number }) {
  const res = await api.get(ENDPOINTS.admin.inventory.adjustments, {
    params: {
      variantId: params?.variantId || undefined,
      adminUserId: params?.adminUserId || undefined,
      productId: params?.productId || undefined,
      q: params?.q || undefined,
      take: params?.take ?? 50,
      skip: params?.skip ?? 0,
    },
  });
  return res.data as AdjustmentsResponse;
}

export type AdjustVariantBody = {
  mode: "delta" | "set";
  value: number;
  reason?: string | null;
};

export async function adjustVariant(variantId: string, body: AdjustVariantBody) {
  const res = await api.post(ENDPOINTS.admin.inventory.variantAdjust(variantId), body);
  return res.data as {
    variant: any;
    adjustment: any;
  };
}

export async function setVariantThreshold(variantId: string, lowStockThreshold: number) {
  const res = await api.patch(ENDPOINTS.admin.inventory.variantThreshold(variantId), { lowStockThreshold });
  return res.data as any;
}

/* ------------------------------------------------ every SKU (stock page) */

export type StockRow = {
  variantId: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  price: number;
  sizeId: string;
  size: string | null;
  sizeOrder: number;
  itemId: string | null;
  colorName: string | null;
  colorHex: string | null;
  itemActive: boolean;
  imageUrl: string | null;
  productId: string | null;
  productTitle: string | null;
  productSlug: string | null;
  productActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  updatedAt: string;
};

export type StockListResponse = {
  total: number;
  take: number;
  skip: number;
  totals: { skus: number; units: number; out: number; low: number };
  rows: StockRow[];
};

export type StockFilter = "all" | "out" | "low" | "ok";

export async function listStock(params?: { q?: string; productId?: string; categoryId?: string; stock?: StockFilter; take?: number; skip?: number }) {
  const res = await api.get(ENDPOINTS.admin.inventory.variants, {
    params: {
      q: params?.q || undefined,
      productId: params?.productId || undefined,
      categoryId: params?.categoryId || undefined,
      stock: params?.stock && params.stock !== "all" ? params.stock : undefined,
      take: params?.take ?? 5000,
      skip: params?.skip ?? 0,
    },
  });
  return res.data as StockListResponse;
}

/** One exact SKU (a barcode scan). Null when no size has this code. */
export async function findBySku(sku: string): Promise<StockRow | null> {
  try {
    const res = await api.get(ENDPOINTS.admin.inventory.variants, { params: { sku: sku.trim(), take: 1 } });
    return ((res.data as StockListResponse).rows ?? [])[0] ?? null;
  } catch (e: any) {
    // The updated backend answers an unknown code with this message; any other 404 means an older backend.
    if (e?.response?.status === 404 && /No size with this SKU/.test(String(e?.response?.data?.message ?? ""))) return null;
    throw e;
  }
}

export type BulkStockRow = { variantId?: string; sku?: string; mode: "set" | "delta"; value?: number; lowStockThreshold?: number };
export type BulkStockResult = {
  updated: number;
  failed: number;
  results: Array<{ key: string; variantId?: string; sku?: string; ok: boolean; before?: number; after?: number; error?: string }>;
};

export async function bulkStock(body: { rows: BulkStockRow[]; reason?: string | null }) {
  const res = await api.post(ENDPOINTS.admin.inventory.bulk, body);
  return res.data as BulkStockResult;
}

/**
 * Is the backend new enough for the stock tools (SKU list, bulk, keep-stock on save)?
 * Asked once per session: the new backend lists sizes (an empty list for this search),
 * an older one doesn't know the address (404).
 */
let toolsProbe: Promise<boolean> | null = null;
export function backendHasStockTools(): Promise<boolean> {
  toolsProbe ??= api
    .get(ENDPOINTS.admin.inventory.variants, { params: { q: "__estabrek_probe__", take: 1 } })
    .then((res) => Array.isArray((res.data as StockListResponse)?.rows))
    .catch((e: any) => {
      if (!e?.response) toolsProbe = null; // network trouble: ask again next time
      return false;
    });
  return toolsProbe;
}

/* ------------------------------------------- one product's sizes (any backend) */


/** A product's SKUs with stock; works on the older backend too (from the product's full data). */
export async function productStock(productId: string): Promise<StockRow[]> {
  if (await backendHasStockTools()) return (await listStock({ productId })).rows;
  const p = await getProductFull(productId);
  return (p.items ?? []).flatMap((it) =>
    (it.variants ?? []).map((v) => ({
      variantId: v.id, sku: v.sku, stock: v.stock, lowStockThreshold: v.lowStockThreshold ?? 0, price: Number(v.price),
      sizeId: v.sizeId, size: v.size?.name ?? null, sizeOrder: v.size?.order ?? 0, itemId: it.id, colorName: it.colorName,
      colorHex: it.colorHex ?? null, itemActive: it.isActive, imageUrl: it.images?.[0]?.url ?? null, productId: p.id,
      productTitle: p.title, productSlug: p.slug, productActive: p.isActive, categoryId: p.categoryId,
      categoryName: p.category?.name ?? null, updatedAt: "",
    })),
  );
}

/**
 * Saves many stock changes. The updated backend takes them in one request; an older
 * one gets them one by one through the quick-adjust endpoint (needs variant ids).
 */
export async function applyStockChanges(rows: BulkStockRow[], reason?: string | null): Promise<BulkStockResult> {
  if (await backendHasStockTools()) return bulkStock({ rows, reason: reason || undefined });
  const results: BulkStockResult["results"] = [];
  for (const r of rows) {
    if (!r.variantId) { results.push({ key: r.sku ?? "", ok: false, error: "NEEDS_BACKEND_UPDATE" }); continue; }
    try {
      if (r.value !== undefined) await adjustVariant(r.variantId, { mode: r.mode, value: r.value, reason: reason || undefined });
      if (r.lowStockThreshold !== undefined) await setVariantThreshold(r.variantId, r.lowStockThreshold);
      results.push({ key: r.variantId, variantId: r.variantId, ok: true });
    } catch (e: any) {
      results.push({ key: r.variantId, variantId: r.variantId, ok: false, error: e?.response?.data?.error ?? "FAILED" });
    }
  }
  return { updated: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length, results };
}
