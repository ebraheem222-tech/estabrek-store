// src/hooks/useCoupons.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as CouponsAPI from "../api/coupons.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";

const keys = {
  list: (params: { page?: number; pageSize?: number; q?: string; active?: boolean }) =>
    ["coupons", "list", params] as const,
};

export function useCouponsList(params: { page?: number; pageSize?: number; q?: string; active?: boolean }) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => CouponsAPI.listCoupons(params),
    placeholderData: (prev) => prev,
  });
}

export function useCouponActions() {
  const qc = useQueryClient();

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["coupons"] });
  };

  const createCoupon = useMutation({
    mutationFn: CouponsAPI.createCoupon,
    onSuccess: async () => {
      toast.success("تم إنشاء الكوبون");
      await invalidate();
    },
    onError: (e) => {
      toast.error("فشل إنشاء الكوبون", { description: getApiErrorMessage(e) });
    },
  });

  const updateCoupon = useMutation({
    mutationFn: (vars: { id: string; body: Parameters<typeof CouponsAPI.updateCoupon>[1] }) =>
      CouponsAPI.updateCoupon(vars.id, vars.body),
    onSuccess: async () => {
      toast.success("تم تحديث الكوبون");
      await invalidate();
    },
    onError: (e) => {
      toast.error("فشل تحديث الكوبون", { description: getApiErrorMessage(e) });
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: CouponsAPI.deleteCoupon,
    onSuccess: async () => {
      toast.success("تم حذف الكوبون");
      await invalidate();
    },
    onError: (e) => {
      toast.error("فشل حذف الكوبون", { description: getApiErrorMessage(e) });
    },
  });

  return {
    createCoupon,
    updateCoupon,
    deleteCoupon,
  };
}
