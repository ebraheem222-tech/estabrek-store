import React from "react";
import Link from "next/link";
import { getCategoriesTree, listProducts } from "@/lib/api";
import { ProductTile } from "@/components/ProductTile";

// Icons
const ShopIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const CategoryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

export default async function FallbackShop() {
  const [cats, products] = await Promise.all([
    getCategoriesTree(),
    listProducts({ sort: "latest", page: 1, pageSize: 16 }),
  ]);

  return (
    <div className="space-y-10" dir="rtl">
      {/* Shop Hero */}
      <section className="shop-hero">
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              {/* Badge */}
              <div className="mb-4">
                <span className="animated-badge">
                  <SparklesIcon />
                  تشكيلة واسعة من المنتجات
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">
                المتجر
              </h1>

              {/* Subtitle */}
              <p className="text-[var(--muted)] leading-relaxed">
                استكشف مجموعتنا الواسعة من المنتجات المميزة. تصفح حسب التصنيف أو ابحث عن ما تحتاجه.
              </p>

              {/* CTA */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  بحث متقدم
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] bg-clip-text text-transparent">
                  {products.total ?? 0}+
                </div>
                <div className="text-sm text-[var(--muted)]">منتج</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] bg-clip-text text-transparent">
                  {cats?.length ?? 0}
                </div>
                <div className="text-sm text-[var(--muted)]">تصنيف</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {cats?.length ? (
        <section className="space-y-6">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-title-icon text-white">
                <CategoryIcon />
              </span>
              التصنيفات
            </h2>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              عرض الكل
              <ArrowLeftIcon />
            </Link>
          </div>

          <div className="shop-categories-grid">
            {cats.map((c, idx) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="shop-category-card stagger-item"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="shop-category-icon">
                  <GridIcon />
                </div>
                <span className="font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  {c.name}
                </span>
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
            href="/search"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            المزيد
            <ArrowLeftIcon />
          </Link>
        </div>

        {products.items?.length ? (
          <div className="products-grid">
            {products.items.map((p, idx) => (
              <div key={p.id} className="stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
                <ProductTile product={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <div className="no-results-icon text-[var(--muted)]">
              <EmptyIcon />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text)] mb-2">لا توجد منتجات</h3>
            <p className="text-sm text-[var(--muted)]">لم يتم إضافة منتجات بعد، تابعونا قريباً!</p>
          </div>
        )}
      </section>
    </div>
  );
}
