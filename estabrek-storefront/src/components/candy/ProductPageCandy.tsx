"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { formatMoney } from "@/lib/catalog";
import type { CatalogProduct, CatalogItem, CatalogVariant } from "@/lib/catalog";

function getImages(product: CatalogProduct): string[] {
  const imgs: string[] = [];
  const seen = new Set<string>();
  const productImages = (product as any).images as Array<{url?:string;isPrimary?:boolean}> | undefined;
  if (Array.isArray(productImages)) {
    for (const im of productImages) {
      if (im?.url && !seen.has(im.url)) { seen.add(im.url); imgs.push(im.url); }
    }
  }
  for (const item of product.items ?? []) {
    for (const im of item.images ?? []) {
      if (im?.url && !seen.has(im.url)) { seen.add(im.url); imgs.push(im.url); }
    }
  }
  if (product.primaryImageUrl && !seen.has(product.primaryImageUrl)) {
    imgs.push(product.primaryImageUrl);
  }
  return imgs;
}

function getPrice(variant?: CatalogVariant): number | null {
  if (!variant) return null;
  const base = typeof variant.price === "number" ? variant.price : Number(variant.price?.toString?.() ?? "0");
  const sale = typeof variant.salePrice === "number" ? variant.salePrice : variant.salePrice ? Number(variant.salePrice.toString()) : null;
  return (sale && sale > 0 && sale < base) ? sale : base;
}

function getCompare(variant?: CatalogVariant): number | null {
  if (!variant) return null;
  const base = typeof variant.price === "number" ? variant.price : Number(variant.price?.toString?.() ?? "0");
  const sale = typeof variant.salePrice === "number" ? variant.salePrice : variant.salePrice ? Number(variant.salePrice.toString()) : null;
  if (sale && sale > 0 && sale < base) return base;
  const comp = variant.compareAt ? Number(variant.compareAt.toString()) : null;
  return comp && comp > base ? comp : null;
}

export default function ProductPageCandy({ product, currencyCode = "ILS" }: { product: CatalogProduct; currencyCode?: string }) {
  const images = getImages(product);
  const items = product.items ?? [];
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(items[0] ?? null);
  const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(items[0]?.variants?.[0] ?? null);
  const [qty, setQty] = useState(1);
  const [addedAnim, setAddedAnim] = useState(false);

  const { addItem } = useCart();
  const { addItem: addWish, removeItem: removeWish, isInWishlist } = useWishlist();
  const inWish = isInWishlist(product.id);

  const price = getPrice(selectedVariant ?? undefined);
  const compare = getCompare(selectedVariant ?? undefined);
  const discount = (price && compare) ? Math.round(((compare - price) / compare) * 100) : null;

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem(selectedVariant.id, qty);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 2000);
  };

  const toggleWish = () => {
    if (inWish) removeWish(product.id);
    else addWish(product as any);
  };

  return (
    <div className="candy-product-page" dir="rtl">
      {/* GALLERY */}
      <div className="candy-product-gallery">
        {/* Main image */}
        <div className="candy-gallery-main" style={{ position:"relative" }}>
          {images[selectedImg] ? (
            <img src={images[selectedImg]} alt={product.title} style={{ width:"100%",height:"100%",objectFit:"cover",transition:"opacity 0.3s" }} />
          ) : (
            <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"5rem",background:"linear-gradient(135deg,rgba(124,58,237,0.15),rgba(236,72,153,0.08))" }}>🛍</div>
          )}
          {discount && (
            <div style={{ position:"absolute",top:"1rem",right:"1rem",padding:"0.4rem 0.75rem",borderRadius:"9999px",background:"linear-gradient(135deg,#EF4444,#F59E0B)",color:"white",fontWeight:800,fontSize:"0.85rem" }}>
              -{discount}%
            </div>
          )}
          {/* Wishlist */}
          <button onClick={toggleWish} style={{ position:"absolute",top:"1rem",left:"1rem",width:40,height:40,borderRadius:"50%",background:"rgba(0,0,0,0.5)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"1.1rem",transition:"transform 0.2s",transform:inWish?"scale(1.2)":"scale(1)" }}>
            {inWish ? "❤️" : "🤍"}
          </button>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="candy-gallery-thumbs">
            {images.map((url, i) => (
              <button key={i} className={`candy-gallery-thumb${selectedImg===i?" active":""}`} onClick={() => setSelectedImg(i)}>
                <img src={url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* INFO */}
      <div className="candy-product-info">
        {product.category && (
          <div className="candy-product-category" style={{ marginBottom:"0.5rem",fontSize:"0.8rem" }}>{product.category.name}</div>
        )}

        <h1 className="candy-product-info-title">{product.title}</h1>

        {/* Reviews row */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"1rem" }}>
          <div style={{ display:"flex",gap:"2px" }}>
            {[0,1,2,3,4].map(i => <span key={i} style={{ color:"#F59E0B",fontSize:"0.85rem" }}>★</span>)}
          </div>
          <span style={{ fontSize:"0.8rem",color:"var(--text-muted)" }}>4.9 (128 تقييم)</span>
          <span style={{ fontSize:"0.75rem",color:"var(--candy-mint)",fontWeight:700 }}>✓ متوفر</span>
        </div>

        {/* Price */}
        <div className="candy-product-info-price">
          {price != null ? (
            <span className="candy-product-big-price">{formatMoney(price, currencyCode)}</span>
          ) : (
            <span className="candy-product-big-price" style={{ fontSize:"1.25rem" }}>السعر عند الطلب</span>
          )}
          {compare != null && (
            <span className="candy-product-old-price">{formatMoney(compare, currencyCode)}</span>
          )}
        </div>

        {/* Description snippet */}
        {(product as any).description && (
          <p style={{ fontSize:"0.875rem",color:"var(--text-secondary)",lineHeight:1.7,marginBottom:"1.25rem",padding:"1rem",background:"rgba(124,58,237,0.06)",borderRadius:"var(--radius-md)",border:"1px solid rgba(124,58,237,0.15)" }}>
            {String((product as any).description).slice(0, 180)}{String((product as any).description).length > 180 ? "..." : ""}
          </p>
        )}

        {/* Color swatches */}
        {items.length > 1 && (
          <div style={{ marginBottom:"1.25rem" }}>
            <div style={{ fontSize:"0.82rem",fontWeight:700,color:"var(--text-secondary)",marginBottom:"0.6rem" }}>
              اللون: <span style={{ color:"var(--text-primary)" }}>{selectedItem?.colorName || "—"}</span>
            </div>
            <div className="candy-color-swatches">
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`candy-color-swatch${selectedItem?.id===item.id?" active":""}`}
                  onClick={() => { setSelectedItem(item); setSelectedVariant(item.variants?.[0]??null); }}
                  title={item.colorName ?? ""}
                  style={{ background: item.colorHex ?? (item.suggestedColors?.[0] ? `#${item.suggestedColors[0].replace("#","")}` : "#888") }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Size chips */}
        {(selectedItem?.variants ?? []).length > 1 && (
          <div style={{ marginBottom:"1.5rem" }}>
            <div style={{ fontSize:"0.82rem",fontWeight:700,color:"var(--text-secondary)",marginBottom:"0.6rem" }}>
              المقاس: <span style={{ color:"var(--text-primary)" }}>{selectedVariant?.size?.name || "—"}</span>
            </div>
            <div className="candy-size-chips">
              {(selectedItem?.variants ?? []).map((v) => {
                const outOfStock = (v.stock ?? 1) <= 0;
                return (
                  <button
                    key={v.id}
                    className={`candy-size-chip${selectedVariant?.id===v.id?" active":""}${outOfStock?" out-of-stock":""}`}
                    onClick={() => !outOfStock && setSelectedVariant(v)}
                    disabled={outOfStock}
                  >
                    {v.size?.name ?? v.sku ?? "—"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Qty */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1.25rem" }}>
          <span style={{ fontSize:"0.82rem",fontWeight:700,color:"var(--text-secondary)" }}>الكمية:</span>
          <div style={{ display:"flex",alignItems:"center",gap:"0",background:"var(--bg-card)",border:"1px solid var(--border-glass)",borderRadius:"var(--radius-full)",overflow:"hidden" }}>
            <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ width:40,height:40,border:"none",background:"none",color:"var(--text-primary)",fontSize:"1.1rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
            <span style={{ minWidth:32,textAlign:"center",fontWeight:800,fontSize:"0.95rem",color:"var(--text-primary)" }}>{qty}</span>
            <button onClick={() => setQty(q => q+1)} style={{ width:40,height:40,border:"none",background:"none",color:"var(--text-primary)",fontSize:"1.1rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
          </div>
        </div>

        {/* Add to cart */}
        <button onClick={handleAddToCart} className="candy-add-to-cart-btn" style={{ marginBottom:"0.75rem" }}>
          {addedAnim ? "✅ تمت الإضافة للسلة!" : "🛒 أضف إلى السلة"}
        </button>

        {/* Trust badges */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.5rem",marginTop:"1.25rem" }}>
          {[{emoji:"🚀",label:"توصيل سريع"},{emoji:"🔒",label:"دفع آمن"},{emoji:"♻️",label:"إرجاع مجاني"}].map(b => (
            <div key={b.label} style={{ textAlign:"center",padding:"0.6rem",background:"var(--bg-card)",border:"1px solid var(--border-glass)",borderRadius:"var(--radius-md)" }}>
              <div style={{ fontSize:"1.1rem" }}>{b.emoji}</div>
              <div style={{ fontSize:"0.65rem",color:"var(--text-muted)",fontWeight:600,marginTop:"0.2rem" }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
