// src/lib/orders.ts
// Everything the orders screens share: Arabic status names, the usual next step,
// WhatsApp links and ready messages, delivery fees by city, and order money maths.

export type OrderStatus = "NEW" | "CONTACTED" | "ACCEPTED" | "REJECTED" | "SHIPPED" | "CLOSED" | "CANCELED" | "REFUNDED";

export const ORDER_STATUSES: OrderStatus[] = ["NEW", "CONTACTED", "ACCEPTED", "SHIPPED", "CLOSED", "REJECTED", "CANCELED", "REFUNDED"];

/** What each status means for this shop (WhatsApp + cash on delivery). */
export const STATUS_INFO: Record<OrderStatus, { label: string; hint: string; tone: "new" | "work" | "ok" | "ship" | "done" | "bad" | "muted" }> = {
  NEW: { label: "جديد", hint: "وصل الطلب ولم نتواصل بعد", tone: "new" },
  CONTACTED: { label: "تم التواصل", hint: "تواصلنا مع الزبونة وننتظر التأكيد", tone: "work" },
  ACCEPTED: { label: "مؤكَّد", hint: "تأكد الطلب — تُخصم الكمية من المخزون", tone: "ok" },
  SHIPPED: { label: "خرج للتوصيل", hint: "الطلب مع شركة التوصيل", tone: "ship" },
  CLOSED: { label: "تم التسليم", hint: "وصل الطلب للزبونة", tone: "done" },
  REJECTED: { label: "مرفوض", hint: "لم نقبل الطلب", tone: "bad" },
  CANCELED: { label: "ملغي", hint: "ألغت الزبونة أو ألغينا الطلب — ترجع الكمية للمخزون", tone: "bad" },
  REFUNDED: { label: "مسترجع", hint: "رجعت القطعة ورجع المبلغ — ترجع الكمية للمخزون", tone: "muted" },
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
  CONTACTED: "تواصلت معها",
  ACCEPTED: "تأكيد الطلب",
  SHIPPED: "خرج للتوصيل",
  CLOSED: "تم التسليم",
};

export const SOURCE_LABEL: Record<string, string> = {
  WHATSAPP_CART: "واتساب",
  DIRECT_CART: "طلب مباشر",
  EMAIL_CART: "إيميل",
  STRIPE: "بطاقة",
  PAYPAL: "PayPal",
  MANUAL: "يدوي",
  RAZAN_HELP: "بمساعدة رزان 🌸",
};

export function sourceLabel(s?: string | null) {
  if (!s) return "المتجر";
  return SOURCE_LABEL[s] ?? (s === "test" ? "تجربة" : s);
}

export function isPaid(o: { paymentStatus?: string | null }) {
  return ["PAID", "paid", "COLLECTED"].includes(String(o.paymentStatus ?? ""));
}

/* ------------------------------------------------------------------ money */

export const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function shekel(v: unknown) {
  const n = num(v);
  return `₪${Number.isInteger(n) ? n : n.toFixed(2)}`;
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
  items?: Array<{ productTitle: string; quantity: number; unitPrice?: number | string; lineSubtotal?: number | string; lineTotal?: number | string; colorName?: string | null; sizeName?: string | null; imageUrl?: string | null; sku?: string | null }>;
  variant?: { item?: { colorName?: string | null; product?: { title?: string } | null; images?: Array<{ url: string }> } | null; size?: { name?: string } | null; sku?: string } | null;
};

/** Lines to show, also for old orders saved before multi-item carts. */
export function orderLines(o: OrderLike) {
  if (o.items?.length) return o.items;
  return [{
    productTitle: o.variant?.item?.product?.title ?? "قطعة",
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
  { kind: "confirm", label: "تأكيد الطلب" },
  { kind: "accepted", label: "الطلب مؤكد" },
  { kind: "shipped", label: "خرج للتوصيل" },
  { kind: "delivered", label: "شكراً بعد التسليم" },
  { kind: "unavailable", label: "قطعة غير متوفرة" },
  { kind: "canceled", label: "إلغاء الطلب" },
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

export function buildMessage(kind: MessageKind, o: OrderLike, opts: { storeName?: string; deliveryFee?: number | null } = {}) {
  const store = opts.storeName || "استبرق";
  const name = o.customerName?.trim().split(/\s+/)[0] || "";
  const hi = name ? `أهلاً ${name} 🌸` : "أهلاً 🌸";
  const no = `#${shortOrderId(o.id)}`;
  const lines = orderLines(o).map((l) => `• ${l.productTitle}${[l.colorName, l.sizeName && `مقاس ${l.sizeName}`].filter(Boolean).length ? ` (${[l.colorName, l.sizeName && `مقاس ${l.sizeName}`].filter(Boolean).join("، ")})` : ""} × ${l.quantity}`);
  const total = orderTotal(o);
  const fee = opts.deliveryFee ?? null;
  const money = fee != null && fee > 0
    ? `المجموع: ${shekel(total)} + توصيل ${shekel(fee)} = ${shekel(total + fee)}`
    : fee === 0 ? `المجموع: ${shekel(total)} (التوصيل مجاني)` : `المجموع: ${shekel(total)}`;
  const where = [o.city, o.address].filter(Boolean).join("، ");
  switch (kind) {
    case "confirm":
      return [hi, `وصلنا طلبكِ رقم ${no} من ${store}:`, ...lines, money, where ? `التوصيل إلى: ${where}` : "نحتاج عنوان التوصيل بالتفصيل لو سمحتِ.", "", "نأكد الطلب؟ ✅"].join("\n");
    case "contacted":
    case "accepted":
      return [hi, `تم تأكيد طلبكِ ${no} ✨`, money, "الدفع عند الاستلام. نبلغكِ عند خروج الطلب للتوصيل."].join("\n");
    case "shipped":
      return [hi, `طلبكِ ${no} خرج للتوصيل 🚚`, fee != null ? `المبلغ عند الاستلام: ${shekel(total + (fee ?? 0))}` : `المبلغ عند الاستلام: ${shekel(total)}`, "إذا في أي سؤال نحن هنا."].join("\n");
    case "delivered":
      return [hi, `شكراً لثقتكِ بـ${store} 💗 نتمنى تكون القطعة عجبتكِ.`, "يسعدنا نشوف صورتكِ فيها أو رأيكِ."].join("\n");
    case "unavailable":
      return [hi, `بخصوص طلبكِ ${no}: للأسف إحدى القطع غير متوفرة حالياً بهذا اللون/المقاس.`, "بتحبي نقترح عليكِ بديل قريب؟"].join("\n");
    case "canceled":
      return [hi, `تم إلغاء طلبكِ ${no}. إذا حابة نرجع نرتبه بأي وقت، احكيلنا 🌸`].join("\n");
    default:
      return [hi, `شكراً لطلبكِ من ${store} 💗`].join("\n");
  }
}

/* ------------------------------------------------------------------ dates */

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "الآن";
  if (m < 60) return m === 1 ? "قبل دقيقة" : m === 2 ? "قبل دقيقتين" : m <= 10 ? `قبل ${m} دقائق` : `قبل ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "قبل ساعة" : h === 2 ? "قبل ساعتين" : h <= 10 ? `قبل ${h} ساعات` : `قبل ${h} ساعة`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? "أمس" : d === 2 ? "قبل يومين" : d <= 10 ? `قبل ${d} أيام` : `قبل ${d} يوماً`;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeZone: "Asia/Jerusalem" }).format(new Date(iso));
}

export function dateTime(iso?: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(new Date(iso));
}

/** Start of a day in Israel time, as an ISO string the API understands. */
export function dayStart(offsetDays = 0) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now.getTime() + offsetDays * 86400000));
  return parts; // YYYY-MM-DD
}
