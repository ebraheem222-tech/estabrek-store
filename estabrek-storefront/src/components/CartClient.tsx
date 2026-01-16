"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { LoadingImg } from "@/components/LoadingImg";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { CheckoutProgress, CouponInput } from "@/components/CheckoutEnhancements";

// Icons
const ShoppingCartIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MinusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const EmptyCartIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

type Quote = {
  subtotal?: string | number;
  discountAmount?: string | number;
  total?: string | number;
  currencyCode?: string;
  coupon?: {
    code?: string | null;
    discountType?: "PERCENT" | "FIXED";
    discountValue?: string | number | null;
    maxDiscount?: string | number | null;
    minCart?: string | number | null;
  } | null;
  lines?: Array<{
    variantId: string;
    quantity: number;
    productTitle?: string;
    productSlug?: string | null;
    colorName?: string | null;
    sizeName?: string | null;
    sku?: string | null;
    imageUrl?: string | null;
    imageBlurDataUrl?: string | null;
    unitPrice?: string | number;
    lineSubtotal?: string | number;
    lineDiscount?: string | number;
    lineTotal?: string | number;
  }>;
  items?: Array<{
    variantId: string;
    quantity: number;
    unitPrice?: string | number;
    subtotal?: string | number;
    discountAmount?: string | number;
    total?: string | number;
    title?: string;
  }>;
  message?: string;
};

type CouponResult = {
  valid: boolean;
  code: string;
  discount: number;
  discountType: "PERCENT" | "FIXED";
  message?: string;
};

function apiBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    process.env.API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:4000/v1"
  );
}

function formatAmount(value: string | number | null | undefined, currencyCode?: string | null) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (currencyCode) {
    try {
      return new Intl.NumberFormat("ar", { style: "currency", currency: currencyCode }).format(n);
    } catch {
      // fall back to a simple numeric format
    }
  }
  return `₪${n.toFixed(2)}`;
}

export default function CartClient(props: { checkoutMode?: "WHATSAPP" | "STRIPE" | null; whatsappNumber?: string | null; ordersEmail?: string | null }) {
  const checkoutMode = props.checkoutMode ?? "WHATSAPP";
  const whatsappNumber = props.whatsappNumber ?? null;
  const ordersEmail = props.ordersEmail ?? null;
  const settings = useStorefrontSettings();

  const { items, setQty, removeItem, clear } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const payloadItems = useMemo(
    () => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    [items]
  );
  const currencyCode = quote?.currencyCode ?? null;
  const currencySymbol =
    currencyCode === "USD"
      ? "$"
      : currencyCode === "EUR"
      ? "€"
      : currencyCode === "ILS"
      ? "₪"
      : (currencyCode ?? "₪");
  const progressSteps = useMemo(
    () => [
      { id: "cart", title: "السلة" },
      { id: "details", title: "البيانات" },
      { id: "confirm", title: "تأكيد" },
    ],
    []
  );
  const lineByVariant = useMemo(() => {
    const map = new Map<string, NonNullable<Quote["lines"]>[number]>();
    for (const line of quote?.lines ?? []) {
      if (line?.variantId) map.set(line.variantId, line);
    }
    return map;
  }, [quote]);

    async function refreshQuote(nextCoupon?: string) {
    if (!payloadItems.length) {
      setQuote(null);
      setAppliedCoupon(null);
      return null;
    }
    setLoading(true);
    setErr(null);
    setSuccessMsg(null);
    const code = typeof nextCoupon === "string" ? nextCoupon : couponCode;
    try {
      const res = await fetch(`${apiBase()}/catalog/cart-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          couponCode: code || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "تعذر حساب السلة");
      setQuote(data);
      const discount = Number(data?.discountAmount ?? 0);
      const coupon = data?.coupon;
      if (coupon?.code) {
        setAppliedCoupon({
          valid: true,
          code: coupon.code,
          discount,
          discountType: coupon.discountType === "PERCENT" ? "PERCENT" : "FIXED",
        });
      } else {
        setAppliedCoupon(null);
      }
      if (typeof nextCoupon === "string") {
        setCouponCode(nextCoupon);
      }
      return data;
    } catch (e: any) {
      setErr(e?.message || "خطأ غير متوقع");
      setQuote(null);
      setAppliedCoupon(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {

    refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payloadItems)]);

  const handleApplyCoupon = async (code: string): Promise<CouponResult> => {
    const data = await refreshQuote(code);
    if (!data || !data.coupon?.code) {
      return {
        valid: false,
        code,
        discount: 0,
        discountType: "FIXED",
        message: "الكوبون غير صالح",
      };
    }
    const discount = Number(data.discountAmount ?? 0);
    return {
      valid: true,
      code: data.coupon.code,
      discount,
      discountType: data.coupon.discountType === "PERCENT" ? "PERCENT" : "FIXED",
    };
  };

  const handleRemoveCoupon = () => {
    if (!couponCode) return;
    setCouponCode("");
    setAppliedCoupon(null);
    refreshQuote("");
  };

  return (
    <main className="cart-container space-y-8 font-arabic" dir="rtl">
      {settings.checkoutProgressEnabled && items.length > 0 ? (
        <CheckoutProgress steps={progressSteps} currentStep={0} className="mb-4" />
      ) : null}
      {/* Cart Header */}
      <div className="cart-header">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white">
            <ShoppingCartIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">سلة المشتريات</h1>
            <p className="text-sm text-[var(--muted)]">
              {items.length === 0 ? "لا توجد منتجات" : `${items.length} منتج${items.length > 1 ? "ات" : ""}`}
            </p>
          </div>
        </div>
        {items.length ? (
          <button
            onClick={clear}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
          >
            <TrashIcon />
            تفريغ السلة
          </button>
        ) : null}
      </div>

      {/* Empty Cart State */}
      {items.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon text-[var(--muted)]">
            <EmptyCartIcon />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text)] mb-2">سلة المشتريات فارغة</h3>
          <p className="text-sm text-[var(--muted)] mb-6">ابدأ التسوق الآن واستمتع بأفضل المنتجات</p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeftIcon />
            تصفح المتجر
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Cart Items */}
          <div className="space-y-4">
            {items.map((it, idx) => {
              const line = lineByVariant.get(it.variantId);
              const title = line?.productTitle ?? "منتج";
              const metaParts = [line?.colorName, line?.sizeName].filter(Boolean) as string[];
              if (line?.sku) metaParts.push(`SKU ${line.sku}`);
              const meta = metaParts.join(" • ");
              const lineAmount =
                line?.lineTotal ??
                line?.lineSubtotal ??
                (line?.unitPrice != null && it.quantity ? Number(line.unitPrice) * it.quantity : null);
              const total = line ? formatAmount(lineAmount, currencyCode) : null;
              const unitPrice = line?.unitPrice ? formatAmount(line.unitPrice, currencyCode) : null;
              
              return (
                <div
                  key={it.variantId}
                  className="cart-item stagger-item"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(it.variantId)}
                    className="cart-item-remove"
                    title="إزالة"
                  >
                    <TrashIcon />
                  </button>

                  {/* Product Image */}
                  <div className="cart-item-image">
                    {line?.imageUrl ? (
                      <LoadingImg
                        src={line.imageUrl}
                        alt={title}
                        blurDataUrl={line.imageBlurDataUrl ?? undefined}
                        wrapperClassName="block h-full w-full"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-white/[0.03]">
                        <svg className="w-8 h-8 text-[var(--muted)] opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {line?.productSlug ? (
                          <Link 
                            href={`/p/${line.productSlug}`} 
                            className="text-[var(--text)] font-semibold hover:text-[var(--accent)] transition-colors line-clamp-2"
                          >
                            {title}
                          </Link>
                        ) : (
                          <div className="text-[var(--text)] font-semibold line-clamp-2">{title}</div>
                        )}
                        {meta && (
                          <div className="mt-1 text-xs text-[var(--muted)]">{meta}</div>
                        )}
                        {unitPrice && (
                          <div className="mt-2 text-sm text-[var(--muted)]">
                            سعر الوحدة: <span className="text-[var(--text)]">{unitPrice}</span>
                          </div>
                        )}
                      </div>
                      {total && (
                        <div className="text-lg font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] bg-clip-text text-transparent whitespace-nowrap">
                          {total}
                        </div>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="mt-4 flex items-center gap-4">
                      <span className="text-xs text-[var(--muted)]">الكمية:</span>
                      <div className="qty-controls">
                        <button
                          onClick={() => setQty(it.variantId, Math.max(1, it.quantity - 1))}
                          disabled={it.quantity <= 1}
                        >
                          <MinusIcon />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => setQty(it.variantId, Math.max(1, Number(e.target.value || 1)))}
                          dir="ltr"
                        />
                        <button onClick={() => setQty(it.variantId, it.quantity + 1)}>
                          <PlusIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary */}
          <aside className="cart-summary">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white">
                <TagIcon />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text)]">ملخص الطلب</h3>
                <p className="text-xs text-[var(--muted)]">{items.length} منتج</p>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="mb-6">
              {settings.couponAnimationsEnabled ? (
                <CouponInput
                  onApply={handleApplyCoupon}
                  onRemove={handleRemoveCoupon}
                  appliedCoupon={appliedCoupon}
                  currency={currencySymbol}
                />
              ) : (
                <>
                  <label className="text-xs text-[var(--muted)] mb-2 block">رمز الخصم</label>
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="أدخل كود الخصم"
                      className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                      dir="ltr"
                    />
                    <button
                      onClick={() => void refreshQuote()}
                      className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      تطبيق
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Summary Rows */}
            {loading ? (
              <div className="py-4">
                <LoadingIndicator
                  className="flex items-center justify-center"
                  fallback={<div className="text-sm text-[var(--muted)]">يتم الحساب...</div>}
                />
              </div>
            ) : err ? (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4">
                {err}
              </div>
            ) : quote ? (
              <div className="space-y-1 mb-6">
                <Row label="المجموع الفرعي" value={quote.subtotal} currencyCode={currencyCode} />
                {quote.discountAmount && Number(quote.discountAmount) > 0 && (
                  <Row label="الخصم" value={quote.discountAmount} currencyCode={currencyCode} isDiscount />
                )}
                <div className="h-px bg-white/10 my-3" />
                <div className="flex items-center justify-between py-2">
                  <span className="font-semibold text-[var(--text)]">الإجمالي</span>
                  <span className="cart-summary-total">{formatAmount(quote.total, currencyCode)}</span>
                </div>
              </div>
            ) : null}

            {/* Customer Info Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-[var(--muted)] mb-2 block">الاسم الكامل *</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="أدخل اسمك"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-2 block">رقم الهاتف *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-2 block">العنوان</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل عنوان التوصيل"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted)] mb-2 block">ملاحظات</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* WhatsApp Button */}
              <button
                disabled={submitting || !items.length || !quote?.lines?.length}
                onClick={async () => {
                  if (!customerName.trim() || customerName.trim().length < 2) return setErr("يرجى إدخال الاسم.");
                  if (!phone.trim() || phone.trim().length < 5) return setErr("يرجى إدخال رقم هاتف صحيح.");
                  setErr(null);
                  setSuccessMsg(null);
                  setSubmitting(true);
                  try {
                    const res = await fetch(`${apiBase()}/catalog/order-requests`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        items: payloadItems,
                        customerName: customerName.trim(),
                        phone: phone.trim(),
                        whatsapp: phone.trim(),
                        address: address.trim() || undefined,
                        note: note.trim() || undefined,
                        couponCode: couponCode.trim() || undefined,
                        source: "WHATSAPP_CART",
                      }),
                    });
                    if (!res.ok) throw new Error(`تعذر إرسال الطلب (${res.status})`);
                    const data = await res.json();
                    const orderId = data?.id;
                    setSuccessMsg(orderId ? `تم إرسال الطلب. رقم الطلب: ${orderId}` : "تم إرسال الطلب بنجاح!");

                    const lines = (quote?.lines ?? []) as any[];
                    const currency = currencyCode || "";
                    const total = quote?.total ?? "";
                    const textLines = lines.map((l) => {
                      const title = l.productTitle || l.title || "منتج";
                      const color = l.colorName ? `, ${l.colorName}` : "";
                      const size = l.sizeName ? `, ${l.sizeName}` : "";
                      const lineTotal = formatAmount(l.lineTotal ?? l.subtotal ?? l.lineSubtotal ?? "", currency);
                      return `• ${title}${color}${size} x${l.quantity} = ${lineTotal}`.trim();
                    });
                    const totalText = formatAmount(total, currency);

                    const msg = [
                      "🛒 طلب جديد من المتجر",
                      "",
                      ...(orderId ? [`📋 رقم الطلب: ${orderId}`, ""] : []),
                      "📦 المنتجات:",
                      ...textLines,
                      "",
                      `💰 الإجمالي: ${totalText}`,
                      "",
                      `👤 الاسم: ${customerName.trim()}`,
                      `📱 الهاتف: ${phone.trim()}`,
                      ...(address.trim() ? [`📍 العنوان: ${address.trim()}`] : []),
                      ...(note.trim() ? [`📝 ملاحظات: ${note.trim()}`] : []),
                    ].join("\n");

                    const waTo = (whatsappNumber || "").replace(/[^0-9]/g, "");
                    if (!waTo) {
                      alert(msg);
                      return;
                    }
                    const url = `https://wa.me/${waTo}?text=${encodeURIComponent(msg)}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  } catch (e: any) {
                    setErr(e?.message || "حدث خطأ");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <WhatsAppIcon />
                {submitting ? "جارٍ الإرسال..." : "إرسال عبر واتساب"}
              </button>

              {/* Direct Order Button */}
              <button
                disabled={checkoutMode === "STRIPE" || submitting || !items.length || !quote?.lines?.length}
                onClick={async () => {
                  if (!customerName.trim() || customerName.trim().length < 2) return setErr("يرجى إدخال الاسم.");
                  if (!phone.trim() || phone.trim().length < 5) return setErr("يرجى إدخال رقم هاتف صحيح.");
                  setErr(null);
                  setSuccessMsg(null);
                  setSubmitting(true);
                  try {
                    const res = await fetch(`${apiBase()}/catalog/order-requests`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        items: payloadItems,
                        customerName: customerName.trim(),
                        phone: phone.trim(),
                        address: address.trim() || undefined,
                        note: note.trim() || undefined,
                        couponCode: couponCode.trim() || undefined,
                        source: "DIRECT_CART",
                      }),
                    });
                    if (!res.ok) throw new Error(`تعذر إرسال الطلب (${res.status})`);
                    const data = await res.json();
                    const orderId = data?.id;
                    setSuccessMsg(orderId ? `تم إرسال الطلب بنجاح! رقم الطلب: ${orderId}` : "تم إرسال الطلب بنجاح!");
                  } catch (e: any) {
                    setErr(e?.message || "حدث خطأ");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                <SendIcon />
                {submitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
              </button>

              {/* Email Button */}
              {ordersEmail && (
                <button
                  disabled={submitting || !items.length || !quote?.lines?.length}
                  onClick={async () => {
                    if (!customerName.trim() || customerName.trim().length < 2) return setErr("يرجى إدخال الاسم.");
                    if (!phone.trim() || phone.trim().length < 5) return setErr("يرجى إدخال رقم هاتف صحيح.");
                    setErr(null);
                    setSuccessMsg(null);
                    setSubmitting(true);
                    try {
                      const res = await fetch(`${apiBase()}/catalog/order-requests`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          items: payloadItems,
                          customerName: customerName.trim(),
                          phone: phone.trim(),
                          address: address.trim() || undefined,
                          note: note.trim() || undefined,
                          couponCode: couponCode.trim() || undefined,
                          source: "EMAIL_CART",
                        }),
                      });
                      if (!res.ok) throw new Error(`تعذر إرسال الطلب (${res.status})`);
                      const data = await res.json();
                      const orderId = data?.id;
                      setSuccessMsg(orderId ? `تم إرسال الطلب. رقم الطلب: ${orderId}` : "تم إرسال الطلب بنجاح!");

                      const lines = (quote?.lines ?? []) as any[];
                      const currency = currencyCode || "";
                      const total = quote?.total ?? "";
                      const textLines = lines.map((l) => {
                        const title = l.productTitle || l.title || "منتج";
                        const color = l.colorName ? `, ${l.colorName}` : "";
                        const size = l.sizeName ? `, ${l.sizeName}` : "";
                        const lineTotal = formatAmount(l.lineTotal ?? l.subtotal ?? l.lineSubtotal ?? "", currency);
                        return `- ${title}${color}${size} x${l.quantity} = ${lineTotal}`.trim();
                      });
                      const totalText = formatAmount(total, currency);

                      const body = [
                        ...(orderId ? [`رقم الطلب: ${orderId}`, ""] : []),
                        ...textLines,
                        "",
                        `الإجمالي: ${totalText}`,
                        "",
                        `الاسم: ${customerName.trim()}`,
                        `رقم الهاتف: ${phone.trim()}`,
                        ...(address.trim() ? [`العنوان: ${address.trim()}`] : []),
                        ...(note.trim() ? [`ملاحظات: ${note.trim()}`] : []),
                      ].join("\n");

                      const subject = orderId ? `طلب جديد ${orderId}` : "طلب جديد";
                      window.location.href = `mailto:${ordersEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    } catch (e: any) {
                      setErr(e?.message || "حدث خطأ");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-[var(--text)] font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <MailIcon />
                  إرسال عبر البريد
                </button>
              )}
            </div>

            {/* Success Message */}
            {successMsg && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-center gap-2">
                <CheckIcon />
                {successMsg}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  currencyCode,
  isDiscount,
}: {
  label: string;
  value: any;
  currencyCode?: string | null;
  isDiscount?: boolean;
}) {
  const display = formatAmount(value, currencyCode);
  return (
    <div className="cart-summary-row">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={isDiscount ? "text-emerald-400" : "text-[var(--text)]"} dir="ltr">
        {isDiscount ? `-${display}` : display}
      </span>
    </div>
  );
}
