/**
 * A counter with a window, for limits that belong to one thing (an API key, a visitor writing to
 * one table) rather than to every request (middleware/rateLimit.ts does those). Counted in Redis
 * when the server's limits are (several servers then share one count), else in memory.
 */
import { env } from "../config/env.js";
import { getRedis } from "./redis.js";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let sweptAt = 0;

const LUA = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

function local(name: string, windowMs: number, now: number) {
  if (now - sweptAt > 30_000) {
    sweptAt = now;
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size > env.RATE_LIMIT_MEMORY_MAX_KEYS) buckets.clear();
  }
  let b = buckets.get(name);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(name, b);
  }
  b.count += 1;
  return { count: b.count, resetAt: b.resetAt };
}

/** One more for `name`: how many in its window so far, and when the window ends. */
export async function hit(name: string, windowMs: number, now = Date.now()): Promise<{ count: number; resetAt: number }> {
  const redis = env.RATE_LIMIT_USE_REDIS && env.REDIS_URL ? getRedis() : null;
  if (!redis) return local(name, windowMs, now);
  try {
    const out = (await redis.eval(LUA, 1, `${env.REDIS_KEY_PREFIX}:hit:${name}`, windowMs)) as [number, number];
    return { count: Number(out?.[0] ?? 0), resetAt: now + Number(out?.[1] ?? windowMs) };
  } catch {
    return local(name, windowMs, now);
  }
}

/** For tests: every count forgotten. */
export function forgetHits() {
  buckets.clear();
}
