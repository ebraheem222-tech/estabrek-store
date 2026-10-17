// Speed & cache (admin → السرعة والكاش): the shop's cache layers, live numbers and settings.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { PolicyRevision } from "./system.api";

export type CacheNamespaceName = "settings" | "pages" | "categories" | "products" | "listings" | "filters" | "sku" | "search" | "misc";
export type CachePolicy = "smart" | "lru" | "fifo" | "lfu";
export type CacheGroup = "catalog" | "cms" | "settings";

export type CacheNamespaceConfig = {
  enabled: boolean;
  ttlSeconds: number;
  staleSeconds: number;
  browserSeconds: number;
  policy: CachePolicy;
  share: number;
};

export type PopularityConfig = {
  enabled: boolean;
  halfLifeHours: number;
  weightView: number;
  weightWishlist: number;
  weightBag: number;
  weightPurchase: number;
  maxTtlMultiplier: number;
  hotCount: number;
  warmCount: number;
  warmOnChange: boolean;
  /** Product ids always treated as the most popular. */
  pinned: string[];
};

export type MotionSection = "hero" | "opening" | "study" | "seasons" | "collections" | "campaign";

/** How the shop moves and loads (admin → الحركة والتحميل). */
export type StorefrontMotion = {
  sections: Record<MotionSection, { on: boolean; smoothMs: number }>;
  keyframeSnap: boolean;
  maxStepMs: number;
  maxFps: 30 | 45 | 60 | 90 | 120;
  adaptive: boolean;
  liteMemoryGb: number;
  liteOnSaveData: boolean;
  phoneGlass: boolean;
  desktopDpr: number;
  phoneDpr: number;
  lazyPercent: number;
  prebuild3d: boolean;
  prebuildAfterMs: number;
  videoPreload: "auto" | "metadata" | "none";
  /** Page views that report their speed (مراقبة السرعة → تجربة الزباين), in %. */
  rumPercent: number;
};

export type MotionLimits = Record<"smoothMs" | "maxStepMs" | "liteMemoryGb" | "dpr" | "lazyPercent" | "prebuildAfterMs" | "rumPercent", { min: number; max: number }>;

export type CacheConfig = {
  enabled: boolean;
  memoryMb: number;
  useRedis: boolean;
  namespaces: Record<CacheNamespaceName, CacheNamespaceConfig>;
  popularity: PopularityConfig;
};

export type CacheLimits = Record<
  "memoryMb" | "ttlSeconds" | "staleSeconds" | "browserSeconds" | "share" | "halfLifeHours" | "weight" | "maxTtlMultiplier" | "hotCount" | "warmCount",
  { min: number; max: number }
>;

export type CacheNamespaceLive = {
  name: CacheNamespaceName;
  groups: CacheGroup[];
  on: boolean;
  policy: CachePolicy;
  entries: number;
  protectedEntries: number;
  bytes: number;
  limitBytes: number;
  hits: number;
  staleHits: number;
  l2Hits: number;
  l2Errors: number;
  misses: number;
  hitRatio: number | null;
  writes: number;
  tooBig: number;
  loads: number;
  avgLoadMs: number;
  savedMs: number;
  evictions: { size: number; expired: number; invalidated: number; manual: number };
};

export type CacheLive = {
  now: number;
  enabled: boolean;
  envDisabled: boolean;
  startedAt: string;
  uptimeSeconds: number;
  redis: { configured: boolean; status: string; inUse: boolean };
  memory: { usedBytes: number; limitBytes: number; rssBytes: number; heapUsedBytes: number };
  totals: { hits: number; misses: number; hitRatio: number | null; savedMs: number; entries: number; evictions: number };
  namespaces: CacheNamespaceLive[];
  history: Array<{ t: number; hits: number; misses: number }>;
  top: Array<{
    ns: CacheNamespaceName;
    key: string;
    hits: number;
    bytes: number;
    ageSeconds: number;
    freshForSeconds: number | null;
    costMs: number;
    status: number | null;
    subject: string | null;
    priority: number;
  }>;
  nextChange: { catalog: string | null; cms: string | null };
  lastWriteAt: Record<CacheGroup, string | null>;
  popularity: {
    enabled: boolean;
    tracked: number;
    hot: number;
    pinned: number;
    topScore: number;
    waiting: number;
    counted: number;
    purchases: number;
    ignored: { bots: number; repeats: number; unknown: number };
    flushErrors: number;
    lastFlushAt: string | null;
    lastLoadAt: string | null;
    halfLifeHours: number;
  };
  warm?: { last: WarmResult | null; running: boolean; scheduled: boolean; warmers: string[] };
};

export type WarmResult = { at: string; reason: string; products: number; built: number; skipped: number; errors: number; ms: number };

export type DayCounts = { views: number; wishlists: number; bags: number; purchases: number };

export type PopularItem = {
  productId: string;
  title: string;
  slug: string;
  isActive: boolean;
  imageUrl: string | null;
  score: number;
  /** 0 … 1 (the most popular now). */
  heat: number;
  ttlMultiplier: number;
  /** 0 ordinary, 1 popular, 2 pinned. */
  priority: number;
  window: DayCounts;
  total: DayCounts;
  lastSignalAt: string | null;
  daily: Array<DayCounts & { day: string }>;
};

export type PopularReport = {
  now: number;
  days: number;
  timeZone: string;
  items: PopularItem[];
  store: Array<DayCounts & { day: string }>;
};

export type CachePage = {
  config: CacheConfig;
  defaults: CacheConfig;
  limits: CacheLimits;
  policies: CachePolicy[];
  groups: Record<CacheNamespaceName, CacheGroup[]>;
  envDisabled: boolean;
  storefront: StorefrontMotion;
  storefrontDefaults: StorefrontMotion;
  motionLimits: MotionLimits;
  fpsChoices: number[];
  motionSections: MotionSection[];
  updatedAt: string | null;
  live: CacheLive;
  revisions: PolicyRevision[];
};

export type CachePatch = Partial<Omit<CacheConfig, "namespaces" | "popularity">> & {
  namespaces?: Partial<Record<CacheNamespaceName, Partial<CacheNamespaceConfig>>>;
  popularity?: Partial<PopularityConfig>;
  storefront?: Partial<Omit<StorefrontMotion, "sections">> & {
    sections?: Partial<Record<MotionSection, Partial<StorefrontMotion["sections"][MotionSection]>>>;
  };
};

export async function getCachePage() {
  const res = await api.get(ENDPOINTS.admin.systemCache.base);
  return res.data as CachePage;
}

export async function getCacheLive() {
  const res = await api.get(ENDPOINTS.admin.systemCache.live);
  return res.data as CacheLive;
}

export async function saveCacheConfig(patch: CachePatch) {
  const res = await api.patch(ENDPOINTS.admin.systemCache.base, patch);
  return res.data as { config: CacheConfig; storefront: StorefrontMotion; changed: string[] };
}

export async function resetCacheConfig() {
  const res = await api.post(ENDPOINTS.admin.systemCache.reset, {});
  return res.data as { config: CacheConfig; changed: string[] };
}

export async function restoreCacheConfig(id: string) {
  const res = await api.post(ENDPOINTS.admin.systemCache.restore(id), {});
  return res.data as { config: CacheConfig; changed: string[] };
}

export async function getPopular(params: { days?: number; limit?: number } = {}) {
  const res = await api.get(ENDPOINTS.admin.systemCache.popular, { params });
  return res.data as PopularReport;
}

/** Builds the popular products' pages now. */
export async function warmCache() {
  const res = await api.post(ENDPOINTS.admin.systemCache.warm, {});
  return res.data as WarmResult;
}

/** Empties one namespace, or everything when none is given. */
export async function purgeCache(namespace?: CacheNamespaceName) {
  const res = await api.post(ENDPOINTS.admin.systemCache.purge, namespace ? { namespace } : {});
  return res.data as { ok: true; namespace: CacheNamespaceName | null; cleared: number };
}
