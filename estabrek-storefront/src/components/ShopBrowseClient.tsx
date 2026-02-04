"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams, type CatalogFilters } from "@/lib/filtersUrl";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";
import { FiltersChips } from "@/components/FiltersChips";
import { ShopToolbar } from "@/components/ShopToolbar";
import ShopResultsClient from "@/components/ShopResultsClient";

type Props = {
  initial: any;
  initialFilters: CatalogFilters;
  categories: { id: string; name: string; parentId?: string | null }[];
  basePath?: string;
};

export default function ShopBrowseClient({ initial, initialFilters, categories, basePath = "/shop" }: Props) {
  const [filters, setFilters] = useState<CatalogFilters>(() => ({
    ...initialFilters,
    colors: initialFilters.colors ?? [],
    sizeIds: initialFilters.sizeIds ?? [],
    lm: initialFilters.lm ?? 1,
  }));

  const [data, setData] = useState<any>(initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromUrl = () => {
      const search = window.location.search ?? "";
      const obj: Record<string, string> = {};
      new URLSearchParams(search).forEach((v, k) => {
        obj[k] = v;
      });
      const next = normalizeFiltersFromSearchParams(obj);
      const normalized: CatalogFilters = {
        ...next,
        colors: next.colors ?? [],
        sizeIds: next.sizeIds ?? [],
        lm: next.lm ?? 1,
      };
      setFilters((prev) => {
        const prevKey = buildCanonicalQuery({
          ...prev,
          colors: prev.colors ?? [],
          sizeIds: prev.sizeIds ?? [],
        });
        const nextKey = buildCanonicalQuery({
          ...normalized,
          colors: normalized.colors ?? [],
          sizeIds: normalized.sizeIds ?? [],
        });
        if (prevKey === nextKey) return prev;
        return normalized;
      });
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const facets = useMemo(() => data?.facets ?? initial?.facets ?? {}, [data, initial]);
  const total = (data?.total ?? initial?.total ?? data?.items?.length ?? 0) as number;

  return (
    <div className="lg:grid lg:grid-cols-[300px,1fr] lg:gap-8">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block filters-sidebar">
        <div className="sticky top-24 space-y-6">
          <div className="sidebar-filters-card">
            <ProductFiltersBar
              colors={facets?.colors ?? []}
              sizes={facets?.sizes ?? []}
              categories={categories ?? []}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        </div>
      </aside>

      {/* Products Section */}
      <section className="space-y-6">
        {/* Mobile Filters */}
        <div className="lg:hidden">
          <ProductFiltersBar
            colors={facets?.colors ?? []}
            sizes={facets?.sizes ?? []}
            categories={categories ?? []}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        <ShopToolbar total={total} filters={filters} onFiltersChange={setFilters} hideModeToggle />

        <FiltersChips categories={categories ?? []} filters={filters} onFiltersChange={setFilters} />

        <ShopResultsClient
          initial={initial}
          filters={filters}
          basePath={basePath}
          onData={setData}
        />
      </section>
    </div>
  );
}
