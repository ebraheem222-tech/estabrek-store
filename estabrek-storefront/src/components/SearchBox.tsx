"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingIndicator } from "@/components/LoadingIndicator";

type SuggestProduct = { id: string; title: string; slug: string };
type SuggestCategory = { id: string; name: string; slug: string };

const RECENT_KEY = "recent_searches_v1";

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

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SuggestProduct[]>([]);
  const [categories, setCategories] = useState<SuggestCategory[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecent(loadRecent());
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
      return;
    }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setProducts(Array.isArray(json?.products) ? json.products : []);
        setCategories(Array.isArray(json?.categories) ? json.categories : []);
      } catch {
        setProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const showRecent = useMemo(() => open && q.trim().length < 2 && recent.length > 0, [open, q, recent]);
  const showResults = useMemo(() => open && (products.length > 0 || categories.length > 0 || loading), [open, products, categories, loading]);

  function commitSearch(next: string) {
    const query = next.trim();
    if (!query) return;
    const updated = uniq([query, ...loadRecent()]).slice(0, 10);
    saveRecent(updated);
    setRecent(updated);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <div ref={ref} className="relative w-full max-w-[520px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commitSearch(q);
        }}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
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
          >
            ✕
          </button>
        ) : null}
      </form>

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
