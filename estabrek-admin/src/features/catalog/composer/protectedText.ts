// Protected products (serial + encrypted, marked copy): words for the product's
// files block, the file types, and an order's serials. Pure (tested).
import type { MarkMode, OrderLicence, ProtectedFile, ProtectedFileType } from "../../../api/protected.api";
import { tr } from "@/lib/words";

export const MODE_LABEL: Record<MarkMode, string> = {
  comment: tr("سطر ملاحظة جوّا الملف", "A comment line inside the file"),
  stl: tr("بعنوان ملف الـ STL", "In the STL file's header"),
  package: tr("جنب الملف (LICENCE.txt)", "Next to the file (LICENCE.txt)"),
};

/** Where the buyer's mark goes in this file, and why when it can't go inside. */
export function placementText(f: Pick<ProtectedFile, "placed" | "why">): { text: string; tone: "good" | "info" } {
  if (f.placed === "inside") return { text: tr("🏷️ العلامة جوّا الملف", "🏷️ The mark is inside the file"), tone: "good" };
  if (f.why === "signed") return { text: tr("📦 سكربت موقّع: ما منغيّر فيه، العلامة جنبه", "📦 A signed script: left as it is, the mark goes next to it"), tone: "info" };
  if (f.why === "binary") return { text: tr("📦 مش نص عادي: العلامة جنبه بـ LICENCE.txt", "📦 Not plain text: the mark goes next to it in LICENCE.txt"), tone: "info" };
  return { text: tr("📦 العلامة جنبه بـ LICENCE.txt", "📦 The mark goes next to it in LICENCE.txt"), tone: "info" };
}

/** How the mark looks in a file of this type (for the types list). */
export function markPreview(t: Pick<ProtectedFileType, "mode" | "commentStart" | "commentEnd">) {
  const line = "Licensed copy for order A1B2C3 - personal use only - estb:K7QM2XHPAB";
  if (t.mode === "comment") return [t.commentStart?.trim() || "#", line, t.commentEnd?.trim()].filter(Boolean).join(" ");
  if (t.mode === "stl") return line;
  return "LICENCE.txt";
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const hoursWord = (h: number) => (h === 1 ? tr("ساعة", "1 hour") : h === 2 ? tr("ساعتين", "2 hours") : tr(h <= 10 ? `${h} ساعات` : `${h} ساعة`, "{0} hours", [h]));
const daysWord = (d: number) => (d === 1 ? tr("يوم", "1 day") : d === 2 ? tr("يومين", "2 days") : tr(d <= 10 ? `${d} أيام` : `${d} يوم`, "{0} days", [d]));
const minutesWord = (m: number) => (m === 1 ? tr("دقيقة", "1 minute") : m === 2 ? tr("دقيقتين", "2 minutes") : tr(m <= 10 ? `${m} دقائق` : `${m} دقيقة`, "{0} minutes", [m]));

/** "24 ساعة", "3 أيام": a window length, for the product's settings. */
export function windowLength(hours: number) {
  return hours % 24 === 0 && hours >= 48 ? daysWord(hours / 24) : hoursWord(hours);
}

/** Time left to download: "باقي 5 ساعات", "باقي 20 دقيقة"; null when it's over. */
export function timeLeft(expiresAt: string, now = Date.now()): string | null {
  const ms = new Date(expiresAt).getTime() - now;
  if (!(ms > 0)) return null;
  const min = Math.ceil(ms / 60_000);
  const left = (w: string) => tr(`باقي ${w}`, "{0} left", [w]);
  if (min < 60) return left(minutesWord(min));
  const h = Math.round(min / 60);
  if (h < 48) return left(hoursWord(h));
  return left(daysWord(Math.round(h / 24)));
}

/** What the serial can do now, as a badge. */
export function licenceState(l: Pick<OrderLicence, "status" | "revokedReason" | "expiresAt" | "downloads" | "maxDownloads" | "ready">, now = Date.now()): { label: string; cls: string } {
  if (l.status === "revoked") {
    return l.revokedReason === "owner" ? { label: tr("موقوف", "Stopped"), cls: "bg-red-500/15 text-red-300" } : { label: tr("الطلب ملغي", "Order cancelled"), cls: "bg-white/10 text-white/50" };
  }
  if (!timeLeft(l.expiresAt, now)) return { label: tr("انتهت المدة", "Window over"), cls: "bg-amber-500/15 text-amber-300" };
  if (l.downloads >= l.maxDownloads) return { label: tr("خلصت التنزيلات", "No downloads left"), cls: "bg-amber-500/15 text-amber-300" };
  if (!l.ready) return { label: tr("الملفات مش جاهزة", "Files not ready"), cls: "bg-amber-500/15 text-amber-300" };
  return { label: tr("شغّال", "Active"), cls: "bg-emerald-500/15 text-emerald-300" };
}

export const downloadsText = (used: number, max: number) =>
  used ? tr(`نزّلته ${used} من ${max}`, "Downloaded {0} of {1}", [used, max]) : tr(`ما نزّلته لسا (لحد ${max})`, "Not downloaded yet (up to {0})", [max]);

/** The extension the owner typed (".PY " → "py"); null when it can't be one. */
export function cleanExt(raw: string) {
  const e = String(raw ?? "").trim().toLowerCase().replace(/^\.+/, "");
  return /^[a-z0-9_+-]{1,16}$/.test(e) ? e : null;
}
