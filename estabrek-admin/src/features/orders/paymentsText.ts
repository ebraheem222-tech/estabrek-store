// الدفعات المطلوبة: the page's words, apart from it so they can be tested ("عربي|English|עברית").
import type { PayRow, PayStatus } from "../../api/paymentRequests.api";

type Lang = "ar" | "en" | "he";
const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};

export const PAY_STATUS_NAME: Record<PayStatus, string> = {
  PENDING: "بانتظار الدفع|Waiting|ממתין לתשלום",
  PAID: "اندفعت|Paid|שולם",
  EXPIRED: "خلص وقتها|Expired|פג תוקף",
  CANCELLED: "متسكّرة|Closed|נסגר",
};
export const PAY_STATUS_TONE: Record<PayStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-200",
  PAID: "bg-emerald-500/15 text-emerald-200",
  EXPIRED: "bg-white/10 text-white/70",
  CANCELLED: "bg-white/10 text-white/70",
};

/** An amount in its currency, the way the admin's language writes money. */
export function moneyText(amount: number, currency: string, lang: Lang): string {
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : lang === "he" ? "he-IL" : "en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

const day = (iso: string, lang: Lang) => new Date(iso).toLocaleString(lang === "ar" ? "ar-u-nu-latn" : lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const PROVIDER: Record<string, string> = { stripe: "Stripe", paypal: "PayPal" };

/** When it was asked for, and what became of it. */
export function payWhen(r: Pick<PayRow, "status" | "createdAt" | "paidAt" | "expiresAt" | "provider">, lang: Lang): string {
  const asked = `${part("انطلبت|Asked|התבקש", lang)} ${day(r.createdAt, lang)}`;
  if (r.status === "PAID" && r.paidAt) return `${asked} · ${part("اندفعت|paid|שולם", lang)} ${day(r.paidAt, lang)}${r.provider ? ` (${PROVIDER[r.provider] ?? r.provider})` : ""}`;
  if (r.status === "PENDING" && r.expiresAt) return `${asked} · ${part("الرابط لحد|the link until|הקישור עד", lang)} ${day(r.expiresAt, lang)}`;
  if (r.status === "EXPIRED" && r.expiresAt) return `${asked} · ${part("خلص وقتها|ended|פג", lang)} ${day(r.expiresAt, lang)}`;
  return asked;
}
