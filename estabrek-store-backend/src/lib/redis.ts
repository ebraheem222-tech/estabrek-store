import { Redis } from "ioredis";
import { env } from "../config/env.js";

let redis: Redis | null = null;

export function getRedis() {
  if (!env.REDIS_URL) return null;
  if (!redis) {
    const instance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    instance.on("error", (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[redis] error:", message);
    });
    redis = instance;
  }
  return redis;
}

export async function closeRedis() {
  if (!redis) return;
  try {
    await redis.quit();
  } catch {
    try {
      redis.disconnect();
    } catch {
      // ignore
    }
  } finally {
    redis = null;
  }
}
