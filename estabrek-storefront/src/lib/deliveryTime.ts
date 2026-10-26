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
