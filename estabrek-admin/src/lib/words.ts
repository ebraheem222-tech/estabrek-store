/**
 * The admin's words in its three languages. The code keeps the Arabic and the English
 * side by side (tr("عربي", "English")); the Hebrew lives in one dictionary keyed by the
 * English (words.he.ts), so a translator edits one file. English with numbers or names
 * uses {0}, {1}… (tr(`باقي ${n}`, "{0} left", [n])). The Arabic is written so it suits
 * anyone on the team (no "you" for one gender only).
 */
import { adminLang } from "./lang";
import { HE } from "./words.he";

const fill = (text: string, args?: readonly unknown[]) =>
  args && args.length ? text.replace(/\{(\d+)\}/g, (m, i: string) => (Number(i) < args.length ? String(args[Number(i)] ?? "") : m)) : text;

/** The words for the admin's language. */
export function tr(ar: string, en: string, args?: readonly unknown[]): string {
  const lang = adminLang();
  if (lang === "ar") return ar;
  if (lang === "he") return fill(HE[en] ?? en, args);
  return fill(en, args);
}

/** Is there Hebrew for this English? (tests) */
export const hasHebrew = (en: string) => Object.prototype.hasOwnProperty.call(HE, en);
