"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LiveChat } from "@/components/LiveChat";
import { SeasonalThemeProvider, SeasonalEffects } from "@/components/SeasonalThemes";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";

// Default settings
const DEFAULT_SETTINGS = {
  seasonalEffectsEnabled: true,
  seasonalTheme: "auto" as const,
  seasonalEffectsDuration: 15,
  seasonalEffectsInterval: 60,
  product360ViewEnabled: true,
  productBadgesEnabled: true,
  productStockIndicator: true,
  productSizeRecommender: true,
  productRecentlyViewed: true,
  productRecommendations: true,
  productQuickView: true,
  voiceSearchEnabled: true,
  imageSearchEnabled: true,
  aiRecommendationsEnabled: true,
  liveChatEnabled: true,
  liveChatPosition: "bottom-left" as const,
  liveChatWelcomeMessage: "مرحباً! كيف يمكنني مساعدتك؟",
  confettiOnAddToCart: true,
  heartBurstOnWishlist: true,
  scrollAnimationsEnabled: true,
  mobileBottomNavEnabled: true,
  scrollToTopEnabled: true,
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
  const [settings, setSettings] = useState<StorefrontSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  }));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Try to fetch settings from API
    const fetchSettings = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        if (!apiBase) return;
        
        const res = await fetch(`${apiBase}/v1/storefront/bootstrap`);
        if (res.ok) {
          const data = await res.json();
          const storefrontConfig = data?.settings?.header?.storefront;
          if (storefrontConfig) {
            setSettings(prev => ({ ...prev, ...storefrontConfig }));
          }
        }
      } catch (error) {
        // Use default settings on error
      }
    };

    fetchSettings();
  }, []);

  return (
    <StorefrontSettingsContext.Provider value={settings}>
      {/* Seasonal Theme Provider */}
      {settings.seasonalEffectsEnabled ? (
        <SeasonalThemeProvider>
          {children}
          {mounted && <SeasonalEffects />}
        </SeasonalThemeProvider>
      ) : (
        children
      )}

      {/* Conditional Global Components */}
      {mounted && (
        <>
          {settings.liveChatEnabled && (
            <LiveChat
              position={settings.liveChatPosition}
              welcomeMessage={settings.liveChatWelcomeMessage}
            />
          )}
          {settings.mobileBottomNavEnabled && <MobileBottomNav />}
          {settings.scrollToTopEnabled && <ScrollToTop />}
          {settings.voiceSearchEnabled && <VoiceSearchButton />}
        </>
      )}
    </StorefrontSettingsContext.Provider>
  );
}
