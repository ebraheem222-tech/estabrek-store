import React from "react";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { ProductDetailSkeleton, Skeleton } from "@/components/Skeleton";
import { ProductTileSkeleton } from "@/components/ProductTileSkeleton";

export default function LoadingProduct() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-64 rounded-lg bg-black/10" />
        <LoadingIndicator className="inline-grid place-items-center" />
      </div>

      <ProductDetailSkeleton />

      <section className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductTileSkeleton key={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
