import type { RequestHandler } from "express";
import { maintenanceOn } from "../lib/features.js";

/**
 * Maintenance mode: while it's on, public changes (orders, checkout, sign-ups,
 * shopper sign-in) answer 503 MAINTENANCE. Reading still works, and so do the
 * admin, admin sign-in, payment webhooks, the stop link of alert emails and
 * downloads from the private order page.
 */
const OPEN = ["/v1/admin", "/v1/auth", "/v1/webhooks", "/v1/stock-alerts/stop", "/v1/orders/access"];

export const maintenanceGuard: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (!req.path.startsWith("/v1/") || OPEN.some((p) => req.path === p || req.path.startsWith(`${p}/`))) return next();
  maintenanceOn().then(
    (on) => (on ? res.status(503).setHeader("Retry-After", "600").json({ error: "MAINTENANCE", message: "The store is under maintenance; back soon" }) : next()),
    () => next(),
  );
};
