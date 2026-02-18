import React from "react";
import Link from "next/link";
import { getBootstrap } from "@/lib/api";
import { GsapReveal, GsapStagger, GsapCounter, FloatingOrbs } from "@/components/candy/GsapAnimations";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "من نحن", description: "تعرف على قصتنا وقيمنا" };

export default async function AboutPage() {
  const bootstrap = await getBootstrap().catch(() => null);
  const siteName = bootstrap?.site?.siteName || "Estabrek Store";

  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      {/* BREADCRUMB */}
      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">من نحن</span>
      </nav>

      {/* HERO */}
      <section className="candy-page-hero" style={{ textAlign:"center",paddingBottom:"3rem" }}>
        <div className="candy-page-hero-bg" />
        <div className="candy-page-hero-content" style={{ textAlign:"center" }}>
          <GsapReveal>
            <div className="candy-hero-badge" style={{ justifyContent:"center",marginBottom:"1rem" }}>✨ قصتنا</div>
            <h1 className="candy-hero-title" style={{ fontSize:"clamp(2rem,7vw,4rem)" }}>
              نحن <span className="text-gradient-hero">{siteName}</span>
            </h1>
            <p className="candy-hero-subtitle">
              نسعى لتقديم أفضل تجربة تسوق إلكتروني مع منتجات عالية الجودة وخدمة عملاء متميزة تتجاوز توقعاتك
            </p>
          </GsapReveal>
        </div>
      </section>

      {/* STORY */}
      <section className="candy-section">
        <div className="candy-container">
          <div className="candy-about-story">
            <GsapReveal type="left">
              <div className="candy-section-eyebrow">📖 حكايتنا</div>
              <h2 className="candy-section-title">كيف بدأنا؟</h2>
              <p style={{ color:"var(--text-secondary)",lineHeight:1.8,marginBottom:"1rem",fontSize:"0.95rem" }}>
                بدأت رحلتنا بهدف واحد بسيط: جعل التسوق الإلكتروني تجربة ممتعة وموثوقة للجميع. نؤمن بأن كل عميل يستحق الحصول على منتجات عالية الجودة بأسعار عادلة مع خدمة استثنائية.
              </p>
              <p style={{ color:"var(--text-secondary)",lineHeight:1.8,marginBottom:"1.5rem",fontSize:"0.95rem" }}>
                على مدار السنوات، نمت عائلتنا من فريق صغير متحمس إلى مجتمع كبير يضم آلاف العملاء السعداء. نفخر بأننا نقدم تشكيلة واسعة من المنتجات المميزة التي تلبي احتياجات مختلف الأذواق.
              </p>
              <Link href="/shop" className="candy-btn candy-btn-primary">
                🛍 تصفح المنتجات
              </Link>
            </GsapReveal>
            <GsapReveal>
              <div className="candy-about-image-placeholder">
                <span style={{ fontSize:"4rem" }}>🏪</span>
                <span style={{ fontWeight:700,fontSize:"1.1rem",color:"var(--text-secondary)" }}>فريقنا المتميز</span>
                <span style={{ fontSize:"0.82rem",color:"var(--text-muted)",maxWidth:200,textAlign:"center" }}>نعمل بشغف لتقديم أفضل تجربة تسوق ممكنة</span>
                <div style={{ position:"absolute",top:"-20px",right:"-20px",width:120,height:120,borderRadius:"50%",background:"linear-gradient(135deg,rgba(124,58,237,0.3),transparent 70%)" }} />
                <div style={{ position:"absolute",bottom:"-20px",left:"-20px",width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,rgba(236,72,153,0.3),transparent 70%)" }} />
              </div>
            </GsapReveal>
          </div>
        </div>
      </section>

      <div className="candy-divider" />

      {/* VALUES */}
      <section className="candy-section">
        <div className="candy-container">
          <GsapReveal className="text-center" style={{ marginBottom:"2.5rem" }}>
            <div className="candy-section-eyebrow" style={{ justifyContent:"center" }}>💎 ما نؤمن به</div>
            <h2 className="candy-section-title">قيمنا <span className="text-gradient-hero">الأساسية</span></h2>
            <p className="candy-section-desc" style={{ margin:"0 auto" }}>المبادئ التي تقود كل قرار نتخذه وكل خدمة نقدمها</p>
          </GsapReveal>
          <GsapStagger className="candy-values-grid">
            {[
              { emoji:"🚀",gradient:"linear-gradient(135deg,#10B981,#06B6D4)",title:"الالتزام",desc:"نلتزم بتوصيل طلباتكم في الوقت المحدد مع الحفاظ على جودة المنتجات" },
              { emoji:"🔒",gradient:"linear-gradient(135deg,#7C3AED,#EC4899)",title:"الثقة",desc:"نبني علاقات طويلة الأمد مع عملائنا من خلال الشفافية والصدق التام" },
              { emoji:"⭐",gradient:"linear-gradient(135deg,#F59E0B,#EF4444)",title:"الجودة",desc:"نختار بعناية كل منتج نقدمه لضمان أعلى معايير الجودة الممكنة" },
              { emoji:"💝",gradient:"linear-gradient(135deg,#EC4899,#F97316)",title:"العناية",desc:"نهتم برضا كل عميل ونسعى لتجاوز توقعاتكم دائماً" },
            ].map((v,i) => (
              <div key={i} className="candy-value-card reveal-scale">
                <div className="candy-value-icon" style={{ background:v.gradient }}><span style={{ fontSize:"1.5rem" }}>{v.emoji}</span></div>
                <div style={{ fontWeight:800,fontSize:"0.95rem",color:"var(--text-primary)",marginBottom:"0.5rem" }}>{v.title}</div>
                <div style={{ fontSize:"0.8rem",color:"var(--text-muted)",lineHeight:1.6 }}>{v.desc}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      {/* STATS */}
      <section className="candy-section" style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.08),rgba(236,72,153,0.05))",borderTop:"1px solid rgba(124,58,237,0.15)",borderBottom:"1px solid rgba(124,58,237,0.15)" }}>
        <div className="candy-container">
          <GsapStagger className="candy-stats-grid">
            {[
              { num:10000, suffix:"+", label:"عميل سعيد", grad:"linear-gradient(135deg,#7C3AED,#EC4899)" },
              { num:500, suffix:"+", label:"منتج متوفر", grad:"linear-gradient(135deg,#06B6D4,#7C3AED)" },
              { num:50, suffix:"+", label:"علامة تجارية", grad:"linear-gradient(135deg,#10B981,#06B6D4)" },
              { num:5, suffix:" سنوات", label:"من الخبرة", grad:"linear-gradient(135deg,#F59E0B,#EF4444)" },
            ].map((s,i) => (
              <div key={i} className="candy-stat-card reveal-scale">
                <div className="candy-stat-number" style={{ background:s.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
                  <GsapCounter target={s.num} suffix={s.suffix} />
                </div>
                <div className="candy-stat-label">{s.label}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      {/* CTA */}
      <section className="candy-section" style={{ textAlign:"center" }}>
        <div className="candy-container" style={{ maxWidth:600 }}>
          <GsapReveal>
            <h2 className="candy-section-title">ابدأ رحلة <span className="text-gradient-hero">التسوق معنا</span></h2>
            <p className="candy-section-desc" style={{ margin:"0 auto 2rem" }}>اكتشف مجموعتنا المميزة من المنتجات واستمتع بتجربة تسوق فريدة لن تنساها</p>
            <div style={{ display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap" }}>
              <Link href="/shop" className="candy-btn candy-btn-primary candy-btn-lg">🛍 تصفح المنتجات</Link>
              <Link href="/contact" className="candy-btn candy-btn-ghost candy-btn-lg">📞 تواصل معنا</Link>
            </div>
          </GsapReveal>
        </div>
      </section>
    </main>
  );
}
