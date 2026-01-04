"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { cldUrl } from "@/lib/cloudinary";
import { LoadingIndicator } from "@/components/LoadingIndicator";

function normalizeHex(v?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

type ItemKey = string;

function makeItemKey(it: any, idx: number): ItemKey {
  const c = String(it?.colorName ?? "").trim();
  return c || `__item_${idx}`;
}

export function ProductGallery({ product, selectedColorKey, onSelectColorKey }: { product: CatalogProduct; selectedColorKey?: string; onSelectColorKey?: (k: string) => void }) {
  const items = (product.items ?? []) as any[];
  const itemsWithKeys = useMemo(() => {
    return items.map((it, idx) => ({ ...it, __key: makeItemKey(it, idx) }));
  }, [items]);

  const defaultKey = useMemo<ItemKey>(() => {
    if (selectedColorKey) return selectedColorKey;
    const first = itemsWithKeys[0];
    return first ? (first.__key as ItemKey) : "__item_0";
  }, [itemsWithKeys, selectedColorKey]);

  const [itemId, setItemId] = useState<ItemKey>(defaultKey);

  const item = itemsWithKeys.find((it) => it.__key === itemId) ?? itemsWithKeys[0];

  const images = useMemo(() => {
    const imgs = (item?.images ?? []) as Array<{ id?: string | null; url?: string | null; isPrimary?: boolean }>;
    // Ensure primary first when backend already sends it (isPrimary desc), otherwise keep order.
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

  useEffect(() => {
    // when changing color/item, reset gallery state
    setActiveIdx(0);
    setGalleryMode(false);
    setLightbox(false);
  }, [itemId]);

  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") setActiveIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setActiveIdx((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, images.length]);

  useEffect(() => {
    // clamp when images list changes
    if (activeIdx > 0 && activeIdx >= images.length) setActiveIdx(0);
  }, [images.length, activeIdx]);

  useEffect(() => {
    const prev = lastIdxRef.current;
    if (activeIdx > prev) setDir("next");
    else if (activeIdx < prev) setDir("prev");
    lastIdxRef.current = activeIdx;
  }, [activeIdx]);

  const active = images[activeIdx] ?? images[0];
  const primary = images[0];
  const secondary = images[1];
  const [mainReady, setMainReady] = useState(false);

  useEffect(() => {
    setMainReady(false);
  }, [active?.url]);

  const canPrev = images.length > 1 && activeIdx > 0;
  const canNext = images.length > 1 && activeIdx < images.length - 1;

  const swatches = useMemo(() => {
    return itemsWithKeys
      .map((it) => {
        const hex = normalizeHex(it.colorHex) ?? normalizeHex(it.suggestedColors?.[0] ?? null);
        return { id: String(it.__key), name: String(it.colorName ?? "").trim(), hex };
      })
      .filter((x) => x.hex || x.name);
  }, [itemsWithKeys]);

  return (
    <section className="grid gap-4">
      {/* Color swatches */}
      {swatches.length > 0 ? (
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
                  "h-7 w-7 rounded-full border transition",
                  selected ? "border-zinc-900 ring-2 ring-zinc-900/20 dark:border-white dark:ring-white/20" : "border-zinc-200 hover:scale-[1.03] dark:border-zinc-800",
                ].join(" ")}
                style={{ backgroundColor: s.hex ?? "transparent" }}
                title={s.name || s.hex || "Color"}
                aria-pressed={selected}
              />
            );
          })}
        </div>
      ) : null}

      {/* Main image */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900"
        role="button"
        tabIndex={0}
        onClick={() => images.length && setLightbox(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setLightbox(true);
        }}
        aria-label="Open image gallery"
      >
        {active?.url ? (
          <>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="absolute inset-0 z-10"
              aria-label="Open image"
            />

            {!mainReady ? (
              <LoadingIndicator className="pointer-events-none absolute inset-0 grid place-items-center" />
            ) : null}
            <Image
              key={active.url}
              src={cldUrl(active.url, { w: 1400, c: "fit" })}
              alt={product.title}
              fill
              className={
                "object-cover will-change-transform " +
                (dir === "next" ? "anim-slide-in-right" : "anim-slide-in-left")
              }
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              onLoadingComplete={() => setMainReady(true)}
              onError={() => setMainReady(true)}
            />
            {/* subtle hover swap to secondary when not in gallery mode */}
            {!galleryMode && secondary?.url && activeIdx === 0 ? (
              <Image
                src={cldUrl(secondary.url, { w: 1400, c: "fit" })}
                alt={product.title}
                fill
                className="object-cover opacity-0 transition duration-300 hover:opacity-100"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : null}

            {images.length > 1 ? (
              <>
                <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
                  {activeIdx + 1} / {images.length}
                </div>

                <div className="absolute inset-y-0 left-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                    disabled={!canPrev}
                    className={[
                      "h-10 w-10 rounded-full bg-black/40 text-white backdrop-blur",
                      canPrev ? "hover:bg-black/60" : "opacity-40 cursor-not-allowed",
                    ].join(" ")}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                </div>

                <div className="absolute inset-y-0 right-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => Math.min(images.length - 1, i + 1))}
                    disabled={!canNext}
                    className={[
                      "h-10 w-10 rounded-full bg-black/40 text-white backdrop-blur",
                      canNext ? "hover:bg-black/60" : "opacity-40 cursor-not-allowed",
                    ].join(" ")}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">No image</div>
        )}
      </div>

      {/* Thumbnails + gallery mode */}
      {images.length > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 pr-1">
            {images.map((im, idx) => {
              const selected = idx === activeIdx;
              return (
                <button
                  key={im.id ?? im.url ?? idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={[
                    "relative h-16 w-14 overflow-hidden rounded-xl border",
                    selected
                      ? "border-zinc-900 dark:border-white"
                      : "border-zinc-200 dark:border-zinc-800",
                  ].join(" ")}
                >
                  {im.url ? (
                    <Image src={cldUrl(im.url, { w: 160, h: 160, c: "fill", g: "auto" })} alt={product.title} fill className="object-cover" sizes="56px" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {images.length > 1 ? (
            <button
              type="button"
              onClick={() => setGalleryMode((v) => !v)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              {galleryMode ? "Hide gallery" : "Gallery mode"}
            </button>
          ) : null}
        </div>
      ) : null}

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
              className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {im.url ? <Image src={cldUrl(im.url, { w: 160, h: 160, c: "fill", g: "auto" })} alt={product.title} fill className="object-cover" sizes="96px" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightbox */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0" onClick={() => setLightbox(false)} />

          <div className="relative mx-auto flex h-full max-w-6xl flex-col px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/70">
                {activeIdx + 1} / {images.length}
              </div>
              <button
                type="button"
                onClick={() => setLightbox(false)}
                className="h-10 rounded-xl bg-white/10 px-4 text-sm text-white hover:bg-white/15"
              >
                إغلاق
              </button>
            </div>

            <div className="relative mt-4 flex-1 overflow-hidden rounded-3xl bg-black/30">
              {active?.url ? (
                <Image
                  src={cldUrl(active.url, { w: 2000, c: "fit" })}
                  alt={product.title}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              ) : null}

              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                    disabled={!canPrev}
                    className={[
                      "absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur",
                      canPrev ? "hover:bg-white/15" : "opacity-40 cursor-not-allowed",
                    ].join(" ")}
                    aria-label="Previous"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => Math.min(images.length - 1, i + 1))}
                    disabled={!canNext}
                    className={[
                      "absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur",
                      canNext ? "hover:bg-white/15" : "opacity-40 cursor-not-allowed",
                    ].join(" ")}
                    aria-label="Next"
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {images.map((im, idx) => {
                  const selected = idx === activeIdx;
                  return (
                    <button
                      key={im.id ?? im.url ?? idx}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={[
                        "relative h-16 w-14 overflow-hidden rounded-xl border",
                        selected ? "border-[var(--accent)]" : "border-[var(--border)] hover:opacity-90",
                      ].join(" ")}
                    >
                      {im.url ? (
                        <Image
                          src={cldUrl(im.url, { w: 160, h: 160, c: "fill", g: "auto" })}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="56px"
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
