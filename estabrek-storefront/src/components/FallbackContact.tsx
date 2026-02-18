"use client";
import React, { useState } from "react";
import Link from "next/link";
import { GsapReveal, FloatingOrbs } from "./candy/GsapAnimations";

const CONTACT_INFO = [
  { emoji:"📧", label:"البريد الإلكتروني", value:"info@estabrek.com",        grad:"linear-gradient(135deg,#7C3AED,#EC4899)" },
  { emoji:"📱", label:"واتساب / هاتف",     value:"+970 59 000 0000",           grad:"linear-gradient(135deg,#10B981,#06B6D4)" },
  { emoji:"📍", label:"موقعنا",             value:"فلسطين — القدس المقدسة",    grad:"linear-gradient(135deg,#F59E0B,#EF4444)" },
  { emoji:"⏰", label:"ساعات العمل",        value:"الأحد–الخميس، 9 ص – 6 م",  grad:"linear-gradient(135deg,#EC4899,#F97316)" },
];

export default function FallbackContact() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", phone:"", subject:"", message:"" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1600);
  };
  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="candy-page" dir="rtl">
      <FloatingOrbs />

      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">تواصل معنا</span>
      </nav>

      {/* Hero */}
      <section className="candy-hero" style={{ minHeight:"50vh",paddingTop:"60px",paddingBottom:"2rem" }}>
        <div className="candy-hero-bg" />
        <div className="candy-hero-mesh" />
        <div className="candy-hero-content">
          <div className="candy-hero-badge reveal-up">📬 نحن هنا لمساعدتك</div>
          <h1 className="candy-hero-title reveal-up" style={{ transitionDelay:"100ms",fontSize:"clamp(2rem,8vw,4rem)" }}>
            تواصل <span className="grad">معنا</span>
          </h1>
          <p className="candy-hero-subtitle reveal-up" style={{ transitionDelay:"200ms" }}>
            فريقنا جاهز للإجابة على جميع استفساراتك. راسلنا وسنرد في أقرب وقت ممكن.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="candy-section" style={{ paddingTop:"2rem" }}>
        <div className="candy-container">
          <div className="candy-contact-grid">

            {/* Info column */}
            <GsapReveal type="left">
              <div>
                <h2 className="candy-section-title" style={{ marginBottom:"0.5rem" }}>
                  معلومات <span className="grad">التواصل</span>
                </h2>
                <p style={{ color:"var(--text-secondary)",lineHeight:1.8,fontSize:"0.9rem",marginBottom:"1.5rem" }}>
                  يسعدنا سماعك! سواء كان لديك سؤال، ملاحظة، أو تريد معرفة المزيد عن منتجاتنا —
                  فريقنا المتخصص جاهز لمساعدتك في أي وقت.
                </p>

                <div style={{ display:"flex",flexDirection:"column",gap:"0.85rem",marginBottom:"1.75rem" }}>
                  {CONTACT_INFO.map((info,i) => (
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:"0.9rem",padding:"1rem 1.1rem",background:"var(--bg-card)",border:"1.5px solid var(--border)",borderRadius:"var(--r-md)",boxShadow:"var(--shadow-xs)",transition:"all 0.25s" }}>
                      <div style={{ width:46,height:46,minWidth:46,borderRadius:"var(--r-md)",background:info.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.25rem" }}>
                        {info.emoji}
                      </div>
                      <div>
                        <div style={{ fontSize:"0.7rem",color:"var(--text-muted)",fontWeight:700,marginBottom:"0.2rem",textTransform:"uppercase",letterSpacing:"0.06em" }}>{info.label}</div>
                        <div style={{ fontSize:"0.88rem",color:"var(--text-primary)",fontWeight:700 }}>{info.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social */}
                <div style={{ display:"flex",gap:"0.65rem",flexWrap:"wrap" }}>
                  {[{emoji:"📘",name:"Facebook"},{emoji:"📸",name:"Instagram"},{emoji:"🐦",name:"Twitter"},{emoji:"💬",name:"WhatsApp"}].map(s=>(
                    <button key={s.name} className="candy-btn candy-btn-outline candy-btn-sm" style={{ fontSize:"0.72rem",gap:"0.3rem" }}>
                      <span>{s.emoji}</span>{s.name}
                    </button>
                  ))}
                </div>
              </div>
            </GsapReveal>

            {/* Form column */}
            <GsapReveal>
              {sent ? (
                <div className="candy-card" style={{ padding:"3.5rem 2rem",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem" }}>
                  <div style={{ width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#10B981,#06B6D4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem",boxShadow:"0 8px 24px rgba(16,185,129,0.3)" }}>✅</div>
                  <h3 style={{ fontSize:"1.3rem",fontWeight:900,color:"var(--text-primary)" }}>تم إرسال رسالتك!</h3>
                  <p style={{ color:"var(--text-secondary)",fontSize:"0.9rem",maxWidth:320,lineHeight:1.7 }}>شكراً لتواصلك معنا يا {form.name || "عزيزنا"}. سنرد عليك خلال 24 ساعة.</p>
                  <button onClick={() => { setSent(false); setForm({name:"",email:"",phone:"",subject:"",message:""}); }} className="candy-btn candy-btn-outline candy-btn-sm">
                    ✉️ إرسال رسالة أخرى
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="candy-card" style={{ padding:"2rem 1.75rem" }}>
                  <h3 style={{ fontSize:"1.1rem",fontWeight:900,color:"var(--text-primary)",marginBottom:"1.5rem" }}>✉️ أرسل لنا رسالة</h3>

                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.85rem" }}>
                    <div className="candy-form-group">
                      <label className="candy-form-label">الاسم الكامل *</label>
                      <input required type="text" className="candy-form-input" placeholder="اسمك الكريم" value={form.name} onChange={set("name")} />
                    </div>
                    <div className="candy-form-group">
                      <label className="candy-form-label">رقم الهاتف</label>
                      <input type="tel" className="candy-form-input" placeholder="+970 xx xxx xxxx" value={form.phone} onChange={set("phone")} />
                    </div>
                  </div>

                  <div className="candy-form-group">
                    <label className="candy-form-label">البريد الإلكتروني *</label>
                    <input required type="email" className="candy-form-input" placeholder="your@email.com" value={form.email} onChange={set("email")} />
                  </div>

                  <div className="candy-form-group">
                    <label className="candy-form-label">موضوع الرسالة *</label>
                    <select required className="candy-form-input" style={{ cursor:"pointer" }} value={form.subject} onChange={set("subject")}>
                      <option value="">اختر موضوع الرسالة...</option>
                      <option>استفسار عن منتج</option>
                      <option>طلب خاص أو بالجملة</option>
                      <option>شكوى أو ملاحظة</option>
                      <option>شراكة تجارية</option>
                      <option>دعم فني</option>
                      <option>أخرى</option>
                    </select>
                  </div>

                  <div className="candy-form-group">
                    <label className="candy-form-label">رسالتك *</label>
                    <textarea required className="candy-form-input candy-form-textarea" placeholder="اكتب رسالتك هنا بالتفصيل..." value={form.message} onChange={set("message")} />
                  </div>

                  <button type="submit" disabled={loading} className="candy-btn candy-btn-primary" style={{ width:"100%",marginTop:"0.5rem" }}>
                    {loading ? "⏳ جاري الإرسال..." : "📤 إرسال الرسالة"}
                  </button>
                  <p style={{ textAlign:"center",marginTop:"0.85rem",fontSize:"0.72rem",color:"var(--text-muted)" }}>
                    🔒 بياناتك محمية ولن تُشارك مع أي طرف ثالث
                  </p>
                </form>
              )}
            </GsapReveal>
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section style={{ padding:"0 1.25rem 3rem" }}>
        <div style={{ maxWidth:1280,margin:"0 auto" }}>
          <div style={{ height:240,borderRadius:"var(--r-xl)",background:"linear-gradient(135deg,#F8F5FF,#F0F7FF)",border:"2px dashed rgba(124,58,237,0.2)",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",color:"var(--text-muted)",fontWeight:700,fontSize:"1rem" }}>
            <span style={{ fontSize:"2rem" }}>🗺️</span>
            <span>سيتم إضافة الخريطة هنا</span>
          </div>
        </div>
      </section>
    </div>
  );
}
