// ============================================================
// ESTABREK E-COMMERCE - CART COMPONENTS
// ============================================================
// Complete cart system with multiple variants
// ============================================================

import React, { useState } from "react";
import { cn } from "../ui/cn";

// ============================================================
// TYPES
// ============================================================

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  nameAr?: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
  sku?: string;
  maxQuantity?: number;
}

export interface CartProps {
  items: CartItem[];
  currency?: string;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
  onCheckout?: () => void;
  onContinueShopping?: () => void;
  variant?: "default" | "minimal" | "drawer" | "popup" | "full";
  className?: string;
}

// ============================================================
// HELPERS
// ============================================================

function formatPrice(price: number, currency = "ILS"): string {
  return new Intl.NumberFormat("ar-IL", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

// ============================================================
// CART ITEM COMPONENT
// ============================================================

export function CartItemRow({
  item,
  currency = "ILS",
  onUpdateQuantity,
  onRemove,
  variant = "default",
}: {
  item: CartItem;
  currency?: string;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
  variant?: "default" | "compact";
}) {
  const isCompact = variant === "compact";

  return (
    <div className={cn(
      "flex gap-4 p-4 border-b border-[var(--color-border)]",
      isCompact && "p-2 gap-2"
    )}>
      {/* Image */}
      <div className={cn(
        "relative overflow-hidden rounded-xl flex-shrink-0",
        isCompact ? "w-16 h-16" : "w-24 h-24"
      )}>
        <img
          src={item.image || "/placeholder.jpg"}
          alt={item.nameAr || item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "font-bold text-[var(--color-text)] truncate",
          isCompact ? "text-sm" : "text-base"
        )}>
          {item.nameAr || item.name}
        </h4>
        
        {item.variant && (
          <p className="text-xs text-[var(--color-text-muted)]">{item.variant}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQuantity?.(item.id, Math.max(1, item.quantity - 1))}
              className="w-8 h-8 rounded-lg bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)] transition-colors flex items-center justify-center"
              disabled={item.quantity <= 1}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="w-8 text-center font-medium">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
              className="w-8 h-8 rounded-lg bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)] transition-colors flex items-center justify-center"
              disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Price */}
          <span className={cn(
            "font-bold text-[var(--color-accent)]",
            isCompact ? "text-sm" : "text-base"
          )}>
            {formatPrice(item.price * item.quantity, currency)}
          </span>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove?.(item.id)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-start"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================
// CART SUMMARY
// ============================================================

export function CartSummary({
  subtotal,
  shipping = 0,
  tax = 0,
  discount = 0,
  total,
  currency = "ILS",
  onCheckout,
  onApplyCoupon,
  loading = false,
}: {
  subtotal: number;
  shipping?: number;
  tax?: number;
  discount?: number;
  total: number;
  currency?: string;
  onCheckout?: () => void;
  onApplyCoupon?: (code: string) => void;
  loading?: boolean;
}) {
  const [couponCode, setCouponCode] = useState("");

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
      <h3 className="text-lg font-bold mb-4">ملخص الطلب</h3>

      {/* Coupon Input */}
      {onApplyCoupon && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="كود الخصم"
            className="flex-1 px-4 py-2 rounded-xl border border-[var(--color-border)] bg-transparent text-sm"
          />
          <button
            onClick={() => onApplyCoupon(couponCode)}
            className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors text-sm font-medium"
          >
            تطبيق
          </button>
        </div>
      )}

      {/* Summary Lines */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">المجموع الفرعي</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        
        {shipping > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">الشحن</span>
            <span>{formatPrice(shipping, currency)}</span>
          </div>
        )}
        
        {shipping === 0 && (
          <div className="flex justify-between text-green-600">
            <span>الشحن</span>
            <span>مجاني</span>
          </div>
        )}
        
        {tax > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">الضريبة</span>
            <span>{formatPrice(tax, currency)}</span>
          </div>
        )}
        
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>الخصم</span>
            <span>-{formatPrice(discount, currency)}</span>
          </div>
        )}

        <div className="border-t border-[var(--color-border)] pt-3 flex justify-between text-lg font-bold">
          <span>الإجمالي</span>
          <span className="text-[var(--color-accent)]">{formatPrice(total, currency)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        disabled={loading}
        className="w-full mt-6 py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            جاري المعالجة...
          </span>
        ) : (
          "إتمام الطلب"
        )}
      </button>

      {/* Trust Badges */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          دفع آمن
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          ضمان استرداد
        </span>
      </div>
    </div>
  );
}

// ============================================================
// MINI CART (DRAWER)
// ============================================================

export function MiniCart({
  items,
  currency = "ILS",
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onClose,
  isOpen,
}: CartProps & { isOpen: boolean; onClose: () => void }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-full max-w-md bg-[var(--color-surface)] z-50 shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold">سلة التسوق ({itemCount})</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-alt)] rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-auto p-4" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-[var(--color-text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-[var(--color-text-muted)]">السلة فارغة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemove}
                  variant="compact"
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="flex justify-between mb-4">
              <span className="font-medium">المجموع</span>
              <span className="text-xl font-bold text-[var(--color-accent)]">
                {formatPrice(subtotal, currency)}
              </span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              إتمام الطلب
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// CART ICON WITH BADGE
// ============================================================

export function CartIcon({
  count = 0,
  onClick,
  className,
}: {
  count?: number;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("relative p-2 hover:bg-[var(--color-bg-alt)] rounded-xl transition-colors", className)}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-accent)] text-white text-xs font-bold rounded-full flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

// ============================================================
// FULL CART PAGE
// ============================================================

export function CartPage({
  items,
  currency = "ILS",
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onContinueShopping,
  className,
}: CartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 200 ? 0 : 25;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className={cn("text-center py-20", className)}>
        <svg className="w-24 h-24 mx-auto text-[var(--color-text-muted)] mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h2 className="text-2xl font-bold mb-2">السلة فارغة</h2>
        <p className="text-[var(--color-text-muted)] mb-6">لم تقم بإضافة أي منتجات بعد</p>
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
    <div className={cn("grid lg:grid-cols-3 gap-8", className)}>
      {/* Items */}
      <div className="lg:col-span-2">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-bold">سلة التسوق ({items.length} منتج)</h2>
          </div>
          <div>
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                currency={currency}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>

        <button
          onClick={onContinueShopping}
          className="mt-4 text-[var(--color-accent)] hover:underline flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          متابعة التسوق
        </button>
      </div>

      {/* Summary */}
      <div>
        <CartSummary
          subtotal={subtotal}
          shipping={shipping}
          total={total}
          currency={currency}
          onCheckout={onCheckout}
          onApplyCoupon={(code) => console.log("Apply coupon:", code)}
        />
      </div>
    </div>
  );
}

export default CartPage;
