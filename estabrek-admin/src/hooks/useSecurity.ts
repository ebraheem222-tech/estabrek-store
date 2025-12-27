// src/hooks/useSecurity.ts
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as SecAPI from "../api/adminSecurity.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";

export function useAdminSessions(params?: { take?: number; skip?: number; status?: SecAPI.SessionStatus }) {
  return useQuery({
    queryKey: ["admin", "security", "sessions", params],
    queryFn: () => SecAPI.listSessions(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useAdminSecurityEvents(params?: { take?: number; skip?: number; type?: string }) {
  return useQuery({
    queryKey: ["admin", "security", "events", params],
    queryFn: () => SecAPI.listSecurityEvents(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useSecurityActions() {
  const qc = useQueryClient();

  const revokeSession = useMutation({
    mutationFn: (id: string) => SecAPI.revokeSession(id),
    onSuccess: async () => {
      toast.success("تم إنهاء الجلسة");
      await qc.invalidateQueries({ queryKey: ["admin", "security", "sessions"] });
      await qc.invalidateQueries({ queryKey: ["admin", "security", "events"] });
    },
    onError: (e) => {
      toast.error("فشل إنهاء الجلسة", { description: getApiErrorMessage(e) });
    },
  });

  const revokeOthers = useMutation({
    mutationFn: (currentSessionId: string) => SecAPI.revokeOtherSessions(currentSessionId),
    onSuccess: async () => {
      toast.success("تم إنهاء جميع الجلسات الأخرى");
      await qc.invalidateQueries({ queryKey: ["admin", "security", "sessions"] });
      await qc.invalidateQueries({ queryKey: ["admin", "security", "events"] });
    },
    onError: (e) => {
      toast.error("فشل إنهاء الجلسات الأخرى", { description: getApiErrorMessage(e) });
    },
  });

  return { revokeSession, revokeOthers };
}
