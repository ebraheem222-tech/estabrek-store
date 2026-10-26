/**
 * Cache settings, set from the admin (Performance → Cache) and saved in
 * PerformanceSettings.data.cache. Anything not set (or a broken saved value)
 * falls back to the defaults below, so the server always has a sane setup.
 *
 * Emergency switch: CACHE_ENABLED=false turns the cache off whatever is saved.
 *
 * Reading is synchronous (`cacheConfig()`), from a copy refreshed every 15
 * seconds, so the routes never wait on the database.
 */
import { z } from "zod";
import { prisma } from "./prisma.js";

/**
 * What a namespace's answers are built from. A database write to one of these
 * clears every namespace that depends on it (see lib/dbWrites.ts).
 */
export type CacheGroup = "catalog" | "cms" | "settings";

export const NAMESPACES = {
  settings: { groups: ["settings", "cms"] as CacheGroup[], label: "Store settings, menus and the shop's start data" },
  pages: { groups: ["cms"] as CacheGroup[], label: "Published pages" },
  categories: { groups: ["catalog"] as CacheGroup[], label: "Categories, sizes and product kinds" },
  products: { groups: ["catalog"] as CacheGroup[], label: "Product pages" },
  listings: { groups: ["catalog"] as CacheGroup[], label: "Product grids (shop, collections, new, best sellers)" },
  filters: { groups: ["catalog"] as CacheGroup[], label: "Filter choices and their counts" },
  sku: { groups: ["catalog"] as CacheGroup[], label: "Colours, sizes, stock and images of one product" },
  search: { groups: ["catalog"] as CacheGroup[], label: "Search results and suggestions" },
  misc: { groups: [] as CacheGroup[], label: "Everything else" },
} as const;

export type NamespaceName = keyof typeof NAMESPACES;
export const NAMESPACE_NAMES = Object.keys(NAMESPACES) as NamespaceName[];

export const POLICIES = ["smart", "lru", "fifo", "lfu"] as const;

/** Allowed range of every number, shared with the admin page. */
export const LIMITS = {
  memoryMb: { min: 8, max: 1024 },
  ttlSeconds: { min: 5, max: 86_400 },
  staleSeconds: { min: 0, max: 3_600 },
  browserSeconds: { min: 0, max: 3_600 },
  share: { min: 1, max: 100 },
  halfLifeHours: { min: 1, max: 720 },
  weight: { min: 0, max: 100 },
  maxTtlMultiplier: { min: 1, max: 12 },
  hotCount: { min: 0, max: 500 },
  warmCount: { min: 0, max: 200 },
} as const;

const n = (key: keyof typeof LIMITS) => z.coerce.number().int().min(LIMITS[key].min).max(LIMITS[key].max);

export const NamespaceSchema = z.object({
  enabled: z.boolean(),
  /** Fresh for this long; a write to its data clears it sooner. */
  ttlSeconds: n("ttlSeconds"),
  /** After that: still served for this long while one request fetches a fresh copy. */
  staleSeconds: n("staleSeconds"),
  /** Shoppers' browsers may keep it this long too (0 = no). */
  browserSeconds: n("browserSeconds"),
  policy: z.enum(POLICIES),
  /** Its part of the memory, relative to the others (they are added up). */
  share: n("share"),
});

export type NamespaceConfig = z.infer<typeof NamespaceSchema>;

/**
 * The smart part (lib/popularity.ts): every product gets a score from what
 * shoppers do with it (view, wishlist, bag, purchase, each with its weight)
 * that halves every halfLifeHours. The most popular product's pages stay cached
 * maxTtlMultiplier × their TTL, the others less (log scale); the top hotCount
 * (and the pinned ones) are kept when memory runs out and built in advance
 * (warmCount of them) after a change.
 */
export const PopularitySchema = z.object({
  enabled: z.boolean(),
  halfLifeHours: n("halfLifeHours"),
  weightView: n("weight"),
  weightWishlist: n("weight"),
  weightBag: n("weight"),
  weightPurchase: n("weight"),
  maxTtlMultiplier: n("maxTtlMultiplier"),
  hotCount: n("hotCount"),
  warmCount: n("warmCount"),
  /** Build the hot products' pages again a few seconds after a product or stock change. */
  warmOnChange: z.boolean(),
  /** Always treated as the most popular (product ids). */
  pinned: z.array(z.string().trim().min(1).max(64)).max(50),
});

export type PopularityConfig = z.infer<typeof PopularitySchema>;

export const CacheConfigSchema = z.object({
  enabled: z.boolean(),
  /** Memory for the whole cache on this server (L1). */
  memoryMb: n("memoryMb"),
  /** Also keep answers in Redis (L2), shared by every server. Needs REDIS_URL. */
  useRedis: z.boolean(),
  namespaces: z.object(
    Object.fromEntries(NAMESPACE_NAMES.map((k) => [k, NamespaceSchema])) as Record<NamespaceName, typeof NamespaceSchema>,
  ),
  popularity: PopularitySchema,
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

const ns = (ttlSeconds: number, staleSeconds: number, share: number, policy: NamespaceConfig["policy"] = "smart"): NamespaceConfig => ({
  enabled: true,
  ttlSeconds,
  staleSeconds,
  browserSeconds: 0,
  policy,
  share,
});

export function cacheDefaults(): CacheConfig {
  return {
    enabled: true,
    memoryMb: 64,
    useRedis: true,
    namespaces: {
      settings: ns(300, 60, 5),
      pages: ns(300, 60, 10),
      categories: ns(1800, 300, 5),
      products: ns(600, 120, 30),
      listings: ns(120, 60, 20),
      filters: ns(300, 60, 10),
      sku: ns(30, 10, 5),
      search: ns(60, 30, 10),
      misc: ns(60, 0, 5, "lru"),
    },
    popularity: popularityDefaults(),
  };
}

export function popularityDefaults(): PopularityConfig {
  return {
    enabled: true,
    halfLifeHours: 24,
    weightView: 1,
    weightWishlist: 3,
    weightBag: 5,
    weightPurchase: 10,
    maxTtlMultiplier: 4,
    hotCount: 50,
    warmCount: 20,
    warmOnChange: true,
    pinned: [],
  };
}

/**
 * Saved (possibly partial or old) data on top of the defaults. A part that
 * doesn't validate falls back to its default instead of breaking the server.
 */
export function mergeCacheConfig(saved: unknown, base: CacheConfig = cacheDefaults()): CacheConfig {
  const s = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const out: CacheConfig = { ...base, namespaces: { ...base.namespaces } };
  const top = CacheConfigSchema.pick({ enabled: true, memoryMb: true, useRedis: true }).partial().safeParse(s);
  if (top.success) Object.assign(out, top.data);
  const savedNs = s.namespaces && typeof s.namespaces === "object" ? (s.namespaces as Record<string, unknown>) : {};
  for (const name of NAMESPACE_NAMES) {
    const part = savedNs[name];
    if (!part || typeof part !== "object") continue;
    const ok = NamespaceSchema.safeParse({ ...base.namespaces[name], ...(part as object) });
    if (ok.success) out.namespaces[name] = ok.data;
  }
  if (s.popularity && typeof s.popularity === "object") {
    const ok = PopularitySchema.safeParse({ ...base.popularity, ...(s.popularity as object) });
    if (ok.success) out.popularity = { ...ok.data, pinned: [...new Set(ok.data.pinned)] };
  }
  return out;
}

/** "namespaces.products.ttlSeconds"-style names of what differs. */
export function cacheChanges(a: CacheConfig, b: CacheConfig): string[] {
  const out: string[] = [];
  for (const k of ["enabled", "memoryMb", "useRedis"] as const) if (a[k] !== b[k]) out.push(k);
  for (const name of NAMESPACE_NAMES) {
    const x = a.namespaces[name];
    const y = b.namespaces[name];
    for (const f of Object.keys(x) as Array<keyof NamespaceConfig>) if (x[f] !== y[f]) out.push(`namespaces.${name}.${f}`);
  }
  for (const f of Object.keys(a.popularity) as Array<keyof PopularityConfig>) {
    if (JSON.stringify(a.popularity[f]) !== JSON.stringify(b.popularity[f])) out.push(`popularity.${f}`);
  }
  return out;
}

/** Bytes each namespace may use: memoryMb split by the shares. */
export function namespaceBudgets(config: CacheConfig): Record<NamespaceName, number> {
  const total = config.memoryMb * 1024 * 1024;
  const sum = NAMESPACE_NAMES.reduce((s, k) => s + config.namespaces[k].share, 0) || 1;
  return Object.fromEntries(
    NAMESPACE_NAMES.map((k) => [k, Math.floor((total * config.namespaces[k].share) / sum)]),
  ) as Record<NamespaceName, number>;
}

export const cacheEnvDisabled = () => process.env.CACHE_ENABLED === "false";

let current: CacheConfig = cacheDefaults();
let loadedAt = 0;
let loading: Promise<void> | null = null;
const REFRESH_MS = 15_000;
const listeners = new Set<(c: CacheConfig) => void>();

/** The settings in force now. Never waits: refreshes in the background when stale. */
export function cacheConfig(): CacheConfig {
  if (Date.now() - loadedAt > REFRESH_MS && !loading) void loadCacheConfig();
  return current;
}

/** Told about every change (the stores resize, change rule, or empty). */
export function onCacheConfig(fn: (c: CacheConfig) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setCurrent(next: CacheConfig) {
  const changed = JSON.stringify(next) !== JSON.stringify(current);
  current = next;
  loadedAt = Date.now();
  if (changed) for (const fn of listeners) fn(next);
}

export function loadCacheConfig(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
      const data = row?.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
      setCurrent(mergeCacheConfig(data.cache));
    } catch {
      // Database unreachable (or not migrated yet): keep what we have, try again later.
      loadedAt = Date.now();
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** After a save from the admin: in force at once on this server. */
export function applyCacheConfig(next: CacheConfig) {
  setCurrent(next);
}
