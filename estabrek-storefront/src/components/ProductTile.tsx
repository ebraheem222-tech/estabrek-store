"use client";

import Link from "next/link";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog";
import { getProductPrimaryImage } from "@/lib/catalog";
import { QuickAddButton } from "@/components/QuickAddButton";
import { cldUrl } from "@/lib/cloudinary";
import { prefetchProductQuickAdd } from "@/lib/apiClient";

function normalizeHex(v?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

function getCardImages(p: CatalogProduct): { primary?: string; secondary?: string } {
  const productImages = (p as any).images as Array<{ url?: string; isPrimary?: boolean }> | undefined;

  if (p.primaryImageUrl || p.secondaryImageUrl) {
    return { primary: p.primaryImageUrl ?? undefined, secondary: p.secondaryImageUrl ?? undefined };
  }

  if (Array.isArray(productImages) && productImages.length) {
    const primary = productImages.find((im) => im.isPrimary)?.url ?? productImages[0]?.url;
    const secondary = productImages[1]?.url;
    if (primary || secondary) return { primary, secondary };
  }

  // Prefer the first visible item
  const it = p.items?.[0];
  const primary = it?.primaryImageUrl ?? it?.images?.[0]?.url ?? getProductPrimaryImage(p);
  const secondary = it?.secondaryImageUrl ?? it?.images?.[1]?.url;
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

export function ProductTile({ product }: { product: CatalogProduct }) {
  const { primary, secondary } = getCardImages(product);
  const swatches = getSwatches(product);

  return (
    <div
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
      onMouseEnter={() => {
        // Hovering the whole card should prime quick-add data
        prefetchProductQuickAdd({ slug: product.slug, id: product.id });
      }}
    >
      <Link href={`/p/${product.slug}`} className="block relative">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          {primary ? (
            <>
              <Image
                src={cldUrl(primary, { w: 600, h: 750, c: "fill", g: "auto" })}
                alt={product.title}
                fill
                className={[
                  "object-cover transition duration-300",
                  secondary ? "opacity-100 group-hover:opacity-0" : "opacity-100",
                ].join(" ")}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
              {secondary ? (
                <Image
                  src={cldUrl(secondary, { w: 600, h: 750, c: "fill", g: "auto" })}
                  alt={product.title}
                  fill
                  className="object-cover opacity-0 transition duration-300 group-hover:opacity-100"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
              No image
            </div>
          )}
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{product.title}</div>
              <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-300">
                {product.category?.name ?? "—"}
              </div>
            </div>
            <div className="shrink-0 text-sm font-semibold">
              {product.minPrice != null ? `$${product.minPrice}` : "—"}
            </div>
          </div>

          {swatches.length ? (
            <div className="flex items-center gap-1.5">
              {swatches.map((hex) => (
                <span
                  key={hex}
                  className="h-4 w-4 rounded-full border border-zinc-200 dark:border-zinc-800"
                  style={{ background: hex }}
                  title={hex}
                />
              ))}
              {product.items && product.items.length > swatches.length ? (
                <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                  +{product.items.length - swatches.length}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {/* Hover quick add */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 transition duration-200 group-hover:opacity-100">
          <div className="pointer-events-auto">
            <QuickAddButton
              product={product}
              className="w-full"
              buttonLabel="إضافة سريعة"
            />
          </div>
        </div>
      </Link>
    </div>
  );
}