// A protected download's window, in words: "باقي 5 ساعات" / "5 hours left".

const arHours = (h: number) => (h === 1 ? "ساعة" : h === 2 ? "ساعتين" : h <= 10 ? `${h} ساعات` : `${h} ساعة`);
const arDays = (d: number) => (d === 1 ? "يوم" : d === 2 ? "يومين" : d <= 10 ? `${d} أيام` : `${d} يوم`);
const arMinutes = (m: number) => (m === 1 ? "دقيقة" : m === 2 ? "دقيقتين" : m <= 10 ? `${m} دقائق` : `${m} دقيقة`);
const en = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} left`;

/** Null when the window is over. */
export function licenceTimeLeft(expiresAt: string, ar: boolean, now = Date.now()): string | null {
  const ms = new Date(expiresAt).getTime() - now;
  if (!(ms > 0)) return null;
  const min = Math.ceil(ms / 60_000);
  if (min < 60) return ar ? `باقي ${arMinutes(min)}` : en(min, "minute");
  const h = Math.round(min / 60);
  if (h < 48) return ar ? `باقي ${arHours(h)}` : en(h, "hour");
  const d = Math.round(h / 24);
  return ar ? `باقي ${arDays(d)}` : en(d, "day");
}

/** The file name the server sent (Content-Disposition), or a fallback. */
export function attachmentName(header: string | null, fallback: string) {
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header ?? "");
  try {
    return m ? decodeURIComponent(m[1]) : fallback;
  } catch {
    return m ? m[1] : fallback;
  }
}
