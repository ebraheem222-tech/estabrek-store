/**
 * Prints a one-time link to set a new admin password, for when the owner is
 * locked out (the "forgot password" page doesn't show links in production).
 *
 *   npm run admin:reset-link -- owner@example.com
 *
 * Run it on the server (Railway → the service → shell) or anywhere with the
 * production DATABASE_URL. Optional: ADMIN_APP_URL=https://your-admin.pages.dev
 * to print the whole link. The link works once, for 1 hour.
 */
import dotenv from "dotenv";
dotenv.config();

import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";

const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:reset-link -- <admin email>");
    process.exit(1);
  }
  const admin = await prisma.adminUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!admin) {
    console.error(`No admin account with ${email}`);
    process.exit(1);
  }
  const tokenId = b64url(randomBytes(12));
  const secret = b64url(randomBytes(24));
  await prisma.adminPasswordReset.create({
    data: {
      adminUserId: admin.id,
      tokenId,
      tokenHash: await argon2.hash(secret, { type: argon2.argon2id }),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      requesterUa: "admin:reset-link script",
    },
  });
  const token = `${tokenId}.${secret}`;
  const base = (process.env.ADMIN_APP_URL ?? "").replace(/\/+$/, "");
  console.log(`\nReset link for ${admin.email} (works once, for 1 hour):\n`);
  console.log(base ? `${base}/login/reset?token=${token}` : `<admin site>/login/reset?token=${token}`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
