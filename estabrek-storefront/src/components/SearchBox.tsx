"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { getSearchInputById } from "@/cms/style/searchStyles";
import { saveImageSearchPayload, searchProductsByImage } from "@/lib/imageSearchClient";

type SuggestProduct = { id: string; title: string; slug: string };
type SuggestCategory = { id: string; name: string; slug: string };

const RECENT_KEY = "recent_searches_v1";

function getSpeechRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    // ignore
  }
}

function uniq(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const k = s.trim().toLowerCase();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s.trim());
  }
  return out;
}

function pickWidthClasses(className: string | undefined): string {
  if (!className) return "";
  return className
    .split(/\s+/)
    .filter((token) => token.startsWith("w-") || token.startsWith("max-w-") || token.startsWith("min-w-"))
    .join(" ");
}

function stripWidthClasses(className: string | undefined): string {
  if (!className) return "";
  return className
    .split(/\s+/)
    .filter((token) => !(token.startsWith("w-") || token.startsWith("max-w-") || token.startsWith("min-w-")))
    .join(" ");
}

export function SearchBox({ styleId }: { styleId?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [products, setProducts] = useState<SuggestProduct[]>([]);
  const [categories, setCategories] = useState<SuggestCategory[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const speechRef = useRef<any>(null);

  const preset = useMemo(() => {
    const id = styleId && styleId !== "default" ? styleId : null;
    return id ? getSearchInputById(id) : null;
  }, [styleId]);

  const wrapperWidthClassName = preset ? pickWidthClasses(preset.containerClassName) : "w-full max-w-[520px]";
  const presetContainer = preset ? stripWidthClasses(preset.containerClassName) : "";
  const iconIsAbsolute = !!preset?.iconClassName?.includes("absolute");
  const iconOnLeft = iconIsAbsolute && !!preset?.iconClassName?.includes("left");

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    setVoiceSupported(!!getSpeechRecognitionCtor());
    return () => {
      try {
        if (speechRef.current) {
          speechRef.current.onresult = null;
          speechRef.current.onerror = null;
          speechRef.current.onend = null;
          speechRef.current.stop();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced suggest
  useEffect(() => {
    const query = q.trim();
    if (!open) return;
    if (query.length < 2) {
      setProducts([]);
      setCategories([]);
      setDidYouMean(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setProducts(Array.isArray(json?.products) ? json.products : []);
        setCategories(Array.isArray(json?.categories) ? json.categories : []);
        setDidYouMean(typeof json?.didYouMean === "string" ? json.didYouMean : null);
      } catch {
        setProducts([]);
        setCategories([]);
        setDidYouMean(null);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const showRecent = useMemo(() => open && q.trim().length < 2 && recent.length > 0, [open, q, recent]);
  const showResults = useMemo(
    () => open && (products.length > 0 || categories.length > 0 || loading || !!didYouMean),
    [open, products, categories, loading, didYouMean]
  );
  const showDidYouMean = useMemo(() => {
    const next = didYouMean?.trim();
    if (!open || !next) return false;
    return next !== q.trim();
  }, [open, didYouMean, q]);

  function commitSearch(next: string) {
    const query = next.trim();
    if (!query) return;
    const updated = uniq([query, ...loadRecent()]).slice(0, 10);
    saveRecent(updated);
    setRecent(updated);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  async function onImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    setImageLoading(true);
    try {
      const payload = await searchProductsByImage(file);
      saveImageSearchPayload(payload);
      setOpen(false);
      router.push("/search#image-search");
    } catch (err: any) {
      setImageError(err?.message || "Image search failed.");
    } finally {
      setImageLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function stopVoice() {
    try {
      speechRef.current?.stop?.();
    } catch {
      // ignore
    }
    setVoiceActive(false);
  }

  function onVoiceToggle() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceSupported(false);
      setVoiceError("Voice search is not supported in this browser.");
      return;
    }
    if (voiceActive) {
      stopVoice();
      return;
    }

    let recognition = speechRef.current;
    if (!recognition) {
      recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      speechRef.current = recognition;
    }

    const lang =
      (typeof document !== "undefined" && document.documentElement?.lang) ||
      (typeof navigator !== "undefined" && navigator.language) ||
      "en-US";
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript ? String(event.results[0][0].transcript).trim() : "";
      if (transcript) {
        setQ(transcript);
        commitSearch(transcript);
      }
      setVoiceActive(false);
    };
    recognition.onerror = (event: any) => {
      const code = String(event?.error || "").toLowerCase();
      if (code === "not-allowed" || code === "service-not-allowed") {
        setVoiceError("Microphone permission denied.");
      } else if (code === "no-speech") {
        setVoiceError("No speech detected. Try again.");
      } else {
        setVoiceError("Voice search failed.");
      }
      setVoiceActive(false);
    };
    recognition.onend = () => {
      setVoiceActive(false);
    };

    setVoiceError(null);
    setVoiceActive(true);
    try {
      recognition.start();
    } catch {
      setVoiceActive(false);
      setVoiceError("Voice search failed to start.");
    }
  }

  return (
    <div ref={ref} className={`relative ${wrapperWidthClassName}`}>
      <div className="flex items-center gap-2">
        {preset ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitSearch(q);
            }}
            className={`relative flex-1 ${presetContainer}`}
          >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="ابحث عن منتج..."
            className={preset.inputClassName}
            dir="rtl"
          />

          {preset.buttonClassName ? (
            <button type="submit" className={preset.buttonClassName}>
              {preset.iconClassName && !iconIsAbsolute ? <span className={preset.iconClassName}>🔎</span> : "بحث"}
            </button>
          ) : null}

          {preset.iconClassName && iconIsAbsolute ? <span className={preset.iconClassName}>🔎</span> : null}

          {q && !preset.buttonClassName ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setProducts([]);
                setCategories([]);
              }}
              className={`absolute ${iconOnLeft ? "right-2" : "left-2"} top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-current opacity-60 hover:opacity-100`}
              aria-label="مسح البحث"
            >
              ✕
            </button>
          ) : null}
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitSearch(q);
            }}
            className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
          >
          <span className="opacity-70">🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="ابحث عن منتج..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/50"
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setProducts([]);
                setCategories([]);
              }}
              className="rounded-lg px-2 py-1 text-white/70 hover:bg-white/[0.06]"
              aria-label="مسح البحث"
            >
              ✕
            </button>
          ) : null}
          </form>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onImagePick}
        />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--text)] hover:brightness-95"
          aria-label="Search by image"
          disabled={imageLoading}
        >
          {imageLoading ? "..." : "IMG"}
        </button>
        <button
          type="button"
          onClick={onVoiceToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--text)] hover:brightness-95"
          aria-label="Voice search"
          disabled={!voiceSupported}
        >
          {voiceActive ? "REC" : "MIC"}
        </button>
      </div>

      {imageError ? (
        <div className="mt-2 text-xs text-red-500">{imageError}</div>
      ) : null}
      {voiceError ? (
        <div className="mt-2 text-xs text-red-500">{voiceError}</div>
      ) : null}

      {(showRecent || showResults) ? (
        <div className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--surface)] shadow-xl">
          {showRecent ? (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-semibold text-white/70">آخر عمليات البحث</div>
              <div className="divide-y divide-white/10">
                {recent.slice(0, 6).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => commitSearch(r)}
                    className="flex w-full items-center justify-between gap-2 px-2 py-2 text-sm text-white/80 hover:bg-white/[0.06]"
                  >
                    <span className="truncate">{r}</span>
                    <span className="opacity-60">↩</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  saveRecent([]);
                  setRecent([]);
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 hover:bg-white/[0.08]"
              >
                مسح السجل
              </button>
            </div>
          ) : null}

              {showResults ? (
                <div className="p-2">
                  {showDidYouMean ? (
                    <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80">
                      <span className="text-xs text-white/60">هل تقصد</span>{" "}
                      <button
                        type="button"
                        onClick={() => commitSearch(didYouMean as string)}
                        className="font-semibold text-white hover:underline"
                      >
                        {didYouMean}
                      </button>
                      ؟
                    </div>
                  ) : null}
              {loading ? (
                <div className="px-2 py-2">
                  <LoadingIndicator
                    className="flex items-center justify-center"
                    fallback={<div className="text-sm text-white/60">جاري البحث...</div>}
                  />
                </div>
              ) : null}

              {categories.length ? (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-white/70">تصنيفات</div>
                  {categories.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/c/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-sm text-white/80 hover:bg-white/[0.06]"
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="opacity-60">↗</span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {products.length ? (
                <div>
                  <div className="px-2 py-1 text-xs font-semibold text-white/70">منتجات</div>
                  {products.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      href={`/p/${p.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-sm text-white/80 hover:bg-white/[0.06]"
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="opacity-60">↗</span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {(!loading && !categories.length && !products.length) ? (
                <div className="px-2 py-2 text-sm text-white/60">لا توجد نتائج</div>
              ) : null}

              <button
                type="button"
                onClick={() => commitSearch(q)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80 hover:bg-white/[0.08]"
              >
                عرض كل النتائج
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
