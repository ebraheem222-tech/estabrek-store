"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { LoadingImg } from "@/components/LoadingImg";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const MinusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  variant?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  imageBlurDataUrl?: string;
  maxQuantity?: number;
}

interface UpsellProduct {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  slug: string;
}

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart?: () => void;
  upsellProducts?: UpsellProduct[];
  onAddUpsell?: (product: UpsellProduct) => void;
  freeShippingThreshold?: number;
  currency?: string;
  checkoutUrl?: string;
}

export function MiniCart({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  upsellProducts = [],
  onAddUpsell,
  freeShippingThreshold = 200,
  currency = "₪",
  checkoutUrl = "/checkout",
}: MiniCartProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  useEffect(() => {
    if (isOpen) setIsAnimating(true);
  }, [isOpen]);

  useBodyScrollLock(isOpen || isAnimating);

  // Fallback: ensure closing overlay unmounts even if animationend never fires.
  useEffect(() => {
    if (isOpen || !isAnimating) return;
    const timer = window.setTimeout(() => setIsAnimating(false), 350);
    return () => window.clearTimeout(timer);
  }, [isOpen, isAnimating]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Close on click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`mini-cart-overlay ${isOpen ? "open" : "closing"}`}
      onClick={handleOverlayClick}
      onAnimationEnd={() => !isOpen && setIsAnimating(false)}
    >
      <div ref={cartRef} className={`mini-cart ${isOpen ? "open" : "closing"}`}>
        {/* Header */}
        <div className="mini-cart-header">
          <h2>
            سلة التسوق
            {itemCount > 0 && <span className="item-count">({itemCount})</span>}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Free Shipping Progress */}
        {freeShippingThreshold > 0 && (
          <div className="free-shipping-bar">
            {remainingForFreeShipping > 0 ? (
              <p>
                أضف <strong>{currency}{remainingForFreeShipping.toFixed(2)}</strong> للحصول على شحن مجاني!
              </p>
            ) : (
              <p className="success">🎉 تهانينا! حصلت على شحن مجاني!</p>
            )}
            <div className="progress-bar">
              <div className="progress" style={{ width: `${freeShippingProgress}%` }} />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="mini-cart-items">
          {items.length === 0 ? (
            <div className="empty-cart">
              <ShoppingBagIcon />
              <h3>سلتك فارغة</h3>
              <p>ابدأ التسوق واكتشف منتجاتنا المميزة</p>
              <Link href="/shop" className="start-shopping" onClick={onClose}>
                تسوق الآن
              </Link>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  {item.imageUrl && (
                    <div className="item-image">
                      <LoadingImg
                        src={item.imageUrl}
                        alt={item.title}
                        blurDataUrl={item.imageBlurDataUrl ?? undefined}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="item-details">
                    <h4>{item.title}</h4>
                    {item.variant && <span className="variant">{item.variant}</span>}
                    <div className="item-price">
                      {currency}{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                  <div className="item-actions">
                    <div className="quantity-control">
                      <button
                        onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                      >
                        <MinusIcon />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.maxQuantity ? item.quantity >= item.maxQuantity : false}
                      >
                        <PlusIcon />
                      </button>
                    </div>
                    <button className="remove-btn" onClick={() => onRemoveItem(item.id)}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}

              {onClearCart && items.length > 0 && (
                <button className="clear-cart-btn" onClick={onClearCart}>
                  إفراغ السلة
                </button>
              )}
            </>
          )}
        </div>

        {/* Upsell Section */}
        {items.length > 0 && upsellProducts.length > 0 && (
          <div className="upsell-section">
            <div className="upsell-header">
              <SparklesIcon />
              <h3>أكمل طلبك</h3>
            </div>
            <div className="upsell-products">
              {upsellProducts.slice(0, 3).map((product) => (
                <div key={product.id} className="upsell-product">
                  {product.imageUrl && (
                    <LoadingImg
                      src={product.imageUrl}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="upsell-info">
                    <span className="title">{product.title}</span>
                    <span className="price">{currency}{product.price.toFixed(2)}</span>
                  </div>
                  <button
                    className="add-upsell"
                    onClick={() => onAddUpsell?.(product)}
                  >
                    <PlusIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="mini-cart-footer">
            <div className="subtotal">
              <span>المجموع</span>
              <span className="amount">{currency}{subtotal.toFixed(2)}</span>
            </div>
            <div className="cart-actions">
              <Link href="/cart" className="view-cart" onClick={onClose}>
                عرض السلة
              </Link>
              <Link href={checkoutUrl} className="checkout" onClick={onClose}>
                إتمام الشراء
              </Link>
            </div>
            <p className="secure-note">🔒 دفع آمن ومشفر</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Cart Icon with Count Badge
interface CartIconProps {
  count: number;
  onClick: () => void;
  className?: string;
}

export function CartIcon({ count, onClick, className = "" }: CartIconProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <button
      className={`cart-icon-btn ${className} ${isAnimating ? "bounce" : ""}`}
      onClick={onClick}
      aria-label={`عرض السلة (${count} عناصر)`}
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
      {count > 0 && (
        <span className={`cart-count ${isAnimating ? "pop" : ""}`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

// Floating Cart Button (Mobile)
interface FloatingCartProps {
  count: number;
  total: number;
  currency?: string;
  onClick: () => void;
}

export function FloatingCartButton({ count, total, currency = "₪", onClick }: FloatingCartProps) {
  if (count === 0) return null;

  return (
    <button className="floating-cart-btn" onClick={onClick}>
      <div className="cart-info">
        <span className="count">{count} عناصر</span>
        <span className="total">{currency}{total.toFixed(2)}</span>
      </div>
      <div className="cart-action">
        عرض السلة
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
