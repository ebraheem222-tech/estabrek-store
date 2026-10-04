import { getPublicSettings, listCategories, listProducts } from "@/lib/api";
import NormalizeFilters from "@/components/NormalizeFilters";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";
import { renderCmsPageBySlug } from "@/cms/renderCmsPage";
import SearchBrowseClient from "@/components/SearchBrowseClient";
import ShopBrowseClient from "@/components/ShopBrowseClient";
import { RosePageFrame } from "@/components/cinematic/RosePageFrame";
import { RoseSearchIntro } from "@/components/cinematic/RoseSearchIntro";

type SP = Record<string, string | string[] | undefined>;
export const revalidate = 60;

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
  const breadcrumbsEnabled = storefrontCfg.breadcrumbsEnabled !== false;
  const imageSearchEnabled = storefrontCfg.imageSearchEnabled !== false;
  if (storefrontCfg.cmsOverrideSearch !== false) {
    const cms = await renderCmsPageBySlug("/search", searchParams, { allowFallback: false, allowNotFound: false });
    if (cms) return <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">{cms}</main>;
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
      includeFacets: true,
      lite: true,
      semantic: false,
    }),
  ]);

  const categories = Array.isArray(cats) ? cats : [];
  if (process.env.ESTABREK_HOME_MODE !== "cms") {
    return (
      <main id="main-content" tabIndex={-1}>
        <NormalizeFilters basePath="/search" />
        <RosePageFrame className="rose-shop rose-search-page">
          <RoseSearchIntro query={f.q} total={Number((out as any)?.total ?? (out as any)?.items?.length ?? 0)} />
          <div className="rose-shop-content" id="shop-products" data-rose-palette="pearl">
            <ShopBrowseClient key={f.q ?? ""} initial={out} initialFilters={f} categories={categories} basePath="/search" appearance="rose" />
          </div>
        </RosePageFrame>
      </main>
    );
  }
  return (
    <>
      <NormalizeFilters basePath="/search" />
      <SearchBrowseClient
        initial={out}
        initialFilters={f}
        categories={Array.isArray(cats) ? cats : []}
        breadcrumbsEnabled={breadcrumbsEnabled}
        imageSearchEnabled={imageSearchEnabled}
        basePath="/search"
      />
    </>
  );
}
