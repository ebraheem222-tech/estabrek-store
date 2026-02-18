import React from "react";
import Link from "next/link";
import { getCategoriesTree, listProducts } from "@/lib/api";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";
import type { CatalogProduct } from "@/lib/catalog";
import { GsapReveal, GsapStagger, GsapCounter, FloatingOrbs, CandyTicker, SuperProductCard } from "./candy/GsapAnimations";

const CAT_GRADS = [
  "linear-gradient(135deg,#7C3AED,#EC4899)","linear-gradient(135deg,#06B6D4,#4F46E5)",
  "linear-gradient(135deg,#10B981,#06B6D4)","linear-gradient(135deg,#F59E0B,#EF4444)",
  "linear-gradient(135deg,#EC4899,#F97316)","linear-gradient(135deg,#F97316,#F59E0B)",
  "linear-gradient(135deg,#4F46E5,#A78BFA)","linear-gradient(135deg,#10B981,#A78BFA)",
];
const CAT_EMOJIS = ["👗","👟","💄","🎒","⌚","💎","🛍","🎯"];

const TICKER_ITEMS = [
  "🚚 شحن مجاني للطلبات فوق 200 ₪","⭐ ضمان الجودة على جميع المنتجات",
  "♻️ إرجاع مجاني خلال 30 يوم","💬 دعم عملاء 24/7",
  "✅ منتجات أصلية 100%","🏃 توصيل سريع لجميع المناطق",
];

const FEATURES = [
  { emoji:"🚀", grad:"linear-gradient(135deg,#10B981,#06B6D4)", title:"توصيل سريع ومضمون", desc:"نصل إليك في أسرع وقت مع شحن مجاني للطلبات فوق 200 ₪" },
  { emoji:"🔒", grad:"linear-gradient(135deg,#7C3AED,#EC4899)", title:"دفع آمن 100%",      desc:"جميع معاملاتك محمية بتشفير SSL من الدرجة الأولى" },
  { emoji:"♻️", grad:"linear-gradient(135deg,#F59E0B,#EF4444)", title:"إرجاع مجاني",       desc:"غير رأيك؟ أرجع أي منتج خلال 30 يوماً بدون أسئلة" },
  { emoji:"💝", grad:"linear-gradient(135deg,#EC4899,#F97316)", title:"خدمة عملاء مميزة",  desc:"فريقنا المتخصص جاهز لمساعدتك على مدار الساعة" },
];

const TESTIMONIALS = [
  { name:"سارة أحمد", role:"مصممة أزياء",   text:"تجربة تسوق استثنائية! المنتجات بجودة عالية جداً وخدمة العملاء ممتازة. سأعود بالتأكيد.", stars:5, av:"سا" },
  { name:"محمد العلي", role:"رجل أعمال",   text:"أنصح الجميع بهذا المتجر. التوصيل سريع والمنتجات تطابق الوصف تماماً. خدمة 10/10.",     stars:5, av:"مع" },
  { name:"نور الرشيد", role:"طالبة جامعية", text:"وجدت كل ما أحتاجه بأسعار معقولة جداً. الإرجاع كان سهلاً ومريحاً. شكراً لكم!",       stars:5, av:"نر" },
];

function HeroShape({ style }: { style: React.CSSProperties }) {
  return <div aria-hidden="true" style={style} />;
}

/* Helper: get hex swatches from product */
function getSwatches(product: CatalogProduct): string[] {
  return ((product.items ?? []) as any[]).map((item: any) => {
    if (item.colorHex) return item.colorHex;
    if (item.suggestedColors?.[0]) return `#${item.suggestedColors[0].replace("#","")}`;
    return null;
  }).filter(Boolean) as string[];
}

export default async function FallbackHome() {
  const [cats, productsRes] = await Promise.all([
    getCategoriesTree().catch(() => []),
    listProducts({ page: 1, limit: 16, sort: "newest" as any, lite: true }).catch(() => ({ items: [], total: 0 })),
  ]);
  const products = ((productsRes as any).items || []) as CatalogProduct[];
  const categories = ((cats as any[]) || []).slice(0, 8);
  const currencyCode = "ILS";

  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      {/* ═══════ HERO ═══════ */}
      <section className="candy-hero">
        <div className="candy-hero-bg" />
        <div className="candy-hero-mesh" />

        <HeroShape style={{ position:"absolute",top:"12%",right:"3%",width:"clamp(90px,14vw,180px)",height:"clamp(90px,14vw,180px)",borderRadius:"60% 40% 40% 60% / 50% 50% 60% 40%",background:"linear-gradient(135deg,rgba(167,139,250,0.3),rgba(249,168,212,0.15))",border:"1px solid rgba(124,58,237,0.12)",animation:"orbFloat 9s ease-in-out infinite" }} />
        <HeroShape style={{ position:"absolute",bottom:"18%",left:"4%",width:"clamp(55px,9vw,110px)",height:"clamp(55px,9vw,110px)",borderRadius:"40% 60% 60% 40% / 60% 40% 60% 40%",background:"linear-gradient(135deg,rgba(103,232,249,0.3),rgba(167,139,250,0.2))",border:"1px solid rgba(6,182,212,0.15)",animation:"orbFloat 12s ease-in-out infinite reverse" }} />
        <HeroShape style={{ position:"absolute",top:"50%",left:"6%",width:"clamp(30px,5vw,60px)",height:"clamp(30px,5vw,60px)",borderRadius:"50%",background:"linear-gradient(135deg,#FCD34D,#F59E0B)",opacity:0.4,animation:"orbFloat 7s ease-in-out infinite 2s" }} />

        <div className="candy-hero-content">
          <div className="candy-hero-badge reveal-up">✨ مجموعة الموسم الجديدة 2025</div>
          <h1 className="candy-hero-title reveal-up" style={{ transitionDelay:"100ms" }}>
            تسوّق بذوق<br /><span className="grad">وبسعر يناسبك</span>
          </h1>
          <p className="candy-hero-subtitle reveal-up" style={{ transitionDelay:"200ms" }}>
            آلاف المنتجات المميزة في مكان واحد — ملابس، إكسسوارات، وأكثر.
            جودة لا تُضاهى مع خدمة توصيل سريعة وموثوقة.
          </p>
          <div className="candy-hero-actions reveal-up" style={{ transitionDelay:"300ms" }}>
            <Link href="/shop" className="candy-btn candy-btn-primary candy-btn-lg">🛍 تسوق الآن</Link>
            <Link href="/about" className="candy-btn candy-btn-outline candy-btn-lg">اعرف أكثر →</Link>
          </div>
          <div className="candy-hero-stats reveal-up" style={{ transitionDelay:"420ms" }}>
            {[{t:10000,s:"+",l:"عميل سعيد"},{t:500,s:"+",l:"منتج مميز"},{t:99,s:"%",l:"رضا العملاء"}].map((st,i)=>(
              <div key={i} className="candy-hero-stat">
                <div className="candy-hero-stat-value"><GsapCounter target={st.t} suffix={st.s} /></div>
                <div className="candy-hero-stat-label">{st.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TICKER ═══════ */}
      <CandyTicker items={TICKER_ITEMS} />

      {/* ═══════ FEATURES ═══════ */}
      <section className="candy-section">
        <div className="candy-container">
          <GsapStagger className="candy-features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="candy-feature-card reveal-scale">
                <div className="candy-feature-icon" style={{ background: f.grad }}><span style={{ fontSize:"1.5rem" }}>{f.emoji}</span></div>
                <div className="candy-feature-title">{f.title}</div>
                <div className="candy-feature-desc">{f.desc}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      <div className="candy-divider" />

      {/* ═══════ CATEGORIES ═══════ */}
      {categories.length > 0 && (
        <section className="candy-section candy-section-alt">
          <div className="candy-container">
            <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",marginBottom:"2rem" }}>
              <GsapReveal>
                <div className="candy-section-eyebrow">📦 تصفح حسب الفئة</div>
                <h2 className="candy-section-title">استكشف <span className="grad">التشكيلة</span></h2>
              </GsapReveal>
              <GsapReveal><Link href="/shop" className="candy-btn candy-btn-outline candy-btn-sm">عرض الكل →</Link></GsapReveal>
            </div>
            <GsapStagger className="candy-cat-grid">
              {categories.map((cat: any, i: number) => (
                <Link key={cat.id} href={`/c/${cat.slug}`} className="candy-cat-card reveal-scale">
                  <div className="candy-cat-icon" style={{ background: CAT_GRADS[i % CAT_GRADS.length] }}>
                    {cat.iconUrl ? <img src={cat.iconUrl} alt="" style={{ width:28,height:28,objectFit:"contain" }} /> : <span>{CAT_EMOJIS[i % CAT_EMOJIS.length]}</span>}
                  </div>
                  <span className="candy-cat-name">{cat.name}</span>
                </Link>
              ))}
              <Link href="/shop" className="candy-cat-card reveal-scale" style={{ borderStyle:"dashed" }}>
                <div className="candy-cat-icon" style={{ background:"rgba(124,58,237,0.06)",border:"1.5px dashed rgba(124,58,237,0.2)" }}>
                  <span style={{ fontSize:"1.3rem",color:"rgba(124,58,237,0.4)" }}>→</span>
                </div>
                <span className="candy-cat-name">عرض الكل</span>
              </Link>
            </GsapStagger>
          </div>
        </section>
      )}

      <div className="candy-divider" />

      {/* ═══════ NEW ARRIVALS — SuperProductCard ═══════ */}
      {products.length > 0 && (
        <section className="candy-section">
          <div className="candy-container">
            <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",marginBottom:"2rem" }}>
              <GsapReveal>
                <div className="candy-section-eyebrow">🆕 وصل حديثاً</div>
                <h2 className="candy-section-title">أحدث <span className="grad">المنتجات</span></h2>
              </GsapReveal>
              <GsapReveal><Link href="/shop" className="candy-btn candy-btn-outline candy-btn-sm">عرض الكل →</Link></GsapReveal>
            </div>
            <div className="candy-product-grid">
              {products.slice(0, 8).map((p, i) => {
                const img = getProductPrimaryImage(p);
                const price = getProductMinPrice(p);
                return (
                  <SuperProductCard
                    key={p.id}
                    href={`/p/${p.slug}`}
                    image={img}
                    title={p.title}
                    price={price != null ? formatMoney(price, currencyCode) : null}
                    category={(p as any).category?.name}
                    isNew={i < 4}
                    colorSwatches={getSwatches(p)}
                    idx={i}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ PROMO BANNER ═══════ */}
      <section className="candy-promo">
        <div style={{ position:"relative",zIndex:1 }}>
          <GsapReveal>
            <div style={{ display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.38rem 1rem",borderRadius:"9999px",background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(239,68,68,0.1))",border:"1.5px solid rgba(245,158,11,0.3)",color:"#B45309",fontSize:"0.75rem",fontWeight:800,marginBottom:"1rem" }}>
              🔥 عروض حصرية محدودة
            </div>
            <h2 className="candy-promo-title">خصم يصل إلى <span className="text-gradient-fire">50%</span></h2>
            <p className="candy-promo-sub">على مجموعة مختارة من أفضل المنتجات. العرض لفترة محدودة!</p>
          </GsapReveal>
          <GsapReveal>
            <div className="candy-countdown">
              {[{n:"02",l:"يوم"},{n:"14",l:"ساعة"},{n:"38",l:"دقيقة"},{n:"55",l:"ثانية"}].map(u=>(
                <div key={u.l} className="candy-countdown-unit">
                  <div className="candy-countdown-num">{u.n}</div>
                  <div className="candy-countdown-label">{u.l}</div>
                </div>
              ))}
            </div>
          </GsapReveal>
          <GsapReveal><Link href="/shop" className="candy-btn candy-btn-primary candy-btn-lg">🛒 اشتري الآن</Link></GsapReveal>
        </div>
      </section>

      {/* ═══════ BEST SELLERS ═══════ */}
      {products.length > 4 && (
        <section className="candy-section candy-section-alt">
          <div className="candy-container">
            <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",marginBottom:"2rem" }}>
              <GsapReveal>
                <div className="candy-section-eyebrow">⭐ الأكثر مبيعاً</div>
                <h2 className="candy-section-title"><span className="grad">مفضلات</span> العملاء</h2>
              </GsapReveal>
              <GsapReveal><Link href="/shop" className="candy-btn candy-btn-outline candy-btn-sm">عرض الكل →</Link></GsapReveal>
            </div>
            <div className="candy-product-grid">
              {products.slice(4, 12).map((p, i) => {
                const img = getProductPrimaryImage(p);
                const price = getProductMinPrice(p);
                return (
                  <SuperProductCard
                    key={p.id}
                    href={`/p/${p.slug}`}
                    image={img}
                    title={p.title}
                    price={price != null ? formatMoney(price, currencyCode) : null}
                    category={(p as any).category?.name}
                    badge={i === 0 ? "🔥 الأكثر مبيعاً" : undefined}
                    colorSwatches={getSwatches(p)}
                    idx={i}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════ STATS ═══════ */}
      <section className="candy-section candy-section-purple-light">
        <div className="candy-container">
          <GsapReveal style={{ textAlign:"center",marginBottom:"2.5rem" }}>
            <div className="candy-section-eyebrow" style={{ justifyContent:"center" }}>📊 أرقامنا تتحدث</div>
            <h2 className="candy-section-title">نتائج <span className="grad">نفخر بها</span></h2>
          </GsapReveal>
          <GsapStagger className="candy-stats-grid">
            {[
              {num:10000,s:"+",l:"عميل سعيد",  g:"linear-gradient(135deg,#7C3AED,#EC4899)"},
              {num:500,  s:"+",l:"منتج متوفر",g:"linear-gradient(135deg,#06B6D4,#4F46E5)"},
              {num:50,   s:"+",l:"علامة تجارية",g:"linear-gradient(135deg,#10B981,#06B6D4)"},
              {num:99,   s:"%",l:"رضا العملاء",g:"linear-gradient(135deg,#F59E0B,#EF4444)"},
            ].map((s,i)=>(
              <div key={i} className="candy-stat-card reveal-scale">
                <div className="candy-stat-number" style={{ background:s.g,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
                  <GsapCounter target={s.num} suffix={s.s} />
                </div>
                <div className="candy-stat-label">{s.l}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      <div className="candy-divider" />

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="candy-section">
        <div className="candy-container">
          <GsapReveal style={{ textAlign:"center",marginBottom:"2.5rem" }}>
            <div className="candy-section-eyebrow" style={{ justifyContent:"center" }}>💬 آراء عملائنا</div>
            <h2 className="candy-section-title">ماذا يقول <span className="grad">عملاؤنا؟</span></h2>
          </GsapReveal>
          <GsapStagger className="candy-testimonials-grid">
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} className="candy-testimonial-card reveal-scale">
                <div style={{ display:"flex",gap:"2px",marginBottom:"0.85rem",marginTop:"1.25rem" }}>
                  {[...Array(t.stars)].map((_,j)=>(
                    <svg key={j} viewBox="0 0 20 20" style={{ width:13,height:13,fill:"#F59E0B" }}><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p style={{ fontSize:"0.88rem",color:"var(--text-secondary)",lineHeight:1.75,marginBottom:"1.1rem" }}>{t.text}</p>
                <div style={{ display:"flex",alignItems:"center",gap:"0.75rem" }}>
                  <div style={{ width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#EC4899)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"0.8rem",flexShrink:0 }}>{t.av}</div>
                  <div>
                    <div style={{ fontWeight:800,fontSize:"0.85rem",color:"var(--text-primary)" }}>{t.name}</div>
                    <div style={{ fontSize:"0.72rem",color:"var(--text-muted)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      {/* ═══════ NEWSLETTER ═══════ */}
      <section className="candy-section candy-section-alt" style={{ textAlign:"center" }}>
        <div className="candy-container" style={{ maxWidth:680 }}>
          <GsapReveal>
            <div style={{ display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0.42rem 1.1rem",borderRadius:"9999px",background:"rgba(124,58,237,0.08)",border:"1.5px solid rgba(124,58,237,0.2)",color:"var(--c-violet)",fontSize:"0.75rem",fontWeight:800,marginBottom:"1.1rem" }}>
              💌 ابقَ على اطلاع دائم
            </div>
            <h2 className="candy-section-title" style={{ marginBottom:"0.75rem" }}>اشترك في <span className="grad">نشرتنا البريدية</span></h2>
            <p className="candy-section-desc" style={{ margin:"0 auto 1.75rem",textAlign:"center" }}>احصل على أول خبر عن العروض الحصرية والمنتجات الجديدة. بدون سبام!</p>
            <form className="candy-newsletter">
              <input type="email" placeholder="بريدك الإلكتروني هنا..." className="candy-newsletter-input" dir="rtl" />
              <button type="submit" className="candy-btn candy-btn-primary">اشتراك مجاني</button>
            </form>
            <p style={{ marginTop:"0.85rem",fontSize:"0.72rem",color:"var(--text-muted)" }}>🔒 معلوماتك محمية تماماً · يمكنك إلغاء الاشتراك في أي وقت</p>
          </GsapReveal>
        </div>
      </section>

      {/* ═══════ CTA FINAL ═══════ */}
      <section className="candy-section" style={{ textAlign:"center",background:"linear-gradient(135deg,#7C3AED,#EC4899,#F59E0B)",color:"#fff" }}>
        <div className="candy-container" style={{ maxWidth:680 }}>
          <GsapReveal>
            <h2 style={{ fontSize:"clamp(1.6rem,5vw,2.6rem)",fontWeight:900,color:"#fff",marginBottom:"0.8rem",letterSpacing:"-0.02em" }}>ابدأ رحلة التسوق اليوم</h2>
            <p style={{ color:"rgba(255,255,255,0.85)",lineHeight:1.75,marginBottom:"2rem",fontSize:"clamp(0.9rem,2.5vw,1.05rem)",maxWidth:480,margin:"0 auto 2rem" }}>
              أكثر من 10,000 عميل سعيد يثقون بنا. انضم إليهم واكتشف تجربة تسوق لا مثيل لها.
            </p>
            <div style={{ display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap" }}>
              <Link href="/shop" className="candy-btn candy-btn-white candy-btn-lg">🛍 تصفح المتجر</Link>
              <Link href="/about" style={{ display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"1rem 2rem",borderRadius:"9999px",border:"2px solid rgba(255,255,255,0.5)",color:"#fff",fontWeight:700,textDecoration:"none" }}>اعرف أكثر عنا →</Link>
            </div>
          </GsapReveal>
        </div>
      </section>
    </main>
  );
}
