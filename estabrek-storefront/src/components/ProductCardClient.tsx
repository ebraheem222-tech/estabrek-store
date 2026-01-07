"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/lib/catalog";
import { formatMoney, getProductPrimaryImage, getProductMinPrice } from "@/lib/catalog";
import { cldUrl } from "@/lib/cloudinary";
import { QuickAddButton } from "@/components/QuickAddButton";

function normalizeHex(v?: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

type Swatch = {
  key: string;
  name: string;
  hex: string | null;
  imageUrl?: string | null;
};

function getCardImages(p: CatalogProduct): { primary?: string; secondary?: string } {
  const it = p.items?.[0];
  const imgs = (it as any)?.images ?? [];
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
    const name = String(it.colorName ?? "").trim();
    if (!hex && !name) continue;
    const dedup = (hex ?? name).toLowerCase();
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    const imgs = it.images ?? [];
    const img = imgs[0]?.url ?? imgs[1]?.url ?? null;

    out.push({
      key: String(it.id ?? i),
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
    const imgs = it.images ?? [];
    const primaryImg = imgs.find((im) => im.isPrimary)?.url ?? imgs[0]?.url ?? it.primaryImageUrl ?? imgs[1]?.url ?? it.secondaryImageUrl ?? null;
    push(primaryImg);
    if (out.length >= 8) break;
  }

  return out;
}

export default function ProductCardClient({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const { primary, secondary } = useMemo(() => getCardImages(product), [product]);
  const swatches = useMemo(() => buildSwatches(product), [product]);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverImg, setHoverImg] = useState<string | null>(null);
  const minPrice = useMemo(() => getProductMinPrice(product), [product]);
  const autoVariantImages = useMemo(() => buildAutoVariantImages(product, primary), [product, primary]);
  const canAutoRotate = autoVariantImages.length > 1;
  const [autoIndex, setAutoIndex] = useState(0);

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
    <div
      className={
        // Luxury: clean card on warm paper + gold accents
        "group overflow-hidden rounded-2xl border border-black/10 bg-white/90 shadow-sm " +
        "transition duration-300 hover:-translate-y-0.5 hover:shadow-lg " +
        "hover:ring-1 hover:ring-[color:var(--accent-2)]"
      }
      onMouseEnter={() => {
        // page prefetch for instant navigation feel
        router.prefetch(`/p/${product.slug}`);
        setIsHovered(true);
        setAutoIndex(0);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoverImg(null);
        setAutoIndex(0);
      }}
    >
      <Link href={`/p/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/[0.04]">
          {badge ? (
            <div className="absolute left-3 top-3 z-10">
              <span
                className={
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur " +
                  (badge.tone === "danger"
                    ? "bg-red-600 text-white"
                    : badge.tone === "gold"
                    ? "bg-[color:var(--accent-2)] text-black"
                    : "bg-[var(--text)]/80 text-[var(--bg)]")
                }
              >
                {badge.text}
              </span>
            </div>
          ) : null}
          {shownImg ? (
            <>
              {prevImg ? (
                <Image
                  src={cldUrl(prevImg, { w: 600, h: 750, c: "fill", g: "auto" })}
                  alt={product.title}
                  fill
                  className={
                    "object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.03] will-change-transform " +
                    (fadeIn ? "opacity-0" : "opacity-100")
                  }
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              ) : null}
              <Image
                src={cldUrl(shownImg, { w: 600, h: 750, c: "fill", g: "auto" })}
                alt={product.title}
                fill
                className={
                  "object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.03] will-change-transform " +
                  (prevImg ? (fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1") : "opacity-100")
                }
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">No image</div>
          )}

          {/* subtle gold sheen on hover */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
            <div className="absolute -inset-24 rotate-12 bg-gradient-to-r from-transparent via-[color:var(--accent-1)]/20 to-transparent blur-2xl" />
          </div>

          {/* Quick Add overlay on hover (keeps AliExpress vibe) */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="pointer-events-auto">
              <QuickAddButton product={product} buttonLabel="إضافة سريعة" className="" />
            </div>
          </div>
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#0B0B0B]">{product.title}</div>
              <div className="mt-0.5 text-xs text-black/60">{(product as any).category?.name ?? "—"}</div>
            </div>
            <div className="shrink-0 text-sm font-semibold text-[color:var(--accent-2)]">
  {minPrice != null ? formatMoney(minPrice, "ILS") : "—"}
</div>
          </div>

          {/* gold underline accent */}
          <div className="h-px w-0 bg-[color:var(--accent-2)] transition-all duration-300 group-hover:w-full" />

          {/* swatches: circles, hover changes main image */}
          {swatches.length ? (
            <div className="flex items-center gap-1.5">
              {swatches.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className="h-4 w-4 rounded-full border border-black/15 transition hover:scale-110"
                  style={{ background: s.hex ?? "transparent" }}
                  title={s.name}
                  onMouseEnter={(e) => {
                    e.preventDefault();
                    if (s.imageUrl) setHoverImg(s.imageUrl);
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault();
                    setHoverImg(null);
                  }}
                />
              ))}
              {(product.items?.length ?? 0) > swatches.length ? (
                <span className="ml-1 text-xs text-black/60">+{(product.items?.length ?? 0) - swatches.length}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>

      {/* fallback: button visible when not hovering image area */}
      <div className="px-4 pb-4 group-hover:hidden">
        <QuickAddButton product={product} />
      </div>
    </div>
  );
}
