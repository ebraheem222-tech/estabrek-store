"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogProduct } from "@/lib/catalog";
import { formatMoney, getProductPrimaryImage } from "@/lib/catalog";
import { cldUrl } from "@/lib/cloudinary";
import { QuickAddButton } from "@/components/QuickAddButton";
import { formatMoney, getProductMinPrice } from "@/lib/catalog";


const minPrice = useMemo(() => getProductMinPrice(product), [product]);

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

export default function ProductCardClient({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const { primary, secondary } = useMemo(() => getCardImages(product), [product]);
  const swatches = useMemo(() => buildSwatches(product), [product]);
  const [hoverImg, setHoverImg] = useState<string | null>(null);

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

  const baseImg = hoverImg || primary || "";

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
          {baseImg ? (
            <>
              <Image
                src={cldUrl(baseImg, { w: 600, h: 750, c: "fill", g: "auto" })}
                alt={product.title}
                fill
                className={
                  // Luxury hover: gentle zoom
                  "object-cover transition duration-500 group-hover:scale-[1.03] " +
                  "will-change-transform " +
                  (hoverImg
                    ? "opacity-100"
                    : secondary
                    ? "opacity-100 group-hover:opacity-0"
                    : "opacity-100")
                }
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />

              {/* default hover swap to secondary */}
              {!hoverImg && secondary ? (
                <Image
                  src={cldUrl(secondary, { w: 600, h: 750, c: "fill", g: "auto" })}
                  alt={product.title}
                  fill
                  className="object-cover opacity-0 transition duration-500 group-hover:opacity-100"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              ) : null}
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
