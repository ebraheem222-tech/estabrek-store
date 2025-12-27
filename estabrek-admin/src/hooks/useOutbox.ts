// src/hooks/useOutbox.ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as OutboxAPI from "../api/outbox.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";

type ListParams = {
  status?: OutboxAPI.OutboxStatus;
  channel?: OutboxAPI.OutboxChannel;
  page?: number;
  pageSize?: number;
};

export function useOutboxList(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "outbox", "list", params],
    queryFn: () => OutboxAPI.listOutbox(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useOutboxDetails(id: string | null) {
  return useQuery({
    queryKey: ["admin", "outbox", "details", id],
    queryFn: () => OutboxAPI.getOutboxMessage(id as string),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useOutboxActions() {
  const qc = useQueryClient();

  const retry = useMutation({
    mutationFn: (id: string) => OutboxAPI.retryOutboxMessage(id),
    onSuccess: async () => {
      toast.success("تمت إعادة المحاولة");
      await qc.invalidateQueries({ queryKey: ["admin", "outbox", "list"] });
    },
    onError: (e) => {
      toast.error("فشلت إعادة المحاولة", { description: getApiErrorMessage(e) });
    },
  });

  const cancel = useMutation({
    mutationFn: (vars: { id: string; reason?: string }) => OutboxAPI.cancelOutboxMessage(vars.id, vars.reason),
    onSuccess: async (_, vars) => {
      toast.success("تم إلغاء الرسالة");
      await qc.invalidateQueries({ queryKey: ["admin", "outbox", "list"] });
      await qc.invalidateQueries({ queryKey: ["admin", "outbox", "details", vars.id] });
    },
    onError: (e) => {
      toast.error("فشل إلغاء الرسالة", { description: getApiErrorMessage(e) });
    },
  });

  const processOnce = useMutation({
    mutationFn: () => OutboxAPI.processOutboxOnce(),
    onSuccess: async () => {
      toast.success("تم تشغيل المعالجة مرة واحدة");
      await qc.invalidateQueries({ queryKey: ["admin", "outbox", "list"] });
    },
    onError: (e) => {
      toast.error("فشل تشغيل المعالجة", { description: getApiErrorMessage(e) });
    },
  });

  return { retry, cancel, processOnce };
}
