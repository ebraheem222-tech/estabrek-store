// src/lib/orders.ts
// Everything the orders screens share: status names, the usual next step,
// WhatsApp links and ready messages (in the order's language), delivery fees by
// city, and order money maths.

import { money } from "./money";
import type { Audience } from "./storeIdentity";
import { adminLang, isLang, loc, type Lang } from "@/lib/lang";
import { tr } from "@/lib/words";

export type OrderStatus = "NEW" | "CONTACTED" | "ACCEPTED" | "REJECTED" | "SHIPPED" | "CLOSED" | "CANCELED" | "REFUNDED";

export const ORDER_STATUSES: OrderStatus[] = ["NEW", "CONTACTED", "ACCEPTED", "SHIPPED", "CLOSED", "REJECTED", "CANCELED", "REFUNDED"];

/** What each status means for this shop (WhatsApp + cash on delivery). */
export const STATUS_INFO: Record<OrderStatus, { label: string; hint: string; tone: "new" | "work" | "ok" | "ship" | "done" | "bad" | "muted" }> = {
  NEW: { label: tr("جديد", "New"), hint: tr("وصل الطلب ولم نتواصل بعد", "The order came in; no contact yet"), tone: "new" },
  CONTACTED: { label: tr("تم التواصل", "Contacted"), hint: tr("تواصلنا مع الزبون وننتظر التأكيد", "We contacted the customer and are waiting to confirm"), tone: "work" },
  ACCEPTED: { label: tr("مؤكَّد", "Confirmed"), hint: tr("تأكد الطلب — تُخصم الكمية من المخزون", "The order is confirmed — the quantity comes off stock"), tone: "ok" },
  SHIPPED: { label: tr("خرج للتوصيل", "Out for delivery"), hint: tr("الطلب مع شركة التوصيل", "The order is with the delivery company"), tone: "ship" },
  CLOSED: { label: tr("تم التسليم", "Delivered"), hint: tr("وصل الطلب للزبون", "The customer received the order"), tone: "done" },
  REJECTED: { label: tr("مرفوض", "Rejected"), hint: tr("لم نقبل الطلب", "We didn't accept the order"), tone: "bad" },
  CANCELED: { label: tr("ملغي", "Cancelled"), hint: tr("ألغى الزبون أو ألغينا الطلب — ترجع الكمية للمخزون", "The customer or we cancelled the order — the quantity goes back to stock"), tone: "bad" },
  REFUNDED: { label: tr("مسترجع", "Refunded"), hint: tr("رجعت القطعة ورجع المبلغ — ترجع الكمية للمخزون", "The item came back and the money was returned — the quantity goes back to stock"), tone: "muted" },
};

export const TONE_CLASS: Record<(typeof STATUS_INFO)[OrderStatus]["tone"], string> = {
  new: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  work: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  ok: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  ship: "bg-accent-500/15 text-accent-200 border-accent-400/30",
  done: "bg-white/[0.07] text-white/75 border-white/15",
  bad: "bg-red-500/12 text-red-300 border-red-400/30",
  muted: "bg-white/[0.05] text-white/55 border-white/10",
};

export function statusLabel(s?: string | null) {
  return (s && STATUS_INFO[s as OrderStatus]?.label) || s || "—";
}

/** The happy path: the one button the owner usually needs next. */
export function nextStep(s?: string | null): OrderStatus | null {
  switch (s) {
    case "NEW": return "CONTACTED";
    case "CONTACTED": return "ACCEPTED";
    case "ACCEPTED": return "SHIPPED";
    case "SHIPPED": return "CLOSED";
    default: return null;
  }
}

export const NEXT_STEP_LABEL: Partial<Record<OrderStatus, string>> = {
  CONTACTED: tr("تم التواصل", "Contacted"),
  ACCEPTED: tr("تأكيد الطلب", "Confirm order"),
  SHIPPED: tr("خرج للتوصيل", "Out for delivery"),
  CLOSED: tr("تم التسليم", "Delivered"),
};

export const SOURCE_LABEL: Record<string, string> = {
  WHATSAPP_CART: tr("واتساب", "WhatsApp"),
  DIRECT_CART: tr("طلب مباشر", "Direct order"),
  EMAIL_CART: tr("إيميل", "Email"),
  STRIPE: tr("بطاقة", "Card"),
  PAYPAL: "PayPal",
  MANUAL: tr("يدوي", "Manual"),
  RAZAN_HELP: tr("بمساعدة رزان 🌸", "With Razan's help 🌸"),
};

export function sourceLabel(s?: string | null) {
  if (!s) return tr("المتجر", "The store");
  return SOURCE_LABEL[s] ?? (s === "test" ? tr("تجربة", "Test") : s);
}

export function isPaid(o: { paymentStatus?: string | null }) {
  return ["PAID", "paid", "COLLECTED"].includes(String(o.paymentStatus ?? ""));
}

/* ------------------------------------------------------------------ money */

export const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** "₪189" in the store's currency (lib/money.ts). */
export function moneyText(v: unknown) {
  return money(num(v));
}

export type OrderLike = {
  id: string;
  customerName: string;
  phone: string;
  whatsapp?: string | null;
  city?: string | null;
  address?: string | null;
  note?: string | null;
  status: string;
  source?: string | null;
  subtotal?: number | string | null;
  discountAmount?: number | string | null;
  total?: number | string | null;
  quantity?: number;
  unitPrice?: number | string | null;
  couponCode?: string | null;
  paymentStatus?: string | null;
  paymentProvider?: string | null;
  createdAt: string;
  /** The language the shopper ordered in (ar/en/he); old orders have none. */
  locale?: string | null;
  items?: Array<{ productTitle: string; quantity: number; unitPrice?: number | string; lineSubtotal?: number | string; lineTotal?: number | string; colorName?: string | null; sizeName?: string | null; imageUrl?: string | null; sku?: string | null }>;
  variant?: { item?: { colorName?: string | null; product?: { title?: string } | null; images?: Array<{ url: string }> } | null; size?: { name?: string } | null; sku?: string } | null;
};

/** Lines to show, also for old orders saved before multi-item carts. */
export function orderLines(o: OrderLike) {
  if (o.items?.length) return o.items;
  return [{
    productTitle: o.variant?.item?.product?.title ?? tr("قطعة", "Item"),
    quantity: o.quantity ?? 1,
    unitPrice: o.unitPrice ?? undefined,
    lineSubtotal: o.subtotal ?? undefined,
    colorName: o.variant?.item?.colorName ?? null,
    sizeName: o.variant?.size?.name ?? null,
    imageUrl: o.variant?.item?.images?.[0]?.url ?? null,
    sku: o.variant?.sku ?? null,
  }];
}

export function itemsCount(o: OrderLike) {
  return orderLines(o).reduce((s, l) => s + (l.quantity ?? 0), 0);
}

export function orderTotal(o: OrderLike) {
  if (o.total != null && o.total !== "") return num(o.total);
  return Math.max(0, num(o.subtotal) - num(o.discountAmount));
}

/** Short, readable order number for chats and labels. */
export function shortOrderId(id: string) {
  return id.slice(-6).toUpperCase();
}

/* --------------------------------------------------------------- delivery */

export type DeliveryZone = { id: string; name: string; fee: number; cities: string[] };
export type DeliverySettings = { zones: DeliveryZone[]; defaultFee: number | null; freeOver: number | null };

export const EMPTY_DELIVERY: DeliverySettings = { zones: [], defaultFee: null, freeOver: null };

export function normalizeDelivery(raw: unknown): DeliverySettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const zones = Array.isArray(o.zones) ? o.zones : [];
  return {
    zones: zones
      .map((z, i) => {
        const zz = (z ?? {}) as Record<string, unknown>;
        return {
          id: String(zz.id ?? `z${i}`),
          name: String(zz.name ?? "").trim(),
          fee: num(zz.fee),
          cities: (Array.isArray(zz.cities) ? zz.cities : String(zz.cities ?? "").split(/[,،\n]/)).map((c) => String(c).trim()).filter(Boolean),
        };
      })
      .filter((z) => z.name),
    defaultFee: o.defaultFee == null || o.defaultFee === "" ? null : num(o.defaultFee),
    freeOver: o.freeOver == null || o.freeOver === "" ? null : num(o.freeOver),
  };
}

const norm = (s: string) => s.trim().replace(/^ال/, "").replace(/[أإآ]/g, "ا").replace(/ة$/, "ه").replace(/ى$/, "ي").toLowerCase();

/** Delivery fee for an order's city, from the zones the owner set. */
export function deliveryFor(city: string | null | undefined, subtotal: number, d: DeliverySettings): { fee: number | null; zone: DeliveryZone | null; free: boolean } {
  const c = norm(String(city ?? ""));
  const zone = c ? d.zones.find((z) => z.cities.some((x) => { const n = norm(x); return n && (c === n || c.includes(n) || n.includes(c)); })) ?? null : null;
  const base = zone ? zone.fee : d.defaultFee;
  if (base == null) return { fee: null, zone, free: false };
  if (d.freeOver != null && subtotal >= d.freeOver) return { fee: 0, zone, free: true };
  return { fee: base, zone, free: false };
}

/* --------------------------------------------------------------- WhatsApp */

const CALLING: Record<string, string> = { IL: "972", PS: "970", JO: "962" };

/** wa.me needs international digits: 054… → 97254…, 059… (PS) → 97059… */
export function waDigits(raw?: string | null, country = "IL") {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) {
    // 059/056 are Palestinian mobile prefixes.
    const cc = /^05[69]/.test(d) ? "970" : CALLING[country] ?? "972";
    d = cc + d.slice(1);
  }
  return d;
}

export function waLink(phone: string | null | undefined, text?: string) {
  const to = waDigits(phone);
  if (!to) return null;
  return `https://wa.me/${to}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export type MessageKind = "confirm" | "contacted" | "accepted" | "shipped" | "delivered" | "unavailable" | "canceled" | "thanks";

export const MESSAGE_KINDS: Array<{ kind: MessageKind; label: string }> = [
  { kind: "confirm", label: tr("تأكيد الطلب", "Confirm order") },
  { kind: "accepted", label: tr("الطلب مؤكد", "Order confirmed") },
  { kind: "shipped", label: tr("خرج للتوصيل", "Out for delivery") },
  { kind: "delivered", label: tr("شكراً بعد التسليم", "Thanks after delivery") },
  { kind: "unavailable", label: tr("قطعة غير متوفرة", "Item not available") },
  { kind: "canceled", label: tr("إلغاء الطلب", "Cancel order") },
];

/** The message that fits the order's current status. */
export function messageForStatus(s?: string | null): MessageKind {
  switch (s) {
    case "NEW":
    case "CONTACTED": return "confirm";
    case "ACCEPTED": return "accepted";
    case "SHIPPED": return "shipped";
    case "CLOSED": return "delivered";
    case "CANCELED":
    case "REJECTED": return "canceled";
    default: return "thanks";
  }
}

/** The language a message to this shopper is written in: the one they ordered in. */
export function messageLang(o: { locale?: string | null }): Lang {
  return isLang(o.locale) ? o.locale : adminLang();
}

/**
 * The WhatsApp message for an order, from the store (its name) in its voice and in the
 * shopper's language: in Arabic a shop for women speaks to her («طلبكِ»), any other to
 * everyone («طلبك»). Admin → هوية المتجر.
 */
export function buildMessage(kind: MessageKind, o: OrderLike, opts: { storeName?: string; deliveryFee?: number | null; audience?: Audience; lang?: Lang } = {}) {
  const lang = opts.lang ?? messageLang(o);
  if (lang !== "ar") return buildMessageIn(lang, kind, o, opts);
  const store = opts.storeName || "المتجر";
  const her = (opts.audience ?? "women") === "women";
  const v = (women: string, others: string) => (her ? women : others);
  const name = o.customerName?.trim().split(/\s+/)[0] || "";
  const hi = name ? `أهلاً ${name} ${v("🌸", "👋")}` : `أهلاً ${v("🌸", "👋")}`;
  const no = `#${shortOrderId(o.id)}`;
  const lines = orderLines(o).map((l) => `• ${l.productTitle}${[l.colorName, l.sizeName && `مقاس ${l.sizeName}`].filter(Boolean).length ? ` (${[l.colorName, l.sizeName && `مقاس ${l.sizeName}`].filter(Boolean).join("، ")})` : ""} × ${l.quantity}`);
  const total = orderTotal(o);
  const fee = opts.deliveryFee ?? null;
  const money = fee != null && fee > 0
    ? `المجموع: ${moneyText(total)} + توصيل ${moneyText(fee)} = ${moneyText(total + fee)}`
    : fee === 0 ? `المجموع: ${moneyText(total)} (التوصيل مجاني)` : `المجموع: ${moneyText(total)}`;
  const where = [o.city, o.address].filter(Boolean).join("، ");
  switch (kind) {
    case "confirm":
      return [hi, `وصلنا ${v("طلبكِ", "طلبك")} رقم ${no} من ${store}:`, ...lines, money, where ? `التوصيل إلى: ${where}` : v("نحتاج عنوان التوصيل بالتفصيل لو سمحتِ.", "نحتاج عنوان التوصيل بالتفصيل لو سمحت."), "", "نأكد الطلب؟ ✅"].join("\n");
    case "contacted":
    case "accepted":
      return [hi, `تم تأكيد ${v("طلبكِ", "طلبك")} ${no} ✨`, money, v("الدفع عند الاستلام. نبلغكِ عند خروج الطلب للتوصيل.", "الدفع عند الاستلام. نبلغك عند خروج الطلب للتوصيل.")].join("\n");
    case "shipped":
      return [hi, `${v("طلبكِ", "طلبك")} ${no} خرج للتوصيل 🚚`, fee != null ? `المبلغ عند الاستلام: ${moneyText(total + (fee ?? 0))}` : `المبلغ عند الاستلام: ${moneyText(total)}`, "إذا في أي سؤال نحن هنا."].join("\n");
    case "delivered":
      return her
        ? [hi, `شكراً لثقتكِ بـ${store} 💗 نتمنى تكون القطعة عجبتكِ.`, "يسعدنا نشوف صورتكِ فيها أو رأيكِ."].join("\n")
        : [hi, `شكراً لثقتك بـ${store} 💙 نتمنى يكون الطلب عجبك.`, "يسعدنا نسمع رأيك."].join("\n");
    case "unavailable":
      return her
        ? [hi, `بخصوص طلبكِ ${no}: للأسف إحدى القطع غير متوفرة حالياً بهذا اللون/المقاس.`, "بتحبي نقترح عليكِ بديل قريب؟"].join("\n")
        : [hi, `بخصوص طلبك ${no}: للأسف أحد المنتجات غير متوفر حالياً بهذا الخيار.`, "بتحب نقترح عليك بديل قريب؟"].join("\n");
    case "canceled":
      return [hi, v(`تم إلغاء طلبكِ ${no}. إذا حابة نرجع نرتبه بأي وقت، احكيلنا 🌸`, `تم إلغاء طلبك ${no}. إذا حابب نرجع نرتبه بأي وقت، احكيلنا.`)].join("\n");
    default:
      return [hi, v(`شكراً لطلبكِ من ${store} 💗`, `شكراً لطلبك من ${store} 💙`)].join("\n");
  }
}

/** The same messages in English and Hebrew (Hebrew kept neutral: no he/she forms). */
function buildMessageIn(lang: "en" | "he", kind: MessageKind, o: OrderLike, opts: { storeName?: string; deliveryFee?: number | null; audience?: Audience }) {
  const en = lang === "en";
  const store = opts.storeName || (en ? "the store" : "החנות");
  const her = (opts.audience ?? "women") === "women";
  const name = o.customerName?.trim().split(/\s+/)[0] || "";
  const hi = `${en ? "Hi" : "היי"}${name ? ` ${name}` : ""} ${her ? "🌸" : "👋"}`;
  const no = `#${shortOrderId(o.id)}`;
  const lines = orderLines(o).map((l) => {
    const opts2 = [l.colorName, l.sizeName && `${en ? "size" : "מידה"} ${l.sizeName}`].filter(Boolean);
    return `• ${l.productTitle}${opts2.length ? ` (${opts2.join(", ")})` : ""} × ${l.quantity}`;
  });
  const total = orderTotal(o);
  const fee = opts.deliveryFee ?? null;
  const sum = en ? "Total" : "סה״כ";
  const money = fee != null && fee > 0
    ? `${sum}: ${moneyText(total)} + ${en ? "delivery" : "משלוח"} ${moneyText(fee)} = ${moneyText(total + fee)}`
    : fee === 0 ? `${sum}: ${moneyText(total)} (${en ? "free delivery" : "משלוח חינם"})` : `${sum}: ${moneyText(total)}`;
  const where = [o.city, o.address].filter(Boolean).join(", ");
  const heart = her ? "💗" : "💙";
  switch (kind) {
    case "confirm":
      return en
        ? [hi, `We received your order ${no} from ${store}:`, ...lines, money, where ? `Delivery to: ${where}` : "We need your full delivery address, please.", "", "Shall we confirm the order? ✅"].join("\n")
        : [hi, `קיבלנו את ההזמנה שלך ${no} מ${store}:`, ...lines, money, where ? `משלוח אל: ${where}` : "נשמח לכתובת מלאה למשלוח, בבקשה.", "", "לאשר את ההזמנה? ✅"].join("\n");
    case "contacted":
    case "accepted":
      return en
        ? [hi, `Your order ${no} is confirmed ✨`, money, "Payment on delivery. We'll let you know when it's out for delivery."].join("\n")
        : [hi, `ההזמנה שלך ${no} אושרה ✨`, money, "התשלום במסירה. נעדכן כשההזמנה יוצאת למשלוח."].join("\n");
    case "shipped": {
      const due = moneyText(total + (fee ?? 0));
      return en
        ? [hi, `Your order ${no} is out for delivery 🚚`, `Amount due on delivery: ${due}`, "Any questions, we're here."].join("\n")
        : [hi, `ההזמנה שלך ${no} יצאה למשלוח 🚚`, `לתשלום במסירה: ${due}`, "לכל שאלה, אנחנו כאן."].join("\n");
    }
    case "delivered":
      return en
        ? [hi, `Thank you for trusting ${store} ${heart} We hope you love it.`, her ? "We'd love to see a photo or hear what you think." : "We'd love to hear what you think."].join("\n")
        : [hi, `תודה על האמון ב${store} ${heart} מקווים שההזמנה מצאה חן.`, her ? "נשמח לראות תמונה או לשמוע מה דעתך." : "נשמח לשמוע מה דעתך."].join("\n");
    case "unavailable":
      return en
        ? [hi, `About your order ${no}: unfortunately one of the items isn't available right now in this option.`, "Would you like us to suggest a close alternative?"].join("\n")
        : [hi, `לגבי ההזמנה שלך ${no}: לצערנו אחד הפריטים לא זמין כרגע באפשרות הזאת.`, "נציע חלופה דומה?"].join("\n");
    case "canceled":
      return en
        ? [hi, `Your order ${no} has been cancelled. If you'd like to arrange it again any time, just tell us${her ? " 🌸" : "."}`].join("\n")
        : [hi, `ההזמנה שלך ${no} בוטלה. אם רוצים לסדר אותה שוב בכל זמן, אפשר לכתוב לנו${her ? " 🌸" : "."}`].join("\n");
    default:
      return [hi, en ? `Thank you for your order from ${store} ${heart}` : `תודה על ההזמנה מ${store} ${heart}`].join("\n");
  }
}

/* ------------------------------------------------------------------ dates */

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return tr("الآن", "just now");
  if (m < 60) return m === 1 ? tr("قبل دقيقة", "1 minute ago") : m === 2 ? tr("قبل دقيقتين", "2 minutes ago") : tr(m <= 10 ? `قبل ${m} دقائق` : `قبل ${m} دقيقة`, "{0} minutes ago", [m]);
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? tr("قبل ساعة", "1 hour ago") : h === 2 ? tr("قبل ساعتين", "2 hours ago") : tr(h <= 10 ? `قبل ${h} ساعات` : `قبل ${h} ساعة`, "{0} hours ago", [h]);
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? tr("أمس", "yesterday") : d === 2 ? tr("قبل يومين", "2 days ago") : tr(d <= 10 ? `قبل ${d} أيام` : `قبل ${d} يوماً`, "{0} days ago", [d]);
  return new Intl.DateTimeFormat(loc("ar-EG-u-nu-latn"), { dateStyle: "medium", timeZone: "Asia/Jerusalem" }).format(new Date(iso));
}

export function dateTime(iso?: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat(loc("ar-EG-u-nu-latn"), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(iso));
}

/** Start of a day in Israel time, as an ISO string the API understands. */
export function dayStart(offsetDays = 0) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now.getTime() + offsetDays * 86400000));
  return parts; // YYYY-MM-DD
}
