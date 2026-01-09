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

const TagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

export default async function FallbackHome() {
  const [bootstrap, cats, products] = await Promise.all([
    getBootstrap(),
    getCategoriesTree(),
    listProducts({ sort: "latest", page: 1, pageSize: 8 }),
  ]);

  const top = (cats ?? []).slice(0, 8);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="hero-section relative overflow-hidden rounded-3xl border border-white/[0.08]">
        {/* Animated Background Elements */}
        <div className="floating-element floating-element-1" />
        <div className="floating-element floating-element-2" />
        <div className="floating-element floating-element-3" />
        <div className="grid-pattern" />
        
        {/* Particles */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="particle"
            style={{
              left: `${15 + i * 15}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${12 + i * 2}s`
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 px-8 py-16 md:py-24 md:px-12">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="hero-cta mb-6" style={{ animationDelay: '0s' }}>
              <span className="animated-badge">
                <SparklesIcon />
                مرحباً بك في متجرنا
              </span>
            </div>

            {/* Title */}
            <h1 className="hero-title text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-[var(--text)]">{bootstrap.site.siteName || "Estabrak Store"}</span>
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] bg-clip-text text-transparent">
                أفضل المنتجات
              </span>
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle mt-6 text-lg md:text-xl text-[var(--text)]/70 max-w-xl">
              اكتشف تشكيلة واسعة من المنتجات المميزة بأفضل الأسعار. توصيل سريع وخدمة عملاء متميزة.
            </p>

            {/* CTA Buttons */}
            <div className="hero-cta mt-8 flex flex-wrap gap-4">
              <Link 
                href="/shop" 
                className="group inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                <ShoppingBagIcon />
                تسوّق الآن
                <ArrowRightIcon />
              </Link>
              <Link 
                href="/" 
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 bg-white/5 text-[var(--text)] font-medium hover:bg-white/10 hover:border-white/25 transition-all duration-300"
              >
                استكشف المزيد
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="hero-cta mt-10 flex flex-wrap items-center gap-6 text-sm text-[var(--text)]/60" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TruckIcon />
                </div>
                <span>شحن سريع</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <ShieldIcon />
                </div>
                <span>دفع آمن</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <RefreshIcon />
                </div>
                <span>إرجاع مجاني</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {top.length ? (
        <section className="space-y-6">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-title-icon text-white">
                <TagIcon />
              </span>
              التصنيفات
            </h2>
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-2 text-sm text-[var(--text)]/70 hover:text-[var(--accent)] transition-colors"
            >
              عرض الكل
              <ArrowRightIcon />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {top.map((c, idx) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="category-card stagger-item group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                    {c.name}
                  </span>
                  <svg className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Products Section */}
      <section className="space-y-6">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-title-icon text-white">
              <SparklesIcon />
            </span>
            أحدث المنتجات
          </h2>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-2 text-sm text-[var(--text)]/70 hover:text-[var(--accent)] transition-colors"
          >
            المتجر
            <ArrowRightIcon />
          </Link>
        </div>

        {products.items?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.items.map((p, idx) => (
              <div key={p.id} className="stagger-item" style={{ animationDelay: `${idx * 60}ms` }}>
                <ProductTile product={p} />
              </div>
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

      {/* Features Section */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <TruckIcon />
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-2">شحن سريع</h3>
          <p className="text-sm text-[var(--muted)]">توصيل سريع لجميع المناطق</p>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center mx-auto mb-4 text-blue-400">
            <ShieldIcon />
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-2">دفع آمن</h3>
          <p className="text-sm text-[var(--muted)]">طرق دفع متعددة وآمنة</p>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <RefreshIcon />
          </div>
          <h3 className="font-semibold text-[var(--text)] mb-2">إرجاع مجاني</h3>
          <p className="text-sm text-[var(--muted)]">استرجع منتجك خلال 14 يوم</p>
        </div>
      </section>
    </div>
  );
}
