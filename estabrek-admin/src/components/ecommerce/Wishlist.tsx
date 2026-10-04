// ============================================================
// ESTABREK E-COMMERCE - WISHLIST
// ============================================================

import React from "react";
import { cn } from "../ui/cn";
import { ProductCard, type ProductData } from "./ProductCard";

// ============================================================
// WISHLIST BUTTON
// ============================================================

export function WishlistButton({
  isInWishlist = false,
  onClick,
  size = "md",
  className,
}: {
  isInWishlist?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full flex items-center justify-center transition-all",
        isInWishlist
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-white/80 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-gray-200",
        sizeClasses[size],
        className
      )}
    >
      <svg
        className={iconSizes[size]}
        fill={isInWishlist ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}

// ============================================================
// WISHLIST PAGE
// ============================================================

export function WishlistPage({
  items,
  onRemove,
  onAddToCart,
  onContinueShopping,
  className,
}: {
  items: ProductData[];
  onRemove?: (productId: string) => void;
  onAddToCart?: (product: ProductData) => void;
  onContinueShopping?: () => void;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <div className={cn("text-center py-20", className)}>
        <svg
          className="w-24 h-24 mx-auto text-[var(--color-text-muted)] mb-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <h2 className="text-2xl font-bold mb-2">قائمة الأمنيات فارغة</h2>
        <p className="text-[var(--color-text-muted)] mb-6">
          لم تقم بإضافة أي منتجات إلى قائمة الأمنيات بعد
        </p>
        <button
          onClick={onContinueShopping}
          className="px-8 py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          تصفح المنتجات
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">قائمة الأمنيات ({items.length})</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((product) => (
          <div key={product.id} className="relative">
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              showQuickAdd
            />
            <button
              onClick={() => onRemove?.(product.id)}
              className="absolute top-3 left-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WishlistPage;
