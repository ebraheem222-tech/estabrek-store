import { getPublicSettings } from "./api";
import { alternatesFor, isLang, langConfigOf, withLang, type Lang } from "./i18n";

/** The page's language from its route (app/[lang]/…). */
export const routeLang = (params: { lang?: string } | undefined): Lang => (isLang(params?.lang) ? params!.lang : "ar");

/**
 * A page's own address in its language (canonical) and its other languages (hreflang),
 * so search engines show each shopper the page in their language.
 * `path` is the plain address with its query, e.g. "/p/rose-dress" or "/shop?sort=latest".
 */
export async function seoAlternates(path: string, lang: Lang) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const settings = await getPublicSettings().catch(() => null);
  const cfg = langConfigOf((settings?.site as { header?: unknown } | undefined)?.header);
  return {
    canonical: new URL(withLang(path, lang, cfg), base).toString(),
    languages: alternatesFor(path, cfg, base),
  };
}
