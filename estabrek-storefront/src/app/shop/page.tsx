import Link from "next/link";
import { getPublicSettings, listProducts, listCategories } from "@/lib/api";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import { GsapReveal, GsapStagger, FloatingOrbs } from "@/components/candy/GsapAnimations";

type SP = Record<string, string | string[] | undefined>;
export const revalidate = 60;

function pick(sp: SP, key: string): string | undefined {
  const v = sp[key];
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = normalizeFiltersFromSearchParams(searchParams);
  const qs = buildCanonicalQuery(f);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const canonical = new URL(qs ? `/shop?${qs}` : "/shop", base).toString();
  return { title: "المتجر", description: "تصفح جميع منتجاتنا", alternates: { canonical } };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const settings = await getPublicSettings().catch(() => null);
  const currencyCode = (settings?.site as any)?.currencyCode || "ILS";
  const f = normalizeFiltersFromSearchParams(searchParams);
  const q = pick(searchParams, "q") ?? "";
  const sort = pick(searchParams, "sort") ?? "newest";
  const catId = pick(searchParams, "categoryId");
  const page = Number(pick(searchParams, "page") ?? "1");

  const [cats, out] = await Promise.all([
    listCategories(),
    listProducts({ page, limit: 24, q: q || undefined, sort: sort as any, categoryId: catId, lite: true, includeFacets: true }).catch(() => ({ items:[], total:0, totalPages:1 })),
  ]);

  const products = (out as any).items || [];
  const total = (out as any).total || 0;
  const totalPages = (out as any).totalPages || 1;
  const allCats = ((cats as any[]) || []);

  const SORT_OPTIONS = [
    { val:"newest", label:"الأحدث" },
    { val:"price_asc", label:"السعر: الأقل" },
    { val:"price_desc", label:"السعر: الأعلى" },
    { val:"bestsellers", label:"الأكثر مبيعاً" },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">المتجر</span>
      </nav>

      {/* Page Hero */}
      <section className="candy-page-hero">
        <div className="candy-page-hero-bg" />
        <div className="candy-page-hero-content">
          <GsapReveal>
            <div className="candy-section-eyebrow">🛍 كل ما تحتاجه</div>
            <h1 className="candy-section-title" style={{ fontSize:"clamp(1.8rem,5vw,3rem)" }}>
              تصفح <span className="text-gradient-hero">متجرنا</span>
            </h1>
            <p className="candy-section-desc">{total > 0 ? `${total} منتج متوفر لك` : "تصفح أحدث المنتجات"}</p>
          </GsapReveal>
        </div>
      </section>

      <section className="candy-section" style={{ paddingTop:"1.5rem" }}>
        <div className="candy-container">

          {/* Filters row */}
          <div style={{ display:"flex",flexWrap:"wrap",gap:"0.75rem",alignItems:"center",marginBottom:"1.5rem" }}>
            {/* Categories */}
            <div className="candy-chips-row" style={{ flex:1,minWidth:0 }}>
              <Link href="/shop" className={`candy-filter-chip${!catId ? " active" : ""}`}>الكل</Link>
              {allCats.map((cat:any) => (
                <Link key={cat.id} href={`/shop?categoryId=${cat.id}`} className={`candy-filter-chip${catId === cat.id ? " active" : ""}`}>{cat.name}</Link>
              ))}
            </div>
            {/* Sort */}
            <div style={{ display:"flex",gap:"0.5rem",flexShrink:0 }}>
              {SORT_OPTIONS.map(opt => (
                <Link key={opt.val} href={`/shop?${new URLSearchParams({ ...(catId ? {categoryId:catId} : {}), sort:opt.val }).toString()}`} className={`candy-filter-chip${sort===opt.val?" active":""}`}>{opt.label}</Link>
              ))}
            </div>
          </div>

          {/* Search row */}
          <form method="get" action="/shop" style={{ marginBottom:"2rem",display:"flex",gap:"0.75rem",maxWidth:480 }}>
            {catId && <input type="hidden" name="categoryId" value={catId} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            <div className="candy-search-box" style={{ flex:1,margin:0 }}>
              <span style={{ color:"var(--text-muted)" }}>🔍</span>
              <input name="q" type="search" defaultValue={q} className="candy-search-input" placeholder="ابحث في المتجر..." />
            </div>
            <button type="submit" className="candy-btn candy-btn-primary candy-btn-sm">بحث</button>
          </form>

          {/* Product grid */}
          {products.length > 0 ? (
            <div className="candy-product-grid">
              {products.map((product: any, i: number) => {
                const img = getProductPrimaryImage(product);
                const price = getProductMinPrice(product);
                return (
                  <Link key={product.id} href={`/p/${product.slug}`} className="candy-product-card reveal-up" style={{ transitionDelay:`${i*50}ms` }}>
                    <div className="candy-product-image-wrap">
                      {img ? <img src={img} alt={product.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} loading="lazy" /> : <div className="candy-product-no-image">🛍</div>}
                      <div className="candy-product-overlay">
                        <span className="candy-btn candy-btn-primary candy-btn-sm">أضف للسلة</span>
                      </div>
                      {i < 3 && <span className="candy-product-badge candy-product-badge-new">جديد</span>}
                    </div>
                    <div className="candy-product-body">
                      {product.category && <div className="candy-product-category">{product.category.name}</div>}
                      <h3 className="candy-product-title">{product.title}</h3>
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
              <div className="candy-empty-desc">لم نجد منتجات تطابق بحثك. جرب تغيير الفلاتر أو اعرض الكل.</div>
              <Link href="/shop" className="candy-btn candy-btn-primary" style={{ marginTop:"1rem" }}>عرض جميع المنتجات</Link>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:"flex",justifyContent:"center",gap:"0.5rem",marginTop:"2.5rem",flexWrap:"wrap" }}>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => {
                const params = new URLSearchParams({ ...(catId ? {categoryId:catId} : {}), ...(sort ? {sort} : {}), ...(q ? {q} : {}), page:String(p) });
                return (
                  <Link key={p} href={`/shop?${params}`} className={`candy-filter-chip${p === page ? " active" : ""}`} style={{ minWidth:36,justifyContent:"center" }}>{p}</Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
