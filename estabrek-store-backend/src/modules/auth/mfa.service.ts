import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { createTotpSecret, totpURI, verifyTotp, signAccessToken } from "../../config/security.js";
import type { AuthUser } from "../../types/auth.js";
import { BadRequest, Unauthorized } from "../../utils/httpError.js";
import { randomBytes } from "node:crypto";
import { verifyOtpChallenge } from "./otp.service.js";

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const ACCESS_EXPIRES = "15m";

export function generate2FASetup(email: string, issuer = "Estabrak Store") {
  const secret = createTotpSecret();
  const uri = totpURI({ secret, label: email, issuer });
  return { secret, uri };
}

export async function enable2FA(adminId: string, secret: string, code: string, label?: string) {
  const ok = verifyTotp({ secret, token: code });
  if (!ok) throw BadRequest("Invalid TOTP code");

  const device = await prisma.admin2FADevice.create({
    data: {
      adminUserId: adminId,
      label: label ?? "Authenticator",
      method: "TOTP",
      totpSecretEnc: secret, // consider encrypting at rest
      enabled: true,
      lastUsedAt: new Date(),
    },
  });

  await prisma.adminUser.update({
    where: { id: adminId },
    data: { twoFactorEnabled: true, default2FADeviceId: device.id },
  });

  return { ok: true, deviceId: device.id };
}

export async function disable2FA(adminId: string, deviceId?: string) {
  // if a deviceId is passed, disable THAT device; otherwise disable default
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw Unauthorized("Not found");

  const target = deviceId ?? admin.default2FADeviceId ?? undefined;
  if (!target) {
    // no specific device — disable all
    await prisma.$transaction([
      prisma.admin2FADevice.updateMany({ where: { adminUserId: adminId }, data: { enabled: false } }),
      prisma.adminUser.update({ where: { id: adminId }, data: { twoFactorEnabled: false, default2FADeviceId: null } }),
    ]);
    return { ok: true };
  }

  await prisma.admin2FADevice.update({ where: { id: target }, data: { enabled: false } });
  // if default device disabled, unset on user
  if (admin.default2FADeviceId === target) {
    await prisma.adminUser.update({ where: { id: adminId }, data: { twoFactorEnabled: false, default2FADeviceId: null } });
  }
  return { ok: true };
}

export async function finalizeMfaLogin(params: {
  sessionId: string;
  adminId: string;
  totp?: string;
  code?: string;
  challengeId?: string;
}) {
  const device = await prisma.admin2FADevice.findFirst({
    where: { adminUserId: params.adminId, enabled: true },
    orderBy: { lastUsedAt: "desc" },
    include: { adminUser: true },
  });
  if (!device) throw Unauthorized("Two-factor device missing");

  if (device.method === "TOTP") {
    if (!params.totp) throw Unauthorized("Missing TOTP code");
    if (!device.totpSecretEnc) throw Unauthorized("Two-factor device missing");

    const valid = verifyTotp({ secret: device.totpSecretEnc, token: params.totp });
    if (!valid) throw Unauthorized("Invalid TOTP code");
  } else if (device.method === "SMS") {
    if (!params.challengeId || !params.code) throw Unauthorized("Missing SMS code");

    const to = device.targetPhone ?? device.adminUser.phone;
    if (!to) throw Unauthorized("Phone is required for SMS 2FA");

    await verifyOtpChallenge({
      challengeId: params.challengeId,
      code: params.code,
      purpose: "MFA_SMS",
      adminUserId: params.adminId,
      to,
    });
  } else {
    throw Unauthorized("Unsupported 2FA method");
  }

  await prisma.admin2FADevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });

  // rotate a fresh refresh token for the existing session
  const rand = b64url(randomBytes(32));
  const token = `${params.sessionId}.${rand}`;
  const hash = await argon2.hash(token, { type: argon2.argon2id });
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.adminSession.update({
    where: { id: params.sessionId },
    data: { refreshTokenHash: hash, expiresAt, updatedAt: new Date() },
  });

  const a = device.adminUser;
  const accessToken = signAccessToken({ sub: a.id, role: a.role, email: a.email } as AuthUser, { expiresIn: ACCESS_EXPIRES });

  return { accessToken, refreshToken: token };
}

// ===== recovery codes =====

export async function generateRecoveryCodes(adminId: string, count = 10) {
  const plain: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = b64url(randomBytes(8)); // ~11 chars
    plain.push(code);
    hashes.push(await argon2.hash(code, { type: argon2.argon2id }));
  }

  const ops = hashes.map((h) =>
    prisma.admin2FARecoveryCode.create({
      data: { adminUserId: adminId, codeHash: h },
    })
  );
  await prisma.$transaction(ops);

  return { codes: plain }; // show once to the admin
}

export async function consumeRecoveryCode(adminId: string, code: string) {
  const recs = await prisma.admin2FARecoveryCode.findMany({
    where: { adminUserId: adminId, usedAt: null },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  for (const rec of recs) {
    const ok = await argon2.verify(rec.codeHash, code).catch(() => false);
    if (ok) {
      await prisma.admin2FARecoveryCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
      return { ok: true };
    }
  }
  throw Unauthorized("Invalid recovery code");
}
