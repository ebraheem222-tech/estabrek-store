import { getPublicSettings, listCategories, listProducts } from "@/lib/api";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";
import SearchBrowseClient from "@/components/SearchBrowseClient";
import Link from "next/link";
import { GsapReveal, FloatingOrbs } from "@/components/candy/GsapAnimations";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";

type SP = Record<string, string | string[] | undefined>;
export const revalidate = 60;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = normalizeFiltersFromSearchParams(searchParams);
  const qs = buildCanonicalQuery(f);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const canonical = new URL(qs ? `/search?${qs}` : "/search", base).toString();
  const q = f.q?.trim();
  return {
    title: q ? `بحث: ${q}` : "البحث",
    description: q ? `نتائج البحث عن ${q}` : "البحث في المنتجات",
    alternates: { canonical },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const settings = await getPublicSettings().catch(() => null);
  const currencyCode = (settings?.site as any)?.currencyCode || "ILS";
  const f = normalizeFiltersFromSearchParams(searchParams);
  const q = typeof searchParams.q === "string" ? searchParams.q : Array.isArray(searchParams.q) ? searchParams.q[0] : "";

  const [cats, out] = await Promise.all([
    listCategories(),
    listProducts({ page: f.page ?? 1, limit: 24, q: f.q, sort: (f.sort as any) ?? undefined, lite: true }).catch(() => ({ items: [], total: 0 })),
  ]);

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

      {/* Search Hero */}
      <section className="candy-search-hero">
        <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 0%,rgba(124,58,237,0.2) 0%,transparent 60%)",pointerEvents:"none" }} />
        <GsapReveal>
          <div className="candy-section-eyebrow" style={{ justifyContent:"center" }}>🔍 ابحث وابتكر</div>
          <h1 className="candy-hero-title" style={{ fontSize:"clamp(1.8rem,6vw,3.5rem)" }}>
            {q ? <>نتائج: <span className="text-gradient-hero">"{q}"</span></> : <><span className="text-gradient-hero">ابحث</span> عن أي شيء</>}
          </h1>
        </GsapReveal>

        <form method="get" action="/search" className="candy-search-box" style={{ position:"relative",zIndex:1 }}>
          <span style={{ color:"var(--text-muted)",fontSize:"1.1rem" }}>🔍</span>
          <input name="q" type="search" defaultValue={q} className="candy-search-input" placeholder="ابحث عن منتج، علامة تجارية..." autoComplete="off" />
          <button type="submit" className="candy-btn candy-btn-primary candy-btn-sm">بحث</button>
        </form>

        {q && (
          <p style={{ marginTop:"1rem",fontSize:"0.85rem",color:"var(--text-muted)",position:"relative",zIndex:1 }}>
            {total > 0 ? `وجدنا ${total} نتيجة لـ "${q}"` : `لم نجد نتائج لـ "${q}"`}
          </p>
        )}
      </section>

      {/* Results */}
      <section className="candy-section" style={{ paddingTop:"1rem" }}>
        <div className="candy-container">
          {products.length > 0 ? (
            <div className="candy-product-grid">
              {products.map((product: any, i: number) => {
                const img = getProductPrimaryImage(product);
                const price = getProductMinPrice(product);
                return (
                  <Link key={product.id} href={`/p/${product.slug}`} className="candy-product-card reveal-up" style={{ transitionDelay:`${i*50}ms` }}>
                    <div className="candy-product-image-wrap">
                      {img ? <img src={img} alt={product.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} loading="lazy" /> : <div className="candy-product-no-image">🛍</div>}
                    </div>
                    <div className="candy-product-body">
                      {product.category && <div className="candy-product-category">{product.category.name}</div>}
                      <h3 className="candy-product-title">{product.title}</h3>
                      <span className="candy-product-price">{price != null ? formatMoney(price, currencyCode) : "السعر عند الطلب"}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="candy-empty">
              <div className="candy-empty-icon">🔍</div>
              <div className="candy-empty-title">{q ? "لا توجد نتائج" : "ابدأ البحث"}</div>
              <div className="candy-empty-desc">{q ? `لم نجد منتجات مطابقة لـ "${q}". جرب كلمات مختلفة.` : "أدخل كلمة بحث للعثور على ما تريد"}</div>
              <Link href="/shop" className="candy-btn candy-btn-primary" style={{ marginTop:"1rem" }}>🛍 تصفح المتجر</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
