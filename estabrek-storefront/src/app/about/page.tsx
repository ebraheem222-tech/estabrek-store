import React from "react";
import Link from "next/link";
import { getBootstrap, getPublicSettings } from "@/lib/api";
import { renderCmsPageBySlug } from "../[[...slug]]/page";

// Icons
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

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

export default async function AboutPage() {
  const settings = await getPublicSettings().catch(() => null);
  const storefrontCfg = (settings?.site as any)?.header?.storefront ?? {};
  const breadcrumbsEnabled = storefrontCfg.breadcrumbsEnabled !== false;
  if (storefrontCfg.cmsOverrideAbout !== false) {
    const cms = await renderCmsPageBySlug("/about", undefined, { allowFallback: false, allowNotFound: false });
    if (cms) return <main className="mx-auto max-w-6xl px-4 py-8">{cms}</main>;
  }

  const bootstrap = await getBootstrap();
  const siteName = bootstrap?.site?.siteName || "Estabrek Store";

  return (
    <main className="about-page" dir="rtl">
      {/* Breadcrumb */}
      {breadcrumbsEnabled ? (
        <nav className="about-breadcrumb">
          <Link href="/" className="breadcrumb-link">
            <HomeIcon />
            الرئيسية
          </Link>
          <ChevronLeftIcon />
          <span className="breadcrumb-current">من نحن</span>
        </nav>
      ) : null}

      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-bg" />
        <div className="about-hero-content">
          <span className="about-badge">
            <SparklesIcon />
            قصتنا
          </span>
          <h1 className="about-title">من نحن</h1>
          <p className="about-subtitle">
            نسعى لتقديم أفضل تجربة تسوق إلكتروني مع منتجات عالية الجودة وخدمة عملاء متميزة
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="about-story">
        <div className="about-story-content">
          <h2 className="about-section-title">قصة {siteName}</h2>
          <p className="about-text">
            بدأت رحلتنا بهدف واحد بسيط: جعل التسوق الإلكتروني تجربة ممتعة وموثوقة للجميع.
            نؤمن بأن كل عميل يستحق الحصول على منتجات عالية الجودة بأسعار عادلة مع خدمة استثنائية.
          </p>
          <p className="about-text">
            على مدار السنوات، نمت عائلتنا من فريق صغير متحمس إلى مجتمع كبير يضم آلاف العملاء السعداء.
            نفخر بأننا نقدم تشكيلة واسعة من المنتجات المميزة التي تلبي احتياجات مختلف الأذواق والميزانيات.
          </p>
        </div>
        <div className="about-story-image">
          <div className="about-story-placeholder">
            <UsersIcon />
            <span>فريقنا المتميز</span>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="about-values">
        <h2 className="about-section-title centered">قيمنا</h2>
        <p className="about-section-subtitle">المبادئ التي نؤمن بها ونعمل وفقها</p>
        
        <div className="about-values-grid">
          <div className="about-value-card">
            <div className="about-value-icon emerald">
              <TruckIcon />
            </div>
            <h3 className="about-value-title">الالتزام</h3>
            <p className="about-value-desc">
              نلتزم بتوصيل طلباتكم في الوقت المحدد مع الحفاظ على جودة المنتجات
            </p>
          </div>

          <div className="about-value-card">
            <div className="about-value-icon blue">
              <ShieldIcon />
            </div>
            <h3 className="about-value-title">الثقة</h3>
            <p className="about-value-desc">
              نبني علاقات طويلة الأمد مع عملائنا من خلال الشفافية والصدق
            </p>
          </div>

          <div className="about-value-card">
            <div className="about-value-icon amber">
              <StarIcon />
            </div>
            <h3 className="about-value-title">الجودة</h3>
            <p className="about-value-desc">
              نختار بعناية كل منتج نقدمه لضمان أعلى معايير الجودة
            </p>
          </div>

          <div className="about-value-card">
            <div className="about-value-icon purple">
              <HeartIcon />
            </div>
            <h3 className="about-value-title">العناية</h3>
            <p className="about-value-desc">
              نهتم برضا كل عميل ونسعى لتجاوز توقعاتكم دائماً
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="about-stats">
        <div className="about-stat">
          <div className="about-stat-value">10,000+</div>
          <div className="about-stat-label">عميل سعيد</div>
        </div>
        <div className="about-stat">
          <div className="about-stat-value">500+</div>
          <div className="about-stat-label">منتج متوفر</div>
        </div>
        <div className="about-stat">
          <div className="about-stat-value">50+</div>
          <div className="about-stat-label">علامة تجارية</div>
        </div>
        <div className="about-stat">
          <div className="about-stat-value">24/7</div>
          <div className="about-stat-label">دعم متواصل</div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <h2 className="about-cta-title">ابدأ رحلة التسوق معنا</h2>
        <p className="about-cta-desc">
          اكتشف مجموعتنا المميزة من المنتجات واستمتع بتجربة تسوق فريدة
        </p>
        <div className="about-cta-buttons">
          <Link href="/shop" className="about-cta-primary">
            تصفح المنتجات
          </Link>
          <Link href="/contact" className="about-cta-secondary">
            تواصل معنا
          </Link>
        </div>
      </section>
    </main>
  );
}
