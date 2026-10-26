/**
 * The language a shopper used (saved on her order, alert or request) and what the
 * store's messages to her need with it: the store's main language, how it speaks
 * (admin → هوية المتجر: women / men / everyone), and links to the shop in her language
 * (/en/…, /he/…; the main language has plain addresses).
 */
import { prisma } from "./prisma.js";
import { CONTENT_LANGS, CategoryTranslations, ProductTranslations, mainLanguage, translationsOf, type ContentLang } from "./translations.js";
import { identityOf, type Audience, type Industry } from "../modules/identity/identity.js";

export type ShopperLanguage = { lang: ContentLang; main: ContentLang; audience: Audience; industry: Industry };

/** The languages the store offers (admin → لغات المتجر); Arabic and English until it chooses. */
export function enabledLanguages(header: unknown): ContentLang[] {
  const h = header && typeof header === "object" ? (header as Record<string, unknown>) : {};
  const raw = h.languages && typeof h.languages === "object" ? (h.languages as Record<string, unknown>).enabled : undefined;
  const list = Array.isArray(raw) ? CONTENT_LANGS.filter((l) => raw.includes(l)) : (["ar", "en"] as ContentLang[]);
  const main = mainLanguage(header);
  return list.includes(main) ? list : [main, ...list];
}

/** A shopper's language as sent by the shop: one the store offers, else its main one. */
export function pickLanguage(raw: unknown, header: unknown): ContentLang {
  const enabled = enabledLanguages(header);
  return CONTENT_LANGS.includes(raw as ContentLang) && enabled.includes(raw as ContentLang) ? (raw as ContentLang) : mainLanguage(header);
}

export async function shopperLanguage(raw: unknown): Promise<ShopperLanguage> {
  return (await languageResolver())(raw);
}

/** Reads the store once, for a batch of messages (each shopper with her own language). */
export async function languageResolver(): Promise<(raw: unknown) => ShopperLanguage> {
  const s = await prisma.siteSettings.findFirst({ select: { siteName: true, header: true } });
  const id = identityOf(s);
  const main = mainLanguage(s?.header);
  return (raw) => ({ lang: pickLanguage(raw, s?.header), main, audience: id.audience, industry: id.industry });
}

/** The same shop address in her language: /p/x → /en/p/x (the main language keeps /p/x). */
export function urlInLanguage(url: string | null, lang: ContentLang, main: ContentLang): string | null {
  if (!url || lang === main) return url;
  try {
    const u = new URL(url);
    if (/^\/(ar|en|he)(\/|$)/.test(u.pathname)) return url;
    u.pathname = `/${lang}${u.pathname === "/" ? "" : u.pathname}`;
    return u.toString();
  } catch {
    return url;
  }
}

/** A product's title in her language, when the owner translated it. */
export const titleIn = (p: { title: string; translations?: unknown }, lang: ContentLang) =>
  translationsOf(ProductTranslations, p.translations)[lang]?.title || p.title;

/** A colour's name in her language, when the owner translated it. */
export const colorIn = (p: { translations?: unknown }, color: string | null | undefined, lang: ContentLang) =>
  (color && translationsOf(ProductTranslations, p.translations)[lang]?.colors?.[color]) || color || "";

export const categoryIn = (c: { name: string; translations?: unknown }, lang: ContentLang) =>
  translationsOf(CategoryTranslations, c.translations)[lang]?.name || c.name;
