import React from "react";
import { LoadingIndicator } from "@/components/LoadingIndicator";

export default function LoadingProduct() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-64 rounded-lg bg-black/10" />
        <LoadingIndicator className="inline-grid place-items-center" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="aspect-[4/5] w-full rounded-3xl bg-black/10" />
        <div className="rounded-3xl border border-black/10 bg-white p-5 space-y-4">
          <div className="h-6 w-3/4 rounded-xl bg-black/10" />
          <div className="h-4 w-1/2 rounded-xl bg-black/10" />
          <div className="h-10 w-full rounded-2xl bg-black/10" />
          <div className="h-10 w-full rounded-2xl bg-black/10" />
          <div className="h-12 w-full rounded-2xl bg-black/10" />
        </div>
      </div>
    </div>
  );
}
