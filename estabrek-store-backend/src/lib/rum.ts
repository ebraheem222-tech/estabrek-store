/**
 * How fast the shop really is for shoppers (Real User Monitoring): each page view
 * sends one small report (estabrek-storefront/src/components/WebVitalsReporter.tsx)
 * with the page kind, the device, the system and its numbers:
 *
 *   lcp   largest picture/text shown (ms)          good ≤ 2500, poor > 4000
 *   inp   answer to a tap or click (ms)            good ≤ 200,  poor > 500
 *   cls   how much the page jumped (score)         good ≤ 0.1,  poor > 0.25
 *   fcp   first thing shown (ms)                   good ≤ 1800, poor > 3000
 *   ttfb  first byte from the server (ms)          good ≤ 800,  poor > 1800
 *   scrollFps   frames a second while scrolling    good ≥ 55,   poor < 30
 *   slowFrames  % of frames that came late         good ≤ 5,    poor > 15
 *   sceneFps    frames a second of the 3D scenes   good ≥ 50,   poor < 30
 *
 * Nothing about the shopper is sent or kept: no address, no browser string, no
 * cookie. Reports add up in memory per store day, page, device and system, as
 * counts per bucket (a histogram), and go to the database every minute
 * (RumDaily, 90 days). Percentiles come from the buckets: "75% of visits had
 * LCP under X" (for fps: "75% of visits scrolled at X fps or more").
 */
import { z } from "zod";
import { prisma } from "./prisma.js";
import { isBot, storeDay } from "./popularity.js";

const MS = [100, 200, 300, 500, 800, 1000, 1500, 1800, 2000, 2500, 3000, 4000, 5000, 7000, 10_000, Infinity];
const FPS = [10, 20, 24, 30, 40, 45, 50, 55, 60, 75, 90, 100, 110, 120, 144, Infinity];

export const RUM_METRICS = {
  lcp: { better: "lower", edges: MS, good: 2500, poor: 4000, max: 120_000 },
  inp: { better: "lower", edges: MS, good: 200, poor: 500, max: 60_000 },
  cls: { better: "lower", edges: [0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 1, Infinity], good: 0.1, poor: 0.25, max: 10 },
  fcp: { better: "lower", edges: MS, good: 1800, poor: 3000, max: 120_000 },
  ttfb: { better: "lower", edges: MS, good: 800, poor: 1800, max: 120_000 },
  scrollFps: { better: "higher", edges: FPS, good: 55, poor: 30, max: 500 },
  slowFrames: { better: "lower", edges: [1, 2, 5, 10, 15, 20, 30, 50, 75, Infinity], good: 5, poor: 15, max: 100 },
  sceneFps: { better: "higher", edges: FPS, good: 50, poor: 30, max: 500 },
} as const;

export type RumMetric = keyof typeof RUM_METRICS;
export const RUM_METRIC_NAMES = Object.keys(RUM_METRICS) as RumMetric[];
export const RUM_PAGES = ["home", "shop", "product", "category", "search", "cart", "checkout", "account", "order", "page", "other"] as const;
export const RUM_DEVICES = ["phone", "tablet", "desktop"] as const;
export const RUM_OSES = ["android", "ios", "windows", "mac", "linux", "other"] as const;

const metricValue = (m: RumMetric) => z.number().finite().min(0).max(RUM_METRICS[m].max).optional();

export const RumRecordSchema = z.object({
  page: z.enum(RUM_PAGES),
  device: z.enum(RUM_DEVICES),
  os: z.enum(RUM_OSES),
  m: z.object(Object.fromEntries(RUM_METRIC_NAMES.map((k) => [k, metricValue(k)])) as Record<RumMetric, z.ZodOptional<z.ZodNumber>>).strict(),
});

export type RumRecord = z.infer<typeof RumRecordSchema>;
export const RumBodySchema = z.object({ r: z.array(RumRecordSchema).min(1).max(5) }).strict();

type Agg = { count: number; sum: number; buckets: number[] };

export function bucketOf(metric: RumMetric, value: number) {
  const edges = RUM_METRICS[metric].edges as readonly number[];
  return edges.findIndex((e) => value <= e);
}

function emptyAgg(metric: RumMetric): Agg {
  return { count: 0, sum: 0, buckets: RUM_METRICS[metric].edges.map(() => 0) };
}

function addInto(into: Agg, from: Agg) {
  into.count += from.count;
  into.sum += from.sum;
  from.buckets.forEach((v, i) => (into.buckets[i] = (into.buckets[i] ?? 0) + v));
}

/**
 * The value under which a share `q` of the visits fall (interpolated in its bucket).
 * For "higher is better" measures the 75%-experience is the 25th percentile.
 */
export function percentile(metric: RumMetric, agg: Agg, q: number) {
  if (!agg.count) return null;
  const edges = RUM_METRICS[metric].edges as readonly number[];
  const target = agg.count * q;
  let seen = 0;
  for (let i = 0; i < agg.buckets.length; i++) {
    const inBucket = agg.buckets[i] ?? 0;
    if (seen + inBucket >= target && inBucket > 0) {
      const lo = i === 0 ? 0 : edges[i - 1];
      const hi = edges[i] === Infinity ? lo * 1.5 : edges[i];
      return Math.round((lo + ((target - seen) / inBucket) * (hi - lo)) * 1000) / 1000;
    }
    seen += inBucket;
  }
  return edges[edges.length - 2];
}

/** The 75%-experience: p75 for "lower is better", p25 for "higher is better". */
export function experience(metric: RumMetric, agg: Agg) {
  return percentile(metric, agg, RUM_METRICS[metric].better === "lower" ? 0.75 : 0.25);
}

export function rating(metric: RumMetric, value: number | null): "good" | "okay" | "poor" | null {
  if (value == null) return null;
  const m = RUM_METRICS[metric];
  if (m.better === "lower") return value <= m.good ? "good" : value > m.poor ? "poor" : "okay";
  return value >= m.good ? "good" : value < m.poor ? "poor" : "okay";
}

/* ---------------- Collecting ---------------- */

const pending = new Map<string, Agg>();
const counters = { reports: 0, bots: 0 };
const keyOf = (day: string, r: Pick<RumRecord, "page" | "device" | "os">, metric: RumMetric) => `${day}|${r.page}|${r.device}|${r.os}|${metric}`;

export function noteRum(records: RumRecord[], who: { userAgent: string }, now = Date.now()) {
  if (isBot(who.userAgent)) {
    counters.bots += records.length;
    return 0;
  }
  const day = storeDay(now).toISOString().slice(0, 10);
  for (const r of records) {
    counters.reports += 1;
    for (const metric of RUM_METRIC_NAMES) {
      const v = r.m[metric];
      if (v == null || !Number.isFinite(v)) continue;
      const key = keyOf(day, r, metric);
      const agg = pending.get(key) ?? emptyAgg(metric);
      agg.count += 1;
      agg.sum += v;
      agg.buckets[bucketOf(metric, v)] += 1;
      pending.set(key, agg);
    }
  }
  return records.length;
}

let flushing: Promise<number> | null = null;
let lastPrune = "";

/** Adds what came in since the last time to the day's rows. */
export function flushRum(now = Date.now()): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    if (!pending.size) return 0;
    const batch = [...pending];
    pending.clear();
    let saved = 0;
    for (const [key, agg] of batch) {
      const [day, page, device, os, metric] = key.split("|");
      const id = { day: new Date(`${day}T00:00:00.000Z`), page, device, os, metric };
      try {
        const old = await prisma.rumDaily.findUnique({ where: { day_page_device_os_metric: id }, select: { buckets: true } });
        const buckets = agg.buckets.map((v, i) => v + (old?.buckets[i] ?? 0));
        await prisma.rumDaily.upsert({
          where: { day_page_device_os_metric: id },
          create: { ...id, count: agg.count, sum: agg.sum, buckets },
          update: { count: { increment: agg.count }, sum: { increment: agg.sum }, buckets },
        });
        saved += 1;
      } catch {
        // try again next time
        const back = pending.get(key) ?? emptyAgg(metric as RumMetric);
        addInto(back, agg);
        pending.set(key, back);
      }
    }
    const today = storeDay(now).toISOString().slice(0, 10);
    if (today !== lastPrune) {
      lastPrune = today;
      await prisma.rumDaily.deleteMany({ where: { day: { lt: new Date(storeDay(now).getTime() - 90 * 86400_000) } } }).catch(() => undefined);
    }
    return saved;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

// Saved every minute by a background job (src/jobs.ts: rumSave).

/** Shutting down: what came in since the last save. */
export async function stopRum() {
  await flushRum().catch(() => undefined);
}

/* ---------------- For the admin ---------------- */

type Row = { day: Date; page: string; device: string; os: string; metric: string; count: number; sum: number; buckets: number[] };

type Group = { page: string; device: string; os: string; metrics: Map<RumMetric, Agg>; recent: Map<RumMetric, Agg>; before: Map<RumMetric, Agg>; daily: Map<string, Map<RumMetric, Agg>> };

/** Visits per measure needed before a "getting worse" is said. */
const MIN_FOR_TREND = 20;

export async function rumReport(opts: { days: number; device?: string | null; os?: string | null; split?: "os" | "device" }, now = Date.now()) {
  await flushRum(now).catch(() => undefined);
  const today = storeDay(now);
  const chartDays = Math.max(14, opts.days);
  const since = new Date(today.getTime() - (chartDays - 1) * 86400_000);
  const windowStart = new Date(today.getTime() - (opts.days - 1) * 86400_000).toISOString().slice(0, 10);
  const recentStart = new Date(today.getTime() - 2 * 86400_000).toISOString().slice(0, 10);
  const beforeStart = new Date(today.getTime() - 9 * 86400_000).toISOString().slice(0, 10);
  const rows: Row[] = await prisma.rumDaily.findMany({
    where: { day: { gte: since }, ...(opts.device ? { device: opts.device } : {}), ...(opts.os ? { os: opts.os } : {}) },
  });
  const groups = new Map<string, Group>();
  const overall = new Map<RumMetric, Agg>();
  for (const r of rows) {
    const metric = r.metric as RumMetric;
    if (!RUM_METRICS[metric]) continue;
    const os = opts.split === "os" ? r.os : "all";
    const gk = `${r.page}|${r.device}|${os}`;
    let g = groups.get(gk);
    if (!g) {
      g = { page: r.page, device: r.device, os, metrics: new Map(), recent: new Map(), before: new Map(), daily: new Map() };
      groups.set(gk, g);
    }
    const day = r.day.toISOString().slice(0, 10);
    const agg: Agg = { count: r.count, sum: r.sum, buckets: r.buckets };
    const into = (m: Map<RumMetric, Agg>) => {
      const a = m.get(metric) ?? emptyAgg(metric);
      addInto(a, agg);
      m.set(metric, a);
    };
    if (day >= windowStart) {
      into(g.metrics);
      into(overall);
    }
    if (day >= recentStart) into(g.recent);
    else if (day >= beforeStart) into(g.before);
    const d = g.daily.get(day) ?? new Map<RumMetric, Agg>();
    const da = d.get(metric) ?? emptyAgg(metric);
    addInto(da, agg);
    d.set(metric, da);
    g.daily.set(day, d);
  }
  const dates = Array.from({ length: chartDays }, (_, i) => new Date(since.getTime() + i * 86400_000).toISOString().slice(0, 10));
  const summarize = (m: Map<RumMetric, Agg>) =>
    Object.fromEntries(
      RUM_METRIC_NAMES.filter((k) => m.get(k)?.count).map((k) => {
        const a = m.get(k)!;
        const v = experience(k, a);
        return [k, { value: v, rating: rating(k, v), count: a.count, avg: Math.round((a.sum / a.count) * 1000) / 1000 }];
      }),
    );
  const items = [...groups.values()]
    .map((g) => {
      const worse: RumMetric[] = [];
      for (const k of RUM_METRIC_NAMES) {
        const a = g.recent.get(k);
        const b = g.before.get(k);
        if (!a || !b || a.count < MIN_FOR_TREND || b.count < MIN_FOR_TREND) continue;
        const now_ = experience(k, a)!;
        const was = experience(k, b)!;
        if (RUM_METRICS[k].better === "lower" ? now_ > was * 1.15 : now_ < was * 0.85) worse.push(k);
      }
      const visits = Math.max(0, ...[...g.metrics.values()].map((a) => a.count));
      return {
        page: g.page,
        device: g.device,
        os: g.os,
        visits,
        metrics: summarize(g.metrics),
        worse,
        daily: dates.map((day) => {
          const d = g.daily.get(day);
          return {
            day,
            lcp: d?.get("lcp") ? experience("lcp", d.get("lcp")!) : null,
            inp: d?.get("inp") ? experience("inp", d.get("inp")!) : null,
            scrollFps: d?.get("scrollFps") ? experience("scrollFps", d.get("scrollFps")!) : null,
          };
        }),
      };
    })
    .filter((x) => x.visits > 0)
    .sort((a, b) => b.visits - a.visits);
  return {
    now,
    days: opts.days,
    overall: summarize(overall),
    items,
    collected: { ...counters, waiting: pending.size },
    thresholds: Object.fromEntries(RUM_METRIC_NAMES.map((k) => [k, { better: RUM_METRICS[k].better, good: RUM_METRICS[k].good, poor: RUM_METRICS[k].poor }])),
  };
}

/* ---------------- Tests ---------------- */

export function resetRumForTests() {
  pending.clear();
  counters.reports = 0;
  counters.bots = 0;
}

export function pendingRumForTests() {
  return new Map(pending);
}
