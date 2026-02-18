// src/features/settings/SettingsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { MediaUrlInput } from "../../components/media/MediaUrlInput";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { useSettings, useSettingsActions } from "../../hooks/useSettings";
import type { CmsSettingsCatalog } from "./cmsSettingsCatalog";

type HeaderConfig = {
  preset?: "classic" | "minimal" | "centered";
  sticky?: boolean;
  showSearch?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  announcement?: {
    enabled?: boolean;
    text?: string;
    href?: string;
    buttonText?: string;
  };
  cta?: {
    enabled?: boolean;
    label?: string;
    href?: string;
  };
  // Step 13: header UI
  heightDesktop?: "compact" | "normal" | "comfortable";
  heightMobile?: "compact" | "normal" | "comfortable";
  searchStyle?: "input" | "icon";
  searchInputStyleId?: string;
  cartStyle?: "iconBadge" | "icon" | "badge";
  topbar?: {
    enabled?: boolean;
    template?: "info" | "promo" | "contact";
    text?: string;
    href?: string;
    buttonText?: string;
    showOnMobile?: boolean;
    bgPreset?: "solid" | "gradient" | "glass";
  };

  // Step 15: Global Theme Tokens (stored under settings.header.theme)
  theme?: {
    mode?: "dark" | "light";
    // Step 2 (Theme Engine): presetId
    presetId?: ThemePresetId;
    // Step 16: Website theme preset id
    websiteThemeId?: string;
    primary?: string;
    secondary?: string;
    // legacy fields (kept for backwards compatibility)
    accent?: "rose" | "orange" | "emerald" | "blue" | "violet" | "gold";
    radius?: "md" | "xl" | "2xl";
    surface?: "classic" | "glass";
    customThemes?: CustomTheme[];
  };

  // Global UI settings (stored under settings.header.ui)
  ui?: {
    loading?: {
      enabled?: boolean;
      animationId?: string;
    };
    adminTheme?: Partial<AdminThemeConfig>;
    cursorThemeId?: CursorThemeId;
  };

};

type ThemePresetId =
  | "estabrak_soft_gold"
  | "luxury_gold"
  | "clean_tech"
  | "street_dark"
  | "soft_pastel"
  | "earth_minimal"
  | "ocean_mist"
  | "desert_sand"
  | "plum_night";

type AdminThemePresetId = "default" | ThemePresetId;

type AdminThemeConfig = {
  presetId: AdminThemePresetId;
};

type CursorThemeId = string;

type CustomTheme = {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
};

type FooterLink = { id: string; label: string; href: string; icon?: string };
type FooterColumn = { id: string; title: string; links: FooterLink[] };
type FooterPolicyLink = { id: string; label: string; href: string };

type FooterConfig = {
  enabled: boolean;
  template: "minimal" | "columns" | "mega";
  bgPreset: "solid" | "gradient" | "glass";
  about: { title: string; text: string };
  columns: FooterColumn[];
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    whatsapp: string;
    youtube: string;
    x: string;
  };
  newsletter: { enabled: boolean; title: string; placeholder: string; buttonLabel?: string };
  bottom: { enabled: boolean; copyright: string; policyLinks: FooterPolicyLink[] };
};

type CmsNavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  children?: CmsNavItem[];
};

type CmsNavPath = number[];

type CmsNavConfig = {
  enabled: boolean;
  mode: "dropdown" | "mega";
  gradient: "none" | "sunset" | "ocean" | "neon";
  templateId: string;
  showIcons: boolean;
  items: CmsNavItem[];
};

const DEFAULT_OPTION = [{ value: "default", label: "افتراضي" }];
const DEFAULT_CMS_SETTINGS_CATALOG: CmsSettingsCatalog = {
  navTemplateOptions: DEFAULT_OPTION,
  websiteThemeOptions: DEFAULT_OPTION,
  loadingAnimationOptions: [{ value: "spinner-simple", label: "افتراضي" }],
  searchInputStyleOptions: DEFAULT_OPTION,
  cursorThemeOptions: DEFAULT_OPTION,
  toastThemeOptions: DEFAULT_OPTION,
  hasNavTemplate: () => true,
  hasWebsiteTheme: () => true,
  hasLoadingAnimation: () => true,
  hasSearchInputStyle: () => true,
  hasCursorTheme: () => true,
  getSearchInputStyleById: () => null,
  getLoadingAnimationById: () => null,
  getAlertThemeById: () => null,
};
let cmsSettingsCatalogRuntime: CmsSettingsCatalog = DEFAULT_CMS_SETTINGS_CATALOG;

const safeObj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const cryptoId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const CMS_NAV_ICON_IMAGE_RE = /^(https?:\/\/|\/|data:image\/)/i;
const CMS_NAV_EXTERNAL_PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i;

function createCmsNavItem(label = "جديد"): CmsNavItem {
  return { id: cryptoId(), label, href: "/", icon: "", children: [] };
}

function isCmsNavIconImage(value?: string) {
  const v = String(value ?? "").trim();
  return v.length > 0 && CMS_NAV_ICON_IMAGE_RE.test(v);
}

function isCmsNavExternalHref(href: string) {
  return CMS_NAV_EXTERNAL_PROTOCOL_RE.test(href) || href.startsWith("//");
}

function normalizeCmsNavHref(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "/";
  if (raw.startsWith("#")) return raw;
  if (isCmsNavExternalHref(raw)) return raw;
  if (raw.startsWith("?")) return raw;
  if (raw.startsWith("/")) return raw.replace(/\/{2,}/g, "/");
  const cleaned = raw.replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  return `/${cleaned}`;
}

function normalizeCmsNavItemsForSave(items: CmsNavItem[]): CmsNavItem[] {
  return (items ?? []).map((item) => ({
    ...item,
    href: normalizeCmsNavHref(item.href),
    children: normalizeCmsNavItemsForSave(item.children ?? []),
  }));
}

function normalizeCmsNavItems(list: any[]): CmsNavItem[] {
  return list.map((it: any) => ({
    id: String(it?.id ?? cryptoId()),
    label: String(it?.label ?? ""),
    href: normalizeCmsNavHref(typeof it?.href === "string" ? it.href : ""),
    icon: typeof it?.icon === "string" ? it.icon : "",
    children: normalizeCmsNavItems(Array.isArray(it?.children) ? it.children : []),
  }));
}

function updateCmsNavItemsAtPath(
  items: CmsNavItem[],
  path: CmsNavPath,
  updater: (item: CmsNavItem) => CmsNavItem
): CmsNavItem[] {
  if (!Array.isArray(items) || path.length === 0) return items;
  const [head, ...rest] = path;
  return items.map((item, idx) => {
    if (idx !== head) return item;
    if (rest.length === 0) return updater(item);
    return {
      ...item,
      children: updateCmsNavItemsAtPath(item.children ?? [], rest, updater),
    };
  });
}

function removeCmsNavItemAtPath(items: CmsNavItem[], path: CmsNavPath): CmsNavItem[] {
  if (!Array.isArray(items) || path.length === 0) return items;
  if (path.length === 1) {
    return items.filter((_, idx) => idx !== path[0]);
  }
  const [head, ...rest] = path;
  return items.map((item, idx) => {
    if (idx !== head) return item;
    return {
      ...item,
      children: removeCmsNavItemAtPath(item.children ?? [], rest),
    };
  });
}

function cloneCmsNavItem(item: CmsNavItem): CmsNavItem {
  return {
    id: cryptoId(),
    label: String(item.label ?? ""),
    href: String(item.href ?? ""),
    icon: String(item.icon ?? ""),
    children: Array.isArray(item.children) ? item.children.map(cloneCmsNavItem) : [],
  };
}

function duplicateCmsNavItemAtPath(items: CmsNavItem[], path: CmsNavPath): CmsNavItem[] {
  if (!Array.isArray(items) || path.length === 0) return items;
  const [head, ...rest] = path;
  if (head < 0 || head >= items.length) return items;
  if (rest.length === 0) {
    const next = [...items];
    next.splice(head + 1, 0, cloneCmsNavItem(items[head]));
    return next;
  }
  return items.map((item, idx) => {
    if (idx !== head) return item;
    return {
      ...item,
      children: duplicateCmsNavItemAtPath(item.children ?? [], rest),
    };
  });
}

function moveCmsNavItemAtPath(items: CmsNavItem[], path: CmsNavPath, direction: -1 | 1): CmsNavItem[] {
  if (!Array.isArray(items) || path.length === 0) return items;
  const [head, ...rest] = path;
  if (head < 0 || head >= items.length) return items;
  if (rest.length === 0) {
    const target = head + direction;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(head, 1);
    next.splice(target, 0, moved);
    return next;
  }
  return items.map((item, idx) => {
    if (idx !== head) return item;
    return {
      ...item,
      children: moveCmsNavItemAtPath(item.children ?? [], rest, direction),
    };
  });
}

function cmsNavPathKey(path: CmsNavPath) {
  return path.join(".");
}

const THEME_PRESETS: Array<{ id: ThemePresetId; label: string }> = [
  { id: "estabrak_soft_gold", label: "Estabrak Soft (Teal + Gold)" },
  { id: "luxury_gold", label: "Luxury Paper (Black + Gold)" },
  { id: "clean_tech", label: "Clean Tech (Blue)" },
  { id: "street_dark", label: "Street Dark (Neon Lime)" },
  { id: "soft_pastel", label: "Soft Pastel (Rose)" },
  { id: "earth_minimal", label: "Earth Minimal (Forest)" },
  { id: "ocean_mist", label: "Ocean Mist (Sky)" },
  { id: "desert_sand", label: "Desert Sand (Amber)" },
  { id: "plum_night", label: "Plum Night (Purple)" },
];

const THEME_PRESET_IDS = THEME_PRESETS.map((p) => p.id);

const isThemePresetId = (value: unknown): value is ThemePresetId =>
  typeof value === "string" && THEME_PRESET_IDS.includes(value as ThemePresetId);

type LoadingConfig = { enabled: boolean; animationId: string };

// Storefront UI Settings
type StorefrontConfig = {
  // Seasonal Effects
  seasonalEffectsEnabled: boolean;
  seasonalTheme: "auto" | "none" | "winter" | "ramadan" | "eid" | "black-friday" | "summer";
  seasonalEffectsDuration: number;
  seasonalEffectsInterval: number;
  seasonalParticleCount: number;
  
  // Product Page
  product360ViewEnabled: boolean;
  product360AutoRotate: boolean;
  product360RotateSpeed: number;
  productBadgesEnabled: boolean;
  productStockIndicator: boolean;
  productStockThreshold: number;
  productSizeRecommender: boolean;
  productRecentlyViewed: boolean;
  productRecentlyViewedCount: number;
  productRecommendations: boolean;
  productRecommendationsCount: number;
  productQuickView: boolean;
  productZoomEnabled: boolean;
  productCompareEnabled: boolean;
  
  // Search & Discovery  
  voiceSearchEnabled: boolean;
  imageSearchEnabled: boolean;
  aiRecommendationsEnabled: boolean;
  searchSuggestionsEnabled: boolean;
  searchHistoryEnabled: boolean;
  
  // Chat & Support
  liveChatEnabled: boolean;
  liveChatPosition: "bottom-left" | "bottom-right" | "bottom-center";
  liveChatWelcomeMessage: string;
  liveChatOfflineMessage: string;
  chatbotEnabled: boolean;
  chatbotPosition: "bottom-left" | "bottom-right" | "bottom-center";
  chatbotDraggable: boolean;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  
  // Visual Effects
  confettiOnAddToCart: boolean;
  heartBurstOnWishlist: boolean;
  scrollAnimationsEnabled: boolean;
  magneticButtonsEnabled: boolean;
  cardTiltEffectEnabled: boolean;
  parallaxEffectsEnabled: boolean;
  
  // Cart & Checkout
  miniCartEnabled: boolean;
  cartAnimationsEnabled: boolean;
  cartShakeOnAdd: boolean;
  checkoutProgressEnabled: boolean;
  couponAnimationsEnabled: boolean;
  allowManualCheckoutWithPayments: boolean;
  
  // Navigation
  mobileBottomNavEnabled: boolean;
  scrollToTopEnabled: boolean;
  breadcrumbsEnabled: boolean;
  stickyHeaderEnabled: boolean;
  scrollProgressEnabled: boolean;
  
  // Notifications & Alerts
  toastNotificationsEnabled: boolean;
  toastPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  toastThemeId: string;
  stockAlertEnabled: boolean;
  priceDropAlertEnabled: boolean;
  
  // Social Proof
  recentPurchasesPopup: boolean;
  viewersCountEnabled: boolean;
  soldCountEnabled: boolean;

  // CMS Overrides (core pages)
  cmsOverrideHome: boolean;
  cmsOverrideShop: boolean;
  cmsOverrideAbout: boolean;
  cmsOverrideContact: boolean;
  cmsOverrideSearch: boolean;
  cmsOverrideCart: boolean;
  
  // Theme & Colors
  themeColorsEnabled: boolean;
  accentColor: string;
  accentColor2: string;
  glassEffectsEnabled: boolean;
  darkModeEnabled: boolean;
  darkModeDefault: boolean;
  
  // Performance
  lazyLoadImages: boolean;
  skeletonLoadingEnabled: boolean;
  prefetchLinks: boolean;
  imageBlurEnabled: boolean;
};

function normalizeStorefront(v: any): StorefrontConfig {
  const o = safeObj(v);
  return {
    // Seasonal Effects
    seasonalEffectsEnabled: o.seasonalEffectsEnabled !== false,
    seasonalTheme: o.seasonalTheme || "auto",
    seasonalEffectsDuration: o.seasonalEffectsDuration || 15,
    seasonalEffectsInterval: o.seasonalEffectsInterval || 60,
    seasonalParticleCount: o.seasonalParticleCount || 25,
    
    // Product Page
    product360ViewEnabled: o.product360ViewEnabled !== false,
    product360AutoRotate: o.product360AutoRotate === true,
    product360RotateSpeed: o.product360RotateSpeed || 100,
    productBadgesEnabled: o.productBadgesEnabled !== false,
    productStockIndicator: o.productStockIndicator !== false,
    productStockThreshold: o.productStockThreshold || 20,
    productSizeRecommender: o.productSizeRecommender !== false,
    productRecentlyViewed: o.productRecentlyViewed !== false,
    productRecentlyViewedCount: o.productRecentlyViewedCount || 6,
    productRecommendations: o.productRecommendations !== false,
    productRecommendationsCount: o.productRecommendationsCount || 8,
    productQuickView: o.productQuickView !== false,
    productZoomEnabled: o.productZoomEnabled !== false,
    productCompareEnabled: o.productCompareEnabled !== false,
    
    // Search & Discovery
    voiceSearchEnabled: o.voiceSearchEnabled !== false,
    imageSearchEnabled: o.imageSearchEnabled !== false,
    aiRecommendationsEnabled: o.aiRecommendationsEnabled !== false,
    searchSuggestionsEnabled: o.searchSuggestionsEnabled !== false,
    searchHistoryEnabled: o.searchHistoryEnabled !== false,
    
    // Chat & Support
    liveChatEnabled: o.liveChatEnabled !== false,
    liveChatPosition: o.liveChatPosition || "bottom-left",
    liveChatWelcomeMessage: o.liveChatWelcomeMessage || "مرحباً! كيف يمكنني مساعدتك؟",
    liveChatOfflineMessage: o.liveChatOfflineMessage || "نحن غير متصلين حالياً، اترك رسالتك وسنرد عليك قريباً",
    chatbotEnabled: o.chatbotEnabled !== false,
    chatbotPosition: o.chatbotPosition || "bottom-left",
    chatbotDraggable: o.chatbotDraggable === true,
    whatsappEnabled: o.whatsappEnabled === true,
    whatsappNumber: o.whatsappNumber || "",
    
    // Visual Effects
    confettiOnAddToCart: o.confettiOnAddToCart !== false,
    heartBurstOnWishlist: o.heartBurstOnWishlist !== false,
    scrollAnimationsEnabled: o.scrollAnimationsEnabled !== false,
    magneticButtonsEnabled: o.magneticButtonsEnabled !== false,
    cardTiltEffectEnabled: o.cardTiltEffectEnabled !== false,
    parallaxEffectsEnabled: o.parallaxEffectsEnabled !== false,
    
    // Cart & Checkout
    miniCartEnabled: o.miniCartEnabled !== false,
    cartAnimationsEnabled: o.cartAnimationsEnabled !== false,
    cartShakeOnAdd: o.cartShakeOnAdd !== false,
    checkoutProgressEnabled: o.checkoutProgressEnabled !== false,
    couponAnimationsEnabled: o.couponAnimationsEnabled !== false,
    allowManualCheckoutWithPayments: o.allowManualCheckoutWithPayments === true,
    
    // Navigation
    mobileBottomNavEnabled: o.mobileBottomNavEnabled !== false,
    scrollToTopEnabled: o.scrollToTopEnabled !== false,
    breadcrumbsEnabled: o.breadcrumbsEnabled !== false,
    stickyHeaderEnabled: o.stickyHeaderEnabled !== false,
    scrollProgressEnabled: o.scrollProgressEnabled !== false,
    
    // Notifications
    toastNotificationsEnabled: o.toastNotificationsEnabled !== false,
    toastPosition: o.toastPosition || "top-right",
    toastThemeId: (() => {
      const raw = typeof o.toastThemeId === "string" ? o.toastThemeId : "default";
      if (raw === "default") return raw;
      const theme = cmsSettingsCatalogRuntime.getAlertThemeById(raw);
      return theme?.style === "toast" ? raw : "default";
    })(),
    stockAlertEnabled: o.stockAlertEnabled !== false,
    priceDropAlertEnabled: o.priceDropAlertEnabled !== false,
    
    // Social Proof
    recentPurchasesPopup: o.recentPurchasesPopup === true,
    viewersCountEnabled: o.viewersCountEnabled === true,
    soldCountEnabled: o.soldCountEnabled !== false,

    // CMS Overrides (core pages)
    cmsOverrideHome: o.cmsOverrideHome !== false,
    cmsOverrideShop: o.cmsOverrideShop !== false,
    cmsOverrideAbout: o.cmsOverrideAbout !== false,
    cmsOverrideContact: o.cmsOverrideContact !== false,
    cmsOverrideSearch: o.cmsOverrideSearch !== false,
    cmsOverrideCart: o.cmsOverrideCart !== false,
    
    // Theme
    themeColorsEnabled: o.themeColorsEnabled !== false,
    accentColor: o.accentColor || "#8b5cf6",
    accentColor2: o.accentColor2 || "#f59e0b",
    glassEffectsEnabled: o.glassEffectsEnabled !== false,
    darkModeEnabled: o.darkModeEnabled !== false,
    darkModeDefault: o.darkModeDefault !== false,
    
    // Performance
    lazyLoadImages: o.lazyLoadImages !== false,
    skeletonLoadingEnabled: o.skeletonLoadingEnabled !== false,
    prefetchLinks: o.prefetchLinks !== false,
    imageBlurEnabled: o.imageBlurEnabled === true,
  };
}

function normalizeLoading(v: any): LoadingConfig {
  const o = safeObj(v);
  const rawId = typeof o.animationId === "string" ? o.animationId : "spinner-simple";
  const animationId = cmsSettingsCatalogRuntime.hasLoadingAnimation(rawId) ? rawId : "spinner-simple";
  return {
    enabled: o.enabled === true,
    animationId,
  };
}

function normalizeAdminTheme(v: any): AdminThemeConfig {
  const o = safeObj(v);
  const rawPresetId = typeof o.presetId === "string" ? o.presetId : "default";
  const presetId =
    rawPresetId === "default" || isThemePresetId(rawPresetId) ? (rawPresetId as AdminThemePresetId) : "default";
  return { presetId };
}

function normalizeCursorThemeId(v: any): CursorThemeId {
  const raw = typeof v === "string" ? v : "default";
  if (raw === "default") return "default";
  return cmsSettingsCatalogRuntime.hasCursorTheme(raw) ? raw : "default";
}

function normalizeTheme(v: any): NonNullable<HeaderConfig["theme"]> {
  const o = safeObj(v);
  const rawWebsiteThemeId = typeof o.websiteThemeId === "string" ? o.websiteThemeId : "default";
  const websiteThemeId =
    rawWebsiteThemeId === "default" || cmsSettingsCatalogRuntime.hasWebsiteTheme(rawWebsiteThemeId)
      ? rawWebsiteThemeId
      : "default";
  return {
    mode: o.mode === "light" ? "light" : "dark",
    presetId: isThemePresetId(o.presetId) ? o.presetId : "estabrak_soft_gold",
    websiteThemeId,
    primary: typeof o.primary === "string" && o.primary.trim() ? o.primary : undefined,
    secondary: typeof o.secondary === "string" && o.secondary.trim() ? o.secondary : undefined,
    accent: (o.accent === "rose" || o.accent === "orange" || o.accent === "emerald" || o.accent === "violet" || o.accent === "gold" || o.accent === "blue")
      ? o.accent
      : "gold",
    radius: (o.radius === "md" || o.radius === "xl") ? o.radius : "2xl",
    surface: o.surface === "classic" ? "classic" : "glass",
    customThemes: Array.isArray(o.customThemes) ? o.customThemes : [],
  };
}


type ThemePresetCard = Omit<CustomTheme, "id"> & { id: ThemePresetId };

const THEME_PRESET_CARDS: ThemePresetCard[] = [
  { id: "estabrak_soft_gold", name: "Estabrak Soft", bg: "#F7F4E9", text: "#1A1A1A", accent: "#6FA6A1" },
  { id: "luxury_gold", name: "Luxury Paper", bg: "#F7F4E9", text: "#0B0B0B", accent: "#C6A75E" },
  { id: "clean_tech", name: "Clean Tech", bg: "#F6F8FC", text: "#0F172A", accent: "#2563EB" },
  { id: "street_dark", name: "Street Dark", bg: "#0B0F14", text: "#E5E7EB", accent: "#A3E635" },
  { id: "soft_pastel", name: "Soft Pastel", bg: "#FFF7F0", text: "#1F2937", accent: "#FB7185" },
  { id: "earth_minimal", name: "Earth Minimal", bg: "#F4F1EA", text: "#1B1F1D", accent: "#166534" },
  { id: "ocean_mist", name: "Ocean Mist", bg: "#F2FAFF", text: "#0F172A", accent: "#0EA5E9" },
  { id: "desert_sand", name: "Desert Sand", bg: "#FFF6E9", text: "#3B2F2A", accent: "#D97706" },
  { id: "plum_night", name: "Plum Night", bg: "#F8F5FF", text: "#1C102A", accent: "#A855F7" },
] as const;

function normalizeHeader(v: any): HeaderConfig {
  const o = safeObj(v);
  const rawSearchInputStyleId = typeof o.searchInputStyleId === "string" ? o.searchInputStyleId : "default";
  const searchInputStyleId =
    rawSearchInputStyleId === "default" || cmsSettingsCatalogRuntime.hasSearchInputStyle(rawSearchInputStyleId)
      ? rawSearchInputStyleId
      : "default";
  return {
    ...o,
    preset: (o.preset === "minimal" || o.preset === "centered") ? o.preset : "classic",
    sticky: !!o.sticky,
    showSearch: o.showSearch !== false,
    showCart: o.showCart !== false,
    showAccount: !!o.showAccount,
    heightDesktop: (o.heightDesktop === "compact" || o.heightDesktop === "comfortable") ? o.heightDesktop : "normal",
    heightMobile: (o.heightMobile === "compact" || o.heightMobile === "comfortable") ? o.heightMobile : "compact",
    searchStyle: (o.searchStyle === "icon") ? "icon" : "input",
    searchInputStyleId,
    cartStyle: (o.cartStyle === "icon" || o.cartStyle === "badge") ? o.cartStyle : "iconBadge",
    theme: normalizeTheme(o.theme),
    topbar: {
      enabled: !!o.topbar?.enabled,
      template: (o.topbar?.template === "promo" || o.topbar?.template === "contact") ? o.topbar.template : "info",
      text: o.topbar?.text ?? "",
      href: o.topbar?.href ?? "",
      buttonText: o.topbar?.buttonText ?? "",
      showOnMobile: o.topbar?.showOnMobile !== false,
      bgPreset: (o.topbar?.bgPreset === "gradient" || o.topbar?.bgPreset === "glass") ? o.topbar.bgPreset : "solid",
    },
    announcement: {
      enabled: !!o.announcement?.enabled,
      text: o.announcement?.text ?? "",
      href: o.announcement?.href ?? "",
      buttonText: o.announcement?.buttonText ?? "",
    },
    cta: {
      enabled: !!o.cta?.enabled,
      label: o.cta?.label ?? "",
      href: o.cta?.href ?? "",
    },
    ui: {
      ...safeObj(o.ui),
      loading: normalizeLoading((o.ui as any)?.loading),
      adminTheme: normalizeAdminTheme((o.ui as any)?.adminTheme),
      cursorThemeId: normalizeCursorThemeId((o.ui as any)?.cursorThemeId),
    },
  };
}

function normalizeCmsNav(v: any): CmsNavConfig {
  const o = safeObj(v);
  const items = Array.isArray(o.items) ? o.items : [];
  const rawTemplateId = typeof o.templateId === "string" ? o.templateId : "default";
  const templateId =
    rawTemplateId === "default" || cmsSettingsCatalogRuntime.hasNavTemplate(rawTemplateId)
      ? rawTemplateId
      : "default";
  return {
    enabled: !!o.enabled,
    mode: (o.mode === "mega" ? "mega" : "dropdown"),
    gradient: (["none","sunset","ocean","neon"].includes(o.gradient) ? o.gradient : "none"),
    templateId,
    showIcons: o.showIcons !== false,
    items: normalizeCmsNavItems(items),
  };
}

function normalizeFooter(v: any): FooterConfig {
  const o = safeObj(v);
  const columns = Array.isArray(o.columns) ? o.columns : [];
  const policyLinks = Array.isArray(o.bottom?.policyLinks) ? o.bottom.policyLinks : [];
  return {
    enabled: o.enabled !== false,
    template: (o.template === "columns" || o.template === "mega") ? o.template : "minimal",
    bgPreset: (o.bgPreset === "gradient" || o.bgPreset === "glass") ? o.bgPreset : "solid",
    about: {
      title: o.about?.title ?? "",
      text: o.about?.text ?? "",
    },
    columns: columns.map((c: any) => ({
      id: String(c?.id ?? cryptoId()),
      title: String(c?.title ?? ""),
      links: (Array.isArray(c?.links) ? c.links : []).map((l: any) => ({
        id: String(l?.id ?? cryptoId()),
        label: String(l?.label ?? ""),
        href: String(l?.href ?? ""),
        icon: l?.icon ? String(l.icon) : "",
      })),
    })),
    social: {
      facebook: o.social?.facebook ?? "",
      instagram: o.social?.instagram ?? "",
      tiktok: o.social?.tiktok ?? "",
      whatsapp: o.social?.whatsapp ?? "",
      youtube: o.social?.youtube ?? "",
      x: o.social?.x ?? "",
    },
    newsletter: {
      enabled: !!o.newsletter?.enabled,
      title: o.newsletter?.title ?? "",
      placeholder: o.newsletter?.placeholder ?? "",
      buttonLabel: o.newsletter?.buttonLabel ?? "اشتراك",
    },
    bottom: {
      enabled: o.bottom?.enabled !== false,
      copyright: o.bottom?.copyright ?? "",
      policyLinks: policyLinks.map((p: any) => ({
        id: String(p?.id ?? cryptoId()),
        label: String(p?.label ?? ""),
        href: String(p?.href ?? ""),
      })),
    },
  };
}

type Errors = {
  siteName?: string;
  announcementText?: string;
  scriptsHead?: string;
  scriptsBody?: string;
  headerJson?: string;
  footerJson?: string;
};

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={
        "flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3" +
        (disabled ? " cursor-not-allowed opacity-60" : "")
      }
    >
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 accent-white"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function ThemeColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v?: string) => void;
}) {
  const safeValue = typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/80">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1"
        />
        <Button size="sm" variant="ghost" onClick={() => onChange(undefined)} disabled={!value}>
          مسح
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const q = useSettings();
  const actions = useSettingsActions();

  const settings = q.data ?? null;

  const [siteName, setSiteName] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [faviconUrl, setFaviconUrl] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [customCss, setCustomCss] = useState<string>("");
  const [storeCountryCode, setStoreCountryCode] = useState<string>("IL");
  const [checkoutMode, setCheckoutMode] = useState<"WHATSAPP" | "STRIPE" | "PAYPAL" | "PAYMENTS">("WHATSAPP");
  const [ordersEmail, setOrdersEmail] = useState<string>("");
  const [ordersWhatsapp, setOrdersWhatsapp] = useState<string>("");
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(false);
  const [stripePublicKey, setStripePublicKey] = useState<string>("");
  const [stripeSecretKey, setStripeSecretKey] = useState<string>("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState<string>("");
  const [paypalEnabled, setPaypalEnabled] = useState<boolean>(false);
  const [paypalClientId, setPaypalClientId] = useState<string>("");
  const [paypalClientSecret, setPaypalClientSecret] = useState<string>("");
  const [paypalWebhookId, setPaypalWebhookId] = useState<string>("");

  // Phase 1A: Global announcement bar (stored directly in SiteSettings)
  const [announcementIsActive, setAnnouncementIsActive] = useState<boolean>(false);
  const [announcementText, setAnnouncementText] = useState<string>("");
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState<string>("");

  const [scriptsHeadText, setScriptsHeadText] = useState<string>("");
  const [scriptsBodyText, setScriptsBodyText] = useState<string>("");

  const [headerCfg, setHeaderCfg] = useState<HeaderConfig>(() => normalizeHeader(null));
  const [footerCfg, setFooterCfg] = useState<FooterConfig>(() => normalizeFooter(null));
  const [cmsNavCfg, setCmsNavCfg] = useState<CmsNavConfig>(() => normalizeCmsNav(null));
  const [cmsNavCollapsedMap, setCmsNavCollapsedMap] = useState<Record<string, boolean>>({});
  const [storefrontCfg, setStorefrontCfg] = useState<StorefrontConfig>(() => normalizeStorefront(null));
  const [showHeaderJson, setShowHeaderJson] = useState(false);
  const [showFooterJson, setShowFooterJson] = useState(false);
  const [headerJsonDraft, setHeaderJsonDraft] = useState<string>("");
  const [footerJsonDraft, setFooterJsonDraft] = useState<string>("");
  const [cmsCatalog, setCmsCatalog] = useState<CmsSettingsCatalog>(() => DEFAULT_CMS_SETTINGS_CATALOG);

  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    let cancelled = false;
    import("./cmsSettingsCatalog")
      .then((mod) => {
        if (cancelled) return;
        const loadedCatalog = mod.createCmsSettingsCatalog();
        cmsSettingsCatalogRuntime = loadedCatalog;
        setCmsCatalog(loadedCatalog);
      })
      .catch(() => {
        // Keep page usable if optional catalog chunk fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSearchInputStyle = useMemo(() => {
    const defaultSearchStyle = cmsCatalog.getSearchInputStyleById("search-basic-simple") ?? null;
    const id = headerCfg.searchInputStyleId;
    if (id && id !== "default") return cmsCatalog.getSearchInputStyleById(id) ?? defaultSearchStyle;
    return defaultSearchStyle;
  }, [cmsCatalog, headerCfg.searchInputStyleId]);

  useEffect(() => {
    if (!settings) return;

    setSiteName(settings.siteName ?? "");
    setLogoUrl(settings.logoUrl ?? "");
    setFaviconUrl(settings.faviconUrl ?? "");
    setContactEmail(settings.contactEmail ?? "");
    setContactPhone(settings.contactPhone ?? "");
    setCustomCss(settings.customCss ?? "");
    setStoreCountryCode((settings as any).storeCountryCode ?? "IL");
    setCheckoutMode(((settings as any).checkoutMode ?? "WHATSAPP") as any);
    setOrdersEmail((settings as any).ordersEmail ?? "");
    setOrdersWhatsapp((settings as any).whatsappNumber ?? "");
    setStripeEnabled(!!(settings as any).stripeEnabled);
    setStripePublicKey((settings as any).stripePublicKey ?? "");
    setStripeSecretKey((settings as any).stripeSecretKey ?? "");
    setStripeWebhookSecret((settings as any).stripeWebhookSecret ?? "");
    setPaypalEnabled(!!(settings as any).paypalEnabled);
    setPaypalClientId((settings as any).paypalClientId ?? "");
    setPaypalClientSecret((settings as any).paypalClientSecret ?? "");
    setPaypalWebhookId((settings as any).paypalWebhookId ?? "");

    setAnnouncementIsActive(!!settings.announcementIsActive);
    setAnnouncementText(settings.announcementText ?? "");
    setAnnouncementLinkUrl(settings.announcementLinkUrl ?? "");

    // keep editable JSON as string
    const head = settings.scriptsHead ?? [];
    const body = settings.scriptsBody ?? [];
    setScriptsHeadText(JSON.stringify(head, null, 2));
    setScriptsBodyText(JSON.stringify(body, null, 2));

    setHeaderCfg(normalizeHeader(settings.header));
    setCmsNavCfg(normalizeCmsNav((settings.header as any)?.cmsNav));
    setCmsNavCollapsedMap({});
    setStorefrontCfg(normalizeStorefront((settings.header as any)?.storefront));
    setFooterCfg(normalizeFooter(settings.footer));
    setShowHeaderJson(false);
    setShowFooterJson(false);
    setHeaderJsonDraft("");
    setFooterJsonDraft("");

    setErrors({});
  }, [settings]);

  useEffect(() => {
    if (!showHeaderJson) return;
    setHeaderJsonDraft(JSON.stringify({ ...(headerCfg ?? {}), cmsNav: cmsNavCfg }, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHeaderJson]);

  useEffect(() => {
    if (!showFooterJson) return;
    setFooterJsonDraft(JSON.stringify(footerCfg ?? {}, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFooterJson]);

  const applyHeaderJson = () => {
    try {
      const parsed = headerJsonDraft?.trim() ? JSON.parse(headerJsonDraft) : {};
      setHeaderCfg(normalizeHeader(parsed));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "cmsNav" in (parsed as any)) {
        setCmsNavCfg(normalizeCmsNav((parsed as any).cmsNav));
      }
      setErrors((p) => ({ ...p, headerJson: undefined }));
    } catch {
      setErrors((p) => ({ ...p, headerJson: "JSON غير صالح" }));
    }
  };

  const applyFooterJson = () => {
    try {
      const parsed = footerJsonDraft?.trim() ? JSON.parse(footerJsonDraft) : {};
      setFooterCfg(normalizeFooter(parsed));
      setErrors((p) => ({ ...p, footerJson: undefined }));
    } catch {
      setErrors((p) => ({ ...p, footerJson: "JSON غير صالح" }));
    }
  };

  const canSave = useMemo(() => {
    if (!settings) return false;
    if (actions.updateSettings.isPending) return false;
    return true;
  }, [settings, actions.updateSettings.isPending]);

  const onSave = async () => {
    if (!settings) return;

    const nextErrors: Errors = {};
    if (!siteName.trim()) nextErrors.siteName = "اسم الموقع مطلوب";

    if (announcementIsActive && !announcementText.trim()) {
      nextErrors.announcementText = "نص الشريط العلوي مطلوب عند التفعيل";
    }

    let scriptsHead: any = undefined;
    let scriptsBody: any = undefined;

    // scriptsHead
    try {
      const parsed = scriptsHeadText?.trim() ? JSON.parse(scriptsHeadText) : [];
      if (!Array.isArray(parsed)) nextErrors.scriptsHead = "لازم يكون JSON Array";
      else scriptsHead = parsed;
    } catch {
      nextErrors.scriptsHead = "JSON غير صالح";
    }

    // scriptsBody
    try {
      const parsed = scriptsBodyText?.trim() ? JSON.parse(scriptsBodyText) : [];
      if (!Array.isArray(parsed)) nextErrors.scriptsBody = "لازم يكون JSON Array";
      else scriptsBody = parsed;
    } catch {
      nextErrors.scriptsBody = "JSON غير صالح";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    const normalizedCmsNav = {
      ...cmsNavCfg,
      items: normalizeCmsNavItemsForSave(cmsNavCfg.items ?? []),
    };

    try {
      await actions.updateSettings.mutateAsync({
        siteName: siteName.trim(),
        logoUrl: logoUrl.trim() || null,
        faviconUrl: faviconUrl.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        storeCountryCode: (storeCountryCode.trim() || "IL").toUpperCase(),
        checkoutMode,
        ordersEmail: ordersEmail.trim() || null,
        whatsappNumber: ordersWhatsapp.trim() || null,
        stripeEnabled,
        stripePublicKey: stripePublicKey.trim() || null,
        stripeSecretKey: stripeSecretKey.trim() || null,
        stripeWebhookSecret: stripeWebhookSecret.trim() || null,
        paypalEnabled,
        paypalClientId: paypalClientId.trim() || null,
        paypalClientSecret: paypalClientSecret.trim() || null,
        paypalWebhookId: paypalWebhookId.trim() || null,
        customCss: customCss,
        header: { ...headerCfg, cmsNav: normalizedCmsNav, storefront: storefrontCfg },
        footer: footerCfg,
        scriptsHead,
        scriptsBody,

        // Phase 1A
        announcementIsActive,
        announcementText: announcementText.trim() || null,
        announcementLinkUrl: announcementLinkUrl.trim() || null,
      });
    } catch {
      // toast handled inside hook
    }
  };

  const theme = normalizeTheme(headerCfg.theme);
  const loading = normalizeLoading((headerCfg.ui as any)?.loading);
  const adminTheme = normalizeAdminTheme((headerCfg.ui as any)?.adminTheme);
  const cursorThemeId = normalizeCursorThemeId((headerCfg.ui as any)?.cursorThemeId);
  const loadingPreset = cmsCatalog.getLoadingAnimationById(loading.animationId) ?? null;

  const updateTheme = (patch: Partial<NonNullable<HeaderConfig["theme"]>>) => {
    setHeaderCfg((p) => ({ ...p, theme: { ...normalizeTheme(p.theme), ...patch } }));
  };

  const updateLoading = (patch: Partial<LoadingConfig>) => {
    setHeaderCfg((p) => ({
      ...p,
      ui: {
        ...safeObj(p.ui),
        loading: { ...normalizeLoading((p.ui as any)?.loading), ...patch },
      },
    }));
  };

  const updateAdminTheme = (patch: Partial<AdminThemeConfig>) => {
    setHeaderCfg((p) => ({
      ...p,
      ui: {
        ...safeObj(p.ui),
        adminTheme: { ...normalizeAdminTheme((p.ui as any)?.adminTheme), ...patch },
      },
    }));
  };

  const updateCursorThemeId = (themeId: CursorThemeId) => {
    setHeaderCfg((p) => ({
      ...p,
      ui: {
        ...safeObj(p.ui),
        cursorThemeId: normalizeCursorThemeId(themeId),
      },
    }));
  };

  const updateCmsNavNode = (path: CmsNavPath, updater: (item: CmsNavItem) => CmsNavItem) => {
    setCmsNavCfg((p) => ({
      ...p,
      items: updateCmsNavItemsAtPath(p.items ?? [], path, updater),
    }));
  };

  const removeCmsNavNode = (path: CmsNavPath) => {
    setCmsNavCfg((p) => ({
      ...p,
      items: removeCmsNavItemAtPath(p.items ?? [], path),
    }));
    const key = cmsNavPathKey(path);
    setCmsNavCollapsedMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k === key || k.startsWith(`${key}.`)) delete next[k];
      });
      return next;
    });
  };

  const addCmsNavRootItem = () => {
    setCmsNavCfg((p) => ({
      ...p,
      items: [...(p.items ?? []), createCmsNavItem()],
    }));
  };

  const addCmsNavChild = (path: CmsNavPath) => {
    updateCmsNavNode(path, (item) => ({
      ...item,
      children: [...(item.children ?? []), createCmsNavItem("فرعي")],
    }));
    setCmsNavCollapsedMap((prev) => ({ ...prev, [cmsNavPathKey(path)]: false }));
  };

  const duplicateCmsNavNode = (path: CmsNavPath) => {
    setCmsNavCfg((p) => ({
      ...p,
      items: duplicateCmsNavItemAtPath(p.items ?? [], path),
    }));
  };

  const moveCmsNavNode = (path: CmsNavPath, direction: -1 | 1) => {
    setCmsNavCfg((p) => ({
      ...p,
      items: moveCmsNavItemAtPath(p.items ?? [], path, direction),
    }));
  };

  const toggleCmsNavNodeCollapsed = (path: CmsNavPath) => {
    const key = cmsNavPathKey(path);
    setCmsNavCollapsedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const collapseAllCmsNavNodes = () => {
    const next: Record<string, boolean> = {};
    const walk = (items: CmsNavItem[], path: CmsNavPath = []) => {
      items.forEach((node, idx) => {
        const p = [...path, idx];
        if ((node.children ?? []).length > 0) {
          next[cmsNavPathKey(p)] = true;
          walk(node.children ?? [], p);
        }
      });
    };
    walk(cmsNavCfg.items ?? []);
    setCmsNavCollapsedMap(next);
  };

  const expandAllCmsNavNodes = () => {
    setCmsNavCollapsedMap({});
  };

  function renderCmsNavItemEditor(
    item: CmsNavItem,
    path: CmsNavPath,
    depth = 0,
    siblingCount = 1
  ): React.ReactNode {
    const titleLabel = depth === 0 ? "العنوان" : "عنوان فرعي";
    const hrefLabel = depth === 0 ? "الرابط" : "رابط فرعي";
    const iconLabel = depth === 0 ? "اسم الأيقونة" : "اسم الأيقونة الفرعية";
    const levelLabel = depth === 0 ? "رئيسي" : depth === 1 ? "فرعي" : `فرعي مستوى ${depth}`;
    const children = item.children ?? [];
    const indexInLevel = path[path.length - 1] ?? 0;
    const canMoveUp = indexInLevel > 0;
    const canMoveDown = indexInLevel < siblingCount - 1;
    const hasChildren = children.length > 0;
    const nodePathKey = cmsNavPathKey(path);
    const collapsed = cmsNavCollapsedMap[nodePathKey] === true;
    const iconValue = String(item.icon ?? "");
    const isImageIcon = isCmsNavIconImage(iconValue);
    const iconNameValue = isImageIcon ? "" : iconValue;
    const iconImageValue = isImageIcon ? iconValue : "";

    return (
      <div
        key={item.id || path.join("-")}
        className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
        style={{ marginInlineStart: depth > 0 ? Math.min(depth * 18, 72) : 0 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-white/60">
            مستوى: {levelLabel}
            {hasChildren ? ` • عناصر فرعية: ${children.length}` : ""}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="ghost"
              title="نقل لأعلى"
              onClick={() => moveCmsNavNode(path, -1)}
              disabled={!canMoveUp}
            >
              ↑
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              title="نقل لأسفل"
              onClick={() => moveCmsNavNode(path, 1)}
              disabled={!canMoveDown}
            >
              ↓
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              title="نسخ العنصر"
              onClick={() => duplicateCmsNavNode(path)}
            >
              ⎘
            </Button>
            <Button size="sm" variant="secondary" onClick={() => addCmsNavChild(path)}>
              + عنصر فرعي
            </Button>
            {hasChildren ? (
              <Button size="sm" variant="ghost" onClick={() => toggleCmsNavNodeCollapsed(path)}>
                {collapsed ? "توسيع" : "طي"}
              </Button>
            ) : null}
            <Button size="sm" variant="danger" onClick={() => removeCmsNavNode(path)}>
              حذف
            </Button>
          </div>
        </div>

        {collapsed ? (
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
            <div>العنوان: {item.label || "-"}</div>
            <div>الرابط: {item.href || "-"}</div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label={titleLabel}
                value={item.label ?? ""}
                onValueChange={(value) => updateCmsNavNode(path, (node) => ({ ...node, label: value }))}
              />
              <Input
                label={hrefLabel}
                value={item.href ?? ""}
                onValueChange={(value) => updateCmsNavNode(path, (node) => ({ ...node, href: value }))}
                onBlur={() =>
                  updateCmsNavNode(path, (node) => ({
                    ...node,
                    href: normalizeCmsNavHref(node.href),
                  }))
                }
              />
              <Input
                label={iconLabel}
                value={iconNameValue}
                onValueChange={(value) => updateCmsNavNode(path, (node) => ({ ...node, icon: value }))}
                placeholder="home / shop / phone / star / sparkle"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <MediaUrlInput
                label="صورة الأيقونة (اختياري)"
                value={iconImageValue}
                onChange={(value) => updateCmsNavNode(path, (node) => ({ ...node, icon: value }))}
                placeholder="https://.../icon.png"
                showPreview
              />
              <div className="space-y-2">
                <div className="text-sm font-medium text-white/80">اختصارات أيقونات</div>
                <div className="flex flex-wrap gap-2">
                  {["home", "shop", "phone", "star", "sparkle"].map((preset) => (
                    <Button
                      key={preset}
                      size="sm"
                      variant={iconNameValue === preset ? "secondary" : "ghost"}
                      onClick={() => updateCmsNavNode(path, (node) => ({ ...node, icon: preset }))}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {isImageIcon ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img src={iconValue} className="h-5 w-5 rounded object-contain" />
                <span className="text-xs text-white/60">معاينة أيقونة الصورة</span>
              </div>
            ) : null}
          </>
        )}

        {hasChildren ? (
          <div className="space-y-3 border-r border-white/10 pr-3">
            {children.map((child, idx) =>
              renderCmsNavItemEditor(child, [...path, idx], depth + 1, children.length)
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <div className="text-lg font-semibold">إعدادات الموقع</div>
          <div className="mt-1 text-xs opacity-70">إعدادات الموقع</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">جاري التحميل...</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">حدث خطأ أثناء تحميل الإعدادات.</div>
        ) : !settings ? (
          <div className="text-sm opacity-80">لا توجد إعدادات.</div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader title="تنقل الـCMS (الهيدر)" subtitle="روابط رئيسية وفرعية + منسدلة/ميجا + تدرجات + أيقونات" />
              <CardContent>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={cmsNavCfg.enabled}
                      onChange={(e) => setCmsNavCfg((p) => ({ ...p, enabled: e.target.checked }))}
                    />
                    تفعيل قائمة الـCMS في الهيدر
                  </label>

                  <div className={cmsNavCfg.enabled ? "space-y-3" : "space-y-3 opacity-50 pointer-events-none"}>
                    <div className="grid gap-3 md:grid-cols-5">
                      <Select
                        label="النمط"
                        value={cmsNavCfg.mode}
                        onValueChange={(value) => setCmsNavCfg((p) => ({ ...p, mode: value as any }))}
                        options={[
                          { value: "dropdown", label: "قائمة منسدلة" },
                          { value: "mega", label: "ميجا" },
                        ]}
                      />
                      <Select
                        label="التدرج"
                        value={cmsNavCfg.gradient}
                        onValueChange={(value) => setCmsNavCfg((p) => ({ ...p, gradient: value as any }))}
                        options={[
                          { value: "none", label: "بدون" },
                          { value: "sunset", label: "غروب" },
                          { value: "ocean", label: "محيط" },
                          { value: "neon", label: "نيون" },
                        ]}
                      />
                      <Select
                        label="قالب التنقل"
                        value={cmsNavCfg.templateId}
                        onValueChange={(value) => setCmsNavCfg((p) => ({ ...p, templateId: value }))}
                        options={cmsCatalog.navTemplateOptions}
                      />
                      <Select
                        label="الأيقونات"
                        value={cmsNavCfg.showIcons ? "yes" : "no"}
                        onValueChange={(value) => setCmsNavCfg((p) => ({ ...p, showIcons: value === "yes" }))}
                        options={[
                          { value: "yes", label: "إظهار" },
                          { value: "no", label: "إخفاء" },
                        ]}
                      />
                      <Button
                        variant="secondary"
                        onClick={addCmsNavRootItem}
                      >
                        + إضافة عنصر رئيسي
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={collapseAllCmsNavNodes}>
                        طي كل العناصر
                      </Button>
                      <Button size="sm" variant="ghost" onClick={expandAllCmsNavNodes}>
                        توسيع كل العناصر
                      </Button>
                    </div>

                    <div className="text-xs text-white/60">
                      الأيقونة تدعم اسم أيقونة (home/shop/phone/star/sparkle) أو رابط صورة.
                    </div>
                    <div className="text-xs text-white/50">
                      الروابط تُطبّع تلقائيًا إلى صيغة تبدأ بـ "/" لتجنب مشاكل المسارات النسبية.
                    </div>

                    <div className="space-y-3">
                      {(cmsNavCfg.items ?? []).map((it, i, arr) => renderCmsNavItemEditor(it, [i], 0, arr.length))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="الإعدادات العامة" subtitle="بيانات الموقع والشعار والتواصل." />
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="اسم الموقع"
                    value={siteName}
                    error={errors.siteName}
                    onValueChange={(value) => {
                      setSiteName(value);
                      setErrors((p: Errors) => ({ ...p, siteName: undefined }));
                    }}
                  />
                  <MediaUrlInput label="شعار (URL)" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." showPreview />
                  <MediaUrlInput label="أيقونة الموقع (Favicon URL)" value={faviconUrl} onChange={setFaviconUrl} placeholder="https://..." />
                  <Input label="إيميل التواصل" value={contactEmail} onValueChange={(value) => setContactEmail(value)} placeholder="support@example.com" />
                  <Input label="هاتف التواصل" value={contactPhone} onValueChange={(value) => setContactPhone(value)} placeholder="+972..." />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="إدارة الدفع" subtitle="بوابات الدفع وإعدادات تحويل الدفع." />
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    label="وضع الدفع"
                    value={checkoutMode}
                    onValueChange={(value) =>
                      setCheckoutMode(value as "WHATSAPP" | "STRIPE" | "PAYPAL" | "PAYMENTS")
                    }
                    options={[
                      { value: "WHATSAPP", label: "واتساب (تحويل يدوي)" },
                      { value: "STRIPE", label: "Stripe (تحويل تلقائي)" },
                      { value: "PAYPAL", label: "PayPal (تحويل تلقائي)" },
                      { value: "PAYMENTS", label: "Stripe + PayPal" },
                    ]}
                  />
                  <Select
                    label="الدولة الرئيسية"
                    value={storeCountryCode}
                    onValueChange={(value) => setStoreCountryCode(value)}
                    options={[
                      { value: "IL", label: "إسرائيل (IL)" },
                      { value: "AE", label: "الإمارات (AE)" },
                    ]}
                  />
                  <Input
                    label="واتساب الطلبات"
                    value={ordersWhatsapp}
                    onValueChange={(value) => setOrdersWhatsapp(value)}
                    placeholder="9725XXXXXXXX"
                  />
                  <Input
                    label="إيميل الطلبات"
                    value={ordersEmail}
                    onValueChange={(value) => setOrdersEmail(value)}
                    placeholder="orders@example.com"
                  />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Stripe</div>
                      <Toggle label="تفعيل" checked={stripeEnabled} onChange={setStripeEnabled} />
                    </div>
                    <Input
                      label="Publishable Key"
                      value={stripePublicKey}
                      onValueChange={(value) => setStripePublicKey(value)}
                      placeholder="pk_live_..."
                      disabled={!stripeEnabled}
                    />
                    <Input
                      label="Secret Key"
                      type="password"
                      value={stripeSecretKey}
                      onValueChange={(value) => setStripeSecretKey(value)}
                      placeholder="sk_live_..."
                      disabled={!stripeEnabled}
                    />
                    <Input
                      label="Webhook Secret"
                      type="password"
                      value={stripeWebhookSecret}
                      onValueChange={(value) => setStripeWebhookSecret(value)}
                      placeholder="whsec_..."
                      disabled={!stripeEnabled}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">PayPal</div>
                      <Toggle label="تفعيل" checked={paypalEnabled} onChange={setPaypalEnabled} />
                    </div>
                    <Input
                      label="Client ID"
                      value={paypalClientId}
                      onValueChange={(value) => setPaypalClientId(value)}
                      placeholder="AY..."
                      disabled={!paypalEnabled}
                    />
                    <Input
                      label="Client Secret"
                      type="password"
                      value={paypalClientSecret}
                      onValueChange={(value) => setPaypalClientSecret(value)}
                      placeholder="EAP..."
                      disabled={!paypalEnabled}
                    />
                    <Input
                      label="Webhook ID"
                      value={paypalWebhookId}
                      onValueChange={(value) => setPaypalWebhookId(value)}
                      placeholder="WH-..."
                      disabled={!paypalEnabled}
                    />
                  </div>
                </div>

                <div className="mt-3 text-xs opacity-70">
                  الدفع يتم بتحويل تلقائي لصفحة Stripe أو PayPal، ثم يعود العميل إلى صفحة النجاح في المتجر.
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="CSS مخصص" subtitle="يُطبق على واجهة المتجر العامة." />
              <CardContent>
                <textarea
                  className="min-h-[160px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20"
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  placeholder="/* اكتب CSS هنا */"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="الشريط العلوي العام" subtitle="يظهر أعلى الموقع في الواجهة العامة." />
              <CardContent>
                <div className="space-y-3">
                  <Toggle label="تفعيل الشريط العلوي" checked={announcementIsActive} onChange={setAnnouncementIsActive} />
                  <Input
                    label="النص"
                    value={announcementText}
                    error={errors.announcementText}
                    onValueChange={(value) => {
                      setAnnouncementText(value);
                      setErrors((p) => ({ ...p, announcementText: undefined }));
                    }}
                    disabled={!announcementIsActive}
                    placeholder="خصم اليوم على كل الطلبات..."
                  />
                  <Input
                    label="الرابط"
                    value={announcementLinkUrl}
                    onValueChange={(value) => setAnnouncementLinkUrl(value)}
                    disabled={!announcementIsActive}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="الهيدر" subtitle="خيارات عرض الهيدر والثيم." />
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      label="النمط"
                      value={headerCfg.preset ?? "classic"}
                      onValueChange={(value) => setHeaderCfg((p) => ({ ...p, preset: value as HeaderConfig["preset"] }))}
                      options={[
                        { value: "classic", label: "كلاسيك" },
                        { value: "minimal", label: "بسيط" },
                        { value: "centered", label: "متمركز" },
                      ]}
                    />
                    <Select
                      label="ارتفاع سطح المكتب"
                      value={headerCfg.heightDesktop ?? "normal"}
                      onValueChange={(value) =>
                        setHeaderCfg((p) => ({ ...p, heightDesktop: value as HeaderConfig["heightDesktop"] }))
                      }
                      options={[
                        { value: "compact", label: "مضغوط" },
                        { value: "normal", label: "عادي" },
                        { value: "comfortable", label: "مريح" },
                      ]}
                    />
                    <Select
                      label="ارتفاع الجوال"
                      value={headerCfg.heightMobile ?? "compact"}
                      onValueChange={(value) =>
                        setHeaderCfg((p) => ({ ...p, heightMobile: value as HeaderConfig["heightMobile"] }))
                      }
                      options={[
                        { value: "compact", label: "مضغوط" },
                        { value: "normal", label: "عادي" },
                        { value: "comfortable", label: "مريح" },
                      ]}
                    />
	                    <Select
	                      label="نمط البحث"
	                      value={headerCfg.searchStyle ?? "input"}
	                      onValueChange={(value) =>
	                        setHeaderCfg((p) => ({ ...p, searchStyle: value as HeaderConfig["searchStyle"] }))
	                      }
	                      options={[
	                        { value: "input", label: "حقل" },
	                        { value: "icon", label: "أيقونة" },
	                      ]}
	                    />
	                    <Select
	                      label="نمط مربع البحث"
	                      value={headerCfg.searchInputStyleId ?? "default"}
	                      onValueChange={(value) => setHeaderCfg((p) => ({ ...p, searchInputStyleId: value }))}
	                      options={cmsCatalog.searchInputStyleOptions}
	                      disabled={headerCfg.showSearch === false || headerCfg.searchStyle === "icon"}
	                    />
	                    <Select
	                      label="نمط السلة"
	                      value={headerCfg.cartStyle ?? "iconBadge"}
	                      onValueChange={(value) =>
	                        setHeaderCfg((p) => ({ ...p, cartStyle: value as HeaderConfig["cartStyle"] }))
                      }
                      options={[
                        { value: "iconBadge", label: "أيقونة + عداد" },
                        { value: "icon", label: "أيقونة" },
                        { value: "badge", label: "عداد" },
                      ]}
                    />
                  </div>

	                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
	                    <Toggle label="تثبيت الهيدر" checked={!!headerCfg.sticky} onChange={(v) => setHeaderCfg((p) => ({ ...p, sticky: v }))} />
	                    <Toggle label="إظهار البحث" checked={headerCfg.showSearch !== false} onChange={(v) => setHeaderCfg((p) => ({ ...p, showSearch: v }))} />
	                    <Toggle label="إظهار السلة" checked={headerCfg.showCart !== false} onChange={(v) => setHeaderCfg((p) => ({ ...p, showCart: v }))} />
	                    <Toggle label="إظهار الحساب" checked={!!headerCfg.showAccount} onChange={(v) => setHeaderCfg((p) => ({ ...p, showAccount: v }))} />
	                  </div>

	                  {headerCfg.searchStyle !== "icon" &&
	                  headerCfg.showSearch !== false &&
	                  selectedSearchInputStyle ? (
	                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                      <div className="mb-3 text-sm font-semibold">معاينة مربع البحث</div>
	                      <div className="flex justify-end">
	                        <form
	                          className={`relative ${selectedSearchInputStyle.containerClassName}`}
	                          onSubmit={(e) => e.preventDefault()}
	                        >
	                          <input
	                            dir="rtl"
	                            className={selectedSearchInputStyle.inputClassName}
	                            placeholder="بحث..."
	                            readOnly
	                          />
	                          {selectedSearchInputStyle.buttonClassName ? (
	                            <button type="button" className={selectedSearchInputStyle.buttonClassName}>
	                              {selectedSearchInputStyle.iconClassName &&
	                              !selectedSearchInputStyle.iconClassName.includes("absolute") ? (
	                                <span className={selectedSearchInputStyle.iconClassName}>🔍</span>
	                              ) : (
	                                "بحث"
	                              )}
	                            </button>
	                          ) : null}
	                          {selectedSearchInputStyle.iconClassName &&
	                          selectedSearchInputStyle.iconClassName.includes("absolute") ? (
	                            <span className={selectedSearchInputStyle.iconClassName}>🔍</span>
	                          ) : null}
	                        </form>
	                      </div>
	                    </div>
	                  ) : null}

	                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                    <div className="mb-3 text-sm font-semibold">الثيم</div>
	                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
	                      <Select
                        label="ثيم الموقع"
                        value={theme.websiteThemeId ?? "default"}
                        onValueChange={(value) => updateTheme({ websiteThemeId: value })}
                        options={cmsCatalog.websiteThemeOptions}
                      />
                      <Select
                        label="ثيم لوحة التحكم"
                        value={adminTheme.presetId}
                        onValueChange={(value) => updateAdminTheme({ presetId: value as AdminThemePresetId })}
                        options={[
                          { value: "default", label: "افتراضي" },
                          ...THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
                        ]}
                      />
                      <Select
                        label="ثيم المؤشر (Cursor)"
                        value={cursorThemeId}
                        onValueChange={(value) => updateCursorThemeId(value as CursorThemeId)}
                        options={cmsCatalog.cursorThemeOptions}
                      />
                      <Select
                        label="البريست"
                        value={theme.presetId ?? "estabrak_soft_gold"}
                        onValueChange={(value) => updateTheme({ presetId: value as NonNullable<HeaderConfig["theme"]>["presetId"] })}
                        options={THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
                      />
                      <Select
                        label="الوضع"
                        value={theme.mode ?? "dark"}
                        onValueChange={(value) => updateTheme({ mode: value as NonNullable<HeaderConfig["theme"]>["mode"] })}
                        options={[
                          { value: "dark", label: "داكن" },
                          { value: "light", label: "فاتح" },
                        ]}
                      />
                      <Select
                        label="الأكسنت"
                        value={theme.accent ?? "gold"}
                        onValueChange={(value) => updateTheme({ accent: value as NonNullable<HeaderConfig["theme"]>["accent"] })}
                        options={[
                          { value: "gold", label: "ذهبي" },
                          { value: "blue", label: "أزرق" },
                          { value: "emerald", label: "أخضر" },
                          { value: "orange", label: "برتقالي" },
                          { value: "rose", label: "وردي" },
                          { value: "violet", label: "بنفسجي" },
                        ]}
                      />
                      <Select
                        label="الحواف"
                        value={theme.radius ?? "2xl"}
                        onValueChange={(value) => updateTheme({ radius: value as NonNullable<HeaderConfig["theme"]>["radius"] })}
                        options={[
                          { value: "md", label: "متوسط" },
                          { value: "xl", label: "كبير" },
                          { value: "2xl", label: "كبير جدًا" },
                        ]}
                      />
                      <Select
                        label="الخامة"
                        value={theme.surface ?? "glass"}
                        onValueChange={(value) => updateTheme({ surface: value as NonNullable<HeaderConfig["theme"]>["surface"] })}
                        options={[
                          { value: "glass", label: "زجاجي" },
                          { value: "classic", label: "كلاسيك" },
                        ]}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <ThemeColorField
                        label="اللون الأساسي (Primary)"
                        value={theme.primary}
                        onChange={(value) => updateTheme({ primary: value })}
                      />
                      <ThemeColorField
                        label="اللون الثانوي (Secondary)"
                        value={theme.secondary}
                        onChange={(value) => updateTheme({ secondary: value })}
                      />
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {THEME_PRESET_CARDS.map((preset) => {
                        const active = theme.presetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => updateTheme({ presetId: preset.id })}
                            className={
                              "rounded-xl border p-3 text-right transition " +
                              (active ? "border-accent-500/60 bg-white/10" : "border-white/10 bg-white/5 hover:border-white/20")
                            }
                            aria-pressed={active}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">{preset.name}</div>
                              {active ? <span className="text-xs text-accent-300">مفعل</span> : null}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full border border-white/10" style={{ backgroundColor: preset.bg }} />
                              <span className="h-6 w-6 rounded-full border border-white/10" style={{ backgroundColor: preset.text }} />
                              <span className="h-6 w-6 rounded-full border border-white/10" style={{ backgroundColor: preset.accent }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">حركة التحميل (Loading)</div>
                    <div className="space-y-3">
                      <Toggle
                        label="تفعيل حركة تحميل مخصصة"
                        checked={loading.enabled}
                        onChange={(v) => updateLoading({ enabled: v })}
                      />

                      <div className={loading.enabled ? "space-y-3" : "space-y-3 opacity-60 pointer-events-none"}>
                        <Select
                          label="النوع"
                          value={loading.animationId}
                          onValueChange={(value) => updateLoading({ animationId: value })}
                          options={cmsCatalog.loadingAnimationOptions}
                        />

                        {loadingPreset ? (
                          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                            <div className="mb-2 text-xs opacity-70">معاينة</div>
                            <div className="flex items-center justify-center">
                              <style>{loadingPreset.css}</style>
                              <div dangerouslySetInnerHTML={{ __html: loadingPreset.html }} />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">الشريط العلوي في الهيدر</div>
                    <div className="space-y-3">
                      <Toggle
                        label="تفعيل الشريط العلوي"
                        checked={!!headerCfg.topbar?.enabled}
                        onChange={(v) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, enabled: v } }))}
                      />
                      <div
                        className={
                          headerCfg.topbar?.enabled
                            ? "grid gap-3 md:grid-cols-2"
                            : "grid gap-3 md:grid-cols-2 opacity-60 pointer-events-none"
                        }
                      >
                        <Select
                          label="القالب"
                          value={headerCfg.topbar?.template ?? "info"}
                          onValueChange={(value) =>
                            setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, template: value as "info" | "promo" | "contact" } }))
                          }
                          options={[
                            { value: "info", label: "معلومات" },
                            { value: "promo", label: "ترويجي" },
                            { value: "contact", label: "تواصل" },
                          ]}
                        />
                        <Select
                          label="الخلفية"
                          value={headerCfg.topbar?.bgPreset ?? "solid"}
                          onValueChange={(value) =>
                            setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, bgPreset: value as "solid" | "gradient" | "glass" } }))
                          }
                          options={[
                            { value: "solid", label: "لون ثابت" },
                            { value: "gradient", label: "تدرج" },
                            { value: "glass", label: "زجاجي" },
                          ]}
                        />
                        <Input
                          label="النص"
                          value={headerCfg.topbar?.text ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, text: value } }))}
                          placeholder="نص الشريط"
                        />
                        <Input
                          label="الرابط"
                          value={headerCfg.topbar?.href ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, href: value } }))}
                          placeholder="https://..."
                        />
                        <Input
                          label="نص الزر"
                          value={headerCfg.topbar?.buttonText ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, buttonText: value } }))}
                          placeholder="تسوق الآن"
                        />
                        <Toggle
                          label="إظهار على الجوال"
                          checked={headerCfg.topbar?.showOnMobile !== false}
                          onChange={(v) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, showOnMobile: v } }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">إعلان الهيدر</div>
                    <div className="space-y-3">
                      <Toggle
                        label="تفعيل إعلان الهيدر"
                        checked={!!headerCfg.announcement?.enabled}
                        onChange={(v) => setHeaderCfg((p) => ({ ...p, announcement: { ...p.announcement, enabled: v } }))}
                      />
                      <div
                        className={
                          headerCfg.announcement?.enabled
                            ? "grid gap-3 md:grid-cols-2"
                            : "grid gap-3 md:grid-cols-2 opacity-60 pointer-events-none"
                        }
                      >
                        <Input
                          label="النص"
                          value={headerCfg.announcement?.text ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, announcement: { ...p.announcement, text: value } }))}
                          placeholder="شحن مجاني عند الطلبات فوق 250"
                        />
                        <Input
                          label="الرابط"
                          value={headerCfg.announcement?.href ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, announcement: { ...p.announcement, href: value } }))}
                          placeholder="https://..."
                        />
                        <Input
                          label="نص الزر"
                          value={headerCfg.announcement?.buttonText ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, announcement: { ...p.announcement, buttonText: value } }))}
                          placeholder="تسوق الآن"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">زر الدعوة</div>
                    <div className="space-y-3">
                      <Toggle
                        label="تفعيل زر الدعوة"
                        checked={!!headerCfg.cta?.enabled}
                        onChange={(v) => setHeaderCfg((p) => ({ ...p, cta: { ...p.cta, enabled: v } }))}
                      />
                      <div
                        className={
                          headerCfg.cta?.enabled
                            ? "grid gap-3 md:grid-cols-2"
                            : "grid gap-3 md:grid-cols-2 opacity-60 pointer-events-none"
                        }
                      >
                        <Input
                          label="النص"
                          value={headerCfg.cta?.label ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, cta: { ...p.cta, label: value } }))}
                          placeholder="التواصل"
                        />
                        <Input
                          label="الرابط"
                          value={headerCfg.cta?.href ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, cta: { ...p.cta, href: value } }))}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">إعدادات متقدمة</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setShowHeaderJson((v) => !v)}
                    >
                      {showHeaderJson ? "إخفاء JSON" : "عرض JSON"}
                    </Button>
                  </div>

                  {showHeaderJson ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium">JSON الهيدر (متقدم)</label>
                      <textarea
                        className={
                          "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                          (errors.headerJson ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                        }
                        value={headerJsonDraft}
                        onChange={(e) => {
                          setHeaderJsonDraft(e.target.value);
                          setErrors((p) => ({ ...p, headerJson: undefined }));
                        }}
                      />
                      {errors.headerJson ? <div className="mt-2 text-xs text-red-200">{errors.headerJson}</div> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" type="button" onClick={applyHeaderJson}>
                          تطبيق JSON
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setHeaderJsonDraft(JSON.stringify({ ...(headerCfg ?? {}), cmsNav: cmsNavCfg }, null, 2))}
                        >
                          إعادة ضبط
                        </Button>
                      </div>
                      <div className="mt-2 text-xs opacity-70">ملاحظة: عند حفظ الإعدادات سيتم إرسال settings.header للباك-إند.</div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="الفوتر" subtitle="روابط، نبذة، ونشرة بريدية." />
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Toggle
                      label="تفعيل الفوتر"
                      checked={footerCfg.enabled}
                      onChange={(v) => setFooterCfg((p) => ({ ...p, enabled: v }))}
                    />
                    <Select
                      label="القالب"
                      value={footerCfg.template ?? "minimal"}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, template: value as FooterConfig["template"] }))}
                      options={[
                        { value: "minimal", label: "بسيط" },
                        { value: "columns", label: "أعمدة" },
                        { value: "mega", label: "ميجا" },
                      ]}
                    />
                    <Select
                      label="الخلفية"
                      value={footerCfg.bgPreset ?? "solid"}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, bgPreset: value as FooterConfig["bgPreset"] }))}
                      options={[
                        { value: "solid", label: "لون ثابت" },
                        { value: "gradient", label: "تدرج" },
                        { value: "glass", label: "زجاجي" },
                      ]}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">عن المتجر</div>
                    <div className="space-y-3">
                      <Input
                        label="العنوان"
                        value={footerCfg.about.title}
                        onValueChange={(value) => setFooterCfg((p) => ({ ...p, about: { ...p.about, title: value } }))}
                        placeholder="من نحن"
                      />
                      <div>
                        <label className="mb-2 block text-sm font-medium">النص</label>
                        <textarea
                          className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20"
                          value={footerCfg.about.text}
                          onChange={(e) => setFooterCfg((p) => ({ ...p, about: { ...p.about, text: e.target.value } }))}
                          placeholder="اكتب نبذة قصيرة..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">أعمدة وروابط الفوتر</div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setFooterCfg((p) => ({
                          ...p,
                          columns: [...p.columns, { id: cryptoId(), title: "", links: [] }],
                        }))
                      }
                    >
                      + إضافة عمود
                    </Button>
                  </div>

                  {footerCfg.columns.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {footerCfg.columns.map((col, colIdx) => (
                        <div key={col.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">عمود #{colIdx + 1}</div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setFooterCfg((p) => ({
                                  ...p,
                                  columns: p.columns.filter((c) => c.id !== col.id),
                                }))
                              }
                            >
                              حذف
                            </Button>
                          </div>
                          <div className="mt-3 space-y-3">
                            <Input
                              label="العنوان"
                              value={col.title}
                              onValueChange={(value) =>
                                setFooterCfg((p) => ({
                                  ...p,
                                  columns: p.columns.map((c) => (c.id === col.id ? { ...c, title: value } : c)),
                                }))
                              }
                            />

                            <div className="flex items-center justify-between">
                              <div className="text-xs opacity-70">الروابط</div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setFooterCfg((p) => ({
                                    ...p,
                                    columns: p.columns.map((c) =>
                                      c.id === col.id
                                        ? { ...c, links: [...c.links, { id: cryptoId(), label: "", href: "", icon: "" }] }
                                        : c
                                    ),
                                  }))
                                }
                              >
                                + إضافة رابط
                              </Button>
                            </div>

                            {col.links.length ? (
                              <div className="space-y-3">
                                {col.links.map((l) => (
                                  <div key={l.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                                    <div className="flex items-center justify-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setFooterCfg((p) => ({
                                            ...p,
                                            columns: p.columns.map((c) =>
                                              c.id === col.id ? { ...c, links: c.links.filter((x) => x.id !== l.id) } : c
                                            ),
                                          }))
                                        }
                                      >
                                        حذف
                                      </Button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <Input
                                        label="العنوان"
                                        value={l.label}
                                        onValueChange={(value) =>
                                          setFooterCfg((p) => ({
                                            ...p,
                                            columns: p.columns.map((c) =>
                                              c.id === col.id
                                                ? {
                                                    ...c,
                                                    links: c.links.map((x) => (x.id === l.id ? { ...x, label: value } : x)),
                                                  }
                                                : c
                                            ),
                                          }))
                                        }
                                      />
                                      <Input
                                        label="الرابط"
                                        value={l.href}
                                        onValueChange={(value) =>
                                          setFooterCfg((p) => ({
                                            ...p,
                                            columns: p.columns.map((c) =>
                                              c.id === col.id
                                                ? {
                                                    ...c,
                                                    links: c.links.map((x) => (x.id === l.id ? { ...x, href: value } : x)),
                                                  }
                                                : c
                                            ),
                                          }))
                                        }
                                      />
                                      <Input
                                        label="Icon key (optional)"
                                        value={l.icon ?? ""}
                                        onValueChange={(value) =>
                                          setFooterCfg((p) => ({
                                            ...p,
                                            columns: p.columns.map((c) =>
                                              c.id === col.id
                                                ? {
                                                    ...c,
                                                    links: c.links.map((x) => (x.id === l.id ? { ...x, icon: value } : x)),
                                                  }
                                                : c
                                            ),
                                          }))
                                        }
                                        placeholder="مثال: instagram, mail, phone"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs opacity-60">(لا توجد روابط)</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-white/60">(لا توجد أعمدة بعد)</div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 text-sm font-semibold">النشرة البريدية</div>
                  <div className="space-y-3">
                    <Toggle
                      label="تفعيل النشرة"
                      checked={!!footerCfg.newsletter.enabled}
                      onChange={(v) => setFooterCfg((p) => ({ ...p, newsletter: { ...p.newsletter, enabled: v } }))}
                    />
                    <Input
                      label="العنوان"
                      value={footerCfg.newsletter.title}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, newsletter: { ...p.newsletter, title: value } }))}
                      disabled={!footerCfg.newsletter.enabled}
                      placeholder="اشترك بالنشرة"
                    />
                    <Input
                      label="النص البديل"
                      value={footerCfg.newsletter.placeholder}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, newsletter: { ...p.newsletter, placeholder: value } }))}
                      disabled={!footerCfg.newsletter.enabled}
                      placeholder="ادخل بريدك الإلكتروني"
                    />
                    <Input
                      label="زر الاشتراك"
                      value={footerCfg.newsletter.buttonLabel ?? ""}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, newsletter: { ...p.newsletter, buttonLabel: value } }))}
                      disabled={!footerCfg.newsletter.enabled}
                      placeholder="اشتراك"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 text-sm font-semibold">روابط السوشال</div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <Input label="Instagram" value={footerCfg.social.instagram} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, instagram: value } }))} placeholder="https://instagram.com/..." />
                    <Input label="Facebook" value={footerCfg.social.facebook} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, facebook: value } }))} placeholder="https://facebook.com/..." />
                    <Input label="TikTok" value={footerCfg.social.tiktok} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, tiktok: value } }))} placeholder="https://tiktok.com/@..." />
                    <Input label="WhatsApp" value={footerCfg.social.whatsapp} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, whatsapp: value } }))} placeholder="https://wa.me/..." />
                    <Input label="YouTube" value={footerCfg.social.youtube} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, youtube: value } }))} placeholder="https://youtube.com/..." />
                    <Input label="X / Twitter" value={footerCfg.social.x} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, x: value } }))} placeholder="https://x.com/..." />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 text-sm font-semibold">شريط الأسفل</div>
                  <div className="space-y-3">
                    <Toggle
                      label="تفعيل شريط الأسفل"
                      checked={footerCfg.bottom.enabled}
                      onChange={(v) => setFooterCfg((p) => ({ ...p, bottom: { ...p.bottom, enabled: v } }))}
                    />
                    <Input
                      label="حقوق النشر"
                      value={footerCfg.bottom.copyright}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, bottom: { ...p.bottom, copyright: value } }))}
                      placeholder="© 2025 Estabrak"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">روابط السياسات</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setFooterCfg((p) => ({
                            ...p,
                            bottom: {
                              ...p.bottom,
                              policyLinks: [...p.bottom.policyLinks, { id: cryptoId(), label: "", href: "" }],
                            },
                          }))
                        }
                      >
                        + إضافة سياسة
                      </Button>
                    </div>

                    {footerCfg.bottom.policyLinks.length ? (
                      <div className="space-y-3">
                        {footerCfg.bottom.policyLinks.map((pl) => (
                          <div key={pl.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setFooterCfg((p) => ({
                                    ...p,
                                    bottom: {
                                      ...p.bottom,
                                      policyLinks: p.bottom.policyLinks.filter((x) => x.id !== pl.id),
                                    },
                                  }))
                                }
                              >
                                حذف
                              </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <Input
                                label="العنوان"
                                value={pl.label}
                                onValueChange={(value) =>
                                  setFooterCfg((p) => ({
                                    ...p,
                                    bottom: {
                                      ...p.bottom,
                                      policyLinks: p.bottom.policyLinks.map((x) =>
                                        x.id === pl.id ? { ...x, label: value } : x
                                      ),
                                    },
                                  }))
                                }
                              />
                              <Input
                                label="الرابط"
                                value={pl.href}
                                onValueChange={(value) =>
                                  setFooterCfg((p) => ({
                                    ...p,
                                    bottom: {
                                      ...p.bottom,
                                      policyLinks: p.bottom.policyLinks.map((x) =>
                                        x.id === pl.id ? { ...x, href: value } : x
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs opacity-60">(No policy links)</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">إعدادات متقدمة</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setShowFooterJson((v) => !v)}
                  >
                    {showFooterJson ? "إخفاء JSON" : "عرض JSON"}
                  </Button>
                </div>

                {showFooterJson ? (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium">JSON الفوتر (متقدم)</label>
                    <textarea
                      className={
                        "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                        (errors.footerJson ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                      }
                      value={footerJsonDraft}
                      onChange={(e) => {
                        setFooterJsonDraft(e.target.value);
                        setErrors((p) => ({ ...p, footerJson: undefined }));
                      }}
                    />
                    {errors.footerJson ? <div className="mt-2 text-xs text-red-200">{errors.footerJson}</div> : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" type="button" onClick={applyFooterJson}>
                        تطبيق JSON
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setFooterJsonDraft(JSON.stringify(footerCfg ?? {}, null, 2))}
                      >
                        إعادة ضبط
                      </Button>
                    </div>
                    <div className="mt-2 text-xs opacity-70">ملاحظة: عند حفظ الإعدادات سيتم إرسال settings.footer للباك-إند.</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Storefront UI Settings */}
            <Card>
              <CardHeader title="إعدادات واجهة المتجر" subtitle="تحكم في ميزات وتأثيرات الواجهة الأمامية" />
              <CardContent>
                <div className="space-y-6">
                  {/* Seasonal Effects */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">❄️</span>
                      التأثيرات الموسمية
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Toggle
                        label="تفعيل التأثيرات الموسمية"
                        checked={storefrontCfg.seasonalEffectsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, seasonalEffectsEnabled: v }))}
                      />
                      <Select
                        label="الثيم الموسمي"
                        value={storefrontCfg.seasonalTheme}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, seasonalTheme: v as StorefrontConfig["seasonalTheme"] }))}
                        options={[
                          { value: "auto", label: "تلقائي (حسب التاريخ)" },
                          { value: "none", label: "بدون" },
                          { value: "winter", label: "شتاء ❄️" },
                          { value: "ramadan", label: "رمضان 🌙" },
                          { value: "eid", label: "العيد 🎉" },
                          { value: "black-friday", label: "الجمعة السوداء 🔥" },
                          { value: "summer", label: "صيف ☀️" },
                        ]}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <Input
                        type="number"
                        label="مدة الظهور (ثواني)"
                        value={String(storefrontCfg.seasonalEffectsDuration)}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, seasonalEffectsDuration: Number(v) || 15 }))}
                      />
                      <Input
                        type="number"
                        label="الفترة بين الظهور (دقائق)"
                        value={String(storefrontCfg.seasonalEffectsInterval)}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, seasonalEffectsInterval: Number(v) || 60 }))}
                      />
                      <Input
                        type="number"
                        label="عدد الجزيئات"
                        value={String(storefrontCfg.seasonalParticleCount)}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, seasonalParticleCount: Number(v) || 25 }))}
                      />
                    </div>
                  </div>

                  {/* Product Page Features */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      ميزات صفحة المنتج
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <Toggle
                        label="عرض 360°"
                        checked={storefrontCfg.product360ViewEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, product360ViewEnabled: v }))}
                      />
                      <Toggle
                        label="تدوير تلقائي 360°"
                        checked={storefrontCfg.product360AutoRotate}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, product360AutoRotate: v }))}
                      />
                      <Toggle
                        label="تكبير الصورة"
                        checked={storefrontCfg.productZoomEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, productZoomEnabled: v }))}
                      />
                      <Toggle
                        label="شارات المنتج"
                        checked={storefrontCfg.productBadgesEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, productBadgesEnabled: v }))}
                      />
                      <Toggle
                        label="مؤشر المخزون"
                        checked={storefrontCfg.productStockIndicator}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, productStockIndicator: v }))}
                      />
                      <Toggle
                        label="موصي المقاس"
                        checked={storefrontCfg.productSizeRecommender}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, productSizeRecommender: v }))}
                      />
                      <Toggle
                        label="المشاهدة مؤخراً"
                        checked={storefrontCfg.productRecentlyViewed}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, productRecentlyViewed: v }))}
                      />
                      <Toggle
                        label="المنتجات المقترحة"
                        checked={storefrontCfg.productRecommendations}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, productRecommendations: v }))}
                      />
                      <Toggle
                        label="العرض السريع"
                        checked={storefrontCfg.productQuickView}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, productQuickView: v }))}
                      />
                      <Toggle
                        label="مقارنة المنتجات"
                        checked={storefrontCfg.productCompareEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, productCompareEnabled: v }))}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <Input
                        type="number"
                        label="سرعة التدوير 360° (ms)"
                        value={String(storefrontCfg.product360RotateSpeed)}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, product360RotateSpeed: Number(v) || 100 }))}
                      />
                      <Input
                        type="number"
                        label="حد تنبيه المخزون"
                        value={String(storefrontCfg.productStockThreshold)}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, productStockThreshold: Number(v) || 20 }))}
                      />
                      <Input
                        type="number"
                        label="عدد المشاهدة مؤخراً"
                        value={String(storefrontCfg.productRecentlyViewedCount)}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, productRecentlyViewedCount: Number(v) || 6 }))}
                      />
                    </div>
                  </div>

                  {/* Search & Discovery */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">🔍</span>
                      البحث والاكتشاف
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <Toggle
                        label="البحث الصوتي"
                        checked={storefrontCfg.voiceSearchEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, voiceSearchEnabled: v }))}
                      />
                      <Toggle
                        label="البحث بالصورة"
                        checked={storefrontCfg.imageSearchEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, imageSearchEnabled: v }))}
                      />
                      <Toggle
                        label="التوصيات الذكية AI"
                        checked={storefrontCfg.aiRecommendationsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, aiRecommendationsEnabled: v }))}
                      />
                      <Toggle
                        label="اقتراحات البحث"
                        checked={storefrontCfg.searchSuggestionsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, searchSuggestionsEnabled: v }))}
                      />
                      <Toggle
                        label="سجل البحث"
                        checked={storefrontCfg.searchHistoryEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, searchHistoryEnabled: v }))}
                      />
                    </div>
                  </div>

                  {/* Chat & Support */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">💬</span>
                      الدردشة والدعم
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <Toggle
                        label="الدردشة المباشرة"
                        checked={storefrontCfg.liveChatEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, liveChatEnabled: v }))}
                      />
                      <Toggle
                        label="الشات بوت AI"
                        checked={storefrontCfg.chatbotEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, chatbotEnabled: v }))}
                      />
                      <Toggle
                        label="سحب الشات بوت"
                        checked={storefrontCfg.chatbotDraggable}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, chatbotDraggable: v }))}
                      />
                      <Toggle
                        label="زر واتساب"
                        checked={storefrontCfg.whatsappEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, whatsappEnabled: v }))}
                      />
                      <Select
                        label="موقع الدردشة"
                        value={storefrontCfg.liveChatPosition}
                        onValueChange={(v) =>
                          setStorefrontCfg((p) => ({
                            ...p,
                            liveChatPosition: v as "bottom-left" | "bottom-right" | "bottom-center",
                          }))
                        }
                        options={[
                          { value: "bottom-left", label: "أسفل يسار" },
                          { value: "bottom-right", label: "أسفل يمين" },
                          { value: "bottom-center", label: "أسفل وسط" },
                        ]}
                      />
                      <Select
                        label="موقع الشات بوت"
                        value={storefrontCfg.chatbotPosition}
                        onValueChange={(v) =>
                          setStorefrontCfg((p) => ({
                            ...p,
                            chatbotPosition: v as "bottom-left" | "bottom-right" | "bottom-center",
                          }))
                        }
                        options={[
                          { value: "bottom-left", label: "أسفل يسار" },
                          { value: "bottom-right", label: "أسفل يمين" },
                          { value: "bottom-center", label: "أسفل وسط" },
                        ]}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Input
                        label="رسالة الترحيب"
                        value={storefrontCfg.liveChatWelcomeMessage}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, liveChatWelcomeMessage: v }))}
                        placeholder="مرحباً! كيف يمكنني مساعدتك؟"
                      />
                      <Input
                        label="رقم الواتساب"
                        value={storefrontCfg.whatsappNumber}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, whatsappNumber: v }))}
                        placeholder="+972XXXXXXXXX"
                      />
                    </div>
                    <div className="mt-3">
                      <Input
                        label="رسالة عدم الاتصال"
                        value={storefrontCfg.liveChatOfflineMessage}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, liveChatOfflineMessage: v }))}
                        placeholder="نحن غير متصلين حالياً..."
                      />
                    </div>
                  </div>

                  {/* Visual Effects */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      التأثيرات البصرية
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <Toggle
                        label="قصاصات الإضافة للسلة"
                        checked={storefrontCfg.confettiOnAddToCart}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, confettiOnAddToCart: v }))}
                      />
                      <Toggle
                        label="قلوب المفضلة"
                        checked={storefrontCfg.heartBurstOnWishlist}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, heartBurstOnWishlist: v }))}
                      />
                      <Toggle
                        label="تأثيرات التمرير"
                        checked={storefrontCfg.scrollAnimationsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, scrollAnimationsEnabled: v }))}
                      />
                      <Toggle
                        label="الأزرار المغناطيسية"
                        checked={storefrontCfg.magneticButtonsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, magneticButtonsEnabled: v }))}
                      />
                      <Toggle
                        label="ميلان البطاقات 3D"
                        checked={storefrontCfg.cardTiltEffectEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cardTiltEffectEnabled: v }))}
                      />
                      <Toggle
                        label="تأثير Parallax"
                        checked={storefrontCfg.parallaxEffectsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, parallaxEffectsEnabled: v }))}
                      />
                      <Toggle
                        label="تأثيرات زجاجية"
                        checked={storefrontCfg.glassEffectsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, glassEffectsEnabled: v }))}
                      />
                    </div>
                  </div>

                  {/* Cart & Checkout */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">🛒</span>
                      السلة والدفع
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <Toggle
                        label="السلة المصغرة"
                        checked={storefrontCfg.miniCartEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, miniCartEnabled: v }))}
                      />
                      <Toggle
                        label="تأثيرات السلة"
                        checked={storefrontCfg.cartAnimationsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cartAnimationsEnabled: v }))}
                      />
                      <Toggle
                        label="اهتزاز السلة"
                        checked={storefrontCfg.cartShakeOnAdd}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cartShakeOnAdd: v }))}
                      />
                      <Toggle
                        label="شريط تقدم الدفع"
                        checked={storefrontCfg.checkoutProgressEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, checkoutProgressEnabled: v }))}
                      />
                      <Toggle
                        label="تأثيرات الكوبون"
                        checked={storefrontCfg.couponAnimationsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, couponAnimationsEnabled: v }))}
                      />
                      <Toggle
                        label="إظهار واتساب مع بوابات الدفع"
                        checked={storefrontCfg.allowManualCheckoutWithPayments}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, allowManualCheckoutWithPayments: v }))}
                      />
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">🧭</span>
                      التنقل
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <Toggle
                        label="شريط التنقل السفلي"
                        checked={storefrontCfg.mobileBottomNavEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, mobileBottomNavEnabled: v }))}
                      />
                      <Toggle
                        label="زر العودة للأعلى"
                        checked={storefrontCfg.scrollToTopEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, scrollToTopEnabled: v }))}
                      />
                      <Toggle
                        label="مسار التنقل"
                        checked={storefrontCfg.breadcrumbsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, breadcrumbsEnabled: v }))}
                      />
                      <Toggle
                        label="الهيدر الثابت"
                        checked={storefrontCfg.stickyHeaderEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, stickyHeaderEnabled: v }))}
                      />
                      <Toggle
                        label="شريط تقدم التمرير"
                        checked={storefrontCfg.scrollProgressEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, scrollProgressEnabled: v }))}
                      />
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">🔔</span>
                      الإشعارات والتنبيهات
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <Toggle
                        label="إشعارات Toast"
                        checked={storefrontCfg.toastNotificationsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, toastNotificationsEnabled: v }))}
                      />
                      <Toggle
                        label="تنبيه نفاد المخزون"
                        checked={storefrontCfg.stockAlertEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, stockAlertEnabled: v }))}
                      />
                      <Toggle
                        label="تنبيه انخفاض السعر"
                        checked={storefrontCfg.priceDropAlertEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, priceDropAlertEnabled: v }))}
                      />
                      <Select
                        label="موقع الإشعارات"
                        value={storefrontCfg.toastPosition}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, toastPosition: v as StorefrontConfig["toastPosition"] }))}
                        options={[
                          { value: "top-right", label: "أعلى يمين" },
                          { value: "top-left", label: "أعلى يسار" },
                          { value: "bottom-right", label: "أسفل يمين" },
                          { value: "bottom-left", label: "أسفل يسار" },
                        ]}
                      />
                      <Select
                        label="ثيم إشعارات Toast"
                        value={storefrontCfg.toastThemeId}
                        onValueChange={(v) => setStorefrontCfg((p) => ({ ...p, toastThemeId: v }))}
                        options={cmsCatalog.toastThemeOptions}
                        disabled={!storefrontCfg.toastNotificationsEnabled}
                      />
                    </div>
                  </div>

                  {/* Social Proof */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">👥</span>
                      الإثبات الاجتماعي
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Toggle
                        label="نافذة المشتريات الأخيرة"
                        checked={storefrontCfg.recentPurchasesPopup}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, recentPurchasesPopup: v }))}
                      />
                      <Toggle
                        label="عدد المشاهدين"
                        checked={storefrontCfg.viewersCountEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, viewersCountEnabled: v }))}
                      />
                      <Toggle
                        label="عدد المبيعات"
                        checked={storefrontCfg.soldCountEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, soldCountEnabled: v }))}
                      />
                    </div>
                  </div>

                  {/* CMS Overrides */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">🧩</span>
                      صفحات CMS الأساسية
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Toggle
                        label="الصفحة الرئيسية (/)"
                        checked={storefrontCfg.cmsOverrideHome}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cmsOverrideHome: v }))}
                      />
                      <Toggle
                        label="المتجر (/shop)"
                        checked={storefrontCfg.cmsOverrideShop}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cmsOverrideShop: v }))}
                      />
                      <Toggle
                        label="من نحن (/about)"
                        checked={storefrontCfg.cmsOverrideAbout}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cmsOverrideAbout: v }))}
                      />
                      <Toggle
                        label="تواصل معنا (/contact)"
                        checked={storefrontCfg.cmsOverrideContact}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cmsOverrideContact: v }))}
                      />
                      <Toggle
                        label="البحث (/search)"
                        checked={storefrontCfg.cmsOverrideSearch}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cmsOverrideSearch: v }))}
                      />
                      <Toggle
                        label="السلة (/cart)"
                        checked={storefrontCfg.cmsOverrideCart}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, cmsOverrideCart: v }))}
                      />
                    </div>
                  </div>

                  {/* Theme & Colors */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">🎨</span>
                      الثيم والألوان
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Toggle
                        label="تفعيل الثيم والألوان"
                        checked={storefrontCfg.themeColorsEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, themeColorsEnabled: v }))}
                      />
                      <Toggle
                        label="تمكين الوضع الداكن"
                        checked={storefrontCfg.darkModeEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, darkModeEnabled: v }))}
                      />
                      <Toggle
                        label="الوضع الداكن افتراضي"
                        checked={storefrontCfg.darkModeDefault}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, darkModeDefault: v }))}
                        disabled={!storefrontCfg.themeColorsEnabled || !storefrontCfg.darkModeEnabled}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">اللون الرئيسي</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={storefrontCfg.accentColor}
                            onChange={(e) => setStorefrontCfg((p) => ({ ...p, accentColor: e.target.value }))}
                            disabled={!storefrontCfg.themeColorsEnabled}
                            className={
                              "h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1" +
                              (!storefrontCfg.themeColorsEnabled ? " cursor-not-allowed opacity-60" : "")
                            }
                          />
                          <span className={"text-sm opacity-70" + (!storefrontCfg.themeColorsEnabled ? " opacity-40" : "")}>
                            {storefrontCfg.accentColor}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">اللون الثانوي</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={storefrontCfg.accentColor2}
                            onChange={(e) => setStorefrontCfg((p) => ({ ...p, accentColor2: e.target.value }))}
                            disabled={!storefrontCfg.themeColorsEnabled}
                            className={
                              "h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1" +
                              (!storefrontCfg.themeColorsEnabled ? " cursor-not-allowed opacity-60" : "")
                            }
                          />
                          <span className={"text-sm opacity-70" + (!storefrontCfg.themeColorsEnabled ? " opacity-40" : "")}>
                            {storefrontCfg.accentColor2}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      الأداء
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Toggle
                        label="تحميل الصور الكسول"
                        checked={storefrontCfg.lazyLoadImages}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, lazyLoadImages: v }))}
                      />
                      <Toggle
                        label="تمويه الصور أثناء التحميل"
                        checked={storefrontCfg.imageBlurEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, imageBlurEnabled: v }))}
                      />
                      <Toggle
                        label="هياكل التحميل"
                        checked={storefrontCfg.skeletonLoadingEnabled}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, skeletonLoadingEnabled: v }))}
                      />
                      <Toggle
                        label="التحميل المسبق للروابط"
                        checked={storefrontCfg.prefetchLinks}
                        onChange={(v) => setStorefrontCfg((p) => ({ ...p, prefetchLinks: v }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Scripts في &lt;head&gt; (JSON Array)</label>
                <textarea
                  className={
                    "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                    (errors.scriptsHead ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                  }
                  value={scriptsHeadText}
                  onChange={(e) => {
                    setScriptsHeadText(e.target.value);
                    setErrors((p: Errors) => ({ ...p, scriptsHead: undefined }));
                  }}
                />
                {errors.scriptsHead ? <div className="mt-2 text-xs text-red-200">{errors.scriptsHead}</div> : null}
                <div className="mt-2 text-xs opacity-70">مثال: [{'{'}"tag":"script","attrs":{'{'}"src":"..."{'}'}{'}'}]</div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Scripts قبل &lt;/body&gt; (JSON Array)</label>
                <textarea
                  className={
                    "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                    (errors.scriptsBody ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                  }
                  value={scriptsBodyText}
                  onChange={(e) => {
                    setScriptsBodyText(e.target.value);
                    setErrors((p: Errors) => ({ ...p, scriptsBody: undefined }));
                  }}
                />
                {errors.scriptsBody ? <div className="mt-2 text-xs text-red-200">{errors.scriptsBody}</div> : null}
              </div>
            </div>

            <div className="pt-2">
              <Button variant="primary" onClick={onSave} disabled={!canSave} isLoading={actions.updateSettings.isPending}>
                حفظ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



