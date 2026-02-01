"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCanonicalQuery, type CatalogFilters, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";

type SortKey = "latest" | "title_asc" | "title_desc" | "price_asc" | "price_desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "الأحدث" },
  { key: "price_asc", label: "السعر: من الأقل" },
  { key: "price_desc", label: "السعر: من الأعلى" },
  { key: "title_asc", label: "الاسم: A-Z" },
  { key: "title_desc", label: "الاسم: Z-A" },
];

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function ShopToolbar({
  total,
  filters,
  onFiltersChange,
  syncUrl = true,
  hideModeToggle = false,
}: {
  total: number;
  filters?: CatalogFilters;
  onFiltersChange?: (next: CatalogFilters) => void;
  syncUrl?: boolean;
  hideModeToggle?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const urlFilters = useMemo(() => {
    const obj: Record<string, string> = {};
    sp?.forEach((v, k) => {
      obj[k] = v;
    });
    return normalizeFiltersFromSearchParams(obj);
  }, [sp]);

  const currentFilters = useMemo(() => {
    const src = filters ?? urlFilters;
    return {
      ...src,
      colors: src.colors ?? [],
      sizeIds: src.sizeIds ?? [],
    } as CatalogFilters;
  }, [filters, urlFilters]);

  const sort = (currentFilters.sort as SortKey | undefined) ?? "latest";
  const lm = !!currentFilters.lm;

  function push(next: CatalogFilters) {
    const qs = buildCanonicalQuery(next);
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (onFiltersChange) {
      if (syncUrl && typeof window !== "undefined") {
        window.history.replaceState({}, "", url);
      }
      return;
    }
    router.push(url);
  }

  return (
    <div className="sticky top-[72px] z-20 -mx-4 border-y border-[var(--border)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur md:static md:mx-0 md:border md:rounded-2xl md:bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--text)]">{total}</span> منتج
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted)]">الترتيب</label>
          <select
            value={sort}
            onChange={(e) => {
              const next: CatalogFilters = { ...currentFilters, colors: [...currentFilters.colors], sizeIds: [...currentFilters.sizeIds] };
              next.sort = e.target.value as SortKey;
              next.page = undefined;
              onFiltersChange?.(next);
              push(next);
            }}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          {!hideModeToggle && (
            <div className="ms-2 hidden sm:flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
              <button
                type="button"
                onClick={() => {
                  const next: CatalogFilters = { ...currentFilters, colors: [...currentFilters.colors], sizeIds: [...currentFilters.sizeIds] };
                  next.lm = undefined;
                  next.page = undefined;
                  onFiltersChange?.(next);
                  push(next);
                }}
                className={cx(
                  "h-9 rounded-lg px-3 text-sm",
                  !lm && "bg-[var(--text)] text-[var(--bg)]",
                  lm && "text-[var(--muted)] hover:opacity-90"
                )}
                aria-pressed={!lm}
              >
                صفحات
              </button>
              <button
                type="button"
                onClick={() => {
                  const next: CatalogFilters = { ...currentFilters, colors: [...currentFilters.colors], sizeIds: [...currentFilters.sizeIds] };
                  next.lm = 1;
                  next.page = undefined;
                  onFiltersChange?.(next);
                  push(next);
                }}
                className={cx(
                  "h-9 rounded-lg px-3 text-sm",
                  lm && "bg-[var(--text)] text-[var(--bg)]",
                  !lm && "text-[var(--muted)] hover:opacity-90"
                )}
                aria-pressed={lm}
              >
                تحميل المزيد
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
