import React from "react";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/api";
import { paramsToSlug } from "@/lib/slug";
import { routeLang } from "@/lib/seoLang";

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params?: { slug?: string[]; lang?: string } }) {
  const slug = paramsToSlug(params);
  // The segment's loading.tsx streams inside this layout. Resolve missing custom
  // pages above that boundary so their HTTP status can still be404.
  if (slug !== "/" && !(await getPageBySlug(slug, routeLang(params)))) notFound();
  return (
    <main id="main-content" tabIndex={-1} className="cms-page-layout mx-auto max-w-6xl px-4 py-8">
      {children}
    </main>
  );
}
