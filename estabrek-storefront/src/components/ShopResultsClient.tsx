
"use client";
import { useLanguage } from "./cinematic/Language";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { listProductsClient } from "@/lib/apiClient";
import { ProductTile } from "@/components/ProductTile";
import { ProductTileSkeleton } from "@/components/ProductTileSkeleton";
import { ShopGrid } from "@/components/ShopGrid";
import { attrParams, buildCanonicalQuery } from "@/lib/filtersUrl";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

type Props = {
  initial: any;
  filters: any;
  basePath: string;
  showHeader?: boolean;
  onData?: (data: any) => void;
  onLoading?: (loading: boolean) => void;
  extraParams?: Record<string, any>;
  appearance?: "rose" | "default";
};

export default function ShopResultsClient({ initial, filters, basePath, showHeader = true, onData, onLoading, extraParams, appearance = "default" }: Props) {
  const ar = useLanguage().language === "ar";
  const resultsRoot = useRef<HTMLElement>(null);
  const settings = useStorefrontSettings();
  const isCursor = String(filters?.lm ?? "") === "1" || filters?.lm === 1 || filters?.lm === true;

  const [pages, setPages] = useState<any[]>([initial]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const failedLoadMore = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastAppliedKeyRef = useRef<string>("");
  const extraParamsRef = useRef<Record<string, any> | undefined>(extraParams);

  useEffect(() => {
    extraParamsRef.current = extraParams;
  }, [extraParams]);

  const items = useMemo(() => pages.flatMap((p) => p?.items ?? []), [pages]);
  useEffect(() => {
    if (appearance !== "rose" || !settings.scrollAnimationsEnabled || !resultsRoot.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>(".rose-product-tile");
        gsap.set(cards, { opacity: 0, y: 12 });
        // Start ~160px before a card reaches the viewport so fast scrolling never lands on blank rows.
        ScrollTrigger.batch(cards, {
          start: "top bottom+=160", once: true, interval: .05,
          onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: .4, stagger: .04, ease: "power2.out", clearProps: "opacity,transform" }),
        });
      }, resultsRoot);
      return () => context.revert();
    });
    return () => media.revert();
  }, [items, appearance, settings.scrollAnimationsEnabled]);
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
  const currentKey = useRef(filtersKey);
  currentKey.current = filtersKey;

  useEffect(() => {
    onData?.(pages[0] ?? initial);
  }, [pages, initial, onData]);

  useEffect(() => {
    setError(false);
    failedLoadMore.current = false;
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
            ...attrParams(filters.attrs),
            ...(extraParamsRef.current ?? {}),
          }, { signal: controller.signal, cacheMs: 15000 });
          if (!active) return;
          setPages([res]);
          lastAppliedKeyRef.current = filtersKey;
        } catch (e) {
          if (!controller.signal.aborted) {
            setError(true);
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
  }, [filtersKey, filters, onLoading, retry]);

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
    setError(false);
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const requestKey = filtersKey;
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
        ...attrParams(filters.attrs),
        ...(extraParamsRef.current ?? {}),
      }, { cacheMs: 15000, signal: controller.signal });
      if (!controller.signal.aborted && currentKey.current === requestKey) setPages((prev) => [...prev, res]);
    } catch {
      if (!controller.signal.aborted && currentKey.current === requestKey) { failedLoadMore.current = true; setError(true); }
    } finally {
      if (!controller.signal.aborted && currentKey.current === requestKey) { setLoading(false); onLoading?.(false); }
    }
  }

  return (
    <section ref={resultsRoot} aria-label="Products" className="space-y-6" aria-busy={loading}>
      {error && <div className="rose-catalog-error" role="alert"><p>{ar ? "تعذّر تحميل المنتجات. جرّبي مرة أخرى." : "Products could not load. Please try again."}</p><button type="button" onClick={() => { setError(false); if (failedLoadMore.current) void loadMore(); else setRetry(n => n + 1); }}>{ar ? "إعادة المحاولة" : "Try again"}</button></div>}
      {!loading && !error && !items.length && <div className="rose-catalog-empty"><h2>{ar ? "لا توجد منتجات مطابقة" : "No matching products"}</h2><p>{ar ? "جرّبي تغيير الفلاتر أو البحث عن إطلالة أخرى." : "Try another filter or search for a different look."}</p></div>}
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-500 dark:text-zinc-300">{total} products</div>

          <a
            href={isCursor ? canonicalLoadMore : canonicalPagination}
            className="text-sm underline decoration-white/20 underline-offset-4 hover:decoration-white/40"
            title="Share this view"
          >
            {ar ? "رابط هذا العرض" : "Share this view"}
          </a>
        </div>
      ) : null}

      <ShopGrid className={appearance === "rose" ? "rose-shop-grid" : undefined}>
        {items.map((p: any) => (
          <ProductTile key={p.id} product={p} appearance={appearance} />
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
                  <span>{ar ? "جارٍ التحميل..." : "Loading…"}</span>
                </span>
              ) : canLoadMore ? (
                ar ? "تحميل المزيد" : "Load more"
              ) : (
                ar ? "لا يوجد المزيد" : "All pieces loaded"
              )}
            </button>

            <a
              href={canonicalPagination}
              className="h-11 rounded-xl px-4 text-sm border border-white/15 bg-white/5 hover:bg-white/10 inline-flex items-center"
            >
              {ar ? "تصفّحي بالصفحات" : "Browse pages"}
            </a>
          </>
        ) : (
          <>
            <a
              href={canonicalLoadMore}
              className="h-11 rounded-xl px-4 text-sm bg-white text-black hover:opacity-90 inline-flex items-center"
            >
              {ar ? "تحميل المزيد (Load more)" : "Load more"}
            </a>
          </>
        )}
      </div>
    </section>
  );
}
