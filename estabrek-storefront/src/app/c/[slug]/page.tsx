import { getPublicSettings, listCategories, listProducts } from "@/lib/api";
import { ProductTile } from "@/components/ProductTile";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import NormalizeFilters from "@/components/NormalizeFilters";
import type { Metadata } from "next";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";

export const revalidate = 120;

type SP = Record<string, string | string[] | undefined>;

function pick(sp: SP, key: string): string | undefined {
  const v = sp[key];
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SP;
}): Promise<Metadata> {
  const f = normalizeFiltersFromSearchParams(searchParams);
  const qs = buildCanonicalQuery(f);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const canonical = new URL(qs ? `/c/${params.slug}?${qs}` : `/c/${params.slug}`, base).toString();

  const cats = await listCategories();
  const categoryName = cats.find((c) => c.slug === params.slug)?.name ?? params.slug;
  const title = categoryName;
  const description = `Browse ${categoryName} products`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [
        {
          url: `/api/og/category?title=${encodeURIComponent(title)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/category?title=${encodeURIComponent(title)}`],
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SP;
}) {
  const f = normalizeFiltersFromSearchParams(searchParams);
  const sort = ["latest", "title_asc", "title_desc", "price_asc", "price_desc"].includes(
    f.sort as string
  )
    ? (f.sort as "latest" | "title_asc" | "title_desc" | "price_asc" | "price_desc")
    : undefined;
  const selectedCategoryId = f.categoryId ?? undefined;
  const categorySlug = selectedCategoryId ? undefined : params.slug;
  const [cats, out, settings] = await Promise.all([
    listCategories(),
    listProducts({
      category: categorySlug,
      categoryId: selectedCategoryId,
      page: f.page ?? 1,
      sort,
      colors: f.colors.length ? f.colors.join(",") : undefined,
      sizeIds: f.sizeIds.length ? f.sizeIds.join(",") : undefined,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      includeFacets: true,
      lite: true,
      // legacy
      color: pick(searchParams, "color"),
      sizeId: pick(searchParams, "sizeId"),
    }),
    getPublicSettings().catch(() => null),
  ]);
  const storefrontSettings = (settings?.site as any)?.header?.storefront ?? {};
  const breadcrumbsEnabled = storefrontSettings.breadcrumbsEnabled !== false;

  const current = cats.find((c) => c.slug === params.slug);
  const categoryName = current?.name ?? params.slug;

  // Build breadcrumbs from category tree (parentId chain)
  const crumbs: Crumb[] = [
    { label: "الرئيسية", href: "/" },
    { label: "المتجر", href: "/shop" },
  ];

  if (current) {
    const byId = new Map(cats.map((c) => [c.id, c] as const));
    const chain: any[] = [];
    let cur: any | undefined = current;
    while (cur) {
      chain.push(cur);
      const pid = cur.parentId;
      if (!pid) break;
      cur = byId.get(pid);
      if (cur && chain.some((x) => x.id === cur.id)) break; // safety
    }
    chain.reverse().forEach((c) => {
      crumbs.push({ label: c.name, href: `/c/${c.slug}` });
    });
  } else {
    crumbs.push({ label: categoryName, href: `/c/${params.slug}` });
  }


const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.label,
    item: new URL(c.href, SITE).toString(),
  })),
};


  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <NormalizeFilters basePath={`/c/${params.slug}`} />

      {breadcrumbsEnabled ? <Breadcrumbs items={crumbs} /> : null}
      {breadcrumbsEnabled ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">{categoryName}</h1>
        <div className="text-sm text-zinc-500 dark:text-zinc-300">
          {out.total} products
        </div>
      </div>

      <ProductFiltersBar
        colors={out.facets?.colors ?? []}
        sizes={out.facets?.sizes ?? []}
        categories={cats ?? []}
        mobileAutoApply
        categoryTree
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(out.items ?? []).map((p) => (
          <ProductTile key={p.id} product={p} />
        ))}
      </div>
    </main>
  );
}
