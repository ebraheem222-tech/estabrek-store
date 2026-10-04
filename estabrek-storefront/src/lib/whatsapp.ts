/** Country calling codes for numbers saved in local format (leading 0). */
const CALLING_CODES: Record<string, string> = { IL: "972", PS: "970", JO: "962", SA: "966", AE: "971", EG: "20", LB: "961", SY: "963", IQ: "964" };

/**
 * wa.me needs the international number without "+" or a leading 0.
 * "054-420-4029" (IL) → "972544204029"; "+972 54…" → "972544…"; "00972…" → "972…".
 */
export function whatsappDigits(raw?: string | null, countryCode?: string | null): string {
  let digits = String(raw ?? "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = (CALLING_CODES[String(countryCode ?? "IL").toUpperCase()] ?? "972") + digits.slice(1);
  return digits;
}

export function whatsappLink(raw?: string | null, text?: string, countryCode?: string | null): string | null {
  const to = whatsappDigits(raw, countryCode);
  if (!to) return null;
  return `https://wa.me/${to}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
