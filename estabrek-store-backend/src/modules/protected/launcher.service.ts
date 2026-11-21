/**
 * The Windows launcher buyers download. Every shop has one ready: the blank
 * program kept with the server (assets/launcher, built once by
 * estabrek-launcher/build.ps1 -Blank) gets this shop's address, name and licence
 * keys written at its end when it is downloaded (launcherStamp.ts), so nobody
 * builds or uploads anything, and a change of keys reaches the next download by
 * itself. An owner may still upload a build of her own (signed with her
 * certificate, say): the newest upload is then the one offered, until she
 * deletes it.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../lib/prisma.js";
import { SITE_ROW_ORDER } from "../../lib/siteRow.js";
import { AppError } from "../../utils/httpError.js";
import { publicKeys } from "./activation.service.js";
import { stampLauncher } from "./launcherStamp.js";

const VERSION = /^\d{1,3}(\.\d{1,3}){1,3}$/;
const DOWNLOAD_PATH = "/licences/launcher/download";

/** estabrek-store-backend/assets/launcher (the same from src/ and dist/). */
export const LAUNCHER_ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../assets/launcher");

type Ready = { version: string; data: Buffer; sha256: string };
let ready: Ready | null | undefined;

/** The blank launcher kept with the server; null when it's missing. */
export function readyLauncher(): Ready | null {
  if (ready !== undefined) return ready;
  try {
    const info = JSON.parse(fs.readFileSync(path.join(LAUNCHER_ASSETS, "launcher.json"), "utf8")) as { version?: string };
    const data = fs.readFileSync(path.join(LAUNCHER_ASSETS, "EstabrekLauncher.exe"));
    const ok = VERSION.test(String(info.version ?? "")) && data.length > 1024 && data[0] === 0x4d && data[1] === 0x5a;
    ready = ok ? { version: String(info.version), data, sha256: crypto.createHash("sha256").update(data).digest("hex") } : null;
  } catch {
    ready = null;
  }
  return ready;
}

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

/** Deleting the upload on offer brings the ready launcher back. */
export async function removeLauncher(id: string) {
  const r = await prisma.launcherRelease.deleteMany({ where: { id } });
  if (!r.count) throw new AppError(404, "NOT_FOUND", "Not found");
  return { ok: true };
}

function activeUpload() {
  return prisma.launcherRelease.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" }, select: { version: true, bytes: true, sha256: true, createdAt: true } });
}

/** What the order page offers: the owner's own upload, else the ready one (null only when neither exists). */
export async function currentLauncher() {
  const r = await activeUpload();
  if (r) return { ...r, path: DOWNLOAD_PATH, source: "uploaded" as const };
  const b = readyLauncher();
  return b ? { version: b.version, bytes: b.data.length, sha256: null, createdAt: null, path: DOWNLOAD_PATH, source: "ready" as const } : null;
}

/** The program to download. origin: the address this server was reached by, which the ready launcher calls back. */
export async function launcherFile(origin: string | null) {
  const r = await prisma.launcherRelease.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" }, select: { version: true, data: true } });
  if (r) return { filename: `EstabrekLauncher-${r.version}.exe`, data: Buffer.from(r.data) };
  const b = readyLauncher();
  if (!b) throw new AppError(404, "NO_LAUNCHER", "The launcher isn't available yet");
  if (!origin) throw new AppError(400, "BAD_HOST", "This server's address couldn't be read from the request");
  const [keys, site] = await Promise.all([
    publicKeys(),
    prisma.siteSettings.findFirst({ orderBy: SITE_ROW_ORDER, select: { siteName: true } }).catch(() => null),
  ]);
  return { filename: `EstabrekLauncher-${b.version}.exe`, data: stampLauncher(b.data, { api: origin, name: site?.siteName ?? "", keys }) };
}
