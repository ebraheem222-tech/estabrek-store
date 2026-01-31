"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { catalogItemKey, catalogItemLabel } from "@/lib/catalog";
import { cldUrl } from "@/lib/cloudinary";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { LqipImage } from "@/components/LqipImage";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";

function normalizeHex(v?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

function is360View(value?: string | null) {
  const v = (value ?? "").toString().trim().toLowerCase();
  if (!v) return false;
  return v === "360" || v === "spin" || v.includes("360");
}

function isImageAsset(url?: string | null) {
  const u = String(url ?? "").trim().toLowerCase();
  if (!u) return false;
  const clean = u.split("?")[0].split("#")[0];
  return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"].some((ext) => clean.endsWith(ext));
}

function isModelAsset(url?: string | null) {
  const u = String(url ?? "").trim().toLowerCase();
  if (!u) return false;
  const clean = u.split("?")[0].split("#")[0];
  return clean.endsWith(".glb") || clean.endsWith(".gltf");
}

function is3dView(value?: string | null, url?: string | null) {
  if (isImageAsset(url)) return false;
  if (isModelAsset(url)) return true;
  const v = (value ?? "").toString().trim().toLowerCase();
  return v === "3d" || v.includes("3d") || v.includes("model") || v.includes("glb") || v.includes("gltf");
}

type ItemKey = string;

export function ProductGallery({ product, selectedColorKey, onSelectColorKey }: { product: CatalogProduct; selectedColorKey?: string; onSelectColorKey?: (k: string) => void }) {
  const settings = useStorefrontSettings();
  const items = (product.items ?? []) as any[];
  const itemsWithKeys = useMemo(() => {
    return items.map((it, idx) => ({ ...it, __key: catalogItemKey(it, idx) }));
  }, [items]);

  const defaultKey = useMemo<ItemKey>(() => {
    if (selectedColorKey) return selectedColorKey;
    const first = itemsWithKeys[0];
    return first ? (first.__key as ItemKey) : "__item_0";
  }, [itemsWithKeys, selectedColorKey]);

  const [itemId, setItemId] = useState<ItemKey>(defaultKey);

  const item = itemsWithKeys.find((it) => it.__key === itemId) ?? itemsWithKeys[0];

  const images = useMemo(() => {
    const raw = (item?.images ?? []) as Array<{ id?: string | null; url?: string | null; blurDataUrl?: string | null; isPrimary?: boolean; view?: string | null }>;
    const filtered = raw.filter((im) => !is360View(im?.view) && !is3dView(im?.view, im?.url));
    const imgs = filtered.length ? filtered : raw.filter((im) => !is3dView(im?.view, im?.url));
    const primaryIdx = imgs.findIndex((im: { isPrimary?: boolean }) => im.isPrimary);
    if (primaryIdx > 0) {
      const copy = [...imgs];
      const [p] = copy.splice(primaryIdx, 1);
      copy.unshift(p);
      return copy;
    }
    return imgs;
  }, [item]);

  useEffect(() => {
    if (!selectedColorKey) return;
    if (selectedColorKey === itemId) return;
    setItemId(selectedColorKey);
    setActiveIdx(0);
  }, [selectedColorKey, itemId]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [galleryMode, setGalleryMode] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const lastIdxRef = useRef(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const mainImageRef = useRef<HTMLDivElement>(null);
  const zoomEnabled = settings.productZoomEnabled;
  const imageLoading: "lazy" = "lazy";

  useEffect(() => {
    setActiveIdx(0);
    setGalleryMode(false);
    setLightbox(false);
    setIsZoomed(false);
  }, [itemId]);

  useEffect(() => {
    if (!zoomEnabled) setIsZoomed(false);
  }, [zoomEnabled]);

  useBodyScrollLock(lightbox);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") setActiveIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setActiveIdx((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, images.length]);

  useEffect(() => {
    if (activeIdx > 0 && activeIdx >= images.length) setActiveIdx(0);
  }, [images.length, activeIdx]);

  useEffect(() => {
    const prev = lastIdxRef.current;
    if (activeIdx > prev) setDir("next");
    else if (activeIdx < prev) setDir("prev");
    lastIdxRef.current = activeIdx;
  }, [activeIdx]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mainImageRef.current || !isZoomed || !zoomEnabled) return;
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, [isZoomed, zoomEnabled]);

  const active = images[activeIdx] ?? images[0];
  const primary = images[0];
  const secondary = images[1];

  const canPrev = images.length > 1 && activeIdx > 0;
  const canNext = images.length > 1 && activeIdx < images.length - 1;
  const zoomActive = zoomEnabled && isZoomed;

  const swatches = useMemo(() => {
    return itemsWithKeys
      .map((it) => {
        const hex = normalizeHex(it.colorHex) ?? normalizeHex(it.suggestedColors?.[0] ?? null);
        return { id: String(it.__key), name: catalogItemLabel(it, idx), hex };
      })
      .filter((x) => x.hex || x.name);
  }, [itemsWithKeys]);

  return (
    <section className="grid gap-4">
      {/* Color swatches */}
      {swatches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-xs text-[var(--muted)] font-medium">الألوان:</span>
          <div className="flex flex-wrap items-center gap-2">
            {swatches.map((s) => {
              const selected = s.id === itemId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setItemId(s.id);
                    setActiveIdx(0);
                    onSelectColorKey?.(s.id);
                  }}
                  className={[
                    "color-swatch h-8 w-8 rounded-xl border-2 transition-all",
                    selected 
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 scale-110 active" 
                      : "border-white/20 hover:scale-105 hover:border-white/40",
                  ].join(" ")}
                  style={{ 
                    backgroundColor: s.hex ?? "transparent",
                    boxShadow: selected && s.hex ? `0 4px 15px ${s.hex}40` : 'none'
                  }}
                  title={s.name || s.hex || "Color"}
                  aria-pressed={selected}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Main image */}
      <div
        ref={mainImageRef}
        className={`gallery-main-image relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[var(--surface-2)] group ${zoomEnabled ? "cursor-zoom-in" : "cursor-pointer"}`}
        role="button"
        tabIndex={0}
        onClick={() => images.length && setLightbox(true)}
        onMouseEnter={() => zoomEnabled && setIsZoomed(true)}
        onMouseLeave={() => zoomEnabled && setIsZoomed(false)}
        onMouseMove={zoomEnabled ? handleMouseMove : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setLightbox(true);
        }}
        aria-label="Open image gallery"
      >
        {active?.url ? (
          <>
            {/* Zoom indicator */}
            {zoomEnabled ? (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                ???? ???????
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="absolute inset-0 z-10"
              aria-label="Open image"
            />

            <LqipImage
              key={active.url}
              src={cldUrl(active.url, { w: 1400, c: "fit" })}
              alt={product.title}
              fill
              blurDataUrl={active.blurDataUrl ?? undefined}
              className={
                "object-cover will-change-transform transition-transform duration-500 " +
                (dir === "next" ? "anim-slide-in-right" : "anim-slide-in-left") +
                (zoomActive ? " scale-150" : "")
              }
              style={zoomActive ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
              sizes="(max-width: 1024px) 100vw, 50vw"
              loading={imageLoading}
            />
            
            {/* Hover swap to secondary */}
              {!galleryMode && secondary?.url && activeIdx === 0 ? (
                <LqipImage
                  src={cldUrl(secondary.url, { w: 1400, c: "fit" })}
                  alt={product.title}
                  fill
                  blurDataUrl={secondary.blurDataUrl ?? undefined}
                  className="object-cover opacity-0 transition duration-500 hover:opacity-100"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  loading={imageLoading}
                />
              ) : null}

            {/* Image counter & navigation */}
            {images.length > 1 ? (
              <>
                <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5 text-xs text-white font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {activeIdx + 1} / {images.length}
                </div>

                {/* Navigation buttons */}
                <div className="absolute inset-y-0 left-3 flex items-center z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIdx((i) => Math.max(0, i - 1));
                    }}
                    disabled={!canPrev}
                    className={[
                      "gallery-nav-btn h-12 w-12 rounded-full bg-black/50 text-white flex items-center justify-center",
                      canPrev ? "hover:bg-black/70" : "opacity-30 cursor-not-allowed",
                    ].join(" ")}
                    aria-label="Previous image"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>

                <div className="absolute inset-y-0 right-3 flex items-center z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIdx((i) => Math.min(images.length - 1, i + 1));
                    }}
                    disabled={!canNext}
                    className={[
                      "gallery-nav-btn h-12 w-12 rounded-full bg-black/50 text-white flex items-center justify-center",
                      canNext ? "hover:bg-black/70" : "opacity-30 cursor-not-allowed",
                    ].join(" ")}
                    aria-label="Next image"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Progress dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                  {images.slice(0, 8).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveIdx(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === activeIdx ? 'bg-white w-6' : 'bg-white/40 w-1.5 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="image-skeleton flex h-full w-full items-center justify-center">
            <svg className="w-12 h-12 text-[var(--muted)] opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Thumbnails + gallery mode toggle */}
      {images.length > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 pr-1 scrollbar-hide">
            {images.map((im, idx) => {
              const selected = idx === activeIdx;
              return (
                <button
                  key={im.id ?? im.url ?? idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={[
                    "relative h-16 w-14 overflow-hidden rounded-xl border-2 transition-all shrink-0",
                    selected
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20 scale-105"
                      : "border-white/15 hover:border-white/30",
                  ].join(" ")}
                >
                  {im.url ? (
                    <LqipImage 
                      src={cldUrl(im.url, { w: 160, h: 160, c: "fill", g: "auto" })} 
                      alt={product.title} 
                      fill 
                      blurDataUrl={im.blurDataUrl ?? undefined}
                      className="object-cover" 
                      sizes="56px"
                      loading={imageLoading}
                    />
                  ) : null}
                  {selected && (
                    <div className="absolute inset-0 bg-[var(--accent)]/10" />
                  )}
                </button>
              );
            })}
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              onClick={() => setGalleryMode((v) => !v)}
              className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {galleryMode ? "إخفاء" : "عرض الكل"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Gallery mode grid */}
      {galleryMode ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((im, idx) => (
            <button
              key={im.id ?? im.url ?? idx}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                setGalleryMode(false);
              }}
              className="stagger-item relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/15 bg-[var(--surface-2)] hover:border-[var(--accent)] transition-all group"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {im.url ? (
                <LqipImage 
                  src={cldUrl(im.url, { w: 400, h: 500, c: "fill", g: "auto" })} 
                  alt={product.title} 
                  fill 
                  blurDataUrl={im.blurDataUrl ?? undefined}
                  className="object-cover transition-transform duration-300 group-hover:scale-105" 
                  sizes="(max-width: 768px) 50vw, 33vw"
                  loading={imageLoading}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
                {idx + 1}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightbox */}
      {lightbox ? (
        <div
          className="lightbox-overlay fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0" onClick={() => setLightbox(false)} />

          <div className="relative mx-auto flex h-full max-w-6xl flex-col px-4 py-6">
            {/* Lightbox header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-white">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">{activeIdx + 1} / {images.length}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(false)}
                className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Main lightbox image */}
            <div className="lightbox-image relative flex-1 overflow-hidden rounded-3xl bg-black/30">
              {active?.url ? (
                <LqipImage
                  src={cldUrl(active.url, { w: 2000, c: "fit" })}
                  alt={product.title}
                  fill
                  blurDataUrl={active.blurDataUrl ?? undefined}
                  className="object-contain"
                  sizes="100vw"
                  loading={imageLoading}
                />
              ) : null}

              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                    disabled={!canPrev}
                    className={[
                      "gallery-nav-btn absolute left-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 text-white backdrop-blur-sm flex items-center justify-center",
                      canPrev ? "hover:bg-white/20" : "opacity-30 cursor-not-allowed",
                    ].join(" ")}
                    aria-label="Previous"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => Math.min(images.length - 1, i + 1))}
                    disabled={!canNext}
                    className={[
                      "gallery-nav-btn absolute right-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 text-white backdrop-blur-sm flex items-center justify-center",
                      canNext ? "hover:bg-white/20" : "opacity-30 cursor-not-allowed",
                    ].join(" ")}
                    aria-label="Next"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              ) : null}
            </div>

            {/* Lightbox thumbnails */}
            {images.length > 1 ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2 justify-center scrollbar-hide">
                {images.map((im, idx) => {
                  const selected = idx === activeIdx;
                  return (
                    <button
                      key={im.id ?? im.url ?? idx}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={[
                        "relative h-16 w-14 overflow-hidden rounded-xl border-2 transition-all shrink-0",
                        selected ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-white/20 hover:border-white/40",
                      ].join(" ")}
                    >
                      {im.url ? (
                        <LqipImage
                          src={cldUrl(im.url, { w: 160, h: 160, c: "fill", g: "auto" })}
                          alt={product.title}
                          fill
                          blurDataUrl={im.blurDataUrl ?? undefined}
                          className="object-cover"
                          sizes="56px"
                          loading={imageLoading}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}


