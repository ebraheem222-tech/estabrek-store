"use client";

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { formatMoney } from "@/lib/catalog";
import type { CatalogProduct, CatalogItem, CatalogVariant } from "@/lib/catalog";
import { CandyGallery } from "./GsapAnimations";

/* ── Helpers ── */
function getPrice(v?: CatalogVariant | null): number | null {
  if (!v) return null;
  const base = Number(v.price ?? 0);
  const sale = v.salePrice ? Number(v.salePrice) : null;
  return sale && sale > 0 && sale < base ? sale : base;
}
function getCompare(v?: CatalogVariant | null): number | null {
  if (!v) return null;
  const base = Number(v.price ?? 0);
  const sale = v.salePrice ? Number(v.salePrice) : null;
  if (sale && sale > 0 && sale < base) return base;
  const comp = v.compareAt ? Number(v.compareAt) : null;
  return comp && comp > base ? comp : null;
}

/* 
  CRITICAL: get images ONLY for the given item (color).
  Fall back to product-level images only if item has none.
*/
function getItemImages(item: CatalogItem | null, product: CatalogProduct): string[] {
  const seen = new Set<string>();
  const imgs: string[] = [];

  const push = (url?: string | null) => {
    if (url && !seen.has(url)) { seen.add(url); imgs.push(url); }
  };

  if (item) {
    // Primary/secondary convenience fields first
    push(item.primaryImageUrl);
    push(item.secondaryImageUrl);
    // All item images
    for (const im of item.images ?? []) push(im.url);
  }

  // If item had no images, fall back to product-level images
  if (imgs.length === 0) {
    const productImages = (product as any).images as Array<{url?:string}> | undefined;
    if (Array.isArray(productImages)) {
      for (const im of productImages) push(im.url);
    }
    push(product.primaryImageUrl);
    push(product.secondaryImageUrl);
  }

  return imgs;
}

function getItemColor(item: CatalogItem): string {
  if (item.colorHex) return item.colorHex;
  if (item.suggestedColors?.length) return `#${item.suggestedColors[0].replace("#", "")}`;
  return "#9CA3AF";
}

export default function ProductPageCandy({
  product,
  currencyCode = "ILS",
}: {
  product: CatalogProduct;
  currencyCode?: string;
}) {
  const items = product.items ?? [];

  // ── Initial state ──
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(items[0] ?? null);
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(
    items[0]?.variants?.[0] ?? null
  );
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedAnim, setAddedAnim] = useState(false);
  const [wishAnim, setWishAnim] = useState(false);
  const [activeTab, setActiveTab] = useState<"desc" | "shipping" | "returns">("desc");

  const { addItem } = useCart();
  const { addItem: addWish, removeItem: removeWish, isInWishlist } = useWishlist();
  const inWish = isInWishlist(product.id);

  // ── Images for SELECTED COLOR ONLY ──
  const images = useMemo(
    () => getItemImages(selectedItem, product),
    [selectedItem, product]
  );

  const price   = getPrice(selectedVariant);
  const compare = getCompare(selectedVariant);
  const discount = price && compare ? Math.round(((compare - price) / compare) * 100) : null;

  // ── Select a color → reset to first image of that color ──
  const handleSelectItem = useCallback((item: CatalogItem) => {
    setSelectedItem(item);
    setSelectedVariant(item.variants?.[0] ?? null);
    setActiveImgIdx(0); // ← reset to first image of new color
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant) return;
    addItem(selectedVariant.id, qty);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 2200);
  }, [selectedVariant, qty, addItem]);

  const toggleWish = useCallback(() => {
    if (inWish) { removeWish(product.id); }
    else { addWish(product as any); setWishAnim(true); setTimeout(() => setWishAnim(false), 600); }
  }, [inWish, product, addWish, removeWish]);

  return (
    <div className="ppg-wrap" dir="rtl">
      {/* ════════════════ GALLERY COLUMN ════════════════ */}
      <div className="ppg-gallery-col">
        {/* Color indicator strip above gallery */}
        {selectedItem && (
          <div className="ppg-color-indicator">
            <span className="ppg-color-dot" style={{ background: getItemColor(selectedItem) }} />
            <span className="ppg-color-label">
              اللون: <strong>{selectedItem.colorName ?? "الافتراضي"}</strong>
            </span>
            <span className="ppg-img-count">{images.length} صور</span>
          </div>
        )}

        {/* Gallery with color-filtered images */}
        <CandyGallery images={images} activeIdx={activeImgIdx} onSelect={setActiveImgIdx} colorName={selectedItem?.colorName ?? undefined} />

        {/* Discount badge floating */}
        {discount && (
          <div className="ppg-discount-badge">
            -{discount}%
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={toggleWish}
          className={`ppg-wish-btn ${inWish ? "ppg-wish-active" : ""} ${wishAnim ? "ppg-wish-pop" : ""}`}
          aria-label={inWish ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        >
          {inWish ? "❤️" : "🤍"}
        </button>
      </div>

      {/* ════════════════ INFO COLUMN ════════════════ */}
      <div className="ppg-info-col">
        {/* Category */}
        {product.category && (
          <Link href={`/c/${product.category.slug}`} className="ppg-category-tag">
            {product.category.name}
          </Link>
        )}

        {/* Title */}
        <h1 className="ppg-title">{product.title}</h1>

        {/* Stars + reviews */}
        <div className="ppg-meta-row">
          <div className="ppg-stars">
            {[0,1,2,3,4].map(i => <span key={i}>★</span>)}
          </div>
          <span className="ppg-review-count">(128 تقييم)</span>
          <span className="ppg-in-stock">✓ متوفر في المخزن</span>
        </div>

        {/* Price */}
        <div className="ppg-price-area">
          {price != null ? (
            <span className="ppg-price">{formatMoney(price, currencyCode)}</span>
          ) : (
            <span className="ppg-price-na">السعر عند الطلب</span>
          )}
          {compare != null && (
            <>
              <span className="ppg-old-price">{formatMoney(compare, currencyCode)}</span>
              {discount && <span className="ppg-discount-pill">وفّر {discount}%</span>}
            </>
          )}
        </div>

        {/* Divider */}
        <div className="ppg-divider" />

        {/* COLOR SELECTION — shows only images for selected color */}
        {items.length > 1 && (
          <div className="ppg-option-block">
            <div className="ppg-option-label">
              اللون:
              <span className="ppg-option-value">{selectedItem?.colorName ?? "—"}</span>
            </div>
            <div className="ppg-swatches">
              {items.map((item) => {
                const colorVal = getItemColor(item);
                const isActive = selectedItem?.id === item.id;
                // Count images for this color
                const imgCount = getItemImages(item, product).length;
                return (
                  <button
                    key={item.id}
                    className={`ppg-swatch ${isActive ? "ppg-swatch-active" : ""}`}
                    onClick={() => handleSelectItem(item)}
                    title={`${item.colorName ?? "لون"} (${imgCount} صور)`}
                    style={{ "--swatch-color": colorVal } as any}
                  >
                    <span className="ppg-swatch-inner" style={{ background: colorVal }} />
                    {isActive && <span className="ppg-swatch-check">✓</span>}
                  </button>
                );
              })}
            </div>
            {/* Image count for selected color */}
            {selectedItem && (
              <p className="ppg-color-img-hint">
                📸 يعرض {images.length} صورة للون {selectedItem.colorName ?? "المحدد"} فقط
              </p>
            )}
          </div>
        )}

        {/* SIZE SELECTION */}
        {(selectedItem?.variants ?? []).length > 1 && (
          <div className="ppg-option-block">
            <div className="ppg-option-label">
              المقاس:
              <span className="ppg-option-value">{selectedVariant?.size?.name ?? "—"}</span>
              <a href="#size-guide" className="ppg-size-guide">دليل المقاسات →</a>
            </div>
            <div className="ppg-sizes">
              {(selectedItem?.variants ?? []).map((v) => {
                const oos = (v.stock ?? 1) <= 0;
                return (
                  <button
                    key={v.id}
                    className={`ppg-size${selectedVariant?.id === v.id ? " ppg-size-active" : ""}${oos ? " ppg-size-oos" : ""}`}
                    onClick={() => !oos && setSelectedVariant(v)}
                    disabled={oos}
                    title={oos ? "نفد المخزون" : ""}
                  >
                    {v.size?.name ?? v.sku ?? "—"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* QUANTITY */}
        <div className="ppg-option-block ppg-qty-row">
          <div className="ppg-option-label">الكمية:</div>
          <div className="ppg-qty-ctrl">
            <button className="ppg-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span className="ppg-qty-val">{qty}</span>
            <button className="ppg-qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
          </div>
        </div>

        <div className="ppg-divider" />

        {/* ADD TO CART */}
        <div className="ppg-actions">
          <button
            onClick={handleAddToCart}
            className={`ppg-add-btn ${addedAnim ? "ppg-add-success" : ""}`}
            disabled={!selectedVariant}
          >
            {addedAnim ? (
              <><span className="ppg-checkmark">✓</span> تمت الإضافة للسلة!</>
            ) : (
              <>🛒 أضف إلى السلة</>
            )}
            <span className="ppg-btn-ripple" />
          </button>
          <button
            onClick={toggleWish}
            className={`ppg-wish-big-btn ${inWish ? "ppg-wish-big-active" : ""}`}
            aria-label={inWish ? "إزالة من المفضلة" : "أضف للمفضلة"}
          >
            {inWish ? "❤️" : "🤍"}
          </button>
        </div>

        {/* Trust badges */}
        <div className="ppg-trust-badges">
          {[
            { emoji:"🚀", title:"توصيل سريع",  desc:"خلال 2-3 أيام عمل" },
            { emoji:"🔒", title:"دفع آمن",     desc:"تشفير SSL كامل" },
            { emoji:"♻️", title:"إرجاع مجاني", desc:"خلال 30 يوماً" },
          ].map(b => (
            <div key={b.title} className="ppg-trust-card">
              <span className="ppg-trust-emoji">{b.emoji}</span>
              <div>
                <div className="ppg-trust-title">{b.title}</div>
                <div className="ppg-trust-desc">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Description tabs */}
        {((product as any).description) && (
          <div className="ppg-tabs">
            <div className="ppg-tab-btns">
              {(["desc","shipping","returns"] as const).map(tab => (
                <button
                  key={tab}
                  className={`ppg-tab-btn ${activeTab === tab ? "ppg-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "desc" ? "الوصف" : tab === "shipping" ? "الشحن" : "الإرجاع"}
                </button>
              ))}
            </div>
            <div className="ppg-tab-content">
              {activeTab === "desc" && (
                <p className="ppg-desc-text">{String((product as any).description)}</p>
              )}
              {activeTab === "shipping" && (
                <div className="ppg-tab-info">
                  <p>🚀 توصيل سريع: 2–3 أيام عمل</p>
                  <p>📦 توصيل مجاني للطلبات فوق 200 ₪</p>
                  <p>🌍 نشحن لجميع المناطق داخل فلسطين</p>
                </div>
              )}
              {activeTab === "returns" && (
                <div className="ppg-tab-info">
                  <p>♻️ يمكنك إرجاع المنتج خلال 30 يوماً</p>
                  <p>✅ الإرجاع مجاني إذا كان المنتج معيباً</p>
                  <p>📞 تواصل مع خدمة العملاء لبدء طلب الإرجاع</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
