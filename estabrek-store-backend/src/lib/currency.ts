/** The sign people know a currency by ("ILS" → "₪"); an unknown code stays as it is. */
const SIGNS: Record<string, string> = {
  ILS: "₪", USD: "$", EUR: "€", GBP: "£", TRY: "₺",
  JOD: "د.أ", SAR: "ر.س", AED: "د.إ", EGP: "ج.م", KWD: "د.ك", QAR: "ر.ق", BHD: "د.ب", OMR: "ر.ع",
};

export function currencySign(code: string | null | undefined): string {
  const c = String(code ?? "").trim().toUpperCase();
  return SIGNS[c] ?? c;
}
