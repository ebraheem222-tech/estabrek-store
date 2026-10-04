"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { useCart } from "@/store/cart";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { LqipImage } from "@/components/LqipImage";
import { cldUrl } from "@/lib/cloudinary";
import { whatsappLink } from "@/lib/whatsapp";
import { clearBodyScrollLocks } from "@/lib/bodyScrollLock";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";

type Line = {
  variantId: string;
  quantity: number;
  productTitle?: string;
  productSlug?: string | null;
  colorName?: string | null;
  boxLabel?: string | null;
  sizeName?: string | null;
  imageUrl?: string | null;
  imageBlurDataUrl?: string | null;
  unitPrice?: string | number;
  lineSubtotal?: string | number;
  lineTotal?: string | number;
};
type Quote = {
  subtotal?: string | number;
  discountAmount?: string | number;
  total?: string | number;
  currencyCode?: string;
  coupon?: { code?: string | null } | null;
  lines?: Line[];
};

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || process.env.API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:4000/v1";
}

function money(value: string | number | null | undefined, currency?: string | null) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency: currency || "ILS" }).format(n);
  } catch {
    return `₪${n.toFixed(2)}`;
  }
}

type Props = {
  checkoutMode?: "WHATSAPP" | "STRIPE" | "PAYPAL" | "PAYMENTS" | null;
  whatsappNumber?: string | null;
  ordersEmail?: string | null;
  stripeEnabled?: boolean;
  paypalEnabled?: boolean;
  countryCode?: string | null;
};

/**
 * Rose shopping bag: the pieces with their photo, colour and size, the total
 * from the store's own price quote, and one clear way to order. Orders are
 * recorded in the store first, then the WhatsApp message opens ready to send.
 */
export function RoseCart({ checkoutMode = "WHATSAPP", whatsappNumber, ordersEmail, stripeEnabled, paypalEnabled, countryCode }: Props) {
  const ar = useLanguage().language === "ar";
  const settings = useStorefrontSettings();
  const { items, setQty, removeItem, clear } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ orderId?: string; via: "whatsapp" | "direct" | "email" } | null>(null);
  const list = useRef<HTMLUListElement>(null);

  const wantsStripe = (checkoutMode === "STRIPE" || checkoutMode === "PAYMENTS") && !!stripeEnabled;
  const wantsPaypal = (checkoutMode === "PAYPAL" || checkoutMode === "PAYMENTS") && !!paypalEnabled;
  const allowManual = checkoutMode === "WHATSAPP" || settings.allowManualCheckoutWithPayments === true;
  const waReady = Boolean(whatsappLink(whatsappNumber, undefined, countryCode));
  const payload = useMemo(() => items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), [items]);
  const currency = quote?.currencyCode ?? null;
  const lineBy = useMemo(() => new Map((quote?.lines ?? []).map((l) => [l.variantId, l])), [quote]);
  const count = items.reduce((a, b) => a + b.quantity, 0);
  const discount = Number(quote?.discountAmount ?? 0);

  useEffect(() => { clearBodyScrollLocks(); }, []);

  async function refresh(code = coupon) {
    if (!payload.length) { setQuote(null); return null; }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/catalog/cart-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload, couponCode: code || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || (ar ? "تعذّر حساب الحقيبة" : "Could not price your bag"));
      setQuote(data);
      return data as Quote;
    } catch (e: any) {
      setErr(e?.message || (ar ? "حدث خطأ غير متوقع" : "Something went wrong"));
      return null;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(payload)]);

  const remove = (variantId: string) => {
    const row = list.current?.querySelector<HTMLElement>(`[data-variant="${CSS.escape(variantId)}"]`);
    if (!row) return removeItem(variantId);
    gsap.to(row, { opacity: 0, x: ar ? 40 : -40, height: 0, marginBottom: 0, paddingBlock: 0, duration: 0.35, ease: "power2.in", onComplete: () => removeItem(variantId) });
  };

  const applyCoupon = async (event: FormEvent) => {
    event.preventDefault();
    const code = coupon.trim();
    if (!code) return;
    const data = await refresh(code);
    setCouponMsg(data?.coupon?.code ? (ar ? `تم تطبيق الكوبون ${data.coupon.code}` : `Coupon ${data.coupon.code} applied`) : (ar ? "الكوبون غير صالح" : "This coupon isn't valid"));
    if (!data?.coupon?.code) setCoupon("");
  };

  const nameOk = form.name.trim().length >= 2;
  const phoneOk = form.phone.replace(/\D/g, "").length >= 7;
  const canOrder = !submitting && !loading && items.length > 0 && Boolean(quote?.lines?.length);

  const orderText = (orderId?: string) => {
    const lines = (quote?.lines ?? []).map((l) => {
      const details = [[l.colorName, l.boxLabel].filter(Boolean).join(" — "), l.sizeName ? `${ar ? "مقاس" : "size"} ${l.sizeName}` : ""].filter(Boolean).join("، ");
      return `• ${l.productTitle || (ar ? "منتج" : "Item")}${details ? ` (${details})` : ""} × ${l.quantity} = ${money(l.lineTotal ?? l.lineSubtotal, currency)}`;
    });
    return [
      ar ? "🌸 طلب جديد من متجر استبرق" : "🌸 New order from Estabrek",
      ...(orderId ? [`${ar ? "رقم الطلب" : "Order"}: ${orderId}`] : []),
      "",
      ...lines,
      "",
      ...(discount > 0 ? [`${ar ? "الخصم" : "Discount"}: −${money(discount, currency)}`] : []),
      `${ar ? "الإجمالي" : "Total"}: ${money(quote?.total, currency)}`,
      "",
      `${ar ? "الاسم" : "Name"}: ${form.name.trim()}`,
      `${ar ? "الهاتف" : "Phone"}: ${form.phone.trim()}`,
      ...(form.address.trim() ? [`${ar ? "العنوان" : "Address"}: ${form.address.trim()}`] : []),
      ...(form.note.trim() ? [`${ar ? "ملاحظات" : "Notes"}: ${form.note.trim()}`] : []),
    ].join("\n");
  };

  async function placeOrder(via: "whatsapp" | "direct" | "email") {
    setTouched(true);
    if (!nameOk || !phoneOk) { setErr(ar ? "أكملي الاسم ورقم الهاتف حتى نتواصل معكِ." : "Add your name and phone so we can reach you."); return; }
    setErr(null);
    setSubmitting(true);
    // Open the chat window inside the click so pop-up blockers allow it.
    const chat = via === "whatsapp" && waReady ? window.open("", "_blank") : null;
    try {
      const res = await fetch(`${apiBase()}/catalog/order-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payload,
          customerName: form.name.trim(),
          phone: form.phone.trim(),
          ...(via === "whatsapp" ? { whatsapp: form.phone.trim() } : {}),
          address: form.address.trim() || undefined,
          note: form.note.trim() || undefined,
          couponCode: coupon.trim() || undefined,
          source: via === "whatsapp" ? "WHATSAPP_CART" : via === "email" ? "EMAIL_CART" : "DIRECT_CART",
        }),
      });
      if (!res.ok) throw new Error(ar ? `تعذّر إرسال الطلب (${res.status})` : `Could not send the order (${res.status})`);
      const data = await res.json().catch(() => ({}));
      const orderId = data?.id ? String(data.id) : undefined;
      const text = orderText(orderId);
      if (via === "whatsapp") {
        const url = whatsappLink(whatsappNumber, text, countryCode);
        if (url && chat) chat.location.href = url;
        else if (url) window.location.href = url;
      } else if (via === "email" && ordersEmail) {
        window.location.href = `mailto:${ordersEmail}?subject=${encodeURIComponent(orderId ? `طلب جديد ${orderId}` : "طلب جديد")}&body=${encodeURIComponent(text)}`;
      }
      setDone({ orderId, via });
      clear();
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      chat?.close();
      setErr(e?.message || (ar ? "حدث خطأ" : "Something went wrong"));
    } finally {
      setSubmitting(false);
    }
  }

  async function pay(provider: "stripe" | "paypal") {
    setTouched(true);
    if (!nameOk || !phoneOk) { setErr(ar ? "أكملي الاسم ورقم الهاتف." : "Add your name and phone."); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/storefront/checkout/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, items: payload, customerName: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() || undefined, note: form.note.trim() || undefined, couponCode: coupon.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.redirectUrl) throw new Error(data?.message || (ar ? "تعذّر بدء الدفع" : "Could not start payment"));
      window.location.href = data.redirectUrl;
    } catch (e: any) {
      setErr(e?.message || (ar ? "حدث خطأ" : "Something went wrong"));
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="rose-cart rose-cart-done" aria-live="polite">
        <span className="rose-cart-done-mark"><Icon name="spark" /></span>
        <span className="atelier-eyebrow">{ar ? "وصل طلبكِ" : "ORDER RECEIVED"}</span>
        <h1>{ar ? "شكراً لكِ، طلبكِ عندنا." : "Thank you — we have your order."}</h1>
        {done.orderId && <p className="rose-cart-order-id">{ar ? "رقم الطلب" : "Order number"}: <b dir="ltr">{done.orderId}</b></p>}
        <p>
          {done.via === "whatsapp"
            ? ar ? "فتحنا لكِ محادثة واتساب فيها تفاصيل الطلب. أرسلي الرسالة لنؤكد معكِ التوصيل." : "We opened a WhatsApp chat with your order details. Send it and we'll confirm delivery with you."
            : ar ? "سنتواصل معكِ قريباً على رقمكِ لتأكيد الطلب والتوصيل." : "We'll contact you soon to confirm your order and delivery."}
        </p>
        <Link href="/shop" className="atelier-button button-dark">{ar ? "متابعة التسوق" : "Keep shopping"}<Icon name="arrow" /></Link>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="rose-cart rose-cart-empty">
        <span className="rose-cart-empty-icon"><Icon name="bag" /></span>
        <span className="atelier-eyebrow">{ar ? "حقيبة التسوق" : "YOUR BAG"}</span>
        <h1>{ar ? "حقيبتكِ فارغة حالياً." : "Your bag is empty."}</h1>
        <p>{ar ? "اكتشفي الجديد، وأضيفي القطع التي تحبينها." : "Discover what's new and add the pieces you love."}</p>
        <div className="rose-cart-empty-actions">
          <Link href="/shop" className="atelier-button button-dark">{ar ? "تسوّقي الآن" : "Shop now"}<Icon name="arrow" /></Link>
          <Link href="/wishlist" className="atelier-text-link">{ar ? "المفضلة" : "Your wishlist"}<Icon name="heart" /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rose-cart">
      <header className="rose-cart-head">
        <span className="atelier-eyebrow">{ar ? "حقيبة التسوق" : "YOUR BAG"}</span>
        <h1>{ar ? "حقيبتكِ." : "Your bag."}<span>{ar ? (count === 1 ? "قطعة واحدة" : count === 2 ? "قطعتان" : `${count} قطع`) : `${count} piece${count === 1 ? "" : "s"}`}</span></h1>
        <ol className="rose-cart-steps" aria-label={ar ? "خطوات الطلب" : "Order steps"}>
          <li data-on="">{ar ? "الحقيبة" : "Bag"}</li>
          <li data-on={nameOk && phoneOk ? "" : undefined}>{ar ? "بياناتكِ" : "Your details"}</li>
          <li>{ar ? "التأكيد" : "Confirm"}</li>
        </ol>
      </header>

      <div className="rose-cart-grid">
        <div>
          <ul ref={list} className="rose-cart-lines">
            {items.map((it) => {
              const l = lineBy.get(it.variantId);
              const href = l?.productSlug ? `/p/${encodeURIComponent(l.productSlug)}` : "/shop";
              const color = [l?.colorName, l?.boxLabel].filter(Boolean).join(" — ");
              return (
                <li key={it.variantId} data-variant={it.variantId} className="rose-cart-line">
                  <Link href={href} className="rose-cart-thumb">
                    {l?.imageUrl ? <LqipImage src={cldUrl(l.imageUrl, { w: 240, h: 300, c: "fill", g: "auto" })} alt={l.productTitle ?? ""} fill sizes="110px" blurDataUrl={l.imageBlurDataUrl ?? undefined} className="object-cover" /> : <span className="rose-image-placeholder">استبرق</span>}
                  </Link>
                  <div className="rose-cart-info">
                    <Link href={href} className="rose-cart-title">{l?.productTitle ?? (loading ? "…" : ar ? "قطعة" : "Item")}</Link>
                    <div className="rose-cart-chips">
                      {color && <span>{ar ? "اللون" : "Colour"}: {color}</span>}
                      {l?.sizeName && <span>{ar ? "المقاس" : "Size"}: {l.sizeName}</span>}
                    </div>
                    <span className="rose-cart-unit">{money(l?.unitPrice, currency)}</span>
                  </div>
                  <div className="rose-cart-qty" aria-label={ar ? "الكمية" : "Quantity"}>
                    <button type="button" aria-label={ar ? "زيادة" : "More"} onClick={() => setQty(it.variantId, it.quantity + 1)}>+</button>
                    <span aria-live="polite">{it.quantity}</span>
                    <button type="button" aria-label={ar ? "إنقاص" : "Less"} onClick={() => (it.quantity <= 1 ? remove(it.variantId) : setQty(it.variantId, it.quantity - 1))}>−</button>
                  </div>
                  <div className="rose-cart-line-end">
                    <strong>{money(l?.lineTotal ?? l?.lineSubtotal, currency)}</strong>
                    <button type="button" className="rose-cart-remove" onClick={() => remove(it.variantId)} aria-label={`${ar ? "إزالة" : "Remove"} ${l?.productTitle ?? ""}`}>
                      {ar ? "إزالة" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="rose-cart-under">
            <Link href="/shop" className="atelier-text-link">{ar ? "متابعة التسوق" : "Keep shopping"}<Icon name="arrow" /></Link>
            <button type="button" className="rose-cart-clear" onClick={() => clear()}>{ar ? "إفراغ الحقيبة" : "Empty the bag"}</button>
          </div>
        </div>

        <aside className="rose-cart-summary" aria-label={ar ? "ملخص الطلب" : "Order summary"}>
          <h2>{ar ? "ملخص الطلب" : "Order summary"}</h2>
          <dl>
            <div><dt>{ar ? "المجموع الفرعي" : "Subtotal"}</dt><dd>{loading && !quote ? "…" : money(quote?.subtotal, currency)}</dd></div>
            {discount > 0 && <div className="discount"><dt>{ar ? "الخصم" : "Discount"}{quote?.coupon?.code ? ` (${quote.coupon.code})` : ""}</dt><dd>−{money(discount, currency)}</dd></div>}
            <div><dt>{ar ? "التوصيل" : "Delivery"}</dt><dd className="muted">{ar ? "نؤكده معكِ" : "Confirmed with you"}</dd></div>
            <div className="total"><dt>{ar ? "الإجمالي" : "Total"}</dt><dd>{loading && !quote ? "…" : money(quote?.total, currency)}</dd></div>
          </dl>

          {couponOpen ? (
            <form className="rose-cart-coupon" onSubmit={applyCoupon}>
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={ar ? "رمز الكوبون" : "Coupon code"} aria-label={ar ? "رمز الكوبون" : "Coupon code"} dir="ltr" />
              <button type="submit" disabled={loading}>{ar ? "تطبيق" : "Apply"}</button>
            </form>
          ) : (
            <button type="button" className="rose-cart-coupon-toggle" onClick={() => setCouponOpen(true)}>{ar ? "عندكِ كوبون خصم؟" : "Have a coupon?"}</button>
          )}
          {couponMsg && <p className="rose-cart-note" role="status">{couponMsg}</p>}

          <div className="rose-cart-form">
            <h3>{ar ? "بياناتكِ للتوصيل" : "Your delivery details"}</h3>
            <label className={touched && !nameOk ? "invalid" : undefined}>
              <span>{ar ? "الاسم" : "Name"} *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required />
            </label>
            <label className={touched && !phoneOk ? "invalid" : undefined}>
              <span>{ar ? "رقم الهاتف" : "Phone"} *</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" autoComplete="tel" dir="ltr" required />
            </label>
            <label>
              <span>{ar ? "العنوان" : "Address"}</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" placeholder={ar ? "المدينة، الحي، الشارع" : "City, area, street"} />
            </label>
            <label>
              <span>{ar ? "ملاحظات" : "Notes"}</span>
              <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={ar ? "وقت مناسب للتوصيل، أو أي تفصيلة" : "A good delivery time, or any detail"} />
            </label>
          </div>

          {err && <p className="rose-cart-error" role="alert">{err}</p>}

          <div className="rose-cart-actions">
            {wantsStripe && <button type="button" className="atelier-button button-dark" disabled={!canOrder} onClick={() => void pay("stripe")}>{ar ? "الدفع بالبطاقة" : "Pay by card"}<Icon name="arrow" /></button>}
            {wantsPaypal && <button type="button" className="atelier-button button-dark" disabled={!canOrder} onClick={() => void pay("paypal")}>{ar ? "الدفع عبر PayPal" : "Pay with PayPal"}<Icon name="arrow" /></button>}
            {allowManual && waReady && (
              <button type="button" className="atelier-button rose-cart-wa" disabled={!canOrder} onClick={() => void placeOrder("whatsapp")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.05 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.9 9.9 0 1 0 12.05 2Zm5.8 14.1c-.25.7-1.45 1.33-2 1.4-.5.08-1.15.11-1.85-.12-.43-.13-.98-.32-1.69-.62-2.98-1.29-4.93-4.29-5.08-4.49-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.6-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.06.92 2.21.07.15.12.33.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.38 1.47.3.15.47.12.65-.07.17-.2.74-.87.94-1.17.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.08.12.08.72-.17 1.41Z" /></svg>
                {submitting ? (ar ? "جارٍ الإرسال…" : "Sending…") : ar ? "أرسلي الطلب عبر واتساب" : "Order on WhatsApp"}
              </button>
            )}
            {allowManual && (
              <button type="button" className={waReady ? "rose-cart-direct" : "atelier-button button-dark"} disabled={!canOrder} onClick={() => void placeOrder("direct")}>
                {ar ? (waReady ? "أو أرسلي الطلب ونتصل بكِ" : "أرسلي الطلب") : waReady ? "Or send the order and we'll call you" : "Send the order"}
              </button>
            )}
            {allowManual && ordersEmail && (
              <button type="button" className="rose-cart-direct" disabled={!canOrder} onClick={() => void placeOrder("email")}>{ar ? "إرسال الطلب بالبريد" : "Send by email"}</button>
            )}
          </div>

          <ul className="rose-pdp-trust rose-cart-trust">
            <li><Icon name="truck" />{ar ? "توصيل لكل البلاد" : "Delivery nationwide"}</li>
            <li><Icon name="cash" />{ar ? "الدفع عند الاستلام" : "Cash on delivery"}</li>
            <li><Icon name="swap" />{ar ? "استبدال سهل" : "Easy exchange"}</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
