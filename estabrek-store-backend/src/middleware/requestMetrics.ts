import type { RequestHandler } from "express";
import { performance } from "node:perf_hooks";
import { metricsStore, type RequestMetrics } from "../lib/requestMetrics.js";
import { noteRequest, routeKeyOf } from "../lib/observability.js";
import { trafficConfig } from "../lib/traffic.js";

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
        const waited = Number(res.locals?.laneWaitMs) || 0;
        const serverTiming = [
          `app;dur=${total.toFixed(1)}`,
          ...(res.locals?.lane ? [`lane;desc="${res.locals.lane}";dur=${waited.toFixed(1)}`] : []),
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
      // The route pattern (GET /v1/catalog/products/:id) while it's still known.
      const pattern = req.route ? `${req.baseUrl ?? ""}${String(req.route.path)}` : null;
      noteRequest(
        {
          method: req.method,
          route: routeKeyOf(req.method, pattern, req.originalUrl || req.url),
          path: req.originalUrl || req.url,
          status: res.statusCode,
          ms: total,
          waitedMs: Number(res.locals?.laneWaitMs) || 0,
          dbMs: m?.dbMs ?? 0,
          dbCount: m?.dbCount ?? 0,
          cacheHit: String(res.getHeader("X-Cache") ?? "").startsWith("HIT") || String(res.getHeader("X-Cache") ?? "").startsWith("STALE"),
          lane: (res.locals?.lane as string | undefined) ?? null,
          error: (res.locals?.errorMessage as string | undefined) ?? null,
        },
        trafficConfig().slowMs,
      );
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
