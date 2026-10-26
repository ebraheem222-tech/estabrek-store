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

function isExtraOriginAllowed(origin: string) {
  const o = origin.toLowerCase();
  if (o.endsWith(".pages.dev")) return true;
  if (o.startsWith("http://localhost") || o.startsWith("http://127.0.0.1")) return true;
  return false;
}

export const originGuard: RequestHandler = (req, res, next) => {
  if (!env.CSRF_ORIGIN_CHECK) return next();
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin?.toString();
  if (origin) {
    if (!isOriginAllowed(origin) && !isExtraOriginAllowed(origin)) {
      return res.status(403).json({ error: "BAD_ORIGIN" });
    }
    return next();
  }

  const referer = req.headers.referer?.toString();
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!isOriginAllowed(refOrigin) && !isExtraOriginAllowed(refOrigin)) {
        return res.status(403).json({ error: "BAD_ORIGIN" });
      }
    } catch {
      return res.status(403).json({ error: "BAD_ORIGIN" });
    }
  }

  return next();
};
