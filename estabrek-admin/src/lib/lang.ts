// The admin's language for whoever uses it on this browser: their account's choice
// (the top bar switch, saved on the account), else the last one chosen here, else Arabic.
// Changing it reloads the page, so every text (menus and tables built when the app
// loads included) comes back in the new language.
import type { Lang } from "./storeIdentity";

export type { Lang };
export const ADMIN_LANGS: Lang[] = ["ar", "en", "he"];
const KEY = "admin-lang";

export const isLang = (v: unknown): v is Lang => v === "ar" || v === "en" || v === "he";
export const isRtl = (l: Lang) => l !== "en";

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

let current: Lang = stored() ?? "ar";

function paint(l: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = l;
  document.documentElement.dir = isRtl(l) ? "rtl" : "ltr";
}
paint(current);

/** The admin's language right now. */
export const adminLang = (): Lang => current;

/** A date/number locale: Arabic keeps the format each place chose; English and Hebrew get theirs. */
export const loc = (arabic = "ar"): string => (current === "ar" ? arabic : current === "he" ? "he-IL" : "en-GB");

/** Switch the admin's language (reloads unless it's already the one showing). */
export function setAdminLang(l: Lang, opts: { reload?: boolean } = {}) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* private mode: this visit only */
  }
  if (l === current) return;
  current = l;
  paint(l);
  if (opts.reload !== false && typeof window !== "undefined") window.location.reload();
}

/** Tests: pretend the admin is showing another language. */
export function setLangForTests(l: Lang) {
  current = l;
}

/**
 * After sign-in: the account's own choice wins (it follows the member to every device).
 * Without one it's the store's main language, unless this browser already chose.
 */
export function followAccountLanguage(a: { locale?: unknown; localeChosen?: boolean } | null | undefined) {
  if (!a || !isLang(a.locale)) return;
  if (a.localeChosen || stored() === null) setAdminLang(a.locale);
}
