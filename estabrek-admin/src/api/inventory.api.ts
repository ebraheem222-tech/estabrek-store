// src/api/inventory.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

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

export async function listAdjustments(params?: { variantId?: string; adminUserId?: string; take?: number; skip?: number }) {
  const res = await api.get(ENDPOINTS.admin.inventory.adjustments, {
    params: {
      variantId: params?.variantId || undefined,
      adminUserId: params?.adminUserId || undefined,
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
