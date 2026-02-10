import { AsyncLocalStorage } from "node:async_hooks";

export type RequestMetrics = {
  start: number;
  dbMs: number;
  dbCount: number;
  cacheHits: number;
  cacheMisses: number;
  cacheWrites: number;
};

export const metricsStore = new AsyncLocalStorage<RequestMetrics>();

export function getRequestMetrics(): RequestMetrics | undefined {
  return metricsStore.getStore();
}

export function recordCacheHit() {
  const m = getRequestMetrics();
  if (m) m.cacheHits += 1;
}

export function recordCacheMiss() {
  const m = getRequestMetrics();
  if (m) m.cacheMisses += 1;
}

export function recordCacheWrite() {
  const m = getRequestMetrics();
  if (m) m.cacheWrites += 1;
}
