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
type Shopper = { email: string; roles: string[]; groups: string[] };
const shoppers = new Map<string, { at: number; ok: boolean } & Shopper>();
/** After a shopper's roles, groups or account changed: they are read again on their next request. */
export function forgetShoppers() {
  shoppers.clear();
}
/**
 * The shopper's email (the one they sign in with, in small letters), roles and groups (lib/shopperRoles.ts) when the
 * account is active; else null.
 */
async function shopperActive(id: string): Promise<Shopper | null> {
  const known = shoppers.get(id);
  if (known && Date.now() - known.at < SHOPPER_TTL_MS) return known.ok ? { email: known.email, roles: known.roles, groups: known.groups } : null;
  const user = await prisma.user.findUnique({ where: { id }, select: { status: true, email: true, roles: true, groups: true } });
  const ok = user?.status === "ACTIVE";
  const me: Shopper = { email: (user?.email ?? "").trim().toLowerCase(), roles: user?.roles ?? [], groups: user?.groups ?? [] };
  shoppers.set(id, { at: Date.now(), ok, ...me });
  if (shoppers.size > 5000) shoppers.clear();
  return ok ? me : null;
}

/** The signed-in shopper, when the request carries one's token, accounts are on and the account is active; else nobody. */
async function shopperOf(req: Request): Promise<({ id: string } & Shopper) | null> {
  const token = bearerOf(req);
  if (!token || token.startsWith(KEY_MARK)) return null;
  try {
    const id = verifyCustomerToken(token).sub;
    if (!(await customerAccountsOn())) return null;
    const me = await shopperActive(id);
    return me === null ? null : { id, ...me };
  } catch {
    // Not a shopper's token (an admin's, an old one): the request is anyone's.
    return null;
  }
}

/**
 * `email`: the signed-in shopper's own (rows that point at it are theirs to read: lib/dataApi.ts); `roles` and
 * `groups`: what the owner gave them (lib/shopperRoles.ts).
 */
export type Caller = { key: KeyLite | null; customer: string | null; email: string | null; roles: string[]; groups: string[] };
export const callerOf = (req: Request): Caller => ({ key: req.apiKey ?? null, customer: req.customer?.id ?? null, email: req.customer?.email || null, roles: req.customer?.roles ?? [], groups: req.customer?.groups ?? [] });

/** Sets `req.customer` and `req.apiKey`; a key's own requests a minute are counted here. */
export const apiCaller = asyncHandler(async (req: Request, res: Response, next: () => void) => {
  // What these doors answer changes under the same address: nothing here is kept by a cache on the way.
  res.setHeader("Cache-Control", "no-store");
  // A page on another address (the admin's try-it panel, the shop) may read these.
  res.setHeader("Access-Control-Expose-Headers", "X-RateLimit-Key-Limit, X-RateLimit-Key-Remaining, X-RateLimit-Key-Reset, Retry-After");
  const shopper = await shopperOf(req);
  if (shopper) req.customer = shopper;
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
