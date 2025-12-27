import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { NotFound, Unauthorized } from "../../utils/httpError.js";

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Password reset token format: <tokenId>.<secret>
 * We store tokenId in DB (searchable) + argon2(secret) (not searchable).
 */
export async function requestPasswordReset(email: string, requesterIp?: string, requesterUa?: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return { ok: true }; // don't reveal

  const tokenId = b64url(randomBytes(12));
  const secret = b64url(randomBytes(24));
  const hash = await argon2.hash(secret, { type: argon2.argon2id });
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.adminPasswordReset.create({
    data: {
      adminUserId: admin.id,
      tokenId,
      tokenHash: hash,
      expiresAt,
      requesterIp,
      requesterUa,
    },
  });

  // In prod: send email. In dev: return raw token.
  return { ok: true, token: `${tokenId}.${secret}` };
}

export async function resetPassword(token: string, newPassword: string) {
  const [tokenId, secret] = token.split(".");
  if (!tokenId || !secret) throw Unauthorized("Invalid reset token");

  const rec = await prisma.adminPasswordReset.findFirst({
    where: { tokenId, usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!rec) throw NotFound("Reset token not found or expired");

  const ok = await argon2.verify(rec.tokenHash, secret).catch(() => false);
  if (!ok) throw Unauthorized("Invalid reset token");

  const hash = await argon2.hash(newPassword, { type: argon2.argon2id });

  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: rec.adminUserId }, data: { passwordHash: hash } }),
    prisma.adminPasswordReset.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    // revoke all sessions (force re-login)
    prisma.adminSession.updateMany({
      where: { adminUserId: rec.adminUserId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date(), revocationReason: "password_reset" },
    }),
  ]);

  return { ok: true };
}
