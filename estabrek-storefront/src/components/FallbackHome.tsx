import React from "react";
import Link from "next/link";
import { getCategoriesTree, listProducts, getBootstrap } from "@/lib/api";
import { ProductTile } from "@/components/ProductTile";

// Icons
const ShoppingBagIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const TagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

export default async function FallbackHome() {
  const [bootstrap, cats, products] = await Promise.all([
    getBootstrap(),
    getCategoriesTree(),
    listProducts({ sort: "latest", page: 1, pageSize: 8 }),
  ]);

  const top = (cats ?? []).slice(0, 8);
  const siteName = bootstrap?.site?.siteName || "Estabrak Store";

  return (
    <div className="space-y-16" dir="rtl">
      {/* MEGA HERO SECTION */}
      <section className="hero-mega">
        {/* Animated Orbs */}
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        
        {/* Floating Shapes */}
        <div className="hero-shape hero-shape-1" />
        <div className="hero-shape hero-shape-2" />
        <div className="hero-shape hero-shape-3" />
        
        {/* Glowing Lines */}
        <div className="hero-line hero-line-1" />
        <div className="hero-line hero-line-2" />
        <div className="hero-line hero-line-3" />

        {/* Sparkles */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className="sparkle"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}

        {/* Content */}
        <div className="hero-mega-content">
          {/* Badge */}
          <div className="hero-mega-badge">
            <SparklesIcon />
            <span>مرحباً بك في {siteName}</span>
          </div>

          {/* Title */}
          <h1 className="hero-mega-title">
            <span className="text-[var(--text)]">اكتشف</span>
            <br />
            <span className="gradient-text">أفضل المنتجات</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-mega-subtitle">
            تشكيلة واسعة من المنتجات المميزة بأفضل الأسعار. توصيل سريع لجميع المناطق وخدمة عملاء على مدار الساعة.
          </p>

          {/* CTA */}
          <div className="hero-mega-cta">
            <Link href="/shop" className="hero-mega-btn-primary">
              <ShoppingBagIcon />
              <span>تسوّق الآن</span>
              <ArrowLeftIcon />
            </Link>
            <Link href="/search" className="hero-mega-btn-secondary">
              <span>استكشف المزيد</span>
            </Link>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{products.total || "100"}+</div>
              <div className="hero-stat-label">منتج</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{top.length || "10"}+</div>
              <div className="hero-stat-label">تصنيف</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">24/7</div>
              <div className="hero-stat-label">دعم</div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      {top.length > 0 && (
        <section className="featured-section">
          <div className="featured-section-header">
            <h2 className="featured-section-title">
              <span className="featured-section-icon">
                <TagIcon />
              </span>
              التصنيفات
            </h2>
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              عرض الكل
              <ArrowLeftIcon />
            </Link>
          </div>

          <div className="category-showcase stagger-children">
            {top.map((c, idx) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="category-showcase-item"
              >
                <div className="category-showcase-icon">
                  <GridIcon />
                </div>
                <div className="category-showcase-name">{c.name}</div>
                <div className="category-showcase-count">تصفح المنتجات</div>
                <div className="category-showcase-arrow">
                  <ChevronLeftIcon />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* PRODUCTS SECTION */}
      <section className="featured-section">
        <div className="featured-section-header">
          <h2 className="featured-section-title">
            <span className="featured-section-icon">
              <SparklesIcon />
            </span>
            أحدث المنتجات
          </h2>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            المتجر
            <ArrowLeftIcon />
          </Link>
        </div>

        {products.items?.length ? (
          <div className="products-showcase stagger-children">
            {products.items.map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="empty-cart">
            <div className="empty-cart-icon">
              <svg className="w-10 h-10 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">لا توجد منتجات</h3>
            <p className="text-sm text-[var(--muted)]">ما في منتجات حالياً، تابعونا قريباً!</p>
          </div>
        )}
      </section>

      {/* FEATURES SECTION */}
      <section className="features-mega-grid">
        <div className="feature-mega-card">
          <div className="feature-mega-icon emerald">
            <TruckIcon />
          </div>
          <h3 className="feature-mega-title">شحن سريع</h3>
          <p className="feature-mega-desc">
            توصيل سريع وآمن لجميع المناطق مع إمكانية تتبع الشحنة
          </p>
        </div>

        <div className="feature-mega-card">
          <div className="feature-mega-icon blue">
            <ShieldIcon />
          </div>
          <h3 className="feature-mega-title">دفع آمن</h3>
          <p className="feature-mega-desc">
            طرق دفع متعددة وآمنة تشمل البطاقات والدفع عند الاستلام
          </p>
        </div>

        <div className="feature-mega-card">
          <div className="feature-mega-icon amber">
            <RefreshIcon />
          </div>
          <h3 className="feature-mega-title">إرجاع مجاني</h3>
          <p className="feature-mega-desc">
            استرجع منتجك خلال 14 يوم مع ضمان استرداد كامل المبلغ
          </p>
        </div>

        <div className="feature-mega-card">
          <div className="feature-mega-icon purple">
            <HeartIcon />
          </div>
          <h3 className="feature-mega-title">دعم متميز</h3>
          <p className="feature-mega-desc">
            فريق دعم متخصص جاهز لمساعدتك على مدار الساعة
          </p>
        </div>
      </section>

      {/* NEWSLETTER SECTION */}
      <section className="newsletter-section">
        <h3 className="newsletter-title">اشترك في النشرة البريدية</h3>
        <p className="newsletter-desc">احصل على آخر العروض والخصومات مباشرة</p>
        <div className="newsletter-form">
          <input 
            type="email" 
            placeholder="البريد الإلكتروني"
            className="newsletter-input"
            dir="ltr"
          />
          <button className="newsletter-btn">اشترك</button>
        </div>
      </section>
    </div>
  );
}
