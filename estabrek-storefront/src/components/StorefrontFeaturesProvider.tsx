"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LiveChat } from "@/components/LiveChat";
import { SeasonalThemeProvider, SeasonalEffects } from "@/components/SeasonalThemes";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import ChatWidget from "@/components/ChatWidget";
import { RecentActivityPopup } from "@/components/RecentActivityPopup";
import { RoseRecentlyViewed } from "@/components/cinematic/RoseRecentlyViewed";
import dynamic from "next/dynamic";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { AccessibilityTools } from "@/components/AccessibilityTools";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import { setColourEngine } from "@/lib/colourEngine";
import { personaById } from "@/lib/personas";
import {
  DEFAULT_STOREFRONT_SETTINGS,
  normalizeStorefrontSettings,
  type StorefrontSettings,
} from "@/lib/storefrontSettings";
// Razan the companion comes after the page is up (she was drawn only then anyway): her script (about 50 KB
// gzipped) no longer holds up every page's first start.
const RoseCompanion = dynamic(() => import("@/components/cinematic/mascot/RoseCompanion").then((m) => m.RoseCompanion), { ssr: false });

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
  /** The store wears the rose design (storeThemes roseDesignOn): Razan comes with it. */
  rose?: boolean;
}

export function StorefrontFeaturesProvider({ 
  children, 
  initialSettings,
  cinematic = false,
  rose: roseTheme = false,
}: StorefrontFeaturesProviderProps) {
  // Rose, the shop guide in a hijab, belongs to the rose design (one store's own theme); every
  // other store keeps the plain chat, WhatsApp and back-to-top buttons.
  const rose = cinematic && roseTheme;
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
  // The colour engine reads the owner's choices (which scenes colour the page, how strongly); set as this renders,
  // before the components below make any palette.
  setColourEngine({ scenes: settings.colorScenes, strength: settings.colorStrength, blend: settings.colorBlend });
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
    // A store on a theme takes its accents from the theme (globals.css :root[data-store-theme]): the Rose
    // design's two colours (purple and orange by default) were put on every store and won over the theme's.
    const themed = root.hasAttribute("data-store-theme");
    if (settings.themeColorsEnabled !== false && !themed) {
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

  const bare = /(^|\/)design-frame$/.test(usePathname() ?? "");
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

      {/* Conditional Global Components (none in the template gallery's frame, which shows a template alone) */}
      {mounted && !bare && (
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
          {!rose && <ScrollToTop />}
          {settings.accessibilityToolsEnabled !== false && <AccessibilityTools />}
          {settings.voiceSearchEnabled && !cinematic && <VoiceSearchButton />}
          {/* On the rose design the chat is Rose herself (see RoseCompanion below). */}
          {settings.chatbotEnabled && !rose && (
            <ChatWidget position={settings.chatbotPosition} draggable={settings.chatbotDraggable} persona={personaById(settings.assistantPersona)} />
          )}
          {settings.recentPurchasesPopup && (cinematic ? <RoseRecentlyViewed /> : <RecentActivityPopup />)}
          {/* Rose, the shop guide, follows the shopper; with the chat on, she is the chat. */}
          {rose && (
            <RoseCompanion
              chat={Boolean(settings.chatbotEnabled)}
              whatsapp={settings.whatsappEnabled ? settings.whatsappNumber : null}
              side={settings.chatbotEnabled && settings.chatbotPosition === "bottom-right" ? "right" : settings.chatbotEnabled && settings.chatbotPosition === "bottom-center" ? "center" : "left"}
            />
          )}
          
          {/* WhatsApp Button */}
          {/* On the rose design WhatsApp sits beside Rose instead (no overlap). */}
          {settings.whatsappEnabled && settings.whatsappNumber && !rose && (
            <WhatsAppFloatingButton phone={settings.whatsappNumber} />
          )}
        </>
      )}
    </StorefrontSettingsContext.Provider>
  );
}
