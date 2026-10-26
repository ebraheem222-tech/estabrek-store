// ============================================================
// ESTABREK E-COMMERCE - PRODUCT CARD COMPONENTS
// ============================================================
// 20+ Product card variants for different use cases
// ============================================================

import React, { useState } from "react";
import { cn } from "../ui/cn";

// ============================================================
// TYPES
// ============================================================

export interface ProductData {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  price: number;
  comparePrice?: number;
  currency?: string;
  images: string[];
  category?: string;
  categoryAr?: string;
  badge?: string;
  badgeVariant?: "sale" | "new" | "hot" | "limited" | "soldout";
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  stockCount?: number;
  variants?: { name: string; options: string[] }[];
  description?: string;
  sku?: string;
}

export interface ProductCardProps {
  product: ProductData;
  variant?: ProductCardVariant;
  onAddToCart?: (product: ProductData) => void;
  onQuickView?: (product: ProductData) => void;
  onWishlist?: (product: ProductData) => void;
  className?: string;
  imageAspect?: "square" | "portrait" | "landscape";
  showRating?: boolean;
  showQuickAdd?: boolean;
  showWishlist?: boolean;
  locale?: "ar" | "en";
}

export type ProductCardVariant =
  | "default"
  | "minimal"
  | "detailed"
  | "horizontal"
  | "compact"
  | "featured"
  | "grid"
  | "list"
  | "gaming"
  | "luxury"
  | "neon"
  | "glass"
  | "modern"
  | "classic"
  | "card-3d"
  | "hover-zoom"
  | "overlay"
  | "magazine"
  | "pinterest"
  | "instagram";

// ============================================================
// HELPER COMPONENTS
// ============================================================

function formatPrice(price: number, currency = "ILS", locale = "ar-IL"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function Badge({ variant, children }: { variant?: string; children: React.ReactNode }) {
  const variants: Record<string, string> = {
    sale: "bg-red-500 text-white",
    new: "bg-green-500 text-white",
    hot: "bg-orange-500 text-white",
    limited: "bg-purple-500 text-white",
    soldout: "bg-gray-500 text-white",
    default: "bg-[var(--color-accent)] text-white",
  };
  return (
    <span className={cn("px-2 py-1 text-xs font-bold rounded-lg", variants[variant || "default"])}>
      {children}
    </span>
  );
}

function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={cn("w-4 h-4", star <= value ? "text-yellow-400" : "text-gray-300")}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {count !== undefined && <span className="text-xs text-[var(--color-text-muted)]">({count})</span>}
    </div>
  );
}

function WishlistButton({ active, onClick }: { active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-full transition-all",
        active ? "bg-red-500 text-white" : "bg-white/80 text-gray-600 hover:bg-red-50 hover:text-red-500"
      )}
    >
      <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}

function QuickViewButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full bg-white/80 text-gray-600 hover:bg-[var(--color-accent)] hover:text-white transition-all"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    </button>
  );
}

function AddToCartButton({ onClick, inStock = true, variant = "default" }: { onClick?: () => void; inStock?: boolean; variant?: string }) {
  const variants: Record<string, string> = {
    default: "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white",
    outline: "border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white",
    ghost: "text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10",
    gold: "bg-[var(--color-gold)] hover:opacity-90 text-white",
    neon: "bg-transparent border border-[#00FFFF] text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black",
  };

  if (!inStock) {
    return (
      <button disabled className="w-full py-2 px-4 rounded-xl bg-gray-300 text-gray-500 cursor-not-allowed font-medium">
        نفذت الكمية
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn("w-full py-2 px-4 rounded-xl font-medium transition-all", variants[variant] || variants.default)}
    >
      أضف للسلة
    </button>
  );
}

// ============================================================
// DEFAULT VARIANT
// ============================================================

function DefaultCard({ product, onAddToCart, onQuickView, onWishlist, showRating, showQuickAdd, showWishlist, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;

  return (
    <div
      className={cn("group relative bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)] transition-all hover:shadow-xl", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.images[0] || "/placeholder.jpg"}
          alt={product.nameAr || product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {product.badge && <Badge variant={product.badgeVariant}>{product.badge}</Badge>}
          {discount > 0 && <Badge variant="sale">-{discount}%</Badge>}
        </div>

        {/* Actions */}
        <div className={cn(
          "absolute top-3 left-3 flex flex-col gap-2 transition-all",
          isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
        )}>
          {showWishlist && <WishlistButton onClick={() => onWishlist?.(product)} />}
          {onQuickView && <QuickViewButton onClick={() => onQuickView(product)} />}
        </div>

        {/* Quick Add */}
        {showQuickAdd && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent transition-all",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <AddToCartButton onClick={() => onAddToCart?.(product)} inStock={product.inStock} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {product.categoryAr && (
          <p className="text-xs text-[var(--color-text-muted)] mb-1">{product.categoryAr}</p>
        )}
        <h3 className="font-bold text-[var(--color-text)] mb-2 line-clamp-2">
          {product.nameAr || product.name}
        </h3>
        
        {showRating && product.rating && (
          <div className="mb-2">
            <Rating value={product.rating} count={product.reviewCount} />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[var(--color-accent)]">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.comparePrice && (
            <span className="text-sm text-[var(--color-text-muted)] line-through">
              {formatPrice(product.comparePrice, product.currency)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MINIMAL VARIANT
// ============================================================

function MinimalCard({ product, onAddToCart, className }: ProductCardProps) {
  return (
    <div className={cn("group", className)}>
      <div className="relative aspect-square overflow-hidden rounded-xl mb-3">
        <img
          src={product.images[0] || "/placeholder.jpg"}
          alt={product.nameAr || product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <h3 className="font-medium text-[var(--color-text)] mb-1 line-clamp-1">
        {product.nameAr || product.name}
      </h3>
      <p className="text-[var(--color-accent)] font-bold">
        {formatPrice(product.price, product.currency)}
      </p>
    </div>
  );
}

// ============================================================
// HORIZONTAL VARIANT
// ============================================================

function HorizontalCard({ product, onAddToCart, showRating, className }: ProductCardProps) {
  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;

  return (
    <div className={cn("flex gap-4 p-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]", className)}>
      <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-xl">
        <img
          src={product.images[0] || "/placeholder.jpg"}
          alt={product.nameAr || product.name}
          className="w-full h-full object-cover"
        />
        {discount > 0 && (
          <div className="absolute top-2 right-2">
            <Badge variant="sale">-{discount}%</Badge>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {product.categoryAr && (
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{product.categoryAr}</p>
          )}
          <h3 className="font-bold text-[var(--color-text)] mb-2">
            {product.nameAr || product.name}
          </h3>
          {showRating && product.rating && (
            <Rating value={product.rating} count={product.reviewCount} />
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[var(--color-accent)]">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.comparePrice && (
              <span className="text-sm text-[var(--color-text-muted)] line-through">
                {formatPrice(product.comparePrice, product.currency)}
              </span>
            )}
          </div>
          <button
            onClick={() => onAddToCart?.(product)}
            className="p-2 rounded-xl bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GAMING VARIANT
// ============================================================

function GamingCard({ product, onAddToCart, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const discount = product.comparePrice ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;

  const rarityColor = product.badge === "أسطوري" ? "#ff8000" :
                      product.badge === "ملحمي" ? "#a335ee" :
                      product.badge === "نادر" ? "#0070dd" :
                      product.badge === "غير شائع" ? "#1eff00" : "#e94560";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        "bg-gradient-to-br from-[#1a1a2e] to-[#16213e]",
        className
      )}
      style={{ 
        border: `2px solid ${rarityColor}`,
        boxShadow: isHovered ? `0 0 30px ${rarityColor}40` : `0 0 10px ${rarityColor}20`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated border glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(45deg, transparent 40%, ${rarityColor}20 50%, transparent 60%)`,
          animation: isHovered ? "card-shine 2s ease-in-out infinite" : "none"
        }}
      />

      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.images[0] || "/placeholder.jpg"}
          alt={product.nameAr || product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 right-3">
            <span 
              className="px-3 py-1 text-xs font-bold rounded-lg text-white"
              style={{ backgroundColor: rarityColor }}
            >
              {product.badge}
            </span>
          </div>
        )}

        {/* Discount */}
        {discount > 0 && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-xs font-bold rounded-lg bg-red-600 text-white">
              -{discount}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-white mb-2 line-clamp-2">
          {product.nameAr || product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold" style={{ color: rarityColor }}>
              {formatPrice(product.price, product.currency)}
            </span>
            {product.comparePrice && (
              <span className="text-sm text-gray-500 line-through mr-2">
                {formatPrice(product.comparePrice, product.currency)}
              </span>
            )}
          </div>
          <button
            onClick={() => onAddToCart?.(product)}
            className="p-2 rounded-xl transition-all"
            style={{ 
              backgroundColor: `${rarityColor}20`,
              color: rarityColor,
              border: `1px solid ${rarityColor}`
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LUXURY VARIANT
// ============================================================

function LuxuryCard({ product, onAddToCart, className }: ProductCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl",
      "bg-gradient-to-br from-[#0B0B0B] to-[#1A1A1A]",
      "border border-[#DAA520]/30",
      className
    )}>
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />

      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={product.images[0] || "/placeholder.jpg"}
          alt={product.nameAr || product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {product.badge && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#FFD700] text-black">
              {product.badge}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <p className="text-[#DAA520] text-xs font-medium tracking-wider uppercase mb-2">
          {product.categoryAr || product.category}
        </p>
        <h3 className="text-white text-xl font-light mb-3">
          {product.nameAr || product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-light text-[#FFD700]">
            {formatPrice(product.price, product.currency)}
          </span>
          <button
            onClick={() => onAddToCart?.(product)}
            className="px-6 py-2 border border-[#DAA520] text-[#DAA520] rounded-full hover:bg-[#DAA520] hover:text-black transition-all text-sm"
          >
            إضافة
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NEON VARIANT
// ============================================================

function NeonCard({ product, onAddToCart, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-[#0A0A0A]",
        "border-2 border-[#00FFFF]",
        className
      )}
      style={{
        boxShadow: isHovered 
          ? "0 0 20px #00FFFF, inset 0 0 20px rgba(0,255,255,0.1)" 
          : "0 0 10px rgba(0,255,255,0.3)"
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Inner border */}
      <div className="absolute inset-1 border border-[#00FFFF]/30 rounded-xl pointer-events-none" />

      {/* Image */}
      <div className="relative aspect-square overflow-hidden m-2 rounded-xl">
        <img
          src={product.images[0] || "/placeholder.jpg"}
          alt={product.nameAr || product.name}
          className="w-full h-full object-cover"
          style={{ filter: isHovered ? "brightness(1.1)" : "brightness(0.9)" }}
        />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-[#00FFFF] mb-2 line-clamp-2" style={{ textShadow: "0 0 10px #00FFFF" }}>
          {product.nameAr || product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-white">
            {formatPrice(product.price, product.currency)}
          </span>
          <button
            onClick={() => onAddToCart?.(product)}
            className="px-4 py-2 border border-[#00FFFF] text-[#00FFFF] rounded-lg hover:bg-[#00FFFF] hover:text-black transition-all"
          >
            أضف
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GLASS VARIANT
// ============================================================

function GlassCard({ product, onAddToCart, className }: ProductCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl",
      "bg-white/10 backdrop-blur-md",
      "border border-white/20",
      className
    )}>
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-2xl">
        <img
          src={product.images[0] || "/placeholder.jpg"}
          alt={product.nameAr || product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.badge && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30">
              {product.badge}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-white mb-2 line-clamp-2">
          {product.nameAr || product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-white">
            {formatPrice(product.price, product.currency)}
          </span>
          <button
            onClick={() => onAddToCart?.(product)}
            className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl border border-white/30 hover:bg-white/30 transition-all"
          >
            أضف
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export function ProductCard(props: ProductCardProps) {
  const { variant = "default" } = props;

  switch (variant) {
    case "minimal":
      return <MinimalCard {...props} />;
    case "horizontal":
      return <HorizontalCard {...props} />;
    case "gaming":
      return <GamingCard {...props} />;
    case "luxury":
      return <LuxuryCard {...props} />;
    case "neon":
      return <NeonCard {...props} />;
    case "glass":
      return <GlassCard {...props} />;
    default:
      return <DefaultCard {...props} />;
  }
}

export default ProductCard;
