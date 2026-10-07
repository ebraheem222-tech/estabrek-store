import { prisma } from "../../lib/prisma.js";
import { invalidateAccess } from "../../middleware/access.js";
import { Unauthorized } from "../../utils/httpError.js";
import { createOtpChallenge, verifyOtpChallenge } from "./otp.service.js";
import { sendSms } from "../outbox/sender/sms.js";

export async function startEnableSms2fa(params: { adminId: string; ip?: string; ua?: string }) {
  const admin = await prisma.adminUser.findUnique({ where: { id: params.adminId } });
  if (!admin) throw Unauthorized("Not found");
  if (!admin.phone) throw Unauthorized("Phone is required");

  const { challengeId, code, expiresAt } = await createOtpChallenge({
    adminUserId: admin.id,
    to: admin.phone,
    purpose: "ENABLE_SMS_2FA",
    requesterIp: params.ip,
    requesterUa: params.ua,
  });

  await sendSms({ to: admin.phone, template: "ADMIN_ENABLE_SMS_2FA", payload: { code, expiresAt } });

  return { ok: true, challengeId, expiresAt };
}

export async function confirmEnableSms2fa(params: { adminId: string; challengeId: string; code: string; label?: string }) {
  const admin = await prisma.adminUser.findUnique({ where: { id: params.adminId } });
  if (!admin) throw Unauthorized("Not found");
  if (!admin.phone) throw Unauthorized("Phone is required");

  await verifyOtpChallenge({
    challengeId: params.challengeId,
    code: params.code,
    purpose: "ENABLE_SMS_2FA",
    adminUserId: admin.id,
    to: admin.phone,
  });

  const device = await prisma.admin2FADevice.create({
    data: {
      adminUserId: admin.id,
      label: params.label ?? "SMS",
      method: "SMS",
      enabled: true,
      targetPhone: admin.phone,
      lastUsedAt: new Date(),
    },
  });

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { twoFactorEnabled: true, default2FADeviceId: device.id },
  });

  invalidateAccess(params.adminId);
  return { ok: true, deviceId: device.id };
}
