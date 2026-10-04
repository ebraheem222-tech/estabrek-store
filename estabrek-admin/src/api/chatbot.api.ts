// src/api/chatbot.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type Locale = "ar" | "he" | "en";

export type ChatbotEntry = {
  id: string;
  locale: Locale;
  title: string;
  answer: string;
  tags: string[];
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotConversation = {
  id: string;
  sessionId?: string | null;
  source: string;
  status: string;
  messages: any;
  lastMessage?: string | null;
  lastRole?: string | null;
  lastAt?: string | null;
  pageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEntryBody = {
  locale?: Locale;
  title: string;
  answer: string;
  tags?: string[];
  isEnabled?: boolean;
  priority?: number;
};

export async function listEntries(params?: { locale?: Locale; q?: string; enabled?: "0" | "1"; take?: number }) {
  const res = await api.get(ENDPOINTS.admin.chatbot.entries, { params });
  return res.data as { items: ChatbotEntry[] };
}

export async function createEntry(body: CreateEntryBody) {
  const res = await api.post(ENDPOINTS.admin.chatbot.entries, body);
  return res.data as ChatbotEntry;
}

export async function updateEntry(id: string, body: Partial<ChatbotEntry>) {
  const res = await api.patch(ENDPOINTS.admin.chatbot.entryById(id), body);
  return res.data as ChatbotEntry;
}

export async function deleteEntry(id: string) {
  const res = await api.delete(ENDPOINTS.admin.chatbot.entryById(id));
  return res.data as { ok: true };
}

export async function listConversations(params?: { page?: number; pageSize?: number }) {
  const res = await api.get(ENDPOINTS.admin.chatbot.conversations, { params });
  return res.data as { items: ChatbotConversation[]; page: number; pageSize: number; total: number; totalPages: number };
}

export async function getConversation(id: string) {
  const res = await api.get(ENDPOINTS.admin.chatbot.conversationById(id));
  return res.data as ChatbotConversation;
}

export async function updateConversationStatus(id: string, status: string) {
  const res = await api.patch(ENDPOINTS.admin.chatbot.conversationById(id), { status });
  return res.data as ChatbotConversation;
}
