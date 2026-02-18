import React from "react";
import Link from "next/link";
import { GsapReveal, GsapStagger, GsapCounter, FloatingOrbs } from "@/components/candy/GsapAnimations";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "من نحن | إستبرق", description: "تعرف على قصتنا وقيمنا في إستبرق ستور" };

const VALUES = [
  { emoji:"🚀", grad:"linear-gradient(135deg,#10B981,#06B6D4)", title:"الالتزام", desc:"نلتزم بتوصيل طلباتكم في الوقت المحدد مع الحفاظ على أعلى معايير الجودة" },
  { emoji:"🔒", grad:"linear-gradient(135deg,#7C3AED,#EC4899)", title:"الثقة",     desc:"نبني علاقات طويلة الأمد مع عملائنا عبر الشفافية الكاملة والصدق دائماً" },
  { emoji:"⭐", grad:"linear-gradient(135deg,#F59E0B,#EF4444)", title:"الجودة",   desc:"نختار بعناية كل منتج نقدمه لضمان أعلى معايير الجودة الممكنة لعملائنا" },
  { emoji:"💝", grad:"linear-gradient(135deg,#EC4899,#F97316)", title:"العناية",  desc:"نهتم برضا كل عميل ونسعى دوماً لتجاوز توقعاتكم في كل تفاصيل الخدمة" },
];

const TEAM = [
  { name:"أحمد الناصر",  role:"المدير التنفيذي",       emoji:"👨‍💼", grad:"linear-gradient(135deg,#7C3AED,#EC4899)" },
  { name:"سارة المحمود", role:"رئيسة خدمة العملاء",    emoji:"👩‍💻", grad:"linear-gradient(135deg,#06B6D4,#4F46E5)" },
  { name:"خالد السعيد",  role:"مدير المنتجات",          emoji:"👨‍🔧", grad:"linear-gradient(135deg,#10B981,#06B6D4)" },
  { name:"نور الرشيد",   role:"مديرة التسويق",          emoji:"👩‍🎨", grad:"linear-gradient(135deg,#F59E0B,#EF4444)" },
];

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      {/* Breadcrumb */}
      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">من نحن</span>
      </nav>

      {/* Hero */}
      <section className="candy-hero" style={{ minHeight:"55vh",paddingTop:"60px",paddingBottom:"3rem" }}>
        <div className="candy-hero-bg" />
        <div className="candy-hero-mesh" />
        <div className="candy-hero-content">
          <div className="candy-hero-badge reveal-up">✨ قصتنا معكم</div>
          <h1 className="candy-hero-title reveal-up" style={{ transitionDelay:"100ms",fontSize:"clamp(2rem,8vw,4.5rem)" }}>
            نحن <span className="grad">إستبرق</span>
          </h1>
          <p className="candy-hero-subtitle reveal-up" style={{ transitionDelay:"200ms" }}>
            نسعى لتقديم أفضل تجربة تسوق إلكتروني مع منتجات عالية الجودة وخدمة عملاء تتجاوز توقعاتك دائماً
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="candy-section">
        <div className="candy-container">
          <div className="candy-about-story">
            <GsapReveal type="left">
              <div className="candy-section-eyebrow">📖 حكايتنا</div>
              <h2 className="candy-section-title">كيف بدأت <span className="grad">رحلتنا؟</span></h2>
              <p style={{ color:"var(--text-secondary)",lineHeight:1.85,marginBottom:"1.1rem",fontSize:"0.95rem" }}>
                بدأت رحلتنا بهدف واحد بسيط: جعل التسوق الإلكتروني تجربة ممتعة وموثوقة للجميع.
                نؤمن بأن كل عميل يستحق الحصول على منتجات عالية الجودة بأسعار عادلة مع خدمة استثنائية.
              </p>
              <p style={{ color:"var(--text-secondary)",lineHeight:1.85,marginBottom:"1.75rem",fontSize:"0.95rem" }}>
                على مدار السنوات، نمت عائلتنا من فريق صغير متحمس إلى مجتمع كبير يضم آلاف العملاء السعداء.
                نفخر بأننا نقدم تشكيلة واسعة من المنتجات المميزة التي تلبي احتياجات مختلف الأذواق والميزانيات.
              </p>
              <div style={{ display:"flex",gap:"0.85rem",flexWrap:"wrap" }}>
                <Link href="/shop" className="candy-btn candy-btn-primary">🛍 تصفح المنتجات</Link>
                <Link href="/contact" className="candy-btn candy-btn-outline">📞 تواصل معنا</Link>
              </div>
            </GsapReveal>

            <GsapReveal>
              <div className="candy-about-image-placeholder">
                <span style={{ fontSize:"4.5rem",filter:"drop-shadow(0 4px 12px rgba(124,58,237,0.25))" }}>🏪</span>
                <span style={{ fontWeight:800,fontSize:"1.1rem",color:"var(--text-secondary)" }}>فريقنا المتميز</span>
                <span style={{ fontSize:"0.82rem",color:"var(--text-muted)",maxWidth:200,textAlign:"center",lineHeight:1.6 }}>نعمل بشغف لتقديم أفضل تجربة تسوق ممكنة لك ولعائلتك</span>
                {/* Decorative */}
                <div style={{ position:"absolute",top:-15,right:-15,width:90,height:90,borderRadius:"50%",background:"linear-gradient(135deg,rgba(124,58,237,0.2),transparent 70%)" }} />
                <div style={{ position:"absolute",bottom:-15,left:-15,width:65,height:65,borderRadius:"50%",background:"linear-gradient(135deg,rgba(236,72,153,0.2),transparent 70%)" }} />
              </div>
            </GsapReveal>
          </div>
        </div>
      </section>

      <div className="candy-divider" />

      {/* Values */}
      <section className="candy-section candy-section-alt">
        <div className="candy-container">
          <GsapReveal style={{ textAlign:"center",marginBottom:"2.5rem" }}>
            <div className="candy-section-eyebrow" style={{ justifyContent:"center" }}>💎 ما نؤمن به</div>
            <h2 className="candy-section-title">قيمنا <span className="grad">الأساسية</span></h2>
            <p className="candy-section-desc" style={{ margin:"0 auto" }}>المبادئ التي تقود كل قرار نتخذه وكل خدمة نقدمها لكم</p>
          </GsapReveal>
          <GsapStagger className="candy-values-grid">
            {VALUES.map((v,i)=>(
              <div key={i} className="candy-value-card reveal-scale">
                <div className="candy-value-icon" style={{ background:v.grad }}><span style={{ fontSize:"1.5rem" }}>{v.emoji}</span></div>
                <div style={{ fontWeight:800,fontSize:"0.95rem",color:"var(--text-primary)",marginBottom:"0.5rem" }}>{v.title}</div>
                <div style={{ fontSize:"0.8rem",color:"var(--text-muted)",lineHeight:1.65 }}>{v.desc}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      {/* Stats */}
      <section className="candy-section candy-section-purple-light">
        <div className="candy-container">
          <GsapReveal style={{ textAlign:"center",marginBottom:"2rem" }}>
            <h2 className="candy-section-title">أرقامنا <span className="grad">تتحدث</span></h2>
          </GsapReveal>
          <GsapStagger className="candy-stats-grid">
            {[
              {num:10000,suf:"+",lab:"عميل سعيد",   grad:"linear-gradient(135deg,#7C3AED,#EC4899)"},
              {num:500,  suf:"+",lab:"منتج متوفر", grad:"linear-gradient(135deg,#06B6D4,#4F46E5)"},
              {num:50,   suf:"+",lab:"علامة تجارية",grad:"linear-gradient(135deg,#10B981,#06B6D4)"},
              {num:5,    suf:" سنوات",lab:"خبرة",   grad:"linear-gradient(135deg,#F59E0B,#EF4444)"},
            ].map((s,i)=>(
              <div key={i} className="candy-stat-card reveal-scale">
                <div className="candy-stat-number" style={{ background:s.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
                  <GsapCounter target={s.num} suffix={s.suf} />
                </div>
                <div className="candy-stat-label">{s.lab}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      <div className="candy-divider" />

      {/* Team */}
      <section className="candy-section">
        <div className="candy-container">
          <GsapReveal style={{ textAlign:"center",marginBottom:"2.5rem" }}>
            <div className="candy-section-eyebrow" style={{ justifyContent:"center" }}>👥 فريقنا</div>
            <h2 className="candy-section-title">الأشخاص <span className="grad">خلف النجاح</span></h2>
          </GsapReveal>
          <GsapStagger style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"1rem" }} className="">
            {TEAM.map((m,i)=>(
              <div key={i} className="candy-card reveal-scale" style={{ padding:"1.5rem",textAlign:"center" }}>
                <div style={{ width:72,height:72,borderRadius:"50%",background:m.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem",margin:"0 auto 0.85rem",boxShadow:"0 8px 24px rgba(124,58,237,0.2)" }}>
                  {m.emoji}
                </div>
                <div style={{ fontWeight:800,fontSize:"0.95rem",color:"var(--text-primary)",marginBottom:"0.3rem" }}>{m.name}</div>
                <div style={{ fontSize:"0.78rem",color:"var(--text-muted)" }}>{m.role}</div>
              </div>
            ))}
          </GsapStagger>
        </div>
      </section>

      {/* CTA */}
      <section className="candy-section" style={{ textAlign:"center",background:"linear-gradient(135deg,#7C3AED,#EC4899,#F59E0B)",color:"#fff" }}>
        <div className="candy-container" style={{ maxWidth:620 }}>
          <GsapReveal>
            <h2 style={{ fontSize:"clamp(1.6rem,5vw,2.5rem)",fontWeight:900,color:"#fff",marginBottom:"0.8rem" }}>ابدأ رحلة التسوق معنا</h2>
            <p style={{ color:"rgba(255,255,255,0.85)",lineHeight:1.75,marginBottom:"2rem",fontSize:"0.95rem" }}>اكتشف مجموعتنا المميزة من المنتجات واستمتع بتجربة تسوق فريدة</p>
            <div style={{ display:"flex",gap:"1rem",justifyContent:"center",flexWrap:"wrap" }}>
              <Link href="/shop" className="candy-btn candy-btn-white candy-btn-lg">🛍 تصفح المنتجات</Link>
              <Link href="/contact" style={{ display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"1rem 2rem",borderRadius:"9999px",border:"2px solid rgba(255,255,255,0.5)",color:"#fff",fontWeight:700,textDecoration:"none" }}>
                📞 تواصل معنا
              </Link>
            </div>
          </GsapReveal>
        </div>
      </section>
    </main>
  );
}
