import React from "react";
import { LoadingIndicator } from "@/components/LoadingIndicator";

export default function LoadingCmsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <LoadingIndicator
        className="flex items-center justify-center py-16"
        fallback={<div className="text-sm text-[var(--muted)]">جارٍ التحميل...</div>}
      />

      <div className="mt-10 space-y-4">
        <div className="h-10 w-2/3 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
        <div className="h-5 w-full rounded-xl bg-[var(--surface-2)] animate-pulse" />
        <div className="h-5 w-5/6 rounded-xl bg-[var(--surface-2)] animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}

