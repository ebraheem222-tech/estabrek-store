/**
 * The names shown in the shop's own words: the store (admin → هوية المتجر) and its
 * guide (admin → رزان, «الاسم»). Built-in lines carry {store}, {storeName} and
 * {assistant}; fill() puts the names in. Lines spoken by the guide are filled where
 * they are shown (RoseMascot), from the names registered here.
 */
import type { Lang } from "./i18n";
import { markOf, nameOf, type StoreIdentity } from "./storeIdentity";

export type Names = {
  /** The name in the logo (short name, else the store name). */
  store: string;
  /** The full store name (titles, messages). */
  storeName: string;
  assistant: string;
  /** The guide's name with its vowel marks, for labels («رَزان»). */
  assistantFull: string;
};
type AssistantName = { ar?: string; en?: string; he?: string } | undefined;

const BUILT_IN: Record<Lang, { assistant: string; full: string }> = {
  ar: { assistant: "رزان", full: "رَزان" },
  en: { assistant: "Rose", full: "Rose" },
  he: { assistant: "רוז", full: "רוז" },
};

export function namesFor(id: StoreIdentity, assistant: AssistantName, lang: Lang): Names {
  // Her name in this language, else the one the owner wrote in another (a name reads the same).
  const own = assistant?.[lang]?.trim() || (lang === "ar" ? "" : assistant?.en?.trim() || assistant?.ar?.trim()) || "";
  return {
    store: markOf(id, lang),
    storeName: nameOf(id, lang),
    assistant: own || BUILT_IN[lang].assistant,
    assistantFull: own || BUILT_IN[lang].full,
  };
}

export function fill(text: string, n: Names): string {
  return text
    .replace(/\{storeName\}/g, n.storeName)
    .replace(/\{store\}/g, n.store)
    .replace(/\{assistantFull\}/g, n.assistantFull)
    .replace(/\{assistant\}/g, n.assistant);
}

let current: Record<Lang, Names> | null = null;

/** Called while the shop renders, so imperative speech (bubbles) knows the names. */
export function registerNames(id: StoreIdentity, assistant: AssistantName) {
  current = { ar: namesFor(id, assistant, "ar"), en: namesFor(id, assistant, "en"), he: namesFor(id, assistant, "he") };
}

/** Fills a line in whichever language it is written in. */
export function fillAuto(text: string): string {
  if (!current || !text.includes("{")) return text;
  const lang: Lang = /[؀-ۿ]/.test(text) ? "ar" : /[֐-׿]/.test(text) ? "he" : "en";
  return fill(text, current[lang]);
}
