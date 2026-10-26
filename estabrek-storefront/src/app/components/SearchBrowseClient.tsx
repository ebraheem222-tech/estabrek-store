"use client";

import React, { useMemo, useState } from "react";
import type { CatalogFilters } from "@/lib/filtersUrl";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";
import ShopResultsClient from "@/components/ShopResultsClient";
import { ImageSearchPanel } from "@/components/ImageSearchPanel";

// Icons
const SearchIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ProductsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

type Props = {
  initial: any;
  initialFilters: CatalogFilters;
  categories: { id: string; name: string; parentId?: string | null }[];
  breadcrumbsEnabled: boolean;
  imageSearchEnabled: boolean;
  basePath?: string;
};

export default function SearchBrowseClient({
  initial,
  initialFilters,
  categories,
  breadcrumbsEnabled,
  imageSearchEnabled,
  basePath = "/search",
}: Props) {
  const [filters, setFilters] = useState<CatalogFilters>(() => ({
    ...initialFilters,
    colors: initialFilters.colors ?? [],
    sizeIds: initialFilters.sizeIds ?? [],
  }));

  const [data, setData] = useState<any>(initial);
  const [loading, setLoading] = useState(false);

  const total = (data?.total ?? initial?.total ?? data?.items?.length ?? 0) as number;
  const facets = useMemo(() => data?.facets ?? initial?.facets ?? {}, [data, initial]);
  const query = filters.q?.trim();
  const hasItems = (data?.items ?? []).length > 0;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8" dir="rtl">
      {/* Breadcrumb */}
      {breadcrumbsEnabled ? (
        <nav className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <a href="/" className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
            <HomeIcon />
            الرئيسية
          </a>
          <ChevronLeftIcon />
          <span className="text-[var(--text)]">البحث</span>
        </nav>
      ) : null}

      {/* Search Header */}
      <div className="search-page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="search-page-title">
            <div className="search-page-icon">
              <SearchIcon />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">
                {query ? "نتائج البحث" : "البحث في المتجر"}
              </h1>
              {query && (
                <div className="mt-2">
                  <span className="search-query-badge">
                    <SearchIcon />
                    {query}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="search-results-count">
            <ProductsIcon />
            {total} منتج
          </div>
        </div>
      </div>

      {/* Image Search Panel */}
      {imageSearchEnabled ? <ImageSearchPanel /> : null}

      {/* Filters */}
      <ProductFiltersBar
        colors={facets?.colors ?? []}
        sizes={facets?.sizes ?? []}
        categories={categories ?? []}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {!hasItems && !loading ? (
        <div className="no-results">
          <div className="no-results-icon text-[var(--muted)]">
            <EmptyIcon />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text)] mb-2">لا توجد نتائج</h3>
          <p className="text-sm text-[var(--muted)] mb-6 max-w-md">
            لم نتمكن من العثور على منتجات تطابق بحثك. جرب تعديل الفلاتر أو البحث بكلمات مختلفة.
          </p>
          <a
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            تصفح جميع المنتجات
            <ChevronLeftIcon />
          </a>
        </div>
      ) : null}

      <ShopResultsClient
        initial={initial}
        filters={filters}
        basePath={basePath}
        showHeader={false}
        onData={setData}
        onLoading={setLoading}
      />
    </main>
  );
}
