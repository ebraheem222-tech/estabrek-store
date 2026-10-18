/**
 * The owner's vault session (admin → الخزنة): at most 20 minutes, opened only
 * after she re-enters her password and her authenticator code. While it's open
 * she can upload or delete protected masters; when it ends the vault locks again.
 * Five wrong tries lock it for 15 minutes. Every try goes in the security log.
 */
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { verifyTotp } from "../../config/security.js";
import { AppError } from "../../utils/httpError.js";
import { openBytes } from "../../lib/secretBox.js";
import { vaultAddFile, vaultAudit, vaultCloseSession, vaultHealth, vaultOn, vaultOpenSession, vaultSessionOpen } from "./vaultClient.js";

type Held = { id: string; expiresAt: number };
const sessions = new Map<string, Held>();
const failures = new Map<string, number[]>();
const FAIL_WINDOW = 15 * 60_000;
const MAX_FAILS = 5;

async function logEvent(adminUserId: string, type: "VAULT_SESSION_OPENED" | "VAULT_SESSION_DENIED", meta: { ip?: string | null; ua?: string | null; why?: string }) {
  await prisma.adminSecurityEvent.create({ data: { adminUserId, type, ip: meta.ip ?? null, userAgent: meta.ua ?? null, metadata: meta.why ? { why: meta.why } : undefined } }).catch(() => undefined);
}

/** The vault session this admin has open (null when none, or it ran out). */
export function vaultSessionFor(adminId: string | null | undefined) {
  if (!adminId) return null;
  const s = sessions.get(adminId);
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    sessions.delete(adminId);
    return null;
  }
  return s;
}

export async function openVaultSession(adminId: string, input: { password: string; code: string }, meta: { ip?: string | null; ua?: string | null } = {}) {
  if (!vaultOn()) throw new AppError(409, "VAULT_NOT_SET", "The vault isn't set up (VAULT_URL)");
  const recent = (failures.get(adminId) ?? []).filter((t) => Date.now() - t < FAIL_WINDOW);
  if (recent.length >= MAX_FAILS) throw new AppError(429, "VAULT_TRIES", "Too many wrong tries: wait 15 minutes");
  const deny = async (why: string, status = 401, code = "VAULT_AUTH_FAILED") => {
    failures.set(adminId, [...recent, Date.now()]);
    await logEvent(adminId, "VAULT_SESSION_DENIED", { ...meta, why });
    throw new AppError(status, code, "Wrong password or code");
  };
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId }, select: { id: true, email: true, passwordHash: true, status: true } });
  if (!admin || admin.status !== "ACTIVE") throw new AppError(401, "UNAUTHORIZED", "Sign in again");
  const device = await prisma.admin2FADevice.findFirst({ where: { adminUserId: adminId, enabled: true, method: "TOTP" }, orderBy: { lastUsedAt: "desc" }, select: { id: true, totpSecretEnc: true } });
  if (!device?.totpSecretEnc) throw new AppError(403, "TOTP_REQUIRED", "Turn on two-step sign-in with an authenticator app first");
  const passwordOk = await argon2.verify(admin.passwordHash, String(input.password ?? "")).catch(() => false);
  if (!passwordOk) return deny("password");
  if (!verifyTotp({ secret: device.totpSecretEnc, token: String(input.code ?? "").replace(/\s+/g, "") })) return deny("code");

  failures.delete(adminId);
  const s = await vaultOpenSession({ id: admin.id, email: admin.email }, meta.ip ?? null);
  sessions.set(adminId, { id: s.id, expiresAt: Date.parse(s.expiresAt) });
  await prisma.admin2FADevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  await logEvent(adminId, "VAULT_SESSION_OPENED", meta);
  return { expiresAt: s.expiresAt };
}

export async function closeVaultSession(adminId: string) {
  const s = sessions.get(adminId);
  sessions.delete(adminId);
  if (s && vaultOn()) await vaultCloseSession(s.id).catch(() => undefined);
  return { ok: true };
}

/** A session that must be open (uploads, deletes, moving files in). */
export async function requireVaultSession(adminId: string | null | undefined) {
  const s = vaultSessionFor(adminId);
  if (!s) throw new AppError(423, "VAULT_LOCKED", "Open a vault session first");
  // The vault may have restarted (asleep and woken): its word counts.
  const live = await vaultSessionOpen(s.id).catch(() => ({ open: false }));
  if (!live.open) {
    sessions.delete(adminId!);
    throw new AppError(423, "VAULT_LOCKED", "The vault session ended: open a new one");
  }
  return s.id;
}

/** Masters still kept in the database (from before the vault): moved in, then cleared here. */
export async function moveLocalFilesToVault(session: string, where: { productId?: string } = {}) {
  const rows = await prisma.protectedFile.findMany({ where: { vaultFileId: null, NOT: { dataEnc: null }, ...(where.productId ? { productId: where.productId } : {}) }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  for (const r of rows) {
    const meta = await vaultAddFile(session, r.productId, r.name, openBytes(r.dataEnc!));
    await prisma.protectedFile.update({ where: { id: r.id }, data: { vaultFileId: meta.id, dataEnc: null } });
  }
  return { moved: rows.length };
}

export async function vaultStatus(adminId: string) {
  const [health, local, inVault] = await Promise.all([
    vaultHealth(),
    prisma.protectedFile.count({ where: { vaultFileId: null } }),
    prisma.protectedFile.count({ where: { NOT: { vaultFileId: null } } }),
  ]);
  const s = vaultSessionFor(adminId);
  return { ...health, session: s ? { expiresAt: new Date(s.expiresAt).toISOString() } : null, files: { inDatabase: local, inVault } };
}

export async function vaultEvents(adminId: string) {
  return vaultAudit(await requireVaultSession(adminId));
}
