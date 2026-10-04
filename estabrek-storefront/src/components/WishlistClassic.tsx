"use client";

import React from "react";
import Link from "next/link";
import { useWishlist } from "@/store/wishlist";
import { LqipImage } from "@/components/LqipImage";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

// Icons
const HeartIcon = () => (
  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
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

const EmptyHeartIcon = () => (
  <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

export default function WishlistClassic() {
  const { items, removeFromWishlist, clearWishlist, count } = useWishlist();
  const settings = useStorefrontSettings();
  const breadcrumbsEnabled = settings.breadcrumbsEnabled !== false;

  return (
    <main id="main-content" tabIndex={-1} className="wishlist-page" dir="rtl">
      {/* Breadcrumb */}
      {breadcrumbsEnabled ? (
        <nav className="wishlist-breadcrumb">
          <Link href="/" className="breadcrumb-link">
            <HomeIcon />
            الرئيسية
          </Link>
          <ChevronLeftIcon />
          <span className="breadcrumb-current">المفضلة</span>
        </nav>
      ) : null}

      {/* Header */}
      <div className="wishlist-header">
        <div className="wishlist-header-icon">
          <HeartIcon />
        </div>
        <div>
          <h1 className="wishlist-header-title">قائمة المفضلة</h1>
          <p className="wishlist-header-count">
            {count > 0 ? `${count} منتج في المفضلة` : "لا توجد منتجات في المفضلة"}
          </p>
        </div>
        {count > 0 && (
          <button
            className="wishlist-clear-btn"
            onClick={clearWishlist}
          >
            <TrashIcon />
            مسح الكل
          </button>
        )}
      </div>

      {/* Content */}
      {count > 0 ? (
        <div className="wishlist-grid">
          {items.map((item) => (
            <div key={item.id} className="wishlist-card">
              <Link href={`/p/${item.slug}`} className="wishlist-card-image">
                {item.image ? (
                  <LqipImage
                    src={item.image}
                    alt={item.title}
                    fill
                    blurDataUrl={item.imageBlurDataUrl ?? undefined}
                    loading="lazy"
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="wishlist-card-placeholder" />
                )}
              </Link>
              
              <div className="wishlist-card-content">
                <Link href={`/p/${item.slug}`} className="wishlist-card-title">
                  {item.title}
                </Link>
                
                {item.price && (
                  <span className="wishlist-card-price">
                    {item.price.toFixed(2)} ₪
                  </span>
                )}

                <div className="wishlist-card-actions">
                  <Link href={`/p/${item.slug}`} className="wishlist-card-view-btn">
                    <ShoppingBagIcon />
                    عرض المنتج
                  </Link>
                  <button
                    className="wishlist-card-remove-btn"
                    onClick={() => removeFromWishlist(item.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon">
            <EmptyHeartIcon />
          </div>
          <h2 className="wishlist-empty-title">قائمة المفضلة فارغة</h2>
          <p className="wishlist-empty-desc">
            لم تقم بإضافة أي منتجات إلى المفضلة بعد.
            <br />
            تصفح منتجاتنا وأضف ما يعجبك!
          </p>
          <Link href="/shop" className="wishlist-empty-btn">
            <ShoppingBagIcon />
            تصفح المنتجات
          </Link>
        </div>
      )}
    </main>
  );
}
