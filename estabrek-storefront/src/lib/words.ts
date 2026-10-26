/**
 * The shop's own words in its three languages. The code keeps the Arabic and the
 * English side by side (tr(lang, "عربي", "English")); the Hebrew lives in one
 * dictionary keyed by the English (words.he.ts), so a translator edits one file.
 * English with numbers or names uses {0}, {1}… (tr(lang, `باقي ${n}`, "Only {0} left", [n])).
 * The language always comes from the page (useLanguage()), never a global: the
 * server renders many shoppers at once.
 */
import type { Lang } from "./i18n";
import { HE } from "./words.he";
import { AR_TONE, AR_TONE_PATTERNS } from "./words.tone";

const fill = (text: string, args?: readonly unknown[]) =>
  args && args.length ? text.replace(/\{(\d+)\}/g, (m, i: string) => (Number(i) < args.length ? String(args[Number(i)] ?? "") : m)) : text;

/** Who the shop speaks to in Arabic (admin → هوية المتجر): the code's lines are written to her. */
export type ArabicTone = "women" | "men" | "everyone";
let tone: ArabicTone = "women";
/**
 * Set from the store's identity when the page renders. Unlike the language, it is the
 * store's (one store per site), the same for every shopper, so it can live here.
 */
export function setArabicTone(next: ArabicTone) {
  tone = next;
}

const patterns = AR_TONE_PATTERNS.map(([re, men, all]) => [new RegExp(re), men, all] as const);
const seen = new Map<string, readonly [string, string]>();
/** An Arabic line said the store's way: to her (as written), to him, or to everyone. */
export function toneAr(ar: string, to: ArabicTone = tone): string {
  if (to === "women") return ar;
  const i = to === "men" ? 0 : 1;
  const hit = AR_TONE[ar] ?? seen.get(ar);
  if (hit) return hit[i];
  for (const [re, men, all] of patterns) {
    if (re.test(ar)) {
      const both = [ar.replace(re, men), ar.replace(re, all)] as const;
      if (seen.size < 2000) seen.set(ar, both);
      return both[i];
    }
  }
  return ar;
}

/** The words for the page's language. */
export function tr(lang: Lang, ar: string, en: string, args?: readonly unknown[]): string {
  if (lang === "ar") return toneAr(ar);
  if (lang === "he") return fill(HE[en] ?? en, args);
  return fill(en, args);
}

/** Is there Hebrew for this English? (tests) */
export const hasHebrew = (en: string) => Object.prototype.hasOwnProperty.call(HE, en);

/** One entry of a table written per language; Hebrew falls back to English until it's written. */
export function inLang<T>(table: { ar: T; en: T; he?: T }, lang: Lang): T {
  return lang === "he" ? table.he ?? table.en : table[lang];
}
