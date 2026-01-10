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
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
// New components
import { LiveChat } from "@/components/LiveChat";
import { SeasonalThemeProvider, SeasonalEffects } from "@/components/SeasonalThemes";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CartProvider>
          <WishlistProvider>
            <RecentlyViewedProvider>
              <QuickViewProvider>
                <MotionProvider>
                  {/* Seasonal Theme Provider */}
                  <SeasonalThemeProvider>
                    {children}
                  </SeasonalThemeProvider>
                  
                  {/* Seasonal Effects (shows once per hour) */}
                  <SeasonalEffects />
                  
                  {/* Global UI Components */}
                  <ChatWidget />
                  <LiveChat 
                    position="bottom-left"
                    welcomeMessage="مرحباً! كيف يمكنني مساعدتك؟"
                  />
                  <MobileBottomNav />
                  <ScrollToTop />
                  <VoiceSearchButton />
                </MotionProvider>
              </QuickViewProvider>
            </RecentlyViewedProvider>
          </WishlistProvider>
        </CartProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
