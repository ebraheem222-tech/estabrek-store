import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getPublicSettings, listCategories } from "@/lib/api";
import { getProductMinPrice } from "@/lib/catalog";
import RecommendedProductsSection from "@/components/RecommendedProductsSection";
import { RecentlyViewedSection } from "@/components/RecentlyViewedSection";
import ProductPageCandy from "@/components/candy/ProductPageCandy";
import { FloatingOrbs, GsapReveal } from "@/components/candy/GsapAnimations";
import type { Metadata } from "next";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const slug = encodeURIComponent((product as any)?.slug ?? params.slug);
  const canonical = new URL(`/p/${slug}`, base).toString();
  if (!product) return { title: "Product", alternates: { canonical }, robots: { index: false, follow: false } };
  const title = (product as any).seoTitle ?? (product as any).title ?? "Product";
  const description = (product as any).seoDescription ?? (product as any).description ?? "View product";
  const productImageUrl = (product as any).images?.[0]?.url;
  const fallbackOgUrl = new URL(`/api/og/product?slug=${slug}`, base).toString();
  return {
    title, description, alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", images: productImageUrl ? [{ url: productImageUrl }] : [{ url: fallbackOgUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [productImageUrl ?? fallbackOgUrl] },
    robots: { index: true, follow: true },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const settings = await getPublicSettings().catch(() => null);
  const currencyCode = (settings?.site as any)?.currencyCode || "ILS";
  const storefrontSettings = (settings?.site as any)?.header?.storefront ?? {};
  const recommendationsEnabled = storefrontSettings.productRecommendations !== false;
  const recommendationsCount = Number(storefrontSettings.productRecommendationsCount ?? 8);

  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      {/* Breadcrumb */}
      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <Link href="/shop">المتجر</Link>
        {product.category && (
          <>
            <span className="candy-breadcrumb-sep">/</span>
            <Link href={`/c/${product.category.slug}`}>{product.category.name}</Link>
          </>
        )}
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">{product.title}</span>
      </nav>

      {/* MAIN PRODUCT LAYOUT */}
      <GsapReveal>
        <ProductPageCandy product={product as any} currencyCode={currencyCode} />
      </GsapReveal>

      {/* Description */}
      {(product as any).description && (
        <div style={{ maxWidth:1280,margin:"0 auto",padding:"0 1.25rem 2rem" }}>
          <div className="candy-card" style={{ padding:"1.5rem 1.75rem" }}>
            <h2 style={{ fontSize:"1rem",fontWeight:800,color:"var(--text-primary)",marginBottom:"1rem",display:"flex",alignItems:"center",gap:"0.5rem" }}>
              📄 وصف المنتج
            </h2>
            <div style={{ height:1,background:"linear-gradient(90deg,transparent,rgba(124,58,237,0.3),transparent)",marginBottom:"1rem" }} />
            <p style={{ fontSize:"0.88rem",color:"var(--text-secondary)",lineHeight:1.8,whiteSpace:"pre-wrap" }}>
              {(product as any).description}
            </p>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendationsEnabled && (
        <section className="candy-section" style={{ paddingTop:"2rem" }}>
          <div className="candy-container">
            <div className="candy-section-eyebrow" style={{ marginBottom:"0.5rem" }}>✨ قد يعجبك أيضاً</div>
            <h2 className="candy-section-title" style={{ marginBottom:"1.5rem" }}>منتجات <span className="text-gradient-hero">مشابهة</span></h2>
            <RecommendedProductsSection productId={(product as any).id} limit={recommendationsCount} />
          </div>
        </section>
      )}

      {/* Recently viewed */}
      <section style={{ padding:"0 1.25rem 3rem" }}>
        <div style={{ maxWidth:1280,margin:"0 auto" }}>
          <RecentlyViewedSection excludeId={(product as any).id} />
        </div>
      </section>
    </main>
  );
}
