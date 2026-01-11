// src/lib/format.ts
/**
 * Arabic-friendly formatting helpers.
 * Keep these pure and easy to test.
 */

export function formatCurrencyILS(amount: number | string | null | undefined): string {
    const n = typeof amount === "string" ? Number(amount) : amount ?? 0;
    if (!Number.isFinite(n)) return "₪0";
  
    try {
      return new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      // fallback
      return `₪${Math.round(n)}`;
    }
  }
  
  export function formatNumber(n: number | string | null | undefined): string {
    const x = typeof n === "string" ? Number(n) : n ?? 0;
    if (!Number.isFinite(x)) return "0";
    return new Intl.NumberFormat("ar").format(x);
  }
  
  export function formatDateTime(date: string | Date | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return "";
  
    // Arabic + Israel timezone by default
    try {
      return new Intl.DateTimeFormat("ar", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jerusalem",
      }).format(d);
    } catch {
      return d.toLocaleString();
    }
  }
  
  export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return "";
  
    try {
      return new Intl.DateTimeFormat("ar", {
        dateStyle: "medium",
        timeZone: "Asia/Jerusalem",
      }).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }
  
  export function normalizePhoneIL(input: string): string {
    const raw = (input ?? "").trim();
    const digits = raw.replace(/[^\d+]/g, "");
  
    // If already +972...
    if (digits.startsWith("+972")) return digits;
  
    // If starts with 0 (Israeli local), convert to +972
    if (digits.startsWith("0")) {
      return `+972${digits.slice(1)}`;
    }
  
    // If already 972...
    if (digits.startsWith("972")) return `+${digits}`;
  
    // fallback: return as-is
    return digits;
  }
  
  export function truncate(s: string, max = 80): string {
    if (!s) return "";
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + "…";
  }
  
  // Alias for formatCurrencyILS
  export const formatPrice = formatCurrencyILS;
