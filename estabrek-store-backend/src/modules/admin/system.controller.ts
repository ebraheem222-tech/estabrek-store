import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { env } from "../../config/env.js";
import { normalizeIp } from "../../utils/ip.js";
import { wouldBlockAdmin } from "../../config/ipAccess.js";
import {
  LIMITS,
  PolicySchema,
  SECTIONS,
  applyPolicy,
  envDefaults,
  mergePolicy,
  policyChanges,
  policyFromDbEnabled,
  type Policy,
} from "../../lib/securityPolicy.js";

/**
 * /v1/admin/system/security — the server & sign-in rules (Security page).
 * Reading needs system:read, changes need system:write (see admin.routes.ts).
 * Every change keeps the previous rules (latest 30) and is in the activity log.
 */
const r = Router();

const KEEP = 30;

async function savedPolicy(): Promise<Policy> {
  const row = await prisma.securityPolicy.findUnique({ where: { id: "default" } });
  return mergePolicy(row?.data);
}

/** The IP this request comes from, as the server sees it. */
function ipOf(req: any) {
  return normalizeIp(String(req.ip ?? ""));
}

/** 10.x, 172.16–31.x, 192.168.x, 100.64–127.x (carrier/proxy), 127.x — i.e. not a visitor's public IP. */
function looksPrivate(ip: string) {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|::1$|fc|fd)/i.test(ip);
}

/** Refuses rules that would lock the person saving them out of the admin. */
function guard(req: any, next: Policy) {
  const access = req.access!;
  const ip = ipOf(req);
  const verdict = wouldBlockAdmin(ip, next.ip);
  if (verdict) {
    throw new AppError(409, verdict, "These IP rules would lock you out of the admin", { yourIp: ip });
  }
  const rule = next.twoFactor.required;
  const applies = rule === "everyone" || (rule === "owners" && access.owner);
  if (applies && !access.twoFactor) {
    throw new AppError(409, "ENABLE_2FA_FIRST", "Turn on two-step sign-in for your own account first");
  }
}

async function save(req: any, next: Policy) {
  const before = await savedPolicy();
  const changed = policyChanges(before, next);
  if (!changed.length) return { policy: before, changed };
  guard(req, next);
  const adminUserId = req.user?.bypass ? null : req.access?.adminId ?? null;
  await prisma.$transaction([
    prisma.securityPolicyRevision.create({ data: { data: before as any, changed, adminUserId } }),
    prisma.securityPolicy.upsert({
      where: { id: "default" },
      create: { id: "default", data: next as any, updatedById: adminUserId },
      update: { data: next as any, updatedById: adminUserId },
    }),
  ]);
  const old = await prisma.securityPolicyRevision.findMany({ orderBy: { createdAt: "desc" }, skip: KEEP, select: { id: true } });
  if (old.length) await prisma.securityPolicyRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  applyPolicy(next);
  return { policy: next, changed };
}

r.get("/security", asyncHandler(async (req, res) => {
  const [current, row, revisions, alerts] = await Promise.all([
    savedPolicy(),
    prisma.securityPolicy.findUnique({ where: { id: "default" }, select: { updatedAt: true, updatedById: true } }),
    prisma.securityPolicyRevision.findMany({ orderBy: { createdAt: "desc" }, take: KEEP, select: { id: true, changed: true, adminUserId: true, createdAt: true } }),
    prisma.adminSecurityEvent.findMany({
      where: { type: { in: ["NEW_DEVICE_LOGIN", "ACCOUNT_LOCKED", "LOGIN_FAILURE"] } },
      orderBy: { at: "desc" },
      take: 30,
      select: { id: true, type: true, ip: true, userAgent: true, at: true, adminUser: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  const adminIds = [...new Set(revisions.map((x) => x.adminUserId).filter(Boolean) as string[])];
  const names = adminIds.length
    ? await prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } })
    : [];
  const nameOf = new Map(names.map((x) => [x.id, x.name]));
  const yourIp = ipOf(req);
  res.json({
    policy: current,
    defaults: envDefaults(),
    limits: LIMITS,
    fromDb: policyFromDbEnabled(),
    updatedAt: row?.updatedAt ?? null,
    yourIp,
    // Behind Railway's proxy the real visitor IP needs TRUST_PROXY=true.
    ipLooksLikeProxy: looksPrivate(yourIp) && !env.TRUST_PROXY,
    revisions: revisions.map((x) => ({ ...x, adminName: x.adminUserId ? nameOf.get(x.adminUserId) ?? null : null })),
    alerts,
  });
}));

/** Change one or more sections, e.g. { login: { maxFailed: 5 } }. */
const PatchBody = z
  .object(Object.fromEntries(SECTIONS.map((k) => [k, z.record(z.string(), z.unknown()).optional()])) as Record<string, z.ZodTypeAny>)
  .strict();

r.patch("/security", asyncHandler(async (req, res) => {
  const body = PatchBody.parse(req.body ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const current = await savedPolicy();
  const draft: Record<string, unknown> = { ...current };
  for (const key of SECTIONS) {
    if (body[key]) draft[key] = { ...(current[key] as object), ...body[key] };
  }
  const next = PolicySchema.parse(draft); // 400 with the field that's out of range
  res.json(await save(req, next));
}));

r.post("/security/reset", asyncHandler(async (req, res) => {
  res.json(await save(req, envDefaults()));
}));

r.post("/security/revisions/:id/restore", asyncHandler(async (req, res) => {
  const rev = await prisma.securityPolicyRevision.findUnique({ where: { id: String(req.params.id) } });
  if (!rev) throw NotFound("This version no longer exists");
  res.json(await save(req, mergePolicy(rev.data)));
}));

export default r;
