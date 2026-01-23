"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LiveChat } from "@/components/LiveChat";
import { SeasonalThemeProvider, SeasonalEffects } from "@/components/SeasonalThemes";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import ChatWidget from "@/components/ChatWidget";
import { RecentActivityPopup } from "@/components/RecentActivityPopup";

type SeasonalThemeMode = "auto" | "none" | "winter" | "ramadan" | "eid" | "black-friday" | "summer";

// Default settings - all features
const DEFAULT_SETTINGS = {
  // Seasonal Effects
  seasonalEffectsEnabled: true,
  seasonalTheme: "auto" as SeasonalThemeMode,
  seasonalEffectsDuration: 15,
  seasonalEffectsInterval: 60,
  seasonalParticleCount: 25,
  
  // Product Page
  product360ViewEnabled: true,
  product360AutoRotate: false,
  product360RotateSpeed: 100,
  productBadgesEnabled: true,
  productStockIndicator: true,
  productStockThreshold: 20,
  productSizeRecommender: true,
  productRecentlyViewed: true,
  productRecentlyViewedCount: 6,
  productRecommendations: true,
  productRecommendationsCount: 8,
  productQuickView: true,
  productZoomEnabled: true,
  productCompareEnabled: true,
  
  // Search & Discovery
  voiceSearchEnabled: true,
  imageSearchEnabled: true,
  aiRecommendationsEnabled: true,
  searchSuggestionsEnabled: true,
  searchHistoryEnabled: true,
  
  // Chat & Support
  liveChatEnabled: true,
  liveChatPosition: "bottom-left" as "bottom-left" | "bottom-right" | "bottom-center",
  liveChatWelcomeMessage: "مرحباً! كيف يمكنني مساعدتك؟",
  liveChatOfflineMessage: "نحن غير متصلين حالياً",
  chatbotEnabled: true,
  whatsappEnabled: false,
  whatsappNumber: "",
  
  // Visual Effects
  confettiOnAddToCart: true,
  heartBurstOnWishlist: true,
  scrollAnimationsEnabled: true,
  magneticButtonsEnabled: true,
  cardTiltEffectEnabled: true,
  parallaxEffectsEnabled: true,
  
  // Cart & Checkout
  miniCartEnabled: true,
  cartAnimationsEnabled: true,
  cartShakeOnAdd: true,
  checkoutProgressEnabled: true,
  couponAnimationsEnabled: true,
  
  // Navigation
  mobileBottomNavEnabled: true,
  scrollToTopEnabled: true,
  breadcrumbsEnabled: true,
  stickyHeaderEnabled: true,
  scrollProgressEnabled: true,
  
  // Notifications
  toastNotificationsEnabled: true,
  toastPosition: "top-right" as const,
  stockAlertEnabled: true,
  priceDropAlertEnabled: true,
  
  // Social Proof
  recentPurchasesPopup: false,
  viewersCountEnabled: false,
  soldCountEnabled: true,
  
  // CMS Overrides (core pages)
  cmsOverrideHome: true,
  cmsOverrideShop: true,
  cmsOverrideAbout: true,
  cmsOverrideContact: true,
  cmsOverrideSearch: true,
  cmsOverrideCart: true,

  // Theme
  themeColorsEnabled: true,
  accentColor: "#8b5cf6",
  accentColor2: "#f59e0b",
  glassEffectsEnabled: true,
  darkModeEnabled: true,
  darkModeDefault: true,
  
  // Performance
  lazyLoadImages: true,
  skeletonLoadingEnabled: true,
  prefetchLinks: true,
  imageBlurEnabled: false,
};

export type StorefrontSettings = typeof DEFAULT_SETTINGS;

const StorefrontSettingsContext = createContext<StorefrontSettings>(DEFAULT_SETTINGS);

export function useStorefrontSettings() {
  return useContext(StorefrontSettingsContext);
}

interface StorefrontFeaturesProviderProps {
  children: React.ReactNode;
  initialSettings?: Partial<StorefrontSettings>;
}

export function StorefrontFeaturesProvider({ 
  children, 
  initialSettings 
}: StorefrontFeaturesProviderProps) {
  const parseMaybeJson = (value: unknown) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const mergeSettings = (base: StorefrontSettings, patch?: Partial<StorefrontSettings>) => {
    if (!patch || typeof patch !== "object") return base;
    const next = { ...base } as StorefrontSettings;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null) continue;
      (next as any)[key] = value;
    }
    return next;
  };

  const [settings, setSettings] = useState<StorefrontSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  }));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!initialSettings) return;
    setSettings(prev => mergeSettings(prev, initialSettings));
  }, [initialSettings]);

  useEffect(() => {
    setMounted(true);
    
    // Try to fetch settings from API
    const fetchSettings = async () => {
      try {
        const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
        const resolvedBase =
          rawBase ? (rawBase.endsWith("/v1") ? rawBase : `${rawBase}/v1`) : `${window.location.origin}/v1`;
        if (!resolvedBase) return;

          const res = await fetch(`${resolvedBase}/storefront/bootstrap`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            // Settings are in data.site.header.storefront
            const header = parseMaybeJson(data?.site?.header);
            const storefrontConfig = (header as any)?.storefront ?? data?.site?.header?.storefront;
            if (storefrontConfig) {
              setSettings(prev => mergeSettings(prev, storefrontConfig));
            }
          }
      } catch (error) {
        // Use default settings on error
        console.warn("Failed to fetch storefront settings:", error);
      }
    };

    fetchSettings();
  }, []);

  // Apply CSS variables for colors
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    const root = document.documentElement;
    if (settings.themeColorsEnabled !== false) {
      root.style.setProperty("--accent", settings.accentColor);
      root.style.setProperty("--accent-2", settings.accentColor2);
      root.style.setProperty("--accent-1", settings.accentColor);
      root.style.setProperty("--accent-3", settings.accentColor2);
      root.style.setProperty("--accent-primary", settings.accentColor);
      root.style.setProperty("--accent-secondary", settings.accentColor2);
    } else {
      ["--accent", "--accent-2", "--accent-1", "--accent-3", "--accent-primary", "--accent-secondary"].forEach((prop) =>
        root.style.removeProperty(prop)
      );
    }
    root.dataset.glassEffects = settings.glassEffectsEnabled ? "1" : "0";
  }, [
    mounted,
    settings.themeColorsEnabled,
    settings.accentColor,
    settings.accentColor2,
    settings.glassEffectsEnabled,
  ]);

  return (
    <StorefrontSettingsContext.Provider value={settings}>
      {/* Seasonal Theme Provider */}
      <SeasonalThemeProvider
        mode={settings.seasonalTheme}
        effectsEnabled={settings.seasonalEffectsEnabled}
      >
        {children}
        {mounted && settings.seasonalEffectsEnabled && settings.seasonalTheme !== "none" && (
          <SeasonalEffects 
            duration={settings.seasonalEffectsDuration}
            interval={settings.seasonalEffectsInterval}
            particleCount={settings.seasonalParticleCount}
          />
        )}
      </SeasonalThemeProvider>

      {/* Conditional Global Components */}
      {mounted && (
        <>
          {settings.liveChatEnabled && (
            <LiveChat
              position={settings.liveChatPosition}
              welcomeMessage={settings.liveChatWelcomeMessage}
              offlineMessage={settings.liveChatOfflineMessage}
            />
          )}
          {settings.mobileBottomNavEnabled && <MobileBottomNav />}
          {settings.scrollToTopEnabled && <ScrollToTop />}
          {settings.voiceSearchEnabled && <VoiceSearchButton />}
          {settings.chatbotEnabled && <ChatWidget />}
          {settings.recentPurchasesPopup && <RecentActivityPopup />}
          
          {/* WhatsApp Button */}
          {settings.whatsappEnabled && settings.whatsappNumber && (
            <a 
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-floating-btn"
              aria-label="تواصل عبر واتساب"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          )}
        </>
      )}
    </StorefrontSettingsContext.Provider>
  );
}
