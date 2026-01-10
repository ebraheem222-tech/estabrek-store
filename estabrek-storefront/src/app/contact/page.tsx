"use client";

import React, { useState } from "react";
import Link from "next/link";

// Icons
const PhoneIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const EmailIcon = () => (
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

const CheckCircleIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const QuestionIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

// FAQ Data
const faqData = [
  {
    question: "ما هي طرق الدفع المتاحة؟",
    answer: "نقبل الدفع عبر البطاقات الائتمانية (فيزا، ماستركارد)، Apple Pay، Google Pay، والدفع عند الاستلام في مناطق محددة."
  },
  {
    question: "كم تستغرق عملية الشحن؟",
    answer: "عادة ما تصل الطلبات خلال 2-5 أيام عمل داخل المدن الرئيسية، و5-7 أيام للمناطق الأخرى."
  },
  {
    question: "هل يمكنني استرجاع المنتج؟",
    answer: "نعم، يمكنك استرجاع المنتج خلال 14 يوم من تاريخ الاستلام بشرط أن يكون بحالته الأصلية."
  },
  {
    question: "كيف يمكنني تتبع طلبي؟",
    answer: "بعد شحن طلبك، ستصلك رسالة بريد إلكتروني تحتوي على رقم التتبع ورابط لمتابعة الشحنة."
  },
];

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <main className="contact-page" dir="rtl">
      {/* Breadcrumb */}
      <nav className="contact-breadcrumb">
        <Link href="/" className="breadcrumb-link">
          <HomeIcon />
          الرئيسية
        </Link>
        <ChevronLeftIcon />
        <span className="breadcrumb-current">تواصل معنا</span>
      </nav>

      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-bg" />
        <div className="contact-hero-orb contact-hero-orb-1" />
        <div className="contact-hero-orb contact-hero-orb-2" />
        
        <div className="contact-hero-content">
          <span className="contact-hero-badge">
            <SparklesIcon />
            نحن هنا لمساعدتك
          </span>
          <h1 className="contact-hero-title">تواصل معنا</h1>
          <p className="contact-hero-desc">
            لديك سؤال أو استفسار؟ فريقنا جاهز لمساعدتك على مدار الساعة
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="contact-main">
        {/* Contact Info Cards */}
        <div className="contact-info-grid">
          <div className="contact-info-card">
            <div className="contact-info-icon phone">
              <PhoneIcon />
            </div>
            <h3 className="contact-info-title">اتصل بنا</h3>
            <p className="contact-info-text">+966 50 000 0000</p>
            <p className="contact-info-subtext">متاح من 9 صباحاً - 9 مساءً</p>
          </div>

          <div className="contact-info-card">
            <div className="contact-info-icon email">
              <EmailIcon />
            </div>
            <h3 className="contact-info-title">البريد الإلكتروني</h3>
            <p className="contact-info-text">support@estabrek.com</p>
            <p className="contact-info-subtext">نرد خلال 24 ساعة</p>
          </div>

          <div className="contact-info-card">
            <div className="contact-info-icon location">
              <LocationIcon />
            </div>
            <h3 className="contact-info-title">العنوان</h3>
            <p className="contact-info-text">الرياض، المملكة العربية السعودية</p>
            <p className="contact-info-subtext">طريق الملك فهد</p>
          </div>

          <div className="contact-info-card">
            <div className="contact-info-icon clock">
              <ClockIcon />
            </div>
            <h3 className="contact-info-title">ساعات العمل</h3>
            <p className="contact-info-text">السبت - الخميس</p>
            <p className="contact-info-subtext">9:00 ص - 9:00 م</p>
          </div>
        </div>

        {/* Contact Form & Map */}
        <div className="contact-form-section">
          <div className="contact-form-container">
            {!isSubmitted ? (
              <>
                <div className="contact-form-header">
                  <h2 className="contact-form-title">أرسل رسالتك</h2>
                  <p className="contact-form-desc">املأ النموذج أدناه وسنتواصل معك في أقرب وقت</p>
                </div>

                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">الاسم الكامل</label>
                      <input
                        type="text"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="أدخل اسمك"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">البريد الإلكتروني</label>
                      <input
                        type="email"
                        name="email"
                        value={formState.email}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="example@email.com"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">رقم الهاتف</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formState.phone}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="+966 5X XXX XXXX"
                        dir="ltr"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الموضوع</label>
                      <select
                        name="subject"
                        value={formState.subject}
                        onChange={handleChange}
                        className="form-select"
                        required
                      >
                        <option value="">اختر الموضوع</option>
                        <option value="general">استفسار عام</option>
                        <option value="order">استفسار عن طلب</option>
                        <option value="return">إرجاع منتج</option>
                        <option value="complaint">شكوى</option>
                        <option value="suggestion">اقتراح</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">الرسالة</label>
                    <textarea
                      name="message"
                      value={formState.message}
                      onChange={handleChange}
                      className="form-textarea"
                      placeholder="اكتب رسالتك هنا..."
                      rows={5}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="form-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="btn-spinner" />
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
              </>
            ) : (
              <div className="contact-success">
                <div className="success-icon">
                  <CheckCircleIcon />
                </div>
                <h3 className="success-title">تم إرسال رسالتك بنجاح!</h3>
                <p className="success-desc">
                  شكراً لتواصلك معنا. سنقوم بالرد على رسالتك في أقرب وقت ممكن.
                </p>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormState({ name: "", email: "", phone: "", subject: "", message: "" });
                  }}
                  className="success-btn"
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            )}
          </div>

          {/* Map Placeholder */}
          <div className="contact-map">
            <div className="map-placeholder">
              <LocationIcon />
              <span>الموقع على الخريطة</span>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="contact-social">
          <h3 className="social-title">تابعنا على</h3>
          <div className="social-links">
            <a href="#" className="social-link whatsapp" aria-label="WhatsApp">
              <WhatsAppIcon />
            </a>
            <a href="#" className="social-link instagram" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="#" className="social-link twitter" aria-label="Twitter">
              <TwitterIcon />
            </a>
            <a href="#" className="social-link facebook" aria-label="Facebook">
              <FacebookIcon />
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="contact-faq">
          <div className="faq-header">
            <span className="faq-badge">
              <QuestionIcon />
              أسئلة شائعة
            </span>
            <h2 className="faq-title">الأسئلة الأكثر شيوعاً</h2>
            <p className="faq-desc">إجابات سريعة على أكثر الأسئلة المتكررة</p>
          </div>

          <div className="faq-list">
            {faqData.map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${openFaq === index ? "open" : ""}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span>{faq.question}</span>
                  <ChevronDownIcon />
                </button>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
