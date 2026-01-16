import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getPublicSettings, listCategories } from "@/lib/api";
import { formatMoney, getProductMinPrice } from "@/lib/catalog";
import ProductDetail from "@/components/ProductDetail";
import ShareButton from "@/components/ShareButton";
import RecommendedProductsSection from "@/components/RecommendedProductsSection";
import { RecentlyViewedSection } from "@/components/RecentlyViewedSection";
import { ProductPageEnhancements } from "@/components/ProductPageEnhancements";

import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import type { Metadata } from "next";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const slug = encodeURIComponent((product as any)?.slug ?? params.slug);
  const canonical = new URL(`/p/${slug}`, base).toString();

  if (!product) {
    return {
      title: "Product",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const title = (product as any).seoTitle ?? (product as any).title ?? "Product";
  const description = (product as any).seoDescription ?? (product as any).description ?? "View product";
  const productImageUrl = (product as any).images?.[0]?.url;
  const fallbackOgUrl = new URL(`/api/og/product?slug=${slug}`, base).toString();
  const openGraphImages = productImageUrl
    ? [{ url: productImageUrl }]
    : [{ url: fallbackOgUrl, width: 1200, height: 630 }];
  const twitterImages = [productImageUrl ?? fallbackOgUrl];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: twitterImages,
    },
    robots: { index: true, follow: true },
  };
}



export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const settings = await getPublicSettings().catch(() => null);
  const storefrontSettings = (settings?.site as any)?.header?.storefront ?? {};
  const breadcrumbsEnabled = storefrontSettings.breadcrumbsEnabled !== false;
  const recommendationsEnabled = storefrontSettings.productRecommendations !== false;
  const recommendationsCount = Number(storefrontSettings.productRecommendationsCount ?? 8);

  const price = getProductMinPrice(product);


function flattenCategories(nodes: any[]): any[] {
  const out: any[] = [];
  const walk = (arr: any[]) => {
    for (const n of arr || []) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

const crumbs: Crumb[] = [{ label: "الرئيسية", href: "/" }, { label: "المتجر", href: "/shop" }];

if ((product as any).category?.slug || (product as any).categoryId) {
  const catsRaw = await listCategories().catch(() => []);
  const cats = Array.isArray(catsRaw) ? flattenCategories(catsRaw as any[]) : [];
  const byId = new Map(cats.map((c) => [c.id, c]));
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  let cur: any | undefined =
    (product as any).categoryId ? byId.get((product as any).categoryId) : undefined;
  if (!cur && (product as any).category?.slug) cur = bySlug.get((product as any).category.slug);

  const chain: any[] = [];
  while (cur) {
    chain.push(cur);
    const pid = cur.parentId;
    if (!pid) break;
    const nxt = byId.get(pid);
    if (!nxt || chain.some((x) => x.id === nxt.id)) break;
    cur = nxt;
  }
  chain.reverse().forEach((c) => crumbs.push({ label: c.name, href: `/c/${c.slug}` }));
}

crumbs.push({ label: (product as any).title ?? "Product", href: `/p/${encodeURIComponent(params.slug)}` });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.label,
    item: new URL(c.href, SITE).toString(),
  })),
};

const productLd: any = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: (product as any).title,
  description: (product as any).description ?? undefined,
  image: (product as any).images?.map((x: any) => x.url) ?? undefined,
  sku: (product as any).sku ?? undefined,
  brand: (product as any).brand?.name ? { "@type": "Brand", name: (product as any).brand.name } : undefined,
  offers: {
    "@type": "Offer",
    priceCurrency: (product as any).currency ?? "ILS",
    price: Number(price),
    availability: ((product as any).inStock ?? true)
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    url: new URL(`/p/${encodeURIComponent((product as any).slug ?? params.slug)}`, SITE).toString(),
  },
};


  // Note: selection (color/size) + add-to-cart is handled client-side in ProductBuyBox.

  return (
    <div className="space-y-8">
      {breadcrumbsEnabled ? <Breadcrumbs items={crumbs} /> : null}

      {breadcrumbsEnabled ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      
      {/* All Product Enhancements - Client Component */}
      <ProductPageEnhancements product={product as any} />
      
      <ProductDetail product={product as any} />

      {/* Description Section */}
      {product.description ? (
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">وصف المنتج</h2>
              <p className="text-xs text-[var(--muted)]">تفاصيل ومعلومات إضافية</p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="prose prose-sm prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-sm text-[var(--text)]/80 leading-relaxed">{product.description}</p>
          </div>
        </div>
      ) : null}

      {/* Recently Viewed */}
      <RecentlyViewedSection excludeId={(product as any).id} />

      {/* Recommended Products */}
      {recommendationsEnabled ? (
        <RecommendedProductsSection productId={(product as any).id} limit={recommendationsCount} />
      ) : null}
      
      {/* Share Button */}
      <ShareButton title={product.title} />
    </div>
  );
}
