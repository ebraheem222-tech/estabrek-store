/**
 * How popular each product is right now, from what shoppers do with it:
 *
 *     score ← score · 2^(−Δt / half-life) + weight      (view 1, wishlist 3, bag 5, purchase 10)
 *
 * so a product people looked at yesterday counts half as much as one they look
 * at today. The cache (lib/cache.ts) uses it:
 *   - TTL × multiplier: the most popular product gets maxTtlMultiplier × its TTL,
 *     the others in between on a log scale  1 + (max − 1) · log(1 + s) / log(1 + s_top);
 *   - the top hotCount products (and the pinned ones) leave memory last;
 *   - their pages are built in advance after a change (lib/cacheWarm.ts).
 *
 * Privacy: no shopper is stored. Signals only count per product; the same
 * visitor repeating an action (a refresh, opening the bag twice) is counted once
 * per window using a hash of IP + browser kept in memory only. Bots are ignored.
 *
 * Signals add up in memory and go to the database every 30 seconds
 * (ProductPopularity: the score; ProductPopularityDay: counts per day, for the
 * admin's charts). Each server reloads the top scores every 5 minutes, so with
 * several servers they all end up with the same picture.
 */
import { createHash } from "node:crypto";
import { prisma } from "./prisma.js";
import { cacheConfig, onCacheConfig, type PopularityConfig } from "./cacheConfig.js";

export type SignalKind = "view" | "wishlist" | "bag" | "purchase";
export type ShopperSignal = { kind: Exclude<SignalKind, "purchase">; productId?: string; variantId?: string };

type Counts = { views: number; wishlists: number; bags: number; purchases: number };
type Live = { score: number; at: number };
type Pending = Live & Counts;

const COUNT_FIELD: Record<SignalKind, keyof Counts> = { view: "views", wishlist: "wishlists", bag: "bags", purchase: "purchases" };
/** The same visitor doing the same thing again within this window counts once. */
const REPEAT_MS: Record<SignalKind, number> = { view: 30 * 60_000, wishlist: 24 * 3600_000, bag: 30 * 60_000, purchase: 0 };
const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|preview|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|okhttp|java\//i;
const MAX_TRACKED = 5_000;
const MAX_SEEN = 50_000;
const KEEP_DAYS = 120;
export const STORE_TIMEZONE = process.env.STORE_TIMEZONE || "Asia/Jerusalem";

const scores = new Map<string, Live>();
const pending = new Map<string, Pending>();
const seen = new Map<string, number>();
const knownProducts = new Map<string, number>();
const variantProduct = new Map<string, string | null>();
let hot = new Map<string, number>();
/** Most popular first (enough for hotCount and warmCount). */
let hotOrder: string[] = [];
let topScore = 0;
const counters = { signals: 0, bots: 0, repeats: 0, unknown: 0, purchases: 0, flushErrors: 0 };
let lastFlushAt: number | null = null;
let lastLoadAt: number | null = null;
let lastPruneDay = "";

const cfg = (): PopularityConfig => cacheConfig().popularity;
const halfLifeMs = (c = cfg()) => c.halfLifeHours * 3600_000;
const weightOf = (kind: SignalKind, c: PopularityConfig) =>
  kind === "view" ? c.weightView : kind === "wishlist" ? c.weightWishlist : kind === "bag" ? c.weightBag : c.weightPurchase;

/** A score from `from` carried to `to` (halves every half-life). */
export function decay(score: number, from: number, to: number, halfLife: number) {
  if (to <= from || score === 0) return score;
  return score * Math.pow(2, -(to - from) / halfLife);
}

export function isBot(userAgent: string | undefined | null) {
  return !userAgent || userAgent.length < 8 || BOT_UA.test(userAgent);
}

/** Kept in memory only, for counting a repeat once. */
export function visitorOf(ip: string, userAgent: string) {
  return createHash("sha1").update(`${ip}|${userAgent}`).digest("base64url").slice(0, 16);
}

/* ---------------- Looking things up (replaceable in tests) ---------------- */

export type Resolvers = {
  /** The ids (of these) that are real products. */
  products: (ids: string[]) => Promise<string[]>;
  /** variant id → product id. */
  variants: (ids: string[]) => Promise<Map<string, string>>;
};

const dbResolvers: Resolvers = {
  products: async (ids) => (await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id),
  variants: async (ids) =>
    new Map(
      (await prisma.productVariant.findMany({ where: { id: { in: ids } }, select: { id: true, item: { select: { productId: true } } } })).map((v) => [
        v.id,
        v.item.productId,
      ]),
    ),
};
let resolvers: Resolvers = dbResolvers;

async function realProducts(ids: string[], now: number): Promise<Set<string>> {
  const out = new Set<string>();
  const ask: string[] = [];
  for (const id of new Set(ids)) {
    if ((knownProducts.get(id) ?? 0) > now) out.add(id);
    else ask.push(id);
  }
  if (ask.length) {
    for (const id of await resolvers.products(ask)) {
      out.add(id);
      knownProducts.set(id, now + 10 * 60_000);
    }
    if (knownProducts.size > 20_000) knownProducts.clear();
  }
  return out;
}

async function productsOfVariants(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ask: string[] = [];
  for (const id of new Set(ids)) {
    if (!variantProduct.has(id)) ask.push(id);
    else if (variantProduct.get(id)) out.set(id, variantProduct.get(id)!);
  }
  if (ask.length) {
    const found = await resolvers.variants(ask);
    for (const id of ask) {
      const p = found.get(id) ?? null;
      variantProduct.set(id, p);
      if (p) out.set(id, p);
    }
    if (variantProduct.size > 20_000) variantProduct.clear();
  }
  return out;
}

/* ---------------- Counting ---------------- */

function bump(productId: string, kind: SignalKind, now: number, times = 1) {
  const c = cfg();
  const h = halfLifeMs(c);
  const w = weightOf(kind, c) * times;
  const live = scores.get(productId);
  scores.set(productId, { score: (live ? decay(live.score, live.at, now, h) : 0) + w, at: now });
  const p = pending.get(productId) ?? { score: 0, at: now, views: 0, wishlists: 0, bags: 0, purchases: 0 };
  p.score = decay(p.score, p.at, now, h) + w;
  p.at = now;
  p[COUNT_FIELD[kind]] += times;
  pending.set(productId, p);
}

function forgetOldRepeats(now: number) {
  if (seen.size < MAX_SEEN) return;
  for (const [k, until] of seen) if (until <= now) seen.delete(k);
  if (seen.size >= MAX_SEEN) seen.clear();
}

/** Signals from the shop (POST /v1/storefront/signals). Returns how many counted. */
export async function noteSignals(signals: ShopperSignal[], who: { ip: string; userAgent: string }, now = Date.now()): Promise<number> {
  const c = cfg();
  if (!c.enabled || !signals.length) return 0;
  if (isBot(who.userAgent)) {
    counters.bots += signals.length;
    return 0;
  }
  const visitor = visitorOf(who.ip, who.userAgent);
  let byVariant = new Map<string, string>();
  let real = new Set<string>();
  try {
    byVariant = await productsOfVariants(signals.flatMap((s) => (!s.productId && s.variantId ? [s.variantId] : [])));
    real = await realProducts(signals.flatMap((s) => (s.productId ? [s.productId] : [])), now);
  } catch {
    return 0; // database away: these few signals are lost, nothing breaks
  }
  let n = 0;
  for (const s of signals) {
    const productId = s.productId ? (real.has(s.productId) ? s.productId : undefined) : s.variantId ? byVariant.get(s.variantId) : undefined;
    if (!productId) {
      counters.unknown += 1;
      continue;
    }
    const key = `${visitor}|${s.kind}|${productId}`;
    if ((seen.get(key) ?? 0) > now) {
      counters.repeats += 1;
      continue;
    }
    seen.set(key, now + REPEAT_MS[s.kind]);
    bump(productId, s.kind, now);
    counters.signals += 1;
    n += 1;
  }
  forgetOldRepeats(now);
  return n;
}

/** An order was placed (server side, never repeated): each product counts once, ×quantity up to 5. */
export async function notePurchases(lines: Array<{ variantId?: string | null; quantity?: number | null }>, now = Date.now()) {
  const c = cfg();
  if (!c.enabled) return 0;
  try {
    const ids = lines.flatMap((l) => (l.variantId ? [l.variantId] : []));
    const byVariant = await productsOfVariants(ids);
    const qty = new Map<string, number>();
    for (const l of lines) {
      const p = l.variantId ? byVariant.get(l.variantId) : undefined;
      if (p) qty.set(p, (qty.get(p) ?? 0) + Math.max(1, Number(l.quantity ?? 1)));
    }
    for (const [p, q] of qty) bump(p, "purchase", now, Math.min(5, q));
    counters.purchases += qty.size;
    return qty.size;
  } catch {
    return 0;
  }
}

/* ---------------- What the cache asks ---------------- */

export function scoreOf(productId: string, now = Date.now()) {
  const l = scores.get(productId);
  return l ? decay(l.score, l.at, now, halfLifeMs()) : 0;
}

/** 0 (nobody) … 1 (the most popular product right now), on a log scale. */
export function heatOf(productId: string, now = Date.now()) {
  const c = cfg();
  if (c.pinned.includes(productId)) return 1;
  const s = scoreOf(productId, now);
  if (s <= 0) return 0;
  const top = Math.max(topScore, s);
  return Math.min(1, Math.log2(1 + s) / Math.log2(1 + top));
}

/** How many times its namespace's TTL this product's pages stay fresh (1 … maxTtlMultiplier). */
export function ttlMultiplier(productId: string, now = Date.now()) {
  const c = cfg();
  if (!c.enabled || c.maxTtlMultiplier <= 1) return 1;
  return 1 + (c.maxTtlMultiplier - 1) * heatOf(productId, now);
}

/** 0 ordinary, 1 among the hotCount most popular, 2 pinned. */
export function priorityOf(productId: string) {
  return cfg().enabled ? hot.get(productId) ?? 0 : 0;
}

/** Pinned first, then the most popular: the products to build in advance. */
export function warmList(limit: number) {
  const c = cfg();
  if (!c.enabled || limit <= 0) return [];
  const out = [...new Set(c.pinned)];
  for (const id of hotOrder) {
    if (out.length >= limit) break;
    if (!out.includes(id)) out.push(id);
  }
  return out.slice(0, Math.max(limit, c.pinned.length));
}

const hotListeners = new Set<() => void>();

/** Told when the popular list changes (the cache re-ranks what it holds). */
export function onHotChange(fn: () => void) {
  hotListeners.add(fn);
  return () => hotListeners.delete(fn);
}

/** Re-ranks every product (every minute, after a load and when the settings change). */
export function refreshHot(now = Date.now()) {
  const c = cfg();
  const h = halfLifeMs(c);
  const ranked = [...scores]
    .map(([id, l]) => [id, decay(l.score, l.at, now, h)] as const)
    .filter(([, s]) => s > 0.01)
    .sort((a, b) => b[1] - a[1]);
  for (const [id] of ranked.slice(MAX_TRACKED)) scores.delete(id);
  for (const [id, l] of scores) if (decay(l.score, l.at, now, h) <= 0.01 && !pending.has(id)) scores.delete(id);
  topScore = ranked[0]?.[1] ?? 0;
  hotOrder = ranked.slice(0, Math.max(c.hotCount, c.warmCount)).map(([id]) => id);
  const next = new Map<string, number>();
  for (const [id] of ranked.slice(0, c.hotCount)) next.set(id, 1);
  for (const id of c.pinned) next.set(id, 2);
  const changed = next.size !== hot.size || [...next].some(([id, p]) => hot.get(id) !== p);
  hot = next;
  if (changed) for (const fn of hotListeners) fn();
}

onCacheConfig(() => refreshHot());

/* ---------------- Saving and loading ---------------- */

/** The store's calendar day (as a date-only value) for a moment. */
export function storeDay(at: number) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
  return new Date(`${ymd}T00:00:00.000Z`);
}

function putBack(id: string, p: Pending) {
  const h = halfLifeMs();
  const cur = pending.get(id);
  if (!cur) return pending.set(id, p);
  const at = Math.max(cur.at, p.at);
  pending.set(id, {
    score: decay(cur.score, cur.at, at, h) + decay(p.score, p.at, at, h),
    at,
    views: cur.views + p.views,
    wishlists: cur.wishlists + p.wishlists,
    bags: cur.bags + p.bags,
    purchases: cur.purchases + p.purchases,
  });
}

let flushing: Promise<number> | null = null;

/** Writes what was counted since the last time. Returns how many products. */
export function flushPopularity(now = Date.now()): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    if (!pending.size) return 0;
    const batch = [...pending];
    pending.clear();
    const h = halfLifeMs();
    const day = storeDay(now);
    let saved = 0;
    try {
      const existing = await prisma.productPopularity.findMany({
        where: { productId: { in: batch.map(([id]) => id) } },
        select: { productId: true, score: true, scoreAt: true },
      });
      const before = new Map(existing.map((r) => [r.productId, r]));
      for (const [id, p] of batch) {
        const old = before.get(id);
        const score = (old ? decay(old.score, old.scoreAt.getTime(), now, h) : 0) + decay(p.score, p.at, now, h);
        try {
          await prisma.productPopularity.upsert({
            where: { productId: id },
            create: { productId: id, score, scoreAt: new Date(now), views: p.views, wishlists: p.wishlists, bags: p.bags, purchases: p.purchases, lastSignalAt: new Date(p.at) },
            update: {
              score,
              scoreAt: new Date(now),
              views: { increment: p.views },
              wishlists: { increment: p.wishlists },
              bags: { increment: p.bags },
              purchases: { increment: p.purchases },
              lastSignalAt: new Date(p.at),
            },
          });
          await prisma.productPopularityDay.upsert({
            where: { day_productId: { day, productId: id } },
            create: { day, productId: id, views: p.views, wishlists: p.wishlists, bags: p.bags, purchases: p.purchases },
            update: {
              views: { increment: p.views },
              wishlists: { increment: p.wishlists },
              bags: { increment: p.bags },
              purchases: { increment: p.purchases },
            },
          });
          saved += 1;
          // What the database has now (this server's and the others' signals) plus what came in meanwhile.
          const extra = pending.get(id);
          scores.set(id, { score: score + (extra ? decay(extra.score, extra.at, now, h) : 0), at: now });
        } catch (e: any) {
          // The product was deleted meanwhile: forget it. Anything else: try again next time.
          if (e?.code === "P2003" || e?.code === "P2025") scores.delete(id);
          else putBack(id, p);
        }
      }
      lastFlushAt = now;
      const today = day.toISOString().slice(0, 10);
      if (today !== lastPruneDay) {
        lastPruneDay = today;
        await prisma.productPopularityDay.deleteMany({ where: { day: { lt: new Date(day.getTime() - KEEP_DAYS * 86400_000) } } }).catch(() => undefined);
      }
    } catch {
      counters.flushErrors += 1;
      for (const [id, p] of batch) putBack(id, p);
    }
    return saved;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** The top scores from the database (every server's signals), plus what this one hasn't written yet. */
export async function loadPopularity(now = Date.now()) {
  const h = halfLifeMs();
  const rows = await prisma.productPopularity.findMany({ orderBy: { score: "desc" }, take: MAX_TRACKED, select: { productId: true, score: true, scoreAt: true } });
  scores.clear();
  for (const r of rows) scores.set(r.productId, { score: decay(r.score, r.scoreAt.getTime(), now, h), at: now });
  for (const [id, p] of pending) {
    const cur = scores.get(id)?.score ?? 0;
    scores.set(id, { score: cur + decay(p.score, p.at, now, h), at: now });
  }
  lastLoadAt = now;
  refreshHot(now);
}

// Saved every 30 s, the hot list every minute, reloaded every 5 minutes: background
// jobs (src/jobs.ts: popularitySave, popularityHot, popularityLoad).

/** Shutting down: what came in since the last save. */
export async function stopPopularity() {
  await flushPopularity().catch(() => undefined);
}

/* ---------------- For the admin ---------------- */

export function popularitySnapshot(now = Date.now()) {
  const c = cfg();
  return {
    enabled: c.enabled,
    tracked: scores.size,
    hot: [...hot.values()].filter((p) => p === 1).length,
    pinned: c.pinned.length,
    topScore: Math.round(topScore * 10) / 10,
    waiting: pending.size,
    counted: counters.signals,
    purchases: counters.purchases,
    ignored: { bots: counters.bots, repeats: counters.repeats, unknown: counters.unknown },
    flushErrors: counters.flushErrors,
    lastFlushAt: lastFlushAt ? new Date(lastFlushAt).toISOString() : null,
    lastLoadAt: lastLoadAt ? new Date(lastLoadAt).toISOString() : null,
    halfLifeHours: c.halfLifeHours,
    now,
  };
}

/** The ranked product ids (pinned ones included even with no score yet). */
export function rankedProducts(limit: number, now = Date.now()) {
  refreshHot(now);
  const c = cfg();
  const ids = [...new Set([...c.pinned, ...hotOrder, ...[...scores.keys()]])];
  return ids
    .map((id) => ({ id, score: scoreOf(id, now) }))
    .sort((a, b) => Number(c.pinned.includes(b.id)) - Number(c.pinned.includes(a.id)) || b.score - a.score)
    .slice(0, limit);
}

/* ---------------- Tests ---------------- */

export function setPopularityResolversForTests(r: Resolvers | null) {
  resolvers = r ?? dbResolvers;
}

export function resetPopularityForTests() {
  scores.clear();
  pending.clear();
  seen.clear();
  knownProducts.clear();
  variantProduct.clear();
  hot = new Map();
  hotOrder = [];
  topScore = 0;
  for (const k of Object.keys(counters) as Array<keyof typeof counters>) counters[k] = 0;
  lastFlushAt = null;
  lastLoadAt = null;
}

/** Tests: what's waiting to be written. */
export function pendingForTests() {
  return new Map(pending);
}
