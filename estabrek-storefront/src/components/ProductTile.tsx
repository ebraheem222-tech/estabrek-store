"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import {
  catalogItemKey,
  catalogItemLabel,
  formatMoney,
  getProductPrimaryImage,
  getProductImageBlurDataUrl,
  getProductDiscountPercent,
} from "@/lib/catalog";
import { QuickAddButton } from "@/components/QuickAddButton";
import { cldUrl } from "@/lib/cloudinary";
import { prefetchProductQuickAdd } from "@/lib/apiClient";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useQuickView } from "@/components/QuickViewModal";
import { LqipImage } from "@/components/LqipImage";

function normalizeHex(v?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
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

function getCardImages(p: CatalogProduct): { primary?: string; secondary?: string } {
  const productImages = ((p as any).images ?? []) as Array<{ url?: string | null; isPrimary?: boolean; view?: string | null }>;

  if (p.primaryImageUrl || p.secondaryImageUrl) {
    return { primary: p.primaryImageUrl ?? undefined, secondary: p.secondaryImageUrl ?? undefined };
  }

  if (productImages.length) {
    const primary = (productImages.find((im) => im.isPrimary && isRenderableImage(im))?.url ?? productImages.find((im) => isRenderableImage(im))?.url) ?? undefined;
    const secondary = productImages.filter((im) => isRenderableImage(im))[1]?.url ?? undefined;
    if (primary || secondary) return { primary, secondary };
  }

  // Prefer the first visible item
  const it = p.items?.[0];
  const renderableImages = (it?.images ?? []).filter((im) => isRenderableImage(im));
  const primary = (it?.primaryImageUrl ?? renderableImages[0]?.url ?? getProductPrimaryImage(p)) ?? undefined;
  const secondary = (it?.secondaryImageUrl ?? renderableImages[1]?.url) ?? undefined;
  return { primary, secondary };
}

type Swatch = {
  key: string;
  name: string;
  hex: string;
  imageUrl?: string;
};

function buildSwatches(p: CatalogProduct): Swatch[] {
  const out: Swatch[] = [];
  const seen = new Set<string>();

  const items = p.items ?? [];
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    const hex = normalizeHex(it.colorHex) ?? normalizeHex(it.suggestedColors?.[0] ?? null);
    if (!hex) continue;

    const dedup = catalogItemKey(it, i).toLowerCase();
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    const imgs = (it.images ?? []).filter((im) => isRenderableImage(im));
    const imageUrl = (imgs.find((im) => im.isPrimary)?.url ?? imgs[0]?.url ?? it.primaryImageUrl ?? undefined) ?? undefined;
    out.push({
      key: dedup,
      name: catalogItemLabel(it, i) || hex,
      hex,
      imageUrl,
    });

    if (out.length >= 6) break;
  }

  return out;
}

function buildAutoHoverImages(p: CatalogProduct, primary?: string, secondary?: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (url?: string | null) => {
    const val = String(url ?? "").trim();
    if (!val) return;
    const key = val.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(val);
  };

  push(primary);
  push(secondary);

  for (const img of ((p as any).images ?? []) as Array<{ url?: string | null; view?: string | null }>) {
    if (!isRenderableImage(img)) continue;
    push(img.url);
    if (out.length >= 8) return out;
  }

  for (const it of p.items ?? []) {
    const imgs = (it.images ?? []).filter((im) => isRenderableImage(im));
    push(imgs.find((im) => im.isPrimary)?.url ?? imgs[0]?.url ?? it.primaryImageUrl ?? imgs[1]?.url ?? null);
    if (out.length >= 8) return out;
  }

  return out;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function ProductTile({ product }: { product: CatalogProduct }) {
  const settings = useStorefrontSettings();
  const { openQuickView } = useQuickView();
  const cardRef = useRef<HTMLDivElement>(null);
  const { primary, secondary } = useMemo(() => getCardImages(product), [product]);
  const swatches = useMemo(() => buildSwatches(product), [product]);
  const autoHoverImages = useMemo(() => buildAutoHoverImages(product, primary, secondary), [primary, product, secondary]);
  const canAutoRotate = autoHoverImages.length > 1;
  const [isHovered, setIsHovered] = useState(false);
  const [hoverImg, setHoverImg] = useState<string | null>(null);
  const [activeSwatch, setActiveSwatch] = useState<string | null>(null);
  const [autoIndex, setAutoIndex] = useState(0);
  const tiltEnabled = settings.cardTiltEffectEnabled;
  const prefetchEnabled = settings.prefetchLinks;
  const [allowPrefetch, setAllowPrefetch] = useState(false);
  const quickViewEnabled = settings.productQuickView;
  const discountPercent = getProductDiscountPercent(product);
  const targetImg = useMemo(() => {
    if (hoverImg) return hoverImg;
    if (isHovered && canAutoRotate) return autoHoverImages[autoIndex] ?? primary ?? "";
    if (isHovered && secondary) return secondary;
    return primary ?? "";
  }, [autoHoverImages, autoIndex, canAutoRotate, hoverImg, isHovered, primary, secondary]);
  const [shownImg, setShownImg] = useState<string>(targetImg);
  const [prevImg, setPrevImg] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(true);
  const shownBlur = useMemo(() => getProductImageBlurDataUrl(product, shownImg), [product, shownImg]);
  const prevBlur = useMemo(() => getProductImageBlurDataUrl(product, prevImg), [product, prevImg]);
  const shownImgRef = useRef(shownImg);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!prefetchEnabled || typeof window === "undefined") {
      setAllowPrefetch(false);
      return;
    }
    const hoverable = window.matchMedia?.("(hover:hover) and (pointer:fine)")?.matches ?? false;
    const connection = (navigator as any).connection;
    const saveData = Boolean(connection?.saveData);
    const effectiveType = String(connection?.effectiveType || "");
    const slow =
      saveData ||
      effectiveType.includes("2g") ||
      effectiveType.includes("slow-2g");
    setAllowPrefetch(hoverable && !slow);
  }, [prefetchEnabled]);

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
    if (current === targetImg) return;

    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setPrevImg(current || null);
    setShownImg(targetImg);
    setFadeIn(false);
    rafRef.current = window.requestAnimationFrame(() => setFadeIn(true));
    timeoutRef.current = window.setTimeout(() => {
      setPrevImg(null);
      timeoutRef.current = null;
    }, 520);

    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [targetImg]);

  useEffect(() => {
    if (!isHovered || hoverImg || !canAutoRotate || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      setAutoIndex((idx) => (idx + 1) % autoHoverImages.length);
    }, 1350);
    return () => window.clearInterval(timer);
  }, [autoHoverImages.length, canAutoRotate, hoverImg, isHovered]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

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

  return (
    <div className="perspective-container">
      <div
        ref={cardRef}
        className="product-card-3d group relative overflow-hidden rounded-2xl glass-card transition-all duration-300 hover:shadow-premium"
        onMouseEnter={() => {
          if (allowPrefetch) {
            const hasSizeNames = (product.items ?? []).some((it) => (it.variants ?? []).some((v: any) => v?.size?.name));
            if (hasSizeNames) {
              prefetchProductQuickAdd({ slug: product.slug, id: product.id });
            }
          }
          setIsHovered(true);
          setAutoIndex(0);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Link href={`/p/${product.slug}`} className="block relative" prefetch={prefetchEnabled}>
          {/* Image Container */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--surface-2)]">
            {discountPercent ? (
              <span className="discount-shape-badge discount-shape-badge--sm pointer-events-none absolute right-3 top-3 z-30 border border-rose-200/40 bg-rose-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
                -{discountPercent}%
              </span>
            ) : null}

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
                    className={"object-cover product-image-zoom will-change-transform " + (fadeIn ? "opacity-0" : "opacity-100")}
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
                    "object-cover product-image-zoom product-image-active will-change-transform " +
                    (prevImg ? (fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1") : "opacity-100")
                  }
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              </>
            ) : (
              <div className="image-skeleton flex h-full w-full items-center justify-center">
                <svg className="w-8 h-8 text-[var(--muted)] opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Gradient Overlay - Enhanced */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none z-10" />

            {/* Shimmer Effect */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100 z-10">
              <div className="absolute -inset-24 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl" />
            </div>

            {/* Chroma Wave Effect */}
            <div className="product-tile-chroma pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.26),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.15),transparent_46%)]" />

            {autoHoverImages.length > 1 && isHovered ? (
              <div className="absolute top-3 left-3 z-20 flex gap-1.5 rounded-full border border-white/20 bg-black/35 px-2 py-1 backdrop-blur-sm">
                {autoHoverImages.slice(0, 5).map((_, idx) => (
                  <span
                    key={`img-dot-${idx}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === autoIndex ? "w-3 bg-white" : "w-1.5 bg-white/45"}`}
                  />
                ))}
              </div>
            ) : null}
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
              className="quick-view-trigger-candy absolute left-3 bottom-3 z-30 rounded-full px-3 py-1 text-xs font-semibold"
            >
              معاينة سريعة
            </button>
          ) : null}

          {/* Content */}
          <div className="product-tile-meta relative p-4 space-y-3">
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
                  {product.category?.name ?? "—"}
                </p>
              </div>
              <div className="price-shine shrink-0 text-sm font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] bg-clip-text text-transparent">
                {product.minPrice != null ? formatMoney(product.minPrice, (product as any).currencyCode ?? null) : "-"}
              </div>
            </div>

            {/* Animated Underline */}
            <div className="relative h-px bg-[var(--border)] overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-500 group-hover:w-full" />
            </div>

            {/* Color Swatches */}
            {swatches.length ? (
              <div className="flex items-center gap-2">
                {swatches.map((swatch) => (
                  <button
                    key={swatch.key}
                    type="button"
                    className={`color-swatch h-5 w-5 rounded-full border-2 transition-all duration-200 ${
                      activeSwatch === swatch.key
                        ? "border-[var(--accent)] scale-110 active ring-2 ring-[var(--accent)]/30"
                        : "border-[var(--border)] hover:scale-105 hover:shadow-md"
                    }`}
                    style={{ background: swatch.hex }}
                    title={swatch.name}
                    onMouseEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (swatch.imageUrl) {
                        setHoverImg(swatch.imageUrl);
                        setActiveSwatch(swatch.key);
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
                {product.items && product.items.length > swatches.length ? (
                  <span className="text-xs text-[var(--muted)] font-medium">
                    +{product.items.length - swatches.length}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Quick Add on Hover with Gradient */}
          <div className="absolute inset-x-0 bottom-0 p-3 z-20">
            <div className="quick-add-slide">
              <QuickAddButton
                product={product}
                className="w-full backdrop-blur-sm bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] hover:shadow-glow-medium transition-all duration-300"
                buttonLabel="إضافة سريعة"
              />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
