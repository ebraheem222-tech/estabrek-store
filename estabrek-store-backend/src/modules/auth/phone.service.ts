import { prisma } from "../../lib/prisma.js";
import { createOtpChallenge, verifyOtpChallenge } from "./otp.service.js";
import { sendSms } from "../outbox/sender/sms.js";
import { beginSessionForAdmin } from "./auth.service.js";
import { Unauthorized } from "../../utils/httpError.js";

function normalizePhone(input: string) {
  return input.trim().replace(/[\s\-()]/g, "");
}

export async function startPhoneLogin(params: { phone: string; ip?: string; ua?: string }) {
  const phone = normalizePhone(params.phone);

  // NOTE: `phone` may not be marked as @unique in the Prisma schema.
  // Admin phone login should still compile and work, so we use findFirst.
  const admin = await prisma.adminUser.findFirst({ where: { phone } });

  // Always create a challenge (prevents user enumeration)
  const { challengeId, code, expiresAt } = await createOtpChallenge({
    adminUserId: admin?.id ?? null,
    to: phone,
    purpose: "PHONE_LOGIN",
    requesterIp: params.ip,
    requesterUa: params.ua,
  });

  // If phone isn't attached to an admin, still "send" (dev stub) so behavior is consistent.
  await sendSms({ to: phone, template: "ADMIN_LOGIN_CODE", payload: { code, expiresAt } });

  return { ok: true, challengeId, expiresAt };
}

export async function verifyPhoneLogin(params: { challengeId: string; code: string; ip?: string; ua?: string }) {
  const rec = await verifyOtpChallenge({
    challengeId: params.challengeId,
    code: params.code,
    purpose: "PHONE_LOGIN",
  });

  const admin = await prisma.adminUser.findFirst({
    where: { phone: rec.to },
    include: { default2FADevice: true },
  });
  if (!admin) throw Unauthorized("Invalid code");

  // If account is locked, block as well.
  if (admin.lockedUntil && admin.lockedUntil > new Date()) throw Unauthorized("Account locked. Try again later.");

  return beginSessionForAdmin({ adminId: admin.id, ip: params.ip, ua: params.ua });
}
