import React from "react";
import { notFound } from "next/navigation";
import { getBootstrap, getPageBySlug } from "@/lib/api";
import { CmsPageRenderer } from "@/cms";

const MAP: Record<string, string> = {
  privacy: "privacy-policy",
  terms: "terms-of-service",
  refund: "refund-policy",
  shipping: "shipping-policy",
};

export default async function PolicyPage({ params }: { params: { key: string } }) {
  const slug = MAP[params.key];
  if (!slug) return notFound();

  const [bootstrap, page] = await Promise.all([getBootstrap(), getPageBySlug(slug)]);
  if (!page) return notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <CmsPageRenderer page={page} bootstrap={bootstrap} />
    </main>
  );
}
