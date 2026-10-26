"use client";
import { bagItems, rememberPurchase, trackBeginCheckout, trackLead } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { useCart } from "@/store/cart";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { LqipImage } from "@/components/LqipImage";
import { cldUrl } from "@/lib/cloudinary";
import { whatsappLink } from "@/lib/whatsapp";
import { deliveryCities, deliveryFor, hasDeliveryPrices, lowestFee, normalizeDelivery } from "@/lib/delivery";
import { clearBodyScrollLocks } from "@/lib/bodyScrollLock";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { useOptionalAccount } from "@/store/account";
import { rememberRemoved } from "@/lib/razanHistory";
import { StoreMark } from "@/store/storeIdentity";
import { useNames } from "@/store/storeIdentity";
import { tr } from "@/lib/words";
import type { Lang } from "@/lib/i18n";
import { isRtl } from "@/lib/i18n";
import { localizeCartLine } from "@/lib/localize";
import { toneAr } from "@/lib/words";

type Line = {
  variantId: string;
  quantity: number;
  productTitle?: string;
  /** The product's other languages (src/lib/localize.ts). */
  productTranslations?: unknown;
  /** The colour's name in the page's language. */
  colorLabel?: string;
  productSlug?: string | null;
  colorName?: string | null;
  boxLabel?: string | null;
  sizeName?: string | null;
  imageUrl?: string | null;
  imageBlurDataUrl?: string | null;
  unitPrice?: string | number;
  lineSubtotal?: string | number;
  lineTotal?: string | number;
  /** How many can still be ordered (updated backend); absent = no limit known. */
  available?: number;
  /** Shipped (default), downloaded, or a booking with a ticket. */
  fulfillment?: "SHIPPING" | "DIGITAL" | "BOOKING";
  eventStartsAt?: string | null;
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

/** A booking's date in the bag (Israel time). */
function eventDate(iso: string, lang: Lang) {
  try {
    return new Intl.DateTimeFormat(lang, { timeZone: "Asia/Jerusalem", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  } catch {
    return "";
  }
}

function money(value: string | number | null | undefined, currency?: string | null) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency: currency || "ILS" }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

type Props = {
  checkoutMode?: "WHATSAPP" | "STRIPE" | "PAYPAL" | "PAYMENTS" | null;
  whatsappNumber?: string | null;
  ordersEmail?: string | null;
  stripeEnabled?: boolean;
  paypalEnabled?: boolean;
  countryCode?: string | null;
  /** header.delivery from the admin: zones, fees, free-delivery threshold. */
  delivery?: unknown;
};

/**
 * Rose shopping bag: the pieces with their photo, colour and size, the total
 * from the store's own price quote, and one clear way to order. Orders are
 * recorded in the store first, then the WhatsApp message opens ready to send.
 */
export function RoseCart({ checkoutMode = "WHATSAPP", whatsappNumber, ordersEmail, stripeEnabled, paypalEnabled, countryCode, delivery: deliveryRaw }: Props) {
  const { language: lang } = useLanguage();
  const ar = lang === "ar";
  const n = useNames();
  const settings = useStorefrontSettings();
  const { items, setQty, removeItem, clear } = useCart();
  const [rawQuote, setQuote] = useState<Quote | null>(null);
  // Titles and colours in the page's language (the quote itself has the store's own).
  const quote = useMemo(() => (rawQuote ? { ...rawQuote, lines: rawQuote.lines?.map((l) => localizeCartLine(l, lang)) } : null), [rawQuote, lang]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", address: "", note: "" });
  // Signed in: her details (and default address) fill the form, and the order goes into her account.
  const account = useOptionalAccount();
  const signedIn = account?.status === "signedIn";
  useEffect(() => {
    if (!account || account.status !== "signedIn" || !account.user) return;
    const u = account.user;
    let cancelled = false;
    account
      .api<{ addresses: Array<{ fullName: string; phone: string; city: string; address: string; isDefault: boolean }> }>("/customer/me/addresses")
      .then(({ addresses }) => {
        if (cancelled) return;
        const a = addresses.find((x) => x.isDefault) ?? addresses[0];
        setForm((f) => ({
          ...f,
          name: f.name || a?.fullName || u.name || "",
          phone: f.phone || a?.phone || u.phone || "",
          city: f.city || a?.city || "",
          address: f.address || a?.address || "",
          email: f.email || u.email || "",
        }));
      })
      .catch(() => {
        setForm((f) => ({ ...f, name: f.name || u.name || "", phone: f.phone || u.phone || "" }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.status, account?.user?.id]);
  const [otherCity, setOtherCity] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ orderId?: string; via: "whatsapp" | "direct" | "email"; handover?: string } | null>(null);
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
  // Pieces asked in a larger quantity than is left (the store refuses those orders).
  const shortLines = items.filter((i) => { const a = lineBy.get(i.variantId)?.available; return typeof a === "number" && i.quantity > a; });
  const fitToStock = () => {
    for (const i of shortLines) {
      const a = lineBy.get(i.variantId)?.available ?? 0;
      if (a <= 0) removeItem(i.variantId);
      else setQty(i.variantId, a);
    }
    setErr(null);
  };
  // Delivery: the owner's zones and fees (none set → confirmed by phone, as before).
  const delivery = useMemo(() => normalizeDelivery(deliveryRaw), [deliveryRaw]);
  const priced = hasDeliveryPrices(delivery);
  const cityGroups = useMemo(() => deliveryCities(delivery), [delivery]);
  const subtotalNum = Number(quote?.subtotal ?? 0);
  const ship = deliveryFor(form.city, subtotalNum, delivery);
  const freeLeft = delivery.freeOver != null && quote ? Math.max(0, delivery.freeOver - subtotalNum) : null;
  const allFree = delivery.freeOver != null && quote != null && subtotalNum >= delivery.freeOver;
  // Digital files and bookings: nothing to ship (no address, no delivery fee) and an email for the link.
  const qLines = quote?.lines ?? [];
  const noShipping = qLines.length > 0 && qLines.every((l) => l.fulfillment === "DIGITAL" || l.fulfillment === "BOOKING");
  const hasDigital = qLines.some((l) => l.fulfillment === "DIGITAL");
  const hasBooking = qLines.some((l) => l.fulfillment === "BOOKING");
  const handover = ar
    ? hasDigital && hasBooking ? "الملفات والتذاكر" : hasDigital ? "الملفات" : "التذاكر"
    : hasDigital && hasBooking ? "files and tickets" : hasDigital ? "files" : "tickets";
  const feeKnown = noShipping || allFree || (form.city.trim() !== "" && ship.fee != null);
  const feeNow = noShipping || allFree ? 0 : ship.fee ?? 0;
  const grandTotal = quote ? Number(quote.total ?? 0) + (feeKnown ? feeNow : 0) : null;

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
      if (res.status === 409 && data?.error === "EVENT_OVER") throw new Error(eventOverMessage(data));
      if (!res.ok) throw new Error(data?.message || (tr(lang, "تعذّر حساب الحقيبة", "Could not price your bag")));
      setQuote(data);
      return data as Quote;
    } catch (e: any) {
      setErr(e?.message || (tr(lang, "حدث خطأ غير متوقع", "Something went wrong")));
      return null;
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(payload)]);

  const remove = (variantId: string) => {
    // Razan's history: "شلتيها من الحقيبة" (only while the owner has it on).
    const l = lineBy.get(variantId);
    if (l) rememberRemoved({ id: variantId, title: l.productTitle ?? "", slug: l.productSlug, image: l.imageUrl, color: l.colorName, size: l.sizeName });
    const row = list.current?.querySelector<HTMLElement>(`[data-variant="${CSS.escape(variantId)}"]`);
    if (!row) return removeItem(variantId);
    gsap.to(row, { opacity: 0, x: isRtl(lang) ? 40 : -40, height: 0, marginBottom: 0, paddingBlock: 0, duration: 0.35, ease: "power2.in", onComplete: () => removeItem(variantId) });
  };

  const applyCoupon = async (event: FormEvent) => {
    event.preventDefault();
    const code = coupon.trim();
    if (!code) return;
    const data = await refresh(code);
    setCouponMsg(data?.coupon?.code ? (tr(lang, `تم تطبيق الكوبون ${data.coupon.code}`, "Coupon {0} applied", [data.coupon.code])) : (tr(lang, "الكوبون غير صالح", "This coupon isn't valid")));
    if (!data?.coupon?.code) setCoupon("");
  };

  /** The store refused the coupon at order time (e.g. a prize coupon for another phone). */
  const couponMessage = (code: string | undefined) =>
    code === "COUPON_PHONE" ? (tr(lang, "هالكوبون لرقم تاني — اكتبي نفس الرقم اللي ربحتي فيه.", "This coupon belongs to another phone number."))
    : code === "COUPON_USAGE_LIMIT_REACHED" ? (tr(lang, "هالكوبون انستعمل قبل.", "This coupon was already used."))
    : code === "COUPON_EXPIRED" ? (tr(lang, "هالكوبون خلصت مدته.", "This coupon has expired."))
    : code === "COUPON_NOT_FOUND" || code === "COUPON_INACTIVE" ? (tr(lang, "الكوبون مش صالح.", "This coupon isn't valid."))
    : null;
  const eventOverMessage = (data: any) => {
    const t = data?.details?.productTitle ?? "";
    return tr(lang, `موعد «${t}» مرق، فما عاد فينا نحجزه. شيليه من الحقيبة.`, "\"{0}\" has already taken place; please remove it from your bag.", [t]);
  };
  const emailOk = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const nameOk = form.name.trim().length >= 2;
  const phoneOk = form.phone.replace(/\D/g, "").length >= 7;
  const canOrder = !submitting && !loading && items.length > 0 && Boolean(quote?.lines?.length) && shortLines.length === 0;

  /** The store's answer when pieces ran out meanwhile: refresh the bag and say which. */
  const stockMessage = (data: any) => {
    const rows = (data?.details?.lines ?? []) as Array<{ productTitle?: string; colorName?: string | null; sizeName?: string | null; available?: number }>;
    void refresh();
    const names = rows.map((r) => [r.productTitle, r.colorName, r.sizeName].filter(Boolean).join(" · ") + (tr(lang, ` (متوفر ${r.available ?? 0})`, " ({0} left)", [r.available ?? 0]))).join("، ");
    return tr(lang, `بعض القطع لم تعد متوفرة بهذه الكمية: ${names}`, "Some pieces are no longer available in this quantity: {0}", [names]);
  };

  const orderText = (orderId?: string) => {
    const lines = (quote?.lines ?? []).map((l) => {
      const details = [[l.colorLabel ?? l.colorName, l.boxLabel].filter(Boolean).join(" — "), l.sizeName ? `${tr(lang, "مقاس", "size")} ${l.sizeName}` : ""].filter(Boolean).join("، ");
      return `• ${l.productTitle || (tr(lang, "منتج", "Item"))}${details ? ` (${details})` : ""} × ${l.quantity} = ${money(l.lineTotal ?? l.lineSubtotal, currency)}`;
    });
    return [
      tr(lang, `🌸 طلب جديد من ${n.storeName}`, "🌸 New order from {0}", [n.storeName]),
      ...(orderId ? [`${tr(lang, "رقم الطلب", "Order")}: ${orderId}`] : []),
      "",
      ...lines,
      "",
      ...(discount > 0 ? [`${tr(lang, "الخصم", "Discount")}: −${money(discount, currency)}`] : []),
      ...(priced && feeKnown ? [`${tr(lang, "التوصيل", "Delivery")}: ${feeNow === 0 ? (tr(lang, "مجاني", "Free")) : money(feeNow, currency)}`] : []),
      `${tr(lang, "الإجمالي", "Total")}: ${money(grandTotal ?? quote?.total, currency)}`,
      "",
      `${tr(lang, "الاسم", "Name")}: ${form.name.trim()}`,
      `${tr(lang, "الهاتف", "Phone")}: ${form.phone.trim()}`,
      ...(form.email.trim() ? [`${tr(lang, "الإيميل", "Email")}: ${form.email.trim()}`] : []),
      ...(form.city.trim() ? [`${tr(lang, "المدينة", "City")}: ${form.city.trim()}`] : []),
      ...(form.address.trim() ? [`${tr(lang, "العنوان", "Address")}: ${form.address.trim()}`] : []),
      ...(form.note.trim() ? [`${tr(lang, "ملاحظات", "Notes")}: ${form.note.trim()}`] : []),
    ].join("\n");
  };

  async function placeOrder(via: "whatsapp" | "direct" | "email") {
    setTouched(true);
    if (!nameOk || !phoneOk) { setErr(tr(lang, "أكملي الاسم ورقم الهاتف حتى نتواصل معكِ.", "Add your name and phone so we can reach you.")); return; }
    if (!emailOk) { setErr(tr(lang, "الإيميل مش مكتوب صح.", "That email doesn't look right.")); return; }
    setErr(null);
    setSubmitting(true);
    const tracked = bagItems(quote?.lines ?? []);
    const trackedValue = Number(grandTotal ?? quote?.total ?? 0) || 0;
    trackBeginCheckout(tracked, trackedValue, currency ?? undefined);
    // Open the chat window inside the click so pop-up blockers allow it.
    const chat = via === "whatsapp" && waReady ? window.open("", "_blank") : null;
    try {
      const res = await fetch(`${apiBase()}/catalog/order-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...((await account?.authHeaders()) ?? {}) },
        body: JSON.stringify({
          items: payload,
          lang,
          customerName: form.name.trim(),
          phone: form.phone.trim(),
          ...(via === "whatsapp" ? { whatsapp: form.phone.trim() } : {}),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
          city: noShipping ? undefined : form.city.trim() || undefined,
          address: noShipping ? undefined : form.address.trim() || undefined,
          note: form.note.trim() || undefined,
          couponCode: coupon.trim() || undefined,
          source: via === "whatsapp" ? "WHATSAPP_CART" : via === "email" ? "EMAIL_CART" : "DIRECT_CART",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data?.error === "OUT_OF_STOCK") throw new Error(stockMessage(data));
      if (res.status === 409 && data?.error === "EVENT_OVER") throw new Error(eventOverMessage(data));
      if (couponMessage(data?.error)) throw new Error(couponMessage(data?.error)!);
      if (!res.ok) throw new Error(tr(lang, `تعذّر إرسال الطلب (${res.status})`, "Could not send the order ({0})", [res.status]));
      const orderId = data?.id ? String(data.id) : undefined;
      trackLead(tracked, trackedValue, currency ?? undefined, orderId);
      const text = orderText(orderId);
      if (via === "whatsapp") {
        const url = whatsappLink(whatsappNumber, text, countryCode);
        if (url && chat) chat.location.href = url;
        else if (url) window.location.href = url;
      } else if (via === "email" && ordersEmail) {
        window.location.href = `mailto:${ordersEmail}?subject=${encodeURIComponent(orderId ? `طلب جديد ${orderId}` : "طلب جديد")}&body=${encodeURIComponent(text)}`;
      }
      setDone({ orderId, via, handover: hasDigital || hasBooking ? handover : undefined });
      clear();
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      chat?.close();
      setErr(e?.message || (tr(lang, "حدث خطأ", "Something went wrong")));
    } finally {
      setSubmitting(false);
    }
  }

  async function pay(provider: "stripe" | "paypal") {
    setTouched(true);
    if (!nameOk || !phoneOk) { setErr(tr(lang, "أكملي الاسم ورقم الهاتف.", "Add your name and phone.")); return; }
    if (!emailOk) { setErr(tr(lang, "الإيميل مش مكتوب صح.", "That email doesn't look right.")); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`${apiBase()}/storefront/checkout/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...((await account?.authHeaders()) ?? {}) },
        body: JSON.stringify({ provider, items: payload, lang, customerName: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || undefined, address: noShipping ? undefined : [form.city.trim(), form.address.trim()].filter(Boolean).join("، ") || undefined, note: form.note.trim() || undefined, couponCode: coupon.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data?.error === "OUT_OF_STOCK") throw new Error(stockMessage(data));
      if (res.status === 409 && data?.error === "EVENT_OVER") throw new Error(eventOverMessage(data));
      if (couponMessage(data?.error)) throw new Error(couponMessage(data?.error)!);
      if (!res.ok || !data?.redirectUrl) throw new Error(data?.message || (tr(lang, "تعذّر بدء الدفع", "Could not start payment")));
      // The sale is counted on the success page, once the payment is confirmed.
      const tracked = bagItems(quote?.lines ?? []);
      const value = Number(grandTotal ?? quote?.total ?? 0) || 0;
      trackBeginCheckout(tracked, value, currency ?? undefined);
      rememberPurchase(tracked, value, currency ?? undefined);
      window.location.href = data.redirectUrl;
    } catch (e: any) {
      setErr(e?.message || (tr(lang, "حدث خطأ", "Something went wrong")));
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="rose-cart rose-cart-done" aria-live="polite">
        <span className="rose-cart-done-mark"><Icon name="spark" /></span>
        <span className="atelier-eyebrow">{tr(lang, "وصل طلبكِ", "ORDER RECEIVED")}</span>
        <h1>{tr(lang, "شكراً لكِ، طلبكِ عندنا.", "Thank you — we have your order.")}</h1>
        {done.orderId && <p className="rose-cart-order-id">{tr(lang, "رقم الطلب", "Order number")}: <b dir="ltr">{done.orderId}</b></p>}
        <p>
          {done.via === "whatsapp"
            ? tr(lang, "فتحنا لكِ محادثة واتساب فيها تفاصيل الطلب. أرسلي الرسالة لنؤكد معكِ التوصيل.", "We opened a WhatsApp chat with your order details. Send it and we'll confirm delivery with you.")
            : tr(lang, "سنتواصل معكِ قريباً على رقمكِ لتأكيد الطلب والتوصيل.", "We'll contact you soon to confirm your order and delivery.")}
        </p>
        {done.handover ? (
          <p className="rose-cart-handover" data-testid="cart-handover">
            {tr(lang, `لما نأكد الطلب، بيوصلكِ رابط ${done.handover} على الإيميل أو الواتساب.`, "Once we confirm the order, the link to your {0} reaches you by email or WhatsApp.", [done.handover])}
          </p>
        ) : null}
        <Link href="/shop" className="atelier-button button-dark">{tr(lang, "متابعة التسوق", "Keep shopping")}<Icon name="arrow" /></Link>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="rose-cart rose-cart-empty">
        <span className="rose-cart-empty-icon"><Icon name="bag" /></span>
        <span className="atelier-eyebrow">{tr(lang, "حقيبة التسوق", "YOUR BAG")}</span>
        <h1>{tr(lang, "حقيبتكِ فارغة حالياً.", "Your bag is empty.")}</h1>
        <p>{tr(lang, "اكتشفي الجديد، وأضيفي القطع التي تحبينها.", "Discover what's new and add the pieces you love.")}</p>
        <div className="rose-cart-empty-actions">
          <Link href="/shop" className="atelier-button button-dark">{tr(lang, "تسوّقي الآن", "Shop now")}<Icon name="arrow" /></Link>
          <Link href="/wishlist" className="atelier-text-link">{tr(lang, "المفضلة", "Your wishlist")}<Icon name="heart" /></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rose-cart">
      <header className="rose-cart-head">
        <span className="atelier-eyebrow">{tr(lang, "حقيبة التسوق", "YOUR BAG")}</span>
        <h1>{tr(lang, "حقيبتكِ.", "Your bag.")}<span>{ar ? (count === 1 ? "قطعة واحدة" : count === 2 ? "قطعتان" : `${count} قطع`) : lang === "he" ? (count === 1 ? "פריט אחד" : `${count} פריטים`) : `${count} piece${count === 1 ? "" : "s"}`}</span></h1>
        <ol className="rose-cart-steps" aria-label={tr(lang, "خطوات الطلب", "Order steps")}>
          <li data-on="">{tr(lang, "الحقيبة", "Bag")}</li>
          <li data-on={nameOk && phoneOk ? "" : undefined}>{tr(lang, "بياناتكِ", "Your details")}</li>
          <li>{tr(lang, "التأكيد", "Confirm")}</li>
        </ol>
      </header>

      <div className="rose-cart-grid">
        <div>
          <ul ref={list} className="rose-cart-lines">
            {items.map((it) => {
              const l = lineBy.get(it.variantId);
              const href = l?.productSlug ? `/p/${encodeURIComponent(l.productSlug)}` : "/shop";
              const color = [l?.colorLabel ?? l?.colorName, l?.boxLabel].filter(Boolean).join(" — ");
              return (
                <li key={it.variantId} data-variant={it.variantId} className="rose-cart-line">
                  <Link href={href} className="rose-cart-thumb">
                    {l?.imageUrl ? <LqipImage src={cldUrl(l.imageUrl, { w: 240, h: 300, c: "fill", g: "auto" })} alt={l.productTitle ?? ""} fill sizes="110px" blurDataUrl={l.imageBlurDataUrl ?? undefined} className="object-cover" /> : <span className="rose-image-placeholder"><StoreMark /></span>}
                  </Link>
                  <div className="rose-cart-info">
                    <Link href={href} className="rose-cart-title">{l?.productTitle ?? (loading ? "…" : tr(lang, "قطعة", "Item"))}</Link>
                    <div className="rose-cart-chips">
                      {color && color.toLowerCase() !== "default" && <span>{tr(lang, "اللون", "Colour")}: {color}</span>}
                      {l?.sizeName && l.sizeName.toLowerCase() !== "default" && <span>{tr(lang, "المقاس", "Size")}: {l.sizeName}</span>}
                      {l?.fulfillment === "DIGITAL" && <span data-testid="cart-digital">{tr(lang, "⬇️ تنزيل رقمي", "⬇️ Digital download")}</span>}
                      {l?.fulfillment === "BOOKING" && <span data-testid="cart-booking">🎟️ {l.eventStartsAt ? eventDate(l.eventStartsAt, lang) : tr(lang, "حجز", "Booking")}</span>}
                    </div>
                    <span className="rose-cart-unit">{money(l?.unitPrice, currency)}</span>
                    {typeof l?.available === "number" && it.quantity > l.available ? (
                      <span className="rose-cart-stock" role="status" data-testid="cart-stock-note">
                        {l.available <= 0 ? (tr(lang, "نفدت هذه القطعة", "Sold out")) : tr(lang, `متوفر ${l.available} فقط`, "Only {0} left", [l.available])}
                      </span>
                    ) : null}
                  </div>
                  <div className="rose-cart-qty" aria-label={tr(lang, "الكمية", "Quantity")}>
                    <button type="button" aria-label={tr(lang, "زيادة", "More")} onClick={() => setQty(it.variantId, it.quantity + 1)}>+</button>
                    <span aria-live="polite">{it.quantity}</span>
                    <button type="button" aria-label={tr(lang, "إنقاص", "Less")} onClick={() => (it.quantity <= 1 ? remove(it.variantId) : setQty(it.variantId, it.quantity - 1))}>−</button>
                  </div>
                  <div className="rose-cart-line-end">
                    <strong>{money(l?.lineTotal ?? l?.lineSubtotal, currency)}</strong>
                    <button type="button" className="rose-cart-remove" onClick={() => remove(it.variantId)} aria-label={`${tr(lang, "إزالة", "Remove")} ${l?.productTitle ?? ""}`}>
                      {tr(lang, "إزالة", "Remove")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="rose-cart-under">
            <Link href="/shop" className="atelier-text-link">{tr(lang, "متابعة التسوق", "Keep shopping")}<Icon name="arrow" /></Link>
            <button type="button" className="rose-cart-clear" onClick={() => clear()}>{tr(lang, "إفراغ الحقيبة", "Empty the bag")}</button>
          </div>
        </div>

        <aside className="rose-cart-summary" aria-label={tr(lang, "ملخص الطلب", "Order summary")}>
          <h2>{tr(lang, "ملخص الطلب", "Order summary")}</h2>
          <dl>
            <div><dt>{tr(lang, "المجموع الفرعي", "Subtotal")}</dt><dd>{loading && !quote ? "…" : money(quote?.subtotal, currency)}</dd></div>
            {discount > 0 && <div className="discount"><dt>{tr(lang, "الخصم", "Discount")}{quote?.coupon?.code ? ` (${quote.coupon.code})` : ""}</dt><dd>−{money(discount, currency)}</dd></div>}
            <div data-testid="cart-delivery">
              <dt>{tr(lang, "التوصيل", "Delivery")}{priced && ship.zone && !allFree ? <small> ({ship.zone.name})</small> : null}</dt>
              <dd className={feeKnown && feeNow > 0 ? undefined : "muted"}>
                {noShipping ? (tr(lang, "ما في توصيل", "Nothing to ship"))
                  : !priced ? (tr(lang, "نؤكده معكِ", "Confirmed with you"))
                  : allFree || (feeKnown && feeNow === 0) ? <b className="rose-cart-free">{tr(lang, "مجاني", "Free")}</b>
                  : feeKnown ? money(feeNow, currency)
                  : form.city.trim() ? (tr(lang, "نؤكده معكِ", "Confirmed with you"))
                  : lowestFee(delivery) != null ? (tr(lang, `من ${money(lowestFee(delivery), currency)} · اختاري المدينة`, "From {0} · pick your city", [money(lowestFee(delivery), currency)]))
                  : (tr(lang, "اختاري المدينة", "Pick your city"))}
              </dd>
            </div>
            <div className="total"><dt>{tr(lang, "الإجمالي", "Total")}</dt><dd data-testid="cart-total">{loading && !quote ? "…" : money(grandTotal ?? quote?.total, currency)}</dd></div>
          </dl>
          {priced && !noShipping && freeLeft != null && freeLeft > 0 && (
            <p className="rose-cart-free-note" data-testid="cart-free-note">
              {ar ? <>{toneAr("أضيفي")} بـ<b>{money(freeLeft, currency)}</b> فقط ويصير التوصيل مجاناً</> : lang === "he" ? <>עוד <b>{money(freeLeft, currency)}</b> והמשלוח בחינם</> : <>Add <b>{money(freeLeft, currency)}</b> more for free delivery</>}
              <span className="rose-cart-free-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (subtotalNum / (delivery.freeOver || 1)) * 100)}%` }} /></span>
            </p>
          )}

          {couponOpen ? (
            <form className="rose-cart-coupon" onSubmit={applyCoupon}>
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={tr(lang, "رمز الكوبون", "Coupon code")} aria-label={tr(lang, "رمز الكوبون", "Coupon code")} dir="ltr" />
              <button type="submit" disabled={loading}>{tr(lang, "تطبيق", "Apply")}</button>
            </form>
          ) : (
            <button type="button" className="rose-cart-coupon-toggle" onClick={() => setCouponOpen(true)}>{tr(lang, "عندكِ كوبون خصم؟", "Have a coupon?")}</button>
          )}
          {couponMsg && <p className="rose-cart-note" role="status">{couponMsg}</p>}

          <div className="rose-cart-form">
            <h3>{noShipping ? (tr(lang, "بياناتكِ", "Your details")) : tr(lang, "بياناتكِ للتوصيل", "Your delivery details")}</h3>
            {signedIn ? (
              <p className="rose-cart-account" data-testid="cart-signed-in">{tr(lang, `الطلب رح ينحفظ بحسابكِ (${account?.user?.email}).`, "This order will be saved to your account ({0}).", [account?.user?.email])}</p>
            ) : account?.status === "guest" ? (
              <p className="rose-cart-account"><Link href="/account?next=/cart">{tr(lang, "عندكِ حساب؟ سجّلي دخول لتتابعي طلباتكِ", "Have an account? Sign in to follow your orders")}</Link></p>
            ) : null}
            <label className={touched && !nameOk ? "invalid" : undefined}>
              <span>{tr(lang, "الاسم", "Name")} *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" required />
            </label>
            <label className={touched && !phoneOk ? "invalid" : undefined}>
              <span>{tr(lang, "رقم الهاتف", "Phone")} *</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" autoComplete="tel" dir="ltr" required />
            </label>
            {hasDigital || hasBooking ? (
              <label className={touched && !emailOk ? "invalid" : undefined}>
                <span>{tr(lang, "الإيميل", "Email")}</span>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" autoComplete="email" dir="ltr" data-testid="cart-email" />
                <small className="rose-cart-hint">{tr(lang, `عليه بيوصلكِ رابط ${handover} (اختياري — بنبعته كمان بالواتساب).`, "Where we send your {0} link (optional — we also send it on WhatsApp).", [handover])}</small>
              </label>
            ) : null}
            {noShipping ? null : priced && cityGroups.some((g) => g.cities.length) ? (
              <label>
                <span>{tr(lang, "المدينة", "City")}</span>
                {!otherCity ? (
                  <select
                    value={form.city}
                    onChange={(e) => { if (e.target.value === "__other") { setOtherCity(true); setForm({ ...form, city: "" }); } else setForm({ ...form, city: e.target.value }); }}
                    aria-label={tr(lang, "المدينة", "City")}
                    data-testid="cart-city"
                  >
                    <option value="">{tr(lang, "اختاري مدينتكِ", "Choose your city")}</option>
                    {cityGroups.filter((g) => g.cities.length).map((g) => (
                      <optgroup key={g.zone} label={`${g.zone} — ${g.fee === 0 ? (tr(lang, "مجاني", "free")) : money(g.fee, currency)}`}>
                        {g.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                    <option value="__other">{tr(lang, "مدينة أخرى…", "Another city…")}</option>
                  </select>
                ) : (
                  <span className="rose-cart-city-other">
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" placeholder={tr(lang, "اكتبي اسم المدينة", "Type your city")} autoFocus />
                    <button type="button" onClick={() => { setOtherCity(false); setForm({ ...form, city: "" }); }}>{tr(lang, "القائمة", "List")}</button>
                  </span>
                )}
              </label>
            ) : priced ? (
              <label>
                <span>{tr(lang, "المدينة", "City")}</span>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" />
              </label>
            ) : null}
            {noShipping ? null : <label>
              <span>{tr(lang, "العنوان", "Address")}</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} autoComplete="street-address" placeholder={priced ? (tr(lang, "الحي، الشارع، رقم البيت", "Area, street, house")) : tr(lang, "المدينة، الحي، الشارع", "City, area, street")} />
            </label>}
            <label>
              <span>{tr(lang, "ملاحظات", "Notes")}</span>
              <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={noShipping ? (tr(lang, "أي تفصيلة بتحبي نعرفها", "Anything we should know")) : tr(lang, "وقت مناسب للتوصيل، أو أي تفصيلة", "A good delivery time, or any detail")} />
            </label>
          </div>

          {shortLines.length > 0 && (
            <div className="rose-cart-short" role="alert" data-testid="cart-short">
              <p>{tr(lang, "بعض القطع أقل من الكمية في حقيبتكِ.", "Some pieces have fewer left than in your bag.")}</p>
              <button type="button" onClick={fitToStock}>{tr(lang, "تعديل للكمية المتوفرة", "Fit to what's left")}</button>
            </div>
          )}
          {err && <p className="rose-cart-error" role="alert">{err}</p>}

          <div className="rose-cart-actions">
            {wantsStripe && <button type="button" className="atelier-button button-dark" disabled={!canOrder} onClick={() => void pay("stripe")}>{tr(lang, "الدفع بالبطاقة", "Pay by card")}<Icon name="arrow" /></button>}
            {wantsPaypal && <button type="button" className="atelier-button button-dark" disabled={!canOrder} onClick={() => void pay("paypal")}>{tr(lang, "الدفع عبر PayPal", "Pay with PayPal")}<Icon name="arrow" /></button>}
            {allowManual && waReady && (
              <button type="button" className="atelier-button rose-cart-wa" disabled={!canOrder} onClick={() => void placeOrder("whatsapp")}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12.05 2a9.9 9.9 0 0 0-8.5 14.95L2 22l5.2-1.5A9.9 9.9 0 1 0 12.05 2Zm5.8 14.1c-.25.7-1.45 1.33-2 1.4-.5.08-1.15.11-1.85-.12-.43-.13-.98-.32-1.69-.62-2.98-1.29-4.93-4.29-5.08-4.49-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.6-.37.79-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.06.92 2.21.07.15.12.33.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.77 1.27 1.65 2.05 1.13 1.01 2.09 1.32 2.38 1.47.3.15.47.12.65-.07.17-.2.74-.87.94-1.17.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.08.12.08.72-.17 1.41Z" /></svg>
                {submitting ? (tr(lang, "جارٍ الإرسال…", "Sending…")) : tr(lang, "أرسلي الطلب عبر واتساب", "Order on WhatsApp")}
              </button>
            )}
            {allowManual && (
              <button type="button" className={waReady ? "rose-cart-direct" : "atelier-button button-dark"} disabled={!canOrder} onClick={() => void placeOrder("direct")}>
                {waReady ? tr(lang, "أو أرسلي الطلب ونتصل بكِ", "Or send the order and we'll call you") : tr(lang, "أرسلي الطلب", "Send the order")}
              </button>
            )}
            {allowManual && ordersEmail && (
              <button type="button" className="rose-cart-direct" disabled={!canOrder} onClick={() => void placeOrder("email")}>{tr(lang, "إرسال الطلب بالبريد", "Send by email")}</button>
            )}
          </div>

          {noShipping ? null : (
            <ul className="rose-pdp-trust rose-cart-trust">
              <li><Icon name="truck" />{tr(lang, "توصيل لكل البلاد", "Delivery nationwide")}</li>
              <li><Icon name="cash" />{tr(lang, "الدفع عند الاستلام", "Cash on delivery")}</li>
              <li><Icon name="swap" />{tr(lang, "استبدال سهل", "Easy exchange")}</li>
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
