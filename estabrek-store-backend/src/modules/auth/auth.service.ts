import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../config/security.js";
import type { AuthUser } from "../../types/auth.js";
import { Unauthorized } from "../../utils/httpError.js";
import { env } from "../../config/env.js";
import { createOtpChallenge } from "./otp.service.js";
import { sendSms } from "../outbox/sender/sms.js";

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const ACCESS_EXPIRES = "15m";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d

async function logSecurityEvent(params: {
  adminUserId: string;
  type:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILURE"
    | "MFA_CHALLENGE_SUCCESS"
    | "MFA_CHALLENGE_FAILURE"
    | "PASSWORD_RESET_REQUESTED"
    | "PASSWORD_RESET_COMPLETED"
    | "PASSWORD_CHANGED"
    | "SESSION_CREATED"
    | "SESSION_REVOKED"
    | "ACCOUNT_LOCKED"
    | "ACCOUNT_UNLOCKED";
  ip?: string;
  userAgent?: string;
  metadata?: any;
}) {
  try {
    await prisma.adminSecurityEvent.create({
      data: {
        adminUserId: params.adminUserId,
        type: params.type as any,
        ip: params.ip,
        userAgent: params.userAgent,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch {
    // do not block auth flow on logging
  }
}

async function createRefreshToken(sessionId: string) {
  const rand = b64url(randomBytes(32));
  const token = `${sessionId}.${rand}`;
  const hash = await argon2.hash(token, { type: argon2.argon2id });
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  return { token, hash, expiresAt };
}

function buildAccessToken(admin: { id: string; role: any; email: string }) {
  return signAccessToken({ sub: admin.id, role: admin.role, email: admin.email } as AuthUser, { expiresIn: ACCESS_EXPIRES });
}

export async function createSessionWithRefresh(params: { adminUserId: string; ip?: string; ua?: string }) {
  const session = await prisma.adminSession.create({
    data: {
      adminUserId: params.adminUserId,
      ip: params.ip,
      userAgent: params.ua,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  const { token: refreshToken, hash, expiresAt } = await createRefreshToken(session.id);
  await prisma.adminSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: hash, expiresAt },
  });

  return { sessionId: session.id, refreshToken, expiresAt };
}

export async function authenticateAdmin(opts: {
  email: string;
  password: string;
  ip?: string;
  ua?: string;
}) {
  const { email, password, ip, ua } = opts;

  const admin = await prisma.adminUser.findUnique({
    where: { email },
    include: { default2FADevice: true },
  });
  if (!admin) throw Unauthorized("Invalid credentials");

  // lockout
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw Unauthorized("Account locked. Try again later.");
  }

  const ok = await argon2.verify(admin.passwordHash, password).catch(() => false);
  if (!ok) {
    const nextFailed = admin.failedLoginCount + 1;
    const shouldLock = nextFailed >= env.AUTH_MAX_FAILED;

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount: { increment: 1 },
        lockedUntil: shouldLock ? new Date(Date.now() + env.AUTH_LOCK_MINUTES * 60 * 1000) : admin.lockedUntil,
        lastIp: ip,
      },
    });

    await logSecurityEvent({ adminUserId: admin.id, type: "LOGIN_FAILURE", ip, userAgent: ua });
    if (shouldLock) {
      await logSecurityEvent({
        adminUserId: admin.id,
        type: "ACCOUNT_LOCKED",
        ip,
        userAgent: ua,
        metadata: { minutes: env.AUTH_LOCK_MINUTES },
      });
    }

    throw Unauthorized("Invalid credentials");
  }

  // success → reset counters
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastIp: ip },
  });
  await logSecurityEvent({ adminUserId: admin.id, type: "LOGIN_SUCCESS", ip, userAgent: ua });

  return beginSessionForAdmin({ adminId: admin.id, ip, ua });
}

export async function beginSessionForAdmin(params: { adminId: string; ip?: string; ua?: string }) {
  const admin = await prisma.adminUser.findUnique({
    where: { id: params.adminId },
    include: { default2FADevice: true },
  });
  if (!admin) throw Unauthorized("Invalid user");

  const { sessionId } = await createSessionWithRefresh({ adminUserId: admin.id, ip: params.ip, ua: params.ua });
  await logSecurityEvent({ adminUserId: admin.id, type: "SESSION_CREATED", ip: params.ip, userAgent: params.ua, metadata: { sessionId } });

  // MFA required?
  if (admin.twoFactorEnabled) {
    const method = admin.default2FADevice?.method ?? "TOTP";
    if (method === "SMS") {
      const to = admin.default2FADevice?.targetPhone ?? admin.phone;
      if (!to) throw Unauthorized("Phone is required for SMS 2FA");

      const { challengeId, code, expiresAt } = await createOtpChallenge({
        adminUserId: admin.id,
        to,
        purpose: "MFA_SMS",
        requesterIp: params.ip,
        requesterUa: params.ua,
      });

      // send immediately (provider is stub by default)
      await sendSms({ to, template: "ADMIN_MFA_CODE", payload: { code, expiresAt } });

      return { mfaRequired: true as const, mfaMethod: "SMS" as const, sessionId, adminId: admin.id, challengeId };
    }

    return { mfaRequired: true as const, mfaMethod: "TOTP" as const, sessionId, adminId: admin.id };
  }

  const accessToken = buildAccessToken(admin);
  // We return refresh token by minting a new one from session (to keep same behavior as before)
  const tokens = await issueTokensFromSession(sessionId);

  return {
    mfaRequired: false as const,
    accessToken: tokens.accessToken ?? accessToken,
    refreshToken: tokens.refreshToken,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role, twoFactorEnabled: admin.twoFactorEnabled },
  };
}

export async function issueTokensFromSession(sessionId: string) {
  const session = await prisma.adminSession.findUnique({
    where: { id: sessionId },
    include: { adminUser: true },
  });
  if (!session || session.status !== "ACTIVE" || session.expiresAt < new Date()) {
    throw Unauthorized("Session expired");
  }

  const { token: refreshToken, hash, expiresAt } = await createRefreshToken(session.id);
  await prisma.adminSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: hash, expiresAt, updatedAt: new Date() },
  });

  const a = session.adminUser;
  const accessToken = buildAccessToken({ id: a.id, role: a.role, email: a.email });
  return { accessToken, refreshToken };
}

export async function refreshTokens(refreshToken: string, ip?: string, ua?: string) {
  const [sessionId] = refreshToken.split(".");
  if (!sessionId) throw Unauthorized("Invalid refresh token");

  const session = await prisma.adminSession.findUnique({ where: { id: sessionId }, include: { adminUser: true } });
  if (!session || session.status !== "ACTIVE" || session.expiresAt < new Date()) {
    throw Unauthorized("Session expired");
  }

  const valid = await argon2.verify(session.refreshTokenHash ?? "", refreshToken).catch(() => false);
  if (!valid) throw Unauthorized("Invalid refresh token");

  // rotate
  const { token: newRefresh, hash, expiresAt } = await createRefreshToken(session.id);
  await prisma.adminSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: hash, expiresAt, ip, userAgent: ua, updatedAt: new Date() },
  });

  const a = session.adminUser;
  const accessToken = buildAccessToken({ id: a.id, role: a.role, email: a.email });

  return { accessToken, refreshToken: newRefresh };
}

export async function logout(refreshToken: string) {
  const [sessionId] = refreshToken.split(".");
  if (!sessionId) return;

  const session = await prisma.adminSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const valid = await argon2.verify(session.refreshTokenHash ?? "", refreshToken).catch(() => false);
  if (!valid) return;

  await prisma.adminSession.update({
    where: { id: session.id },
    data: { status: "REVOKED", revokedAt: new Date(), revocationReason: "logout" },
  });

  await logSecurityEvent({
    adminUserId: session.adminUserId,
    type: "SESSION_REVOKED",
    metadata: { sessionId: session.id, reason: "logout" },
  });
}
