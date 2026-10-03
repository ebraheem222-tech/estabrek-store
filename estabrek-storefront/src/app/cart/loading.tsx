import React from "react";
import { LoadingIndicator } from "@/components/LoadingIndicator";

export default function LoadingCart() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <LoadingIndicator
        className="flex items-center justify-center py-24"
        fallback={<div className="text-sm text-[var(--muted)]">جارٍ التحميل...</div>}
      />
    </main>
  );
}

