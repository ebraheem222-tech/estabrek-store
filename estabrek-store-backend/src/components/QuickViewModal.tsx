"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CatalogProduct } from "@/lib/catalog";
import { catalogItemLabel, getProductMinPrice, getProductImageBlurDataUrl } from "@/lib/catalog";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useAnimationEffects } from "@/components/AnimationEffectsProvider";
import { useToastShortcuts } from "@/components/Toast";
import { LqipImage } from "@/components/LqipImage";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";
import { cldUrl } from "@/lib/cloudinary";

// Icons
const XIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-5 h-5" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const CartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const ArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

interface QuickViewModalProps {
  product: CatalogProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: CatalogProduct, variantId: string, quantity: number) => void;
  onToggleWishlist?: (product: CatalogProduct) => void;
  isInWishlist?: boolean;
  compareEnabled?: boolean;
}

export function QuickViewModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  compareEnabled = true,
}: QuickViewModalProps) {
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isClosing, setIsClosing] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedItemIndex(0);
      setSelectedVariantIndex(0);
      setSelectedImageIndex(0);
      setQuantity(1);
    }
  }, [product?.id]);

  // Handle close animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const selectedItem = product.items?.[selectedItemIndex];
  const selectedVariant = selectedItem?.variants?.[selectedVariantIndex];
  const images = selectedItem?.images ?? [];
  const currentImage = images[selectedImageIndex]?.url || product.items?.[0]?.images?.[0]?.url;
  const currentBlur = images[selectedImageIndex]?.blurDataUrl ?? getProductImageBlurDataUrl(product, currentImage ?? null);
  const price = selectedVariant?.price ?? product.items?.[0]?.variants?.[0]?.price;
  const compareAt = compareEnabled ? selectedVariant?.compareAt : undefined;
  const showCompare = compareEnabled && compareAt && Number(compareAt) > Number(price);
  const stock = selectedVariant?.stock ?? 0;
  const isOutOfStock = stock <= 0;

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = () => {
    if (selectedVariant && onAddToCart) {
      onAddToCart(product, selectedVariant.id, quantity);
    }
  };

  return (
    <div className="quick-view-overlay" onClick={handleClose} dir="rtl">
      <button
        type="button"
        className="quick-view-close-fallback"
        aria-label="إغلاق المعاينة السريعة"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
      >
        <XIcon />
      </button>
      <div 
        className={`quick-view-modal ${isClosing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button className="quick-view-close" onClick={handleClose}>
          <XIcon />
        </button>

        <div className="quick-view-content">
          <div className="quick-view-mobile-bar">
            <span className="quick-view-mobile-title">معاينة سريعة</span>
            <button className="quick-view-close-inline" onClick={handleClose}>
              <XIcon />
              <span>إغلاق</span>
            </button>
          </div>
          {/* Image Gallery */}
          <div className="quick-view-gallery">
            <div className="quick-view-main-image">
              {currentImage && (
                <LqipImage
                  src={cldUrl(currentImage, { w: 1000, h: 1250, c: "fill", g: "auto" })}
                  alt={product.title}
                  fill
                  blurDataUrl={currentBlur ?? undefined}
                  loading="lazy"
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              )}
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button className="quick-view-nav quick-view-nav-prev" onClick={prevImage}>
                    <ChevronRightIcon />
                  </button>
                  <button className="quick-view-nav quick-view-nav-next" onClick={nextImage}>
                    <ChevronLeftIcon />
                  </button>
                </>
              )}

              {/* Discount Badge */}
              {showCompare && (
                <span className="quick-view-badge">
                  خصم {Math.round((1 - Number(price) / Number(compareAt)) * 100)}%
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="quick-view-thumbnails">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    className={`quick-view-thumb ${idx === selectedImageIndex ? "active" : ""}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    <LqipImage
                      src={cldUrl(img.url, { w: 160, h: 160, c: "fill", g: "auto" })}
                      alt={`${product.title} ${idx + 1}`}
                      fill
                      blurDataUrl={img.blurDataUrl ?? undefined}
                      loading="lazy"
                      className="object-cover"
                      sizes="60px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="quick-view-info">
            <div className="quick-view-header">
              <h2 className="quick-view-title">{product.title}</h2>
              <button
                className={`quick-view-wishlist ${isInWishlist ? "active" : ""}`}
                onClick={() => onToggleWishlist?.(product)}
              >
                <HeartIcon filled={isInWishlist} />
              </button>
            </div>

            {/* Category */}
            {product.category && (
              <p className="quick-view-category">{product.category.name}</p>
            )}

            {/* Price */}
            <div className="quick-view-price">
              <span className="quick-view-current-price">
                {Number(price).toFixed(2)} ₪
              </span>
              {showCompare && (
                <span className="quick-view-compare-price">
                  {Number(compareAt).toFixed(2)} ₪
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="quick-view-description">{product.description}</p>
            )}

            {/* Color Selection */}
            {product.items && product.items.length > 1 && (
              <div className="quick-view-option">
                <label className="quick-view-label">اللون:</label>
                <div className="quick-view-colors">
                  {product.items.map((item, idx) => (
                    <button
                      key={item.id}
                      className={`quick-view-color ${idx === selectedItemIndex ? "active" : ""}`}
                      style={{ backgroundColor: item.colorHex || "#ccc" }}
                      onClick={() => {
                        setSelectedItemIndex(idx);
                        setSelectedVariantIndex(0);
                        setSelectedImageIndex(0);
                      }}
                      title={catalogItemLabel(item, idx)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {selectedItem?.variants && selectedItem.variants.length > 1 && (
              <div className="quick-view-option">
                <label className="quick-view-label">المقاس:</label>
                <div className="quick-view-sizes">
                  {selectedItem.variants.map((variant, idx) => (
                    <button
                      key={variant.id}
                      className={`quick-view-size ${idx === selectedVariantIndex ? "active" : ""} ${(variant.stock ?? 0) <= 0 ? "out-of-stock" : ""}`}
                      onClick={() => setSelectedVariantIndex(idx)}
                      disabled={(variant.stock ?? 0) <= 0}
                    >
                      {variant.size?.name || `مقاس ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="quick-view-option">
              <label className="quick-view-label">الكمية:</label>
              <div className="quick-view-quantity">
                <button
                  className="quick-view-qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="quick-view-qty-value">{quantity}</span>
                <button
                  className="quick-view-qty-btn"
                  onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                  disabled={quantity >= stock}
                >
                  +
                </button>
              </div>
            </div>

            {/* Stock Status */}
            <div className={`quick-view-stock ${isOutOfStock ? "out" : "in"}`}>
              {isOutOfStock ? "غير متوفر" : `متوفر (${stock} قطعة)`}
            </div>

            {/* Actions */}
            <div className="quick-view-actions">
              <button
                className="quick-view-add-btn"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <CartIcon />
                <span>{isOutOfStock ? "غير متوفر" : "أضف للسلة"}</span>
              </button>
              <Link href={`/p/${product.slug}`} className="quick-view-details-btn">
                <span>التفاصيل</span>
                <ArrowIcon />
              </Link>
              <button className="quick-view-close-bottom" onClick={handleClose}>
                <XIcon />
                <span>إغلاق</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick View Context for global state
interface QuickViewContextValue {
  openQuickView: (product: CatalogProduct) => void;
  closeQuickView: () => void;
  currentProduct: CatalogProduct | null;
  isOpen: boolean;
}

const QuickViewContext = React.createContext<QuickViewContextValue | undefined>(undefined);

export function QuickViewProvider({ children }: { children: React.ReactNode }) {
  const [currentProduct, setCurrentProduct] = useState<CatalogProduct | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useBodyScrollLock(isOpen);

  const openQuickView = (product: CatalogProduct) => {
    setCurrentProduct(product);
    setIsOpen(true);
  };

  const closeQuickView = () => {
    setIsOpen(false);
    setTimeout(() => setCurrentProduct(null), 300);
  };

  useEffect(() => {
    if (!isOpen) return;
    closeQuickView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <QuickViewContext.Provider value={{ openQuickView, closeQuickView, currentProduct, isOpen }}>
      {children}
    </QuickViewContext.Provider>
  );
}

export function useQuickView() {
  const context = React.useContext(QuickViewContext);
  if (!context) {
    throw new Error("useQuickView must be used within a QuickViewProvider");
  }
  return context;
}

export function QuickViewLayer() {
  const settings = useStorefrontSettings();
  const { currentProduct, isOpen, closeQuickView } = useQuickView();
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { fireConfetti, fireHeartBurst } = useAnimationEffects();
  const toast = useToastShortcuts();

  if (!settings.productQuickView) return null;

  const inWishlist = currentProduct ? isInWishlist(currentProduct.id) : false;

  const handleAddToCart = (_product: CatalogProduct, variantId: string, quantity: number) => {
    addItem(variantId, quantity);
    fireConfetti();
    toast.cartAdded(_product.title);
    closeQuickView();
  };

  const handleToggleWishlist = (product: CatalogProduct) => {
    const imageUrl =
      (product as any).items?.[0]?.images?.[0]?.url ??
      (product as any).images?.[0]?.url ??
      undefined;
    const imageBlurDataUrl = getProductImageBlurDataUrl(product, imageUrl ?? null) ?? undefined;
    const price = getProductMinPrice(product) ?? undefined;

    const nextState = toggleWishlist({
      id: product.id,
      title: product.title,
      slug: (product as any).slug ?? product.id,
      image: imageUrl,
      imageBlurDataUrl,
      price,
    });
    if (nextState) {
      fireHeartBurst();
      toast.wishlistAdded(product.title);
    } else {
      toast.wishlistRemoved(product.title);
    }
  };

  return (
    <QuickViewModal
      product={currentProduct}
      isOpen={isOpen}
      onClose={closeQuickView}
      onAddToCart={handleAddToCart}
      onToggleWishlist={handleToggleWishlist}
      isInWishlist={inWishlist}
      compareEnabled={settings.productCompareEnabled}
    />
  );
}
