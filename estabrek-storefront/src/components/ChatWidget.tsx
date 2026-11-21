"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";
import { LoadingImg } from "@/components/LoadingImg";
import { personaFaceUrl, personaLines, type Persona, type PersonaLang } from "@/lib/personas";

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
  /** Follow-up questions to tap (the smart assistant's). */
  suggestions?: string[];
  /** wa.me link with the question in it, when a person from the shop should take over. */
  handoff?: string | null;
};

type ApiResponse = {
  ok?: boolean;
  conversationId?: string;
  reply?: string;
  error?: string;
  products?: RecommendedProduct[];
  suggestions?: string[];
  handoff?: string | null;
};

/** The chat's own words in the page's language. */
const say = (lang: PersonaLang, ar: string, en: string, he: string) => (lang === "en" ? en : lang === "he" ? he : ar);
const SPEECH_LANG: Record<PersonaLang, string> = { ar: "ar-SA", en: "en-US", he: "he-IL" };
const VOICE_KEY = "estabrek_chat_voice";

/** The browser's own speech recognition (Chrome, Edge, Safari), or null. */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

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
  /** The personality the assistant speaks as (admin → إعداد المتجر); none = the plain assistant. */
  persona?: Persona | null;
};

/** The page's language, as the shop sets it on <html>. */
function pageLang(): PersonaLang {
  if (typeof document === "undefined") return "ar";
  const l = document.documentElement.lang.slice(0, 2);
  return l === "en" || l === "he" ? l : "ar";
}
const NUDGE_KEY = "estabrek_assistant_nudged";

/** The chat's sign, in the button's own words colour. */
function ChatIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25-4.03 8.25-9 8.25c-1.446 0-2.812-.28-4.03-.78L3 20.25l1.053-3.158A7.83 7.83 0 012.25 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5h9M7.5 13.5h5.25" />
    </svg>
  );
}

export default function ChatWidget({ position = "bottom-left", draggable = false, persona = null }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<PersonaLang>("ar");
  const [nudge, setNudge] = useState(false);
  const lines = persona ? personaLines(persona, lang) : null;
  const face = useMemo(() => (persona ? personaFaceUrl(persona, 72) : null), [persona]);
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
  // Voice: talk instead of typing, and hear the replies (the browser's own speech, nothing else is sent).
  const [canListen, setCanListen] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setCanListen(Boolean(recognitionCtor()));
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
    try {
      setSpeakOn(window.localStorage.getItem(VOICE_KEY) === "1");
    } catch {
      // ignore
    }
    return () => {
      recRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function speak(words: string) {
    if (!speakOn || !canSpeak) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(words.replace(/https?:\/\/\S+/g, ""));
      u.lang = SPEECH_LANG[lang];
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  }

  function toggleSpeak() {
    const next = !speakOn;
    setSpeakOn(next);
    if (!next && canSpeak) window.speechSynthesis.cancel();
    try {
      window.localStorage.setItem(VOICE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function toggleListen() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor || loading) return;
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[lang];
    rec.interimResults = true;
    rec.continuous = false;
    let heard = "";
    rec.onresult = (e) => {
      heard = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setText(heard);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (heard) void send(heard);
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  useEffect(() => {
    const saved = safeParse<{ sessionId?: string; conversationId?: string | null; messages?: Msg[] }>(
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    );

    const l = pageLang();
    setLang(l);
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
          text: persona ? personaLines(persona, l).hello : "أهلًا! أنا مساعد المتجر. اسألني عن الشحن، الاستبدال/الإرجاع، المقاسات، أو أي شيء تحتاجه.",
        },
      ]);
    }
  }, [persona]);

  // A personality says a short line beside its button, once a visit, a few seconds in.
  useEffect(() => {
    if (!persona) return;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(NUDGE_KEY) === "1";
    } catch {
      // ignore
    }
    if (seen) return;
    const t = window.setTimeout(() => {
      setNudge(true);
      try {
        window.sessionStorage.setItem(NUDGE_KEY, "1");
      } catch {
        // ignore
      }
    }, 4000);
    return () => window.clearTimeout(t);
  }, [persona]);

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
    // Above the phone's bottom bar while it shows (--float-bottom, globals.css): it sat on «السلة».
    const bottom = "var(--float-bottom, 1rem)";
    if (position === "bottom-right") {
      return { right: "1rem", bottom, left: "auto", transform: "none" as const };
    }
    if (position === "bottom-center") {
      return { left: "50%", bottom, transform: "translateX(-50%)" as const };
    }
    return { left: "1rem", bottom, transform: "none" as const };
  }, [dragPos, position]);

  // The page knows a chat button is there: the accessibility button stands above it (globals.css).
  useEffect(() => {
    document.documentElement.setAttribute("data-chat", "");
    return () => document.documentElement.removeAttribute("data-chat");
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!draggable || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  async function send(said?: string) {
    const t = (said ?? text).trim();
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
          locale: lang,
          message: t,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
          persona: persona ? { id: persona.id, name: persona.name[lang], role: persona.role[lang], tone: persona.tone } : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as ApiResponse;
      const replyText = String(json?.reply ?? "").trim();
      if (!replyText) throw new Error(json?.error || "حدث خطأ");

      if (json?.conversationId) setConversationId(json.conversationId);
      const products = Array.isArray(json?.products) ? json.products : [];
      const suggestions = Array.isArray(json?.suggestions) ? json.suggestions.filter((x) => typeof x === "string").slice(0, 3) : [];
      const handoff = typeof json?.handoff === "string" && /^https:\/\/wa\.me\//.test(json.handoff) ? json.handoff : null;
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: replyText, at: Date.now(), products, suggestions, handoff }]);
      speak(replyText);
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
        text: lines ? lines.hello : "تم مسح المحادثة. كيف أقدر أساعدك؟",
      },
    ]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <div ref={containerRef} className="chat-widget-root fixed z-[60]" style={positionStyle}>
      {/* Launcher */}
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setNudge(false);
            setOpen(true);
          }}
          onPointerDown={handlePointerDown}
          style={draggable ? { touchAction: "none" } : undefined}
          // A plain round button in the store's own accent (its theme's, else the page's), the same in every
          // template: the assistant's own picture (its colours) shows in the chat itself.
          className="chat-launcher group relative grid h-12 w-12 place-items-center rounded-full shadow-lg transition hover:-translate-y-0.5 sm:h-14 sm:w-14"
          data-testid="assistant-launcher"
          data-persona={persona?.id ?? ""}
        >
          {persona && face ? (
            <>
              <ChatIcon />
              {nudge && lines ? (
                <span className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-2xl border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black shadow-md" style={{ insetInlineStart: 0 }} data-testid="assistant-nudge" dir={lang === "en" ? "ltr" : "rtl"}>
                  {lines.nudge}
                </span>
              ) : null}
            </>
          ) : (
            <ChatIcon />
          )}
          <span className="sr-only">{persona ? persona.name[lang] : "مساعدة"}</span>
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
            {persona && face ? (
              <div className="flex min-w-0 items-center gap-2" data-testid="assistant-who">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={face} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-black">{persona.name[lang]}</div>
                  <div className="truncate text-[11px] text-black/60">{persona.role[lang]}</div>
                </div>
              </div>
            ) : (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-black">مساعد المتجر</div>
              <div className="truncate text-[11px] text-black/60">مبني على قاعدة المعرفة + دعم</div>
            </div>
            )}
            <div className="flex items-center gap-1">
              {canSpeak ? (
                <button
                  type="button"
                  onClick={toggleSpeak}
                  className={"inline-flex h-8 w-8 items-center justify-center rounded-xl hover:bg-black/5 " + (speakOn ? "text-black" : "text-black/40")}
                  aria-pressed={speakOn}
                  aria-label={say(lang, "قراءة الردود بصوت", "Read replies aloud", "הקראת התשובות")}
                  title={say(lang, "قراءة الردود بصوت", "Read replies aloud", "הקראת התשובות")}
                  data-testid="assistant-speak"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5z" />
                    {speakOn ? <path strokeLinecap="round" d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /> : <path strokeLinecap="round" d="M16 9l5 6M21 9l-5 6" />}
                  </svg>
                </button>
              ) : null}
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

                  {m.role === "assistant" && m.handoff ? (
                    <a
                      href={m.handoff}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-95"
                      data-testid="assistant-handoff"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.3c0-.1-.2-.2-.4-.3z" />
                      </svg>
                      {say(lang, "كمّل مع فريق المتجر على واتساب", "Continue with the shop on WhatsApp", "להמשיך עם החנות בוואטסאפ")}
                    </a>
                  ) : null}

                  {m.role === "assistant" && m.suggestions?.length && m.id === messages[messages.length - 1]?.id && !loading ? (
                    <div className="mt-2 flex flex-wrap gap-1.5" data-testid="assistant-suggestions">
                      {m.suggestions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => void send(q)}
                          className="rounded-full border border-black/15 bg-white px-2.5 py-1 text-[12px] text-black/80 hover:border-black/30"
                        >
                          {q}
                        </button>
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
                placeholder={lines ? lines.hint : "اكتب سؤالك..."}
                className="min-h-[44px] max-h-[120px] w-full resize-none rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-[color:var(--accent-2)]/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              {canListen ? (
                <button
                  type="button"
                  onClick={toggleListen}
                  disabled={loading}
                  className={
                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition " +
                    (listening ? "animate-pulse border-red-400 bg-red-50 text-red-600" : "border-black/10 bg-white text-black/70 hover:bg-black/5")
                  }
                  aria-pressed={listening}
                  aria-label={listening ? say(lang, "وقّف التسجيل", "Stop", "עצירה") : say(lang, "احكي بدل الكتابة", "Speak instead of typing", "לדבר במקום להקליד")}
                  title={listening ? say(lang, "وقّف التسجيل", "Stop", "עצירה") : say(lang, "احكي بدل الكتابة", "Speak instead of typing", "לדבר במקום להקליד")}
                  data-testid="assistant-mic"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path strokeLinecap="round" d="M5 11a7 7 0 0014 0M12 18v3" />
                  </svg>
                </button>
              ) : null}
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
