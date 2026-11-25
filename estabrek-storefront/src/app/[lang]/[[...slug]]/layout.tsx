import React from "react";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/api";
import { paramsToSlug } from "@/lib/slug";
import { routeLang } from "@/lib/seoLang";
import { bleedTree } from "@/pageTree/tree";

export default async function SiteLayout(props: { children: React.ReactNode; params: Promise<{ slug?: string[]; lang?: string }> }) {
  const { children } = props;
  const params = await props.params;
  const slug = paramsToSlug(params);
  // The segment's loading.tsx streams inside this layout. Resolve missing custom
  // pages above that boundary so their HTTP status can still be404.
  const page = await getPageBySlug(slug, routeLang(params)).catch(() => null);
  if (slug !== "/" && !page) notFound();
  // A page whose sections spread their ground over the whole screen (a premium theme's) drops the side margins.
  const wide = (page as { format?: number } | null)?.format === 2 && bleedTree((page as { tree?: unknown }).tree);
  return (
    <main id="main-content" tabIndex={-1} className={wide ? "cms-page-layout cms-page-wide w-full" : "cms-page-layout mx-auto max-w-6xl px-4 py-8"} data-page-wide={wide ? "" : undefined}>
      {children}
    </main>
  );
}
