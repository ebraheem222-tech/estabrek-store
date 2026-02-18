"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { formatMoney, getProductPrimaryImage, getProductImageBlurDataUrl } from "@/lib/catalog";
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

function getSwatches(p: CatalogProduct): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const it of p.items ?? []) {
    const hex = normalizeHex(it.colorHex) ?? normalizeHex(it.suggestedColors?.[0] ?? null);
    if (!hex) continue;
    const key = hex.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hex);
    if (out.length >= 6) break;
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
  const { primary, secondary } = getCardImages(product);
  const swatches = getSwatches(product);
  const [isHovered, setIsHovered] = useState(false);
  const tiltEnabled = settings.cardTiltEffectEnabled;
  const prefetchEnabled = settings.prefetchLinks;
  const [allowPrefetch, setAllowPrefetch] = useState(false);
  const quickViewEnabled = settings.productQuickView;
  const primaryBlur = getProductImageBlurDataUrl(product, primary ?? null);
  const secondaryBlur = getProductImageBlurDataUrl(product, secondary ?? null);

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
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Link href={`/p/${product.slug}`} className="block relative" prefetch={prefetchEnabled}>
          {/* Image Container */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--surface-2)]">
            {primary ? (
              <>
                <LqipImage
                  src={cldUrl(primary, { w: 600, h: 750, c: "fill", g: "auto" })}
                  alt={product.title}
                  fill
                  loading="lazy"
                  blurDataUrl={primaryBlur ?? undefined}
                  className={[
                    "object-cover product-image-zoom will-change-transform",
                    secondary ? "opacity-100 group-hover:opacity-0" : "opacity-100",
                  ].join(" ")}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
                {secondary ? (
                  <LqipImage
                    src={cldUrl(secondary, { w: 600, h: 750, c: "fill", g: "auto" })}
                    alt={product.title}
                    fill
                    loading="lazy"
                    blurDataUrl={secondaryBlur ?? undefined}
                    className="object-cover product-image-zoom opacity-0 transition duration-500 group-hover:opacity-100 will-change-transform"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : null}
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
                {swatches.map((hex) => (
                  <span
                    key={hex}
                    className="color-swatch h-5 w-5 rounded-full border-2 border-[var(--border)] transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer"
                    style={{ background: hex }}
                    title={hex}
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

