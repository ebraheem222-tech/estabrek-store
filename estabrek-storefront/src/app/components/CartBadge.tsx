"use client";

import React from "react";
import { useCart } from "@/store/cart";

export function CartBadge() {
  const { count } = useCart();
  if (!count) return null;
  return (
    <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
      {count}
    </span>
  );
}
