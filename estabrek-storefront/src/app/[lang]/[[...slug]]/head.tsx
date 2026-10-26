import React from "react";
import { getBootstrap, getPageBySlug } from "@/lib/api";
import { paramsToSlug } from "@/lib/slug";
import { buildSeoMeta } from "@/cms";
import { ScriptTags } from "@/components/ScriptTags";

function safeJsonLd(v: any) {
  try {
    if (!v) return null;
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

export default async function Head({ params }: { params?: { slug?: string[] } }) {
  const slug = paramsToSlug(params);
  const [bootstrap, page] = await Promise.all([getBootstrap(), getPageBySlug(slug)]);

  const siteName = bootstrap.site.siteName || "Estabrak Store";

  // If CMS page exists → use its SEO.
  // Otherwise → fallback SEO for reserved routes.
  const meta = page
    ? buildSeoMeta(page as any, bootstrap.site as any)
    : {
        title:
          slug === "/" ? siteName : slug === "/shop" ? `المتجر - ${siteName}` : slug === "/cart" ? `Cart - ${siteName}` : siteName,
        description: "Storefront",
        canonicalUrl: undefined,
        ogImageUrl: undefined,
        robotsNoIndex: false,
        robotsNoFollow: false,
        jsonLd: null,
        customCss: null,
      };

  const title = meta.title || siteName;
  const description = meta.description || "Storefront";
  const canonicalUrl = meta.canonicalUrl || null;
  const ogImageUrl = meta.ogImageUrl || null;

  const css = (page as any)?.customCss?.trim()
    ? (page as any).customCss
    : bootstrap.site.customCss?.trim()
    ? bootstrap.site.customCss
    : null;

  const jsonLdStr = safeJsonLd((page as any)?.jsonLd ?? meta.jsonLd);

  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}

      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      {/* Global icons/theme from settings */}
      {bootstrap.site.faviconUrl ? <link rel="icon" href={bootstrap.site.faviconUrl} /> : null}
      {bootstrap.site.appleTouchIconUrl ? <link rel="apple-touch-icon" href={bootstrap.site.appleTouchIconUrl} /> : null}
      {bootstrap.site.themeColor ? <meta name="theme-color" content={bootstrap.site.themeColor} /> : null}

      {/* Robots */}
      {(page as any)?.robotsNoIndex ? <meta name="robots" content="noindex" /> : null}
      {(page as any)?.robotsNoFollow ? <meta name="robots" content="nofollow" /> : null}

      {/* OG/Twitter */}
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      {ogImageUrl ? <meta property="og:image" content={ogImageUrl} /> : null}
      <meta name="twitter:card" content={ogImageUrl ? "summary_large_image" : "summary"} />

      {/* JSON-LD */}
      {jsonLdStr ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStr }} /> : null}

      {/* Custom CSS */}
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}

      {/* Head scripts from settings + page */}
      <ScriptTags scripts={bootstrap.site.scriptsHead} />
      <ScriptTags scripts={(page as any)?.headScripts} />
    </>
  );
}
