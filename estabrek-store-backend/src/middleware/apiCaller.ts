/**
 * Who is asking, for the doors a program or a shop page comes through (the automatic API under
 * /v1/data, a function's own address under /v1/fn): an API key, a signed-in shopper, or anyone.
 *
 * A key goes in `X-Api-Key: ek_…` (or `Authorization: Bearer ek_…`), never in the address. A
 * signed-in shopper sends their own token in `Authorization: Bearer …` (the one
 * /v1/customer/auth gives). A key that is wrong never falls back to "anyone".
 */
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/async.js";
import { AppError } from "../utils/httpError.js";
import { normalizeIp } from "../utils/ip.js";
import { verifyCustomerToken } from "../config/security.js";
import { KEY_MARK, findKey, keyState, looksLikeKey, touchKey, type KeyLite } from "../lib/apiKeys.js";
import { customerAccountsOn } from "../lib/features.js";
import { hit } from "../lib/hitLimit.js";

declare module "express-serve-static-core" {
  interface Request {
    /** The API key this request came with (checked), or null. */
    apiKey?: KeyLite | null;
  }
}

const MINUTE = 60_000;
export const ipOf = (req: Request) => normalizeIp(req.ip || "") || "unknown";

const bearerOf = (req: Request) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};

function sentKey(req: Request): string | null {
  const own = req.get("x-api-key")?.trim();
  if (own) return own;
  const bearer = bearerOf(req);
  // Other tokens in that header (a shopper's, an admin's) aren't keys.
  return bearer.startsWith(KEY_MARK) ? bearer : null;
}

/* A shopper's account is looked up once every few seconds: one turned off (or deleted) stops being a shopper here at once-ish. */
const SHOPPER_TTL_MS = 10_000;
const shoppers = new Map<string, { at: number; ok: boolean }>();
export function forgetShoppers() {
  shoppers.clear();
}
async function shopperActive(id: string): Promise<boolean> {
  const known = shoppers.get(id);
  if (known && Date.now() - known.at < SHOPPER_TTL_MS) return known.ok;
  const user = await prisma.user.findUnique({ where: { id }, select: { status: true } });
  const ok = user?.status === "ACTIVE";
  shoppers.set(id, { at: Date.now(), ok });
  if (shoppers.size > 5000) shoppers.clear();
  return ok;
}

/** The signed-in shopper, when the request carries one's token, accounts are on and the account is active; else nobody. */
async function shopperOf(req: Request): Promise<string | null> {
  const token = bearerOf(req);
  if (!token || token.startsWith(KEY_MARK)) return null;
  try {
    const id = verifyCustomerToken(token).sub;
    return (await customerAccountsOn()) && (await shopperActive(id)) ? id : null;
  } catch {
    // Not a shopper's token (an admin's, an old one): the request is anyone's.
    return null;
  }
}

export type Caller = { key: KeyLite | null; customer: string | null };
export const callerOf = (req: Request): Caller => ({ key: req.apiKey ?? null, customer: req.customer?.id ?? null });

/** Sets `req.customer` and `req.apiKey`; a key's own requests a minute are counted here. */
export const apiCaller = asyncHandler(async (req: Request, res: Response, next: () => void) => {
  // What these doors answer changes under the same address: nothing here is kept by a cache on the way.
  res.setHeader("Cache-Control", "no-store");
  // A page on another address (the admin's try-it panel, the shop) may read these.
  res.setHeader("Access-Control-Expose-Headers", "X-RateLimit-Key-Limit, X-RateLimit-Key-Remaining, X-RateLimit-Key-Reset, Retry-After");
  const shopper = await shopperOf(req);
  if (shopper) req.customer = { id: shopper };
  const sent = sentKey(req);
  if (!sent) {
    req.apiKey = null;
    return next();
  }
  // A key that is wrong never falls back to "anyone": the caller should know its key doesn't work.
  const key = looksLikeKey(sent) ? await findKey(sent) : null;
  if (!key) throw new AppError(401, "INVALID_KEY", "No such API key");
  const state = keyState(key);
  if (state === "revoked") throw new AppError(401, "KEY_REVOKED", "This API key was revoked");
  if (state === "expired") throw new AppError(401, "KEY_EXPIRED", "This API key has expired");
  const { count, resetAt } = await hit(`key:${key.id}`, MINUTE);
  res.setHeader("X-RateLimit-Key-Limit", String(key.perMinute));
  res.setHeader("X-RateLimit-Key-Remaining", String(Math.max(0, key.perMinute - count)));
  res.setHeader("X-RateLimit-Key-Reset", String(Math.ceil(resetAt / 1000)));
  if (count > key.perMinute) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
    return res.status(429).json({ error: "RATE_LIMIT_KEY", message: "This key's requests for this minute are used up", retryAt: resetAt });
  }
  req.apiKey = key;
  touchKey(key.id, ipOf(req));
  next();
});
