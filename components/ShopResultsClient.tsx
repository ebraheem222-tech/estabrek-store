
"use client";

import React, { useMemo, useState } from "react";
import { listProductsClient } from "@/lib/apiClient";
import { ProductTile } from "@/components/ProductTile";
import { ProductTileSkeleton } from "@/components/ProductTileSkeleton";
import { ShopGrid } from "@/components/ShopGrid";
import { buildCanonicalQuery } from "@/lib/filtersUrl";

type Props = {
  initial: any;
  filters: any;
  basePath: string;
};

export default function ShopResultsClient({ initial, filters, basePath }: Props) {
  const isCursor = String(filters?.lm ?? "") === "1" || filters?.lm === 1 || filters?.lm === true;

  const [pages, setPages] = useState<any[]>([initial]);
  const [loading, setLoading] = useState(false);

  const items = useMemo(() => pages.flatMap((p) => p?.items ?? []), [pages]);
  const total = (pages[0]?.total ?? items.length) as number;

  const last = pages[pages.length - 1];
  const nextCursor = last?.nextCursor as string | null | undefined;
  const canLoadMore = isCursor && !!nextCursor && !loading;

  const canonicalLoadMore = useMemo(() => {
    const qs = buildCanonicalQuery({ ...filters, page: 1, lm: 1 });
    return qs ? `${basePath}?${qs}` : `${basePath}?lm=1`;
  }, [filters, basePath]);

  const canonicalPagination = useMemo(() => {
    const qs = buildCanonicalQuery({ ...filters, lm: undefined });
    return qs ? `${basePath}?${qs}` : basePath;
  }, [filters, basePath]);

  async function loadMore() {
    if (!canLoadMore) return;
    setLoading(true);
    try {
      const res = await listProductsClient({
        cursorMode: 1,
        cursor: nextCursor,
        take: 24,
        sort: filters.sort,
        q: filters.q,
        inStock: filters.inStock,
        categoryId: filters.categoryId,
        colors: filters.colors?.length ? filters.colors.join(",") : undefined,
        sizeIds: filters.sizeIds?.length ? filters.sizeIds.join(",") : undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        // legacy
        color: filters.color,
        sizeId: filters.sizeId,
      });
      setPages((prev) => [...prev, res]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Products" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-500 dark:text-zinc-300">{total} products</div>

        <a
          href={isCursor ? canonicalLoadMore : canonicalPagination}
          className="text-sm underline decoration-white/20 underline-offset-4 hover:decoration-white/40"
          title="Share this view"
        >
          رابط هذا العرض
        </a>
      </div>

      <ShopGrid>
        {items.map((p: any) => (
          <ProductTile key={p.id} product={p} />
        ))}

        {isCursor && loading
          ? Array.from({ length: 8 }).map((_, i) => <ProductTileSkeleton key={`sk-${i}`} />)
          : null}
      </ShopGrid>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isCursor ? (
          <>
            <button
              type="button"
              onClick={loadMore}
              disabled={!canLoadMore}
              className={
                "h-11 rounded-xl px-4 text-sm inline-flex items-center " +
                (canLoadMore ? "bg-white text-black hover:opacity-90" : "bg-white/10 text-white/40")
              }
            >
              {loading ? "جارٍ التحميل..." : nextCursor ? "تحميل المزيد" : "لا يوجد المزيد"}
            </button>

            <a
              href={canonicalPagination}
              className="h-11 rounded-xl px-4 text-sm border border-white/15 bg-white/5 hover:bg-white/10 inline-flex items-center"
            >
              عرض صفحات (Pagination)
            </a>
          </>
        ) : (
          <>
            <a
              href={canonicalLoadMore}
              className="h-11 rounded-xl px-4 text-sm bg-white text-black hover:opacity-90 inline-flex items-center"
            >
              تحميل المزيد (Load more)
            </a>
          </>
        )}
      </div>
    </section>
  );
}
