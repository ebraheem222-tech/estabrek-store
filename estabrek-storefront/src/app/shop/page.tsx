import { listProducts, listCategories } from "@/lib/api";
import { ShopGrid } from "@/components/ShopGrid";
import ShopResultsClient from "@/components/ShopResultsClient";
import { ProductTile } from "@/components/ProductTile";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";
import { MobileFiltersDrawer } from "@/components/MobileFiltersDrawer";
import { FiltersChips } from "@/components/FiltersChips";
import NormalizeFilters from "@/components/NormalizeFilters";
import { ShopToolbar } from "@/components/ShopToolbar";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";

type SP = Record<string, string | string[] | undefined>;

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

  const title = "Shop";
  const description = "Browse products";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
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
      // legacy support
      color: pick(searchParams, "color"),
      sizeId: pick(searchParams, "sizeId"),
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <NormalizeFilters basePath="/shop" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Shop</h1>
        <div className="text-sm text-[var(--muted)]">{out.total} products</div>
      </div>

      <div className="lg:grid lg:grid-cols-[280px,1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
          <ProductFiltersBar
            colors={out.facets?.colors ?? []}
            sizes={out.facets?.sizes ?? []}
            categories={categories ?? []}
          />
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <MobileFiltersDrawer>
              <ProductFiltersBar
                colors={out.facets?.colors ?? []}
                sizes={out.facets?.sizes ?? []}
                categories={categories ?? []}
              />
            </MobileFiltersDrawer>
          </div>

          <ShopToolbar total={out.total ?? (out.items?.length ?? 0)} />

          <FiltersChips categories={categories ?? []} />

          {lm ? (
            <ShopResultsClient initial={out} filters={{ ...f, lm: 1 }} basePath="/shop" />
          ) : (
            <>
              <ShopGrid>
                {(out.items ?? []).map((p) => (
                  <ProductTile key={p.id} product={p} />
                ))}
              </ShopGrid>

              {/* Pagination */}
              {out.totalPages && out.totalPages > 1 ? (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  {Array.from({ length: out.totalPages }, (_, i) => i + 1).slice(0, 9).map((p) => {
                    const q = buildCanonicalQuery({ ...f, page: p, lm: undefined });
                    const href = q ? `/shop?${q}` : "/shop";
                    const active = p === (out.page ?? 1);
                    return (
                      <a
                        key={p}
                        href={href}
                        className={[
                          "h-10 min-w-[40px] rounded-xl px-3 inline-flex items-center justify-center border text-sm",
                          active
                            ? "border-black bg-black text-[#F7F4E9]"
                            : "border-black/15 bg-white hover:bg-black/5",
                        ].join(" ")}
                      >
                        {p}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
