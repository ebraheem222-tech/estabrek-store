// src/middleware/auth.ts
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../config/security.js";

/**
 * Auth that supports:
 *  - normal Bearer JWTs in prod
 *  - test/dev bypass when TEST_BYPASS_AUTH=true or NODE_ENV=test
 *  - optional header "x-test-bypass: 1" during local testing
 */
export const authenticate: RequestHandler = (req, res, next) => {
  const envAllowsBypass =
    env.NODE_ENV !== "production" &&
    (process.env.TEST_BYPASS_AUTH === "true" || env.NODE_ENV === "test");
  const headerBypass = req.headers["x-test-bypass"] === "1";
  const testBypass = envAllowsBypass && (env.NODE_ENV === "test" || headerBypass || process.env.TEST_BYPASS_AUTH === "true");

  if (testBypass) {
    // You can tweak the role via header if you like:
    const role =
      (req.headers["x-mock-role"] as string) === "SUPERADMIN"
        ? "SUPERADMIN"
        : "SUPERADMIN";
    req.user = { sub: "test-superadmin", role, email: "test@local" };
    return next();
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { sub, role, email }
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
};

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });
  if (req.user.role !== "SUPERADMIN") return res.status(403).json({ error: "FORBIDDEN" });
  next();
};
