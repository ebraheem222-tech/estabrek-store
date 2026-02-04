import { Redis } from "ioredis";

type CacheEntry = { v: any; exp: number };

const MEM_CACHE = new Map<string, CacheEntry>();
const MEM_MAX = 500;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redis) return redis;
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    // Avoid noisy logs; callers handle cache failures gracefully.
    redis.on("error", () => undefined);
    return redis;
  } catch {
    return null;
  }
}

function memGet<T>(key: string): T | undefined {
  const hit = MEM_CACHE.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) {
    MEM_CACHE.delete(key);
    return undefined;
  }
  return hit.v as T;
}

function memSet<T>(key: string, value: T, ttlMs: number) {
  if (MEM_CACHE.size >= MEM_MAX && !MEM_CACHE.has(key)) {
    const first = MEM_CACHE.keys().next().value;
    if (first) MEM_CACHE.delete(first);
  }
  MEM_CACHE.set(key, { v: value, exp: Date.now() + ttlMs });
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const mem = memGet<T>(key);
  if (mem !== undefined) return mem;

  const r = getRedis();
  if (!r) return undefined;
  try {
    const raw = await r.get(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as T;
    // Keep a short in-memory copy to avoid repeated Redis hits.
    memSet(key, parsed, 10_000);
    return parsed;
  } catch {
    return undefined;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  memSet(key, value, ttlMs);
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), "PX", ttlMs);
  } catch {
    // ignore cache set failures
  }
}

export async function cacheDel(key: string): Promise<void> {
  MEM_CACHE.delete(key);
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch {
    // ignore cache delete failures
  }
}

export async function cacheDelPrefix(prefix: string): Promise<void> {
  for (const k of Array.from(MEM_CACHE.keys())) {
    if (k.startsWith(prefix)) MEM_CACHE.delete(k);
  }
  const r = getRedis();
  if (!r) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = (await r.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200)) as [string, string[]];
      cursor = next;
      if (keys.length) {
        await r.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // ignore scan/delete failures
  }
}
