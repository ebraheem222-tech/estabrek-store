// Delivery zones and fees live in site settings (header.delivery), so the
// storefront can show them later too. No database change needed.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { EMPTY_DELIVERY, normalizeDelivery, type DeliverySettings } from "../../lib/orders";
import { toast } from "../../lib/toast";

export function useDelivery() {
  const q = useSettings();
  const delivery: DeliverySettings = q.data ? normalizeDelivery(q.data.header?.delivery) : EMPTY_DELIVERY;
  return {
    delivery,
    storeName: q.data?.siteName || "استبرق",
    logoUrl: q.data?.logoUrl || null,
    storePhone: q.data?.whatsappNumber || q.data?.contactPhone || "",
    loaded: q.isSuccess,
  };
}

export function useSaveDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: DeliverySettings) => {
      // Read the latest header first so nothing else in it is lost.
      const current = await getSettings();
      const header = { ...(current.header ?? {}), delivery: next };
      return updateSettings({ header });
    },
    onSuccess: async () => {
      toast.success("حُفظت أسعار التوصيل");
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error("لم تُحفظ أسعار التوصيل", { description: getApiErrorMessage(e) }),
  });
}
