/**
 * The store's own clock: a date with its time is kept as one moment (UTC) and told in the
 * store's zone, so "13/11/2026 14:30" in a file, a day in a filter and a field's first and last
 * day all mean the store's day, not the server's. No imports, no library: the zone's offset is
 * read from the platform's own calendar.
 */
export const storeZone = () => process.env.STORE_TIMEZONE || "Asia/Jerusalem";

const formats = new Map<string, Intl.DateTimeFormat>();
function clock(zone: string) {
  let f = formats.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    formats.set(zone, f);
  }
  return f;
}

/** The zone's wall clock at a moment, as numbers. */
function wallAt(at: number, zone: string) {
  const parts = clock(zone).formatToParts(new Date(at));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: n("year"), month: n("month"), day: n("day"), hour: n("hour"), minute: n("minute"), second: n("second") };
}

/** How far the zone's clock is ahead of UTC at a moment, in ms. */
function offsetAt(at: number, zone: string): number {
  const w = wallAt(at, zone);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(at / 1000) * 1000;
}

/** A time on the store's wall clock as the moment it is. */
export function zonedToUtc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, zone = storeZone()): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  // The offset at the first guess, then once more at the moment found (the two differ around a clock change).
  const guess = wall - offsetAt(wall, zone);
  return new Date(wall - offsetAt(guess, zone));
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** The moment a store day starts ("2026-11-13" → that day's midnight in the store's zone). */
export function dayStart(day: string, zone = storeZone()): Date {
  const m = DAY.exec(day);
  if (!m) return new Date(NaN);
  return zonedToUtc(Number(m[1]), Number(m[2]), Number(m[3]), 0, 0, 0, zone);
}

/** The day after ("2026-11-30" → "2026-12-01"). */
export function nextDay(day: string): string {
  const m = DAY.exec(day);
  if (!m) return day;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1)).toISOString().slice(0, 10);
}

/** The store day a moment falls on ("2026-11-13T22:30:00Z" → "2026-11-14" in a zone two hours ahead). */
export function dayOf(moment: string | Date, zone = storeZone()): string {
  const at = moment instanceof Date ? moment.getTime() : Date.parse(moment);
  if (Number.isNaN(at)) return "";
  const w = wallAt(at, zone);
  return `${String(w.year).padStart(4, "0")}-${String(w.month).padStart(2, "0")}-${String(w.day).padStart(2, "0")}`;
}

/**
 * A date and time as written by a person or a spreadsheet, as the moment it is (ISO, UTC), or
 * null when it can't be read. With a zone ("…Z", "…+02:00") it is that moment; without one
 * ("2026-11-13 14:30", "13/11/2026 14:30", a day alone) it is the store's wall clock.
 */
export function momentOf(written: string, zone = storeZone()): string | null {
  const s = written.trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(s)) {
    const d = new Date(s.replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  const p = iso ? [iso[1], iso[2], iso[3], iso[4], iso[5], iso[6]] : dmy ? [dmy[3], dmy[2], dmy[1], dmy[4], dmy[5], dmy[6]] : null;
  if (!p) return null;
  const [y, mo, d, h, mi, sec] = p.map((x) => (x === undefined ? 0 : Number(x)));
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || sec > 59) return null;
  const at = zonedToUtc(y, mo, d, h, mi, sec, zone);
  // 31 February and the like roll over: refused rather than moved.
  return Number.isNaN(at.getTime()) || dayOf(at, zone) !== `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}` ? null : at.toISOString();
}
