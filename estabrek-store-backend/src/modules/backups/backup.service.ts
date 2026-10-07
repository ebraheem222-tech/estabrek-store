/**
 * Backups: a daily automatic copy of the database (and one by hand from the
 * admin), encrypted, kept off the server. Each run is a BackupRun row.
 *
 * Storage: Cloudinary (already set up for the store's photos), as a private
 * file only the server can hand out links to. The newest BACKUP_KEEP files are
 * kept; older ones are removed.
 */
import { Readable } from "node:stream";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { getCloudinary, isCloudinaryEnabled } from "../../lib/cloudinary.js";
import { backupFileName, packBackup } from "./backupFile.js";
import { countRows, dumpDatabase } from "./backupDb.js";

/* ---------------- Storage ---------------- */

export type BackupStorage = {
  kind: string;
  ready: () => boolean;
  put: (name: string, file: Buffer) => Promise<{ location: string }>;
  remove: (location: string) => Promise<void>;
  /** A short-lived link to download the file. */
  link: (location: string) => Promise<string>;
};

const FOLDER = "estabrek-backups";

export const cloudinaryStorage: BackupStorage = {
  kind: "cloudinary",
  ready: () => isCloudinaryEnabled(),
  put: (name, file) =>
    new Promise((resolve, reject) => {
      const cld = getCloudinary();
      if (!cld) return reject(new Error("CLOUDINARY_NOT_CONFIGURED"));
      const up = cld.uploader.upload_stream(
        { resource_type: "raw", type: "authenticated", folder: FOLDER, public_id: name, overwrite: false, unique_filename: false, use_filename: false },
        (err, res) => (err || !res ? reject(err ?? new Error("UPLOAD_FAILED")) : resolve({ location: res.public_id })),
      );
      Readable.from(file).pipe(up);
    }),
  remove: async (location) => {
    const cld = getCloudinary();
    if (cld) await cld.uploader.destroy(location, { resource_type: "raw", type: "authenticated", invalidate: true });
  },
  link: async (location) => {
    const cld = getCloudinary();
    if (!cld) throw new Error("CLOUDINARY_NOT_CONFIGURED");
    return cld.utils.private_download_url(location, "", {
      resource_type: "raw",
      type: "authenticated",
      attachment: true,
      expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    });
  },
};

let storage: BackupStorage = cloudinaryStorage;
export const backupStorage = () => storage;
/** Tests only. */
export function setBackupStorage(s: BackupStorage) {
  storage = s;
}

/* ---------------- Running a backup ---------------- */

export async function backupsEnabled() {
  const s = await prisma.siteSettings.findFirst({ select: { backupsEnabled: true } }).catch(() => null);
  return s?.backupsEnabled !== false;
}

/** The database as one encrypted file (for "download now"; nothing is stored). */
export async function backupFileNow() {
  const data = await dumpDatabase();
  const file = packBackup(data);
  return { file, name: backupFileName(new Date(data.createdAt)), ...countRows(data) };
}

let running: Promise<unknown> | null = null;

/** Takes a backup and stores it. One at a time; a run already going is waited for and returned. */
export async function runBackup(opts: { trigger: "auto" | "manual"; adminUserId?: string | null }) {
  if (running) {
    await running.catch(() => undefined);
  }
  const job = (async () => {
    // A run cut off by a restart never finished: mark it.
    await prisma.backupRun.updateMany({
      where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - 60 * 60_000) } },
      data: { status: "FAILED", error: "انقطع (السيرفر عمل إعادة تشغيل)", finishedAt: new Date() },
    });
    const run = await prisma.backupRun.create({ data: { trigger: opts.trigger, adminUserId: opts.adminUserId ?? null } });
    try {
      const st = backupStorage();
      if (!st.ready()) throw new Error("STORAGE_NOT_READY");
      const { file, name, counts, tables, rows } = await backupFileNow();
      if (file.length > env.BACKUP_MAX_UPLOAD_MB * 1024 * 1024) throw new Error("TOO_BIG_FOR_STORAGE");
      const { location } = await st.put(name.replace(/\.estbk$/, "") + ".estbk", file);
      const done = await prisma.backupRun.update({
        where: { id: run.id },
        data: { status: "SUCCEEDED", finishedAt: new Date(), sizeBytes: file.length, tables, rows, counts, storage: st.kind, location, fileName: name },
      });
      await pruneOld();
      return done;
    } catch (e) {
      const code = (e as Error)?.message || "FAILED";
      return prisma.backupRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: code.slice(0, 300) } });
    }
  })();
  running = job;
  try {
    return await job;
  } finally {
    if (running === job) running = null;
  }
}

/** Keeps the newest BACKUP_KEEP stored files; removes the rest from storage (the rows stay, as history). */
export async function pruneOld() {
  const stored = await prisma.backupRun.findMany({
    where: { status: "SUCCEEDED", location: { not: null } },
    orderBy: { startedAt: "desc" },
    skip: env.BACKUP_KEEP,
    select: { id: true, location: true },
  });
  for (const r of stored) {
    try {
      await backupStorage().remove(r.location!);
      await prisma.backupRun.update({ where: { id: r.id }, data: { location: null } });
    } catch (e) {
      console.error("[backup] could not remove an old backup:", (e as Error)?.message);
    }
  }
  // History rows: the latest 200.
  const old = await prisma.backupRun.findMany({ orderBy: { startedAt: "desc" }, skip: 200, select: { id: true } });
  if (old.length) await prisma.backupRun.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}

/* ---------------- Daily schedule ---------------- */

export function israelHour(d = new Date()) {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Jerusalem" }).format(d));
  } catch {
    return d.getUTCHours();
  }
}

/**
 * Is an automatic backup due? Once a day at BACKUP_HOUR (Israel time), or any
 * time when the last good one is older than 30 hours (e.g. the server was off
 * at that hour).
 */
export function backupDue(lastSuccess: Date | null, now = new Date(), hour = env.BACKUP_HOUR) {
  if (!lastSuccess) return true;
  const age = now.getTime() - lastSuccess.getTime();
  if (age > 30 * 60 * 60_000) return true;
  return age > 20 * 60 * 60_000 && israelHour(now) === hour;
}

export async function maybeRunDailyBackup(now = new Date()) {
  if (!(await backupsEnabled()) || !backupStorage().ready()) return null;
  const last = await prisma.backupRun.findFirst({ where: { status: "SUCCEEDED" }, orderBy: { startedAt: "desc" }, select: { startedAt: true } });
  if (!backupDue(last?.startedAt ?? null, now)) return null;
  // Don't retry a failing backup more than once an hour.
  const failed = await prisma.backupRun.findFirst({ where: { status: "FAILED", trigger: "auto", startedAt: { gt: new Date(now.getTime() - 60 * 60_000) } } });
  if (failed) return null;
  return runBackup({ trigger: "auto" });
}

let timer: NodeJS.Timeout | undefined;

/** Checks every 10 minutes (BACKUP_CHECK_MS; 0 turns the schedule off), first 5 minutes after start. */
export function startBackupScheduler() {
  const every = Number(process.env.BACKUP_CHECK_MS ?? 10 * 60_000);
  if (!Number.isFinite(every) || every <= 0) return;
  const tick = () => void maybeRunDailyBackup().catch((e) => console.error("[backup] scheduled run failed:", (e as Error)?.message));
  const first = setTimeout(tick, 5 * 60_000);
  first.unref?.();
  timer = setInterval(tick, Math.max(60_000, every));
  timer.unref?.();
}

export function stopBackupScheduler() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
