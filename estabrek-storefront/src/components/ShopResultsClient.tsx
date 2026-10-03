
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { listProductsClient } from "@/lib/apiClient";
import { ProductTile } from "@/components/ProductTile";
import { ProductTileSkeleton } from "@/components/ProductTileSkeleton";
import { ShopGrid } from "@/components/ShopGrid";
import { buildCanonicalQuery } from "@/lib/filtersUrl";
import { LoadingIndicator } from "@/components/LoadingIndicator";

type Props = {
  initial: any;
  filters: any;
  basePath: string;
  showHeader?: boolean;
  onData?: (data: any) => void;
  onLoading?: (loading: boolean) => void;
  extraParams?: Record<string, any>;
};

export default function ShopResultsClient({ initial, filters, basePath, showHeader = true, onData, onLoading, extraParams }: Props) {
  const isCursor = String(filters?.lm ?? "") === "1" || filters?.lm === 1 || filters?.lm === true;

  const [pages, setPages] = useState<any[]>([initial]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastAppliedKeyRef = useRef<string>("");
  const extraParamsRef = useRef<Record<string, any> | undefined>(extraParams);

  useEffect(() => {
    extraParamsRef.current = extraParams;
  }, [extraParams]);

  const items = useMemo(() => pages.flatMap((p) => p?.items ?? []), [pages]);
  const total = (pages[0]?.total ?? items.length) as number;

  const last = pages[pages.length - 1];
  const lastPage = (last?.page ?? pages[0]?.page ?? 1) as number;
  const totalPages = (last?.totalPages ?? pages[0]?.totalPages ?? 1) as number;
  const canLoadMore = isCursor && lastPage < totalPages && !loading;

  const filtersKey = useMemo(() => {
    const base = { ...filters };
    delete base.page;
    return buildCanonicalQuery(base);
  }, [filters]);

  const initialKeyRef = useRef(filtersKey);

  useEffect(() => {
    onData?.(pages[0] ?? initial);
  }, [pages, initial, onData]);

  useEffect(() => {
    if (filtersKey === initialKeyRef.current) {
      if (lastAppliedKeyRef.current !== filtersKey || pages[0] !== initial) {
        abortRef.current?.abort();
        setLoading(false);
        onLoading?.(false);
        setPages([initial]);
        lastAppliedKeyRef.current = filtersKey;
      }
      return;
    }
    if (!lastAppliedKeyRef.current) lastAppliedKeyRef.current = initialKeyRef.current;
    if (filtersKey === lastAppliedKeyRef.current) return;
    let active = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const debounceMs = filters?.q ? 250 : 0;
    const timer = setTimeout(() => {
      setLoading(true);
      onLoading?.(true);
      (async () => {
        try {
          const res = await listProductsClient({
            page: 1,
            pageSize: 24,
            sort: filters.sort,
            q: filters.q,
            inStock: filters.inStock,
            categoryId: filters.categoryId,
            colors: filters.colors?.length ? filters.colors.join(",") : undefined,
            sizeIds: filters.sizeIds?.length ? filters.sizeIds.join(",") : undefined,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            includeFacets: true,
            lite: true,
            // legacy
            color: filters.color,
            sizeId: filters.sizeId,
            ...(extraParamsRef.current ?? {}),
          }, { signal: controller.signal, cacheMs: 15000 });
          if (!active) return;
          setPages([res]);
          lastAppliedKeyRef.current = filtersKey;
        } catch (e) {
          if (!controller.signal.aborted) {
            console.error(e);
          }
        } finally {
          if (active) {
            setLoading(false);
            onLoading?.(false);
          }
        }
      })();
    }, debounceMs);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [filtersKey, filters, onLoading]);

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
    onLoading?.(true);
    try {
      const res = await listProductsClient({
        page: lastPage + 1,
        pageSize: 24,
        sort: filters.sort,
        q: filters.q,
        inStock: filters.inStock,
        categoryId: filters.categoryId,
        colors: filters.colors?.length ? filters.colors.join(",") : undefined,
        sizeIds: filters.sizeIds?.length ? filters.sizeIds.join(",") : undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        includeFacets: false,
        lite: true,
        // legacy
        color: filters.color,
        sizeId: filters.sizeId,
        ...(extraParamsRef.current ?? {}),
      }, { cacheMs: 15000 });
      setPages((prev) => [...prev, res]);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  }

  return (
    <section aria-label="Products" className="space-y-6">
      {showHeader ? (
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
      ) : null}

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
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingIndicator className="inline-grid scale-75 place-items-center" />
                  <span>جارٍ التحميل...</span>
                </span>
              ) : canLoadMore ? (
                "تحميل المزيد"
              ) : (
                "لا يوجد المزيد"
              )}
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
