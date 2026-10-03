"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams, type CatalogFilters } from "@/lib/filtersUrl";
import { CategorySidebar } from "@/components/CategorySidebar";
import { FiltersChips } from "@/components/FiltersChips";
import { ShopToolbar } from "@/components/ShopToolbar";
import ShopResultsClient from "@/components/ShopResultsClient";

const ProductFiltersBar = dynamic(
  () => import("@/components/ProductFiltersBar").then((m) => m.ProductFiltersBar),
  { ssr: false, loading: () => <div className="h-24 rounded-2xl bg-white/5" /> }
);

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
  const selectedCategoryId = filters.categoryId;

  const handleCategorySelect = (id?: string) => {
    setFilters((prev) => ({
      ...prev,
      categoryId: id,
      page: undefined,
      colors: prev.colors ?? [],
      sizeIds: prev.sizeIds ?? [],
    }));
  };

  return (
    <div className="shop-browse-candy-layout lg:grid lg:grid-cols-[300px,1fr] lg:gap-8">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block filters-sidebar shop-right-filters-candy">
        <div className="sticky top-24 space-y-6 right-filter-stack-candy">
          <div className="sidebar-filters-card sidebar-filters-candy-card sidebar-filters-candy-card--category">
            <CategorySidebar
              categories={categories ?? []}
              selectedId={selectedCategoryId}
              onSelect={handleCategorySelect}
            />
          </div>
          <div className="sidebar-filters-card sidebar-filters-candy-card sidebar-filters-candy-card--filters">
            <ProductFiltersBar
              colors={facets?.colors ?? []}
              sizes={facets?.sizes ?? []}
              categories={categories ?? []}
              filters={filters}
              onFiltersChange={setFilters}
              hideCategory
              mobileCategoryTree
              mobileAutoApply
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
            hideCategory
            mobileCategoryTree
            mobileAutoApply
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

      <style jsx>{`
        @keyframes candySidebarPop {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.975);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        .shop-right-filters-candy .sidebar-filters-candy-card {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(120% 100% at 100% 0%, rgba(250, 204, 21, 0.18), transparent 52%),
            radial-gradient(130% 100% at 0% 0%, rgba(244, 114, 182, 0.2), transparent 58%),
            linear-gradient(150deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.62));
          border: 1px solid rgba(255, 255, 255, 0.76);
          box-shadow:
            0 16px 34px rgba(99, 102, 241, 0.12),
            0 14px 30px rgba(236, 72, 153, 0.14);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          animation: candySidebarPop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .shop-right-filters-candy .sidebar-filters-candy-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(
            90deg,
            color-mix(in srgb, var(--accent, #f472b6) 72%, white 28%),
            color-mix(in srgb, var(--accent-2, #f59e0b) 72%, white 28%),
            color-mix(in srgb, var(--accent-3, #38bdf8) 72%, white 28%)
          );
          box-shadow: 0 4px 16px rgba(244, 114, 182, 0.34);
        }

        .shop-right-filters-candy .sidebar-filters-candy-card::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.02) 58%);
        }

        .shop-right-filters-candy .sidebar-filters-candy-card--filters {
          animation-delay: 80ms;
        }

        .shop-right-filters-candy .sidebar-filters-candy-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 22px 40px rgba(99, 102, 241, 0.16),
            0 16px 34px rgba(236, 72, 153, 0.2);
          transition: transform 0.28s ease, box-shadow 0.28s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .shop-right-filters-candy .sidebar-filters-candy-card {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
