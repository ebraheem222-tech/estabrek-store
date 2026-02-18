import Link from "next/link";
import { getPublicSettings, listProducts, listCategories } from "@/lib/api";
import { buildCanonicalQuery, normalizeFiltersFromSearchParams } from "@/lib/filtersUrl";
import type { Metadata } from "next";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import { GsapReveal, FloatingOrbs, SuperProductCard } from "@/components/candy/GsapAnimations";

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
  return { title: "المتجر | إستبرق", description: "تصفح جميع منتجاتنا", alternates: { canonical: new URL(qs ? `/shop?${qs}` : "/shop", base).toString() } };
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
    listProducts({ page, limit: 24, q: q || undefined, sort: sort as any, categoryId: catId, lite: true, includeFacets: true }).catch(() => ({ items:[],total:0,totalPages:1 })),
  ]);

  const products = (out as any).items || [];
  const total = (out as any).total || 0;
  const totalPages = (out as any).totalPages || 1;
  const allCats = ((cats as any[]) || []);

  const SORT_OPTIONS = [
    {val:"newest",label:"✨ الأحدث"},
    {val:"price_asc",label:"💸 السعر: الأقل"},
    {val:"price_desc",label:"💎 السعر: الأعلى"},
    {val:"bestsellers",label:"🔥 الأكثر مبيعاً"},
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
            <h1 className="candy-section-title" style={{ fontSize:"clamp(1.9rem,5vw,3.2rem)" }}>
              تصفح <span className="grad">متجرنا</span>
            </h1>
            <p className="candy-section-desc">
              {total > 0 ? `${total.toLocaleString("ar")} منتج مميز في انتظارك` : "أحدث وأجمل المنتجات المختارة بعناية"}
            </p>
          </GsapReveal>
        </div>
      </section>

      <section className="candy-section" style={{ paddingTop:"1.5rem" }}>
        <div className="candy-container">

          {/* Category chips */}
          {allCats.length > 0 && (
            <div style={{ marginBottom:"1rem" }}>
              <div style={{ fontSize:"0.72rem",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.6rem" }}>الفئات</div>
              <div className="candy-chips-row">
                <Link href="/shop" className={`candy-filter-chip${!catId ? " active" : ""}`}>📦 الكل</Link>
                {allCats.map((cat:any) => (
                  <Link key={cat.id} href={`/shop?categoryId=${cat.id}${sort ? `&sort=${sort}` : ""}`} className={`candy-filter-chip${catId===cat.id?" active":""}`}>{cat.name}</Link>
                ))}
              </div>
            </div>
          )}

          {/* Sort + Search row */}
          <div style={{ display:"flex",flexWrap:"wrap",gap:"0.85rem",alignItems:"center",marginBottom:"2rem" }}>
            <div className="candy-chips-row" style={{ flex:1,minWidth:0 }}>
              <span style={{ fontSize:"0.72rem",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap",alignSelf:"center" }}>ترتيب:</span>
              {SORT_OPTIONS.map(opt=>(
                <Link key={opt.val} href={`/shop?${new URLSearchParams({...(catId?{categoryId:catId}:{}),sort:opt.val})}`} className={`candy-filter-chip${sort===opt.val?" active":""}`}>{opt.label}</Link>
              ))}
            </div>
            <form method="get" action="/shop" style={{ display:"flex",gap:"0.6rem",flexShrink:0 }}>
              {catId && <input type="hidden" name="categoryId" value={catId} />}
              {sort && <input type="hidden" name="sort" value={sort} />}
              <div className="candy-search-box" style={{ margin:0,maxWidth:280,minWidth:0 }}>
                <span style={{ color:"var(--text-muted)" }}>🔍</span>
                <input name="q" type="search" defaultValue={q} className="candy-search-input" placeholder="بحث في المتجر..." />
              </div>
              <button type="submit" className="candy-btn candy-btn-primary candy-btn-sm">بحث</button>
            </form>
          </div>

          {/* Grid */}
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
                    price={price!=null ? formatMoney(price,currencyCode) : null}
                    category={product.category?.name}
                    isNew={i < 3}
                    colorSwatches={swatches}
                    idx={i}
                  />
                );
              })}
            </div>
          ) : (
            <div className="candy-empty">
              <div className="candy-empty-icon">📦</div>
              <div className="candy-empty-title">لا توجد منتجات</div>
              <div className="candy-empty-desc">لم نجد منتجات تطابق بحثك. جرب تغيير الفلاتر.</div>
              <Link href="/shop" className="candy-btn candy-btn-primary" style={{ marginTop:"1rem" }}>عرض جميع المنتجات</Link>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:"flex",justifyContent:"center",gap:"0.5rem",marginTop:"2.5rem",flexWrap:"wrap" }}>
              {page > 1 && <Link href={`/shop?${new URLSearchParams({...(catId?{categoryId:catId}:{}),sort,page:String(page-1)})}`} className="candy-filter-chip">← السابق</Link>}
              {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
                <Link key={p} href={`/shop?${new URLSearchParams({...(catId?{categoryId:catId}:{}),sort,page:String(p)})}`} className={`candy-filter-chip${p===page?" active":""}`} style={{ minWidth:38,justifyContent:"center" }}>{p}</Link>
              ))}
              {page < totalPages && <Link href={`/shop?${new URLSearchParams({...(catId?{categoryId:catId}:{}),sort,page:String(page+1)})}`} className="candy-filter-chip">التالي →</Link>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
