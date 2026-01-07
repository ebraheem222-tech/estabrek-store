"use client";

import React from "react";
import { CartProvider } from "@/store/cart";
import MotionProvider from "@/motion/MotionProvider";
import ChatWidget from "@/components/ChatWidget";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <MotionProvider>
        {children}
        <ChatWidget />
      </MotionProvider>
    </CartProvider>
  );
}
