"use client";

import React from "react";

// Base Skeleton
export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`skeleton ${className}`} {...props} />;
}

// Product Card Skeleton
export function ProductSkeleton() {
  return (
    <div className="product-skeleton">
      <div className="product-skeleton-image">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="product-skeleton-content">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-3" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Product Grid Skeleton
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="products-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}

// Category Card Skeleton
export function CategorySkeleton() {
  return (
    <div className="category-skeleton">
      <Skeleton className="category-skeleton-icon" />
      <Skeleton className="h-4 w-2/3 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

// Category Grid Skeleton
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="categories-fancy-grid">
      {Array.from({ length: count }).map((_, i) => (
        <CategorySkeleton key={i} />
      ))}
    </div>
  );
}

// Hero Skeleton
export function HeroSkeleton() {
  return (
    <div className="hero-skeleton">
      <div className="hero-skeleton-content">
        <Skeleton className="h-6 w-32 mb-4 rounded-full" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-6" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// Search Results Skeleton
export function SearchResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <ProductGridSkeleton count={count} />
    </div>
  );
}

// Cart Item Skeleton
export function CartItemSkeleton() {
  return (
    <div className="cart-item-skeleton">
      <Skeleton className="w-20 h-20 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2 mb-3" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

// Cart Skeleton
export function CartSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CartItemSkeleton key={i} />
      ))}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex justify-between mb-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Filter Skeleton
export function FilterSkeleton() {
  return (
    <div className="filter-skeleton">
      <Skeleton className="h-5 w-24 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Sidebar Filters Skeleton
export function SidebarFiltersSkeleton() {
  return (
    <div className="sidebar-filters-skeleton space-y-6">
      <FilterSkeleton />
      <FilterSkeleton />
      <FilterSkeleton />
      <div className="mt-4">
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="page-header-skeleton">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}

// Product Detail Skeleton
export function ProductDetailSkeleton() {
  return (
    <div className="product-detail-skeleton">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <Skeleton className="aspect-square w-full rounded-2xl mb-4" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-lg" />
            ))}
          </div>
        </div>
        
        {/* Info */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          
          <div className="pt-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-8 h-8 rounded-full" />
              ))}
            </div>
          </div>
          
          <div className="pt-4">
            <Skeleton className="h-4 w-16 mb-2" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-12 h-10 rounded-lg" />
              ))}
            </div>
          </div>
          
          <div className="pt-6 flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Text Skeleton
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} 
        />
      ))}
    </div>
  );
}

// Avatar Skeleton
export function AvatarSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };
  return <Skeleton className={`${sizes[size]} rounded-full`} />;
}

// Stats Skeleton
export function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="text-center">
          <Skeleton className="h-8 w-16 mx-auto mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
