"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { catalogItemKey } from "@/lib/catalog";
import { ProductGallery } from "@/components/ProductGallery";
import ProductBuyBox from "@/components/ProductBuyBox";
import { formatMoney, getProductMinPrice, getProductPrimaryImage, getProductImageBlurDataUrl } from "@/lib/catalog";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useRecentlyViewed } from "@/store/recentlyViewed";

function initialColorKey(product: CatalogProduct): string | undefined {
  const items = (product as any).items ?? [];
  if (!Array.isArray(items) || items.length === 0) return undefined;
  return catalogItemKey(items[0], 0);
}

export default function ProductDetail({ product }: { product: CatalogProduct }) {
  const init = useMemo(() => initialColorKey(product), [product]);
  const [colorKey, setColorKey] = useState<string | undefined>(init);
  const minPrice = useMemo(() => getProductMinPrice(product), [product]);
  const primaryImage = useMemo(() => getProductPrimaryImage(product), [product]);
  const primaryBlur = useMemo(() => getProductImageBlurDataUrl(product, primaryImage), [product, primaryImage]);
  const settings = useStorefrontSettings();
  const { addToRecentlyViewed } = useRecentlyViewed();

  const itemCount = (product as any).items?.length ?? 0;
  const variantCount = (product as any).items?.reduce((acc: number, item: any) => acc + (item.variants?.length ?? 0), 0) ?? 0;
  const soldCountRaw = Number(
    (product as any).soldCount ??
      (product as any).salesCount ??
      (product as any).ordersCount ??
      (product as any).sold ??
      NaN
  );
  const viewersCountRaw = Number(
    (product as any).viewersCount ??
      (product as any).viewCount ??
      (product as any).views ??
      (product as any).viewers ??
      NaN
  );
  const soldCount = Number.isFinite(soldCountRaw) ? soldCountRaw : null;
  const viewersCount = Number.isFinite(viewersCountRaw) ? viewersCountRaw : null;
  const showSoldCount = settings.soldCountEnabled && soldCount != null && soldCount > 0;
  const showViewersCount = settings.viewersCountEnabled && viewersCount != null && viewersCount > 0;

  useEffect(() => {
    if (!product?.id || !product?.slug) return;
    addToRecentlyViewed({
      id: product.id,
      title: product.title,
      slug: product.slug,
      image: primaryImage ?? undefined,
      imageBlurDataUrl: primaryBlur ?? undefined,
      price: minPrice ?? undefined,
    });
  }, [addToRecentlyViewed, minPrice, primaryBlur, primaryImage, product?.id, product?.slug, product?.title]);

  return (
    <div className="space-y-8">
      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery Section */}
        <div className="space-y-4">
          <ProductGallery product={product} selectedColorKey={colorKey} onSelectColorKey={setColorKey} />
        </div>

        {/* Product Info Section */}
        <div className="space-y-6">
          {/* Product Header */}
          <div className="space-y-4">
            {/* Category & Brand */}
            <div className="flex items-center gap-3 flex-wrap">
              {(product as any).category?.name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {(product as any).category.name}
                </span>
              )}
              {(product as any).brand?.name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-[var(--muted)] text-xs font-medium border border-white/10">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  {(product as any).brand.name}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)] leading-tight">
              {product.title}
            </h1>

            {/* Price Display */}
            <div className="flex items-baseline gap-3">
              {minPrice != null && minPrice > 0 ? (
                <>
                  <span className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] bg-clip-text text-transparent">
                    {formatMoney(minPrice, (product as any).currencyCode ?? "ILS")}
                  </span>
                  <span className="text-sm text-[var(--muted)]">شامل الضريبة</span>
                </>
              ) : (
                <span className="text-sm text-[var(--muted)]">تواصل للسعر</span>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm">
              {itemCount > 1 && (
                <div className="flex items-center gap-1.5 text-[var(--muted)]">
                  <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <span>{itemCount} لون</span>
                </div>
              )}
              {variantCount > 0 && (
                <div className="flex items-center gap-1.5 text-[var(--muted)]">
                  <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>{variantCount} خيار</span>
                </div>
              )}
                {showViewersCount ? (
                  <div className="flex items-center gap-1.5 text-[var(--muted)]">
                    <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>{viewersCount} يشاهد الآن</span>
                  </div>
                ) : null}
                {showSoldCount ? (
                  <div className="flex items-center gap-1.5 text-[var(--muted)]">
                    <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l4-4 3 3 6-6" />
                    </svg>
                    <span>{soldCount} تم بيعها</span>
                  </div>
                ) : null}
              <div className="flex items-center gap-1.5 text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>متوفر</span>
              </div>
            </div>
          </div>

          {/* Buy Box */}
          <ProductBuyBox product={product} colorKey={colorKey} onColorChange={setColorKey} />

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span className="text-xs text-[var(--muted)]">شحن سريع</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-xs text-[var(--muted)]">دفع آمن</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="text-xs text-[var(--muted)]">إرجاع مجاني</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
