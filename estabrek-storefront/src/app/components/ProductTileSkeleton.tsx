"use client";

import React from "react";

export function ProductTileSkeleton() {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="relative aspect-[4/5] w-full">
        <div className="absolute inset-0 animate-pulse bg-white/[0.06]" />
      </div>
      <div className="p-3">
        <div className="h-4 w-5/6 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-xl bg-white/[0.06]" />
      </div>
    </div>
  );
}
