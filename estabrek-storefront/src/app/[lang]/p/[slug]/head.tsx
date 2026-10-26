import React from "react";
import { getBootstrap, getProductBySlug } from "@/lib/api";
import { getProductPrimaryImage } from "@/lib/catalog";
import { ScriptTags } from "@/components/ScriptTags";

function safeJsonLd(v: any) {
  try {
    if (!v) return null;
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

export default async function Head({ params }: { params: { slug: string } }) {
  const [bootstrap, product] = await Promise.all([getBootstrap(), getProductBySlug(params.slug)]);
  const siteName = bootstrap.site.siteName ?? "Store";
  const title = product ? `${product.title} | ${siteName}` : siteName;
  const description = product?.description ? String(product.description).slice(0, 160) : undefined;
  const ogImageUrl = product ? getProductPrimaryImage(product) : null;
  const css = bootstrap.site.customCss?.trim() ? bootstrap.site.customCss : null;

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description ?? undefined,
        image: ogImageUrl ? [ogImageUrl] : undefined,
      }
    : null;
  const jsonLdStr = safeJsonLd(jsonLd);

  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}

      {bootstrap.site.faviconUrl ? <link rel="icon" href={bootstrap.site.faviconUrl} /> : null}
      {bootstrap.site.appleTouchIconUrl ? <link rel="apple-touch-icon" href={bootstrap.site.appleTouchIconUrl} /> : null}
      {bootstrap.site.themeColor ? <meta name="theme-color" content={bootstrap.site.themeColor} /> : null}

      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      {ogImageUrl ? <meta property="og:image" content={ogImageUrl} /> : null}
      <meta name="twitter:card" content={ogImageUrl ? "summary_large_image" : "summary"} />

      {jsonLdStr ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStr }} /> : null}
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}

      <ScriptTags scripts={bootstrap.site.scriptsHead} />
    </>
  );
}
