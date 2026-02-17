import type { RequestHandler } from "express";
import { performance } from "node:perf_hooks";
import { metricsStore, type RequestMetrics } from "../lib/requestMetrics.js";

export const requestMetrics: RequestHandler = (req, res, next) => {
  const start = performance.now();
  const metrics: RequestMetrics = {
    start,
    dbMs: 0,
    dbCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheWrites: 0,
  };

  metricsStore.run(metrics, () => {
    const originalEnd = res.end;
    // Attach Server-Timing right before headers are sent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).end = function patchedEnd(...args: any[]) {
      const m = metricsStore.getStore();
      if (m) {
        const total = performance.now() - m.start;
        const serverTiming = [
          `app;dur=${total.toFixed(1)}`,
          `db;dur=${m.dbMs.toFixed(1)};desc="queries=${m.dbCount}"`,
          `cache;desc="hit=${m.cacheHits},miss=${m.cacheMisses},set=${m.cacheWrites}"`,
        ];
        try {
          res.setHeader("Server-Timing", serverTiming.join(", "));
        } catch {
          // ignore if headers already sent
        }
      }
      return originalEnd.apply(this, args as any);
    };

    res.on("finish", () => {
      const m = metricsStore.getStore();
      const total = performance.now() - start;
      const dbMs = m?.dbMs ?? 0;
      const dbCount = m?.dbCount ?? 0;
      const cacheHits = m?.cacheHits ?? 0;
      const cacheMisses = m?.cacheMisses ?? 0;
      const cacheWrites = m?.cacheWrites ?? 0;
      console.log(
        `[req] ${req.method} ${req.originalUrl} ${res.statusCode} ${total.toFixed(1)}ms db=${dbMs.toFixed(
          1
        )}ms q=${dbCount} cache=${cacheHits}/${cacheMisses} set=${cacheWrites}`
      );
    });

    next();
  });
};
