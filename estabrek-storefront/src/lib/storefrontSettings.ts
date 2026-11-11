import { COLOUR_STRENGTHS, SCENE_COLOUR_KEYS, type ColourStrength, type SceneColourKey } from "./colourEngine";
type SeasonalThemeMode = "auto" | "none" | "winter" | "ramadan" | "eid" | "black-friday" | "summer";
type LiveChatPosition = "bottom-left" | "bottom-right" | "bottom-center";
type ChatbotPosition = "bottom-left" | "bottom-right" | "bottom-center";
type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";
/** Where a colour the shopper picks shows: the whole store (bar, header, page, footer) or a product page's product area only. */
export type ColorFollow = "everything" | "product";

export type StorefrontSettings = {
  // Seasonal Effects
  seasonalEffectsEnabled: boolean;
  seasonalTheme: SeasonalThemeMode;
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
  liveChatPosition: LiveChatPosition;
  liveChatWelcomeMessage: string;
  liveChatOfflineMessage: string;
  chatbotEnabled: boolean;
  chatbotPosition: ChatbotPosition;
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
  accessibilityToolsEnabled: boolean;

  // Notifications
  toastNotificationsEnabled: boolean;
  toastPosition: ToastPosition;
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
  colorFollow: ColorFollow;
  /** Which scenes dress the page in their colour while they hold the screen (lib/colourEngine.ts). */
  colorScenes: Record<SceneColourKey, boolean>;
  /** How strongly a colour tints the page's surfaces. */
  colorStrength: ColourStrength;
  /** The store's secret: holding the logo down opens a hidden coupon (RoseSecret). */
  secretEnabled: boolean;
  secretCode: string;
  secretText: string;
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

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  // Seasonal Effects
  seasonalEffectsEnabled: true,
  seasonalTheme: "auto",
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
  liveChatPosition: "bottom-left",
  liveChatWelcomeMessage: "مرحباً! كيف يمكنني مساعدتك؟",
  liveChatOfflineMessage: "نحن غير متصلين حالياً",
  chatbotEnabled: true,
  chatbotPosition: "bottom-left",
  chatbotDraggable: false,
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
  allowManualCheckoutWithPayments: false,

  // Navigation
  mobileBottomNavEnabled: true,
  scrollToTopEnabled: true,
  breadcrumbsEnabled: true,
  stickyHeaderEnabled: true,
  scrollProgressEnabled: true,
  accessibilityToolsEnabled: true,

  // Notifications
  toastNotificationsEnabled: true,
  toastPosition: "top-right",
  toastThemeId: "default",
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

  // Theme & Colors
  themeColorsEnabled: true,
  colorFollow: "everything",
  colorScenes: Object.fromEntries(SCENE_COLOUR_KEYS.map((key) => [key, true])) as Record<SceneColourKey, boolean>,
  colorStrength: "normal",
  secretEnabled: true,
  secretCode: "",
  secretText: "",
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

const seasonalThemes = ["auto", "none", "winter", "ramadan", "eid", "black-friday", "summer"] as const;
const liveChatPositions = ["bottom-left", "bottom-right", "bottom-center"] as const;
const chatbotPositions = ["bottom-left", "bottom-right", "bottom-center"] as const;
const toastPositions = ["top-right", "top-left", "bottom-right", "bottom-left"] as const;
const colorFollows = ["everything", "product"] as const;
const enumKeys = new Set(["seasonalTheme", "liveChatPosition", "chatbotPosition", "toastPosition", "colorFollow", "colorStrength"]);

const boolKeys = Object.entries(DEFAULT_STOREFRONT_SETTINGS)
  .filter(([, value]) => typeof value === "boolean")
  .map(([key]) => key);
const numberKeys = Object.entries(DEFAULT_STOREFRONT_SETTINGS)
  .filter(([, value]) => typeof value === "number")
  .map(([key]) => key);
const stringKeys = Object.entries(DEFAULT_STOREFRONT_SETTINGS)
  .filter(([key, value]) => typeof value === "string" && !enumKeys.has(key))
  .map(([key]) => key);

const parseMaybeJson = (value: unknown) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const toBool = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 0 ? false : value === 1 ? true : fallback;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return fallback;
};

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T) => {
  if (typeof value !== "string") return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
};

export function normalizeStorefrontSettings(
  input: unknown,
  base: StorefrontSettings = DEFAULT_STOREFRONT_SETTINGS
): StorefrontSettings {
  const parsed = parseMaybeJson(input);
  const raw = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const next: StorefrontSettings = { ...base };

  for (const key of boolKeys) {
    (next as any)[key] = toBool(raw[key], (base as any)[key]);
  }
  for (const key of numberKeys) {
    (next as any)[key] = toNumber(raw[key], (base as any)[key]);
  }
  for (const key of stringKeys) {
    const value = raw[key];
    (next as any)[key] = typeof value === "string" ? value : (base as any)[key];
  }

  next.seasonalTheme = toEnum(raw.seasonalTheme, seasonalThemes, base.seasonalTheme);
  next.liveChatPosition = toEnum(raw.liveChatPosition, liveChatPositions, base.liveChatPosition);
  next.chatbotPosition = toEnum(raw.chatbotPosition, chatbotPositions, base.chatbotPosition);
  next.toastPosition = toEnum(raw.toastPosition, toastPositions, base.toastPosition);
  next.colorFollow = toEnum(raw.colorFollow, colorFollows, base.colorFollow);
  next.colorStrength = toEnum(raw.colorStrength, COLOUR_STRENGTHS, base.colorStrength);
  const scenes = raw.colorScenes && typeof raw.colorScenes === "object" ? (raw.colorScenes as Record<string, unknown>) : {};
  next.colorScenes = Object.fromEntries(SCENE_COLOUR_KEYS.map((key) => [key, typeof scenes[key] === "boolean" ? (scenes[key] as boolean) : base.colorScenes[key]])) as Record<SceneColourKey, boolean>;

  return next;
}
