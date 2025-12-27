import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { getRedis } from "../lib/redis.js";

type Bucket = { count: number; resetAt: number };

const pathBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();
const authBuckets = new Map<string, Bucket>();

const LUA_INCR_EXPIRE = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

function getBucket(buckets: Map<string, Bucket>, key: string, now: number, ttl: number) {
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + ttl };
    buckets.set(key, b);
  }
  return b;
}

function isAuthPath(path: string) {
  return path.startsWith("/v1/auth");
}

export const rateLimit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || "unknown";

  const useRedis = env.RATE_LIMIT_USE_REDIS && !!env.REDIS_URL;
  const redis = useRedis ? getRedis() : null;

  const runLocal = () => {
    const pathBucket = getBucket(pathBuckets, `${ip}:${req.path}`, now, env.RATE_LIMIT_WINDOW_MS);
    pathBucket.count += 1;

    const ipBucket = getBucket(ipBuckets, ip, now, env.RATE_LIMIT_WINDOW_MS);
    ipBucket.count += 1;

    let authBucket: Bucket | undefined;
    if (isAuthPath(req.path)) {
      authBucket = getBucket(authBuckets, ip, now, env.RATE_LIMIT_AUTH_WINDOW_MS);
      authBucket.count += 1;
    }

    res.setHeader("X-RateLimit-Limit", env.RATE_LIMIT_MAX.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, env.RATE_LIMIT_MAX - pathBucket.count).toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(pathBucket.resetAt / 1000).toString());

    res.setHeader("X-RateLimit-Global-Limit", env.RATE_LIMIT_IP_MAX.toString());
    res.setHeader("X-RateLimit-Global-Remaining", Math.max(0, env.RATE_LIMIT_IP_MAX - ipBucket.count).toString());
    res.setHeader("X-RateLimit-Global-Reset", Math.ceil(ipBucket.resetAt / 1000).toString());

    if (authBucket) {
      res.setHeader("X-RateLimit-Auth-Limit", env.RATE_LIMIT_AUTH_MAX.toString());
      res.setHeader("X-RateLimit-Auth-Remaining", Math.max(0, env.RATE_LIMIT_AUTH_MAX - authBucket.count).toString());
      res.setHeader("X-RateLimit-Auth-Reset", Math.ceil(authBucket.resetAt / 1000).toString());
    }

    if (
      pathBucket.count > env.RATE_LIMIT_MAX ||
      ipBucket.count > env.RATE_LIMIT_IP_MAX ||
      (authBucket && authBucket.count > env.RATE_LIMIT_AUTH_MAX)
    ) {
      const retryAt = Math.max(pathBucket.resetAt, ipBucket.resetAt, authBucket?.resetAt ?? 0);
      return res.status(429).json({ error: "RATE_LIMIT", retryAt });
    }

    return next();
  };

  if (!redis) {
    return runLocal();
  }

  const prefix = `${env.REDIS_KEY_PREFIX}:rl`;
  const pathKey = `${prefix}:path:${ip}:${req.path}`;
  const ipKey = `${prefix}:ip:${ip}`;
  const authKey = `${prefix}:auth:${ip}`;

  const incrWithTtl = async (key: string, ttlMs: number) => {
    const result = (await redis.eval(LUA_INCR_EXPIRE, 1, key, ttlMs)) as [number, number];
    const count = Number(result?.[0] ?? 0);
    const ttl = Number(result?.[1] ?? ttlMs);
    return { count, ttl };
  };

  (async () => {
    try {
      const [pathRes, ipRes, authRes] = await Promise.all([
        incrWithTtl(pathKey, env.RATE_LIMIT_WINDOW_MS),
        incrWithTtl(ipKey, env.RATE_LIMIT_WINDOW_MS),
        isAuthPath(req.path) ? incrWithTtl(authKey, env.RATE_LIMIT_AUTH_WINDOW_MS) : Promise.resolve(null),
      ]);

      const pathResetAt = now + pathRes.ttl;
      const ipResetAt = now + ipRes.ttl;
      const authResetAt = authRes ? now + authRes.ttl : 0;

      res.setHeader("X-RateLimit-Limit", env.RATE_LIMIT_MAX.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, env.RATE_LIMIT_MAX - pathRes.count).toString());
      res.setHeader("X-RateLimit-Reset", Math.ceil(pathResetAt / 1000).toString());

      res.setHeader("X-RateLimit-Global-Limit", env.RATE_LIMIT_IP_MAX.toString());
      res.setHeader("X-RateLimit-Global-Remaining", Math.max(0, env.RATE_LIMIT_IP_MAX - ipRes.count).toString());
      res.setHeader("X-RateLimit-Global-Reset", Math.ceil(ipResetAt / 1000).toString());

      if (authRes) {
        res.setHeader("X-RateLimit-Auth-Limit", env.RATE_LIMIT_AUTH_MAX.toString());
        res.setHeader("X-RateLimit-Auth-Remaining", Math.max(0, env.RATE_LIMIT_AUTH_MAX - authRes.count).toString());
        res.setHeader("X-RateLimit-Auth-Reset", Math.ceil(authResetAt / 1000).toString());
      }

      if (
        pathRes.count > env.RATE_LIMIT_MAX ||
        ipRes.count > env.RATE_LIMIT_IP_MAX ||
        (authRes && authRes.count > env.RATE_LIMIT_AUTH_MAX)
      ) {
        const retryAt = Math.max(pathResetAt, ipResetAt, authResetAt);
        return res.status(429).json({ error: "RATE_LIMIT", retryAt });
      }

      return next();
    } catch (err) {
      console.error("[rateLimit] redis failed, falling back to memory:", err);
      return runLocal();
    }
  })().catch((err) => {
    console.error("[rateLimit] unexpected error:", err);
    return runLocal();
  });
};
