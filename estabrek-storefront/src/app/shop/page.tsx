import Link from "next/link";
import { getPublicSettings, listProducts, listCategories } from "@/lib/api";
import NormalizeFilters from "@/components/NormalizeFilters";
import ShopBrowseClient from "@/components/ShopBrowseClient";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";
import { renderCmsPageBySlug } from "../[[...slug]]/page";
import dynamic from "next/dynamic";

const ImageSearchPanel = dynamic(
  () => import("@/components/ImageSearchPanel").then((m) => m.ImageSearchPanel),
  { ssr: false, loading: () => null }
);

const AIRecommendations = dynamic(
  () => import("@/components/AIRecommendations").then((m) => m.AIRecommendations),
  { ssr: false, loading: () => null }
);

type SP = Record<string, string | string[] | undefined>;
export const revalidate = 60;

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
  const breadcrumbsEnabled = storefrontCfg.breadcrumbsEnabled !== false;
  const imageSearchEnabled = storefrontCfg.imageSearchEnabled !== false;
  const aiRecommendationsEnabled = storefrontCfg.aiRecommendationsEnabled !== false;
  if (storefrontCfg.cmsOverrideShop !== false) {
    const cms = await renderCmsPageBySlug("/shop", searchParams, { allowFallback: false, allowNotFound: false });
    if (cms) return <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">{cms}</main>;
  }

  const f = normalizeFiltersFromSearchParams(searchParams);
  const sort = ["latest", "title_asc", "title_desc", "price_asc", "price_desc"].includes(
    f.sort as string
  )
    ? (f.sort as "latest" | "title_asc" | "title_desc" | "price_asc" | "price_desc")
    : undefined;
  const [categories, out] = await Promise.all([
    listCategories(),
    listProducts({
      page: f.page ?? 1,
      pageSize: 24,
      sort,
      q: f.q,
      inStock: f.inStock,
      categoryId: f.categoryId,
      colors: f.colors.length ? f.colors.join(",") : undefined,
      sizeIds: f.sizeIds.length ? f.sizeIds.join(",") : undefined,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      includeFacets: true,
      lite: true,
      color: pick(searchParams, "color"),
      sizeId: pick(searchParams, "sizeId"),
    }),
  ]);

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl space-y-8 px-4 py-8" dir="rtl">
      <NormalizeFilters basePath="/shop" />
      
      {/* Breadcrumb */}
      {breadcrumbsEnabled ? (
        <nav className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Link href="/" className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
            <HomeIcon />
            الرئيسية
          </Link>
          <ChevronLeftIcon />
          <span className="text-[var(--text)]">المتجر</span>
        </nav>
      ) : null}

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
        {imageSearchEnabled ? <ImageSearchPanel /> : null}
        {aiRecommendationsEnabled ? <AIRecommendations title="منتجات مقترحة لك" /> : null}
      </div>

      <ShopBrowseClient initial={out} initialFilters={f} categories={categories ?? []} basePath="/shop" />
    </main>
  );
}
