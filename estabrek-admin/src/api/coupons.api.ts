// src/api/coupons.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  minCart?: number | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export async function listCoupons(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  active?: boolean;
}) {
  const res = await api.get(ENDPOINTS.admin.coupons.base, { params });
  return res.data as { rows: Coupon[]; meta: PageMeta };
}

export async function createCoupon(body: {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  minCart?: number | null;
  isActive?: boolean;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  note?: string | null;
}) {
  const res = await api.post(ENDPOINTS.admin.coupons.base, body);
  return res.data as Coupon;
}

export async function updateCoupon(id: string, body: Partial<{
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  minCart: number | null;
  isActive: boolean;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
  note: string | null;
}>) {
  const res = await api.patch(ENDPOINTS.admin.coupons.byId(id), body);
  return res.data as Coupon;
}

export async function deleteCoupon(id: string) {
  const res = await api.delete(ENDPOINTS.admin.coupons.byId(id));
  return res.data as { ok: true };
}
