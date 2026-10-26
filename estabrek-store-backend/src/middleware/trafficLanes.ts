import type { RequestHandler, Response } from "express";
import { normalizeIp } from "../utils/ip.js";
import { lanes, laneOf, trafficConfig, type LaneName } from "../lib/traffic.js";
import { peekCachedAnswer } from "../lib/cache.js";
import { cacheKeyOf } from "./responseCache.js";

/**
 * Puts every request in its lane (lib/traffic.ts): it starts at once when its
 * lane has room, or waits its turn. Waiting too long, or a full queue, answers
 * 503 "busy" with Retry-After — or, for a page the cache still holds (even an
 * older copy), that copy (X-Cache: STALE-BUSY), so the shopper still sees it.
 * Health checks and preflights skip the lanes.
 */
function busy(req: Parameters<RequestHandler>[0], res: Response, lane: LaneName) {
  if (res.headersSent) return;
  if (req.method === "GET") {
    const cached = peekCachedAnswer(cacheKeyOf(req));
    if (cached) {
      lanes.noteStale(lane);
      res.setHeader("X-Cache", "STALE-BUSY");
      return res.status(cached.status ?? 200).type("application/json").send(cached.body);
    }
  }
  res.setHeader("Retry-After", "2");
  res.status(503).json({ error: "BUSY", message: "The shop is very busy, try again in a moment", lane });
}

export const trafficLanes: RequestHandler = (req, res, next) => {
  if (req.method === "OPTIONS" || req.path === "/health" || req.path === "/") return next();
  const config = trafficConfig();
  if (config.mode === "off") return next();
  const lane = laneOf(req.method, req.path, req.query as Record<string, unknown>, config.routes);
  res.locals.lane = lane;
  res.locals.laneWaitMs = 0;
  let release: (() => void) | null = null;
  let ended = false;
  const admission = lanes.admit(lane, normalizeIp(String(req.ip ?? "")) || "unknown", {
    start: (waitedMs, done) => {
      release = done;
      res.locals.laneWaitMs = waitedMs;
      if (ended) return done(); // the client left just as its turn came
      next();
    },
    timeout: () => busy(req, res, lane),
    reject: () => busy(req, res, lane),
  });
  const end = () => {
    if (ended) return;
    ended = true;
    admission.cancel();
    release?.();
  };
  res.on("finish", end);
  res.on("close", end);
};
