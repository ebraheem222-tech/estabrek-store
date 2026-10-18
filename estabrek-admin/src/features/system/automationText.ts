// Plain-Arabic texts and small helpers for automations (التلقائيات). Pure (tested).
import type { Action, AutomationRule, AutomationsPage, Trigger } from "../../api/automations.api";
import { formatCurrencyILS } from "../../lib/format";

export const TRIGGER_TEXT: Record<Trigger, { label: string; when: string }> = {
  "order.created": { label: "طلب جديد", when: "لما يجي طلب جديد" },
  "stock.low": { label: "المخزون قليل", when: "لما يقل مقاس عن حد" },
  "video.ready": { label: "فيديو جاهز", when: "لما يجهز تحويل فيديو" },
  "product.viral": { label: "منتج عم ينتشر", when: "لما منتج تزيد شعبيته فجأة" },
  "job.failing": { label: "مهمة عم تفشل", when: "لما مهمة بالخلفية تفشل 3 مرات ورا بعض" },
};

export const ACTION_TEXT: Record<Action, string> = {
  notify: "إشعار باللوحة",
  email: "إيميل",
  whatsapp: "واتساب",
  sms: "SMS",
  pinProduct: "تثبيت بالكاش",
};

export const WORD_TEXT: Record<string, string> = {
  orderId: "رقم الطلب",
  customerName: "الاسم",
  phone: "الرقم",
  total: "المجموع",
  items: "عدد القطع",
  city: "المدينة",
  source: "من وين",
  product: "المنتج",
  color: "اللون",
  size: "المقاس",
  sku: "SKU",
  stock: "الباقي",
  threshold: "الحد",
  video: "الفيديو",
  preset: "الجودة",
  score: "الشعبية",
  before: "قبل ساعة",
  factor: "قديش زادت",
  job: "المهمة",
  failures: "مرات الفشل",
  error: "الخطأ",
};

/** A phone number or an email kept left-to-right inside an Arabic sentence (the "+" stays in front). */
export const ltr = (s: string) => `⁦${s}⁩`;

/** "لما يجي طلب جديد (فوق ₪200) ← واتساب لـ +970…". */
export function ruleSentence(r: Pick<AutomationRule, "trigger" | "conditions" | "action" | "config">, shop: AutomationsPage["shop"]): string {
  const c = r.conditions ?? {};
  let when = TRIGGER_TEXT[r.trigger].when;
  if (r.trigger === "order.created" && c.minTotal) when += ` (${formatCurrencyILS(c.minTotal)} وفوق)`;
  if (r.trigger === "stock.low") when = `لما يصير مقاس ${c.threshold ?? 3} أو أقل`;
  if (r.trigger === "product.viral") when += ` (×${c.factor ?? 3} خلال ساعة)`;
  const to =
    r.config?.to ||
    (r.action === "email" ? shop.email : r.action === "whatsapp" ? shop.whatsapp : r.action === "sms" ? shop.phone : null);
  const what =
    r.action === "pinProduct"
      ? `ثبّته بالكاش ${r.config?.hours ?? 48} ساعة`
      : r.action === "notify"
        ? "إشعار باللوحة"
        : `${ACTION_TEXT[r.action]}${to ? ` لـ ${ltr(to)}` : " (ما في عنوان: ضيفه)"}`;
  return `${when} ← ${what}`;
}

/** Why a message may not arrive, or null. */
export function channelWarning(action: Action, ch: AutomationsPage["channels"]): string | null {
  if (action === "whatsapp") return "الواتساب لسا مش موصول بمزوّد: الرسايل بتنحفظ بـ«الرسايل» بس ما بتوصل للتلفون.";
  if (action === "email" && !ch.email) return "الإيميل مش مضبوط على السيرفر (RESEND_API_KEY و EMAIL_FROM).";
  if (action === "sms" && !ch.sms) return "الـ SMS مش مضبوط على السيرفر (Twilio).";
  if ((action === "email" || action === "sms") && !ch.outboxWorker) return "الرسايل بتنبعت لما يشتغل «إرسال الرسايل» (OUTBOX_WORKER=true)، أو من صفحة الرسايل.";
  return null;
}

const RUN_ERRORS: Array<[RegExp, string]> = [
  [/^NO_EMAIL/, "ما في إيميل: ضيفه للقاعدة أو بالإعدادات (إيميل الطلبات)."],
  [/^NO_PHONE/, "ما في رقم: ضيفه للقاعدة أو بالإعدادات (رقم الواتساب)."],
  [/^NO_PRODUCT/, "ما في منتج بهالحدث."],
  [/^PINNED_FULL/, "في 50 منتج مثبّت بالكاش (الحد)."],
];

/** What a run did, readable: known errors in Arabic, numbers and emails left-to-right. */
export function runDetailText(detail: string | null): string {
  if (!detail) return "";
  const known = RUN_ERRORS.find(([re]) => re.test(detail.replace(/^تجربة: /, "")));
  const text = known ? `${detail.startsWith("تجربة: ") ? "تجربة: " : ""}${known[1]}` : detail;
  return text.replace(/(\+?[0-9][0-9 ()-]{5,}[0-9]|[\w.+-]+@[\w-]+\.[\w.-]+)/g, (m) => ltr(m));
}

export function cooldownText(min: number): string {
  if (!min) return "كل مرة";
  if (min < 60) return `مرة كل ${min} دقيقة لنفس الشي`;
  const h = Math.round(min / 60);
  return h < 24 ? `مرة كل ${h} ساعة لنفس الشي` : `مرة كل ${Math.round(h / 24)} يوم لنفس الشي`;
}

/** A new rule for a trigger: a sensible action and how often. */
export function newRule(trigger: Trigger, conditions: Record<string, number>): Omit<AutomationRule, "id" | "lastFiredAt" | "fired" | "createdAt"> {
  const action: Action = trigger === "order.created" ? "whatsapp" : trigger === "stock.low" ? "email" : trigger === "product.viral" ? "pinProduct" : "notify";
  const cooldownMinutes = trigger === "product.viral" ? 24 * 60 : trigger === "job.failing" ? 6 * 60 : 0;
  return { name: TRIGGER_TEXT[trigger].label, trigger, conditions: { ...conditions }, action, config: action === "pinProduct" ? { hours: 48 } : {}, enabled: true, cooldownMinutes };
}
