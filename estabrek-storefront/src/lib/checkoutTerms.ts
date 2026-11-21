/**
 * The store's terms at checkout (admin → الإعدادات → إدارة الدفع → شروط المتجر): whether the shopper must tick "I agree"
 * before ordering, the link to the terms, and the box's own words in each language. Read from the public settings
 * (site.checkoutTerms) into the site's features (store/siteFeatures.tsx). The server refuses an order without the box
 * ticked when it's asked for (TERMS_REQUIRED), so every way of ordering sends `termsAccepted`. No DOM, no React.
 */
export type CheckoutTerms = { required: boolean; url: string | null; text: Partial<Record<"ar" | "en" | "he", string>> | null };
export const NO_TERMS: CheckoutTerms = { required: false, url: null, text: null };

const SAFE = /^(\/(?!\/)|https?:\/\/)[^\s<>"'`\\]*$/i;
/** The public settings' terms, read with care (anything odd: not asked for). */
export function checkoutTermsOf(raw: unknown): CheckoutTerms {
  if (!raw || typeof raw !== "object") return NO_TERMS;
  const o = raw as Record<string, unknown>;
  const url = typeof o.url === "string" && o.url.length <= 500 && SAFE.test(o.url) ? o.url : null;
  const text = o.text && typeof o.text === "object" ? (Object.fromEntries(Object.entries(o.text as Record<string, unknown>).filter(([k, v]) => ["ar", "en", "he"].includes(k) && typeof v === "string" && v.trim()).map(([k, v]) => [k, String(v).trim().slice(0, 200)])) as CheckoutTerms["text"]) : null;
  return { required: o.required === true, url, text: text && Object.keys(text).length ? text : null };
}

/** The box's words in the page's language: the store's own, else the shop's. */
export const TERMS_WORDS: Record<"ar" | "en" | "he", { agree: string; terms: string; needed: string }> = {
  ar: { agree: "قرأت ووافقت على", terms: "شروط المتجر", needed: "لازم توافقي على شروط المتجر قبل الطلب." },
  en: { agree: "I have read and agree to", terms: "the store's terms", needed: "Please agree to the store's terms before ordering." },
  he: { agree: "קראתי ואני מסכים/ה ל", terms: "תנאי החנות", needed: "יש לאשר את תנאי החנות לפני ההזמנה." },
};
export function termsWords(terms: CheckoutTerms, lang: string) {
  const l = lang === "en" || lang === "he" ? lang : "ar";
  return { ...TERMS_WORDS[l], own: terms.text?.[l] ?? null };
}
