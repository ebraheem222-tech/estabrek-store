"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { CartProvider } from "@/store/cart";
import { WishlistProvider } from "@/store/wishlist";
import { RecentlyViewedProvider } from "@/store/recentlyViewed";
import { ToastProvider } from "@/components/Toast";
import { QuickViewProvider } from "@/components/QuickViewModal";
import { ThemeProvider } from "@/components/ThemeToggle";
import MotionProvider from "@/motion/MotionProvider";
import { StorefrontFeaturesProvider, type StorefrontSettings, useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { AnimationEffectsProvider } from "@/components/AnimationEffectsProvider";
import { clearBodyScrollLocks } from "@/lib/bodyScrollLock";
import { RouteProgress } from "@/components/RouteProgress";

const QuickViewLayer = dynamic(
  () => import("@/components/QuickViewModal").then((m) => m.QuickViewLayer),
  { ssr: false, loading: () => null }
);

function StorefrontToastProvider({ children }: { children: React.ReactNode }) {
  const settings = useStorefrontSettings();
  return (
    <ToastProvider
      enabled={settings.toastNotificationsEnabled}
      position={settings.toastPosition}
      themeId={settings.toastThemeId}
    >
      {children}
    </ToastProvider>
  );
}

function StorefrontMotionProvider({ children }: { children: React.ReactNode }) {
  const settings = useStorefrontSettings();
  return (
    <MotionProvider enabled={settings.scrollAnimationsEnabled}>
      {children}
    </MotionProvider>
  );
}

export default function Providers({
  children,
  initialStorefrontSettings,
  cinematic = false,
}: {
  children: React.ReactNode;
  initialStorefrontSettings?: Partial<StorefrontSettings>;
  cinematic?: boolean;
}) {
  const darkModeDisabled = initialStorefrontSettings?.darkModeEnabled === false;
  const defaultTheme = darkModeDisabled
    ? "light"
    : initialStorefrontSettings?.darkModeDefault === false
    ? "light"
    : "dark";
  const pathname = usePathname();

  useEffect(() => {
    clearBodyScrollLocks();
  }, [pathname]);

  return (
    <ThemeProvider defaultTheme={defaultTheme} disableDarkMode={darkModeDisabled}>
      <CartProvider>
        <WishlistProvider>
          <RecentlyViewedProvider>
            {/* Storefront Features (reads settings from API) */}
            <StorefrontFeaturesProvider initialSettings={initialStorefrontSettings} cinematic={cinematic}>
              <RouteProgress />
              <StorefrontToastProvider>
                <QuickViewProvider>
                  <StorefrontMotionProvider>
                    {/* Animation Effects (controlled by settings) */}
                    <AnimationEffectsProvider>
                      {children}
                      <QuickViewLayer />
                    </AnimationEffectsProvider>
                  </StorefrontMotionProvider>
                </QuickViewProvider>
              </StorefrontToastProvider>
            </StorefrontFeaturesProvider>
          </RecentlyViewedProvider>
        </WishlistProvider>
      </CartProvider>
    </ThemeProvider>
  );
}
