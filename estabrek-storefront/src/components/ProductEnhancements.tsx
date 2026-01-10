"use client";

import React, { useState, useEffect } from "react";

// ============ PRODUCT BADGES ============

type BadgeType = "new" | "sale" | "bestseller" | "limited" | "trending" | "soldout" | "preorder" | "exclusive";

interface ProductBadgeProps {
  type: BadgeType;
  value?: string | number; // For sale percentage, stock count, etc.
  className?: string;
}

export function ProductBadge({ type, value, className = "" }: ProductBadgeProps) {
  const badges: Record<BadgeType, { label: string; icon: string; className: string }> = {
    new: { label: "جديد", icon: "✨", className: "badge-new" },
    sale: { label: value ? `${value}% خصم` : "تخفيض", icon: "🔥", className: "badge-sale" },
    bestseller: { label: "الأكثر مبيعاً", icon: "⭐", className: "badge-bestseller" },
    limited: { label: value ? `باقي ${value}` : "كمية محدودة", icon: "⚡", className: "badge-limited" },
    trending: { label: "رائج", icon: "📈", className: "badge-trending" },
    soldout: { label: "نفذ", icon: "❌", className: "badge-soldout" },
    preorder: { label: "طلب مسبق", icon: "📅", className: "badge-preorder" },
    exclusive: { label: "حصري", icon: "💎", className: "badge-exclusive" },
  };

  const badge = badges[type];

  return (
    <span className={`product-badge ${badge.className} ${className}`}>
      <span className="badge-icon">{badge.icon}</span>
      <span className="badge-label">{badge.label}</span>
    </span>
  );
}

// Multiple Badges Container
interface ProductBadgesProps {
  isNew?: boolean;
  salePercent?: number;
  isBestseller?: boolean;
  stock?: number;
  lowStockThreshold?: number;
  isTrending?: boolean;
  isExclusive?: boolean;
  isSoldOut?: boolean;
  isPreorder?: boolean;
  className?: string;
}

export function ProductBadges({
  isNew,
  salePercent,
  isBestseller,
  stock,
  lowStockThreshold = 5,
  isTrending,
  isExclusive,
  isSoldOut,
  isPreorder,
  className = "",
}: ProductBadgesProps) {
  const badges: { type: BadgeType; value?: string | number }[] = [];

  if (isSoldOut) {
    badges.push({ type: "soldout" });
  } else {
    if (isPreorder) badges.push({ type: "preorder" });
    if (isNew) badges.push({ type: "new" });
    if (salePercent && salePercent > 0) badges.push({ type: "sale", value: salePercent });
    if (isBestseller) badges.push({ type: "bestseller" });
    if (isExclusive) badges.push({ type: "exclusive" });
    if (isTrending) badges.push({ type: "trending" });
    if (stock !== undefined && stock > 0 && stock <= lowStockThreshold) {
      badges.push({ type: "limited", value: stock });
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className={`product-badges ${className}`}>
      {badges.slice(0, 3).map((badge, i) => (
        <ProductBadge key={i} type={badge.type} value={badge.value} />
      ))}
    </div>
  );
}

// ============ STOCK INDICATOR ============

type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "preorder";

interface StockIndicatorProps {
  stock: number;
  lowStockThreshold?: number;
  showCount?: boolean;
  showProgress?: boolean;
  maxStock?: number;
  isPreorder?: boolean;
  preorderDate?: string;
  className?: string;
}

export function StockIndicator({
  stock,
  lowStockThreshold = 5,
  showCount = true,
  showProgress = false,
  maxStock = 100,
  isPreorder = false,
  preorderDate,
  className = "",
}: StockIndicatorProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (stock <= lowStockThreshold && stock > 0) {
      const interval = setInterval(() => {
        setAnimate((prev) => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stock, lowStockThreshold]);

  const getStatus = (): StockStatus => {
    if (isPreorder) return "preorder";
    if (stock <= 0) return "out-of-stock";
    if (stock <= lowStockThreshold) return "low-stock";
    return "in-stock";
  };

  const status = getStatus();

  const statusConfig: Record<StockStatus, { label: string; icon: string; className: string }> = {
    "in-stock": { label: "متوفر", icon: "✓", className: "stock-available" },
    "low-stock": { label: showCount ? `باقي ${stock} فقط!` : "كمية محدودة", icon: "⚡", className: "stock-low" },
    "out-of-stock": { label: "غير متوفر", icon: "✕", className: "stock-out" },
    "preorder": { label: preorderDate ? `متوفر ${preorderDate}` : "طلب مسبق", icon: "📅", className: "stock-preorder" },
  };

  const config = statusConfig[status];
  const stockPercent = showProgress ? Math.min(100, (stock / maxStock) * 100) : 0;

  return (
    <div className={`stock-indicator ${config.className} ${className} ${animate ? "pulse" : ""}`}>
      <div className="stock-status">
        <span className="status-icon">{config.icon}</span>
        <span className="status-label">{config.label}</span>
      </div>

      {showProgress && status !== "out-of-stock" && (
        <div className="stock-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${stockPercent}%` }}
            />
          </div>
          {showCount && stock > lowStockThreshold && (
            <span className="stock-count">{stock} متوفر</span>
          )}
        </div>
      )}

      {status === "low-stock" && (
        <div className="urgency-message">
          <span className="fire-icon">🔥</span>
          <span>يتم شراؤه بسرعة!</span>
        </div>
      )}
    </div>
  );
}

// ============ SIZE RECOMMENDER ============

interface SizeRecommenderProps {
  sizes: Array<{
    id: string;
    name: string;
    measurements?: { chest?: number; waist?: number; length?: number };
    stock?: number;
  }>;
  selectedSize?: string;
  onSelectSize: (sizeId: string) => void;
  productType?: "clothing" | "shoes" | "accessories";
  className?: string;
}

export function SizeRecommender({
  sizes,
  selectedSize,
  onSelectSize,
  productType = "clothing",
  className = "",
}: SizeRecommenderProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [userMeasurements, setUserMeasurements] = useState<{
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    foot?: number;
  }>({});
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);

  const calculateRecommendation = () => {
    if (!userMeasurements.height || !userMeasurements.weight) return;

    // Simple BMI-based recommendation
    const bmi = userMeasurements.weight / Math.pow(userMeasurements.height / 100, 2);
    
    let sizeIndex = 1; // Default to M
    if (bmi < 18.5) sizeIndex = 0; // S
    else if (bmi < 25) sizeIndex = 1; // M
    else if (bmi < 30) sizeIndex = 2; // L
    else sizeIndex = 3; // XL+

    const recommended = sizes[Math.min(sizeIndex, sizes.length - 1)];
    if (recommended) {
      setRecommendedSize(recommended.id);
    }
  };

  return (
    <div className={`size-recommender ${className}`}>
      {/* Size Options */}
      <div className="size-options">
        <div className="size-header">
          <span>اختر المقاس</span>
          <button className="size-guide-btn" onClick={() => setShowGuide(!showGuide)}>
            📏 دليل المقاسات
          </button>
        </div>

        <div className="size-grid">
          {sizes.map((size) => {
            const isSelected = selectedSize === size.id;
            const isRecommended = recommendedSize === size.id;
            const isOutOfStock = size.stock !== undefined && size.stock <= 0;

            return (
              <button
                key={size.id}
                className={`size-option ${isSelected ? "selected" : ""} ${isRecommended ? "recommended" : ""} ${isOutOfStock ? "out-of-stock" : ""}`}
                onClick={() => !isOutOfStock && onSelectSize(size.id)}
                disabled={isOutOfStock}
              >
                <span className="size-name">{size.name}</span>
                {isRecommended && <span className="rec-badge">مُوصى به</span>}
                {isOutOfStock && <span className="oos-badge">نفذ</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Finder */}
      <div className="size-finder">
        <button
          className="finder-toggle"
          onClick={() => setShowGuide(!showGuide)}
        >
          <span>🎯</span>
          <span>ساعدني أجد مقاسي</span>
        </button>

        {showGuide && (
          <div className="finder-form">
            <h4>أدخل قياساتك</h4>
            <div className="form-grid">
              <div className="form-field">
                <label>الطول (سم)</label>
                <input
                  type="number"
                  placeholder="170"
                  value={userMeasurements.height || ""}
                  onChange={(e) => setUserMeasurements({ ...userMeasurements, height: +e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>الوزن (كغ)</label>
                <input
                  type="number"
                  placeholder="70"
                  value={userMeasurements.weight || ""}
                  onChange={(e) => setUserMeasurements({ ...userMeasurements, weight: +e.target.value })}
                />
              </div>
              {productType === "shoes" && (
                <div className="form-field">
                  <label>طول القدم (سم)</label>
                  <input
                    type="number"
                    placeholder="26"
                    value={userMeasurements.foot || ""}
                    onChange={(e) => setUserMeasurements({ ...userMeasurements, foot: +e.target.value })}
                  />
                </div>
              )}
            </div>
            <button className="find-size-btn" onClick={calculateRecommendation}>
              اعثر على مقاسي
            </button>
          </div>
        )}
      </div>

      {/* Recommendation Result */}
      {recommendedSize && (
        <div className="recommendation-result">
          <span className="rec-icon">✨</span>
          <span>
            نوصي بمقاس <strong>{sizes.find((s) => s.id === recommendedSize)?.name}</strong> بناءً على قياساتك
          </span>
          <button
            className="select-rec-btn"
            onClick={() => onSelectSize(recommendedSize)}
          >
            اختر هذا المقاس
          </button>
        </div>
      )}
    </div>
  );
}

// ============ PRICE DISPLAY ============

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  showSavings?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceDisplay({
  price,
  originalPrice,
  currency = "₪",
  showSavings = true,
  size = "md",
  className = "",
}: PriceDisplayProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const savings = hasDiscount ? originalPrice - price : 0;
  const discountPercent = hasDiscount ? Math.round((savings / originalPrice) * 100) : 0;

  return (
    <div className={`price-display size-${size} ${hasDiscount ? "has-discount" : ""} ${className}`}>
      <span className="current-price">
        <span className="currency">{currency}</span>
        <span className="amount">{price.toFixed(2)}</span>
      </span>

      {hasDiscount && (
        <>
          <span className="original-price">
            {currency}{originalPrice.toFixed(2)}
          </span>
          {showSavings && (
            <span className="savings">
              وفّر {discountPercent}%
            </span>
          )}
        </>
      )}
    </div>
  );
}

// ============ RECENTLY VIEWED PRODUCTS ============

interface RecentProduct {
  id: string;
  title: string;
  slug: string;
  imageUrl?: string;
  price: number;
}

export function useRecentlyViewed(maxItems: number = 10) {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recently_viewed");
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing recently viewed:", e);
      }
    }
  }, []);

  const addItem = (product: RecentProduct) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const updated = [product, ...filtered].slice(0, maxItems);
      localStorage.setItem("recently_viewed", JSON.stringify(updated));
      return updated;
    });
  };

  const clearItems = () => {
    setItems([]);
    localStorage.removeItem("recently_viewed");
  };

  return { items, addItem, clearItems };
}
