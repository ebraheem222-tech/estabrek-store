"use client";
import React, { useState } from "react";
import Link from "next/link";
import { GsapReveal, GsapStagger, FloatingOrbs } from "./candy/GsapAnimations";

export default function FallbackContact() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1500);
  };

  return (
    <div className="candy-page" dir="rtl">
      <FloatingOrbs />

      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">تواصل معنا</span>
      </nav>

      <section className="candy-page-hero" style={{ textAlign:"center" }}>
        <div className="candy-page-hero-bg" />
        <div className="candy-page-hero-content" style={{ textAlign:"center" }}>
          <GsapReveal>
            <div className="candy-hero-badge" style={{ justifyContent:"center",marginBottom:"1rem" }}>📬 نحن هنا</div>
            <h1 className="candy-hero-title" style={{ fontSize:"clamp(2rem,7vw,4rem)" }}>
              تواصل <span className="text-gradient-hero">معنا</span>
            </h1>
            <p className="candy-hero-subtitle">نحن دائماً مستعدون لمساعدتك. راسلنا وسنرد في أقرب وقت ممكن</p>
          </GsapReveal>
        </div>
      </section>

      <section className="candy-section">
        <div className="candy-container">
          <div className="candy-contact-grid">

            {/* INFO */}
            <GsapReveal type="left">
              <div style={{ display:"flex",flexDirection:"column",gap:"1.25rem" }}>
                <h2 className="candy-section-title" style={{ marginBottom:"0.5rem" }}>معلومات <span className="text-gradient-hero">التواصل</span></h2>
                <p style={{ color:"var(--text-secondary)",lineHeight:1.7,fontSize:"0.9rem",marginBottom:"0.5rem" }}>
                  يسعدنا سماعك! سواء كان لديك سؤال أو ملاحظة أو تريد معرفة المزيد عن منتجاتنا، فريق خدمة العملاء لدينا جاهز لمساعدتك.
                </p>
                {[
                  { emoji:"📧", label:"البريد الإلكتروني", val:"info@estabrek.com" },
                  { emoji:"📱", label:"الهاتف / واتساب", val:"+970 59 000 0000" },
                  { emoji:"📍", label:"الموقع", val:"فلسطين — القدس" },
                  { emoji:"⏰", label:"ساعات العمل", val:"الأحد - الخميس، 9 ص - 6 م" },
                ].map((info,i) => (
                  <div key={i} className="candy-card" style={{ padding:"1rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem" }}>
                    <div style={{ width:48,height:48,minWidth:48,borderRadius:"var(--radius-md)",background:"linear-gradient(135deg,rgba(124,58,237,0.25),rgba(236,72,153,0.15))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem" }}>{info.emoji}</div>
                    <div>
                      <div style={{ fontSize:"0.72rem",color:"var(--text-muted)",fontWeight:600,marginBottom:"0.2rem" }}>{info.label}</div>
                      <div style={{ fontSize:"0.9rem",color:"var(--text-primary)",fontWeight:600 }}>{info.val}</div>
                    </div>
                  </div>
                ))}

                {/* Social */}
                <div style={{ display:"flex",gap:"0.75rem",marginTop:"0.5rem" }}>
                  {["📘 Facebook","📸 Instagram","🐦 Twitter","💬 WhatsApp"].map((s) => (
                    <button key={s} className="candy-btn candy-btn-ghost candy-btn-sm" style={{ fontSize:"0.7rem" }}>{s}</button>
                  ))}
                </div>
              </div>
            </GsapReveal>

            {/* FORM */}
            <GsapReveal>
              {sent ? (
                <div className="candy-card" style={{ padding:"3rem 2rem",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem" }}>
                  <div style={{ fontSize:"4rem" }}>✅</div>
                  <h3 style={{ fontSize:"1.25rem",fontWeight:800,color:"var(--text-primary)" }}>تم إرسال رسالتك!</h3>
                  <p style={{ color:"var(--text-secondary)",fontSize:"0.9rem",maxWidth:300 }}>شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن خلال 24 ساعة.</p>
                  <button onClick={() => setSent(false)} className="candy-btn candy-btn-ghost candy-btn-sm">إرسال رسالة أخرى</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="candy-card" style={{ padding:"2rem 1.5rem" }}>
                  <h3 style={{ fontSize:"1.1rem",fontWeight:800,color:"var(--text-primary)",marginBottom:"1.5rem" }}>أرسل لنا رسالة ✉️</h3>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>
                    <div className="candy-form-group">
                      <label className="candy-form-label">الاسم الكامل *</label>
                      <input required type="text" className="candy-form-input" placeholder="اسمك" />
                    </div>
                    <div className="candy-form-group">
                      <label className="candy-form-label">رقم الهاتف</label>
                      <input type="tel" className="candy-form-input" placeholder="+970 xx xxx xxxx" />
                    </div>
                  </div>
                  <div className="candy-form-group">
                    <label className="candy-form-label">البريد الإلكتروني *</label>
                    <input required type="email" className="candy-form-input" placeholder="your@email.com" />
                  </div>
                  <div className="candy-form-group">
                    <label className="candy-form-label">الموضوع *</label>
                    <select required className="candy-form-input" style={{ cursor:"pointer" }}>
                      <option value="">اختر موضوع الرسالة</option>
                      <option>استفسار عن منتج</option>
                      <option>طلب خاص</option>
                      <option>شكوى أو ملاحظة</option>
                      <option>شراكة تجارية</option>
                      <option>أخرى</option>
                    </select>
                  </div>
                  <div className="candy-form-group">
                    <label className="candy-form-label">الرسالة *</label>
                    <textarea required className="candy-form-input candy-form-textarea" placeholder="اكتب رسالتك هنا..." />
                  </div>
                  <button type="submit" disabled={loading} className="candy-btn candy-btn-primary" style={{ width:"100%",marginTop:"0.5rem" }}>
                    {loading ? "⏳ جاري الإرسال..." : "📤 إرسال الرسالة"}
                  </button>
                </form>
              )}
            </GsapReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
