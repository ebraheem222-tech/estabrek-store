import React from "react";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { LoadingText } from "@/components/LoadingText";

export default function LoadingCart() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <LoadingIndicator
        className="flex items-center justify-center py-24"
        fallback={<div className="text-sm text-[var(--muted)]"><LoadingText ar="جارٍ التحميل..." en="Loading…" /></div>}
      />
    </main>
  );
}

