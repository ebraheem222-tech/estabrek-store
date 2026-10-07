/**
 * One phone number, however it's written: 0599-123-456, +970 599 123 456 and
 * 00970599123456 are the same key (its last 9 digits). Used to bind a coupon to a phone.
 */
export function phoneKey(raw: string | null | undefined): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length > 9 ? d.slice(-9) : d.replace(/^0+/, "");
}
