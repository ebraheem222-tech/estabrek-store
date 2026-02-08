"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCanonicalQuery, type CatalogFilters, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import { CategorySidebar } from "@/components/CategorySidebar";

type FacetColor = { name: string; hex?: string | null; count: number };
type FacetSize = { id: string; name: string; count: number };

// Icons
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CategoryIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const SortIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
  </svg>
);

const PriceIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ColorIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const SizeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

function uniqCaseInsensitive(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of arr) {
    const k = a.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

export function ProductFiltersBar({
  colors,
  sizes,
  categories,
  className,
  filters,
  onFiltersChange,
  syncUrl = true,
  hideCategory = false,
  mobileCategoryTree = false,
  mobileAutoApply = false,
}: {
  colors: FacetColor[];
  sizes: FacetSize[];
  categories: { id: string; name: string; parentId?: string | null }[];
  className?: string;
  filters?: CatalogFilters;
  onFiltersChange?: (next: CatalogFilters) => void;
  syncUrl?: boolean;
  hideCategory?: boolean;
  mobileCategoryTree?: boolean;
  mobileAutoApply?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [draftFilters, setDraftFilters] = useState<CatalogFilters | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    colors: true,
    sizes: true,
  });

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

  useEffect(() => {
    if (!mobileOpen || mobileAutoApply) {
      setDraftFilters(null);
      return;
    }
    setDraftFilters({
      ...currentFilters,
      colors: currentFilters.colors ?? [],
      sizeIds: currentFilters.sizeIds ?? [],
    });
  }, [mobileOpen, currentFilters, mobileAutoApply]);

  const workingFilters = mobileOpen && draftFilters && !mobileAutoApply ? draftFilters : currentFilters;

  const sortParam = workingFilters.sort ?? "latest";
  const minPriceParam = workingFilters.minPrice != null ? String(workingFilters.minPrice) : "";
  const maxPriceParam = workingFilters.maxPrice != null ? String(workingFilters.maxPrice) : "";
  const qParam = workingFilters.q ?? "";
  const inStockParam = !!workingFilters.inStock;
  const categoryIdParam = workingFilters.categoryId ?? "";

  const selectedColors = workingFilters.colors ?? [];
  const selectedSizes = workingFilters.sizeIds ?? [];

  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === categoryIdParam);
  }, [categories, categoryIdParam]);

  const categoryOptions = useMemo(() => {
    const byParent = new Map<string | null, { id: string; name: string; parentId?: string | null }[]>();
    const byId = new Map<string, { id: string; name: string; parentId?: string | null }>();
    for (const c of categories) {
      byId.set(c.id, c);
      const pid = c.parentId ?? null;
      const list = byParent.get(pid) ?? [];
      list.push(c);
      byParent.set(pid, list);
    }

    const out: Array<{ id: string; name: string; depth: number }> = [];
    const seen = new Set<string>();
    const walk = (pid: string | null, depth: number) => {
      const list = byParent.get(pid) ?? [];
      for (const c of list) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        out.push({ id: c.id, name: c.name, depth });
        walk(c.id, depth + 1);
      }
    };

    // Start with root categories (parentId is null)
    walk(null, 0);

    // Add any orphans (parentId exists but missing in list)
    for (const c of categories) {
      if (!c.parentId || byId.has(c.parentId)) continue;
      if (seen.has(c.id)) continue;
      out.push({ id: c.id, name: c.name, depth: 0 });
      walk(c.id, 1);
    }

    // Add any remaining items
    for (const c of categories) {
      if (seen.has(c.id)) continue;
      out.push({ id: c.id, name: c.name, depth: 0 });
    }

    return out;
  }, [categories]);

  const [qInput, setQInput] = useState(qParam);
  const [minInput, setMinInput] = useState(minPriceParam);
  const [maxInput, setMaxInput] = useState(maxPriceParam);

  useEffect(() => {
    setQInput(qParam);
  }, [qParam]);

  useEffect(() => {
    setMinInput(minPriceParam);
  }, [minPriceParam]);

  useEffect(() => {
    setMaxInput(maxPriceParam);
  }, [maxPriceParam]);

  useEffect(() => {
    if (!mobileOpen || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Build active filters array for tags display
  const activeFilters = useMemo(() => {
    const filters: Array<{ type: string; label: string; value: string }> = [];
    if (qParam) filters.push({ type: "q", label: `بحث: ${qParam}`, value: qParam });
    if (selectedCategory) filters.push({ type: "categoryId", label: selectedCategory.name, value: categoryIdParam });
    if (inStockParam) filters.push({ type: "inStock", label: "متوفر فقط", value: "1" });
    if (minPriceParam) filters.push({ type: "minPrice", label: `من: ₪${minPriceParam}`, value: minPriceParam });
    if (maxPriceParam) filters.push({ type: "maxPrice", label: `إلى: ₪${maxPriceParam}`, value: maxPriceParam });
    selectedColors.forEach(c => filters.push({ type: "color", label: c, value: c }));
    selectedSizes.forEach(s => {
      const size = sizes.find(sz => sz.id === s);
      filters.push({ type: "size", label: size?.name || s, value: s });
    });
    return filters;
  }, [qParam, selectedCategory, categoryIdParam, inStockParam, minPriceParam, maxPriceParam, selectedColors, selectedSizes, sizes]);

  const activeFiltersCount = activeFilters.length;
  const hasAny = activeFiltersCount > 0;

  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== qParam) setSimple("q", qInput.trim() || undefined, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [qInput, qParam]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (minInput !== minPriceParam) setSimple("minPrice", minInput.trim() || undefined, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [minInput, minPriceParam]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (maxInput !== maxPriceParam) setSimple("maxPrice", maxInput.trim() || undefined, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [maxInput, maxPriceParam]);

  function normalizeFilters(next: CatalogFilters): CatalogFilters {
    const colorsNorm = uniqCaseInsensitive(next.colors ?? []).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    const sizesNorm = uniqCaseInsensitive(next.sizeIds ?? []).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    const out: CatalogFilters = { colors: colorsNorm, sizeIds: sizesNorm };
    if (next.minPrice != null && Number.isFinite(next.minPrice as any)) out.minPrice = next.minPrice;
    if (next.maxPrice != null && Number.isFinite(next.maxPrice as any)) out.maxPrice = next.maxPrice;
    if (out.minPrice != null && out.maxPrice != null && out.minPrice > out.maxPrice) {
      const t = out.minPrice;
      out.minPrice = out.maxPrice;
      out.maxPrice = t;
    }
    if (next.sort) out.sort = next.sort;
    if (next.q) out.q = next.q;
    if (next.inStock) out.inStock = true;
    if (next.categoryId) out.categoryId = next.categoryId;
    if (next.page && next.page > 1) out.page = next.page;
    if (next.lm) out.lm = next.lm;
    return out;
  }

  function push(next: CatalogFilters, opts?: { replace?: boolean }) {
    if (!pathname) return;
    const qs = buildCanonicalQuery(next);
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (onFiltersChange) {
      if (syncUrl && typeof window !== "undefined") {
        const method = opts?.replace ? "replaceState" : "pushState";
        window.history[method]({}, "", url);
      }
      return;
    }
    startTransition(() => {
      if (opts?.replace) router.replace(url);
      else router.push(url);
    });
  }

  function removeFilter(type: string, value: string) {
    const next: CatalogFilters = {
      ...workingFilters,
      colors: [...(workingFilters.colors ?? [])],
      sizeIds: [...(workingFilters.sizeIds ?? [])],
    };
    if (type === "color") {
      next.colors = next.colors.filter((c) => c.toLowerCase() !== value.toLowerCase());
    } else if (type === "size") {
      next.sizeIds = next.sizeIds.filter((s) => s !== value);
    } else {
      (next as any)[type] = undefined;
    }
    next.page = undefined;
    const normalized = normalizeFilters(next);
    if (mobileOpen && !mobileAutoApply) {
      setDraftFilters(normalized);
    } else {
      onFiltersChange?.(normalized);
      push(normalized);
    }
  }

  function toggleColor(name: string) {
    const next: CatalogFilters = {
      ...workingFilters,
      colors: [...(workingFilters.colors ?? [])],
      sizeIds: [...(workingFilters.sizeIds ?? [])],
    };
    const exists = next.colors.some((c) => c.toLowerCase() === name.toLowerCase());
    next.colors = exists ? next.colors.filter((c) => c.toLowerCase() !== name.toLowerCase()) : [...next.colors, name];
    next.page = undefined;
    const normalized = normalizeFilters(next);
    if (mobileOpen && !mobileAutoApply) {
      setDraftFilters(normalized);
    } else {
      onFiltersChange?.(normalized);
      push(normalized);
    }
  }

  function toggleSize(id: string) {
    const next: CatalogFilters = {
      ...workingFilters,
      colors: [...(workingFilters.colors ?? [])],
      sizeIds: [...(workingFilters.sizeIds ?? [])],
    };
    const exists = next.sizeIds.includes(id);
    next.sizeIds = exists ? next.sizeIds.filter((s) => s !== id) : [...next.sizeIds, id];
    next.page = undefined;
    const normalized = normalizeFilters(next);
    if (mobileOpen && !mobileAutoApply) {
      setDraftFilters(normalized);
    } else {
      onFiltersChange?.(normalized);
      push(normalized);
    }
  }

  function setSimple(key: string, value?: string, opts?: { replace?: boolean }) {
    const next: CatalogFilters = {
      ...workingFilters,
      colors: [...(workingFilters.colors ?? [])],
      sizeIds: [...(workingFilters.sizeIds ?? [])],
    };
    if (!value) {
      (next as any)[key] = undefined;
    } else if (key === "minPrice" || key === "maxPrice") {
      const num = Number(value);
      (next as any)[key] = Number.isFinite(num) ? num : undefined;
    } else if (key === "inStock") {
      (next as any)[key] = value ? true : undefined;
    } else {
      (next as any)[key] = value;
    }
    next.page = undefined;
    const normalized = normalizeFilters(next);
    if (mobileOpen && !mobileAutoApply) {
      setDraftFilters(normalized);
    } else {
      onFiltersChange?.(normalized);
      push(normalized, opts);
    }
  }

  function clearAll() {
    const normalized = normalizeFilters({ colors: [], sizeIds: [] });
    if (mobileOpen && !mobileAutoApply) {
      setDraftFilters(normalized);
    } else {
      onFiltersChange?.(normalized);
      push(normalized);
    }
  }

  function closeMobile() {
    if (!mobileOpen || isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      setMobileOpen(false);
      setDraftFilters(null);
      setIsClosing(false);
    }, 240);
  }

  function applyMobile() {
    if (mobileAutoApply) {
      closeMobile();
      return;
    }
    const normalized = normalizeFilters(draftFilters ?? workingFilters);
    onFiltersChange?.(normalized);
    push(normalized);
    setMobileOpen(false);
    setDraftFilters(null);
  }

  function toggleSection(section: string) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }

  const filtersContent = (
    <div className="space-y-5">
      {/* Active Filter Tags */}
      {hasAny && (
        <div className="filter-tags">
          {activeFilters.map((filter, idx) => (
            <span key={`${filter.type}-${filter.value}-${idx}`} className="filter-tag">
              {filter.label}
              <button
                type="button"
                onClick={() => removeFilter(filter.type, filter.value)}
                className="filter-tag-remove"
              >
                <XIcon />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="filter-section">
        <label className="filter-label">
          <SearchIcon />
          بحث
        </label>
        <div className="relative">
          <input
            className="filter-input pr-10"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="ابحث عن منتج..."
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <SearchIcon />
          </div>
        </div>
      </div>

      {/* Category & Sort Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {!hideCategory ? (
          <div className="filter-section">
            <label className="filter-label">
              <CategoryIcon />
              التصنيف
            </label>
            <select
              className="filter-select"
              value={categoryIdParam}
              onChange={(e) => setSimple("categoryId", e.target.value || undefined)}
            >
              <option value="">جميع التصنيفات</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.depth > 0 ? `${"— ".repeat(c.depth)}${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="filter-section">
          <label className="filter-label">
            <SortIcon />
            الترتيب
          </label>
          <select
            className="filter-select"
            value={sortParam}
            onChange={(e) => setSimple("sort", e.target.value)}
          >
            <option value="latest">الأحدث</option>
            <option value="title_asc">العنوان أ→ي</option>
            <option value="title_desc">العنوان ي→أ</option>
            <option value="price_asc">السعر: الأقل أولاً</option>
            <option value="price_desc">السعر: الأعلى أولاً</option>
          </select>
        </div>
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <label className="filter-label">
          <PriceIcon />
          نطاق السعر
        </label>
        <div className="price-range-container">
          <div className="relative flex-1">
            <input
              className="price-range-input"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              placeholder="الحد الأدنى"
              inputMode="numeric"
              dir="ltr"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">₪</span>
          </div>
          <div className="flex items-center justify-center w-8">
            <span className="price-range-separator">—</span>
          </div>
          <div className="relative flex-1">
            <input
              className="price-range-input"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              placeholder="الحد الأقصى"
              inputMode="numeric"
              dir="ltr"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">₪</span>
          </div>
        </div>
      </div>

      {/* In Stock Toggle */}
      <div className="filter-section">
        <button
          type="button"
          onClick={() => setSimple("inStock", inStockParam ? undefined : "1")}
          className={`filter-toggle ${inStockParam ? "active" : ""}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              inStockParam 
                ? "bg-[var(--accent)] border-[var(--accent)]" 
                : "border-white/20 bg-transparent"
            }`}>
              {inStockParam && <CheckIcon />}
            </div>
            <span className="font-medium">المتوفر فقط</span>
          </div>
          <span className="filter-toggle-indicator" />
        </button>
      </div>

      {/* Colors Accordion */}
      {colors.length > 0 && (
        <div className={`filter-accordion ${expandedSections.colors ? "open" : ""}`}>
          <button
            type="button"
            className="filter-accordion-header"
            onClick={() => toggleSection("colors")}
          >
            <div className="flex items-center gap-2">
              <ColorIcon />
              <span className="font-medium">الألوان</span>
              {selectedColors.length > 0 && (
                <span className="active-filters-count">{selectedColors.length}</span>
              )}
            </div>
            <div className={`transition-transform duration-300 ${expandedSections.colors ? "rotate-180" : ""}`}>
              <ChevronDownIcon />
            </div>
          </button>
          <div className={`filter-accordion-content ${expandedSections.colors ? "expanded" : ""}`}>
            <div className="filter-accordion-body">
              <div className="color-chips-container">
                {colors.map((c) => {
                  const active = selectedColors.some((x) => x.toLowerCase() === c.name.toLowerCase());
                  const hex = c.hex?.startsWith("#") ? c.hex : c.hex ? `#${c.hex}` : null;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggleColor(c.name)}
                      className={`color-chip ${active ? "active" : ""}`}
                    >
                      <span 
                        className="color-chip-swatch" 
                        style={{ background: hex ?? "linear-gradient(135deg, #ddd, #888)" }} 
                      />
                      <span>{c.name}</span>
                      <span className="color-chip-count">({c.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sizes Accordion */}
      {sizes.length > 0 && (
        <div className={`filter-accordion ${expandedSections.sizes ? "open" : ""}`}>
          <button
            type="button"
            className="filter-accordion-header"
            onClick={() => toggleSection("sizes")}
          >
            <div className="flex items-center gap-2">
              <SizeIcon />
              <span className="font-medium">المقاسات</span>
              {selectedSizes.length > 0 && (
                <span className="active-filters-count">{selectedSizes.length}</span>
              )}
            </div>
            <div className={`transition-transform duration-300 ${expandedSections.sizes ? "rotate-180" : ""}`}>
              <ChevronDownIcon />
            </div>
          </button>
          <div className={`filter-accordion-content ${expandedSections.sizes ? "expanded" : ""}`}>
            <div className="filter-accordion-body">
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const active = selectedSizes.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSize(s.id)}
                      className={`size-chip ${active ? "active" : ""}`}
                    >
                      {s.name}
                      <span className="text-xs opacity-60 mr-1">({s.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={className} dir="rtl">
      {/* Mobile Filter Toggle */}
      <button 
        type="button" 
        onClick={() => {
          setIsClosing(false);
          setMobileOpen(true);
        }} 
        className={`mobile-filter-toggle md:hidden ${mobileOpen ? "opacity-0 pointer-events-none" : ""}`}
      >
        <FilterIcon />
        <span>الفلاتر</span>
        {activeFiltersCount > 0 && (
          <span className="active-filters-count">{activeFiltersCount}</span>
        )}
      </button>

      {/* Desktop Filters */}
      <div className="filters-container hidden md:block">
        <div className="filters-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white">
              <FilterIcon />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text)]">الفلاتر</h3>
              {activeFiltersCount > 0 && (
                <p className="text-xs text-[var(--muted)]">{activeFiltersCount} فلتر نشط</p>
              )}
            </div>
          </div>
          {hasAny && (
            <button type="button" onClick={clearAll} className="clear-filters-btn">
              <TrashIcon />
              مسح الكل
            </button>
          )}
        </div>
        {filtersContent}
      </div>

      {/* Mobile Filters Modal */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[1300] md:hidden" role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-black/20 filter-backdrop" 
            onClick={closeMobile} 
          />
          <div 
            className={`absolute inset-y-0 right-0 w-[80vw] max-w-[520px] bg-[var(--surface)] overflow-y-auto ${isClosing ? "filter-drawer-closing" : "filter-drawer-opening"}`}
          >
            {/* Mobile Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-4 border-b border-white/10 bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white">
                  <FilterIcon />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text)]">الفلاتر</h3>
                  {activeFiltersCount > 0 && (
                    <p className="text-xs text-[var(--muted)]">{activeFiltersCount} فلتر نشط</p>
                  )}
                </div>
              </div>
              <button 
                type="button" 
                onClick={closeMobile} 
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[var(--text)] hover:bg-white/10 transition-colors"
                aria-label="Close filters"
              >
                <CloseIcon />
                <span className="text-sm font-medium">إغلاق</span>
              </button>
            </div>

            {/* Mobile Content */}
            <div className="p-4 pb-28">
              {mobileCategoryTree && categories?.length ? (
                <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <CategorySidebar
                    categories={categories}
                    selectedId={categoryIdParam || undefined}
                    onSelect={(id) => setSimple("categoryId", id || undefined)}
                  />
                </div>
              ) : null}
              {filtersContent}
            </div>

            {/* Mobile Footer */}
            <div className="sticky bottom-0 z-20 p-4 border-t border-white/10 bg-[var(--surface)] flex gap-3">
              {hasAny && (
                <button 
                  type="button" 
                  onClick={clearAll} 
                  className="flex-1 py-3 rounded-xl border border-white/10 text-[var(--text)] font-medium hover:bg-white/5 transition-colors"
                >
                  مسح الكل
                </button>
              )}
              {!mobileAutoApply && (
                <button 
                  type="button" 
                  onClick={applyMobile} 
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  تطبيق الفلاتر
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .filter-drawer-opening {
          animation: slideInRight 0.3s ease;
        }

        .filter-drawer-closing {
          animation: slideOutRight 0.24s ease forwards;
        }
        
        .filter-accordion-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        
        .filter-accordion-content.expanded {
          max-height: 500px;
        }
      `}</style>
    </div>
  );
}
