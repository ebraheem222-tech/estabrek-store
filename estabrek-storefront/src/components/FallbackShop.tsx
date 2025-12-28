import React from "react";
import Link from "next/link";
import { getCategoriesTree, listProducts } from "@/lib/api";
import { ProductTile } from "@/components/ProductTile";

export default async function FallbackShop() {
  const [cats, products] = await Promise.all([
    getCategoriesTree(),
    listProducts({ sort: "latest", page: 1, pageSize: 16 }),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">المتجر</h1>
        <p className="text-sm text-white/60">
          صفحة متجر افتراضية لأن صفحة <span className="text-white">/shop</span> مش منشورة بالـCMS بعد.
        </p>
      </section>

      {cats?.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">كل التصنيفات</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80 hover:bg-white/[0.07]"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">أحدث المنتجات</h2>
        {products.items?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.items.map((p) => (
              <ProductTile key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/70">
            ما في منتجات حالياً.
          </div>
        )}
      </section>
    </div>
  );
}
