// Prices in the store's own currency (admin → الإعدادات → هوية المتجر), not a fixed ₪.
// The admin layout sets the currency once the settings load (setStoreCurrency).

import { tr } from "@/lib/words";
import { adminLang } from "@/lib/lang";
const SIGNS: Record<string, string> = {
  ILS: "₪", USD: "$", EUR: "€", GBP: "£", TRY: "₺",
  JOD: "د.أ", SAR: "ر.س", AED: "د.إ", EGP: "ج.م", KWD: "د.ك", QAR: "ر.ق", BHD: "د.ب", OMR: "ر.ع",
};

/** The currencies a store can pick, with their names. */
export const CURRENCIES: { code: string; label: string }[] = [
  { code: "ILS", label: tr("شيكل (₪)", "Israeli shekel (₪)") },
  { code: "USD", label: tr("دولار أمريكي ($)", "US dollar ($)") },
  { code: "EUR", label: tr("يورو (€)", "Euro (€)") },
  { code: "JOD", label: tr("دينار أردني (د.أ)", "Jordanian dinar (JOD)") },
  { code: "SAR", label: tr("ريال سعودي (ر.س)", "Saudi riyal (SAR)") },
  { code: "AED", label: tr("درهم إماراتي (د.إ)", "UAE dirham (AED)") },
  { code: "EGP", label: tr("جنيه مصري (ج.م)", "Egyptian pound (EGP)") },
  { code: "KWD", label: tr("دينار كويتي (د.ك)", "Kuwaiti dinar (KWD)") },
  { code: "QAR", label: tr("ريال قطري (ر.ق)", "Qatari riyal (QAR)") },
  { code: "GBP", label: tr("جنيه إسترليني (£)", "British pound (£)") },
  { code: "TRY", label: tr("ليرة تركية (₺)", "Turkish lira (₺)") },
];

let current = "ILS";

export function setStoreCurrency(code: string | null | undefined) {
  const c = String(code ?? "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(c)) current = c;
}

export const storeCurrency = () => current;

/** "ILS" → "₪"; an unknown code stays as it is. Arabic signs (د.أ) only in the Arabic admin: JOD in the others. */
export function currencySign(code: string = current): string {
  const c = code.toUpperCase();
  const sign = SIGNS[c] ?? c;
  return /[؀-ۿ]/.test(sign) && adminLang() !== "ar" ? c : sign;
}

/** "₪189", "$12.50", "189 د.أ" (Arabic signs go after the number). */
export function money(n: number | null | undefined, code: string = current): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const num = n % 1 === 0 ? String(n) : n.toFixed(2);
  const sign = currencySign(code);
  // A word (د.أ) goes after the number; a code (JOD) before it with a space; a symbol (₪) right before.
  return /[؀-ۿ]/.test(sign) ? `${num} ${sign}` : /^[A-Z]{3}$/.test(sign) ? `${sign} ${num}` : `${sign}${num}`;
}
