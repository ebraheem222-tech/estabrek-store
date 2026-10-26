// src/hooks/useChatbot.ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ChatbotAPI from "../api/chatbot.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import { tr } from "@/lib/words";

export function useChatbotEntries(params?: { locale?: ChatbotAPI.Locale; q?: string; enabled?: "0" | "1"; take?: number }) {
  return useQuery({
    queryKey: ["admin", "chatbot", "entries", params],
    queryFn: () => ChatbotAPI.listEntries(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useChatbotConversations(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["admin", "chatbot", "conversations", params],
    queryFn: () => ChatbotAPI.listConversations(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useChatbotConversation(id: string | null) {
  return useQuery({
    queryKey: ["admin", "chatbot", "conversation", id],
    queryFn: () => ChatbotAPI.getConversation(id as string),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useChatbotActions() {
  const qc = useQueryClient();

  const createEntry = useMutation({
    mutationFn: (body: ChatbotAPI.CreateEntryBody) => ChatbotAPI.createEntry(body),
    onSuccess: async () => {
      toast.success(tr("تم إضافة السؤال", "Question added"));
      await qc.invalidateQueries({ queryKey: ["admin", "chatbot", "entries"] });
    },
    onError: (e) => toast.error(tr("فشل إضافة السؤال", "Couldn't add the question"), { description: getApiErrorMessage(e) }),
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ChatbotAPI.ChatbotEntry> }) => ChatbotAPI.updateEntry(id, body),
    onSuccess: async () => {
      toast.success(tr("تم تحديث السؤال", "Question updated"));
      await qc.invalidateQueries({ queryKey: ["admin", "chatbot", "entries"] });
    },
    onError: (e) => toast.error(tr("فشل تحديث السؤال", "Couldn't update the question"), { description: getApiErrorMessage(e) }),
  });

  const deleteEntry = useMutation({
    mutationFn: (id: string) => ChatbotAPI.deleteEntry(id),
    onSuccess: async () => {
      toast.success(tr("تم حذف السؤال", "Question deleted"));
      await qc.invalidateQueries({ queryKey: ["admin", "chatbot", "entries"] });
    },
    onError: (e) => toast.error(tr("فشل حذف السؤال", "Couldn't delete the question"), { description: getApiErrorMessage(e) }),
  });

  const updateConversationStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ChatbotAPI.updateConversationStatus(id, status),
    onSuccess: async (_, vars) => {
      toast.success(tr("تم تحديث الحالة", "Status updated"));
      await qc.invalidateQueries({ queryKey: ["admin", "chatbot", "conversations"] });
      await qc.invalidateQueries({ queryKey: ["admin", "chatbot", "conversation", vars.id] });
    },
    onError: (e) => toast.error(tr("فشل تحديث الحالة", "Couldn't update the status"), { description: getApiErrorMessage(e) }),
  });

  return { createEntry, updateEntry, deleteEntry, updateConversationStatus };
}

