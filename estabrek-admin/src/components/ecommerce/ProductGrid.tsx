// ============================================================
// ESTABREK E-COMMERCE - PRODUCT GRID & SLIDER
// ============================================================
// Flexible product display layouts
// ============================================================

import React, { useRef, useState, useEffect } from "react";
import { cn } from "../ui/cn";
import { ProductCard, type ProductData, type ProductCardVariant } from "./ProductCard";

// ============================================================
// PRODUCT GRID
// ============================================================

export interface ProductGridProps {
  products: ProductData[];
  columns?: 2 | 3 | 4 | 5 | 6;
  cardVariant?: ProductCardVariant;
  gap?: "sm" | "md" | "lg";
  onAddToCart?: (product: ProductData) => void;
  onQuickView?: (product: ProductData) => void;
  onWishlist?: (product: ProductData) => void;
  showRating?: boolean;
  showQuickAdd?: boolean;
  showWishlist?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function ProductGrid({
  products,
  columns = 4,
  cardVariant = "default",
  gap = "md",
  onAddToCart,
  onQuickView,
  onWishlist,
  showRating = true,
  showQuickAdd = true,
  showWishlist = true,
  className,
  emptyMessage = "لا توجد منتجات",
}: ProductGridProps) {
  const columnClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
  };

  const gapClasses = {
    sm: "gap-2 sm:gap-3",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8",
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-[var(--color-text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-[var(--color-text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("grid", columnClasses[columns], gapClasses[gap], className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={cardVariant}
          onAddToCart={onAddToCart}
          onQuickView={onQuickView}
          onWishlist={onWishlist}
          showRating={showRating}
          showQuickAdd={showQuickAdd}
          showWishlist={showWishlist}
        />
      ))}
    </div>
  );
}

// ============================================================
// PRODUCT SLIDER
// ============================================================

export interface ProductSliderProps {
  products: ProductData[];
  title?: string;
  titleAr?: string;
  subtitle?: string;
  cardVariant?: ProductCardVariant;
  slidesPerView?: 2 | 3 | 4 | 5 | 6;
  autoplay?: boolean;
  autoplayDelay?: number;
  showArrows?: boolean;
  showDots?: boolean;
  onAddToCart?: (product: ProductData) => void;
  onQuickView?: (product: ProductData) => void;
  onWishlist?: (product: ProductData) => void;
  onViewAll?: () => void;
  className?: string;
}

export function ProductSlider({
  products,
  title,
  titleAr,
  subtitle,
  cardVariant = "default",
  slidesPerView = 4,
  autoplay = false,
  autoplayDelay = 5000,
  showArrows = true,
  showDots = false,
  onAddToCart,
  onQuickView,
  onWishlist,
  onViewAll,
  className,
}: ProductSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollButtons = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollButtons);
      return () => container.removeEventListener("scroll", checkScrollButtons);
    }
  }, [products]);

  useEffect(() => {
    if (autoplay && products.length > slidesPerView) {
      const interval = setInterval(() => {
        scrollRight();
      }, autoplayDelay);
      return () => clearInterval(interval);
    }
  }, [autoplay, autoplayDelay, products.length, slidesPerView]);

  const scrollLeft = () => {
    if (containerRef.current) {
      const cardWidth = containerRef.current.scrollWidth / products.length;
      containerRef.current.scrollBy({ left: -cardWidth * 2, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      const cardWidth = containerRef.current.scrollWidth / products.length;
      containerRef.current.scrollBy({ left: cardWidth * 2, behavior: "smooth" });
    }
  };

  const slideWidthClasses = {
    2: "w-1/2 sm:w-1/2",
    3: "w-1/2 sm:w-1/3",
    4: "w-1/2 sm:w-1/3 lg:w-1/4",
    5: "w-1/2 sm:w-1/3 lg:w-1/4 xl:w-1/5",
    6: "w-1/2 sm:w-1/3 lg:w-1/4 xl:w-1/6",
  };

  return (
    <div className={cn("relative", className)}>
      {/* Header */}
      {(title || titleAr || subtitle) && (
        <div className="flex items-end justify-between mb-6">
          <div>
            {(title || titleAr) && (
              <h2 className="text-2xl font-bold">{titleAr || title}</h2>
            )}
            {subtitle && (
              <p className="text-[var(--color-text-muted)] mt-1">{subtitle}</p>
            )}
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-[var(--color-accent)] hover:underline flex items-center gap-1"
            >
              عرض الكل
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Slider Container */}
      <div className="relative group">
        {/* Left Arrow */}
        {showArrows && canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Right Arrow */}
        {showArrows && canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Products */}
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className={cn("flex-shrink-0", slideWidthClasses[slidesPerView])}
              style={{ scrollSnapAlign: "start" }}
            >
              <ProductCard
                product={product}
                variant={cardVariant}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
                onWishlist={onWishlist}
                showRating
                showQuickAdd
                showWishlist
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {showDots && products.length > slidesPerView && (
        <div className="cms-product-dots flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(products.length / slidesPerView) }).map((_, i) => (
            <button
              key={i}
              className={cn(
                "cms-product-dot w-2 h-2 rounded-full transition-all",
                i === currentIndex ? "is-active bg-[var(--color-accent)] w-6" : "is-inactive bg-[var(--color-border)]"
              )}
              onClick={() => {
                if (containerRef.current) {
                  const cardWidth = containerRef.current.scrollWidth / products.length;
                  containerRef.current.scrollTo({ left: cardWidth * slidesPerView * i, behavior: "smooth" });
                  setCurrentIndex(i);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FEATURED PRODUCTS
// ============================================================

export function FeaturedProducts({
  products,
  layout = "grid",
  className,
  ...props
}: ProductGridProps & { layout?: "grid" | "slider" }) {
  if (layout === "slider") {
    return (
      <ProductSlider
        products={products}
        titleAr="منتجات مميزة"
        {...props}
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-6">منتجات مميزة</h2>
      <ProductGrid products={products} {...props} />
    </div>
  );
}

// ============================================================
// NEW ARRIVALS
// ============================================================

export function NewArrivals({
  products,
  layout = "slider",
  className,
  ...props
}: ProductGridProps & { layout?: "grid" | "slider" }) {
  if (layout === "grid") {
    return (
      <div className={className}>
        <h2 className="text-2xl font-bold mb-6">وصل حديثاً</h2>
        <ProductGrid products={products} {...props} />
      </div>
    );
  }

  return (
    <ProductSlider
      products={products}
      titleAr="وصل حديثاً"
      subtitle="أحدث المنتجات المضافة"
      {...props}
      className={className}
    />
  );
}

// ============================================================
// BEST SELLERS
// ============================================================

export function BestSellers({
  products,
  layout = "slider",
  className,
  ...props
}: ProductGridProps & { layout?: "grid" | "slider" }) {
  if (layout === "grid") {
    return (
      <div className={className}>
        <h2 className="text-2xl font-bold mb-6">الأكثر مبيعاً</h2>
        <ProductGrid products={products} {...props} />
      </div>
    );
  }

  return (
    <ProductSlider
      products={products}
      titleAr="الأكثر مبيعاً"
      subtitle="المنتجات الأكثر طلباً"
      {...props}
      className={className}
    />
  );
}

// ============================================================
// SALE PRODUCTS
// ============================================================

export function SaleProducts({
  products,
  layout = "slider",
  className,
  ...props
}: ProductGridProps & { layout?: "grid" | "slider" }) {
  // Filter only products with discount
  const saleProducts = products.filter(p => p.comparePrice && p.comparePrice > p.price);

  if (layout === "grid") {
    return (
      <div className={className}>
        <h2 className="text-2xl font-bold mb-6 text-red-600">🔥 تخفيضات</h2>
        <ProductGrid products={saleProducts} {...props} />
      </div>
    );
  }

  return (
    <ProductSlider
      products={saleProducts}
      titleAr="🔥 تخفيضات"
      subtitle="أفضل العروض والخصومات"
      {...props}
      className={className}
    />
  );
}

export default ProductGrid;
