"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";
import { LoadingImg } from "@/components/LoadingImg";

type Role = "user" | "assistant";

type RecommendedProduct = {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string | null;
  imageBlurDataUrl?: string | null;
  minPrice?: number | null;
};

type Msg = {
  id: string;
  role: Role;
  text: string;
  at: number;
  products?: RecommendedProduct[];
};

type ApiResponse = {
  ok?: boolean;
  conversationId?: string;
  reply?: string;
  error?: string;
  products?: RecommendedProduct[];
};

const STORAGE_KEY = "estabrek_chatbot_v1";
const POSITION_KEY = "estabrek_chatbot_pos_v1";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type ChatWidgetPosition = "bottom-left" | "bottom-right" | "bottom-center";

type ChatWidgetProps = {
  position?: ChatWidgetPosition;
  draggable?: boolean;
};

export default function ChatWidget({ position = "bottom-left", draggable = false }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const saved = safeParse<{ sessionId?: string; conversationId?: string | null; messages?: Msg[] }>(
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    );

    const sid = saved?.sessionId || uid();
    setSessionId(sid);
    setConversationId(saved?.conversationId ?? null);

    const initialMessages = Array.isArray(saved?.messages) ? saved!.messages!.slice(-50) : [];
    if (initialMessages.length) {
      setMessages(initialMessages);
    } else {
      setMessages([
        {
          id: uid(),
          role: "assistant",
          at: Date.now(),
          text: "أهلًا! أنا مساعد المتجر. اسألني عن الشحن، الاستبدال/الإرجاع، المقاسات، أو أي شيء تحتاجه.",
        },
      ]);
    }
  }, []);

  useEffect(() => {
    if (!draggable) {
      setDragPos(null);
      return;
    }
    const savedPos = safeParse<{ x: number; y: number }>(
      typeof window !== "undefined" ? window.localStorage.getItem(POSITION_KEY) : null
    );
    if (savedPos && Number.isFinite(savedPos.x) && Number.isFinite(savedPos.y)) {
      setDragPos(savedPos);
    }
  }, [draggable]);

  useEffect(() => {
    if (!draggable || !dragging) return;
    const handleMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const nextX = e.clientX - dragOffset.current.x;
      const nextY = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      setDragPos({
        x: Math.min(maxX, Math.max(8, nextX)),
        y: Math.min(maxY, Math.max(8, nextY)),
      });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggable, dragging]);

  useEffect(() => {
    if (!draggable) return;
    if (!dragging && dragPos) {
      try {
        window.localStorage.setItem(POSITION_KEY, JSON.stringify(dragPos));
      } catch {
        // ignore
      }
    }
  }, [draggable, dragging, dragPos]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sessionId, conversationId, messages: messages.slice(-50) })
      );
    } catch {
      // ignore
    }
  }, [conversationId, messages, sessionId]);

  useEffect(() => {
    if (!open) return;
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
    endRef.current?.scrollIntoView({ block: "end", behavior });
  }, [open, messages, loading]);

  const canSend = useMemo(() => !loading && text.trim().length > 0, [loading, text]);

  const positionStyle = useMemo(() => {
    if (dragPos) {
      return { left: dragPos.x, top: dragPos.y, right: "auto", bottom: "auto", transform: "none" as const };
    }
    if (position === "bottom-right") {
      return { right: "1rem", bottom: "1rem", left: "auto", transform: "none" as const };
    }
    if (position === "bottom-center") {
      return { left: "50%", bottom: "1rem", transform: "translateX(-50%)" as const };
    }
    return { left: "1rem", bottom: "1rem", transform: "none" as const };
  }, [dragPos, position]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!draggable || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  async function send() {
    const t = text.trim();
    if (!t || loading) return;

    setError(null);
    setLoading(true);
    setText("");

    const userMsg: Msg = { id: uid(), role: "user", text: t, at: Date.now() };
    setMessages((m) => [...m, userMsg]);

    try {
      const res = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId ?? undefined,
          sessionId,
          locale: "ar",
          message: t,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as ApiResponse;
      const replyText = String(json?.reply ?? "").trim();
      if (!replyText) throw new Error(json?.error || "حدث خطأ");

      if (json?.conversationId) setConversationId(json.conversationId);
      const products = Array.isArray(json?.products) ? json.products : [];
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: replyText, at: Date.now(), products }]);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "حدث خطأ");
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", text: "تعذر الاتصال الآن. حاول مرة أخرى أو تواصل مع الدعم.", at: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setConversationId(null);
    setMessages([
      {
        id: uid(),
        role: "assistant",
        at: Date.now(),
        text: "تم مسح المحادثة. كيف أقدر أساعدك؟",
      },
    ]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div ref={containerRef} className="fixed z-[60]" style={positionStyle}>
      {/* Launcher */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          onPointerDown={handlePointerDown}
          style={draggable ? { touchAction: "none" } : undefined}
          className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/95 p-3 shadow-lg backdrop-blur hover:bg-white transition"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--accent-2)] text-black shadow-sm">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25-4.03 8.25-9 8.25c-1.446 0-2.812-.28-4.03-.78L3 20.25l1.053-3.158A7.83 7.83 0 012.25 12z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5h9M7.5 13.5h5.25" />
            </svg>
          </span>
          <span className="sr-only">مساعدة</span>
        </button>
      ) : null}

      {/* Panel */}
      {open ? (
        <div
          dir="rtl"
          className="mt-3 w-[92vw] max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-xl backdrop-blur"
        >
          <div
            className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3"
            onPointerDown={handlePointerDown}
            style={draggable ? { touchAction: "none", cursor: "move" } : undefined}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-black">مساعد المتجر</div>
              <div className="truncate text-[11px] text-black/60">مبني على قاعدة المعرفة + دعم</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-black/60 hover:bg-black/5"
                aria-label="مسح"
                title="مسح"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m-1 0v16H9V6h6z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-black/60 hover:bg-black/5"
                aria-label="إغلاق"
                title="إغلاق"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-[52vh] space-y-2 overflow-auto px-3 py-3">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
                <div className="max-w-[90%]">
                  <div
                    className={
                      "whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed " +
                      (m.role === "user"
                        ? "bg-black text-white"
                        : "bg-[color:var(--accent-1)]/15 text-black border border-black/10")
                    }
                  >
                    {m.text}
                  </div>

                  {m.role === "assistant" && m.products?.length ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {m.products.slice(0, 6).map((p) => (
                        <a
                          key={p.id}
                          href={`/p/${encodeURIComponent(p.slug)}`}
                          className="overflow-hidden rounded-xl border border-black/10 bg-white hover:bg-white/90 transition"
                        >
                          <div className="aspect-[4/3] w-full bg-black/[0.04]">
                            {p.imageUrl ? (
                              <LoadingImg
                                src={cldUrl(p.imageUrl, { w: 320, h: 240, c: "fill", g: "auto" })}
                                alt={p.title}
                                blurDataUrl={p.imageBlurDataUrl ?? undefined}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="p-2">
                            <div className="line-clamp-2 text-[12px] font-semibold text-black">{p.title}</div>
                            <div className="mt-1 text-[11px] text-black/60">
                              {p.minPrice != null ? formatMoney(p.minPrice, "ILS") : ""}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-end">
                <div className="rounded-2xl border border-black/10 bg-black/5 px-3 py-2 text-xs text-black/70">
                  يكتب...
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="border-t border-black/10 p-3">
            {error ? <div className="mb-2 text-[11px] text-red-600">{error}</div> : null}
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب سؤالك..."
                className="min-h-[44px] max-h-[120px] w-full resize-none rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-[color:var(--accent-2)]/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className={
                  "inline-flex h-11 w-11 items-center justify-center rounded-2xl transition " +
                  (canSend ? "bg-[color:var(--accent-2)] text-black" : "bg-black/10 text-black/40 cursor-not-allowed")
                }
                aria-label="إرسال"
              >
                <svg className="h-5 w-5 -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
            <div className="mt-2 text-[10px] text-black/50">
              لا تشارك كلمات مرور أو رموز OTP. إذا كانت الإجابة غير دقيقة، تواصل مع الدعم.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
