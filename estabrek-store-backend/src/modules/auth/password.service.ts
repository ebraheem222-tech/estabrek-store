import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { NotFound, Unauthorized } from "../../utils/httpError.js";
import { env } from "../../config/env.js";
import { invalidateAccess } from "../../middleware/access.js";
import { sendEmail } from "../outbox/sender/email.js";
import { adminPasswordLink } from "../outbox/sender/links.js";

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

  // The link must reach the owner of the email, never the person asking: the
  // token is only returned outside production (local testing). In production the
  // store owner sends a reset link from Team & permissions, or runs
  // `npm run admin:reset-link -- <email>` on the server.
  const token = `${tokenId}.${secret}`;
  // Email the link to the account's own address (when email is set up).
  const url = adminPasswordLink(token, "reset");
  if (url) {
    void sendEmail({ to: admin.email, template: "ADMIN_PASSWORD_RESET", payload: { name: admin.name, url, hours: 1 } });
  }
  if (env.NODE_ENV !== "production") return { ok: true, token };
  console.log(`[auth] password reset requested for an admin account (${tokenId})`);
  return { ok: true };
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

  const admin = await prisma.adminUser.findUnique({ where: { id: rec.adminUserId }, select: { status: true } });
  if (!admin) throw NotFound("Reset token not found or expired");
  if (admin.status === "SUSPENDED") throw Unauthorized("This account is turned off. Ask the store owner.");

  const hash = await argon2.hash(newPassword, { type: argon2.argon2id });

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: rec.adminUserId },
      // Opening an invite link and choosing a password is how a new member joins.
      data: { passwordHash: hash, failedLoginCount: 0, lockedUntil: null, ...(admin.status === "INVITED" ? { status: "ACTIVE" as const } : {}) },
    }),
    prisma.adminPasswordReset.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    // revoke all sessions (force re-login)
    prisma.adminSession.updateMany({
      where: { adminUserId: rec.adminUserId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date(), revocationReason: "password_reset" },
    }),
  ]);

  invalidateAccess(rec.adminUserId);
  return { ok: true, joined: admin.status === "INVITED" };
}
