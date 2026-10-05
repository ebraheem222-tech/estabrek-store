"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LiveChat } from "@/components/LiveChat";
import { SeasonalThemeProvider, SeasonalEffects } from "@/components/SeasonalThemes";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import ChatWidget from "@/components/ChatWidget";
import { RecentActivityPopup } from "@/components/RecentActivityPopup";
import { RoseRecentlyViewed } from "@/components/cinematic/RoseRecentlyViewed";
import { RoseCompanion } from "@/components/cinematic/mascot/RoseCompanion";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { AccessibilityTools } from "@/components/AccessibilityTools";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import {
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeStorefrontSettings,
  type StorefrontSettings,
} from "@/lib/storefrontSettings";

export type { StorefrontSettings } from "@/lib/storefrontSettings";

const StorefrontSettingsContext = createContext<StorefrontSettings>(DEFAULT_STOREFRONT_SETTINGS);

export function useStorefrontSettings() {
  return useContext(StorefrontSettingsContext);
}

interface StorefrontFeaturesProviderProps {
  children: React.ReactNode;
  initialSettings?: Partial<StorefrontSettings>;
  /** Rose storefront: keep one floating action (WhatsApp) and no scroll line. */
  cinematic?: boolean;
}

export function StorefrontFeaturesProvider({ 
  children, 
  initialSettings,
  cinematic = false,
}: StorefrontFeaturesProviderProps) {
  const parseMaybeJson = (value: unknown) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const mergeSettings = (base: StorefrontSettings, patch?: Partial<StorefrontSettings>) =>
    normalizeStorefrontSettings(patch, base);

  const [settings, setSettings] = useState<StorefrontSettings>(() =>
    normalizeStorefrontSettings(initialSettings)
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!initialSettings) return;
    setSettings((prev) => mergeSettings(prev, initialSettings));
  }, [initialSettings]);

  useEffect(() => {
    setMounted(true);
    
    // Try to fetch settings from API
    const extractStorefrontConfig = (payload: any) => {
      const header = parseMaybeJson(payload?.site?.header);
      return (header as any)?.storefront ?? payload?.site?.header?.storefront;
    };

    const applyStorefrontConfig = (config: unknown) => {
      if (!config) return false;
      setSettings((prev) => mergeSettings(prev, config as Partial<StorefrontSettings>));
      return true;
    };

    const fetchSettings = async () => {
      try {
        const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
        const resolvedBase =
          rawBase ? (rawBase.endsWith("/v1") ? rawBase : `${rawBase}/v1`) : `${window.location.origin}/v1`;
        if (!resolvedBase) return;

        const res = await fetch(`${resolvedBase}/storefront/bootstrap`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (applyStorefrontConfig(extractStorefrontConfig(data))) return;
        }

        const fallback = await fetch(`${resolvedBase}/settings`, { cache: "no-store" });
        if (!fallback.ok) return;
        const fallbackData = await fallback.json();
        applyStorefrontConfig(extractStorefrontConfig(fallbackData));
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
          {settings.scrollProgressEnabled && !cinematic && <ScrollProgressBar />}
          {settings.mobileBottomNavEnabled && <MobileBottomNav />}
          {!cinematic && <ScrollToTop />}
          {settings.accessibilityToolsEnabled !== false && <AccessibilityTools />}
          {settings.voiceSearchEnabled && <VoiceSearchButton />}
          {/* On the rose design the chat is Rose herself (see RoseCompanion below). */}
          {settings.chatbotEnabled && !cinematic && (
            <ChatWidget position={settings.chatbotPosition} draggable={settings.chatbotDraggable} />
          )}
          {settings.recentPurchasesPopup && (cinematic ? <RoseRecentlyViewed /> : <RecentActivityPopup />)}
          {/* Rose, the shop guide, follows the shopper; with the chat on, she is the chat. */}
          {cinematic && (
            <RoseCompanion
              chat={Boolean(settings.chatbotEnabled)}
              whatsapp={settings.whatsappEnabled ? settings.whatsappNumber : null}
              side={settings.chatbotEnabled && settings.chatbotPosition === "bottom-right" ? "right" : settings.chatbotEnabled && settings.chatbotPosition === "bottom-center" ? "center" : "left"}
            />
          )}
          
          {/* WhatsApp Button */}
          {/* On the rose design WhatsApp sits beside Rose instead (no overlap). */}
          {settings.whatsappEnabled && settings.whatsappNumber && !cinematic && (
            <WhatsAppFloatingButton phone={settings.whatsappNumber} />
          )}
        </>
      )}
    </StorefrontSettingsContext.Provider>
  );
}
