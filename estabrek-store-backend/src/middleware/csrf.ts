import crypto from "crypto";
import type { RequestHandler, Response } from "express";
import { env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getHeaderName() {
  return env.CSRF_HEADER_NAME.toLowerCase();
}

export function issueCsrfToken(res: Response) {
  const token = crypto.randomBytes(32).toString("hex");
  const maxAgeMs = env.CSRF_TOKEN_TTL_MINUTES * 60 * 1000;
  const secure = env.CSRF_COOKIE_SECURE || env.ENFORCE_HTTPS;
  res.cookie(env.CSRF_COOKIE_NAME, token, {
    httpOnly: !!env.CSRF_COOKIE_HTTP_ONLY,
    sameSite: env.CSRF_COOKIE_SAMESITE,
    secure: !!secure,
    maxAge: maxAgeMs,
    path: "/",
  });
  return token;
}

export const csrfGuard: RequestHandler = (req, res, next) => {
  if (!env.CSRF_TOKEN_ENABLED) return next();
  if (SAFE_METHODS.has(req.method)) return next();

  const hasCookies = Boolean(req.headers.cookie);
  const tokenCookie = (req.cookies as Record<string, string> | undefined)?.[env.CSRF_COOKIE_NAME];

  if (!tokenCookie) {
    if (env.CSRF_STRICT && hasCookies) {
      return res.status(403).json({ error: "CSRF_MISSING" });
    }
    return next();
  }

  const headerName = getHeaderName();
  const tokenHeader = req.headers[headerName]?.toString();
  if (!tokenHeader || tokenHeader !== tokenCookie) {
    return res.status(403).json({ error: "CSRF_INVALID" });
  }

  return next();
};
