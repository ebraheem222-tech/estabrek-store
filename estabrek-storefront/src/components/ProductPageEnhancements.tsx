"use client";

import React, { useState, useEffect } from "react";
import { Product360View } from "./Product360View";
import { ProductBadges, StockIndicator, PriceDisplay, SizeRecommender } from "./ProductEnhancements";
import { useStorefrontSettings } from "./StorefrontFeaturesProvider";

interface ProductPageEnhancementsProps {
  product: {
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number;
    originalPrice?: number;
    images?: Array<{ url: string }>;
    items?: Array<{
      images?: Array<{
        url: string;
        position?: number | null;
        isPrimary?: boolean | null;
      }>;
    }>;
    stock?: number;
    quantity?: number;
    inStock?: boolean;
    isNew?: boolean;
    isBestseller?: boolean;
    isTrending?: boolean;
    createdAt?: string;
    variants?: Array<{
      id: string;
      size?: string;
      stock?: number;
    }>;
    sizes?: Array<{
      id: string;
      name: string;
      stock?: number;
    }>;
  };
}

export function ProductPageEnhancements({ product }: ProductPageEnhancementsProps) {
  const [mounted, setMounted] = useState(false);
  const settings = useStorefrontSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Extract data
  const images = (() => {
    const output: string[] = [];
    const seen = new Set<string>();
    const add = (value?: string | null) => {
      if (!value) return;
      const url = value.trim();
      if (!url || seen.has(url)) return;
      seen.add(url);
      output.push(url);
    };

    const productImages = Array.isArray(product.images) ? product.images : [];
    for (const img of productImages) add((img as any)?.url ?? (img as any));

    const items = Array.isArray(product.items) ? product.items : [];
    for (const item of items) {
      const itemImages = Array.isArray(item?.images) ? item.images : [];
      const ordered = [...itemImages].sort(
        (a, b) => (a?.position ?? 0) - (b?.position ?? 0)
      );
      for (const img of ordered) add(img?.url);
    }

    return output;
  })();
  const price = product.price || 0;
  const compareEnabled = settings.productCompareEnabled;
  const comparePrice = compareEnabled ? (product.compareAtPrice || product.originalPrice) : undefined;
  const stock = product.stock ?? product.quantity ?? 50;
  
  // Check if product is new (created within 14 days)
  const createdAt = product.createdAt ? new Date(product.createdAt) : new Date();
  const isNewProduct = (Date.now() - createdAt.getTime()) < 14 * 24 * 60 * 60 * 1000;
  const isNew = product.isNew ?? isNewProduct;
  
  const isBestseller = product.isBestseller ?? false;
  const isTrending = product.isTrending ?? false;
  const hasDiscount = compareEnabled && comparePrice && comparePrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / comparePrice) * 100) : 0;
  const lowStockThreshold = settings.productStockThreshold;

  // Extract sizes from variants
  const sizes = product.sizes || product.variants?.filter(v => v.size).map(v => ({
    id: v.id || v.size || '',
    name: v.size || '',
    stock: v.stock ?? 10
  })) || [];

  return (
    <div className="product-enhancements space-y-6">
      {/* Badges Section */}
      {settings.productBadgesEnabled && (
        <div className="badges-section">
          <ProductBadges
            isNew={isNew}
            isBestseller={isBestseller}
            isTrending={isTrending}
            salePercent={compareEnabled && discountPercent > 0 ? discountPercent : undefined}
            stock={stock}
            lowStockThreshold={lowStockThreshold}
          />
          
          {/* Always show at least one badge for demo */}
          {!isNew && !isBestseller && !isTrending && discountPercent === 0 && stock > lowStockThreshold && (
            <div className="demo-badge">
              <span className="product-badge badge-new">
                <span className="badge-icon">✨</span>
                <span className="badge-label">متوفر</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 360° View Section */}
      {settings.product360ViewEnabled && images.length >= 1 && (
        <div className="view-360-section glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">عرض 360°</h3>
                <p className="text-xs text-[var(--muted)]">اسحب للتدوير • انقر للتكبير</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-400 rounded-full">
              {images.length} صور
            </span>
          </div>
          <Product360View
            images={images}
            autoRotate={settings.product360AutoRotate}
            autoRotateSpeed={settings.product360RotateSpeed}
            showControls={true}
            enableZoom={settings.productZoomEnabled}
            enableFullscreen={true}
          />
        </div>
      )}

      {/* Stock & Price Section */}
      {settings.productStockIndicator && (
        <div className="stock-price-section glass-card rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <StockIndicator
              stock={stock}
              lowStockThreshold={settings.productStockThreshold}
              showCount={true}
              showProgress={true}
              maxStock={100}
            />
            <PriceDisplay
              price={price}
              originalPrice={compareEnabled ? comparePrice : undefined}
              currency="₪"
              size="lg"
              showSavings={compareEnabled}
            />
          </div>
        </div>
      )}

      {/* Size Recommender Section */}
      {settings.productSizeRecommender && sizes.length > 0 && (
        <div className="size-section glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">اختر المقاس</h3>
              <p className="text-xs text-[var(--muted)]">استخدم أداة المقاسات لاختيار المقاس المناسب</p>
            </div>
          </div>
          <SizeRecommender
            sizes={sizes}
            productType="clothing"
          />
        </div>
      )}

      {/* Demo sizes if none exist */}
      {settings.productSizeRecommender && sizes.length === 0 && (
        <div className="size-section glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text)]">المقاسات المتوفرة</h3>
              <p className="text-xs text-[var(--muted)]">اختر المقاس المناسب لك</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
              <button
                key={size}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[var(--text)] hover:border-violet-500 hover:bg-violet-500/10 transition-all"
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .product-enhancements {
          width: 100%;
        }
        
        .badges-section {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .product-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 600;
          animation: badgePop 0.3s ease-out;
        }
        
        .badge-new {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          color: white;
        }
        
        .badge-sale {
          background: linear-gradient(135deg, #ef4444, #f97316);
          color: white;
        }
        
        .badge-bestseller {
          background: linear-gradient(135deg, #f59e0b, #eab308);
          color: white;
        }
        
        .badge-limited {
          background: linear-gradient(135deg, #ec4899, #f43f5e);
          color: white;
        }
        
        .badge-trending {
          background: linear-gradient(135deg, #06b6d4, #0ea5e9);
          color: white;
        }
        
        @keyframes badgePop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </div>
  );
}
