"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";

type Quote = {
  subtotal?: string | number;
  discountAmount?: string | number;
  total?: string | number;
  currencyCode?: string;
  lines?: Array<{
    variantId: string;
    quantity: number;
    productTitle?: string;
    productSlug?: string | null;
    colorName?: string | null;
    sizeName?: string | null;
    sku?: string | null;
    imageUrl?: string | null;
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

function apiBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    process.env.API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:4000/v1"
  );
}

function formatAmount(value: string | number | null | undefined, currencyCode?: string | null) {
  if (value == null || value === "") return "-";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (currencyCode) {
    try {
      return new Intl.NumberFormat("ar", { style: "currency", currency: currencyCode }).format(n);
    } catch {
      // fall back to a simple numeric format
    }
  }
  return n.toFixed(2);
}

export default function CartClient(props: { checkoutMode?: "WHATSAPP" | "STRIPE" | null; whatsappNumber?: string | null; ordersEmail?: string | null }) {
  const checkoutMode = props.checkoutMode ?? "WHATSAPP";
  const whatsappNumber = props.whatsappNumber ?? null;
  const ordersEmail = props.ordersEmail ?? null;

  const { items, setQty, removeItem, clear } = useCart();
  const [couponCode, setCouponCode] = useState("");
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
  const lineByVariant = useMemo(() => {
    const map = new Map<string, NonNullable<Quote["lines"]>[number]>();
    for (const line of quote?.lines ?? []) {
      if (line?.variantId) map.set(line.variantId, line);
    }
    return map;
  }, [quote]);

  async function refreshQuote() {
    if (!payloadItems.length) {
      setQuote(null);
      return;
    }
    setLoading(true);
    setErr(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${apiBase()}/catalog/cart-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          couponCode: couponCode || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "تعذر حساب السلة");
      setQuote(data);
    } catch (e: any) {
      setErr(e?.message || "حدث خطأ");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payloadItems)]);

  return (
    <main className="space-y-6 font-arabic" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">سلة المشتريات</h1>
        {items.length ? (
          <button
            onClick={clear}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80 hover:bg-white/[0.06]"
          >
            تفريغ السلة
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
          <p className="text-white/80">سلة المشتريات فارغة.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="space-y-4">
              {items.map((it) => {
                const line = lineByVariant.get(it.variantId);
                const title = line?.productTitle ?? "منتج";
                const metaParts = [line?.colorName, line?.sizeName].filter(Boolean) as string[];
                if (line?.sku) metaParts.push(`SKU ${line.sku}`);
                const meta = metaParts.join(" | ");
                const total = line ? formatAmount(line.lineTotal ?? line.lineSubtotal, currencyCode) : null;
                return (
                  <div
                    key={it.variantId}
                    className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                        {line?.imageUrl ? (
                          <img src={line.imageUrl} alt={title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-white/[0.03]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        {line?.productSlug ? (
                          <a href={`/p/${line.productSlug}`} className="truncate text-sm font-semibold text-white/90 hover:underline">
                            {title}
                          </a>
                        ) : (
                          <div className="truncate text-sm font-semibold text-white/90">{title}</div>
                        )}
                        {meta ? <div className="mt-1 text-xs text-white/60">{meta}</div> : null}
                        <div className="mt-1 text-xs text-white/50">
                          المعرف: <span dir="ltr">{it.variantId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      {total ? <div className="text-sm font-semibold text-white">{total}</div> : null}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/60">الكمية</span>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) =>
                            setQty(it.variantId, Math.max(1, Number(e.target.value || 1)))
                          }
                          className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm"
                          dir="ltr"
                        />
                      </div>
                      <button
                        onClick={() => removeItem(it.variantId)}
                        className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white/80 hover:bg-white/5"
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="mb-3 text-lg font-medium">ملخص الطلب</div>

            <div className="mb-4 flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="كود الخصم"
                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                dir="ltr"
              />
              <button
                onClick={refreshQuote}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:opacity-90"
              >
                تطبيق
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-white/70">يتم الحساب...</div>
            ) : err ? (
              <div className="text-sm text-red-300">خطأ: {err}</div>
            ) : quote ? (
              <div className="space-y-2 text-sm text-white/80">
                <Row label="المجموع الفرعي" value={quote.subtotal} currencyCode={currencyCode} />
                <Row label="الخصم" value={quote.discountAmount} currencyCode={currencyCode} />
                <div className="my-2 h-px bg-white/10" />
                <Row label="الإجمالي" value={quote.total} strong currencyCode={currencyCode} />
                {quote.currencyCode ? (
                  <div className="pt-1 text-xs text-white/50">
                    العملة: {quote.currencyCode}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-white/70">لا توجد فاتورة بعد.</div>
            )}
          </aside>
        </div>
      )}
          <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h2 className="text-lg font-semibold">إتمام الطلب</h2>
        <p className="mt-1 text-sm text-white/70">أدخل بياناتك ثم أرسل الطلب عبر واتساب أو البريد الإلكتروني.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">الاسم</span>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/20"
              placeholder="الاسم الكامل"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-white/80">رقم الهاتف</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/20"
              placeholder="+972..."
              dir="ltr"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-white/80">العنوان</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/20"
              placeholder="المدينة، الشارع، رقم المنزل"
            />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span className="text-white/80">ملاحظات</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/20"
              placeholder="ملاحظة اختيارية (وقت التوصيل، الألوان، إلخ)"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {checkoutMode === "STRIPE" ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70">
              بوابة الدفع عبر Stripe غير مفعلة بعد. غيّر الوضع إلى واتساب/البريد من إعدادات الإدارة.
            </div>
          ) : null}

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
                setSuccessMsg(orderId ? `تم إرسال الطلب. رقم الطلب: ${orderId}. سنتواصل قريبًا.` : "تم إرسال الطلب. سنتواصل قريبًا.");

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

                const msg = [
                  "تفاصيل الطلب من المتجر:",
                  "",
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

                const waTo = (whatsappNumber || "").replace(/[^0-9]/g, "");
                if (!waTo) {
                  // fallback: just show message
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
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting ? "جارٍ الإرسال..." : "إرسال عبر واتساب"}
          </button>
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
                setSuccessMsg(orderId ? `تم إرسال الطلب. رقم الطلب: ${orderId}. سنتواصل قريبًا.` : "تم إرسال الطلب. سنتواصل قريبًا.");
              } catch (e: any) {
                setErr(e?.message || "حدث خطأ");
              } finally {
                setSubmitting(false);
              }
            }}
            className="rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast)] hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "جارٍ الإرسال..." : "إرسال الطلب للمتجر"}
          </button>

          <button
            disabled={checkoutMode === "STRIPE" || submitting || !items.length || !quote?.lines?.length || !ordersEmail}
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
                setSuccessMsg(orderId ? `تم إرسال الطلب. رقم الطلب: ${orderId}. سنتواصل قريبًا.` : "تم إرسال الطلب. سنتواصل قريبًا.");

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
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5 disabled:opacity-60"
          >
            إرسال عبر البريد الإلكتروني
          </button>

          {!ordersEmail ? (
            <span className="self-center text-xs text-white/50">إرسال البريد معطل (اضبط ordersEmail من إعدادات الإدارة).</span>
          ) : null}
          {successMsg ? (
            <div className="w-full text-sm text-emerald-300">{successMsg}</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Row({
  label,
  value,
  strong,
  currencyCode,
}: {
  label: string;
  value: any;
  strong?: boolean;
  currencyCode?: string | null;
}) {
  const display = formatAmount(value, currencyCode);
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={strong ? "text-white font-semibold" : "text-white"} dir="ltr">
        {display}
      </span>
    </div>
  );
}



