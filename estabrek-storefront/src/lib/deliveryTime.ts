import { tr } from "@/lib/words";
import type { Lang } from "@/lib/i18n";
// "Arrives in 3–5 days · Ships from Ramallah": the product page's delivery line,
// from the product's own days/place or its type's (the API sends them merged).

export type Delivery = { shipsFrom?: string | null; minDays?: number | null; maxDays?: number | null };

const heDays = (n: number) => (n === 1 ? "יום" : n === 2 ? "יומיים" : `${n} ימים`);
const arDays = (n: number) => (n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوم`);

export function deliveryText(d: Delivery | null | undefined, lang: Lang): string | null {
  if (!d) return null;
  const from = (d.shipsFrom ?? "").trim();
  let min = d.minDays ?? null;
  let max = d.maxDays ?? null;
  if (min == null) min = max;
  if (max == null) max = min;
  if (min != null && max != null && max < min) [min, max] = [max, min];
  let when = "";
  if (min != null && max != null) {
    if (lang === "ar") when = max === 0 ? "بيوصل بنفس اليوم" : min === max ? `بيوصل خلال ${arDays(max)}` : `بيوصل خلال ${min}–${max} ${max <= 10 ? "أيام" : "يوم"}`;
    else if (lang === "he") when = max === 0 ? "מגיע באותו יום" : min === max ? `מגיע תוך ${heDays(max)}` : `מגיע תוך ${min}–${max} ימים`;
    else when = max === 0 ? "Arrives the same day" : min === max ? `Arrives in ${max} day${max === 1 ? "" : "s"}` : `Arrives in ${min}–${max} days`;
  }
  const parts = [when, from ? (tr(lang, `بينشحن من ${from}`, "Ships from {0}", [from])) : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Fewest and most days, each filling the other when only one is set, in order; null when neither is. */
function span(min?: number | null, max?: number | null) {
  const a = min ?? max ?? null, b = max ?? min ?? null;
  if (a == null || b == null) return null;
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

/**
 * The days to her city: the area's when the owner set them, else the piece's own. A piece that takes clearly
 * longer than the area (its fewest days past the area's most: made to order, say) keeps its own days.
 */
export function arrivalDays(zone: { minDays?: number | null; maxDays?: number | null } | null, piece: Delivery | null | undefined) {
  const area = span(zone?.minDays, zone?.maxDays);
  const own = span(piece?.minDays, piece?.maxDays);
  if (!area) return own;
  if (own && own.min > area.max) return own;
  return area;
}

/** "بيوصل بين الخميس 13 نوفمبر والسبت 15 نوفمبر", counted from today in Israel time. */
export function arrivalText({ min, max }: { min: number; max: number }, lang: Lang, now = new Date()) {
  if (max === 0) return tr(lang, "بيوصل اليوم", "Arrives today");
  const locale = lang === "ar" ? "ar-u-nu-latn" : lang === "he" ? "he-IL" : "en-GB";
  const day = (n: number) => {
    const d = new Date(now.getTime() + n * 86400000);
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" }).format(d);
    } catch {
      return d.toDateString();
    }
  };
  const a = day(min), b = day(max);
  if (min === max || a === b) return tr(lang, `بيوصل ${b}`, "Arrives {0}", [b]);
  return tr(lang, `بيوصل بين ${a} و${b}`, "Arrives between {0} and {1}", [a, b]);
}
