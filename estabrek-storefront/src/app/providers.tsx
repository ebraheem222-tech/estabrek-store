"use client";

import React from "react";
import { CartProvider } from "@/store/cart";
import { WishlistProvider } from "@/store/wishlist";
import { RecentlyViewedProvider } from "@/store/recentlyViewed";
import { ToastProvider } from "@/components/Toast";
import { QuickViewProvider } from "@/components/QuickViewModal";
import { ThemeProvider } from "@/components/ThemeToggle";
import MotionProvider from "@/motion/MotionProvider";
import ChatWidget from "@/components/ChatWidget";
import { StorefrontFeaturesProvider } from "@/components/StorefrontFeaturesProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CartProvider>
          <WishlistProvider>
            <RecentlyViewedProvider>
              <QuickViewProvider>
                <MotionProvider>
                  {/* Storefront Features (reads settings from API) */}
                  <StorefrontFeaturesProvider>
                    {children}
                  </StorefrontFeaturesProvider>
                  
                  {/* Global Chatbot Widget */}
                  <ChatWidget />
                </MotionProvider>
              </QuickViewProvider>
            </RecentlyViewedProvider>
          </WishlistProvider>
        </CartProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
