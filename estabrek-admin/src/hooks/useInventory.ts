// src/hooks/useInventory.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as InventoryAPI from "../api/inventory.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";

const keys = {
  lowStock: (params: { q?: string; onlyBelow?: boolean; take?: number; skip?: number } = {}) =>
    ["inventory", "lowStock", params] as const,
  adjustments: (params: { variantId?: string; adminUserId?: string; take?: number; skip?: number } = {}) =>
    ["inventory", "adjustments", params] as const,
};

export function useLowStock(params: { q?: string; onlyBelow?: boolean; take?: number; skip?: number }) {
  return useQuery({
    queryKey: keys.lowStock(params),
    queryFn: () => InventoryAPI.getLowStock(params),
  });
}

export function useAdjustments(params: { variantId?: string; adminUserId?: string; take?: number; skip?: number }) {
  return useQuery({
    queryKey: keys.adjustments(params),
    queryFn: () => InventoryAPI.listAdjustments(params),
  });
}

export function useInventoryActions() {
  const qc = useQueryClient();

  const adjust = useMutation({
    mutationFn: (args: { variantId: string; body: InventoryAPI.AdjustVariantBody }) =>
      InventoryAPI.adjustVariant(args.variantId, args.body),
    onSuccess: async () => {
      toast.success("تم تحديث المخزون");
      // refresh most inventory lists
      await qc.invalidateQueries({ queryKey: ["inventory"] });
      // product pages might show stock too
      await qc.invalidateQueries({ queryKey: ["admin-product-full"] }).catch(() => {});
    },
    onError: (e) => toast.error("فشل تحديث المخزون", { description: getApiErrorMessage(e) }),
  });

  const setThreshold = useMutation({
    mutationFn: (args: { variantId: string; lowStockThreshold: number }) =>
      InventoryAPI.setVariantThreshold(args.variantId, args.lowStockThreshold),
    onSuccess: async () => {
      toast.success("تم حفظ حدّ التنبيه");
      await qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toast.error("فشل حفظ حدّ التنبيه", { description: getApiErrorMessage(e) }),
  });

  return { adjust, setThreshold };
}
