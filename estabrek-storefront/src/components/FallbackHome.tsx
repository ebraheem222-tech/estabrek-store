import React from "react";
import Link from "next/link";
import { getCategoriesTree, listProducts, getBootstrap } from "@/lib/api";
import { ProductTile } from "@/components/ProductTile";

export default async function FallbackHome() {
  const [bootstrap, cats, products] = await Promise.all([
    getBootstrap(),
    getCategoriesTree(),
    listProducts({ sort: "latest", page: 1, pageSize: 8 }),
  ]);

  const top = (cats ?? []).slice(0, 8);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold">{bootstrap.site.siteName || "Estabrak Store"}</h1>
          <p className="mt-2 text-white/70">
            صفحة هوم افتراضية لأن صفحة <span className="text-white">/</span> مش منشورة بالـCMS بعد.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/shop" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90">
              تسوّق الآن
            </Link>
            <Link href="/" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.08]">
              (CMS) جرّب لاحقاً
            </Link>
          </div>
        </div>
      </section>

      {top.length ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">التصنيفات</h2>
            <Link href="/shop" className="text-sm text-white/70 hover:text-white">عرض الكل</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {top.map((c) => (
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
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">أحدث المنتجات</h2>
          <Link href="/shop" className="text-sm text-white/70 hover:text-white">المتجر</Link>
        </div>

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
