// ============================================================
// ESTABREK E-COMMERCE - CHECKOUT COMPONENTS
// ============================================================
// Complete checkout flow with multiple steps
// ============================================================

import React, { useState } from "react";
import { cn } from "../ui/cn";

// ============================================================
// TYPES
// ============================================================

export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  city: string;
  area: string;
  street: string;
  building?: string;
  floor?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: "card" | "cash" | "wallet" | "bank";
  name: string;
  nameAr: string;
  icon?: string;
  description?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  estimatedDays: string;
  icon?: string;
}

export interface CheckoutStepProps {
  onNext?: () => void;
  onBack?: () => void;
}

// ============================================================
// CHECKOUT STEPS INDICATOR
// ============================================================

export function CheckoutSteps({
  currentStep,
  steps = ["السلة", "العنوان", "الشحن", "الدفع", "التأكيد"],
}: {
  currentStep: number;
  steps?: string[];
}) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors",
                index < currentStep
                  ? "bg-green-500 text-white"
                  : index === currentStep
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]"
              )}
            >
              {index < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                "text-xs mt-2",
                index <= currentStep ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
              )}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-12 h-1 mx-2",
                index < currentStep ? "bg-green-500" : "bg-[var(--color-border)]"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================
// ADDRESS FORM
// ============================================================

export function AddressForm({
  address,
  onChange,
  onSubmit,
  loading = false,
}: {
  address?: Partial<Address>;
  onChange: (address: Partial<Address>) => void;
  onSubmit?: () => void;
  loading?: boolean;
}) {
  const cities = ["القدس", "رام الله", "نابلس", "الخليل", "بيت لحم", "جنين", "طولكرم", "قلقيلية", "أريحا", "سلفيت"];

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        عنوان التوصيل
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">الاسم الكامل *</label>
          <input
            type="text"
            value={address?.fullName || ""}
            onChange={(e) => onChange({ ...address, fullName: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-transparent focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all"
            placeholder="أدخل اسمك الكامل"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">رقم الهاتف *</label>
          <input
            type="tel"
            value={address?.phone || ""}
            onChange={(e) => onChange({ ...address, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-transparent focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all"
            placeholder="05X-XXX-XXXX"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">المدينة *</label>
          <select
            value={address?.city || ""}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-transparent focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all"
          >
            <option value="">اختر المدينة</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">الحي/المنطقة *</label>
          <input
            type="text"
            value={address?.area || ""}
            onChange={(e) => onChange({ ...address, area: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-transparent focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all"
            placeholder="اسم الحي أو المنطقة"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">الشارع *</label>
          <input
            type="text"
            value={address?.street || ""}
            onChange={(e) => onChange({ ...address, street: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-transparent focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all"
            placeholder="اسم الشارع ورقم المبنى"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">رقم المبنى</label>
          <input
            type="text"
            value={address?.building || ""}
            onChange={(e) => onChange({ ...address, building: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-transparent focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all"
            placeholder="رقم المبنى (اختياري)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">الطابق</label>
          <input
            type="text"
            value={address?.floor || ""}
            onChange={(e) => onChange({ ...address, floor: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-transparent focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all"
            placeholder="رقم الطابق (اختياري)"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">ملاحظات للتوصيل</label>
          <textarea
            value={address?.notes || ""}
            onChange={(e) => onChange({ ...address, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-transparent focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all resize-none"
            placeholder="أي تعليمات خاصة للتوصيل..."
          />
        </div>
      </div>

      {onSubmit && (
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full mt-6 py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
        >
          {loading ? "جاري الحفظ..." : "حفظ العنوان"}
        </button>
      )}
    </div>
  );
}

// ============================================================
// SHIPPING METHODS
// ============================================================

export function ShippingMethodSelector({
  methods,
  selectedId,
  onSelect,
  currency = "ILS",
}: {
  methods: ShippingMethod[];
  selectedId?: string;
  onSelect: (id: string) => void;
  currency?: string;
}) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ar-IL", { style: "currency", currency, minimumFractionDigits: 0 }).format(price);

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
        طريقة الشحن
      </h3>

      <div className="space-y-3">
        {methods.map((method) => (
          <label
            key={method.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
              selectedId === method.id
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
            )}
          >
            <input
              type="radio"
              name="shipping"
              value={method.id}
              checked={selectedId === method.id}
              onChange={() => onSelect(method.id)}
              className="sr-only"
            />
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                selectedId === method.id ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"
              )}
            >
              {selectedId === method.id && (
                <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">{method.nameAr}</span>
                <span className={cn(
                  "font-bold",
                  method.price === 0 ? "text-green-600" : "text-[var(--color-accent)]"
                )}>
                  {method.price === 0 ? "مجاني" : formatPrice(method.price)}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">{method.estimatedDays}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAYMENT METHODS
// ============================================================

export function PaymentMethodSelector({
  methods,
  selectedId,
  onSelect,
}: {
  methods: PaymentMethod[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const icons: Record<string, React.ReactNode> = {
    card: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    cash: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    wallet: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    bank: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        طريقة الدفع
      </h3>

      <div className="grid md:grid-cols-2 gap-3">
        {methods.map((method) => (
          <label
            key={method.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
              selectedId === method.id
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
            )}
          >
            <input
              type="radio"
              name="payment"
              value={method.id}
              checked={selectedId === method.id}
              onChange={() => onSelect(method.id)}
              className="sr-only"
            />
            <div className="text-[var(--color-accent)]">
              {icons[method.type]}
            </div>
            <div className="flex-1">
              <span className="font-bold block">{method.nameAr}</span>
              {method.description && (
                <span className="text-xs text-[var(--color-text-muted)]">{method.description}</span>
              )}
            </div>
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                selectedId === method.id ? "border-[var(--color-accent)]" : "border-[var(--color-border)]"
              )}
            >
              {selectedId === method.id && (
                <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ORDER CONFIRMATION
// ============================================================

export function OrderConfirmation({
  orderNumber,
  email,
  onContinueShopping,
  onTrackOrder,
}: {
  orderNumber: string;
  email?: string;
  onContinueShopping?: () => void;
  onTrackOrder?: () => void;
}) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold mb-4">شكراً لطلبك!</h1>
      <p className="text-[var(--color-text-muted)] mb-2">تم استلام طلبك بنجاح</p>
      
      <div className="inline-block bg-[var(--color-bg-alt)] rounded-xl px-6 py-3 mb-6">
        <span className="text-sm text-[var(--color-text-muted)]">رقم الطلب</span>
        <p className="text-xl font-bold text-[var(--color-accent)]">{orderNumber}</p>
      </div>

      {email && (
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          تم إرسال تأكيد الطلب إلى: {email}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onTrackOrder}
          className="px-8 py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          تتبع الطلب
        </button>
        <button
          onClick={onContinueShopping}
          className="px-8 py-3 border border-[var(--color-border)] rounded-xl font-bold hover:bg-[var(--color-bg-alt)] transition-colors"
        >
          متابعة التسوق
        </button>
      </div>
    </div>
  );
}

export default CheckoutSteps;
