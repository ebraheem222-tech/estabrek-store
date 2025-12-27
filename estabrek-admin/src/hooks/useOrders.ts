// src/hooks/useOrders.ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as OrdersAPI from "../api/orders.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import type { OrderReqStatus } from "../types/orders";

type ListParams = {
  status?: OrderReqStatus;
  page?: number;
  pageSize?: number;
};

// Backward-compat wrapper (older pages import useOrders)
export function useOrders(params: ListParams) {
  const ordersQuery = useOrdersList(params);
  const actions = useOrdersActions();
  return { ordersQuery, ...actions };
}

export function useOrdersList(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "orders", "list", params],
    queryFn: () => OrdersAPI.listOrders(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useOrderDetails(id: string | null) {
  return useQuery({
    queryKey: ["admin", "orders", "details", id],
    queryFn: () => OrdersAPI.getOrder(id as string),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useOrdersActions() {
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, toStatus }: { id: string; toStatus: OrdersAPI.OrderStatus }) =>
      OrdersAPI.updateOrderStatus(id, toStatus),
    onSuccess: async (_, vars) => {
      toast.success("تم تحديث حالة الطلب");
      await qc.invalidateQueries({ queryKey: ["admin", "orders", "list"] });
      await qc.invalidateQueries({ queryKey: ["admin", "orders", "details", vars.id] });
    },
    onError: (e) => {
      toast.error("فشل تحديث حالة الطلب", { description: getApiErrorMessage(e) });
    },
  });

  const sendMessage = useMutation({
    mutationFn: (vars: {
      id: string;
      body: { channel: OrdersAPI.MessageChannel; to: string; template?: string; payloadJson?: any };
    }) => OrdersAPI.sendOrderMessage(vars.id, vars.body),
    onSuccess: async (_, vars) => {
      toast.success("تم إرسال الرسالة");
      await qc.invalidateQueries({ queryKey: ["admin", "orders", "details", vars.id] });
      await qc.invalidateQueries({ queryKey: ["admin", "outbox", "list"] });
    },
    onError: (e) => {
      toast.error("فشل إرسال الرسالة", { description: getApiErrorMessage(e) });
    },
  });

  return { updateStatus, sendMessage };
}
