import type { RequestHandler } from "express";
import type { Request } from "express-serve-static-core";
import { prisma } from "../lib/prisma.js";
import type { AdminAccess } from "../types/auth.js";
import { ALL_PERMISSIONS, OWN_ACCOUNT_PERMISSIONS } from "../modules/admin/permissions.js";
import { policy } from "../lib/securityPolicy.js";

/**
 * Loads what the signed-in admin may do (owner, or a team member's role) and
 * blocks suspended or removed accounts right away, even while their 15-minute
 * access token is still valid. Kept for a few seconds per admin so a busy page
 * doesn't hit the database on every request; changes from the Team page clear it.
 */
const TTL_MS = 10_000;
const cache = new Map<string, { at: number; access: AdminAccess | null; status: string | null }>();

export function invalidateAccess(adminId?: string) {
  if (adminId) cache.delete(adminId);
  else cache.clear();
}

const OWNER_PERMISSIONS = new Set<string>([...ALL_PERMISSIONS, ...OWN_ACCOUNT_PERMISSIONS]);

export async function resolveAccess(adminId: string): Promise<{ access: AdminAccess | null; status: string | null }> {
  const hit = cache.get(adminId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, role: true, status: true, twoFactorEnabled: true, staffRole: { select: { name: true, permissions: true } } },
  });

  let entry: { at: number; access: AdminAccess | null; status: string | null };
  if (!admin) {
    entry = { at: Date.now(), access: null, status: null };
  } else {
    const owner = admin.role === "SUPERADMIN";
    const permissions = owner
      ? OWNER_PERMISSIONS
      : new Set<string>([...(admin.staffRole?.permissions ?? []), ...OWN_ACCOUNT_PERMISSIONS]);
    entry = {
      at: Date.now(),
      status: admin.status,
      access: { adminId: admin.id, email: admin.email, owner, roleName: owner ? null : admin.staffRole?.name ?? null, permissions, twoFactor: admin.twoFactorEnabled },
    };
  }
  cache.set(adminId, entry);
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return entry;
}

/** Must run after `authenticate`. */
export const loadAccess: RequestHandler = (req, res, next) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });

  // Local test bypass: an owner that isn't in the database.
  if (user.bypass) {
    req.access = { adminId: user.sub, email: user.email ?? null, owner: true, roleName: null, permissions: OWNER_PERMISSIONS, twoFactor: true };
    return next();
  }

  resolveAccess(user.sub)
    .then(({ access, status }) => {
      if (!access) return res.status(401).json({ error: "ACCOUNT_NOT_FOUND" });
      if (status !== "ACTIVE") return res.status(403).json({ error: "ACCOUNT_SUSPENDED" });
      req.access = access;
      next();
    })
    .catch(next);
};

export function hasPermission(req: { access?: AdminAccess }, permission: string) {
  return Boolean(req.access?.owner || req.access?.permissions.has(permission));
}

/** Allows the request when the admin has ANY of the given permissions. */
export function requirePermission(...anyOf: string[]): RequestHandler {
  return (req, res, next) => {
    if (!req.access) return res.status(401).json({ error: "UNAUTHORIZED" });
    if (anyOf.some((p) => hasPermission(req, p))) return next();
    return res.status(403).json({ error: "PERMISSION_DENIED", required: anyOf });
  };
}

/**
 * One area of the admin: reading (GET/HEAD) needs `read`, anything else needs
 * `write`. Each may list several permissions, any of which is enough.
 * `extra` adds a stricter check for some requests (e.g. publishing a page).
 */
export function areaAccess(opts: {
  read: string | string[];
  write: string | string[];
  extra?: (req: Request) => string | null | Promise<string | null>;
}): RequestHandler {
  const read = ([] as string[]).concat(opts.read);
  const write = ([] as string[]).concat(opts.write);
  return (req, res, next) => {
    if (!req.access) return res.status(401).json({ error: "UNAUTHORIZED" });
    const reading = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
    const need = reading ? read : write;
    if (!need.some((p) => hasPermission(req, p))) {
      return res.status(403).json({ error: "PERMISSION_DENIED", required: need });
    }
    if (!opts.extra || req.access.owner) return next();
    Promise.resolve(opts.extra(req))
      .then((more) => {
        if (more && !hasPermission(req, more)) {
          return res.status(403).json({ error: "PERMISSION_DENIED", required: [more] });
        }
        next();
      })
      .catch(next);
  };
}

/** Does the policy ask this admin to use two-step sign-in? */
export function twoFactorRequiredFor(access: Pick<AdminAccess, "owner">) {
  const rule = policy().twoFactor.required;
  return rule === "everyone" || (rule === "owners" && access.owner);
}

/**
 * When the policy requires two-step sign-in and this admin hasn't turned it on,
 * only their own account pages work (where they set it up). Admin router only.
 */
export const requireTwoFactorSetup: RequestHandler = (req, res, next) => {
  const access = req.access;
  if (!access || access.twoFactor || !twoFactorRequiredFor(access)) return next();
  if (req.path === "/account" || req.path.startsWith("/account/")) return next();
  return res.status(403).json({ error: "MFA_SETUP_REQUIRED" });
};
