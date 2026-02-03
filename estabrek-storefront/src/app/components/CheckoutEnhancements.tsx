"use client";

import React, { useState, useEffect, useRef } from "react";
import { LoadingImg } from "@/components/LoadingImg";

// ============ PROGRESS STEPS ============

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

interface Step {
  id: string;
  title: string;
  icon?: React.ReactNode;
}

interface CheckoutProgressProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function CheckoutProgress({ steps, currentStep, className = "" }: CheckoutProgressProps) {
  return (
    <div className={`checkout-progress ${className}`}>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>
      <div className="progress-steps">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div
              key={step.id}
              className={`progress-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""} ${isUpcoming ? "upcoming" : ""}`}
            >
              <div className="step-indicator">
                {isCompleted ? (
                  <CheckIcon />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="step-title">{step.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ COUPON INPUT WITH ANIMATION ============

const TagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface CouponResult {
  valid: boolean;
  code: string;
  discount: number;
  discountType: "PERCENT" | "FIXED";
  message?: string;
}

interface CouponInputProps {
  onApply: (code: string) => Promise<CouponResult>;
  onRemove?: () => void;
  appliedCoupon?: CouponResult | null;
  currency?: string;
  className?: string;
}

export function CouponInput({
  onApply,
  onRemove,
  appliedCoupon,
  currency = "₪",
  className = "",
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onApply(code.trim().toUpperCase());
      
      if (result.valid) {
        setShowSuccess(true);
        setCode("");
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError(result.message || "كود الخصم غير صالح");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تطبيق الكود");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  const handleRemove = () => {
    onRemove?.();
    setShowSuccess(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`coupon-input-wrapper ${className}`}>
      {/* Applied Coupon */}
      {appliedCoupon?.valid && (
        <div className="applied-coupon">
          <div className="coupon-info">
            <TagIcon />
            <div className="coupon-details">
              <span className="coupon-code">{appliedCoupon.code}</span>
              <span className="coupon-discount">
                {appliedCoupon.discountType === "PERCENT"
                  ? `خصم ${appliedCoupon.discount}%`
                  : `خصم ${currency}${appliedCoupon.discount}`}
              </span>
            </div>
          </div>
          <button className="remove-coupon" onClick={handleRemove}>
            <CloseIcon />
          </button>
          <div className="coupon-confetti" />
        </div>
      )}

      {/* Input Form */}
      {!appliedCoupon?.valid && (
        <div className={`coupon-form ${error ? "has-error" : ""} ${showSuccess ? "success" : ""}`}>
          <div className="input-wrapper">
            <TagIcon />
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="أدخل كود الخصم"
              disabled={isLoading}
              dir="ltr"
            />
          </div>
          <button
            className="apply-btn"
            onClick={handleApply}
            disabled={!code.trim() || isLoading}
          >
            {isLoading ? <SpinnerIcon /> : "تطبيق"}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="coupon-error">
          <span>{error}</span>
        </div>
      )}

      {/* Success Animation */}
      {showSuccess && (
        <div className="coupon-success">
          <span>🎉 تم تطبيق الخصم بنجاح!</span>
        </div>
      )}
    </div>
  );
}

// ============ ANIMATED ORDER SUMMARY ============

interface OrderItem {
  id: string;
  title: string;
  variant?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  imageBlurDataUrl?: string;
}

interface OrderSummaryProps {
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  shipping?: number;
  tax?: number;
  total: number;
  currency?: string;
  className?: string;
  isCollapsible?: boolean;
}

export function OrderSummary({
  items,
  subtotal,
  discount = 0,
  shipping = 0,
  tax = 0,
  total,
  currency = "₪",
  className = "",
  isCollapsible = true,
}: OrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(!isCollapsible);
  const [animateTotal, setAnimateTotal] = useState(false);
  const prevTotal = useRef(total);

  // Animate when total changes
  useEffect(() => {
    if (total !== prevTotal.current) {
      setAnimateTotal(true);
      const timer = setTimeout(() => setAnimateTotal(false), 500);
      prevTotal.current = total;
      return () => clearTimeout(timer);
    }
  }, [total]);

  return (
    <div className={`order-summary ${className}`}>
      {/* Header */}
      <div
        className="summary-header"
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
        style={{ cursor: isCollapsible ? "pointer" : "default" }}
      >
        <h3>ملخص الطلب</h3>
        {isCollapsible && (
          <span className={`toggle-icon ${isExpanded ? "expanded" : ""}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>

      {/* Items (Collapsible) */}
      <div className={`summary-items ${isExpanded ? "expanded" : ""}`}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="summary-item"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {item.imageUrl && (
              <div className="item-image">
                <LoadingImg
                  src={item.imageUrl}
                  alt={item.title}
                  blurDataUrl={item.imageBlurDataUrl ?? undefined}
                  className="h-full w-full object-cover"
                />
                <span className="quantity-badge">{item.quantity}</span>
              </div>
            )}
            <div className="item-info">
              <span className="item-title">{item.title}</span>
              {item.variant && <span className="item-variant">{item.variant}</span>}
            </div>
            <span className="item-price">
              {currency}{(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="summary-totals">
        <div className="total-row">
          <span>المجموع الفرعي</span>
          <span>{currency}{subtotal.toFixed(2)}</span>
        </div>
        
        {discount > 0 && (
          <div className="total-row discount">
            <span>الخصم</span>
            <span>-{currency}{discount.toFixed(2)}</span>
          </div>
        )}
        
        <div className="total-row">
          <span>الشحن</span>
          <span>
            {shipping === 0 ? (
              <span className="free-shipping">مجاني</span>
            ) : (
              `${currency}${shipping.toFixed(2)}`
            )}
          </span>
        </div>
        
        {tax > 0 && (
          <div className="total-row">
            <span>الضريبة</span>
            <span>{currency}{tax.toFixed(2)}</span>
          </div>
        )}

        <div className={`total-row grand-total ${animateTotal ? "animate" : ""}`}>
          <span>الإجمالي</span>
          <span className="total-amount">{currency}{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ============ SECURE CHECKOUT BADGE ============

export function SecureCheckoutBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`secure-badge ${className}`}>
      <div className="badge-icon">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <div className="badge-content">
        <h4>دفع آمن 100%</h4>
        <p>بياناتك محمية بتشفير SSL</p>
      </div>
      <div className="payment-icons">
        <span>💳</span>
        <span>🏦</span>
        <span>📱</span>
      </div>
    </div>
  );
}

// ============ DELIVERY OPTIONS ============

interface DeliveryOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays: string;
  icon?: string;
}

interface DeliveryOptionsProps {
  options: DeliveryOption[];
  selectedId: string;
  onChange: (id: string) => void;
  currency?: string;
  className?: string;
}

export function DeliveryOptions({
  options,
  selectedId,
  onChange,
  currency = "₪",
  className = "",
}: DeliveryOptionsProps) {
  return (
    <div className={`delivery-options ${className}`}>
      <h3>طريقة التوصيل</h3>
      <div className="options-list">
        {options.map((option) => (
          <label
            key={option.id}
            className={`delivery-option ${selectedId === option.id ? "selected" : ""}`}
          >
            <input
              type="radio"
              name="delivery"
              value={option.id}
              checked={selectedId === option.id}
              onChange={() => onChange(option.id)}
            />
            <div className="option-content">
              <div className="option-icon">{option.icon || "📦"}</div>
              <div className="option-info">
                <span className="option-name">{option.name}</span>
                {option.description && (
                  <span className="option-desc">{option.description}</span>
                )}
                <span className="option-estimate">{option.estimatedDays}</span>
              </div>
              <span className="option-price">
                {option.price === 0 ? "مجاني" : `${currency}${option.price}`}
              </span>
            </div>
            <div className="option-check">
              <CheckIcon />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============ ORDER CONFIRMATION ============

interface OrderConfirmationProps {
  orderNumber: string;
  email?: string;
  estimatedDelivery?: string;
  onContinueShopping?: () => void;
  className?: string;
}

export function OrderConfirmation({
  orderNumber,
  email,
  estimatedDelivery,
  onContinueShopping,
  className = "",
}: OrderConfirmationProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`order-confirmation ${className}`}>
      {showConfetti && <div className="confirmation-confetti" />}
      
      <div className="confirmation-icon">
        <div className="check-circle">
          <CheckIcon />
        </div>
      </div>

      <h1>شكراً لطلبك!</h1>
      <p className="order-number">رقم الطلب: <strong>{orderNumber}</strong></p>

      {email && (
        <p className="confirmation-email">
          تم إرسال تأكيد الطلب إلى <strong>{email}</strong>
        </p>
      )}

      {estimatedDelivery && (
        <div className="delivery-estimate">
          <span className="icon">📦</span>
          <span>التوصيل المتوقع: <strong>{estimatedDelivery}</strong></span>
        </div>
      )}

      <div className="confirmation-actions">
        <a href={`/orders/${orderNumber}`} className="track-order">
          تتبع الطلب
        </a>
        <button className="continue-shopping" onClick={onContinueShopping}>
          متابعة التسوق
        </button>
      </div>
    </div>
  );
}
