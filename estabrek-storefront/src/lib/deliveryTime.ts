// "Arrives in 3–5 days · Ships from Ramallah": the product page's delivery line,
// from the product's own days/place or its type's (the API sends them merged).

export type Delivery = { shipsFrom?: string | null; minDays?: number | null; maxDays?: number | null };

const arDays = (n: number) => (n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوم`);

export function deliveryText(d: Delivery | null | undefined, ar: boolean): string | null {
  if (!d) return null;
  const from = (d.shipsFrom ?? "").trim();
  let min = d.minDays ?? null;
  let max = d.maxDays ?? null;
  if (min == null) min = max;
  if (max == null) max = min;
  if (min != null && max != null && max < min) [min, max] = [max, min];
  let when = "";
  if (min != null && max != null) {
    if (ar) when = max === 0 ? "بيوصل بنفس اليوم" : min === max ? `بيوصل خلال ${arDays(max)}` : `بيوصل خلال ${min}–${max} ${max <= 10 ? "أيام" : "يوم"}`;
    else when = max === 0 ? "Arrives the same day" : min === max ? `Arrives in ${max} day${max === 1 ? "" : "s"}` : `Arrives in ${min}–${max} days`;
  }
  const parts = [when, from ? (ar ? `بينشحن من ${from}` : `Ships from ${from}`) : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
