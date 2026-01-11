"use client";

import { useEffect, useState } from "react";

// Default settings
const DEFAULT_STOREFRONT_SETTINGS = {
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

export type StorefrontSettings = typeof DEFAULT_STOREFRONT_SETTINGS;

let cachedSettings: StorefrontSettings | null = null;

export function useStorefrontSettings() {
  const [settings, setSettings] = useState<StorefrontSettings>(DEFAULT_STOREFRONT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Return cached settings if available
    if (cachedSettings) {
      setSettings(cachedSettings);
      setIsLoading(false);
      return;
    }

    // Fetch from bootstrap or settings API
    const fetchSettings = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
        const res = await fetch(`${apiBase}/v1/storefront/bootstrap`, {
          next: { revalidate: 300 }, // Cache for 5 minutes
        });
        
        if (res.ok) {
          const data = await res.json();
          const storefrontConfig = data?.settings?.header?.storefront;
          
          if (storefrontConfig) {
            const merged = { ...DEFAULT_STOREFRONT_SETTINGS, ...storefrontConfig };
            cachedSettings = merged;
            setSettings(merged);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch storefront settings, using defaults");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, isLoading };
}

// Simple getter for server components
export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
    const res = await fetch(`${apiBase}/v1/storefront/bootstrap`, {
      next: { revalidate: 300 },
    });
    
    if (res.ok) {
      const data = await res.json();
      const storefrontConfig = data?.settings?.header?.storefront;
      
      if (storefrontConfig) {
        return { ...DEFAULT_STOREFRONT_SETTINGS, ...storefrontConfig };
      }
    }
  } catch (error) {
    console.warn("Failed to fetch storefront settings, using defaults");
  }
  
  return DEFAULT_STOREFRONT_SETTINGS;
}
