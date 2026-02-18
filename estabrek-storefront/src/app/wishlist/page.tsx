"use client";
import React from "react";
import Link from "next/link";
import { useWishlist } from "@/store/wishlist";
import { FloatingOrbs } from "@/components/candy/GsapAnimations";
import { formatMoney, getProductMinPrice, getProductPrimaryImage } from "@/lib/catalog";

export default function WishlistPage() {
  const { items, removeItem } = useWishlist();

  return (
    <main id="main-content" tabIndex={-1} className="candy-page" dir="rtl">
      <FloatingOrbs />

      <nav className="candy-breadcrumb">
        <Link href="/">🏠 الرئيسية</Link>
        <span className="candy-breadcrumb-sep">/</span>
        <span className="candy-breadcrumb-current">المفضلة</span>
      </nav>

      <section className="candy-page-hero">
        <div className="candy-page-hero-bg" />
        <div className="candy-page-hero-content">
          <div className="candy-section-eyebrow">💝 قائمتك</div>
          <h1 className="candy-section-title">المنتجات <span className="text-gradient-hero">المفضلة</span></h1>
          <p className="candy-section-desc">{items.length} منتج في قائمة مفضلاتك</p>
        </div>
      </section>

      <section className="candy-section" style={{ paddingTop:"1.5rem" }}>
        <div className="candy-container">
          {items.length === 0 ? (
            <div className="candy-empty">
              <div className="candy-empty-icon">💝</div>
              <div className="candy-empty-title">قائمة المفضلة فارغة</div>
              <div className="candy-empty-desc">أضف المنتجات التي تعجبك إلى المفضلة لتجدها بسهولة لاحقاً</div>
              <Link href="/shop" className="candy-btn candy-btn-primary" style={{ marginTop:"1rem" }}>🛍 تصفح المتجر</Link>
            </div>
          ) : (
            <div className="candy-wishlist-grid">
              {items.map((item: any, i: number) => {
                const img = getProductPrimaryImage(item);
                const price = getProductMinPrice(item);
                return (
                  <div key={item.id} className="candy-product-card reveal-up" style={{ transitionDelay:`${i*60}ms` }}>
                    <div className="candy-product-image-wrap">
                      {img ? <img src={img} alt={item.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <div className="candy-product-no-image">🛍</div>}
                      <div className="candy-product-overlay">
                        <Link href={`/p/${item.slug}`} className="candy-btn candy-btn-primary candy-btn-sm">عرض المنتج</Link>
                      </div>
                    </div>
                    <div className="candy-product-body">
                      <h3 className="candy-product-title">{item.title}</h3>
                      <div className="candy-product-price-row">
                        <span className="candy-product-price">{price != null ? formatMoney(price,"ILS") : "—"}</span>
                        <button onClick={() => removeItem(item.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--candy-red)",fontSize:"0.75rem",fontWeight:700 }}>❌ إزالة</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
