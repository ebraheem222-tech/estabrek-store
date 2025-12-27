import argon2 from "argon2";
import { randomInt } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { Unauthorized } from "../../utils/httpError.js";

export type OtpPurpose = "MFA_SMS" | "PHONE_LOGIN" | "ENABLE_SMS_2FA" | "PHONE_VERIFY";

export function generateNumericCode(length = 6) {
  const max = 10 ** length;
  const n = randomInt(0, max);
  return n.toString().padStart(length, "0");
}

export async function createOtpChallenge(params: {
  adminUserId?: string | null;
  to: string;
  purpose: OtpPurpose;
  requesterIp?: string;
  requesterUa?: string;
  ttlMinutes?: number;
}) {
  const code = generateNumericCode(6);
  const codeHash = await argon2.hash(code, { type: argon2.argon2id });
  const ttl = params.ttlMinutes ?? env.OTP_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

  const rec = await prisma.adminOtpChallenge.create({
    data: {
      adminUserId: params.adminUserId ?? null,
      purpose: params.purpose,
      channel: "SMS",
      to: params.to,
      codeHash,
      expiresAt,
      requesterIp: params.requesterIp,
      requesterUa: params.requesterUa,
    },
  });

  return { challengeId: rec.id, code, expiresAt };
}

export async function verifyOtpChallenge(params: {
  challengeId: string;
  code: string;
  purpose: OtpPurpose;
  adminUserId?: string;
  to?: string;
}) {
  const rec = await prisma.adminOtpChallenge.findUnique({ where: { id: params.challengeId } });
  if (!rec || rec.purpose !== params.purpose) throw Unauthorized("Invalid code");
  if (rec.usedAt) throw Unauthorized("Code already used");
  if (rec.expiresAt < new Date()) throw Unauthorized("Code expired");
  if (rec.attempts >= env.OTP_MAX_ATTEMPTS) throw Unauthorized("Too many attempts");
  if (params.adminUserId && rec.adminUserId !== params.adminUserId) throw Unauthorized("Invalid code");
  if (params.to && rec.to !== params.to) throw Unauthorized("Invalid code");

  const ok = await argon2.verify(rec.codeHash, params.code).catch(() => false);
  if (!ok) {
    await prisma.adminOtpChallenge.update({
      where: { id: rec.id },
      data: { attempts: { increment: 1 } },
    });
    throw Unauthorized("Invalid code");
  }

  await prisma.adminOtpChallenge.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return rec;
}
