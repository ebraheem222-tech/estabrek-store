// src/middleware/auth.ts
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../config/security.js";

/**
 * Auth that supports:
 *  - normal Bearer JWTs in prod
 *  - test/dev bypass when TEST_BYPASS_AUTH=true or NODE_ENV=test
 *  - optional header "x-test-bypass: 1" during local testing
 *
 * A real Bearer token always wins over the bypass, so tests can sign in as a
 * team member. The bypass never runs in production.
 */
export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  const envAllowsBypass =
    env.NODE_ENV !== "production" &&
    (process.env.TEST_BYPASS_AUTH === "true" || env.NODE_ENV === "test");
  const headerBypass = req.headers["x-test-bypass"] === "1";
  const testBypass =
    !token && envAllowsBypass && (env.NODE_ENV === "test" || headerBypass || process.env.TEST_BYPASS_AUTH === "true");

  if (testBypass) {
    req.user = { sub: "test-superadmin", role: "SUPERADMIN", email: "test@local", bypass: true };
    return next();
  }

  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    const payload = verifyAccessToken(token);
    req.user = { sub: payload.sub, role: payload.role, email: payload.email }; // never trust a "bypass" claim
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
};

/**
 * Owners only (role SUPERADMIN). Admin routes use `loadAccess` + permissions
 * instead (see middleware/access.ts); this stays for owner-only actions.
 */
export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });
  if (req.user.role !== "SUPERADMIN") return res.status(403).json({ error: "FORBIDDEN" });
  next();
};
