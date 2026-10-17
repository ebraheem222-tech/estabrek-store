/**
 * The shop's cache, in layers:
 *   L1  memory on this server (lib/cacheEngine.ts): one store per namespace,
 *       bounded by the admin's memory size and eviction rule.
 *   L2  Redis (when REDIS_URL is set and the admin allows it), shared by every
 *       server and kept across restarts.
 * The routes use it through middleware/responseCache.ts; older services call
 * cacheGet/cacheSet below.
 *
 * Staying correct:
 * - Every entry carries a stamp: one token per namespace and one per data group
 *   (catalog, cms, settings). A database write to a group's tables (seen in
 *   lib/dbWrites.ts) gives the group a new token, so everything built from the
 *   old data stops matching at once. A second new token 1.5 s after the last
 *   write drops answers built while a transaction was still running.
 * - Nothing stays fresh past the next moment the data changes by itself: the
 *   start or end of a sale (catalog) or a page's publish/unpublish time (cms).
 * - With Redis the tokens are shared, so a write on one server clears the
 *   others within ~2 seconds.
 *
 * Popular products (lib/popularity.ts): their product and SKU answers stay fresh
 * up to maxTtlMultiplier × the TTL, leave memory last, and are built again in
 * advance after a change (lib/cacheWarm.ts listens to onCatalogChange/onPurge).
 */
import { createHash, randomBytes } from "node:crypto";
import { Redis } from "ioredis";
import { recordCacheHit, recordCacheMiss, recordCacheWrite } from "./requestMetrics.js";
import { MemoryStore, entryBytes, type CacheEntry, type EvictReason } from "./cacheEngine.js";
import {
  NAMESPACES,
  NAMESPACE_NAMES,
  cacheConfig,
  cacheEnvDisabled,
  namespaceBudgets,
  onCacheConfig,
  type CacheGroup,
  type NamespaceName,
} from "./cacheConfig.js";
import { onDbWrite } from "./dbWrites.js";
import { prisma } from "./prisma.js";
import { onHotChange, popularitySnapshot, priorityOf, ttlMultiplier } from "./popularity.js";

const GROUPS: CacheGroup[] = ["catalog", "cms", "settings"];
const startedAt = Date.now();

/* ---------------- Redis (L2) ---------------- */

let redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redis) return redis;
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      // Fail fast instead of queueing while Redis is away: the cache is optional.
      enableOfflineQueue: false,
      lazyConnect: true,
      commandTimeout: 250,
    });
    // Avoid noisy logs; callers handle cache failures gracefully.
    redis.on("error", () => undefined);
    redis.connect().catch(() => undefined);
    return redis;
  } catch {
    return null;
  }
}

/** Redis when it is configured, connected and allowed by the settings. */
function l2(): Redis | null {
  if (!cacheConfig().useRedis) return null;
  const r = getRedis();
  return r && r.status === "ready" ? r : null;
}

const prefix = () => `${process.env.REDIS_KEY_PREFIX || "estabrak"}:cache`;

/** Long or unusual keys are hashed in Redis. */
function redisKey(ns: NamespaceName, stamp: string, key: string) {
  const safe = /^[\w:.,\-/?=&%]{1,180}$/.test(key) ? key : createHash("sha1").update(key).digest("hex");
  return `${prefix()}:${ns}:${stamp}:${safe}`;
}

/* ---------------- Stores (L1) ---------------- */

const stores = new Map<NamespaceName, MemoryStore>();

function store(ns: NamespaceName): MemoryStore {
  let s = stores.get(ns);
  if (!s) {
    const config = cacheConfig();
    s = new MemoryStore(ns, config.namespaces[ns].policy, namespaceBudgets(config)[ns]);
    stores.set(ns, s);
  }
  return s;
}

onCacheConfig((config) => {
  const budgets = namespaceBudgets(config);
  for (const ns of NAMESPACE_NAMES) {
    const s = stores.get(ns);
    if (!s) continue;
    if (!config.enabled || !config.namespaces[ns].enabled) s.clear("manual");
    s.configure(config.namespaces[ns].policy, budgets[ns]);
  }
});

/* ---------------- Stamps ---------------- */

const newToken = () => `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

type TokenName = `g:${CacheGroup}` | `n:${NamespaceName}`;
const tokens = new Map<TokenName, string>();
/** Bumped on every local change, so a slower Redis read never brings an old token back. */
const tokenVersions = new Map<TokenName, number>();

function token(name: TokenName) {
  let t = tokens.get(name);
  if (!t) {
    t = newToken();
    tokens.set(name, t);
  }
  return t;
}

function renew(name: TokenName) {
  const t = newToken();
  tokens.set(name, t);
  tokenVersions.set(name, (tokenVersions.get(name) ?? 0) + 1);
  const r = l2();
  if (r) r.set(`${prefix()}:token:${name}`, t).catch(() => undefined);
}

/** What an entry of this namespace must carry to still be current. */
export function stampOf(ns: NamespaceName) {
  return [token(`n:${ns}`), ...NAMESPACES[ns].groups.map((g) => token(`g:${g}`))].join(".");
}

/** Takes the tokens other servers set (and offers ours when Redis has none). */
async function syncTokens() {
  const r = l2();
  if (!r) return;
  const names: TokenName[] = [...GROUPS.map((g) => `g:${g}` as const), ...NAMESPACE_NAMES.map((n) => `n:${n}` as const)];
  const before = names.map((n) => tokenVersions.get(n) ?? 0);
  try {
    const values = await r.mget(...names.map((n) => `${prefix()}:token:${n}`));
    names.forEach((name, i) => {
      if ((tokenVersions.get(name) ?? 0) !== before[i]) return; // changed here meanwhile
      const remote = values[i];
      if (!remote) {
        r.set(`${prefix()}:token:${name}`, token(name), "NX").catch(() => undefined);
      } else if (remote !== tokens.get(name)) {
        tokens.set(name, remote);
        if (name.startsWith("g:")) forgetBoundary(name.slice(2) as CacheGroup);
      }
    });
  } catch {
    // Redis busy or gone: try again on the next tick.
  }
}

/* ---------------- Writes clear their groups ---------------- */

const lastWriteAt: Record<CacheGroup, number | null> = { catalog: null, cms: null, settings: null };
const rebump = new Map<CacheGroup, ReturnType<typeof setTimeout>>();
const catalogListeners = new Set<() => void>();
const purgeListeners = new Set<(ns?: NamespaceName) => void>();

/** Told after products, stock or categories change (the warm-up runs a few seconds later). */
export function onCatalogChange(fn: () => void) {
  catalogListeners.add(fn);
  return () => catalogListeners.delete(fn);
}

/** Told after the admin empties a namespace (or everything: undefined). */
export function onPurge(fn: (ns?: NamespaceName) => void) {
  purgeListeners.add(fn);
  return () => purgeListeners.delete(fn);
}

/** Data in these groups changed: what was built from it is out of date. */
export function invalidateGroups(groups: CacheGroup[]) {
  for (const g of groups) {
    renew(`g:${g}`);
    forgetBoundary(g);
    lastWriteAt[g] = Date.now();
    // Again shortly after the last write: a transaction may still have been running.
    clearTimeout(rebump.get(g));
    const t = setTimeout(() => {
      rebump.delete(g);
      renew(`g:${g}`);
      forgetBoundary(g);
    }, 1500);
    t.unref?.();
    rebump.set(g, t);
  }
  if (groups.includes("catalog")) for (const fn of catalogListeners) fn();
}

onDbWrite(invalidateGroups);

/* ---------------- When data changes by itself ---------------- */

type Boundary = { until: number; state: "unknown" | "loading" | "known"; checkedAt: number };
const boundaries: Record<CacheGroup, Boundary> = {
  catalog: { until: 0, state: "unknown", checkedAt: 0 },
  cms: { until: 0, state: "unknown", checkedAt: 0 },
  settings: { until: Infinity, state: "known", checkedAt: Infinity },
};
/** While the next change is being looked up, entries stay fresh this long at most. */
const UNKNOWN_BOUNDARY_MS = 5_000;
const RECHECK_BOUNDARY_MS = 10 * 60_000;

function forgetBoundary(g: CacheGroup) {
  if (g === "settings") return;
  boundaries[g].state = "unknown";
}

async function nextChange(g: CacheGroup, at: Date): Promise<number> {
  if (g === "catalog") {
    const [starts, ends] = await Promise.all([
      prisma.productVariant.aggregate({ _min: { saleStartsAt: true }, where: { salePrice: { not: null }, saleStartsAt: { gt: at } } }),
      prisma.productVariant.aggregate({ _min: { saleEndsAt: true }, where: { salePrice: { not: null }, saleEndsAt: { gt: at } } }),
    ]);
    return Math.min(starts._min.saleStartsAt?.getTime() ?? Infinity, ends._min.saleEndsAt?.getTime() ?? Infinity);
  }
  if (g === "cms") {
    const [publish, unpublish] = await Promise.all([
      prisma.page.aggregate({ _min: { publishAt: true }, where: { publishAt: { gt: at } } }),
      prisma.page.aggregate({ _min: { unpublishAt: true }, where: { unpublishAt: { gt: at } } }),
    ]);
    return Math.min(publish._min.publishAt?.getTime() ?? Infinity, unpublish._min.unpublishAt?.getTime() ?? Infinity);
  }
  return Infinity;
}

function loadBoundary(g: CacheGroup) {
  const b = boundaries[g];
  b.state = "loading";
  const at = Date.now();
  nextChange(g, new Date(at))
    .then((until) => {
      if (b.state !== "loading") return; // a write came in meanwhile: look again later
      Object.assign(b, { until, state: "known", checkedAt: at });
    })
    .catch(() => {
      // Database away: look again in 30 seconds.
      if (b.state === "loading") Object.assign(b, { until: at + 30_000, state: "known", checkedAt: at });
    });
}

/** Until when this group's data stays as it is now (as far as we know). */
function stableUntil(g: CacheGroup, now: number): number {
  const b = boundaries[g];
  if (b.state === "known" && now < b.until) {
    if (now - b.checkedAt > RECHECK_BOUNDARY_MS) loadBoundary(g);
    return b.until;
  }
  if (b.state !== "loading") loadBoundary(g);
  return now + UNKNOWN_BOUNDARY_MS;
}

/** Namespaces whose answers are about one product (and so follow its popularity). */
const PRODUCT_NAMESPACES = new Set<NamespaceName>(["products", "sku"]);

/** Fresh and stale-until times for a new entry of this namespace (about `subject`, a product id). */
export function lifetimes(ns: NamespaceName, now = Date.now(), ttlMs?: number, subject?: string) {
  const config = cacheConfig().namespaces[ns];
  const limit = Math.min(...NAMESPACES[ns].groups.map((g) => stableUntil(g, now)), Infinity);
  const boost = subject && PRODUCT_NAMESPACES.has(ns) ? ttlMultiplier(subject, now) : 1;
  const freshUntil = Math.min(now + (ttlMs ?? config.ttlSeconds * 1000) * boost, limit);
  const staleUntil = Math.min(freshUntil + config.staleSeconds * 1000, limit);
  return { freshUntil, staleUntil };
}

/* ---------------- Numbers for the admin ---------------- */

type NsCounters = { l2Hits: number; l2Errors: number };
const nsCounters = new Map<NamespaceName, NsCounters>();
const counters = (ns: NamespaceName) => {
  let c = nsCounters.get(ns);
  if (!c) {
    c = { l2Hits: 0, l2Errors: 0 };
    nsCounters.set(ns, c);
  }
  return c;
};

type Minute = { t: number; hits: number; misses: number };
const history: Minute[] = [];
function minute(now: number) {
  const t = Math.floor(now / 60_000) * 60_000;
  let last = history[history.length - 1];
  if (!last || last.t !== t) {
    last = { t, hits: 0, misses: 0 };
    history.push(last);
    if (history.length > 60) history.shift();
  }
  return last;
}

export function noteHit(ns: NamespaceName, fresh: boolean, layer: "l1" | "l2") {
  const s = store(ns).stats;
  if (fresh) s.hits += 1;
  else s.staleHits += 1;
  if (layer === "l2") counters(ns).l2Hits += 1;
  minute(Date.now()).hits += 1;
  recordCacheHit();
}

export function noteMiss(ns: NamespaceName) {
  store(ns).stats.misses += 1;
  minute(Date.now()).misses += 1;
  recordCacheMiss();
}

export function noteLoad(ns: NamespaceName, ms: number) {
  const s = store(ns).stats;
  s.loads += 1;
  s.loadMs += ms;
}

/* ---------------- Reading and writing ---------------- */

export function cacheOn(ns: NamespaceName) {
  const config = cacheConfig();
  return !cacheEnvDisabled() && config.enabled && config.namespaces[ns].enabled;
}

export type Found = { entry: CacheEntry; fresh: boolean; layer: "l1" | "l2" };

type Stored = { s?: number; b?: string; v?: unknown; f: number; u: number; c: number; k: number; j?: string };

/** Memory first, then Redis. Doesn't count: the caller says hit or miss. */
export async function lookup(ns: NamespaceName, key: string): Promise<Found | undefined> {
  const now = Date.now();
  const stamp = stampOf(ns);
  const local = store(ns).get(key, stamp, now);
  if (local) return { ...local, layer: "l1" };
  const r = l2();
  if (!r) return undefined;
  try {
    const raw = await r.get(redisKey(ns, stamp, key));
    if (!raw) return undefined;
    const d = JSON.parse(raw) as Stored;
    const at = Date.now();
    if (at >= d.u || stampOf(ns) !== stamp) return undefined;
    const text = d.b ?? JSON.stringify(d.v ?? null);
    const entry: CacheEntry = {
      key,
      body: d.b,
      status: d.s,
      value: d.v,
      bytes: entryBytes(key, text),
      createdAt: d.c,
      freshUntil: d.f,
      staleUntil: d.u,
      stamp,
      costMs: d.k,
      hits: 1,
      lastHit: at,
      subject: d.j,
      priority: d.j ? priorityOf(d.j) : 0,
    };
    store(ns).set(entry, at);
    return { entry, fresh: at < d.f, layer: "l2" };
  } catch {
    counters(ns).l2Errors += 1;
    return undefined;
  }
}

/**
 * Keeps an answer (in memory now, in Redis in the background). `text` is its
 * JSON, used for its size and for Redis. ttlMs overrides the namespace's TTL.
 * `subject` is the product it's about, when it's about one (popularity).
 */
export function remember(
  ns: NamespaceName,
  key: string,
  parts: { body?: string; status?: number; value?: unknown; text: string; costMs: number },
  ttlMs?: number,
  stamp = stampOf(ns),
  subject?: string,
): CacheEntry | null {
  const now = Date.now();
  // The data changed while the answer was being built: don't keep it.
  if (stamp !== stampOf(ns)) return null;
  const { freshUntil, staleUntil } = lifetimes(ns, now, ttlMs, subject);
  if (staleUntil <= now) return null;
  const entry: CacheEntry = {
    key,
    body: parts.body,
    status: parts.status,
    value: parts.value,
    bytes: entryBytes(key, parts.text),
    createdAt: now,
    freshUntil,
    staleUntil,
    stamp,
    costMs: parts.costMs,
    hits: 0,
    lastHit: now,
    subject,
    priority: subject ? priorityOf(subject) : 0,
  };
  const kept = store(ns).set(entry, now);
  recordCacheWrite();
  const r = l2();
  if (r && Number.isFinite(staleUntil)) {
    const data: Stored = { s: parts.status, b: parts.body, v: parts.body === undefined ? parts.value : undefined, f: freshUntil, u: staleUntil, c: now, k: parts.costMs, j: subject };
    r.set(redisKey(ns, stamp, key), JSON.stringify(data), "PX", Math.max(1, staleUntil - now)).catch(() => {
      counters(ns).l2Errors += 1;
    });
  }
  return kept ? entry : null;
}

/**
 * A route answer still in memory for this key, however old, as long as its data
 * hasn't changed since (the lanes send it when the shop is too busy to build a new one).
 */
export function peekCachedAnswer(key: string): { body: string; status: number | undefined } | null {
  for (const [ns, s] of stores) {
    const e = s.peek(key);
    if (e && e.body !== undefined && e.stamp === stampOf(ns)) return { body: e.body, status: e.status };
  }
  return null;
}

/** Already in memory and fresh for at least `marginMs` more (the warm-up skips it). */
export function isFresh(ns: NamespaceName, key: string, marginMs = 30_000) {
  const e = store(ns).peek(key);
  return !!e && e.stamp === stampOf(ns) && e.freshUntil > Date.now() + marginMs;
}

// The popular list changed: what's in memory takes its new rank.
onHotChange(() => {
  for (const s of stores.values()) s.reprioritize(priorityOf);
});

/* ---------------- One build at a time per key ---------------- */

const flights = new Map<string, Promise<CacheEntry | null>>();

/** A build of this key already running (others wait for it instead of building too). */
export function flightOf(ns: NamespaceName, key: string) {
  return flights.get(`${ns}|${key}`);
}

export function startFlight(ns: NamespaceName, key: string) {
  const id = `${ns}|${key}`;
  let settle!: (e: CacheEntry | null) => void;
  const p = new Promise<CacheEntry | null>((resolve) => (settle = resolve));
  flights.set(id, p);
  let done = false;
  return (entry: CacheEntry | null) => {
    if (done) return;
    done = true;
    if (flights.get(id) === p) flights.delete(id);
    settle(entry);
  };
}

/* ---------------- Older callers (data-level) ---------------- */

/** Which namespace an older key belongs to. */
export function namespaceOfKey(key: string): NamespaceName {
  if (key.startsWith("settings:")) return "settings";
  if (key.startsWith("storefront:page")) return "pages";
  if (key.startsWith("catalog:categories") || key.startsWith("catalog:sizes")) return "categories";
  if (key.startsWith("catalog:products:")) return "listings";
  return "misc";
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const ns = namespaceOfKey(key);
  if (!cacheOn(ns)) return undefined;
  const found = await lookup(ns, key);
  // Data-level callers rebuild when it's no longer fresh (no stale serving here).
  if (!found || !found.fresh || found.entry.body !== undefined) {
    noteMiss(ns);
    return undefined;
  }
  noteHit(ns, true, found.layer);
  return found.entry.value as T;
}

/**
 * ttlMs is used for keys outside the named namespaces; the others follow the
 * admin's TTL for their namespace (writes clear them anyway).
 */
export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const ns = namespaceOfKey(key);
  if (!cacheOn(ns)) return;
  let text: string;
  try {
    text = JSON.stringify(value) ?? "null";
  } catch {
    return;
  }
  remember(ns, key, { value, text, costMs: 0 }, ns === "misc" ? ttlMs : undefined);
}

export async function cacheDel(key: string): Promise<void> {
  const ns = namespaceOfKey(key);
  store(ns).remove(key, "manual");
  const r = l2();
  if (!r) return;
  try {
    await r.del(redisKey(ns, stampOf(ns), key));
  } catch {
    // ignore cache delete failures
  }
}

export async function cacheDelPrefix(keyPrefix: string): Promise<void> {
  const ns = namespaceOfKey(keyPrefix);
  store(ns).clear("manual", keyPrefix);
  const r = l2();
  if (!r) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = (await r.scan(cursor, "MATCH", `${prefix()}:${ns}:*:${keyPrefix}*`, "COUNT", 200)) as [string, string[]];
      cursor = next;
      if (keys.length) await r.del(...keys);
    } while (cursor !== "0");
  } catch {
    // ignore scan/delete failures
  }
}

/* ---------------- Admin ---------------- */

/** Empties one namespace (or all) on every server. Returns how many entries left memory here. */
export function purgeCache(ns?: NamespaceName) {
  let n = 0;
  for (const name of ns ? [ns] : NAMESPACE_NAMES) {
    renew(`n:${name}`);
    n += store(name).clear("manual");
  }
  for (const fn of purgeListeners) fn(ns);
  return n;
}

export function cacheSnapshot(topN = 20) {
  const now = Date.now();
  const config = cacheConfig();
  const budgets = namespaceBudgets(config);
  const r = getRedis();
  const namespaces = NAMESPACE_NAMES.map((name) => {
    const s = store(name);
    const st = s.stats;
    const c = counters(name);
    const served = st.hits + st.staleHits;
    const avgLoadMs = st.loads ? st.loadMs / st.loads : 0;
    return {
      name,
      groups: NAMESPACES[name].groups,
      on: cacheOn(name),
      policy: s.rule,
      entries: s.size,
      protectedEntries: s.rule === "smart" ? s.protectedSize : 0,
      bytes: s.bytes,
      limitBytes: budgets[name],
      hits: st.hits,
      staleHits: st.staleHits,
      l2Hits: c.l2Hits,
      l2Errors: c.l2Errors,
      misses: st.misses,
      hitRatio: served + st.misses ? served / (served + st.misses) : null,
      writes: st.writes,
      tooBig: st.tooBig,
      loads: st.loads,
      avgLoadMs: Math.round(avgLoadMs * 10) / 10,
      /** Hits × what building the answer usually takes. */
      savedMs: Math.round(served * avgLoadMs),
      evictions: { ...st.evictions } as Record<EvictReason, number>,
    };
  });
  const sum = (f: (x: (typeof namespaces)[number]) => number) => namespaces.reduce((s, x) => s + f(x), 0);
  const served = sum((x) => x.hits + x.staleHits);
  const misses = sum((x) => x.misses);
  const top = NAMESPACE_NAMES.flatMap((name) => store(name).entries().map((e) => ({ ns: name, e })))
    .filter(({ e }) => e.hits > 0)
    .sort((a, b) => b.e.hits - a.e.hits)
    .slice(0, topN)
    .map(({ ns, e }) => ({
      ns,
      key: e.key,
      hits: Math.round(e.hits),
      bytes: e.bytes,
      ageSeconds: Math.round((now - e.createdAt) / 1000),
      freshForSeconds: Number.isFinite(e.freshUntil) ? Math.max(0, Math.round((e.freshUntil - now) / 1000)) : null,
      costMs: Math.round(e.costMs),
      status: e.status ?? null,
      subject: e.subject ?? null,
      priority: e.priority ?? 0,
    }));
  const boundaryOf = (g: CacheGroup) => {
    const b = boundaries[g];
    return b.state === "known" && Number.isFinite(b.until) && b.until > now ? new Date(b.until).toISOString() : null;
  };
  const mem = process.memoryUsage();
  return {
    now,
    enabled: config.enabled && !cacheEnvDisabled(),
    envDisabled: cacheEnvDisabled(),
    startedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: Math.round((now - startedAt) / 1000),
    redis: {
      configured: !!process.env.REDIS_URL,
      status: r?.status ?? "off",
      inUse: !!l2(),
    },
    memory: { usedBytes: sum((x) => x.bytes), limitBytes: config.memoryMb * 1024 * 1024, rssBytes: mem.rss, heapUsedBytes: mem.heapUsed },
    totals: {
      hits: served,
      misses,
      hitRatio: served + misses ? served / (served + misses) : null,
      savedMs: sum((x) => x.savedMs),
      entries: sum((x) => x.entries),
      evictions: sum((x) => x.evictions.size),
    },
    namespaces,
    history: [...history],
    top,
    nextChange: { catalog: boundaryOf("catalog"), cms: boundaryOf("cms") },
    popularity: popularitySnapshot(now),
    lastWriteAt: Object.fromEntries(GROUPS.map((g) => [g, lastWriteAt[g] ? new Date(lastWriteAt[g]!).toISOString() : null])),
  };
}

/* ---------------- Housekeeping ---------------- */

/** Removes expired and outdated answers from memory (a background job, every 30 s: src/jobs.ts cacheSweep). */
export function sweepCaches(now = Date.now()) {
  let removed = 0;
  for (const [ns, s] of stores) {
    const stamp = stampOf(ns);
    removed += s.sweep(now, (x) => x === stamp);
  }
  return removed;
}

if (process.env.REDIS_URL) {
  const syncTimer = setInterval(() => void syncTokens(), 2_000);
  syncTimer.unref?.();
}

/** Tests: start from nothing. */
export function resetCacheForTests() {
  for (const s of stores.values()) s.clear("manual");
  stores.clear();
  nsCounters.clear();
  history.length = 0;
  flights.clear();
  for (const g of GROUPS) {
    clearTimeout(rebump.get(g));
    lastWriteAt[g] = null;
    if (g !== "settings") Object.assign(boundaries[g], { until: 0, state: "unknown", checkedAt: 0 });
  }
  rebump.clear();
  tokens.clear();
  tokenVersions.clear();
}

/** Tests: pretend the next sale/page change is known. */
export function setBoundaryForTests(g: CacheGroup, until: number) {
  Object.assign(boundaries[g], { until, state: "known", checkedAt: Date.now() });
}
