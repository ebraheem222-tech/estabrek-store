import type { CmsPage } from "./types";

export type SeoMeta = {
  title?: string;
  description?: string;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  robots?: string; // e.g. "noindex,nofollow"
  jsonLd?: any;
  // global (from SiteSettings)
  faviconUrl?: string | null;
  appleTouchIconUrl?: string | null;
  themeColor?: string | null;
};

/**
 * Derive meta values from a CMS page.
 * - Keeps everything optional (don't block publishing).
 * - Storefront decides how to inject into <head>.
 */
export function buildSeoMeta(
  page: CmsPage | null | undefined,
  site?: { faviconUrl?: string | null; appleTouchIconUrl?: string | null; themeColor?: string | null } | null
): SeoMeta {
  if (!page) {
    return {
      faviconUrl: site?.faviconUrl ?? null,
      appleTouchIconUrl: site?.appleTouchIconUrl ?? null,
      themeColor: site?.themeColor ?? null,
    };
  }
  const title = (page.metaTitle ?? "").trim() || (page.name ?? "").trim() || undefined;
  const description = (page.metaDescription ?? "").trim() || undefined;

  const robotsParts: string[] = [];
  if ((page as any).robotsNoIndex || (page as any).noIndex) robotsParts.push("noindex");
  if ((page as any).robotsNoFollow) robotsParts.push("nofollow");

  return {
    title,
    description,
    canonicalUrl: page.canonicalUrl ?? null,
    ogImageUrl: (page as any).ogImageUrl ?? (page as any).ogImageUrl ?? null,
    robots: robotsParts.length ? robotsParts.join(",") : undefined,
    jsonLd: page.jsonLd ?? undefined,
    faviconUrl: site?.faviconUrl ?? null,
    appleTouchIconUrl: site?.appleTouchIconUrl ?? null,
    themeColor: site?.themeColor ?? null,
  };
}
