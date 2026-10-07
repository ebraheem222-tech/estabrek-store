import type { RequestHandler } from "express";
import { verifyCustomerToken } from "../config/security.js";
import { customerAccountsOn } from "../lib/features.js";

/**
 * Shopper accounts. `Authorization: Bearer <customer token>` (15-minute token
 * from /v1/customer/auth). Admin tokens are not accepted here, and customer
 * tokens are not accepted by the admin.
 */
declare module "express-serve-static-core" {
  interface Request {
    customer?: { id: string };
  }
}

function tokenOf(header: string | undefined) {
  const h = header || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export const authenticateCustomer: RequestHandler = (req, res, next) => {
  const token = tokenOf(req.headers.authorization);
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });
  try {
    req.customer = { id: verifyCustomerToken(token).sub };
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
};

/**
 * Shopper accounts are a switch in the admin (Settings → حسابات الزبائن), off by
 * default. While off the store is visitors only: /v1/customer answers 404
 * FEATURE_OFF (signing out still works, so an old session can be ended).
 */
export const requireCustomerAccounts: RequestHandler = (req, res, next) => {
  if (req.path === "/auth/logout") return next();
  customerAccountsOn().then(
    (on) => (on ? next() : res.status(404).json({ error: "FEATURE_OFF", message: "Customer accounts are turned off" })),
    next,
  );
};

/** Sets req.customer when a valid shopper token is sent (and accounts are on); never blocks (guest checkout). */
export const optionalCustomer: RequestHandler = (req, _res, next) => {
  const token = tokenOf(req.headers.authorization);
  if (!token) return next();
  customerAccountsOn().then(
    (on) => {
      if (on) {
        try {
          req.customer = { id: verifyCustomerToken(token).sub };
        } catch {
          /* an expired token just means a guest order */
        }
      }
      next();
    },
    () => next(),
  );
};
