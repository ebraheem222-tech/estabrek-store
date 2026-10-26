"use client";

import React, { useEffect } from "react";
import { usePathname } from "@/lib/shopPath";
import dynamic from "next/dynamic";
import { CartProvider } from "@/store/cart";
import { WishlistProvider } from "@/store/wishlist";
import { AccountProvider } from "@/store/account";
import { SiteFeaturesProvider } from "@/store/siteFeatures";
import { RecentlyViewedProvider } from "@/store/recentlyViewed";
import { ToastProvider } from "@/components/Toast";
import { QuickViewProvider } from "@/components/QuickViewModal";
import { ThemeProvider } from "@/components/ThemeToggle";
import MotionProvider from "@/motion/MotionProvider";
import { RazanProvider } from "@/store/razan";
import { normalizeRequests } from "@/lib/requestsSettings";
import { normalizeScarcity } from "@/lib/scarcity";
import { identityOf, type StoreIdentity } from "@/lib/storeIdentity";
import { NamesBridge, StoreIdentityProvider } from "@/store/storeIdentity";
import { setArabicTone } from "@/lib/words";
import { LanguageProvider } from "@/components/cinematic/Language";
import type { Lang, LangConfig } from "@/lib/i18n";
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

/** Shopper accounts only while the admin switch is on; otherwise useOptionalAccount() is null (visitors only). */
function MaybeAccounts({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return enabled ? <AccountProvider>{children}</AccountProvider> : <>{children}</>;
}

/** The shopper-facing AI switches (each true only when the owner turned it on). */
function aiFlags(raw: unknown) {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { smartSearch: r.smartSearch === true, shopTheLook: r.shopTheLook === true, sizeAdvice: r.sizeAdvice === true, reviewSummary: r.reviewSummary === true };
}

export default function Providers({
  children,
  initialStorefrontSettings,
  cinematic = false,
  accountsEnabled = false,
  stockAlertsEnabled = false,
  razan,
  requests,
  delivery,
  quiz,
  ai,
  scarcity,
  identity,
  lang = "ar",
  languages,
}: {
  children: React.ReactNode;
  initialStorefrontSettings?: Partial<StorefrontSettings>;
  cinematic?: boolean;
  /** Admin → Settings → حسابات الزبائن. */
  accountsEnabled?: boolean;
  /** Admin → المخزون → بانتظار التوفّر. */
  stockAlertsEnabled?: boolean;
  /** Admin → رزان (header.razan). */
  razan?: unknown;
  /** Admin → الطلبات الخاصة (header.requests). */
  requests?: unknown;
  /** Admin → التوصيل (header.delivery). */
  delivery?: unknown;
  /** Admin → سؤال وجواب (header.quiz). */
  quiz?: unknown;
  /** Admin → الذكاء الاصطناعي (header.ai). */
  ai?: unknown;
  /** Admin → تنبيهات المخزون (header.scarcity): the "pieces left" labels. */
  scarcity?: unknown;
  /** Admin → هوية المتجر (header.identity): the store's own name, line and audience. */
  identity?: StoreIdentity;
  /** The page's language (its address) and the store's languages (admin → اللغات). */
  lang?: Lang;
  languages?: LangConfig;
}) {
  const darkModeDisabled = initialStorefrontSettings?.darkModeEnabled === false;
  const defaultTheme = darkModeDisabled
    ? "light"
    : initialStorefrontSettings?.darkModeDefault === false
    ? "light"
    : "dark";
  const pathname = usePathname();
  const features = React.useMemo(
    () => ({
      stockAlerts: stockAlertsEnabled,
      requests: normalizeRequests(requests),
      delivery: delivery ?? null,
      quiz: Boolean(quiz && typeof quiz === "object" && (quiz as { enabled?: unknown }).enabled === true),
      ai: aiFlags(ai),
      scarcity: normalizeScarcity(scarcity),
    }),
    [stockAlertsEnabled, requests, delivery, quiz, ai, scarcity],
  );

  useEffect(() => {
    clearBodyScrollLocks();
  }, [pathname]);

  // The store's way of speaking Arabic (to her, to him, to everyone), before anything below speaks.
  const store = identity ?? identityOf(null);
  setArabicTone(store.audience);

  return (
    <LanguageProvider initial={lang} config={languages}>
    <ThemeProvider defaultTheme={defaultTheme} disableDarkMode={darkModeDisabled}>
      <StoreIdentityProvider value={store}>
      <SiteFeaturesProvider value={features}>
      <RazanProvider value={razan}>
      <NamesBridge />
      <CartProvider>
        <MaybeAccounts enabled={accountsEnabled}>
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
        </MaybeAccounts>
      </CartProvider>
      </RazanProvider>
      </SiteFeaturesProvider>
      </StoreIdentityProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
}
