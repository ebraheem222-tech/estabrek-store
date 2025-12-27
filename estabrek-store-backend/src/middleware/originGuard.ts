import type { RequestHandler } from "express";
import { corsOrigins, env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isOriginAllowed(origin: string) {
  if (corsOrigins === "*") return true;
  return corsOrigins.some((rule) => {
    if (typeof rule === "string") return rule === origin;
    return rule.test(origin);
  });
}

export const originGuard: RequestHandler = (req, res, next) => {
  if (!env.CSRF_ORIGIN_CHECK) return next();
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin?.toString();
  if (origin) {
    if (!isOriginAllowed(origin)) {
      return res.status(403).json({ error: "BAD_ORIGIN" });
    }
    return next();
  }

  const referer = req.headers.referer?.toString();
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!isOriginAllowed(refOrigin)) {
        return res.status(403).json({ error: "BAD_ORIGIN" });
      }
    } catch {
      return res.status(403).json({ error: "BAD_ORIGIN" });
    }
  }

  return next();
};
