import Link from "next/link";
import { getPublicSettings, listProducts, listCategories } from "@/lib/api";
import { ShopGrid } from "@/components/ShopGrid";
import ShopResultsClient from "@/components/ShopResultsClient";
import { ProductTile } from "@/components/ProductTile";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";
import { MobileFiltersDrawer } from "@/components/MobileFiltersDrawer";
import { FiltersChips } from "@/components/FiltersChips";
import NormalizeFilters from "@/components/NormalizeFilters";
import { ShopToolbar } from "@/components/ShopToolbar";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import { ImageSearchPanel } from "@/components/ImageSearchPanel";
import { AIRecommendations } from "@/components/AIRecommendations";
import type { Metadata } from "next";
import { renderCmsPageBySlug } from "../[[...slug]]/page";

type SP = Record<string, string | string[] | undefined>;

// Icons
const ShopIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
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

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

function pick(sp: SP, key: string): string | undefined {
  const v = sp[key];
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = normalizeFiltersFromSearchParams(searchParams);
  const qs = buildCanonicalQuery(f);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const canonical = new URL(qs ? `/shop?${qs}` : "/shop", base).toString();

  const title = "المتجر";
  const description = "تصفح جميع المنتجات";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const settings = await getPublicSettings().catch(() => null);
  const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
  if (storefrontCfg.cmsOverrideShop !== false) {
    const cms = await renderCmsPageBySlug("/shop", searchParams, { allowFallback: false, allowNotFound: false });
    if (cms) return <main className="mx-auto max-w-6xl px-4 py-8">{cms}</main>;
  }

  const f = normalizeFiltersFromSearchParams(searchParams);
  const sort = ["latest", "title_asc", "title_desc", "price_asc", "price_desc"].includes(
    f.sort as string
  )
    ? (f.sort as "latest" | "title_asc" | "title_desc" | "price_asc" | "price_desc")
    : undefined;
  const lm = pick(searchParams, "lm") === "1";
  const [categories, out] = await Promise.all([
    listCategories(),
    listProducts({
      page: f.page ?? 1,
      pageSize: 24,
      cursorMode: lm,
      take: 24,
      sort,
      q: f.q,
      inStock: f.inStock,
      categoryId: f.categoryId,
      colors: f.colors.length ? f.colors.join(",") : undefined,
      sizeIds: f.sizeIds.length ? f.sizeIds.join(",") : undefined,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      color: pick(searchParams, "color"),
      sizeId: pick(searchParams, "sizeId"),
    }),
  ]);

  const currentPage = out.page ?? 1;
  const totalPages = out.totalPages ?? 1;

  // Generate page numbers with ellipsis
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
      <NormalizeFilters basePath="/shop" />
      
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/" className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
          <HomeIcon />
          الرئيسية
        </Link>
        <ChevronLeftIcon />
        <span className="text-[var(--text)]">المتجر</span>
      </nav>

      {/* Shop Header */}
      <div className="shop-hero">
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white">
                <ShopIcon />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)]">المتجر</h1>
                <p className="text-[var(--muted)] text-sm mt-1">
                  تصفح جميع منتجاتنا المميزة
                </p>
              </div>
            </div>
            <div className="search-results-count">
              <ProductsIcon />
              {out.total ?? 0} منتج
            </div>
          </div>
        </div>
      </div>

      {/* AI-Powered Search Tools */}
      <div className="grid md:grid-cols-2 gap-4">
        <ImageSearchPanel />
        <AIRecommendations title="منتجات مقترحة لك" />
      </div>

      {/* Main Content */}
      <div className="lg:grid lg:grid-cols-[300px,1fr] lg:gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block filters-sidebar">
          <div className="sticky top-24 space-y-6">
            {/* Sidebar Header Card */}
            <div className="sidebar-filters-card">
              <ProductFiltersBar
                colors={out.facets?.colors ?? []}
                sizes={out.facets?.sizes ?? []}
                categories={categories ?? []}
              />
            </div>
          </div>
        </aside>

        {/* Products Section */}
        <section className="space-y-6">
          {/* Mobile Filters */}
          <div className="lg:hidden">
            <ProductFiltersBar
              colors={out.facets?.colors ?? []}
              sizes={out.facets?.sizes ?? []}
              categories={categories ?? []}
            />
          </div>

          <ShopToolbar total={out.total ?? (out.items?.length ?? 0)} />

          <FiltersChips categories={categories ?? []} />

          {lm ? (
            <ShopResultsClient initial={out} filters={{ ...f, lm: 1 }} basePath="/shop" />
          ) : (
            <>
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
                  <h3 className="text-xl font-semibold text-[var(--text)] mb-2">لا توجد منتجات</h3>
                  <p className="text-sm text-[var(--muted)] mb-6 max-w-md">
                    لم نتمكن من العثور على منتجات تطابق الفلاتر المحددة. جرب تعديل الفلاتر أو مسحها.
                  </p>
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    عرض جميع المنتجات
                  </Link>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  {/* Previous Button */}
                  <Link
                    href={currentPage > 1 ? `/shop?${buildCanonicalQuery({ ...f, page: currentPage - 1, lm: undefined })}` : "#"}
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
                    const q = buildCanonicalQuery({ ...f, page: pageNum, lm: undefined });
                    const href = q ? `/shop?${q}` : "/shop";
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
                    href={currentPage < totalPages ? `/shop?${buildCanonicalQuery({ ...f, page: currentPage + 1, lm: undefined })}` : "#"}
                    className={`pagination-btn ${currentPage >= totalPages ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    <ChevronLeftIcon />
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
