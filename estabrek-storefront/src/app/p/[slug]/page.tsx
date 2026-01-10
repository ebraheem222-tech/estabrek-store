import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/api";
import { formatMoney, getProductMinPrice } from "@/lib/catalog";
import ProductDetail from "@/components/ProductDetail";
import ShareButton from "@/components/ShareButton";
import RecommendedProductsSection from "@/components/RecommendedProductsSection";
import { RecentlyViewedSection } from "@/components/RecentlyViewedSection";
import { 
  StockIndicator, 
  ProductBadges, 
  SizeRecommender,
  PriceDisplay 
} from "@/components/ProductEnhancements";
import { Product360View } from "@/components/Product360View";

import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { listCategories } from "@/lib/api";
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

  // Extract product data for enhancements
  const images = (product as any).images?.map((img: any) => img.url) || [];
  const stock = (product as any).stock ?? (product as any).quantity ?? 100;
  const inStock = (product as any).inStock ?? stock > 0;
  const comparePrice = (product as any).compareAtPrice ?? (product as any).originalPrice;
  const sizes = (product as any).sizes ?? (product as any).variants?.map((v: any) => v.size).filter(Boolean) ?? [];
  const isNew = (product as any).isNew ?? false;
  const isBestseller = (product as any).isBestseller ?? false;
  const isTrending = (product as any).isTrending ?? false;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={crumbs} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      
      {/* Product Badges */}
      <ProductBadges
        isNew={isNew}
        isBestseller={isBestseller}
        isTrending={isTrending}
        salePercent={comparePrice && price ? Math.round((1 - price / comparePrice) * 100) : undefined}
        stock={stock}
        lowStockThreshold={10}
      />

      {/* 360° View (if multiple images) */}
      {images.length > 3 && (
        <div className="glass-card rounded-3xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-[var(--text)]">عرض 360° - {product.title}</h3>
          <Product360View
            images={images}
            autoRotate={false}
            showControls={true}
            enableZoom={true}
            enableFullscreen={true}
          />
        </div>
      )}
      
      <ProductDetail product={product as any} />

      {/* Stock & Price Info */}
      <div className="flex flex-wrap gap-4 items-center">
        <StockIndicator
          stock={stock}
          lowStockThreshold={10}
          showCount={stock <= 20}
          showProgress={true}
        />
        <PriceDisplay
          price={price || 0}
          originalPrice={comparePrice}
          currency="₪"
        />
      </div>

      {/* Size Recommender */}
      {sizes.length > 0 && (
        <SizeRecommender
          sizes={sizes}
          productType="clothing"
        />
      )}

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
      <RecommendedProductsSection productId={(product as any).id} />
      
      {/* Share Button */}
      <ShareButton title={product.title} />
    </div>
  );
}
