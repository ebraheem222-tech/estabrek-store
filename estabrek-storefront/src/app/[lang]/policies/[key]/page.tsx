import React from "react";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/api";
import { CmsPageRenderer } from "@/cms";
import { routeLang } from "@/lib/seoLang";

const MAP: Record<string, string> = {
  privacy: "privacy-policy",
  terms: "terms-of-service",
  refund: "refund-policy",
  shipping: "shipping-policy",
};

export default async function PolicyPage({ params }: { params: { key: string; lang: string } }) {
  const lang = routeLang(params);
  const slug = MAP[params.key];
  if (!slug) return notFound();

  const page = await getPageBySlug(slug, lang);
  if (!page) return notFound();

  return <CmsPageRenderer sections={page.sections as any} />;
}
