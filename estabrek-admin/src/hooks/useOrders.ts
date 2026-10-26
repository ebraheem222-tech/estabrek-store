// src/hooks/useOrders.ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as OrdersAPI from "../api/orders.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import type { OrderReqStatus } from "../types/orders";
import { tr } from "@/lib/words";

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
  if (data?.error === "INSUFFICIENT_STOCK") return tr(`الكمية في المخزون لا تكفي (متوفر ${data.available ?? 0}، مطلوب ${data.requested ?? "?"}). لازم يتعدّل المخزون أو الطلب.`, "Not enough in stock (available {0}, requested {1}). Adjust the stock or the order.", [data.available ?? 0, data.requested ?? "?"]);
  if (data?.error === "VARIANT_NOT_FOUND") return tr("إحدى القطع في الطلب لم تعد موجودة في الكتالوج.", "One of the order's items is no longer in the catalog.");
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
      toast.success(tr("تم تحديث حالة الطلب", "Order status updated"));
      await qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      await qc.invalidateQueries({ queryKey: ["admin", "orders", "details", vars.id] });
    },
    onError: (e) => {
      toast.error(tr("فشل تحديث حالة الطلب", "Couldn't update the order status"), { description: orderErrorMessage(e) });
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
      toast.error(tr("لم يُحفظ التعديل", "The change wasn't saved"), { description: missing ? tr("لازم يتحدّث السيرفر (الباك-إند) ليدعم هذه الميزة", "Update the server (backend) to support this") : getApiErrorMessage(e) });
    },
  });

  const sendMessage = useMutation({
    mutationFn: (vars: {
      id: string;
      body: { channel: OrdersAPI.MessageChannel; to: string; template?: string; payloadJson?: any };
    }) => OrdersAPI.sendOrderMessage(vars.id, vars.body),
    onSuccess: async (_, vars) => {
      toast.success(tr("تم إرسال الرسالة", "Message sent"));
      await qc.invalidateQueries({ queryKey: ["admin", "orders", "details", vars.id] });
      await qc.invalidateQueries({ queryKey: ["admin", "outbox", "list"] });
    },
    onError: (e) => {
      toast.error(tr("فشل إرسال الرسالة", "Couldn't send the message"), { description: getApiErrorMessage(e) });
    },
  });

  return { updateStatus, sendMessage, updateDetails };
}
