// "How many pieces are left" labels on the storefront ("آخر قطعة", "باقي قطعتان"),
// kept in site settings (header.scarcity). The storefront reads the same shape
// (estabrek-storefront/src/lib/scarcity.ts). The owner's own low-stock alerts
// (per-variant thresholds) are a separate thing and aren't affected.

export type ScarcitySettings = {
  enabled: boolean;
  /** Shown when this many pieces or fewer are left. */
  showAt: number;
  /** On the product photo and the product cards. */
  onPhoto: boolean;
  /** Next to the price once a size is picked (and in Razan's ordering). */
  nearPrice: boolean;
};

export const SCARCITY_MAX = 20;
/** What the shop did before this setting existed. */
export const SCARCITY_DEFAULTS: ScarcitySettings = { enabled: true, showAt: 3, onPhoto: true, nearPrice: true };

export function normalizeScarcity(raw: unknown): ScarcitySettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = Math.round(Number(r.showAt));
  return {
    enabled: r.enabled !== false,
    showAt: Number.isFinite(n) ? Math.min(SCARCITY_MAX, Math.max(1, n)) : SCARCITY_DEFAULTS.showAt,
    onPhoto: r.onPhoto !== false,
    nearPrice: r.nearPrice !== false,
  };
}

/** Whether shoppers see a count anywhere at all. */
export const scarcityShows = (s: ScarcitySettings) => s.enabled && (s.onPhoto || s.nearPrice);

export function sameScarcity(a: ScarcitySettings, b: ScarcitySettings) {
  return a.enabled === b.enabled && a.showAt === b.showAt && a.onPhoto === b.onPhoto && a.nearPrice === b.nearPrice;
}

/** The storefront's wording: "آخر قطعة", "باقي قطعتان", "باقي 5 قطع", "باقي 12 قطعة". */
export function piecesLeftText(left: number) {
  if (left === 1) return "آخر قطعة";
  if (left === 2) return "باقي قطعتان";
  return left <= 10 ? `باقي ${left} قطع` : `باقي ${left} قطعة`;
}

/** The labels a shopper would see, from 1 piece up to the chosen count (a few, not all). */
export function scarcityExamples(showAt: number) {
  const n = Math.min(SCARCITY_MAX, Math.max(1, Math.round(showAt)));
  const picks = [...new Set([1, 2, n].filter((x) => x <= n))];
  return picks.map((left) => ({ left, text: piecesLeftText(left) }));
}

/** One line about the current choice, for the card. */
export function scarcitySummary(s: ScarcitySettings) {
  if (!s.enabled) return "الزبونات ما بيشوفن كم قطعة باقية، بس «متوفر» أو «نفد».";
  if (!s.onPhoto && !s.nearPrice) return "ما في مكان مختار، فالعدد ما رح يبين بأي مكان.";
  const where = s.onPhoto && s.nearPrice ? "على الصورة وجنب السعر" : s.onPhoto ? "على الصورة بس" : "جنب السعر بس";
  const when = s.showAt === 1 ? "لما تضل آخر قطعة" : s.showAt === 2 ? "لما يضل قطعتين أو أقل" : `لما يضل ${s.showAt} ${s.showAt <= 10 ? "قطع" : "قطعة"} أو أقل`;
  return `بيبين ${where} ${when}.`;
}
