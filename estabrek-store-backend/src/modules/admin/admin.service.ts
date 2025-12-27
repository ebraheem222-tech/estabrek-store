// src/modules/admin/admin.service.ts
import { prisma } from "../../lib/prisma.js";
import type { OrderReqStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import type { SecurityEventType, SessionStatus } from "@prisma/client";

/** url-safe base64 */
function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Dashboard overview: counts + latest orders.
 */
export async function getDashboard() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  // Typed statuses (no Prisma.$Enums)
  const STATUSES = [
    "NEW",
    "CONTACTED",
    "ACCEPTED",
    "REJECTED",
    "SHIPPED",
    "CLOSED",
  ] as const satisfies readonly OrderReqStatus[];

  // run main counts concurrently
  const [
    totalProducts,
    totalCategories,
    totalVariants,
    totalSizes,
    pendingReviews,
    pendingComments,
    totalOrders,
    outboxQueued,
    outboxFailedToday,
    outboxSentToday,
    latestOrders,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.productVariant.count(),
    prisma.size.count(),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.productComment.count({ where: { status: "PENDING" } }),
    prisma.orderRequest.count(),
    prisma.outboxMessage.count({ where: { status: "QUEUED" } }),
    prisma.outboxMessage.count({ where: { status: "FAILED", createdAt: { gte: start } } }),
    prisma.outboxMessage.count({ where: { status: "SENT", createdAt: { gte: start } } }),
    prisma.orderRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        variant: { include: { item: { include: { product: true } }, size: true } },
      },
    }),
  ]);

  // per-status counts (avoid groupBy typing issues)
  const statusCounts = await Promise.all(
    STATUSES.map((s) => prisma.orderRequest.count({ where: { status: s } }))
  );

  const ordersByStatus = STATUSES.reduce((acc, s, i) => {
    acc[s] = statusCounts[i];
    return acc;
  }, {} as Record<OrderReqStatus, number>);

  return {
    counts: {
      products: totalProducts,
      categories: totalCategories,
      variants: totalVariants,
      sizes: totalSizes,
      reviewsPending: pendingReviews,
      commentsPending: pendingComments,
      orders: totalOrders,
      ordersByStatus,
      outboxQueued,
      outboxFailedToday,
      outboxSentToday,
    },
    latestOrders,
  };
}

/**
 * Basic admin profile (for /account/me).
 */
export async function getMe(adminId: string) {
  return prisma.adminUser.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      secondEmail: true,
      secondPhone: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Update admin profile fields.
 */
export async function updateProfile(
  adminId: string,
  data: { name?: string; phone?: string | null; secondEmail?: string | null; secondPhone?: string | null }
) {
  return prisma.adminUser.update({
    where: { id: adminId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      secondEmail: true,
      secondPhone: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Start an email-change flow: create a token (hash stored, raw returned for dev).
 * In production you'd send this token to the NEW email.
 */
export async function requestEmailChange(adminId: string, newEmail: string) {
  await prisma.adminEmailChange.deleteMany({
    where: { adminUserId: adminId, newEmail, usedAt: null },
  });

  const raw = b64url(randomBytes(24));
  const hash = await argon2.hash(raw);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.adminEmailChange.create({
    data: {
      adminUserId: adminId,
      newEmail,
      tokenHash: hash,
      expiresAt,
    },
  });

  // In production: email `raw` to newEmail; here we return it for dev/testing
  return { ok: true, token: raw };
}

/**
 * Confirm email-change using the most recent, unexpired token.
 */
export async function confirmEmailChange(adminId: string, token: string) {
  const rec = await prisma.adminEmailChange.findFirst({
    where: { adminUserId: adminId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!rec) return { ok: false, error: "TOKEN_NOT_FOUND_OR_EXPIRED" };

  const ok = await argon2.verify(rec.tokenHash, token).catch(() => false);
  if (!ok) return { ok: false, error: "TOKEN_INVALID" };

  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: adminId }, data: { email: rec.newEmail } }),
    prisma.adminEmailChange.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);

  return { ok: true };
}

// ================= Security / Sessions / Audit =================

async function logSecurityEvent(params: {
  adminUserId: string;
  type: SecurityEventType;
  ip?: string;
  userAgent?: string;
  metadata?: any;
}) {
  try {
    await prisma.adminSecurityEvent.create({
      data: {
        adminUserId: params.adminUserId,
        type: params.type,
        ip: params.ip,
        userAgent: params.userAgent,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch {
    // don't block
  }
}

export async function listMySessions(
  adminId: string,
  query: { take?: any; skip?: any; status?: any }
) {
  const take = Math.min(Number(query.take ?? 50), 200);
  const skip = Math.max(Number(query.skip ?? 0), 0);
  const status = (query.status as SessionStatus | undefined) ?? undefined;

  const [items, total] = await Promise.all([
    prisma.adminSession.findMany({
      where: { adminUserId: adminId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        revokedAt: true,
        revocationReason: true,
        ip: true,
        userAgent: true,
      },
    }),
    prisma.adminSession.count({ where: { adminUserId: adminId, ...(status ? { status } : {}) } }),
  ]);

  return { items, total, take, skip };
}

export async function revokeMySession(
  adminId: string,
  sessionId: string,
  ctx?: { ip?: string; ua?: string }
) {
  const s = await prisma.adminSession.findUnique({ where: { id: sessionId } });
  if (!s || s.adminUserId !== adminId) return { ok: false, error: "NOT_FOUND" };

  if (s.status !== "ACTIVE") return { ok: true };

  await prisma.adminSession.update({
    where: { id: sessionId },
    data: { status: "REVOKED", revokedAt: new Date(), revocationReason: "admin_revoke" },
  });

  await logSecurityEvent({
    adminUserId: adminId,
    type: "SESSION_REVOKED",
    ip: ctx?.ip,
    userAgent: ctx?.ua,
    metadata: { sessionId, reason: "admin_revoke" },
  });

  return { ok: true };
}

export async function revokeOtherSessions(
  adminId: string,
  currentSessionId: string,
  ctx?: { ip?: string; ua?: string }
) {
  const now = new Date();
  const result = await prisma.adminSession.updateMany({
    where: {
      adminUserId: adminId,
      status: "ACTIVE",
      id: { not: currentSessionId },
    },
    data: { status: "REVOKED", revokedAt: now, revocationReason: "revoke_others" },
  });

  await logSecurityEvent({
    adminUserId: adminId,
    type: "SESSION_REVOKED",
    ip: ctx?.ip,
    userAgent: ctx?.ua,
    metadata: { action: "revoke_others", count: result.count },
  });

  return { ok: true, count: result.count };
}

export async function listMySecurityEvents(adminId: string, query: { take?: any; skip?: any; type?: any }) {
  const take = Math.min(Number(query.take ?? 50), 200);
  const skip = Math.max(Number(query.skip ?? 0), 0);
  const type = (query.type as SecurityEventType | undefined) ?? undefined;

  const where: any = { adminUserId: adminId };
  if (type) where.type = type;

  const [items, total] = await Promise.all([
    prisma.adminSecurityEvent.findMany({
      where,
      // NOTE: schema uses `at` (not `createdAt`)
      orderBy: { at: "desc" },
      take,
      skip,
      select: {
        id: true,
        type: true,
        ip: true,
        userAgent: true,
        metadata: true,
        at: true,
      },
    }),
    prisma.adminSecurityEvent.count({ where }),
  ]);

  return { items, total, take, skip };
}
