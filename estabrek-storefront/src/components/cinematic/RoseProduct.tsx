"use client";
import { productItem, trackAddToCart, trackViewItem } from "@/lib/analytics";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { gsap } from "gsap";
import type { CatalogItem, CatalogProduct, CatalogVariant } from "@/lib/catalog";
import {
  catalogItemKey,
  catalogItemLabel,
  formatMoney,
  getProductImageBlurDataUrl,
  getProductPrimaryImage,
  getVariantCompareAtPrice,
  getVariantEffectivePrice,
} from "@/lib/catalog";
import { getProductBadge } from "@/lib/productBadges";
import { imagesFor, itemHex, sizeKeyOf, startColorIndex } from "@/lib/roseProductMedia";
import { cldUrl } from "@/lib/cloudinary";
import { selectStorefrontColor } from "@/lib/storefrontColor";
import { startThemeCycle, stopThemeCycle } from "@/lib/themePreview";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useRecentlyViewed } from "@/store/recentlyViewed";
import { useAnimationEffects } from "@/components/AnimationEffectsProvider";
import { useToastShortcuts } from "@/components/Toast";
import { LqipImage } from "@/components/LqipImage";
import { SizeGuide } from "@/components/SizeGuide";
import { ProductTile } from "@/components/ProductTile";
import { useLanguage } from "./Language";
import { Icon } from "./Icons";
import { RoseImageViewer } from "./RoseImageViewer";
import { roseOutfit, roseReact } from "@/lib/roseEvents";

type Crumb = { label: string; href: string };


/**
 * Rose product page: a framed gallery that follows the chosen colour, the
 * colour and size choices, and add-to-bag, in the storefront's own design.
 */
export function RoseProduct({ product, crumbs, related }: { product: CatalogProduct; crumbs: Crumb[]; related: CatalogProduct[] }) {
  const ar = useLanguage().language === "ar";
  const items = useMemo(() => product.items ?? [], [product]);
  const [colorKey, setColorKey] = useState(() => (items[0] ? catalogItemKey(items[0], 0) : ""));
  const itemIndex = Math.max(0, items.findIndex((it, i) => catalogItemKey(it, i) === colorKey));
  const item = items[itemIndex];
  const variants = useMemo(() => item?.variants ?? [], [item]);
  const sizes = useMemo(() => Array.from(new Set(variants.map(sizeKeyOf))), [variants]);
  const firstInStock = useMemo(() => variants.find((v) => v.stock == null || v.stock > 0) ?? variants[0], [variants]);
  const [sizeKey, setSizeKey] = useState(() => (firstInStock ? sizeKeyOf(firstInStock) : "default"));
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const images = useMemo(() => imagesFor(product, item), [product, item]);
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const wishlist = useWishlist();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { fireConfetti } = useAnimationEffects();
  const toast = useToastShortcuts();

  const variant = variants.find((v) => sizeKeyOf(v) === sizeKey) ?? firstInStock ?? null;
  const price = variant ? getVariantEffectivePrice(variant) : null;
  const compareAt = variant ? getVariantCompareAtPrice(variant) : null;
  const discount = price && compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;
  const inStock = Boolean(variant) && (variant!.stock == null || variant!.stock > 0);
  const lowStock = inStock && variant?.stock != null && variant.stock <= 3;
  const badge = useMemo(() => getProductBadge(product), [product]);
  const currency = (product as any).currencyCode ?? null;
  const saved = wishlist.isInWishlist(product.id);

  useEffect(() => {
    addToRecentlyViewed({ id: product.id, title: product.title, slug: product.slug, image: getProductPrimaryImage(product) ?? undefined, price: price ?? undefined });
    trackViewItem(productItem(product, { color: item?.colorName, price }), currency ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Rose says hello to each new piece the shopper opens.
  useEffect(() => {
    const t = window.setTimeout(() => roseReact("product-view"), 1200);
    // …and dresses for the piece's collection.
    const o = window.setTimeout(() => roseOutfit(`${product.category?.slug ?? ""} ${product.category?.name ?? ""}`), 3600);
    return () => { window.clearTimeout(t); window.clearTimeout(o); };
  }, [product.id, product.category?.slug, product.category?.name]);

  // The page takes the piece's colour on its own — no need to tap the swatch that
  // is already selected: the shopper's current colour when the piece comes in it,
  // otherwise its first colour in stock.
  useEffect(() => {
    if (!items.length) return;
    const current = document.documentElement.dataset.storefrontColor;
    const i = startColorIndex(items, current);
    setColorKey(catalogItemKey(items[i], i));
    const hex = itemHex(items[i]);
    if (hex && hex.toLowerCase() !== current?.toLowerCase()) selectStorefrontColor(hex, { auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // A new colour starts on its first photo and its first size in stock.
  useEffect(() => {
    setActive(0);
    if (firstInStock) setSizeKey(sizeKeyOf(firstInStock));
  }, [colorKey, firstInStock]);

  // Photos cross-fade in.
  useEffect(() => {
    const el = frame.current?.querySelector(".rose-pdp-main-image");
    // clearProps: an inline transform left behind would cancel the hover zoom.
    if (el) gsap.fromTo(el, { opacity: 0, scale: 1.03 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out", clearProps: "transform,opacity" });
  }, [active, colorKey]);

  const pickColor = (key: string, it: CatalogItem) => {
    setColorKey(key);
    setStatus(null);
    const hex = itemHex(it);
    if (hex) selectStorefrontColor(hex);
  };

  const onZoom = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100, y = ((event.clientY - box.top) / box.height) * 100;
    zoom.current?.style.setProperty("--zoom-origin", `${x}% ${y}%`);
  };

  const add = (event: MouseEvent<HTMLButtonElement>) => {
    if (!variant || !inStock) return;
    addItem(variant.id, Math.max(1, qty));
    trackAddToCart(productItem(product, { color: item?.colorName, size: (variant as any).size?.name, price, quantity: Math.max(1, qty) }), currency ?? undefined);
    fireConfetti(event.clientX, event.clientY);
    toast.cartAdded(product.title);
    setStatus(ar ? "أُضيفت القطعة إلى حقيبتكِ." : "Added to your bag.");
    window.setTimeout(() => setStatus(null), 2600);
  };

  const currentImage = images[Math.min(active, images.length - 1)];
  return (
    <div className="rose-pdp">
      <nav className="rose-crumbs" aria-label={ar ? "مسار التصفح" : "Breadcrumb"}>
        {crumbs.map((c, i) => (
          <span key={`${c.href}-${i}`}>
            {i < crumbs.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            {i < crumbs.length - 1 && <span aria-hidden="true" className="crumb-sep">/</span>}
          </span>
        ))}
      </nav>

      <div className="rose-pdp-grid">
        <section className="rose-pdp-gallery" aria-label={ar ? "صور المنتج" : "Product photos"}>
          {images.length > 1 && (
            <div className="rose-pdp-thumbs" role="tablist" aria-label={ar ? "اختاري صورة" : "Choose a photo"}>
              {images.map((src, i) => (
                <button key={src} role="tab" aria-selected={i === active} aria-label={`${ar ? "صورة" : "Photo"} ${i + 1}`} onClick={() => setActive(i)}>
                  <LqipImage src={cldUrl(src, { w: 160, h: 200, c: "fill", g: "auto" })} alt="" fill sizes="80px" className="object-cover" showSkeleton={false} />
                </button>
              ))}
            </div>
          )}
          <div ref={frame} className="rose-pdp-frame">
            {discount ? <span className="rose-badge rose-badge-limited">−{discount}%</span> : badge ? <span className={`rose-badge rose-badge-${badge.kind}`}>{ar ? badge.ar : badge.en}</span> : null}
            <button
              type="button"
              className="rose-pdp-wish"
              aria-pressed={saved}
              aria-label={saved ? (ar ? "إزالة من المفضلة" : "Remove from wishlist") : (ar ? "أضيفي للمفضلة" : "Save to wishlist")}
              onClick={() => wishlist.toggleWishlist({ id: product.id, title: product.title, slug: product.slug, image: getProductPrimaryImage(product) ?? undefined, price: price ?? undefined })}
            >
              <Icon name="heart" />
            </button>
            <div
              ref={zoom}
              className="rose-pdp-zoom"
              onMouseMove={onZoom}
              onClick={() => currentImage && setViewer(true)}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && currentImage) { e.preventDefault(); setViewer(true); } }}
              role="button"
              tabIndex={currentImage ? 0 : -1}
              aria-label={ar ? "عرض الصور بحجم كبير" : "View photos full screen"}
            >
              {currentImage ? (
                <LqipImage
                  key={currentImage}
                  src={cldUrl(currentImage, { w: 1200, h: 1500, c: "fill", g: "auto" })}
                  alt={`${product.title}${item ? ` — ${catalogItemLabel(item, itemIndex)}` : ""}`}
                  fill
                  priority
                  blurDataUrl={getProductImageBlurDataUrl(product, currentImage) ?? undefined}
                  sizes="(max-width: 900px) 100vw, 46vw"
                  className="object-cover rose-pdp-main-image"
                />
              ) : (
                <span className="rose-image-placeholder">استبرق</span>
              )}
            </div>
          </div>
          {viewer && (
            <RoseImageViewer
              images={images}
              index={Math.min(active, images.length - 1)}
              title={product.title}
              host={frame.current?.closest<HTMLElement>(".cinematic-shell") ?? null}
              onIndex={setActive}
              onClose={() => setViewer(false)}
            />
          )}
        </section>

        <section className="rose-pdp-info" aria-labelledby="pdp-title">
          {product.category?.name && (
            <Link className="atelier-eyebrow" href={product.category.slug ? `/c/${product.category.slug}` : "/shop"}>
              <Icon name="spark" />
              {product.category.name}
            </Link>
          )}
          <h1 id="pdp-title">{product.title}</h1>
          <div className="rose-pdp-price">
            {price != null && price > 0 ? <strong>{formatMoney(price, currency)}</strong> : <strong>{ar ? "تواصلي معنا للسعر" : "Ask us for the price"}</strong>}
            {discount && compareAt ? <s>{formatMoney(compareAt, currency)}</s> : null}
            <span className={`rose-pdp-stock${inStock ? "" : " out"}`}>
              {inStock ? (lowStock ? (ar ? `آخر ${variant?.stock} قطع` : `Only ${variant?.stock} left`) : (ar ? "متوفر" : "In stock")) : (ar ? "نفد هذا المقاس" : "Sold out in this size")}
            </span>
          </div>

          {items.length > 0 && (
            <div className="rose-pdp-option">
              <div className="rose-pdp-option-head">
                <span>{ar ? "اللون" : "Colour"}</span>
                <b>{item ? catalogItemLabel(item, itemIndex) : ""}</b>
              </div>
              <div className="rose-pdp-swatches" role="radiogroup" aria-label={ar ? "اللون" : "Colour"}>
                {items.map((it, i) => {
                  const key = catalogItemKey(it, i);
                  const hex = itemHex(it) ?? "#e8d8de";
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={key === colorKey}
                      title={it.colorName ?? catalogItemLabel(it, i)}
                      aria-label={catalogItemLabel(it, i)}
                      className={`color-swatch rose-pdp-swatch${key === colorKey ? " active" : ""}`}
                      style={{ "--swatch-color": hex } as CSSProperties}
                      onClick={() => pickColor(key, it)}
                    >
                      <span />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sizes.length > 0 && !(sizes.length === 1 && sizes[0] === "default") && (
            <div className="rose-pdp-option">
              <div className="rose-pdp-option-head">
                <span>{ar ? "المقاس" : "Size"}</span>
                <b>{sizeKey !== "default" ? sizeKey : ""}</b>
                <SizeGuide />
              </div>
              <div className="rose-pdp-sizes" role="radiogroup" aria-label={ar ? "المقاس" : "Size"}>
                {sizes.map((key) => {
                  const v = variants.find((x) => sizeKeyOf(x) === key);
                  const soldOut = !v || (v.stock != null && v.stock <= 0);
                  return (
                    <button key={key} type="button" role="radio" aria-checked={key === sizeKey} disabled={soldOut} className={key === sizeKey ? "active" : undefined} onClick={() => { setSizeKey(key); setStatus(null); roseReact("size-pick"); }}>
                      {key === "default" ? (ar ? "مقاس واحد" : "One size") : key}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rose-pdp-buy">
            <div className="rose-pdp-qty" aria-label={ar ? "الكمية" : "Quantity"}>
              <button type="button" aria-label={ar ? "زيادة" : "More"} onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
              <input type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} aria-label={ar ? "الكمية" : "Quantity"} />
              <button type="button" aria-label={ar ? "إنقاص" : "Less"} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            </div>
            <button
              type="button"
              className="atelier-button button-dark rose-pdp-add"
              disabled={!inStock}
              onClick={add}
              onMouseEnter={(e) => startThemeCycle(e.currentTarget)}
              onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) startThemeCycle(e.currentTarget); }}
              onBlur={(e) => stopThemeCycle(e.currentTarget)}
              onMouseLeave={(e) => stopThemeCycle(e.currentTarget)}
            >
              {inStock ? (ar ? "أضيفي للحقيبة" : "Add to bag") : (ar ? "غير متوفر" : "Unavailable")}
              <Icon name="bag" />
            </button>
          </div>
          {status && <p className="rose-pdp-status" role="status">{status}</p>}

          <ul className="rose-pdp-trust">
            <li><Icon name="truck" />{ar ? "توصيل لكل البلاد" : "Delivery nationwide"}</li>
            <li><Icon name="cash" />{ar ? "الدفع عند الاستلام" : "Cash on delivery"}</li>
            <li><Icon name="swap" />{ar ? "استبدال سهل" : "Easy exchange"}</li>
          </ul>

          <div className="rose-pdp-details">
            {product.description && (
              <details open>
                <summary>{ar ? "عن القطعة" : "About this piece"}<span aria-hidden="true">+</span></summary>
                <p>{product.description}</p>
              </details>
            )}
            <details>
              <summary>{ar ? "التوصيل والاستبدال" : "Delivery & exchange"}<span aria-hidden="true">+</span></summary>
              <p>{ar ? "نوصل لكل البلاد، والدفع عند الاستلام. إذا لم يناسبكِ المقاس، تواصلي معنا عبر واتساب ونرتّب الاستبدال، بشرط أن تكون القطعة بحالتها الأصلية مع الملصق." : "We deliver nationwide with cash on delivery. If the size isn't right, message us on WhatsApp and we'll arrange an exchange while the piece is unworn with its tag."}</p>
            </details>
            <details>
              <summary>{ar ? "العناية بالقطعة" : "Care"}<span aria-hidden="true">+</span></summary>
              <p>{ar ? "اتبعي تعليمات الغسيل على ملصق القطعة. يُفضّل الغسيل بماء بارد وتجفيفها بعيداً عن الشمس المباشرة للحفاظ على اللون." : "Follow the washing label. Cool water and drying out of direct sun keep the colour fresh."}</p>
            </details>
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section className="rose-pdp-related" aria-labelledby="pdp-related">
          <div className="atelier-section-heading">
            <div>
              <span className="atelier-eyebrow">{ar ? "من نفس المجموعة" : "FROM THE SAME COLLECTION"}</span>
              <h2 id="pdp-related">{ar ? "قد يعجبكِ أيضاً." : "You may also love."}</h2>
            </div>
            {product.category?.slug && (
              <Link href={`/c/${product.category.slug}`} className="atelier-text-link">
                {ar ? "كل المجموعة" : "See the collection"}
                <Icon name="arrow" />
              </Link>
            )}
          </div>
          <div className="rose-pdp-related-grid">
            {related.map((p) => <ProductTile key={p.id} product={p} appearance="rose" />)}
          </div>
        </section>
      )}
    </div>
  );
}
