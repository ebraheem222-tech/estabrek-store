/**
 * The shop's languages: Arabic and Hebrew (right to left) and English. A page's
 * language is the first part of its address (/en/shop, /he/p/…); a plain address
 * (/shop) is shown in the shopper's last language (cookie) or the store's main one.
 * The store picks which languages it offers and the main one (admin → اللغات,
 * header.languages). Safe for the middleware (no React, no Node APIs).
 */
export const LANGS = ["ar", "en", "he"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_COOKIE = "shop-lang";

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);
export const isRtl = (l: Lang) => l !== "en";
export const dirOf = (l: Lang): "rtl" | "ltr" => (isRtl(l) ? "rtl" : "ltr");

/** How each language names itself (the switcher). */
export const LANG_NAME: Record<Lang, string> = { ar: "العربية", en: "English", he: "עברית" };
/** The short label on the header button. */
export const LANG_SHORT: Record<Lang, string> = { ar: "ع", en: "EN", he: "עב" };
/** For <html lang> and Open Graph. */
export const LANG_LOCALE: Record<Lang, string> = { ar: "ar", en: "en", he: "he" };

export type LangConfig = { enabled: Lang[]; default: Lang };
/** What a store offered before it could choose: Arabic first, and English. */
export const LANG_DEFAULTS: LangConfig = { enabled: ["ar", "en"], default: "ar" };

export function langConfigOf(header: unknown): LangConfig {
  const h = header && typeof header === "object" ? (header as Record<string, unknown>) : {};
  const raw = (h.languages && typeof h.languages === "object" ? h.languages : {}) as Record<string, unknown>;
  const enabled = Array.isArray(raw.enabled) ? LANGS.filter((l) => (raw.enabled as unknown[]).includes(l)) : [...LANG_DEFAULTS.enabled];
  const def = isLang(raw.default) ? raw.default : LANG_DEFAULTS.default;
  const list = enabled.length ? enabled : [def];
  return { enabled: list.includes(def) ? list : [def, ...list], default: def };
}

/** "/en/shop" → "/shop", "/he" → "/". */
export function stripLang(path: string): string {
  const m = /^\/(ar|en|he)(?=\/|$)/.exec(path);
  if (!m) return path || "/";
  return path.slice(m[0].length) || "/";
}

/** The address of a page in a language: the main language keeps the plain address. */
export function withLang(path: string, lang: Lang, cfg: LangConfig = LANG_DEFAULTS): string {
  const plain = stripLang(path);
  if (lang === cfg.default) return plain;
  return `/${lang}${plain === "/" ? "" : plain}`;
}

/** "hreflang" alternates for a page (absolute when the site address is known). */
export function alternatesFor(path: string, cfg: LangConfig, base?: string | null) {
  const abs = (p: string) => (base ? `${base.replace(/\/$/, "")}${p}` : p);
  const languages: Record<string, string> = {};
  for (const l of cfg.enabled) languages[LANG_LOCALE[l]] = abs(withLang(path, l, cfg));
  languages["x-default"] = abs(withLang(path, cfg.default, cfg));
  return languages;
}
