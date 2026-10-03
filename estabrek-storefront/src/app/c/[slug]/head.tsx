import React from "react";
import { getBootstrap, getCategoriesTree } from "@/lib/api";
import type { CatalogCategory } from "@/lib/catalog";
import { ScriptTags } from "@/components/ScriptTags";

function findCategory(tree: CatalogCategory[], slug: string): CatalogCategory | null {
  for (const c of tree) {
    if (c.slug === slug) return c;
    const child = c.children ? findCategory(c.children, slug) : null;
    if (child) return child;
  }
  return null;
}

export default async function Head({ params }: { params: { slug: string } }) {
  const [bootstrap, tree] = await Promise.all([getBootstrap(), getCategoriesTree()]);
  const category = findCategory(tree, params.slug);

  const title = category ? `${category.name} | ${bootstrap.site.siteName ?? "Store"}` : (bootstrap.site.siteName ?? "Store");
  const description = category ? `Browse ${category.name} products.` : undefined;
  const css = bootstrap.site.customCss?.trim() ? bootstrap.site.customCss : null;

  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}

      {bootstrap.site.faviconUrl ? <link rel="icon" href={bootstrap.site.faviconUrl} /> : null}
      {bootstrap.site.appleTouchIconUrl ? <link rel="apple-touch-icon" href={bootstrap.site.appleTouchIconUrl} /> : null}
      {bootstrap.site.themeColor ? <meta name="theme-color" content={bootstrap.site.themeColor} /> : null}

      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta name="twitter:card" content="summary" />

      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}

      <ScriptTags scripts={bootstrap.site.scriptsHead} />
    </>
  );
}
