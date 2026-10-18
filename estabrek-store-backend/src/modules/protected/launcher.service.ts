/**
 * The Windows launcher buyers download (built from estabrek-launcher on the
 * owner's PC, uploaded in admin → الخزنة). The newest upload is the one offered.
 */
import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";

const VERSION = /^\d{1,3}(\.\d{1,3}){1,3}$/;

export async function uploadLauncher(input: { version: string; data: Buffer; notes?: string | null; adminUserId?: string | null }) {
  const version = String(input.version ?? "").trim();
  if (!VERSION.test(version)) throw new AppError(400, "BAD_VERSION", "A version like 1.0.0");
  // A Windows program starts with "MZ".
  if (input.data.length < 1024 || input.data[0] !== 0x4d || input.data[1] !== 0x5a) throw new AppError(400, "NOT_A_PROGRAM", "This isn't a Windows program (.exe)");
  const row = await prisma.$transaction(async (tx) => {
    await tx.launcherRelease.updateMany({ where: { isActive: true }, data: { isActive: false } });
    return tx.launcherRelease.create({
      data: { version, bytes: input.data.length, sha256: crypto.createHash("sha256").update(input.data).digest("hex"), data: new Uint8Array(input.data), notes: input.notes?.trim().slice(0, 500) || null, createdById: input.adminUserId ?? null },
      select: { id: true, version: true, bytes: true, sha256: true, notes: true, isActive: true, createdAt: true },
    });
  });
  return row;
}

export async function listLaunchers() {
  return prisma.launcherRelease.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, version: true, bytes: true, sha256: true, notes: true, isActive: true, createdAt: true } });
}

export async function removeLauncher(id: string) {
  const r = await prisma.launcherRelease.deleteMany({ where: { id } });
  if (!r.count) throw new AppError(404, "NOT_FOUND", "Not found");
  return { ok: true };
}

/** What the order page offers (null when none is uploaded yet). */
export async function currentLauncher() {
  const r = await prisma.launcherRelease.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" }, select: { version: true, bytes: true, sha256: true, createdAt: true } });
  return r ? { ...r, path: "/licences/launcher/download" } : null;
}

export async function launcherFile() {
  const r = await prisma.launcherRelease.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" }, select: { version: true, data: true } });
  if (!r) throw new AppError(404, "NO_LAUNCHER", "The launcher isn't available yet");
  return { filename: `EstabrekLauncher-${r.version}.exe`, data: Buffer.from(r.data) };
}
