"use client";
import { useLanguage } from "./cinematic/Language";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCanonicalQuery, type CatalogFilters, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";

function chipClass(variant: "default" | "danger" = "default") {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition duration-200 will-change-transform";
  if (variant === "danger") {
    return base + " border-[var(--border)] bg-[var(--text)] text-[var(--bg)] hover:opacity-90";
  }
  return (
    base +
    " border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:-translate-y-0.5 hover:shadow-sm hover:ring-1 hover:ring-[var(--accent)]/40 hover:border-[var(--accent)]"
  );
}

export function FiltersChips({
  categories,
  filters,
  onFiltersChange,
  syncUrl = true,
}: {
  categories: { id: string; name: string }[];
  filters?: CatalogFilters;
  onFiltersChange?: (next: CatalogFilters) => void;
  syncUrl?: boolean;
}) {
  const ar = useLanguage().language === "ar";
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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

  function push(next: CatalogFilters) {
    const qs = buildCanonicalQuery(next);
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (onFiltersChange) {
      if (syncUrl && typeof window !== "undefined") {
        window.history.pushState({}, "", url);
      }
      return;
    }
    router.push(url);
  }

  const chips = useMemo(() => {
    const out: { key: string; label: string; remove: () => void; variant?: "default" | "danger" }[] = [];
    const base = () => ({
      ...currentFilters,
      colors: [...(currentFilters.colors ?? [])],
      sizeIds: [...(currentFilters.sizeIds ?? [])],
    });
    const nav = (n: CatalogFilters) => {
      n.page = undefined;
      onFiltersChange?.(n);
      push(n);
    };

    const q = currentFilters.q;
    if (q)
      out.push({
        key: "q",
        label: `${ar ? "بحث" : "Search"}: ${q}`,
        remove: () => {
          const n = base();
          n.q = undefined;
          nav(n);
        },
      });

    const categoryId = currentFilters.categoryId;
    if (categoryId) {
      const name = categories.find((c) => c.id === categoryId)?.name ?? (ar ? "تصنيف" : "Category");
      out.push({
        key: "categoryId",
        label: `${ar ? "تصنيف" : "Category"}: ${name}`,
        remove: () => {
          const n = base();
          n.categoryId = undefined;
          nav(n);
        },
      });
    }

    if (currentFilters.inStock) {
      out.push({
        key: "inStock",
        label: ar ? "متوفر فقط" : "In stock",
        remove: () => {
          const n = base();
          n.inStock = undefined;
          nav(n);
        },
      });
    }

    const minPrice = currentFilters.minPrice != null ? String(currentFilters.minPrice) : "";
    const maxPrice = currentFilters.maxPrice != null ? String(currentFilters.maxPrice) : "";
    if (minPrice || maxPrice) {
      out.push({
        key: "price",
        label: `${ar ? "السعر" : "Price"}: ${minPrice ?? "0"} - ${maxPrice ?? "∞"}`,
        remove: () => {
          const n = base();
          n.minPrice = undefined;
          n.maxPrice = undefined;
          nav(n);
        },
      });
    }

    (currentFilters.colors ?? []).forEach((c) => {
      out.push({
        key: `color:${c}`,
        label: `لون: ${c}`,
        remove: () => {
          const n = base();
          n.colors = n.colors.filter((x) => x.toLowerCase() !== c.toLowerCase());
          nav(n);
        },
      });
    });

    (currentFilters.sizeIds ?? []).forEach((id) => {
      out.push({
        key: `size:${id}`,
        label: `مقاس: ${id}`,
        remove: () => {
          const n = base();
          n.sizeIds = n.sizeIds.filter((x) => x !== id);
          nav(n);
        },
      });
    });

    const hasAny =
      !!q ||
      !!categoryId ||
      !!currentFilters.inStock ||
      !!minPrice ||
      !!maxPrice ||
      (currentFilters.colors ?? []).length > 0 ||
      (currentFilters.sizeIds ?? []).length > 0;

    if (hasAny) {
      out.unshift({
        key: "clear",
        label: ar ? "مسح الكل" : "Clear all",
        variant: "danger",
        remove: () => {
          const n = base();
          const keepSort = n.sort;
          const keepLm = n.lm;
          const cleared: CatalogFilters = { colors: [], sizeIds: [] };
          if (keepSort) cleared.sort = keepSort;
          if (keepLm) cleared.lm = keepLm;
          nav(cleared);
        },
      });
    }

    return out;
  }, [currentFilters, categories, onFiltersChange, syncUrl, pathname, router, ar]);

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-2" data-motion="stagger">
      {chips.map((c) => (
        <button key={c.key} type="button" onClick={c.remove} className={chipClass(c.variant ?? "default")}> 
          <span>{c.label}</span>
          {c.key !== "clear" ? <span className="opacity-60">×</span> : null}
        </button>
      ))}
    </div>
  );
}
