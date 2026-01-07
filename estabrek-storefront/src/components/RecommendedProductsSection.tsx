import React from "react";
import Link from "next/link";
import Image from "next/image";
import { recommendProducts } from "@/lib/api";
import { cldUrl } from "@/lib/cloudinary";
import { formatMoney } from "@/lib/catalog";

export default async function RecommendedProductsSection({
  productId,
  title = "منتجات مقترحة",
  limit = 8,
}: {
  productId?: string;
  title?: string;
  limit?: number;
}) {
  const rec = await recommendProducts({
    locale: "ar",
    productId,
    limit,
    excludeIds: productId ? [productId] : undefined,
  }).catch(() => null);

  const products = rec?.products ?? [];
  if (!products.length) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <Link href="/shop" className="text-xs text-white/60 hover:text-white">
          عرض المزيد
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/p/${encodeURIComponent(p.slug)}`}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.06]"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/[0.04]">
              {p.imageUrl ? (
                <Image
                  src={cldUrl(p.imageUrl, { w: 600, h: 750, c: "fill", g: "auto" })}
                  alt={p.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03] will-change-transform"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              ) : null}
            </div>
            <div className="space-y-1 p-3">
              <div className="line-clamp-2 text-sm font-semibold text-white">{p.title}</div>
              <div className="text-xs text-white/70">
                {p.minPrice != null ? formatMoney(p.minPrice, "ILS") : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

