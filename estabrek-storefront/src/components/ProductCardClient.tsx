"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/lib/catalog";
import { catalogItemKey, catalogItemLabel, formatMoney, getProductPrimaryImage, getProductMinPrice, getProductImageBlurDataUrl, getProductDiscountPercent } from "@/lib/catalog";
import { cldUrl } from "@/lib/cloudinary";
import { QuickAddButton } from "@/components/QuickAddButton";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useQuickView } from "@/components/QuickViewModal";
import { LqipImage } from "@/components/LqipImage";

function normalizeHex(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

function isModelUrl(url?: string | null): boolean {
  const raw = String(url ?? "").trim().toLowerCase();
  if (!raw) return false;
  const clean = raw.split("?")[0].split("#")[0];
  return clean.endsWith(".glb") || clean.endsWith(".gltf");
}

function isRenderableImage(im?: { url?: string | null; view?: string | null } | null): boolean {
  if (!im?.url) return false;
  if (isModelUrl(im.url)) return false;
  const view = String(im.view ?? "").trim().toLowerCase();
  if (view === "3d") return false;
  return true;
}

type Swatch = {
  key: string;
  name: string;
  hex: string | null;
  imageUrl?: string | null;
};

function getCardImages(p: CatalogProduct): { primary?: string; secondary?: string } {
  const it = p.items?.[0];
  const imgs = ((it as any)?.images ?? []).filter((im: any) => isRenderableImage(im));
  const primary = imgs[0]?.url ?? getProductPrimaryImage(p);
  const secondary = imgs[1]?.url;
  return { primary, secondary };
}

function buildSwatches(p: CatalogProduct): Swatch[] {
  const out: Swatch[] = [];
  const seen = new Set<string>();

  const items = (p.items ?? []) as any[];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const hex = normalizeHex(it.colorHex) ?? normalizeHex(it.suggestedColors?.[0] ?? null);
    const name = catalogItemLabel(it, i);
    if (!hex && !name) continue;
    const dedup = catalogItemKey(it, i).toLowerCase();
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    const imgs = it.images ?? [];
    const img = imgs[0]?.url ?? imgs[1]?.url ?? null;

    out.push({
      key: catalogItemKey(it, i),
      name: name || hex || `Color ${i + 1}`,
      hex,
      imageUrl: img,
    });

    if (out.length >= 8) break;
  }
  return out;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function buildAutoVariantImages(p: CatalogProduct, primary?: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (url?: string | null) => {
    const u = String(url ?? "").trim();
    if (!u) return;
    const key = u.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(u);
  };

  push(primary ?? null);

  const items = p.items ?? [];
  for (const it of items) {
    const imgs = (it.images ?? []).filter((im) => isRenderableImage(im));
    const primaryImg = imgs.find((im) => im.isPrimary)?.url ?? imgs[0]?.url ?? it.primaryImageUrl ?? imgs[1]?.url ?? it.secondaryImageUrl ?? null;
    push(primaryImg);
    if (out.length >= 8) break;
  }

  return out;
}

export default function ProductCardClient({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const settings = useStorefrontSettings();
  const { openQuickView } = useQuickView();
  const cardRef = useRef<HTMLDivElement>(null);
  const { primary, secondary } = useMemo(() => getCardImages(product), [product]);
  const swatches = useMemo(() => buildSwatches(product), [product]);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverImg, setHoverImg] = useState<string | null>(null);
  const [activeSwatch, setActiveSwatch] = useState<string | null>(null);
  const minPrice = useMemo(() => getProductMinPrice(product), [product]);
  const discountPercent = useMemo(() => getProductDiscountPercent(product), [product]);
  const autoVariantImages = useMemo(() => buildAutoVariantImages(product, primary), [product, primary]);
  const canAutoRotate = autoVariantImages.length > 1;
  const [autoIndex, setAutoIndex] = useState(0);
  const tiltEnabled = settings.cardTiltEffectEnabled;
  const prefetchEnabled = settings.prefetchLinks;
  const quickViewEnabled = settings.productQuickView;

  // 3D tilt effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || prefersReducedMotion() || !tiltEnabled) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 25;
    const rotateY = (centerX - x) / 25;
    const spotlightX = (x / rect.width) * 100;
    const spotlightY = (y / rect.height) * 100;
    
    cardRef.current.style.setProperty('--rotate-x', `${rotateX}deg`);
    cardRef.current.style.setProperty('--rotate-y', `${rotateY}deg`);
    cardRef.current.style.setProperty('--spotlight-x', `${spotlightX}%`);
    cardRef.current.style.setProperty('--spotlight-y', `${spotlightY}%`);
  }, [tiltEnabled]);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--rotate-x', '0deg');
    cardRef.current.style.setProperty('--rotate-y', '0deg');
    setIsHovered(false);
    setHoverImg(null);
    setActiveSwatch(null);
    setAutoIndex(0);
  }, []);

  const badge = useMemo(() => {
    const items = (product.items ?? []) as any[];
    const variants = items.flatMap((it) => (it.variants ?? []) as any[]);
    const tracked = variants.some((v) => v.stock != null);
    const available = variants.filter((v) => v.stock == null || v.stock > 0);

    if (tracked && variants.length && available.length === 0) {
      return { text: "نفد", tone: "danger" as const };
    }

    if ((product.items?.length ?? 0) > 1) {
      return { text: "ألوان", tone: "neutral" as const };
    }

    const maybe = String((product as any).badgeText ?? "").trim();
    if (maybe) return { text: maybe, tone: "gold" as const };
    return null;
  }, [product]);

  const targetImg = useMemo(() => {
    if (hoverImg) return hoverImg;
    if (isHovered && canAutoRotate) return autoVariantImages[autoIndex] ?? primary ?? "";
    if (isHovered && secondary) return secondary;
    return primary ?? "";
  }, [autoIndex, autoVariantImages, canAutoRotate, hoverImg, isHovered, primary, secondary]);

  const [shownImg, setShownImg] = useState<string>(targetImg);
  const [prevImg, setPrevImg] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const shownBlur = useMemo(() => getProductImageBlurDataUrl(product, shownImg), [product, shownImg]);
  const prevBlur = useMemo(() => getProductImageBlurDataUrl(product, prevImg), [product, prevImg]);
  const shownImgRef = useRef(shownImg);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    shownImgRef.current = shownImg;
  }, [shownImg]);

  useEffect(() => {
    if (!targetImg) {
      setShownImg("");
      setPrevImg(null);
      setFadeIn(true);
      return;
    }

    const current = shownImgRef.current;
    if (targetImg === current) return;

    if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);

    setPrevImg(current || null);
    setShownImg(targetImg);
    setFadeIn(false);

    rafRef.current = window.requestAnimationFrame(() => setFadeIn(true));
    timeoutRef.current = window.setTimeout(() => {
      setPrevImg(null);
      timeoutRef.current = null;
    }, 500);

    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, [targetImg]);

  useEffect(() => {
    if (!isHovered) return;
    if (hoverImg) return;
    if (!canAutoRotate) return;
    if (prefersReducedMotion()) return;

    const interval = window.setInterval(() => {
      setAutoIndex((i) => (i + 1) % autoVariantImages.length);
    }, 1300);

    return () => window.clearInterval(interval);
  }, [autoVariantImages.length, canAutoRotate, hoverImg, isHovered]);

  return (
    <div className="perspective-container">
      <div
        ref={cardRef}
        className="product-card-3d group relative overflow-hidden rounded-2xl glass-card transition-all duration-300 hover:shadow-premium"
        onMouseEnter={() => {
          if (prefetchEnabled) {
            router.prefetch(`/p/${product.slug}`);
          }
          setIsHovered(true);
          setAutoIndex(0);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Link href={`/p/${product.slug}`} className="block" prefetch={prefetchEnabled}>
          {/* Image Container */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--surface-2)]">
            {discountPercent ? (
              <span className="discount-shape-badge discount-shape-badge--sm pointer-events-none absolute right-3 top-3 z-20 border border-rose-200/40 bg-rose-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
                -{discountPercent}%
              </span>
            ) : null}

            {/* Badge */}
            {badge ? (
              <div className="absolute left-3 top-3 z-20">
                <span
                  className={
                    "product-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-lg " +
                    (badge.tone === "danger"
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                      : badge.tone === "gold"
                      ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-black pulse-glow"
                      : "bg-[var(--text)]/90 text-[var(--bg)]")
                  }
                >
                  {badge.tone === "neutral" && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  )}
                  {badge.text}
                </span>
              </div>
            ) : null}

            {/* Images */}
            {shownImg ? (
              <>
                {prevImg ? (
                    <LqipImage
                      src={cldUrl(prevImg, { w: 600, h: 750, c: "fill", g: "auto" })}
                      alt={product.title}
                      fill
                      loading="lazy"
                      blurDataUrl={prevBlur ?? undefined}
                      showSkeleton={false}
                      className={
                        "object-cover product-image-zoom will-change-transform " +
                        (fadeIn ? "opacity-0" : "opacity-100")
                      }
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : null}
                <LqipImage
                  src={cldUrl(shownImg, { w: 600, h: 750, c: "fill", g: "auto" })}
                  alt={product.title}
                  fill
                  loading="lazy"
                  blurDataUrl={shownBlur ?? undefined}
                  className={
                    "object-cover product-image-zoom will-change-transform " +
                    (prevImg ? (fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1") : "opacity-100")
                  }
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              </>
            ) : (
              <div className="image-skeleton flex h-full w-full items-center justify-center text-xs text-[var(--muted)]">
                <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Gradient Overlay - Enhanced for dramatic effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none z-10" />

            {/* Shimmer Effect on Hover */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 z-10">
              <div className="absolute -inset-24 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl" />
            </div>

            {/* Quick View */}
            {quickViewEnabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openQuickView(product);
                }}
                className="absolute left-3 bottom-3 z-30 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-white backdrop-blur hover:bg-black/60"
              >
                معاينة سريعة
              </button>
            ) : null}

            {/* Quick Add Button - Slides up on hover with gradient */}
            <div className="absolute inset-x-0 bottom-0 p-3 z-20">
              <div className="quick-add-slide">
                <QuickAddButton product={product} buttonLabel="إضافة سريعة" className="w-full backdrop-blur-sm bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] hover:shadow-glow-medium transition-all duration-300" />
              </div>
            </div>

            {/* Image Counter - when multiple images */}
            {autoVariantImages.length > 1 && isHovered && (
              <div className="absolute top-3 right-3 z-20 flex gap-1">
                {autoVariantImages.slice(0, 5).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === autoIndex ? 'bg-white w-3' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="relative p-4 space-y-3">
            {/* Title & Price */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  {product.title}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--muted)] flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {(product as any).category?.name ?? "—"}
                </p>
              </div>
              <div className="price-shine shrink-0 text-sm font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] bg-clip-text text-transparent">
                {minPrice != null ? formatMoney(minPrice, "ILS") : "—"}
              </div>
            </div>

            {/* Animated Underline */}
            <div className="relative h-px bg-[var(--border)] overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-500 group-hover:w-full" />
            </div>

            {/* Color Swatches */}
            {swatches.length ? (
              <div className="flex items-center gap-2">
                {swatches.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`color-swatch h-5 w-5 rounded-full border-2 transition-all duration-200 ${
                      activeSwatch === s.key
                        ? 'border-[var(--accent)] scale-110 active ring-2 ring-[var(--accent)] ring-opacity-30'
                        : 'border-[var(--border)] hover:border-white/30 hover:scale-105 hover:shadow-md'
                    }`}
                    style={{ background: s.hex ?? "linear-gradient(135deg, #ddd, #999)" }}
                    title={s.name}
                    onMouseEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (s.imageUrl) {
                        setHoverImg(s.imageUrl);
                        setActiveSwatch(s.key);
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHoverImg(null);
                      setActiveSwatch(null);
                    }}
                  />
                ))}
                {(product.items?.length ?? 0) > swatches.length ? (
                  <span className="text-xs text-[var(--muted)] font-medium">
                    +{(product.items?.length ?? 0) - swatches.length}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </Link>

        {/* Fallback Quick Add - visible when not hovering image */}
        <div className="px-4 pb-4 group-hover:hidden">
          <QuickAddButton product={product} className="w-full" />
        </div>
      </div>
    </div>
  );
}
