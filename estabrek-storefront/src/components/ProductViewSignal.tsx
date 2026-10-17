"use client";

import { useEffect } from "react";
import { signal } from "@/lib/signals";

/** Counts a product page view (once per page) for the shop's cache: see lib/signals.ts. */
export function ProductViewSignal({ productId }: { productId: string }) {
  useEffect(() => {
    signal("view", { productId });
  }, [productId]);
  return null;
}
