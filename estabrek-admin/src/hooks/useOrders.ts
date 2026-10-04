// src/hooks/useOrders.ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as OrdersAPI from "../api/orders.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import type { OrderReqStatus } from "../types/orders";

type ListParams = OrdersAPI.OrdersFilter & { status?: OrderReqStatus };

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

/** Turns stock errors into a sentence the owner understands. */
type ApiErr = { response?: { status?: number; data?: { error?: string; available?: number; requested?: number } } };

export function orderErrorMessage(e: unknown) {
  const data = (e as ApiErr)?.response?.data;
  if (data?.error === "INSUFFICIENT_STOCK") return `الكمية في المخزون لا تكفي (متوفر ${data.available ?? 0}، مطلوب ${data.requested ?? "?"}). عدّلي المخزون أو الطلب.`;
  if (data?.error === "VARIANT_NOT_FOUND") return "إحدى القطع في الطلب لم تعد موجودة في الكتالوج.";
  return getApiErrorMessage(e);
}

export function useOrdersSummary(opts?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: ["admin", "orders", "summary"],
    queryFn: OrdersAPI.getOrdersSummary,
    refetchInterval: opts?.refetchInterval ?? 30_000,
    refetchIntervalInBackground: true,
    staleTime: 5_000,
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
    mutationFn: ({ id, toStatus, note }: { id: string; toStatus: OrdersAPI.OrderStatus; note?: string | null }) =>
      OrdersAPI.updateOrderStatus(id, toStatus, note),
    onSuccess: async (_, vars) => {
      toast.success("تم تحديث حالة الطلب");
      await qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      await qc.invalidateQueries({ queryKey: ["admin", "orders", "details", vars.id] });
    },
    onError: (e) => {
      toast.error("فشل تحديث حالة الطلب", { description: orderErrorMessage(e) });
    },
  });

  const updateDetails = useMutation({
    mutationFn: ({ id, body }: { id: string; body: OrdersAPI.OrderDetailsBody }) => OrdersAPI.updateOrderDetails(id, body),
    onSuccess: async (_, vars) => {
      await qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      await qc.invalidateQueries({ queryKey: ["admin", "orders", "details", vars.id] });
    },
    onError: (e: unknown) => {
      const missing = (e as ApiErr)?.response?.status === 404;
      toast.error("لم يُحفظ التعديل", { description: missing ? "حدّثي السيرفر (الباك-إند) ليدعم هذه الميزة" : getApiErrorMessage(e) });
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

  return { updateStatus, sendMessage, updateDetails };
}
