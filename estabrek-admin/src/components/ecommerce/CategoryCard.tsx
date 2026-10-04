// ============================================================
// ESTABREK E-COMMERCE - CATEGORY CARDS
// ============================================================
// Multiple category display variants
// ============================================================

import React from "react";
import { cn } from "../ui/cn";

// ============================================================
// TYPES
// ============================================================

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  image?: string;
  icon?: string;
  productCount?: number;
  description?: string;
  children?: Category[];
}

export interface CategoryCardProps {
  category: Category;
  variant?: "default" | "minimal" | "featured" | "overlay" | "icon" | "circle" | "banner";
  size?: "sm" | "md" | "lg";
  onClick?: (category: Category) => void;
  className?: string;
}

// ============================================================
// DEFAULT VARIANT
// ============================================================

function DefaultCategoryCard({ category, onClick, className }: CategoryCardProps) {
  return (
    <div
      onClick={() => onClick?.(category)}
      className={cn(
        "group relative overflow-hidden rounded-2xl cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] transition-all hover:shadow-xl hover:border-[var(--color-accent)]",
        className
      )}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={category.image || "/placeholder.jpg"}
          alt={category.nameAr || category.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg">{category.nameAr || category.name}</h3>
        {category.productCount !== undefined && (
          <p className="text-sm text-[var(--color-text-muted)]">{category.productCount} منتج</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// OVERLAY VARIANT
// ============================================================

function OverlayCategoryCard({ category, onClick, className, size = "md" }: CategoryCardProps) {
  const sizeClasses = {
    sm: "h-40",
    md: "h-56",
    lg: "h-72",
  };

  return (
    <div
      onClick={() => onClick?.(category)}
      className={cn(
        "group relative overflow-hidden rounded-2xl cursor-pointer",
        sizeClasses[size],
        className
      )}
    >
      <img
        src={category.image || "/placeholder.jpg"}
        alt={category.nameAr || category.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="font-bold text-xl mb-1">{category.nameAr || category.name}</h3>
        {category.productCount !== undefined && (
          <p className="text-sm text-white/80">{category.productCount} منتج</p>
        )}
      </div>
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/50 rounded-2xl transition-colors" />
    </div>
  );
}

// ============================================================
// CIRCLE VARIANT
// ============================================================

function CircleCategoryCard({ category, onClick, className, size = "md" }: CategoryCardProps) {
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-36 h-36",
  };

  return (
    <div
      onClick={() => onClick?.(category)}
      className={cn("flex flex-col items-center gap-3 cursor-pointer group", className)}
    >
      <div
        className={cn(
          "rounded-full overflow-hidden border-2 border-[var(--color-border)] transition-all group-hover:border-[var(--color-accent)] group-hover:shadow-lg",
          sizeClasses[size]
        )}
      >
        <img
          src={category.image || "/placeholder.jpg"}
          alt={category.nameAr || category.name}
          className="w-full h-full object-cover"
        />
      </div>
      <span className="font-medium text-center group-hover:text-[var(--color-accent)] transition-colors">
        {category.nameAr || category.name}
      </span>
    </div>
  );
}

// ============================================================
// ICON VARIANT
// ============================================================

function IconCategoryCard({ category, onClick, className }: CategoryCardProps) {
  return (
    <div
      onClick={() => onClick?.(category)}
      className={cn(
        "flex flex-col items-center gap-3 p-6 rounded-2xl cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] transition-all hover:shadow-lg hover:border-[var(--color-accent)] group",
        className
      )}
    >
      {category.icon ? (
        <span className="text-4xl">{category.icon}</span>
      ) : (
        <div className="w-16 h-16 rounded-xl overflow-hidden">
          <img
            src={category.image || "/placeholder.jpg"}
            alt={category.nameAr || category.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <span className="font-medium text-center group-hover:text-[var(--color-accent)] transition-colors">
        {category.nameAr || category.name}
      </span>
    </div>
  );
}

// ============================================================
// BANNER VARIANT
// ============================================================

function BannerCategoryCard({ category, onClick, className }: CategoryCardProps) {
  return (
    <div
      onClick={() => onClick?.(category)}
      className={cn(
        "group relative overflow-hidden rounded-2xl cursor-pointer h-32",
        className
      )}
    >
      <img
        src={category.image || "/placeholder.jpg"}
        alt={category.nameAr || category.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
      <div className="absolute inset-0 flex items-center justify-between p-6">
        <div>
          <h3 className="text-white text-2xl font-bold">{category.nameAr || category.name}</h3>
          {category.description && (
            <p className="text-white/80 text-sm mt-1">{category.description}</p>
          )}
        </div>
        <svg className="w-8 h-8 text-white transform group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export function CategoryCard(props: CategoryCardProps) {
  const { variant = "default" } = props;

  switch (variant) {
    case "overlay":
      return <OverlayCategoryCard {...props} />;
    case "circle":
      return <CircleCategoryCard {...props} />;
    case "icon":
      return <IconCategoryCard {...props} />;
    case "banner":
      return <BannerCategoryCard {...props} />;
    default:
      return <DefaultCategoryCard {...props} />;
  }
}

// ============================================================
// CATEGORY GRID
// ============================================================

export function CategoryGrid({
  categories,
  variant = "default",
  columns = 4,
  onClick,
  className,
}: {
  categories: Category[];
  variant?: CategoryCardProps["variant"];
  columns?: 2 | 3 | 4 | 5 | 6;
  onClick?: (category: Category) => void;
  className?: string;
}) {
  const columnClasses = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          variant={variant}
          onClick={onClick}
        />
      ))}
    </div>
  );
}

// ============================================================
// FEATURED CATEGORIES SLIDER
// ============================================================

export function FeaturedCategories({
  categories,
  title = "التصنيفات",
  variant = "circle",
  className,
  onClick,
}: {
  categories: Category[];
  title?: string;
  variant?: CategoryCardProps["variant"];
  className?: string;
  onClick?: (category: Category) => void;
}) {
  return (
    <div className={className}>
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            variant={variant}
            onClick={onClick}
          />
        ))}
      </div>
    </div>
  );
}

export default CategoryCard;
