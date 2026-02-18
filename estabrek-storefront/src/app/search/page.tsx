import { getPublicSettings, listProducts } from "@/lib/api";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";
import Link from "next/link";
import { GsapReveal, FloatingOrbs, SuperProductCard } from "@/components/candy/GsapAnimations";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";

type SP = Record<string, string | string[] | undefined>;
export const revalidate = 60;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = normalizeFiltersFromSearchParams(searchParams);
  const q = f.q?.trim();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { title: q ? `بحث: ${q}` : "البحث | إستبرق", description: q ? `نتائج البحث عن ${q}` : "ابحث في جميع منتجاتنا" };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const settings = await getPublicSettings().catch(() => null);
  const currencyCode = (settings?.site as any)?.currencyCode || "ILS";
  const f = normalizeFiltersFromSearchParams(searchParams);
  const q = typeof searchParams.q === "string" ? searchParams.q : Array.isArray(searchParams.q) ? searchParams.q[0] : "";

  const out = await listProducts({ page: f.page ?? 1, limit: 24, q: f.q, sort: (f.sort as any) ?? undefined, lite: true }).catch(() => ({ items:[], total:0 }));
  const products = (out as any).items || [];
  const total = (out as any).total || 0;

  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">البحث</span>
      </nav>

      <section className="candy-hero" style={{ minHeight:"45vh",paddingTop:"60px",paddingBottom:"2rem" }}>
        <div className="candy-hero-bg" />
        <div className="candy-hero-mesh" />
        <div className="candy-hero-content">
          <GsapReveal>
            <div className="candy-hero-badge">🔍 ابحث وابتكر</div>
            <h1 className="candy-hero-title reveal-up" style={{ fontSize:"clamp(1.9rem,6vw,3.8rem)",transitionDelay:"100ms" }}>
              {q ? <><span className="grad">"{q}"</span></> : <><span className="grad">ابحث</span> عن أي شيء</>}
            </h1>
          </GsapReveal>

          <form method="get" action="/search" className="candy-search-box" style={{ position:"relative",zIndex:1,marginTop:"0" }}>
            <span style={{ color:"var(--text-muted)",fontSize:"1.1rem" }}>🔍</span>
            <input name="q" type="search" defaultValue={q} className="candy-search-input" placeholder="ابحث عن منتج، ماركة، فئة..." autoComplete="off" />
            <button type="submit" className="candy-btn candy-btn-primary candy-btn-sm">بحث</button>
          </form>

          {q && (
            <p style={{ marginTop:"1rem",fontSize:"0.85rem",color:"var(--text-secondary)",position:"relative",zIndex:1 }}>
              {total > 0 ? `✅ وجدنا ${total.toLocaleString("ar")} نتيجة لـ "${q}"` : `❌ لم نجد نتائج لـ "${q}"`}
            </p>
          )}
        </div>
      </section>

      <section className="candy-section" style={{ paddingTop:"1.5rem" }}>
        <div className="candy-container">
          {products.length > 0 ? (
            <div className="super-product-grid">
              {products.map((product:any, i:number) => {
                const img = getProductPrimaryImage(product);
                const price = getProductMinPrice(product);
                const secondImg = product.secondaryImageUrl || product.items?.[0]?.images?.[1]?.url || null;
                const swatches = (product.items ?? []).map((it:any) => it.colorHex || it.suggestedColors?.[0] || null).filter(Boolean);
                return (
                  <SuperProductCard
                    key={product.id}
                    href={`/p/${product.slug}`}
                    image={img}
                    hoverImage={secondImg}
                    title={product.title}
                    price={price!=null?formatMoney(price,currencyCode):null}
                    category={product.category?.name}
                    colorSwatches={swatches}
                    idx={i}
                  />
                );
              })}
            </div>
          ) : (
            <div className="candy-empty">
              <div className="candy-empty-icon">🔍</div>
              <div className="candy-empty-title">{q ? "لا توجد نتائج" : "ابدأ البحث"}</div>
              <div className="candy-empty-desc">
                {q ? `لم نجد منتجات تطابق "${q}". جرب كلمات مختلفة.` : "اكتب اسم المنتج أو الفئة في خانة البحث بالأعلى"}
              </div>
              {q && <Link href="/shop" className="candy-btn candy-btn-primary" style={{ marginTop:"1rem" }}>🛍 تصفح كل المنتجات</Link>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
