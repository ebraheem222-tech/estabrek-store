import type { RequestHandler } from "express";
import { env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const httpsOnly: RequestHandler = (req, res, next) => {
  if (!env.ENFORCE_HTTPS) return next();

  const forwarded = req.headers["x-forwarded-proto"]?.toString() || req.protocol;
  const proto = forwarded.split(",")[0]?.trim().toLowerCase();

  if (proto === "https") {
    if (env.HSTS_MAX_AGE > 0) {
      res.setHeader("Strict-Transport-Security", `max-age=${env.HSTS_MAX_AGE}; includeSubDomains`);
    }
    return next();
  }

  const host = req.headers["x-forwarded-host"]?.toString() || req.get("host");
  if (!host) return res.status(400).json({ error: "HTTPS_REQUIRED" });

  const url = `https://${host}${req.originalUrl}`;
  if (SAFE_METHODS.has(req.method)) {
    return res.redirect(301, url);
  }

  return res.status(403).json({ error: "HTTPS_REQUIRED" });
};
