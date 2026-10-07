import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { invalidateAccess } from "../../middleware/access.js";
import type { AdminAccess } from "../../types/auth.js";
import { ALL_PERMISSIONS, cleanPermissions } from "./permissions.js";
import { emailConfigured, sendEmail } from "../outbox/sender/email.js";
import { adminPasswordLink } from "../outbox/sender/links.js";

/**
 * Team & permissions: team members (role STAFF) with a StaffRole, and owners
 * (role SUPERADMIN) who can do everything.
 *
 * Rules that keep the store safe:
 *  - nobody changes their own role, status or access here (no self-promotion);
 *  - only owners can add, change or remove owners;
 *  - a member can only hand out permissions they hold themselves;
 *  - the last active owner can't be suspended or made a team member.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 24 * 60 * 60 * 1000;

const fail = (status: number, code: string, message: string) => new AppError(status, code, message);

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function holdsAll(actor: AdminAccess, permissions: string[]) {
  return actor.owner || permissions.every((p) => actor.permissions.has(p));
}

function ensureCanGrant(actor: AdminAccess, permissions: string[]) {
  if (!holdsAll(actor, permissions)) {
    const missing = permissions.filter((p) => !actor.permissions.has(p));
    throw new AppError(403, "CANNOT_GRANT", "You can only give permissions you have yourself", { missing });
  }
}

const memberSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  lastIp: true,
  createdAt: true,
  staffRole: { select: { id: true, name: true } },
} as const;

type MemberRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  lastIp: string | null;
  createdAt: Date;
  staffRole: { id: string; name: string } | null;
};

function toMember(m: MemberRow, activeSessions = 0) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    owner: m.role === "SUPERADMIN",
    status: m.status,
    staffRole: m.staffRole,
    twoFactorEnabled: m.twoFactorEnabled,
    lastLoginAt: m.lastLoginAt,
    lastIp: m.lastIp,
    createdAt: m.createdAt,
    activeSessions,
  };
}

async function activeSessionCounts(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await prisma.adminSession.groupBy({
    by: ["adminUserId"],
    where: { adminUserId: { in: ids }, status: "ACTIVE", expiresAt: { gt: new Date() } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.adminUserId, r._count._all]));
}

async function activeOwnerCount() {
  return prisma.adminUser.count({ where: { role: "SUPERADMIN", status: "ACTIVE" } });
}

async function revokeAllSessions(adminUserId: string, reason: string) {
  await prisma.adminSession.updateMany({
    where: { adminUserId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date(), revocationReason: reason },
  });
}

/** A one-time link token (invite or password reset), stored like a password reset. */
async function issueLinkToken(adminUserId: string, ttlMs: number, ctx?: { ip?: string; ua?: string }) {
  // Older unused links for this member stop working.
  await prisma.adminPasswordReset.updateMany({
    where: { adminUserId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });
  const tokenId = b64url(randomBytes(12));
  const secret = b64url(randomBytes(24));
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.adminPasswordReset.create({
    data: {
      adminUserId,
      tokenId,
      tokenHash: await argon2.hash(secret, { type: argon2.argon2id }),
      expiresAt,
      requesterIp: ctx?.ip,
      requesterUa: ctx?.ua,
    },
  });
  return { token: `${tokenId}.${secret}`, expiresAt };
}

/** Emails the invite / reset link to the member when email and ADMIN_APP_URL are set up. */
async function emailLink(to: { email: string; name: string }, token: string, kind: "invite" | "reset") {
  const url = adminPasswordLink(token, kind);
  if (!url || !emailConfigured()) return false;
  const out = await sendEmail({
    to: to.email,
    template: kind === "invite" ? "ADMIN_INVITE" : "ADMIN_PASSWORD_RESET",
    payload: { name: to.name, url, hours: 24 },
  });
  return out.ok;
}

/* ============================== Roles ============================== */

export async function listRoles() {
  const roles = await prisma.staffRole.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: cleanPermissions(r.permissions),
    members: r._count.members,
    updatedAt: r.updatedAt,
  }));
}

export async function createRole(actor: AdminAccess, input: { name: string; description?: string | null; permissions: string[] }) {
  const permissions = cleanPermissions(input.permissions);
  ensureCanGrant(actor, permissions);
  const exists = await prisma.staffRole.findUnique({ where: { name: input.name } });
  if (exists) throw fail(409, "ROLE_NAME_TAKEN", "A role with this name already exists");
  const role = await prisma.staffRole.create({
    data: { name: input.name, description: input.description ?? null, permissions },
  });
  return { ...role, permissions, members: 0 };
}

export async function updateRole(
  actor: AdminAccess,
  id: string,
  input: { name?: string; description?: string | null; permissions?: string[] },
) {
  const role = await prisma.staffRole.findUnique({ where: { id } });
  if (!role) throw NotFound("Role not found");
  if (!actor.owner) {
    const mine = await prisma.adminUser.findUnique({ where: { id: actor.adminId }, select: { staffRoleId: true } });
    if (mine?.staffRoleId === id) throw fail(403, "OWN_ROLE", "You can't change your own role");
  }
  const data: { name?: string; description?: string | null; permissions?: string[] } = {};
  if (input.name !== undefined && input.name !== role.name) {
    const taken = await prisma.staffRole.findUnique({ where: { name: input.name } });
    if (taken) throw fail(409, "ROLE_NAME_TAKEN", "A role with this name already exists");
    data.name = input.name;
  }
  if (input.description !== undefined) data.description = input.description;
  if (input.permissions !== undefined) {
    const next = cleanPermissions(input.permissions);
    // Adding needs the actor to hold it; removing something the actor lacks is blocked too
    // (otherwise a member could strip a stronger role they can't see into).
    const before = new Set(cleanPermissions(role.permissions));
    const touched = ALL_PERMISSIONS.filter((p) => before.has(p) !== next.includes(p));
    ensureCanGrant(actor, touched);
    data.permissions = next;
  }
  const updated = await prisma.staffRole.update({
    where: { id },
    data,
    include: { _count: { select: { members: true } } },
  });
  invalidateAccess();
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    permissions: cleanPermissions(updated.permissions),
    members: updated._count.members,
    updatedAt: updated.updatedAt,
  };
}

export async function deleteRole(actor: AdminAccess, id: string) {
  const role = await prisma.staffRole.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
  if (!role) throw NotFound("Role not found");
  if (role._count.members > 0) throw fail(409, "ROLE_IN_USE", "Move the members to another role first");
  ensureCanGrant(actor, cleanPermissions(role.permissions));
  await prisma.staffRole.delete({ where: { id } });
  return { ok: true as const };
}

/* ============================== Members ============================== */

export async function listMembers() {
  const rows = await prisma.adminUser.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: memberSelect,
  });
  const counts = await activeSessionCounts(rows.map((r) => r.id));
  return rows.map((r) => toMember(r as MemberRow, counts.get(r.id) ?? 0));
}

export async function getMember(id: string) {
  const m = await prisma.adminUser.findUnique({ where: { id }, select: memberSelect });
  if (!m) throw NotFound("Member not found");
  const [sessions, events, activity] = await Promise.all([
    prisma.adminSession.findMany({
      where: { adminUserId: id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, ip: true, userAgent: true, createdAt: true, updatedAt: true, expiresAt: true },
    }),
    prisma.adminSecurityEvent.findMany({
      where: { adminUserId: id },
      orderBy: { at: "desc" },
      take: 20,
      select: { id: true, type: true, ip: true, userAgent: true, at: true },
    }),
    prisma.adminAuditLog.findMany({
      where: { adminUserId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, area: true, verb: true, method: true, path: true, targetId: true, createdAt: true, ip: true },
    }),
  ]);
  return { member: toMember(m as MemberRow, sessions.length), sessions, events, activity };
}

export async function inviteMember(
  actor: AdminAccess,
  input: { name: string; email: string; phone?: string | null; staffRoleId?: string | null; owner?: boolean },
  ctx?: { ip?: string; ua?: string },
) {
  const email = input.email.trim().toLowerCase();
  const owner = input.owner === true;
  if (owner && !actor.owner) throw fail(403, "OWNERS_ONLY", "Only an owner can add another owner");

  let staffRoleId: string | null = null;
  if (!owner) {
    if (!input.staffRoleId) throw fail(400, "ROLE_REQUIRED", "Pick a role for the new member");
    const role = await prisma.staffRole.findUnique({ where: { id: input.staffRoleId } });
    if (!role) throw fail(400, "ROLE_NOT_FOUND", "This role no longer exists");
    ensureCanGrant(actor, cleanPermissions(role.permissions));
    staffRoleId = role.id;
  }

  const taken = await prisma.adminUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (taken) throw fail(409, "EMAIL_TAKEN", "This email already has an account");

  // No usable password until they open the invite link.
  const passwordHash = await argon2.hash(b64url(randomBytes(32)), { type: argon2.argon2id });
  const created = await prisma.adminUser.create({
    data: {
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      passwordHash,
      role: owner ? "SUPERADMIN" : "STAFF",
      status: "INVITED",
      staffRoleId,
      invitedById: actor.adminId,
    },
    select: memberSelect,
  });
  const invite = await issueLinkToken(created.id, INVITE_TTL_MS, ctx);
  const emailed = await emailLink(created, invite.token, "invite");
  return { member: toMember(created as MemberRow), invite: { ...invite, kind: "invite" as const, emailed } };
}

export async function updateMember(
  actor: AdminAccess,
  id: string,
  input: { name?: string; phone?: string | null; staffRoleId?: string | null; status?: "ACTIVE" | "SUSPENDED"; owner?: boolean },
) {
  if (id === actor.adminId) throw fail(400, "SELF_CHANGE", "Change your own details from your profile page");
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { ...memberSelect, staffRoleId: true } });
  if (!target) throw NotFound("Member not found");

  const targetIsOwner = target.role === "SUPERADMIN";
  if (targetIsOwner && !actor.owner) throw fail(403, "OWNERS_ONLY", "Only an owner can change another owner");
  if (input.owner !== undefined && input.owner !== targetIsOwner && !actor.owner) {
    throw fail(403, "OWNERS_ONLY", "Only an owner can make someone an owner");
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;

  const willBeOwner = input.owner ?? targetIsOwner;
  if (input.owner !== undefined && input.owner !== targetIsOwner) data.role = input.owner ? "SUPERADMIN" : "STAFF";

  if (!willBeOwner) {
    const nextRoleId = input.staffRoleId !== undefined ? input.staffRoleId : target.staffRoleId;
    if (!nextRoleId) throw fail(400, "ROLE_REQUIRED", "Pick a role for this member");
    if (input.staffRoleId !== undefined && input.staffRoleId !== target.staffRoleId) {
      const role = await prisma.staffRole.findUnique({ where: { id: nextRoleId } });
      if (!role) throw fail(400, "ROLE_NOT_FOUND", "This role no longer exists");
      ensureCanGrant(actor, cleanPermissions(role.permissions));
      // Moving someone off a role the actor couldn't grant is also blocked.
      if (target.staffRoleId) {
        const current = await prisma.staffRole.findUnique({ where: { id: target.staffRoleId } });
        if (current) ensureCanGrant(actor, cleanPermissions(current.permissions));
      }
    }
    data.staffRoleId = nextRoleId;
  }

  let suspend = false;
  if (input.status !== undefined && input.status !== target.status) {
    if (input.status === "SUSPENDED") {
      // An invite nobody used yet is removed instead (so "suspended" always means someone who had joined).
      if (target.status === "INVITED") throw fail(409, "USE_REMOVE", "This invite hasn't been used; remove it instead");
      suspend = true;
      data.status = "SUSPENDED";
    } else if (target.status === "SUSPENDED") {
      data.status = "ACTIVE";
    }
  }

  // The store must always keep one active owner.
  const losesOwner = targetIsOwner && target.status === "ACTIVE" && (data.role === "STAFF" || suspend);
  if (losesOwner && (await activeOwnerCount()) <= 1) {
    throw fail(409, "LAST_OWNER", "The store needs at least one active owner");
  }

  const updated = await prisma.adminUser.update({ where: { id }, data, select: memberSelect });
  if (suspend || data.role !== undefined) await revokeAllSessions(id, suspend ? "suspended" : "access_changed");
  invalidateAccess(id);
  const counts = await activeSessionCounts([id]);
  return toMember(updated as MemberRow, counts.get(id) ?? 0);
}

/** A fresh invite link (not joined yet) or a password-reset link (joined). */
export async function memberLink(actor: AdminAccess, id: string, ctx?: { ip?: string; ua?: string }) {
  if (id === actor.adminId) throw fail(400, "SELF_CHANGE", "Use “forgot password” or your profile page for your own account");
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { role: true, status: true, email: true, name: true } });
  if (!target) throw NotFound("Member not found");
  if (target.role === "SUPERADMIN" && !actor.owner) throw fail(403, "OWNERS_ONLY", "Only an owner can do this for an owner");
  if (target.status === "SUSPENDED") throw fail(409, "SUSPENDED", "Turn the account back on first");
  const kind = target.status === "INVITED" ? ("invite" as const) : ("reset" as const);
  const link = await issueLinkToken(id, kind === "invite" ? INVITE_TTL_MS : RESET_TTL_MS, ctx);
  const emailed = await emailLink(target, link.token, kind);
  return { ...link, kind, emailed };
}

export async function revokeMemberSessions(actor: AdminAccess, id: string) {
  if (id === actor.adminId) throw fail(400, "SELF_CHANGE", "Sign out your other devices from your security page");
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { role: true } });
  if (!target) throw NotFound("Member not found");
  if (target.role === "SUPERADMIN" && !actor.owner) throw fail(403, "OWNERS_ONLY", "Only an owner can do this for an owner");
  const before = await prisma.adminSession.count({ where: { adminUserId: id, status: "ACTIVE" } });
  await revokeAllSessions(id, "revoked_by_admin");
  return { ok: true as const, revoked: before };
}

/** Only an invite that was never used can be removed; anyone who joined is suspended instead (their history stays). */
export async function removeInvite(actor: AdminAccess, id: string) {
  const target = await prisma.adminUser.findUnique({ where: { id }, select: { role: true, status: true, lastLoginAt: true } });
  if (!target) throw NotFound("Member not found");
  if (target.role === "SUPERADMIN" && !actor.owner) throw fail(403, "OWNERS_ONLY", "Only an owner can do this for an owner");
  if (target.status !== "INVITED" || target.lastLoginAt) {
    throw fail(409, "USE_SUSPEND", "This member has joined; suspend the account instead");
  }
  await prisma.adminUser.delete({ where: { id } });
  invalidateAccess(id);
  return { ok: true as const };
}

/* ============================== Activity ============================== */

export async function listActivity(query: { take?: number; cursor?: string; adminUserId?: string; area?: string }) {
  const take = Math.min(100, Math.max(1, Number(query.take) || 50));
  const where: Record<string, unknown> = {};
  if (query.adminUserId) where.adminUserId = query.adminUserId;
  if (query.area) where.area = query.area;
  const rows = await prisma.adminAuditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      area: true,
      verb: true,
      method: true,
      path: true,
      targetId: true,
      fields: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      actorEmail: true,
      adminUser: { select: { id: true, name: true, email: true } },
    },
  });
  const nextCursor = rows.length > take ? rows[take - 1].id : null;
  return { rows: rows.slice(0, take), nextCursor };
}
