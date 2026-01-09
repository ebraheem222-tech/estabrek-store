"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

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
  const [isDragging, setIsDragging] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const speechRef = useRef<any>(null);

  const preset = useMemo(() => {
    const id = styleId && styleId !== "default" ? styleId : null;
    return id ? getSearchInputById(id) : null;
  }, [styleId]);

  const wrapperWidthClassName = preset ? pickWidthClasses(preset.containerClassName) : "w-full max-w-[600px]";
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
      if (!ref.current.contains(e.target as any)) {
        setOpen(false);
        setShowImagePanel(false);
      }
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

  async function processImageFile(file: File) {
    setImageError(null);
    setImageLoading(true);
    try {
      const payload = await searchProductsByImage(file);
      saveImageSearchPayload(payload);
      setOpen(false);
      setShowImagePanel(false);
      router.push("/search#image-search");
    } catch (err: any) {
      setImageError(err?.message || "فشل البحث بالصورة");
    } finally {
      setImageLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function onImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  }

  // Drag and drop handlers
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await processImageFile(file);
      } else {
        setImageError("يرجى سحب صورة فقط");
      }
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
      setVoiceError("البحث الصوتي غير مدعوم في هذا المتصفح");
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
      "ar";
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      if (typeof transcript === "string" && transcript.trim()) {
        setQ(transcript.trim());
        setOpen(true);
        commitSearch(transcript.trim());
      }
      setVoiceActive(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event?.error);
      setVoiceActive(false);
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setVoiceError("يرجى السماح بالوصول إلى الميكروفون");
      } else {
        setVoiceError("فشل البحث الصوتي");
      }
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
      setVoiceError("فشل بدء البحث الصوتي");
    }
  }

  return (
    <div ref={ref} className={`relative ${wrapperWidthClassName}`}>
      {/* Main Search Container */}
      <div 
        className="search-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`flex items-center gap-2 p-2 ${isDragging ? 'opacity-50' : ''}`}>
          {/* Search Icon */}
          <div className="flex items-center justify-center w-10 h-10 text-[var(--muted)]">
            <SearchIcon />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitSearch(q);
            }}
            className="flex-1"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="ابحث عن منتج..."
              className="search-input"
              dir="rtl"
            />
          </form>

          {/* Clear Button */}
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setProducts([]);
                setCategories([]);
              }}
              className="search-action-btn !w-8 !h-8"
              aria-label="مسح البحث"
            >
              <CloseIcon />
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Image Search Button */}
          <button
            type="button"
            onClick={() => setShowImagePanel(!showImagePanel)}
            className={`search-action-btn ${showImagePanel ? 'active' : ''}`}
            aria-label="البحث بالصورة"
            disabled={imageLoading}
            title="البحث بالصورة"
          >
            {imageLoading ? <SpinnerIcon /> : <ImageIcon />}
          </button>

          {/* Voice Search Button */}
          <button
            type="button"
            onClick={onVoiceToggle}
            className={`search-action-btn ${voiceActive ? 'active' : ''}`}
            aria-label="البحث الصوتي"
            disabled={!voiceSupported}
            title="البحث الصوتي"
          >
            <MicIcon />
          </button>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onImagePick}
          />
        </div>

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--accent)]/20 border-2 border-dashed border-[var(--accent)] rounded-2xl z-20">
            <div className="text-center">
              <UploadIcon />
              <p className="mt-2 text-sm font-medium">أفلت الصورة هنا</p>
            </div>
          </div>
        )}
      </div>

      {/* Image Search Panel */}
      {showImagePanel && (
        <div className="search-dropdown p-4 mt-2">
          <div className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ImageIcon />
            البحث بالصورة
          </div>
          <div 
            className={`drag-drop-zone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="drag-icon text-[var(--muted)] mb-3">
              <UploadIcon />
            </div>
            <p className="text-sm text-[var(--muted)] mb-2">اسحب وأفلت صورة هنا</p>
            <p className="text-xs text-[var(--muted)]/60 mb-4">أو</p>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              disabled={imageLoading}
            >
              {imageLoading ? (
                <span className="flex items-center gap-2">
                  <SpinnerIcon />
                  جاري البحث...
                </span>
              ) : (
                "اختر صورة من جهازك"
              )}
            </button>
            <p className="text-xs text-[var(--muted)]/60 mt-3">PNG, JPG, WEBP حتى 5MB</p>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {imageError && (
        <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {imageError}
        </div>
      )}
      {voiceError && (
        <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {voiceError}
        </div>
      )}

      {/* Voice Active Indicator */}
      {voiceActive && (
        <div className="mt-2 p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-sm text-[var(--accent)] flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1 h-4 bg-[var(--accent)] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-4 bg-[var(--accent)] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-4 bg-[var(--accent)] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          جاري الاستماع... تحدث الآن
        </div>
      )}

      {/* Search Results Dropdown */}
      {(showRecent || showResults) && !showImagePanel ? (
        <div className="search-dropdown">
          {showRecent ? (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--muted)] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  آخر عمليات البحث
                </span>
                <button
                  type="button"
                  onClick={() => {
                    saveRecent([]);
                    setRecent([]);
                  }}
                  className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  مسح الكل
                </button>
              </div>
              <div className="space-y-1">
                {recent.slice(0, 6).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => commitSearch(r)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-[var(--text)]/80 hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="truncate">{r}</span>
                    <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {showResults ? (
            <div className="p-3 border-t border-white/[0.06]">
              {showDidYouMean ? (
                <div className="mb-3 p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-sm">
                  <span className="text-[var(--muted)]">هل تقصد </span>
                  <button
                    type="button"
                    onClick={() => commitSearch(didYouMean as string)}
                    className="font-semibold text-[var(--accent)] hover:underline"
                  >
                    {didYouMean}
                  </button>
                  <span className="text-[var(--muted)]">؟</span>
                </div>
              ) : null}

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingIndicator
                    className="flex items-center justify-center"
                    fallback={<div className="text-sm text-[var(--muted)]">جاري البحث...</div>}
                  />
                </div>
              ) : null}

              {categories.length ? (
                <div className="mb-3">
                  <div className="px-2 py-1 text-xs font-semibold text-[var(--muted)] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    تصنيفات
                  </div>
                  {categories.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/c/${c.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text)]/80 hover:bg-white/[0.06] transition-colors"
                    >
                      <span className="truncate">{c.name}</span>
                      <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  ))}
                </div>
              ) : null}

              {products.length ? (
                <div>
                  <div className="px-2 py-1 text-xs font-semibold text-[var(--muted)] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    منتجات
                  </div>
                  {products.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      href={`/p/${p.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text)]/80 hover:bg-white/[0.06] transition-colors"
                    >
                      <span className="truncate">{p.title}</span>
                      <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  ))}
                </div>
              ) : null}

              {(!loading && !categories.length && !products.length) ? (
                <div className="text-center py-4 text-sm text-[var(--muted)]">
                  <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  لا توجد نتائج
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => commitSearch(q)}
                className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <SearchIcon />
                عرض كل النتائج
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
