// Protected products (serial + encrypted, marked copy): words for the product's
// files block, the file types, and an order's serials. Pure (tested).
import type { MarkMode, OrderLicence, ProtectedFile, ProtectedFileType } from "../../../api/protected.api";

export const MODE_LABEL: Record<MarkMode, string> = {
  comment: "سطر ملاحظة جوّا الملف",
  stl: "بعنوان ملف الـ STL",
  package: "جنب الملف (LICENCE.txt)",
};

/** Where the buyer's mark goes in this file, and why when it can't go inside. */
export function placementText(f: Pick<ProtectedFile, "placed" | "why">): { text: string; tone: "good" | "info" } {
  if (f.placed === "inside") return { text: "🏷️ العلامة جوّا الملف", tone: "good" };
  if (f.why === "signed") return { text: "📦 سكربت موقّع: ما منغيّر فيه، العلامة جنبه", tone: "info" };
  if (f.why === "binary") return { text: "📦 مش نص عادي: العلامة جنبه بـ LICENCE.txt", tone: "info" };
  return { text: "📦 العلامة جنبه بـ LICENCE.txt", tone: "info" };
}

/** How the mark looks in a file of this type (for the types list). */
export function markPreview(t: Pick<ProtectedFileType, "mode" | "commentStart" | "commentEnd">) {
  const line = "Licensed copy for order A1B2C3 - personal use only - estb:K7QM2XHPAB";
  if (t.mode === "comment") return [t.commentStart?.trim() || "#", line, t.commentEnd?.trim()].filter(Boolean).join(" ");
  if (t.mode === "stl") return "Estabrek " + line;
  return "LICENCE.txt";
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const hoursWord = (h: number) => (h === 1 ? "ساعة" : h === 2 ? "ساعتين" : h <= 10 ? `${h} ساعات` : `${h} ساعة`);
const daysWord = (d: number) => (d === 1 ? "يوم" : d === 2 ? "يومين" : d <= 10 ? `${d} أيام` : `${d} يوم`);

/** "24 ساعة", "3 أيام": a window length, for the product's settings. */
export function windowLength(hours: number) {
  return hours % 24 === 0 && hours >= 48 ? daysWord(hours / 24) : hoursWord(hours);
}

/** Time left to download: "باقي 5 ساعات", "باقي 20 دقيقة"; null when it's over. */
export function timeLeft(expiresAt: string, now = Date.now()): string | null {
  const ms = new Date(expiresAt).getTime() - now;
  if (!(ms > 0)) return null;
  const min = Math.ceil(ms / 60_000);
  if (min < 60) return `باقي ${min === 1 ? "دقيقة" : min === 2 ? "دقيقتين" : min <= 10 ? `${min} دقائق` : `${min} دقيقة`}`;
  const h = Math.round(min / 60);
  if (h < 48) return `باقي ${hoursWord(h)}`;
  return `باقي ${daysWord(Math.round(h / 24))}`;
}

/** What the serial can do now, as a badge. */
export function licenceState(l: Pick<OrderLicence, "status" | "revokedReason" | "expiresAt" | "downloads" | "maxDownloads" | "ready">, now = Date.now()): { label: string; cls: string } {
  if (l.status === "revoked") {
    return l.revokedReason === "owner" ? { label: "موقوف", cls: "bg-red-500/15 text-red-300" } : { label: "الطلب ملغي", cls: "bg-white/10 text-white/50" };
  }
  if (!timeLeft(l.expiresAt, now)) return { label: "انتهت المدة", cls: "bg-amber-500/15 text-amber-300" };
  if (l.downloads >= l.maxDownloads) return { label: "خلصت التنزيلات", cls: "bg-amber-500/15 text-amber-300" };
  if (!l.ready) return { label: "الملفات مش جاهزة", cls: "bg-amber-500/15 text-amber-300" };
  return { label: "شغّال", cls: "bg-emerald-500/15 text-emerald-300" };
}

export const downloadsText = (used: number, max: number) => (used ? `نزّلته ${used} من ${max}` : `ما نزّلته لسا (لحد ${max})`);

/** The extension the owner typed (".PY " → "py"); null when it can't be one. */
export function cleanExt(raw: string) {
  const e = String(raw ?? "").trim().toLowerCase().replace(/^\.+/, "");
  return /^[a-z0-9_+-]{1,16}$/.test(e) ? e : null;
}
