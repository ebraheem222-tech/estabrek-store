"use client";

import React from "react";
import { CartProvider } from "@/store/cart";
import MotionProvider from "@/motion/MotionProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <MotionProvider>{children}</MotionProvider>
    </CartProvider>
  );
}
