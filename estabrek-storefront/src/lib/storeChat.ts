"use client";
/**
 * The shop chat conversation (the same one the classic chat widget uses):
 * messages are kept on this device and sent to /api/chatbot/message.
 */
import { useCallback, useEffect, useState } from "react";

export type ChatRole = "user" | "assistant";
export type ChatProduct = { id: string; slug: string; title: string; imageUrl?: string | null; minPrice?: number | null };
export type ChatMessage = { id: string; role: ChatRole; text: string; at: number; products?: ChatProduct[] };

const STORAGE_KEY = "estabrek_chatbot_v1";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useStoreChat(greeting: string, ar: boolean) {
  const [sessionId, setSessionId] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let saved: { sessionId?: string; conversationId?: string | null; messages?: ChatMessage[] } | null = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"); } catch { saved = null; }
    setSessionId(saved?.sessionId || uid());
    setConversationId(saved?.conversationId ?? null);
    const kept = Array.isArray(saved?.messages) ? saved!.messages!.slice(-50) : [];
    setMessages(kept.length ? kept : [{ id: uid(), role: "assistant", at: Date.now(), text: greeting }]);
    // Only on first load; the greeting text is just the opening line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, conversationId, messages: messages.slice(-50) }));
    } catch { /* storage blocked: the chat still works for this visit */ }
  }, [sessionId, conversationId, messages]);

  const send = useCallback(async (raw: string): Promise<ChatMessage | null> => {
    const text = raw.trim();
    if (!text || loading) return null;
    setLoading(true);
    setMessages((m) => [...m, { id: uid(), role: "user", text, at: Date.now() }]);
    try {
      const res = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId ?? undefined, sessionId, locale: ar ? "ar" : "en", message: text, pageUrl: window.location.href }),
      });
      const json = (await res.json().catch(() => ({}))) as { reply?: string; conversationId?: string; products?: ChatProduct[]; error?: string };
      const reply = String(json?.reply ?? "").trim();
      if (!reply) throw new Error(json?.error || "no reply");
      if (json.conversationId) setConversationId(json.conversationId);
      const msg: ChatMessage = { id: uid(), role: "assistant", text: reply, at: Date.now(), products: Array.isArray(json.products) ? json.products : [] };
      setMessages((m) => [...m, msg]);
      return msg;
    } catch {
      const msg: ChatMessage = {
        id: uid(), role: "assistant", at: Date.now(),
        text: ar ? "ما قدرت أوصل للمساعد هلأ 🙈 جرّبي كمان شوي، أو راسلينا على واتساب." : "I couldn't reach the assistant right now 🙈 try again soon, or message us on WhatsApp.",
      };
      setMessages((m) => [...m, msg]);
      return msg;
    } finally {
      setLoading(false);
    }
  }, [ar, conversationId, loading, sessionId]);

  const clear = useCallback(() => {
    setConversationId(null);
    setMessages([{ id: uid(), role: "assistant", at: Date.now(), text: greeting }]);
  }, [greeting]);

  return { messages, loading, send, clear };
}
