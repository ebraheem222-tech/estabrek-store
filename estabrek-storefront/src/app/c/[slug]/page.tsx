import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicSettings, listCategories, listProducts } from "@/lib/api";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import { normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import { FloatingOrbs, GsapReveal, GsapStagger } from "@/components/candy/GsapAnimations";
import type { Metadata } from "next";

export const revalidate = 60;
type SP = Record<string, string | string[] | undefined>;

function findCatBySlug(cats: any[], slug: string): any {
  for (const c of cats) {
    if (c.slug === slug) return c;
    if (c.children?.length) { const found = findCatBySlug(c.children, slug); if (found) return found; }
  }
  return null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cats = await listCategories().catch(() => []);
  const cat = findCatBySlug(cats as any[], params.slug);
  if (!cat) return { title: "فئة", robots: { index: false } };
  return { title: cat.name, description: `تصفح منتجات ${cat.name}` };
}

export default async function CategoryPage({ params, searchParams }: { params: { slug: string }; searchParams: SP }) {
  const cats = await listCategories().catch(() => []);
  const cat = findCatBySlug(cats as any[], params.slug);
  if (!cat) notFound();

  const settings = await getPublicSettings().catch(() => null);
  const currencyCode = (settings?.site as any)?.currencyCode || "ILS";
  const page = Number(searchParams.page ?? "1");
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "newest";

  const out = await listProducts({ page, limit: 24, categoryId: cat.id, sort: sort as any, lite: true }).catch(() => ({ items:[], total:0, totalPages:1 }));
  const products = (out as any).items || [];
  const total = (out as any).total || 0;
  const totalPages = (out as any).totalPages || 1;

  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <Link href="/shop">المتجر</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">{cat.name}</span>
      </nav>

      <section className="candy-page-hero">
        <div className="candy-page-hero-bg" />
        <div className="candy-page-hero-content">
          <GsapReveal>
            <div className="candy-section-eyebrow">📦 فئة المنتجات</div>
            <h1 className="candy-section-title" style={{ fontSize:"clamp(1.8rem,5vw,3rem)" }}>
              <span className="text-gradient-hero">{cat.name}</span>
            </h1>
            <p className="candy-section-desc">{total} منتج في هذه الفئة</p>
          </GsapReveal>
        </div>
      </section>

      <section className="candy-section" style={{ paddingTop:"1.5rem" }}>
        <div className="candy-container">
          {/* Sort */}
          <div className="candy-chips-row" style={{ marginBottom:"1.5rem" }}>
            {[{val:"newest",label:"الأحدث"},{val:"price_asc",label:"السعر: الأقل"},{val:"price_desc",label:"السعر: الأعلى"},{val:"bestsellers",label:"الأكثر مبيعاً"}].map(opt => (
              <Link key={opt.val} href={`/c/${params.slug}?sort=${opt.val}`} className={`candy-filter-chip${sort===opt.val?" active":""}`}>{opt.label}</Link>
            ))}
          </div>

          {products.length > 0 ? (
            <div className="candy-product-grid">
              {products.map((p: any, i: number) => {
                const img = getProductPrimaryImage(p);
                const price = getProductMinPrice(p);
                return (
                  <Link key={p.id} href={`/p/${p.slug}`} className="candy-product-card reveal-up" style={{ transitionDelay:`${i*50}ms` }}>
                    <div className="candy-product-image-wrap">
                      {img ? <img src={img} alt={p.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} loading="lazy" /> : <div className="candy-product-no-image">🛍</div>}
                      <div className="candy-product-overlay">
                        <span className="candy-btn candy-btn-primary candy-btn-sm">عرض المنتج</span>
                      </div>
                    </div>
                    <div className="candy-product-body">
                      <h3 className="candy-product-title">{p.title}</h3>
                      <span className="candy-product-price">{price != null ? formatMoney(price,currencyCode) : "السعر عند الطلب"}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="candy-empty">
              <div className="candy-empty-icon">📦</div>
              <div className="candy-empty-title">لا توجد منتجات</div>
              <div className="candy-empty-desc">لا توجد منتجات في هذه الفئة حالياً</div>
              <Link href="/shop" className="candy-btn candy-btn-primary" style={{ marginTop:"1rem" }}>عرض الكل</Link>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:"flex",justifyContent:"center",gap:"0.5rem",marginTop:"2.5rem",flexWrap:"wrap" }}>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <Link key={p} href={`/c/${params.slug}?page=${p}&sort=${sort}`} className={`candy-filter-chip${p===page?" active":""}`} style={{ minWidth:36,justifyContent:"center" }}>{p}</Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
