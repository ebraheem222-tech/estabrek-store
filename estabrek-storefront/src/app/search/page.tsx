import { listCategories, listProducts } from "@/lib/api";
import { ProductTile } from "@/components/ProductTile";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";
import NormalizeFilters from "@/components/NormalizeFilters";
import { ImageSearchPanel } from "@/components/ImageSearchPanel";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = normalizeFiltersFromSearchParams(searchParams);
  const qs = buildCanonicalQuery(f);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const canonical = new URL(qs ? `/search?${qs}` : "/search", base).toString();

  const q = f.q?.trim();
  const title = q ? `بحث: ${q}` : "Search";
  const description = q ? `نتائج البحث عن ${q}` : "Search products";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
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

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <NormalizeFilters basePath="/search" />

      <ImageSearchPanel />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Search</h1>
          {f.q ? <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">{f.q}</div> : null}
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-300">{out.total} products</div>
      </div>

      <ProductFiltersBar
        colors={out.facets?.colors ?? []}
        sizes={out.facets?.sizes ?? []}
        categories={Array.isArray(cats) ? cats : []}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(out.items ?? []).map((p) => (
          <ProductTile key={p.id} product={p} />
        ))}
      </div>

      {out.totalPages && out.totalPages > 1 ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: out.totalPages }, (_, i) => i + 1)
            .slice(0, 9)
            .map((page) => {
              const q = buildCanonicalQuery({ ...f, page });
              const href = q ? `/search?${q}` : "/search";
              const active = page === (out.page ?? 1);
              return (
                <a
                  key={page}
                  href={href}
                  className={[
                    "h-10 min-w-[40px] rounded-xl px-3 inline-flex items-center justify-center border text-sm",
                    active ? "border-white bg-white text-black" : "border-white/15 bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  {page}
                </a>
              );
            })}
        </div>
      ) : null}
    </main>
  );
}
