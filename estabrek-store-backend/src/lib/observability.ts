/**
 * What makes the server slow, measured in this server (admin → مراقبة السرعة والأولوية):
 *   - every route: how many, how long (average, p95, slowest), how much of it the
 *     database, how long it waited in its lane, errors;
 *   - the slowest database queries (Prisma's query events);
 *   - the latest slow requests, as examples;
 *   - the main thread's delay (event loop): when it's high, everything waits;
 *   - the shared pieces: worker threads and database connections.
 * Numbers since the server started (or since "reset"). Paths are kept without
 * their query, and long tokens in them (private order links) are hidden.
 */
import os from "node:os";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { parseQueryShape, type QueryShape } from "./queryShape.js";

/** Upper edges of the time buckets (ms): the p95 is the edge where 95% are below. */
const BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10_000, Infinity];
const MAX_ROUTES = 300;
const MAX_QUERIES = 300;
const KEEP_SLOW = 50;
const KEEP_ERRORS = 100;

type RouteStat = {
  key: string;
  count: number;
  totalMs: number;
  maxMs: number;
  dbMs: number;
  dbCount: number;
  waitedMs: number;
  errors: number;
  clientErrors: number;
  cacheHits: number;
  lane: string | null;
  buckets: number[];
  lastAt: number;
};

/** shape: its table, filter and sort, read once from the whole query (for the index suggestions). */
type QueryStat = { sql: string; count: number; totalMs: number; maxMs: number; lastAt: number; shape: QueryShape | null };
type SlowRequest = { at: number; route: string; path: string; status: number; ms: number; waitedMs: number; dbMs: number; dbCount: number; lane: string | null };
type ErrorStat = { route: string; count: number; lastAt: number; lastMessage: string | null; status: number };
type Minute = { t: number; requests: number; slow: number; errors: number; totalMs: number };

let since = Date.now();
const routes = new Map<string, RouteStat>();
const queries = new Map<string, QueryStat>();
const slow: SlowRequest[] = [];
const errors = new Map<string, ErrorStat>();
const minutes: Minute[] = [];

/* ---------------- Event loop ---------------- */

const loop = monitorEventLoopDelay({ resolution: 20 });
loop.enable();
type LoopSample = { t: number; p50: number; p99: number; max: number };
const loopHistory: LoopSample[] = [];
const ms = (ns: number) => Math.round((ns / 1e6) * 10) / 10;
const loopTimer = setInterval(() => {
  loopHistory.push({ t: Date.now(), p50: ms(loop.percentile(50)), p99: ms(loop.percentile(99)), max: ms(loop.max) });
  if (loopHistory.length > 60) loopHistory.shift();
  loop.reset();
}, 10_000);
loopTimer.unref?.();

/* ---------------- Notes ---------------- */

function minute(now: number) {
  const t = Math.floor(now / 60_000) * 60_000;
  let last = minutes[minutes.length - 1];
  if (!last || last.t !== t) {
    last = { t, requests: 0, slow: 0, errors: 0, totalMs: 0 };
    minutes.push(last);
    if (minutes.length > 60) minutes.shift();
  }
  return last;
}

/** Long tokens (private order links, ids) hidden; no query string. */
export function safePath(path: string) {
  return path
    .split("?")[0]
    .split("/")
    .map((seg) => (seg.length > 24 && /^[\w-]+$/.test(seg) ? "…" : seg))
    .join("/")
    .slice(0, 200);
}

/** A route without a matched pattern (404s, errors): ids and long parts become ":id". */
export function routeKeyOf(method: string, pattern: string | null, path: string) {
  if (pattern) return `${method} ${pattern}`;
  const p = path
    .split("?")[0]
    .split("/")
    .map((seg) => (/^\d+$/.test(seg) || (seg.length >= 16 && /^[\w-]+$/.test(seg)) ? ":id" : seg))
    .join("/");
  return `${method} ${p}`.slice(0, 200);
}

function evictSmallest<T extends { totalMs: number }>(map: Map<string, T>, max: number) {
  if (map.size <= max) return;
  let worst: string | null = null;
  let low = Infinity;
  for (const [k, v] of map) {
    if (v.totalMs < low) {
      low = v.totalMs;
      worst = k;
    }
  }
  if (worst) map.delete(worst);
}

export type RequestNote = {
  method: string;
  route: string;
  path: string;
  status: number;
  ms: number;
  waitedMs: number;
  dbMs: number;
  dbCount: number;
  cacheHit: boolean;
  lane: string | null;
  error?: string | null;
};

export function noteRequest(r: RequestNote, slowMs = 1000, now = Date.now()) {
  let s = routes.get(r.route);
  if (!s) {
    s = { key: r.route, count: 0, totalMs: 0, maxMs: 0, dbMs: 0, dbCount: 0, waitedMs: 0, errors: 0, clientErrors: 0, cacheHits: 0, lane: r.lane, buckets: BUCKETS.map(() => 0), lastAt: now };
    routes.set(r.route, s);
    evictSmallest(routes, MAX_ROUTES);
  }
  s.count += 1;
  s.totalMs += r.ms;
  s.maxMs = Math.max(s.maxMs, r.ms);
  s.dbMs += r.dbMs;
  s.dbCount += r.dbCount;
  s.waitedMs += r.waitedMs;
  if (r.cacheHit) s.cacheHits += 1;
  if (r.status >= 500) s.errors += 1;
  else if (r.status >= 400) s.clientErrors += 1;
  s.lane = r.lane ?? s.lane;
  s.lastAt = now;
  s.buckets[BUCKETS.findIndex((b) => r.ms <= b)] += 1;

  const m = minute(now);
  m.requests += 1;
  m.totalMs += r.ms;
  if (r.status >= 500) m.errors += 1;
  if (r.ms >= slowMs) {
    m.slow += 1;
    slow.push({ at: now, route: r.route, path: safePath(r.path), status: r.status, ms: Math.round(r.ms), waitedMs: Math.round(r.waitedMs), dbMs: Math.round(r.dbMs), dbCount: r.dbCount, lane: r.lane });
    if (slow.length > KEEP_SLOW) slow.shift();
  }
  if (r.status >= 500) {
    let e = errors.get(r.route);
    if (!e) {
      e = { route: r.route, count: 0, lastAt: now, lastMessage: null, status: r.status };
      errors.set(r.route, e);
      if (errors.size > KEEP_ERRORS) errors.delete(errors.keys().next().value!);
    }
    e.count += 1;
    e.lastAt = now;
    e.status = r.status;
    e.lastMessage = r.error ? String(r.error).slice(0, 300) : e.lastMessage;
  }
}

/**
 * The same query with other values is one entry (Prisma sends $1, $2… placeholders).
 * A long column list becomes "SELECT … FROM" and "public". goes: what's left is
 * what tells queries apart (the table, the filter, the order).
 */
export function queryKey(sql: string) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/IN \((\$\d+(,\s*)?)+\)/gi, "IN (…)")
    .trim()
    .replace(/^SELECT (.{80,}?) FROM /i, "SELECT … FROM ")
    .replace(/"public"\./g, "")
    .slice(0, 600);
}

export function noteDbQuery(sql: string, durationMs: number, now = Date.now()) {
  if (!sql || /^(BEGIN|COMMIT|ROLLBACK|SELECT 1)\b/i.test(sql.trim())) return;
  const key = queryKey(sql);
  let q = queries.get(key);
  if (!q) {
    q = { sql: key, count: 0, totalMs: 0, maxMs: 0, lastAt: now, shape: parseQueryShape(sql) };
    queries.set(key, q);
    evictSmallest(queries, MAX_QUERIES);
  }
  q.count += 1;
  q.totalMs += durationMs;
  q.maxMs = Math.max(q.maxMs, durationMs);
  q.lastAt = now;
}

/* ---------------- For the admin ---------------- */

/** The queries with their shapes (lib/indexAdvice.ts). */
export function queriesForAdvice() {
  return [...queries.values()].map((q) => ({ sql: q.sql, count: q.count, avgMs: q.count ? q.totalMs / q.count : 0, totalMs: q.totalMs, shape: q.shape }));
}

function p95(buckets: number[], count: number) {
  if (!count) return 0;
  let seen = 0;
  for (let i = 0; i < buckets.length; i++) {
    seen += buckets[i];
    if (seen >= count * 0.95) return BUCKETS[i] === Infinity ? BUCKETS[i - 1] * 2 : BUCKETS[i];
  }
  return BUCKETS[BUCKETS.length - 2];
}

/** Database connections Prisma keeps: connection_limit in DATABASE_URL, or its default (CPUs × 2 + 1). */
export function databasePool() {
  let limit: number | null = null;
  let timeout: number | null = null;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    limit = Number(url.searchParams.get("connection_limit")) || null;
    timeout = Number(url.searchParams.get("pool_timeout")) || null;
  } catch {
    // no URL
  }
  return { limit: limit ?? os.cpus().length * 2 + 1, fromUrl: limit !== null, timeoutSeconds: timeout ?? 10 };
}

export function workerThreads() {
  const fromEnv = Number(process.env.UV_THREADPOOL_SIZE) || null;
  return { size: fromEnv ?? 4, fromEnv: fromEnv !== null, cpus: os.cpus().length };
}

export function monitorSnapshot(top = 25, now = Date.now()) {
  const routeRows = [...routes.values()]
    .map((s) => ({
      route: s.key,
      lane: s.lane,
      count: s.count,
      avgMs: Math.round((s.totalMs / s.count) * 10) / 10,
      p95Ms: p95(s.buckets, s.count),
      maxMs: Math.round(s.maxMs),
      totalMs: Math.round(s.totalMs),
      dbShare: s.totalMs ? Math.round((s.dbMs / s.totalMs) * 100) / 100 : 0,
      avgDbQueries: Math.round((s.dbCount / s.count) * 10) / 10,
      avgWaitMs: Math.round(s.waitedMs / s.count),
      cacheShare: Math.round((s.cacheHits / s.count) * 100) / 100,
      errors: s.errors,
      clientErrors: s.clientErrors,
      lastAt: new Date(s.lastAt).toISOString(),
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, top);
  const queryRows = [...queries.values()]
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, top)
    .map((q) => ({ sql: q.sql, count: q.count, avgMs: Math.round((q.totalMs / q.count) * 10) / 10, maxMs: Math.round(q.maxMs), totalMs: Math.round(q.totalMs), lastAt: new Date(q.lastAt).toISOString() }));
  const totals = [...routes.values()].reduce((t, s) => ({ requests: t.requests + s.count, totalMs: t.totalMs + s.totalMs, errors: t.errors + s.errors }), { requests: 0, totalMs: 0, errors: 0 });
  const current = loopHistory[loopHistory.length - 1] ?? { t: now, p50: ms(loop.percentile(50)), p99: ms(loop.percentile(99)), max: ms(loop.max) };
  return {
    now,
    since: new Date(since).toISOString(),
    totals: { requests: totals.requests, avgMs: totals.requests ? Math.round((totals.totalMs / totals.requests) * 10) / 10 : 0, errors: totals.errors },
    eventLoop: { now: current, history: [...loopHistory] },
    workerThreads: workerThreads(),
    databasePool: databasePool(),
    memory: { rssBytes: process.memoryUsage().rss, heapUsedBytes: process.memoryUsage().heapUsed },
    minutes: [...minutes],
    routes: routeRows,
    queries: queryRows,
    slow: [...slow].reverse().map((s) => ({ ...s, at: new Date(s.at).toISOString() })),
    errors: [...errors.values()].sort((a, b) => b.lastAt - a.lastAt).map((e) => ({ ...e, lastAt: new Date(e.lastAt).toISOString() })),
  };
}

export function resetMonitor() {
  since = Date.now();
  routes.clear();
  queries.clear();
  slow.length = 0;
  errors.clear();
  minutes.length = 0;
  loopHistory.length = 0;
  loop.reset();
}
