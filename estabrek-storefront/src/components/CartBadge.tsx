"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCart } from "@/store/cart";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

export function CartBadge() {
  const { count } = useCart();
  const settings = useStorefrontSettings();
  const prevCount = useRef(count);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const shouldAnimate =
      settings.cartAnimationsEnabled &&
      settings.cartShakeOnAdd &&
      count > prevCount.current;
    prevCount.current = count;
    if (!shouldAnimate) return;
    setAnimate(true);
    const t = window.setTimeout(() => setAnimate(false), 450);
    return () => window.clearTimeout(t);
  }, [count, settings.cartAnimationsEnabled, settings.cartShakeOnAdd]);

  if (!count) return null;
  return (
    <span
      className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80"
      style={animate ? { animation: "cart-bounce 0.45s ease" } : undefined}
    >
      {count}
    </span>
  );
}
