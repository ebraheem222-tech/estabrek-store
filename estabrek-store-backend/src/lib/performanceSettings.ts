/**
 * PerformanceSettings: one saved document in parts, edited from the
 * admin and kept with the latest 30 versions (one history for all of them):
 *   cache       the cache layers (lib/cacheConfig.ts)        — السرعة والكاش
 *   storefront  how the shop moves and loads (storefrontMotion.ts)
 *   media       image and video upload settings (mediaSettings.ts) — الوسائط
 *   traffic     request lanes and the slow-request monitor (traffic.ts) — مراقبة السرعة والأولوية
 *   jobs        background jobs paused or on another timer (jobs.ts) — المهام بالخلفية
 */
import { prisma } from "./prisma.js";
import { revalidateStorefront } from "./storefrontRevalidate.js";
import { applyCacheConfig, cacheChanges, mergeCacheConfig, type CacheConfig } from "./cacheConfig.js";
import { mergeStorefrontMotion, storefrontMotionChanges, type StorefrontMotion } from "./storefrontMotion.js";
import { applyMediaSettings, mediaSettingsChanges, mergeMediaSettings, type MediaSettings } from "./mediaSettings.js";
import { applyTrafficConfig, mergeTrafficConfig, trafficChanges, type TrafficConfig } from "./traffic.js";
import { applyJobsConfig, jobsChanges, mergeJobsConfig, type JobsConfig } from "./jobs.js";

export const KEEP_REVISIONS = 30;

export type PerformanceParts = { cache: CacheConfig; storefront: StorefrontMotion; media: MediaSettings; traffic: TrafficConfig; jobs: JobsConfig };

export async function readPerformance() {
  const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
  const data = row?.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
  return { row, data, ...partsOf(data) };
}

export function partsOf(data: Record<string, unknown>): PerformanceParts {
  return {
    cache: mergeCacheConfig(data.cache),
    storefront: mergeStorefrontMotion(data.storefront),
    media: mergeMediaSettings(data.media),
    traffic: mergeTrafficConfig(data.traffic),
    jobs: mergeJobsConfig(data.jobs),
  };
}

/** Saves any of the parts (the others stay); keeps the version before. Returns what changed. */
export async function savePerformance(req: any, next: Partial<PerformanceParts>) {
  const { data, ...before } = await readPerformance();
  const after: PerformanceParts = {
    cache: next.cache ?? before.cache,
    storefront: next.storefront ?? before.storefront,
    media: next.media ?? before.media,
    traffic: next.traffic ?? before.traffic,
    jobs: next.jobs ?? before.jobs,
  };
  const motionChanged = storefrontMotionChanges(before.storefront, after.storefront);
  const changed = [
    ...cacheChanges(before.cache, after.cache),
    ...motionChanged,
    ...mediaSettingsChanges(before.media, after.media),
    ...trafficChanges(before.traffic, after.traffic),
    ...jobsChanges(before.jobs, after.jobs),
  ];
  if (!changed.length) return { ...before, changed };
  const adminUserId = req.user?.bypass ? null : req.access?.adminId ?? null;
  const nextData = { ...data, ...after };
  await prisma.$transaction([
    prisma.performanceSettingsRevision.create({ data: { data: data as any, changed, adminUserId } }),
    prisma.performanceSettings.upsert({
      where: { id: "default" },
      create: { id: "default", data: nextData as any, updatedById: adminUserId },
      update: { data: nextData as any, updatedById: adminUserId },
    }),
  ]);
  const old = await prisma.performanceSettingsRevision.findMany({ orderBy: { createdAt: "desc" }, skip: KEEP_REVISIONS, select: { id: true } });
  if (old.length) await prisma.performanceSettingsRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  applyCacheConfig(after.cache);
  applyMediaSettings(after.media);
  applyTrafficConfig(after.traffic);
  applyJobsConfig(after.jobs);
  // The shop reads the motion settings with its public settings (its own cache is refreshed too).
  if (motionChanged.length) void revalidateStorefront({ tags: ["settings", "cms:bootstrap"] }).catch(() => undefined);
  return { ...after, changed };
}
