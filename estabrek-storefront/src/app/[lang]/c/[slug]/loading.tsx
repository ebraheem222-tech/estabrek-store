import React from "react";
import { LoadingIndicator } from "@/components/LoadingIndicator";

function SkeletonTile() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="relative aspect-[4/5] w-full bg-[var(--surface-2)] animate-pulse" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-5/6 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="mt-3 h-10 w-full rounded-xl bg-[var(--surface-2)] animate-pulse" />
      </div>
    </div>
  );
}

export default function LoadingCategory() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="h-7 w-56 rounded-xl bg-[var(--surface-2)] animate-pulse" />
        <LoadingIndicator className="inline-grid place-items-center" />
      </div>

      <div className="h-14 rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonTile key={i} />
        ))}
      </div>
    </main>
  );
}

