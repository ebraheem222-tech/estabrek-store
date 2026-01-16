import Link from "next/link";
import { getPublicSettings, listCategories, listProducts } from "@/lib/api";
import { ProductTile } from "@/components/ProductTile";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";
import NormalizeFilters from "@/components/NormalizeFilters";
import { ImageSearchPanel } from "@/components/ImageSearchPanel";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";
import { renderCmsPageBySlug } from "../[[...slug]]/page";

type SP = Record<string, string | string[] | undefined>;

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

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = normalizeFiltersFromSearchParams(searchParams);
  const qs = buildCanonicalQuery(f);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const canonical = new URL(qs ? `/search?${qs}` : "/search", base).toString();

  const q = f.q?.trim();
  const title = q ? `بحث: ${q}` : "البحث";
  const description = q ? `نتائج البحث عن ${q}` : "البحث في المنتجات";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const settings = await getPublicSettings().catch(() => null);
  const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
  if (storefrontCfg.cmsOverrideSearch !== false) {
    const cms = await renderCmsPageBySlug("/search", searchParams, { allowFallback: false, allowNotFound: false });
    if (cms) return <main className="mx-auto max-w-6xl px-4 py-8">{cms}</main>;
  }

  const f = normalizeFiltersFromSearchParams(searchParams);

  const [cats, out] = await Promise.all([
    listCategories(),
    listProducts({
      page: f.page ?? 1,
      limit: 24,
      q: f.q,
      sort: (f.sort as any) ?? undefined,
      colors: f.colors.length ? f.colors.join(",") : undefined,
      sizeIds: f.sizeIds.length ? f.sizeIds.join(",") : undefined,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      categoryId: f.categoryId,
      inStock: f.inStock,
    }),
  ]);

  const currentPage = out.page ?? 1;
  const totalPages = out.totalPages ?? 1;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2;
    
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8" dir="rtl">
      <NormalizeFilters basePath="/search" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/" className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
          <HomeIcon />
          الرئيسية
        </Link>
        <ChevronLeftIcon />
        <span className="text-[var(--text)]">البحث</span>
      </nav>

      {/* Search Header */}
      <div className="search-page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="search-page-title">
            <div className="search-page-icon">
              <SearchIcon />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">
                {f.q ? "نتائج البحث" : "البحث في المتجر"}
              </h1>
              {f.q && (
                <div className="mt-2">
                  <span className="search-query-badge">
                    <SearchIcon />
                    {f.q}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="search-results-count">
            <ProductsIcon />
            {out.total ?? 0} منتج
          </div>
        </div>
      </div>

      {/* Image Search Panel */}
      <ImageSearchPanel />

      {/* Filters */}
      <ProductFiltersBar
        colors={out.facets?.colors ?? []}
        sizes={out.facets?.sizes ?? []}
        categories={Array.isArray(cats) ? cats : []}
      />

      {/* Products Grid */}
      {(out.items ?? []).length > 0 ? (
        <div className="products-grid">
          {(out.items ?? []).map((p, idx) => (
            <div key={p.id} className="stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
              <ProductTile product={p} />
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <div className="no-results-icon text-[var(--muted)]">
            <EmptyIcon />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text)] mb-2">لا توجد نتائج</h3>
          <p className="text-sm text-[var(--muted)] mb-6 max-w-md">
            لم نتمكن من العثور على منتجات تطابق بحثك. جرب تعديل الفلاتر أو البحث بكلمات مختلفة.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            تصفح جميع المنتجات
            <ChevronLeftIcon />
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          {/* Previous Button */}
          <Link
            href={currentPage > 1 ? `/search?${buildCanonicalQuery({ ...f, page: currentPage - 1 })}` : "#"}
            className={`pagination-btn ${currentPage <= 1 ? "opacity-40 pointer-events-none" : ""}`}
          >
            <ChevronRightIcon />
          </Link>

          {/* Page Numbers */}
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return <span key={`dots-${idx}`} className="pagination-dots">...</span>;
            }
            const pageNum = page as number;
            const q = buildCanonicalQuery({ ...f, page: pageNum });
            const href = q ? `/search?${q}` : "/search";
            const isActive = pageNum === currentPage;
            return (
              <Link
                key={pageNum}
                href={href}
                className={`pagination-btn ${isActive ? "active" : ""}`}
              >
                {pageNum}
              </Link>
            );
          })}

          {/* Next Button */}
          <Link
            href={currentPage < totalPages ? `/search?${buildCanonicalQuery({ ...f, page: currentPage + 1 })}` : "#"}
            className={`pagination-btn ${currentPage >= totalPages ? "opacity-40 pointer-events-none" : ""}`}
          >
            <ChevronLeftIcon />
          </Link>
        </div>
      )}
    </main>
  );
}
