"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import type { CatalogProduct } from "@/lib/catalog";
import { catalogItemKey, catalogItemLabel, formatMoney, getProductPrimaryImage, getVariantCompareAtPrice, getVariantEffectivePrice } from "@/lib/catalog";
import { getProductBySlugClient, getProductByIdClient } from "@/lib/apiClient";
import { imagesFor, inStock, itemHex, sizeKeyOf, startColorIndex } from "@/lib/roseProductMedia";
import { cldUrl } from "@/lib/cloudinary";
import { selectStorefrontColor } from "@/lib/storefrontColor";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useAnimationEffects } from "@/components/AnimationEffectsProvider";
import { useToastShortcuts } from "@/components/Toast";
import { LqipImage } from "@/components/LqipImage";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { roseReact } from "@/lib/roseEvents";

type Mode = "quickview" | "quickadd";

/** The storefront shell (colours, fonts, direction) the sheet should live in. */
function shellHost() {
  return document.querySelector<HTMLElement>(".cinematic-shell") ?? document.body;
}

/**
 * Rose quick view (centred, with the photo gallery) and quick add (side
 * drawer / bottom sheet, with the photo of the chosen colour). Both show the
 * product photo, follow the chosen colour, and add to the bag.
 */
export function RoseProductSheet({ product: initial, mode, onClose, onAdded }: { product: CatalogProduct; mode: Mode; onClose: () => void; onAdded?: () => void }) {
  const ar = useLanguage().language === "ar";
  const [product, setProduct] = useState(initial);
  const items = useMemo(() => product.items ?? [], [product]);
  const [colorKey, setColorKey] = useState(() => (items[0] ? catalogItemKey(items[0], 0) : ""));
  const itemIndex = Math.max(0, items.findIndex((it, i) => catalogItemKey(it, i) === colorKey));
  const item = items[itemIndex];
  const variants = useMemo(() => item?.variants ?? [], [item]);
  const sizes = useMemo(() => Array.from(new Set(variants.map(sizeKeyOf))), [variants]);
  const firstInStock = useMemo(() => variants.find(inStock) ?? variants[0], [variants]);
  const [sizeKey, setSizeKey] = useState(() => (firstInStock ? sizeKeyOf(firstInStock) : "default"));
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const { addItem } = useCart();
  const wishlist = useWishlist();
  const { fireConfetti } = useAnimationEffects();
  const toast = useToastShortcuts();
  useBodyScrollLock(true);

  const images = useMemo(() => imagesFor(product, item), [product, item]);
  const variant = variants.find((v) => sizeKeyOf(v) === sizeKey) ?? firstInStock ?? null;
  const price = variant ? getVariantEffectivePrice(variant) : null;
  const compareAt = variant ? getVariantCompareAtPrice(variant) : null;
  const available = inStock(variant);
  const saved = wishlist.isInWishlist(product.id);
  const href = `/p/${encodeURIComponent(product.slug ?? product.id)}`;

  // Lists send light products; fetch the full one when photos or sizes are missing.
  useEffect(() => {
    const thin = !imagesFor(initial, initial.items?.[0]).length || (initial.items ?? []).some((it) => (it.variants ?? []).some((v) => !v.size?.name));
    if (!thin) return;
    let alive = true;
    (initial.slug ? getProductBySlugClient(initial.slug) : getProductByIdClient(initial.id))
      .then((full) => { if (alive && full) setProduct(full); })
      .catch(() => {});
    return () => { alive = false; };
  }, [initial]);

  // The sheet takes the piece's colour on its own (the shopper's current colour
  // when the piece comes in it, otherwise its first colour in stock).
  useEffect(() => {
    if (!items.length) return;
    const current = document.documentElement.dataset.storefrontColor;
    const i = startColorIndex(items, current);
    setColorKey(catalogItemKey(items[i], i));
    const hex = itemHex(items[i]);
    if (hex && hex.toLowerCase() !== current?.toLowerCase()) selectStorefrontColor(hex, { auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  useEffect(() => { setPhoto(0); if (firstInStock) setSizeKey(sizeKeyOf(firstInStock)); }, [colorKey, firstInStock]);

  useEffect(() => {
    const el = panel.current;
    if (el) gsap.fromTo(el, mode === "quickview" ? { opacity: 0, y: 24, scale: 0.98 } : { opacity: 0, x: ar ? -40 : 40 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.35, ease: "power3.out", clearProps: "transform" });
    closeButton.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const img = panel.current?.querySelector(".rose-sheet-photo img");
    if (img) gsap.fromTo(img, { opacity: 0.2 }, { opacity: 1, duration: 0.35, ease: "power1.out", clearProps: "opacity" });
  }, [photo, colorKey]);

  function close() {
    if (closing) return;
    setClosing(true);
    const el = panel.current;
    if (!el) return onClose();
    gsap.to(el, { opacity: 0, ...(mode === "quickview" ? { y: 16 } : { x: ar ? -40 : 40 }), duration: 0.22, ease: "power1.in", onComplete: onClose });
  }

  const pickColor = (key: string, hex: string | null) => {
    setColorKey(key);
    setStatus(null);
    if (hex) selectStorefrontColor(hex);
  };

  const add = (event: MouseEvent<HTMLButtonElement>) => {
    if (!variant || !available) return;
    addItem(variant.id, Math.max(1, qty));
    fireConfetti(event.clientX, event.clientY);
    toast.cartAdded(product.title);
    setStatus(ar ? "أُضيفت القطعة إلى حقيبتكِ." : "Added to your bag.");
    onAdded?.();
    window.setTimeout(close, 800);
  };

  const toggleWish = () =>
    wishlist.toggleWishlist({ id: product.id, title: product.title, slug: product.slug ?? product.id, image: getProductPrimaryImage(product) ?? images[0], price: price ?? undefined });

  const current = images[Math.min(photo, Math.max(0, images.length - 1))];
  const sheet = (
    <div className={`rose-sheet-layer rose-sheet-${mode}${closing ? " closing" : ""}`} dir={ar ? "rtl" : "ltr"} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div
        ref={panel}
        className="rose-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "quickview" ? (ar ? `معاينة ${product.title}` : `Preview ${product.title}`) : (ar ? `أضيفي ${product.title} للحقيبة` : `Add ${product.title} to bag`)}
      >
        <div className="rose-sheet-top">
          <span className="atelier-eyebrow">{mode === "quickview" ? (ar ? "معاينة سريعة" : "QUICK VIEW") : (ar ? "إضافة سريعة" : "QUICK ADD")}</span>
          <button ref={closeButton} type="button" className="rose-sheet-close" onClick={close} aria-label={ar ? "إغلاق" : "Close"}><Icon name="close" /></button>
        </div>

        <div className="rose-sheet-media">
          <Link href={href} className="rose-sheet-photo" onClick={() => onClose()}>
            {current ? (
              <LqipImage key={current} src={cldUrl(current, { w: 900, h: 1125, c: "fill", g: "auto" })} alt={`${product.title}${item ? ` — ${catalogItemLabel(item, itemIndex)}` : ""}`} fill priority sizes={mode === "quickview" ? "(max-width: 760px) 100vw, 420px" : "160px"} className="object-cover" />
            ) : (
              <span className="rose-image-placeholder">استبرق</span>
            )}
          </Link>
          {mode === "quickview" && (
            <button type="button" className="rose-pdp-wish rose-sheet-wish" aria-pressed={saved} onClick={toggleWish} aria-label={saved ? (ar ? "إزالة من المفضلة" : "Remove from wishlist") : (ar ? "أضيفي للمفضلة" : "Save to wishlist")}>
              <Icon name="heart" />
            </button>
          )}
          {mode === "quickview" && images.length > 1 && (
            <div className="rose-sheet-thumbs" role="tablist" aria-label={ar ? "اختاري صورة" : "Choose a photo"}>
              {images.slice(0, 6).map((src, i) => (
                <button key={src} type="button" role="tab" aria-selected={i === photo} aria-label={`${ar ? "صورة" : "Photo"} ${i + 1}`} onClick={() => setPhoto(i)}>
                  <LqipImage src={cldUrl(src, { w: 120, h: 150, c: "fill", g: "auto" })} alt="" fill sizes="56px" className="object-cover" showSkeleton={false} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rose-sheet-info">
          {product.category?.name && <span className="rose-sheet-category">{product.category.name}</span>}
          <h2>{product.title}</h2>
          <div className="rose-sheet-price">
            {price != null && price > 0 ? <strong>{formatMoney(price, (product as any).currencyCode ?? undefined)}</strong> : <strong>{ar ? "تواصلي معنا للسعر" : "Ask us for the price"}</strong>}
            {compareAt && price && compareAt > price ? <s>{formatMoney(compareAt, (product as any).currencyCode ?? undefined)}</s> : null}
          </div>

          {items.length > 0 && (
            <div className="rose-sheet-option">
              <div className="rose-sheet-label">{ar ? "اللون" : "Colour"}: <b>{item ? catalogItemLabel(item, itemIndex) : ""}</b></div>
              <div className="rose-pdp-swatches rose-sheet-swatches" role="radiogroup" aria-label={ar ? "اللون" : "Colour"}>
                {items.map((it, i) => {
                  const key = catalogItemKey(it, i);
                  const hex = itemHex(it);
                  const soldOut = !(it.variants ?? []).some(inStock);
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={key === colorKey}
                      aria-label={catalogItemLabel(it, i)}
                      title={catalogItemLabel(it, i)}
                      disabled={soldOut}
                      className={`color-swatch rose-pdp-swatch${key === colorKey ? " active" : ""}`}
                      style={{ "--swatch-color": hex ?? "#d9c6cf" } as React.CSSProperties}
                      onClick={() => pickColor(key, hex)}
                    >
                      <span style={{ background: hex ?? "#d9c6cf" }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sizes.length > 0 && !(sizes.length === 1 && sizes[0] === "default") && (
            <div className="rose-sheet-option">
              <div className="rose-sheet-label">{ar ? "المقاس" : "Size"}: <b>{sizeKey === "default" ? (ar ? "مقاس واحد" : "One size") : sizeKey}</b></div>
              <div className="rose-pdp-sizes" role="radiogroup" aria-label={ar ? "المقاس" : "Size"}>
                {sizes.map((key) => {
                  const v = variants.find((x) => sizeKeyOf(x) === key);
                  return (
                    <button key={key} type="button" role="radio" aria-checked={key === sizeKey} disabled={!inStock(v)} className={key === sizeKey ? "active" : undefined} onClick={() => { setSizeKey(key); setStatus(null); roseReact("size-pick"); }}>
                      {key === "default" ? (ar ? "مقاس واحد" : "One size") : key}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rose-pdp-buy rose-sheet-buy">
            <div className="rose-pdp-qty" aria-label={ar ? "الكمية" : "Quantity"}>
              <button type="button" aria-label={ar ? "زيادة" : "More"} onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
              <input type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} aria-label={ar ? "الكمية" : "Quantity"} />
              <button type="button" aria-label={ar ? "إنقاص" : "Less"} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            </div>
            <button type="button" className="atelier-button button-dark rose-pdp-add" disabled={!available} onClick={add}>
              {available ? (ar ? "أضيفي للحقيبة" : "Add to bag") : (ar ? "غير متوفر" : "Unavailable")}
              <Icon name="bag" />
            </button>
          </div>
          {status && <p className="rose-pdp-status" role="status">{status}</p>}
          <Link href={href} className="atelier-text-link rose-sheet-details" onClick={() => onClose()}>
            {ar ? "كل التفاصيل" : "Full details"}
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </div>
  );
  return createPortal(sheet, shellHost());
}
