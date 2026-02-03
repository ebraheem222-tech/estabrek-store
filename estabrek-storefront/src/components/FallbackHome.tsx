import React from "react";
import Link from "next/link";
import { getCategoriesTree, listProducts, getBootstrap } from "@/lib/api";
import { ProductTile } from "@/components/ProductTile";
import { CountdownTimer } from "@/components/CountdownTimer";

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
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const GridIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const FireIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);

const GiftIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

export default async function FallbackHome() {
  const [bootstrap, cats, products] = await Promise.all([
    getBootstrap(),
    getCategoriesTree(),
    listProducts({ sort: "latest", page: 1, pageSize: 8, includeFacets: false, lite: true }),
  ]);

  const top = (cats ?? []).slice(0, 6);
  const siteName = bootstrap?.site?.siteName || "Estabrak Store";

  return (
    <div className="home-page space-y-20" dir="rtl">
      {/* ========== MEGA HERO SECTION ========== */}
      <section className="hero-mega">
        {/* Animated Background Orbs */}
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        
        {/* Geometric Shapes */}
        <div className="hero-shape hero-shape-1" />
        <div className="hero-shape hero-shape-2" />
        <div className="hero-shape hero-shape-3" />
        
        {/* Glowing Lines */}
        <div className="hero-line hero-line-1" />
        <div className="hero-line hero-line-2" />
        <div className="hero-line hero-line-3" />

        {/* Floating Sparkles */}
        {[...Array(12)].map((_, i) => (
          <div 
            key={i}
            className="sparkle"
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${5 + Math.random() * 90}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}

        {/* Hero Content */}
        <div className="hero-mega-content">
          {/* Animated Badge */}
          <div className="hero-mega-badge">
            <SparklesIcon />
            <span>مرحباً بك في {siteName}</span>
            <span className="badge-shine" />
          </div>

          {/* Main Title with Gradient Animation */}
          <h1 className="hero-mega-title">
            <span className="block text-[var(--text)]">اكتشف عالماً من</span>
            <span className="block gradient-text">المنتجات المميزة</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-mega-subtitle">
            تشكيلة واسعة من أفضل المنتجات بأسعار منافسة.
            <br className="hidden sm:block" />
            توصيل سريع لجميع المناطق وخدمة عملاء على مدار الساعة.
          </p>

          {/* CTA Buttons */}
          <div className="hero-mega-cta">
            <Link href="/shop" className="hero-mega-btn-primary group">
              <ShoppingBagIcon />
              <span>تسوّق الآن</span>
              <ArrowLeftIcon />
              <span className="btn-shine" />
            </Link>
            <Link href="/search" className="hero-mega-btn-secondary">
              <span>استكشف المزيد</span>
              <ChevronLeftIcon />
            </Link>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{products.total || "100"}+</div>
              <div className="hero-stat-label">منتج متوفر</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{top.length || "10"}+</div>
              <div className="hero-stat-label">تصنيف مختلف</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">24/7</div>
              <div className="hero-stat-label">دعم متواصل</div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="hero-decoration">
          <div className="hero-decoration-circle" />
          <div className="hero-decoration-ring" />
        </div>
      </section>

      {/* ========== QUICK FEATURES BAR ========== */}
      <section className="quick-features">
        <div className="quick-feature">
          <div className="quick-feature-icon emerald">
            <TruckIcon />
          </div>
          <div className="quick-feature-text">
            <span className="quick-feature-title">توصيل سريع</span>
            <span className="quick-feature-desc">لجميع المناطق</span>
          </div>
        </div>
        <div className="quick-feature-divider" />
        <div className="quick-feature">
          <div className="quick-feature-icon blue">
            <ShieldIcon />
          </div>
          <div className="quick-feature-text">
            <span className="quick-feature-title">دفع آمن</span>
            <span className="quick-feature-desc">100% محمي</span>
          </div>
        </div>
        <div className="quick-feature-divider" />
        <div className="quick-feature">
          <div className="quick-feature-icon amber">
            <RefreshIcon />
          </div>
          <div className="quick-feature-text">
            <span className="quick-feature-title">إرجاع مجاني</span>
            <span className="quick-feature-desc">خلال 14 يوم</span>
          </div>
        </div>
        <div className="quick-feature-divider" />
        <div className="quick-feature">
          <div className="quick-feature-icon purple">
            <HeartIcon />
          </div>
          <div className="quick-feature-text">
            <span className="quick-feature-title">ضمان الجودة</span>
            <span className="quick-feature-desc">منتجات أصلية</span>
          </div>
        </div>
      </section>

      {/* ========== SPECIAL OFFER COUNTDOWN ========== */}
      <section className="countdown-section">
        <div className="countdown-bg">
          <div className="countdown-orb countdown-orb-1" />
          <div className="countdown-orb countdown-orb-2" />
        </div>
        <div className="countdown-content">
          <div className="countdown-header">
            <span className="countdown-badge">
              <GiftIcon />
              عرض محدود
            </span>
            <h2 className="countdown-title">خصم 30% على جميع المنتجات!</h2>
            <p className="countdown-desc">استغل العرض قبل انتهاء الوقت</p>
          </div>
          <CountdownTimer
            targetDate={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()}
            title=""
            variant="default"
            showLabels={true}
          />
          <Link 
            href="/shop" 
            className="countdown-cta"
          >
            تسوق الآن
            <ArrowLeftIcon />
          </Link>
        </div>
      </section>

      {/* ========== CATEGORIES SECTION ========== */}
      {top.length > 0 && (
        <section className="categories-section">
          <div className="section-header-fancy">
            <div className="section-header-content">
              <span className="section-badge">
                <TagIcon />
                تصفح حسب
              </span>
              <h2 className="section-title-fancy">التصنيفات</h2>
              <p className="section-desc">اختر من بين مجموعة متنوعة من التصنيفات</p>
            </div>
            <Link href="/shop" className="section-link">
              عرض الكل
              <ArrowLeftIcon />
            </Link>
          </div>

          <div className="categories-fancy-grid">
            {top.map((c, idx) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="category-fancy-card"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="category-fancy-icon">
                  <GridIcon />
                </div>
                <div className="category-fancy-content">
                  <h3 className="category-fancy-name">{c.name}</h3>
                  <span className="category-fancy-action">
                    تصفح المنتجات
                    <ChevronLeftIcon />
                  </span>
                </div>
                <div className="category-fancy-bg" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ========== PRODUCTS SECTION ========== */}
      <section className="products-section">
        <div className="section-header-fancy">
          <div className="section-header-content">
            <span className="section-badge hot">
              <FireIcon />
              الأكثر طلباً
            </span>
            <h2 className="section-title-fancy">أحدث المنتجات</h2>
            <p className="section-desc">اكتشف أحدث ما وصلنا من منتجات مميزة</p>
          </div>
          <Link href="/shop" className="section-link">
            عرض المزيد
            <ArrowLeftIcon />
          </Link>
        </div>

        {products.items?.length ? (
          <div className="products-fancy-grid">
            {products.items.map((p, idx) => (
              <div 
                key={p.id} 
                className="product-wrapper"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <ProductTile product={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-fancy">
            <div className="empty-state-icon">
              <GiftIcon />
            </div>
            <h3>لا توجد منتجات حالياً</h3>
            <p>تابعونا قريباً لمنتجات جديدة!</p>
          </div>
        )}

        <div className="products-section-cta">
          <Link href="/shop" className="view-all-btn">
            <span>عرض جميع المنتجات</span>
            <ArrowLeftIcon />
          </Link>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section className="features-section">
        <div className="section-header-fancy centered">
          <span className="section-badge">
            <StarIcon />
            لماذا نحن؟
          </span>
          <h2 className="section-title-fancy">مميزاتنا</h2>
          <p className="section-desc">نقدم لك أفضل تجربة تسوق ممكنة</p>
        </div>

        <div className="features-fancy-grid">
          <div className="feature-fancy-card">
            <div className="feature-fancy-icon emerald">
              <TruckIcon />
            </div>
            <h3 className="feature-fancy-title">شحن سريع وآمن</h3>
            <p className="feature-fancy-desc">
              نوصل طلبك بأسرع وقت ممكن مع تتبع كامل للشحنة
            </p>
          </div>

          <div className="feature-fancy-card">
            <div className="feature-fancy-icon blue">
              <ShieldIcon />
            </div>
            <h3 className="feature-fancy-title">دفع آمن ومحمي</h3>
            <p className="feature-fancy-desc">
              طرق دفع متعددة مع حماية كاملة لبياناتك
            </p>
          </div>

          <div className="feature-fancy-card">
            <div className="feature-fancy-icon amber">
              <RefreshIcon />
            </div>
            <h3 className="feature-fancy-title">سياسة إرجاع مرنة</h3>
            <p className="feature-fancy-desc">
              استرجع منتجك خلال 14 يوم مع استرداد كامل
            </p>
          </div>

          <div className="feature-fancy-card">
            <div className="feature-fancy-icon purple">
              <HeartIcon />
            </div>
            <h3 className="feature-fancy-title">دعم على مدار الساعة</h3>
            <p className="feature-fancy-desc">
              فريقنا جاهز لمساعدتك في أي وقت
            </p>
          </div>
        </div>
      </section>

      {/* ========== NEWSLETTER SECTION ========== */}
      <section className="newsletter-fancy">
        <div className="newsletter-fancy-bg" />
        <div className="newsletter-fancy-content">
          <span className="newsletter-badge">
            <GiftIcon />
            عروض حصرية
          </span>
          <h3 className="newsletter-title">اشترك في نشرتنا البريدية</h3>
          <p className="newsletter-desc">
            احصل على آخر العروض والخصومات الحصرية مباشرة في بريدك
          </p>
          <div className="newsletter-form-fancy">
            <input 
              type="email" 
              placeholder="البريد الإلكتروني"
              className="newsletter-input-fancy"
              dir="ltr"
            />
            <button className="newsletter-btn-fancy">
              اشترك الآن
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
