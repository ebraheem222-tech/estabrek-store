import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getCategoriesTree, listProducts, getBootstrap } from "@/lib/api";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import type { CatalogProduct, CatalogCategory } from "@/lib/catalog";
import {
  GsapReveal,
  GsapStagger,
  GsapCounter,
  FloatingOrbs,
  CandyTicker,
} from "./candy/GsapAnimations";

const ShoppingBagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
  </svg>
);
const StarFill = () => (
  <svg className="w-3 h-3" fill="#F59E0B" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
);

const CATEGORY_GRADIENTS = [
  "linear-gradient(135deg, #7C3AED, #EC4899)",
  "linear-gradient(135deg, #06B6D4, #7C3AED)",
  "linear-gradient(135deg, #10B981, #06B6D4)",
  "linear-gradient(135deg, #F59E0B, #EF4444)",
  "linear-gradient(135deg, #EF4444, #EC4899)",
  "linear-gradient(135deg, #F97316, #F59E0B)",
  "linear-gradient(135deg, #EC4899, #F97316)",
  "linear-gradient(135deg, #A78BFA, #7C3AED)",
];
const CAT_EMOJIS = ["👗","👟","💄","🎒","⌚","💎","🛍","🎯"];

function ProductCard({ product, idx = 0, currencyCode = "ILS" }: { product: CatalogProduct; idx?: number; currencyCode?: string }) {
  const imageUrl = getProductPrimaryImage(product);
  const price = getProductMinPrice(product);
  return (
    <Link href={`/p/${product.slug}`} className="candy-product-card reveal-up" style={{ transitionDelay: `${idx * 60}ms` }}>
      <div className="candy-product-image-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s ease" }} loading="lazy" />
        ) : (
          <div className="candy-product-no-image">🛍</div>
        )}
        <div className="candy-product-overlay">
          <span className="candy-btn candy-btn-primary candy-btn-sm">
            <ShoppingBagIcon /> أضف للسلة
          </span>
        </div>
        {idx < 4 && <span className="candy-product-badge candy-product-badge-new">جديد ✨</span>}
      </div>
      <div className="candy-product-body">
        {product.category && <div className="candy-product-category">{product.category.name}</div>}
        <h3 className="candy-product-title">{product.title}</h3>
        <div className="candy-product-price-row">
          <span className="candy-product-price">{price != null ? formatMoney(price, currencyCode) : "السعر عند الطلب"}</span>
          <div style={{ display: "flex", gap: "2px" }}>{[0,1,2,3,4].map(i => <StarFill key={i} />)}</div>
        </div>
      </div>
    </Link>
  );
}

export default async function FallbackHome() {
  const [bootstrap, cats, productsResult] = await Promise.all([
    getBootstrap().catch(() => null),
    getCategoriesTree().catch(() => []),
    listProducts({ page: 1, limit: 12, sort: "newest" as any, lite: true }).catch(() => ({ items: [], total: 0 })),
  ]);

  const siteName = bootstrap?.site?.siteName || "Estabrek Store";
  const currencyCode = bootstrap?.site?.currencyCode || "ILS";
  const products = (productsResult as any).items || [];
  const categories = ((cats as any[]) || []).slice(0, 8);

  const tickerItems = ["شحن مجاني للطلبات فوق 200 ₪","ضمان الجودة على جميع المنتجات","إرجاع مجاني خلال 30 يوم","دعم عملاء 24/7","منتجات أصلية 100%","توصيل سريع لجميع المناطق"];

  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      {/* ═══ HERO ═══ */}
      <section className="candy-hero">
        <div className="candy-hero-bg" />
        <div className="candy-hero-mesh" />
        {/* Floating shapes */}
        <div aria-hidden="true" style={{ position:"absolute",top:"15%",right:"5%",width:"clamp(80px,12vw,160px)",height:"clamp(80px,12vw,160px)",borderRadius:"30% 70% 70% 30% / 30% 30% 70% 70%",background:"linear-gradient(135deg,rgba(124,58,237,0.3),rgba(236,72,153,0.2))",border:"1px solid rgba(124,58,237,0.2)",animation:"orbFloat 8s ease-in-out infinite",backdropFilter:"blur(2px)" }} />
        <div aria-hidden="true" style={{ position:"absolute",bottom:"20%",left:"8%",width:"clamp(50px,8vw,100px)",height:"clamp(50px,8vw,100px)",borderRadius:"70% 30% 30% 70% / 70% 70% 30% 30%",background:"linear-gradient(135deg,rgba(6,182,212,0.3),rgba(124,58,237,0.2))",border:"1px solid rgba(6,182,212,0.2)",animation:"orbFloat 10s ease-in-out infinite reverse" }} />

        <div className="candy-hero-content">
          <div className="candy-hero-badge reveal-up" style={{ transitionDelay:"0ms" }}><SparklesIcon />مجموعة الموسم الجديدة</div>
          <h1 className="candy-hero-title reveal-up" style={{ transitionDelay:"120ms" }}>
            تسوّق بذوق<br /><span style={{ display:"block" }}>وبسعر يناسبك</span>
          </h1>
          <p className="candy-hero-subtitle reveal-up" style={{ transitionDelay:"240ms" }}>
            اكتشف أحدث صيحات الموضة والمنتجات الفريدة في {siteName}. جودة لا تُضاهى بأسعار تُسعد.
          </p>
          <div className="candy-hero-actions reveal-up" style={{ transitionDelay:"360ms" }}>
            <Link href="/shop" className="candy-btn candy-btn-primary candy-btn-lg"><ShoppingBagIcon />تسوق الآن</Link>
            <Link href="/about" className="candy-btn candy-btn-ghost candy-btn-lg">اعرف أكثر <ArrowLeftIcon /></Link>
          </div>
          <div className="candy-hero-stats reveal-up" style={{ transitionDelay:"480ms" }}>
            <div className="candy-hero-stat"><div className="candy-hero-stat-value"><GsapCounter target={10000} suffix="+" /></div><div className="candy-hero-stat-label">عميل سعيد</div></div>
            <div className="candy-hero-stat"><div className="candy-hero-stat-value"><GsapCounter target={500} suffix="+" /></div><div className="candy-hero-stat-label">منتج مميز</div></div>
            <div className="candy-hero-stat"><div className="candy-hero-stat-value"><GsapCounter target={99} suffix="%" /></div><div className="candy-hero-stat-label">رضا العملاء</div></div>
          </div>
        </div>
      </section>

      <CandyTicker items={tickerItems} />

      {/* ═══ FEATURES ═══ */}
      <section className="candy-section">
        <div className="candy-container">
          <GsapStagger className="candy-features-grid">
            {[
              { emoji:"🚀", gradient:"linear-gradient(135deg,#10B981,#06B6D4)", title:"توصيل سريع", desc:"شحن مجاني للطلبات فوق 200 ₪" },
              { emoji:"🔒", gradient:"linear-gradient(135deg,#7C3AED,#EC4899)", title:"دفع آمن 100%", desc:"حماية كاملة لبياناتك" },
              { emoji:"♻️", gradient:"linear-gradient(135deg,#F59E0B,#EF4444)", title:"إرجاع مجاني", desc:"استرداد كامل خلال 30 يوم" },
              { emoji:"💝", gradient:"linear-gradient(135deg,#EC4899,#F97316)", title:"خدمة متميزة", desc:"دعم على مدار الساعة" },
            ].map((f,i) => (
              <div key={i} className="candy-feature-card reveal-scale">
                <div className="candy-feature-icon" style={{ background: f.gradient }}><span style={{ fontSize:"1.5rem" }}>{f.emoji}</span></div>
                <div className="candy-feature-title">{f.title}</div>
                <div className="candy-feature-desc">{f.desc}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      <div className="candy-divider" />

      {/* ═══ CATEGORIES ═══ */}
      {categories.length > 0 && (
        <section className="candy-section">
          <div className="candy-container">
            <GsapReveal>
              <div className="candy-section-eyebrow"><SparklesIcon />تصفح حسب الفئة</div>
              <h2 className="candy-section-title">استكشف <span className="grad">التشكيلة</span></h2>
              <p className="candy-section-desc" style={{ marginBottom:"2rem" }}>من الملابس العصرية إلى الإكسسوارات الفاخرة — كل ما تحتاجه في مكان واحد</p>
            </GsapReveal>
            <GsapStagger className="candy-cat-grid">
              {categories.map((cat: any, i: number) => (
                <Link key={cat.id} href={`/c/${cat.slug}`} className="candy-cat-card reveal-scale">
                  <div className="candy-cat-icon" style={{ background: CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length] }}>
                    {cat.iconUrl ? <img src={cat.iconUrl} alt="" style={{ width:"28px",height:"28px",objectFit:"contain" }} /> : <span>{CAT_EMOJIS[i % CAT_EMOJIS.length]}</span>}
                  </div>
                  <span className="candy-cat-name">{cat.name}</span>
                </Link>
              ))}
              <Link href="/shop" className="candy-cat-card reveal-scale">
                <div className="candy-cat-icon" style={{ background:"rgba(255,255,255,0.05)",border:"1px dashed rgba(255,255,255,0.2)" }}><span style={{ fontSize:"1.25rem",color:"rgba(255,255,255,0.4)" }}>→</span></div>
                <span className="candy-cat-name" style={{ color:"var(--text-muted)" }}>عرض الكل</span>
              </Link>
            </GsapStagger>
          </div>
        </section>
      )}

      <div className="candy-divider" />

      {/* ═══ PRODUCTS ═══ */}
      {products.length > 0 && (
        <section className="candy-section">
          <div className="candy-container">
            <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",marginBottom:"2rem" }}>
              <GsapReveal>
                <div className="candy-section-eyebrow"><SparklesIcon />وصل حديثاً</div>
                <h2 className="candy-section-title">أحدث <span className="grad">المنتجات</span></h2>
              </GsapReveal>
              <GsapReveal><Link href="/shop" className="candy-btn candy-btn-ghost candy-btn-sm">عرض الكل <ArrowLeftIcon /></Link></GsapReveal>
            </div>
            <div className="candy-product-grid">
              {products.slice(0,8).map((p: any, i: number) => <ProductCard key={p.id} product={p} idx={i} currencyCode={currencyCode} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ PROMO BANNER ═══ */}
      <section className="candy-promo">
        <div style={{ position:"relative",zIndex:1 }}>
          <GsapReveal>
            <div style={{ display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.35rem 1rem",borderRadius:"9999px",background:"rgba(245,158,11,0.2)",border:"1px solid rgba(245,158,11,0.4)",color:"#FCD34D",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.08em",marginBottom:"1rem" }}>🔥 عرض محدود</div>
          </GsapReveal>
          <GsapReveal>
            <h2 className="candy-promo-title">خصم حتى <span className="text-gradient-fire">50%</span></h2>
            <p className="candy-promo-sub">على مجموعة مختارة من أفضل المنتجات. لا تفوّت الفرصة!</p>
          </GsapReveal>
          <GsapReveal>
            <div className="candy-countdown">
              {[{num:"02",label:"يوم"},{num:"14",label:"ساعة"},{num:"38",label:"دقيقة"},{num:"55",label:"ثانية"}].map(u => (
                <div key={u.label} className="candy-countdown-unit">
                  <div className="candy-countdown-num">{u.num}</div>
                  <div className="candy-countdown-label">{u.label}</div>
                </div>
              ))}
            </div>
          </GsapReveal>
          <GsapReveal><Link href="/shop" className="candy-btn candy-btn-primary candy-btn-lg"><ShoppingBagIcon />اشترِ الآن</Link></GsapReveal>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="candy-section" style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.08),rgba(236,72,153,0.05),rgba(6,182,212,0.05))",borderTop:"1px solid rgba(124,58,237,0.15)",borderBottom:"1px solid rgba(124,58,237,0.15)" }}>
        <div className="candy-container">
          <GsapReveal className="text-center" style={{ marginBottom:"2.5rem" }}>
            <h2 className="candy-section-title">نتائج <span className="grad">نفخر بها</span></h2>
          </GsapReveal>
          <GsapStagger className="candy-stats-grid">
            {[
              { num:10000, suffix:"+", label:"عميل سعيد", gradient:"linear-gradient(135deg,#7C3AED,#EC4899)" },
              { num:500, suffix:"+", label:"منتج متوفر", gradient:"linear-gradient(135deg,#06B6D4,#7C3AED)" },
              { num:50, suffix:"+", label:"علامة تجارية", gradient:"linear-gradient(135deg,#10B981,#06B6D4)" },
              { num:99, suffix:"%", label:"رضا العملاء", gradient:"linear-gradient(135deg,#F59E0B,#EF4444)" },
            ].map((stat,i) => (
              <div key={i} className="candy-stat-card reveal-scale">
                <div className="candy-stat-number" style={{ background:stat.gradient,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
                  <GsapCounter target={stat.num} suffix={stat.suffix} />
                </div>
                <div className="candy-stat-label">{stat.label}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      {/* ═══ NEWSLETTER ═══ */}
      <section className="candy-section">
        <div className="candy-container" style={{ maxWidth:"700px" }}>
          <GsapReveal className="text-center">
            <div style={{ display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.4rem 1rem",borderRadius:"9999px",background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",color:"var(--candy-violet-light)",fontSize:"0.75rem",fontWeight:700,marginBottom:"1rem" }}>💌 ابقَ على اطلاع</div>
            <h2 className="candy-section-title" style={{ marginBottom:"0.75rem" }}>اشترك في <span className="grad">نشرتنا البريدية</span></h2>
            <p className="candy-section-desc" style={{ margin:"0 auto 1.75rem",textAlign:"center" }}>احصل على أول خبر عن العروض الحصرية والمنتجات الجديدة مباشرة على بريدك</p>
            <form className="candy-newsletter" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="بريدك الإلكتروني" className="candy-newsletter-input" dir="rtl" />
              <button type="submit" className="candy-btn candy-btn-primary">اشتراك</button>
            </form>
            <p style={{ marginTop:"0.75rem",fontSize:"0.72rem",color:"var(--text-muted)" }}>لن نرسل لك بريداً غير مرغوب فيه. يمكنك إلغاء الاشتراك في أي وقت.</p>
          </GsapReveal>
        </div>
      </section>

      <div style={{ height:"env(safe-area-inset-bottom,0px)" }} />
    </main>
  );
}
