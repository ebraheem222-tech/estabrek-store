import React from "react";
import { ProductTileSkeleton } from "@/components/ProductTileSkeleton";
import { LoadingIndicator } from "@/components/LoadingIndicator";

export default function LoadingShop() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-32 rounded-xl bg-black/10" />
        <LoadingIndicator className="inline-grid place-items-center" />
      </div>

      <div className="lg:grid lg:grid-cols-[280px,1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3 rounded-2xl border border-black/10 bg-white p-4">
            <div className="h-5 w-24 rounded-lg bg-black/10" />
            <div className="h-10 w-full rounded-xl bg-black/10" />
            <div className="h-10 w-full rounded-xl bg-black/10" />
            <div className="h-10 w-full rounded-xl bg-black/10" />
            <div className="h-10 w-full rounded-xl bg-black/10" />
          </div>
        </aside>

        <section className="space-y-4">
          <div className="h-14 rounded-2xl border border-black/10 bg-white" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductTileSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
