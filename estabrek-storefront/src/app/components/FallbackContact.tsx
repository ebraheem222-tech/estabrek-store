"use client";

import React, { useState } from "react";
import { submitContactMessage } from "@/lib/contactForm";

const PhoneIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function FallbackContact() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      setSubmitError(null);
      await submitContactMessage({
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        subject: formState.subject,
        message: formState.message,
        fields: { ...formState },
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        source: "contact_fallback",
      });

      setIsSubmitting(false);
      setIsSubmitted(true);

      // Reset after showing success
      setTimeout(() => {
        setIsSubmitted(false);
        setFormState({ name: "", email: "", phone: "", subject: "", message: "" });
      }, 3000);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err?.message ?? "فشل إرسال الرسالة");
    }
  };

  const contactInfo = [
    {
      icon: <PhoneIcon />,
      label: "الهاتف",
      value: "+970 000 000 000",
      href: "tel:+970000000000",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: <MailIcon />,
      label: "البريد الإلكتروني",
      value: "info@example.com",
      href: "mailto:info@example.com",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: <LocationIcon />,
      label: "العنوان",
      value: "القدس - فلسطين",
      href: "#",
      color: "from-purple-500 to-violet-500",
    },
    {
      icon: <ClockIcon />,
      label: "ساعات العمل",
      value: "السبت - الخميس: 9ص - 9م",
      href: "#",
      color: "from-orange-500 to-amber-500",
    },
  ];

  return (
    <div className="contact-page-fallback">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="hero-bg">
          <div className="hero-gradient" />
          <div className="hero-orbs">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
          </div>
        </div>
        <div className="hero-content">
          <h1>تواصل معنا</h1>
          <p>نحن هنا لمساعدتك! راسلنا وسنرد عليك في أقرب وقت</p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="contact-info-section">
        <div className="info-cards">
          {contactInfo.map((item, i) => (
            <a
              key={i}
              href={item.href}
              className="info-card"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`icon-wrapper bg-gradient-to-br ${item.color}`}>
                {item.icon}
              </div>
              <div className="info-content">
                <span className="info-label">{item.label}</span>
                <span className="info-value">{item.value}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <section className="contact-main">
        <div className="contact-grid">
          {/* Contact Form */}
          <div className="form-section">
            <div className="form-header">
              <h2>أرسل لنا رسالة</h2>
              <p>املأ النموذج أدناه وسنتواصل معك قريباً</p>
            </div>

            {isSubmitted ? (
              <div className="success-message">
                <div className="success-icon">
                  <CheckIcon />
                </div>
                <h3>تم إرسال رسالتك بنجاح!</h3>
                <p>شكراً لتواصلك معنا. سنرد عليك في أقرب وقت ممكن.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                {submitError ? (
                  <div className="form-error">
                    {submitError}
                  </div>
                ) : null}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">الاسم *</label>
                    <input
                      id="name"
                      type="text"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      placeholder="اسمك الكامل"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">البريد الإلكتروني *</label>
                    <input
                      id="email"
                      type="email"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      placeholder="example@email.com"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">رقم الهاتف</label>
                    <input
                      id="phone"
                      type="tel"
                      value={formState.phone}
                      onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                      placeholder="+970 000 000 000"
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subject">الموضوع *</label>
                    <input
                      id="subject"
                      type="text"
                      value={formState.subject}
                      onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                      placeholder="موضوع الرسالة"
                      required
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="message">الرسالة *</label>
                  <textarea
                    id="message"
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    placeholder="اكتب رسالتك هنا..."
                    rows={5}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={`submit-btn ${isSubmitting ? "loading" : ""}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <SendIcon />
                      إرسال الرسالة
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Map Section */}
          <div className="map-section">
            <div className="map-header">
              <h2>موقعنا</h2>
              <p>زورنا في أي وقت!</p>
            </div>
            <div className="map-wrapper">
              <iframe
                title="خريطة الموقع"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d108486.39399751045!2d35.16080799999999!3d31.768318!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1503292fffffff%3A0x5d4a0de5f4e5da11!2sJerusalem!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s"
                className="map-iframe"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Social Links */}
            <div className="social-section">
              <h3>تابعنا على</h3>
              <div className="social-links">
                <a href="#" className="social-link instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a href="#" className="social-link facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a href="#" className="social-link whatsapp">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
                <a href="#" className="social-link twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <h2>الأسئلة الشائعة</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>كيف يمكنني تتبع طلبي؟</h3>
            <p>يمكنك تتبع طلبك من خلال صفحة "طلباتي" أو عبر الرابط المرسل إلى بريدك الإلكتروني.</p>
          </div>
          <div className="faq-item">
            <h3>ما هي سياسة الإرجاع؟</h3>
            <p>نقبل الإرجاع خلال 14 يوماً من استلام المنتج بشرط أن يكون بحالته الأصلية.</p>
          </div>
          <div className="faq-item">
            <h3>كم تستغرق عملية التوصيل؟</h3>
            <p>يتم التوصيل خلال 3-5 أيام عمل داخل المدن الرئيسية.</p>
          </div>
          <div className="faq-item">
            <h3>هل يمكنني الدفع عند الاستلام؟</h3>
            <p>نعم، نوفر خيار الدفع عند الاستلام بالإضافة للدفع الإلكتروني.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
