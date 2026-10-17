import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { NotFound } from "../../utils/httpError.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { KEEP_REVISIONS as KEEP, partsOf, readPerformance, savePerformance } from "../../lib/performanceSettings.js";
import { cacheSnapshot, purgeCache } from "../../lib/cache.js";
import { warmNow, warmStatus } from "../../lib/cacheWarm.js";
import { STORE_TIMEZONE, flushPopularity, heatOf, priorityOf, rankedProducts, storeDay, ttlMultiplier } from "../../lib/popularity.js";
import {
  FPS_CHOICES,
  MOTION_LIMITS,
  MOTION_SECTIONS,
  MotionSectionSchema,
  StorefrontMotionSchema,
  storefrontMotionDefaults,
  type StorefrontMotion,
} from "../../lib/storefrontMotion.js";
import {
  CacheConfigSchema,
  LIMITS,
  NAMESPACES,
  NAMESPACE_NAMES,
  NamespaceSchema,
  POLICIES,
  PopularitySchema,
  cacheDefaults,
  cacheEnvDisabled,
  type CacheConfig,
  type NamespaceName,
} from "../../lib/cacheConfig.js";

/**
 * /v1/admin/system/cache — the cache page (Performance → Cache): live numbers,
 * the settings (memory, rule, TTL per namespace) and emptying.
 * Reading needs system:read, changes need system:write (see admin.routes.ts).
 * Every change keeps the previous settings (latest 30) and is in the activity log.
 */
const r = Router();


/** The shop's own cache (Next.js) tags each namespace's pages carry. */
export const STOREFRONT_TAGS: Record<NamespaceName, string[]> = {
  settings: ["cms:bootstrap"],
  pages: ["cms:pages"],
  categories: ["catalog:categories"],
  products: ["catalog:products"],
  listings: ["catalog:products"],
  filters: ["catalog:products"],
  sku: ["catalog:products"],
  search: ["catalog:products"],
  misc: [],
};

async function savedRow() {
  const { row, data, cache, storefront } = await readPerformance();
  return { row, data, config: cache, storefront };
}

/** Saves the cache settings and/or the shop's motion settings (one history, lib/performanceSettings.ts). */
async function save(req: any, parts: { cache?: CacheConfig; storefront?: StorefrontMotion }) {
  const out = await savePerformance(req, parts);
  return { config: out.cache, storefront: out.storefront, changed: out.changed };
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [{ row, config, storefront }, revisions] = await Promise.all([
      savedRow(),
      prisma.performanceSettingsRevision.findMany({
        orderBy: { createdAt: "desc" },
        take: KEEP,
        select: { id: true, changed: true, adminUserId: true, createdAt: true },
      }),
    ]);
    const adminIds = [...new Set(revisions.map((x) => x.adminUserId).filter(Boolean) as string[])];
    const names = adminIds.length ? await prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } }) : [];
    const nameOf = new Map(names.map((x) => [x.id, x.name]));
    res.json({
      config,
      defaults: cacheDefaults(),
      limits: LIMITS,
      policies: POLICIES,
      groups: Object.fromEntries(NAMESPACE_NAMES.map((n) => [n, NAMESPACES[n].groups])),
      envDisabled: cacheEnvDisabled(),
      storefront,
      storefrontDefaults: storefrontMotionDefaults(),
      motionLimits: MOTION_LIMITS,
      fpsChoices: FPS_CHOICES,
      motionSections: MOTION_SECTIONS,
      updatedAt: row?.updatedAt ?? null,
      live: { ...cacheSnapshot(), warm: warmStatus() },
      revisions: revisions.map((x) => ({ ...x, adminName: x.adminUserId ? nameOf.get(x.adminUserId) ?? null : null })),
    });
  }),
);

/** Only the live numbers (the page refreshes them every few seconds). */
r.get(
  "/live",
  asyncHandler(async (_req, res) => {
    res.json({ ...cacheSnapshot(), warm: warmStatus() });
  }),
);

const PopularQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  days: z.coerce.number().int().min(1).max(90).default(7),
});

type DayCounts = { views: number; wishlists: number; bags: number; purchases: number };
const zero = (): DayCounts => ({ views: 0, wishlists: 0, bags: 0, purchases: 0 });
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The most popular products right now: score, how hot (0–1), how long their
 * pages stay cached (× TTL), counts in the last `days` days and per day (14).
 */
r.get(
  "/popular",
  asyncHandler(async (req, res) => {
    const { limit, days } = PopularQuery.parse(req.query ?? {});
    await flushPopularity();
    const now = Date.now();
    const ranked = rankedProducts(limit, now);
    const ids = ranked.map((x) => x.id);
    const chartDays = Math.max(14, days);
    const today = storeDay(now);
    const since = new Date(today.getTime() - (chartDays - 1) * 86400_000);
    const windowStart = new Date(today.getTime() - (days - 1) * 86400_000);
    const [products, totals, dayRows, storeDays] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          title: true,
          slug: true,
          isActive: true,
          items: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1, select: { url: true } } },
          },
        },
      }),
      prisma.productPopularity.findMany({ where: { productId: { in: ids } } }),
      prisma.productPopularityDay.findMany({ where: { productId: { in: ids }, day: { gte: since } } }),
      prisma.productPopularityDay.groupBy({
        by: ["day"],
        where: { day: { gte: since } },
        _sum: { views: true, wishlists: true, bags: true, purchases: true },
      }),
    ]);
    const productOf = new Map(products.map((p) => [p.id, p]));
    const totalOf = new Map(totals.map((t) => [t.productId, t]));
    const dates = Array.from({ length: chartDays }, (_, i) => ymd(new Date(since.getTime() + i * 86400_000)));
    const perProduct = new Map<string, Map<string, DayCounts>>();
    for (const row of dayRows) {
      const m = perProduct.get(row.productId) ?? new Map<string, DayCounts>();
      m.set(ymd(row.day), { views: row.views, wishlists: row.wishlists, bags: row.bags, purchases: row.purchases });
      perProduct.set(row.productId, m);
    }
    const storeByDay = new Map(
      storeDays.map((d) => [
        ymd(d.day),
        { views: d._sum.views ?? 0, wishlists: d._sum.wishlists ?? 0, bags: d._sum.bags ?? 0, purchases: d._sum.purchases ?? 0 },
      ]),
    );
    const items = ranked
      .filter((x) => productOf.has(x.id))
      .map((x) => {
        const p = productOf.get(x.id)!;
        const byDay = perProduct.get(x.id) ?? new Map<string, DayCounts>();
        const window = zero();
        for (const [d, c] of byDay) {
          if (d < ymd(windowStart)) continue;
          window.views += c.views;
          window.wishlists += c.wishlists;
          window.bags += c.bags;
          window.purchases += c.purchases;
        }
        const t = totalOf.get(x.id);
        return {
          productId: x.id,
          title: p.title,
          slug: p.slug,
          isActive: p.isActive,
          imageUrl: p.items[0]?.images[0]?.url ?? null,
          score: Math.round(x.score * 10) / 10,
          heat: Math.round(heatOf(x.id, now) * 1000) / 1000,
          ttlMultiplier: Math.round(ttlMultiplier(x.id, now) * 100) / 100,
          priority: priorityOf(x.id),
          window,
          total: t ? { views: t.views, wishlists: t.wishlists, bags: t.bags, purchases: t.purchases } : zero(),
          lastSignalAt: t?.lastSignalAt ?? null,
          daily: dates.map((d) => ({ day: d, ...(byDay.get(d) ?? zero()) })),
        };
      });
    res.json({
      now,
      days,
      timeZone: STORE_TIMEZONE,
      items,
      store: dates.map((d) => ({ day: d, ...(storeByDay.get(d) ?? zero()) })),
    });
  }),
);

/** Builds the popular products' pages now. */
r.post(
  "/warm",
  asyncHandler(async (_req, res) => {
    res.json(await warmNow("admin"));
  }),
);

/** Change some settings, e.g. { memoryMb: 128, namespaces: { products: { ttlSeconds: 900 } } }. */
const PatchBody = z
  .object({
    enabled: z.boolean().optional(),
    memoryMb: z.unknown().optional(),
    useRedis: z.boolean().optional(),
    popularity: PopularitySchema.partial().strict().optional(),
    storefront: StorefrontMotionSchema.omit({ sections: true })
      .partial()
      .extend({
        sections: z
          .object(Object.fromEntries(MOTION_SECTIONS.map((k) => [k, MotionSectionSchema.partial().strict().optional()])) as Record<string, z.ZodTypeAny>)
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    namespaces: z
      .object(Object.fromEntries(NAMESPACE_NAMES.map((k) => [k, NamespaceSchema.partial().strict().optional()])) as Record<string, z.ZodTypeAny>)
      .strict()
      .optional(),
  })
  .strict();

r.patch(
  "/",
  asyncHandler(async (req, res) => {
    const body = PatchBody.parse(req.body ?? {}) as Partial<Omit<CacheConfig, "popularity">> & {
      namespaces?: Partial<Record<NamespaceName, object>>;
      popularity?: object;
      storefront?: Record<string, unknown> & { sections?: Record<string, object | undefined> };
    };
    const { config: current, storefront: currentMotion } = await savedRow();
    const draft = {
      ...current,
      ...("enabled" in body ? { enabled: body.enabled } : {}),
      ...("memoryMb" in body ? { memoryMb: body.memoryMb } : {}),
      ...("useRedis" in body ? { useRedis: body.useRedis } : {}),
      popularity: { ...current.popularity, ...(body.popularity ?? {}) },
      namespaces: Object.fromEntries(
        NAMESPACE_NAMES.map((n) => [n, { ...current.namespaces[n], ...(body.namespaces?.[n] ?? {}) }]),
      ),
    };
    const next = CacheConfigSchema.parse(draft); // 400 with the field that's out of range
    let nextMotion: StorefrontMotion | undefined;
    if (body.storefront) {
      const { sections, ...top } = body.storefront;
      nextMotion = StorefrontMotionSchema.parse({
        ...currentMotion,
        ...top,
        sections: Object.fromEntries(MOTION_SECTIONS.map((s) => [s, { ...currentMotion.sections[s], ...(sections?.[s] ?? {}) }])),
      });
    }
    res.json(await save(req, { cache: next, storefront: nextMotion }));
  }),
);

r.post(
  "/reset",
  asyncHandler(async (req, res) => {
    res.json(await save(req, { cache: cacheDefaults(), storefront: storefrontMotionDefaults() }));
  }),
);

r.post(
  "/revisions/:id/restore",
  asyncHandler(async (req, res) => {
    const rev = await prisma.performanceSettingsRevision.findUnique({ where: { id: String(req.params.id) } });
    if (!rev) throw NotFound("This version no longer exists");
    const data = rev.data && typeof rev.data === "object" ? (rev.data as Record<string, unknown>) : {};
    // The history is shared: going back restores every part as it was (cache, motion, uploads, lanes).
    const out = await savePerformance(req, partsOf(data));
    res.json({ config: out.cache, storefront: out.storefront, changed: out.changed });
  }),
);

const PurgeBody = z.object({ namespace: z.enum(NAMESPACE_NAMES as [NamespaceName, ...NamespaceName[]]).optional() }).strict();

/** Empties one namespace (or everything) here and on the other servers, and the shop's pages. */
r.post(
  "/purge",
  asyncHandler(async (req, res) => {
    const { namespace } = PurgeBody.parse(req.body ?? {});
    const cleared = purgeCache(namespace);
    const tags = namespace ? STOREFRONT_TAGS[namespace] : ["cms", "catalog"];
    if (tags.length) void revalidateStorefront({ tags }).catch(() => undefined);
    res.json({ ok: true, namespace: namespace ?? null, cleared });
  }),
);

export default r;
