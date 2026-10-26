/**
 * "How many pieces are left" labels (admin → المخزون → تنبيهات المخزون, header.scarcity).
 * The owner can switch them off, pick at how many pieces they start, and choose
 * where they show: on the product photo / cards, and next to the price.
 */
import type { Lang } from "./i18n";
export type ScarcitySettings = {
  enabled: boolean;
  /** Shown when this many pieces or fewer are left. */
  showAt: number;
  /** "آخر قطعة" / "باقي قطعتان" on the photo (product page and product cards). */
  onPhoto: boolean;
  /** Next to the price once a size is picked (and in Razan's ordering). */
  nearPrice: boolean;
};

/** The highest count the owner can pick; badges are worked out up to it. */
export const SCARCITY_MAX = 20;
/** What the shop did before the setting existed. */
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

/** Whether `left` pieces should be shown in that place. */
export function showsLeft(s: ScarcitySettings, left: number | null | undefined, where: "photo" | "price") {
  if (!s.enabled || left == null || left <= 0 || left > s.showAt) return false;
  return where === "photo" ? s.onPhoto : s.nearPrice;
}

/** "آخر قطعة", "باقي قطعتان", "باقي 5 قطع", "باقي 12 قطعة"; "Last one"; "הפריט האחרון". */
export function piecesLeftText(left: number, lang: Lang) {
  if (lang === "en") return left === 1 ? "Last one" : `Only ${left} left`;
  if (lang === "he") return left === 1 ? "הפריט האחרון" : `נשארו רק ${left}`;
  if (left === 1) return "آخر قطعة";
  if (left === 2) return "باقي قطعتان";
  return left <= 10 ? `باقي ${left} قطع` : `باقي ${left} قطعة`;
}
