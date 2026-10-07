import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { hasPermission } from "../../middleware/access.js";
import { usesCustomKey } from "../backups/backupFile.js";
import { backupFileNow, backupStorage, backupsEnabled, runBackup } from "../backups/backup.service.js";

/**
 * /v1/admin/system/backups — the backups page (system:read). Taking a backup,
 * downloading one and getting a link need system:write (the file holds all the
 * store's data).
 */
const r = Router();

function needWrite(req: any) {
  if (!hasPermission(req, "system:write")) throw new AppError(403, "FORBIDDEN", "Backups need the system:write permission");
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const runs = await prisma.backupRun.findMany({ orderBy: { startedAt: "desc" }, take: 30 });
    const last = await prisma.backupRun.findFirst({ where: { status: "SUCCEEDED" }, orderBy: { startedAt: "desc" } });
    res.json({
      enabled: await backupsEnabled(),
      storage: { kind: backupStorage().kind, ready: backupStorage().ready() },
      customKey: usesCustomKey(),
      keep: env.BACKUP_KEEP,
      hour: env.BACKUP_HOUR,
      maxUploadMb: env.BACKUP_MAX_UPLOAD_MB,
      last,
      runs,
    });
  }),
);

// POST /v1/admin/system/backups/run — take a backup now and store it
r.post(
  "/run",
  asyncHandler(async (req, res) => {
    needWrite(req);
    const adminUserId = (req as any).user?.bypass ? null : (req as any).access?.adminId ?? null;
    const run = await runBackup({ trigger: "manual", adminUserId });
    res.status(run.status === "SUCCEEDED" ? 201 : 500).json(run);
  }),
);

// GET /v1/admin/system/backups/download — a fresh backup straight to this computer (nothing stored)
r.get(
  "/download",
  asyncHandler(async (req, res) => {
    needWrite(req);
    const { file, name } = await backupFileNow();
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Cache-Control", "no-store");
    // The admin runs on another address: let it read the file name.
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.end(file);
  }),
);

// GET /v1/admin/system/backups/:id/link — a 5-minute link to a stored backup
r.get(
  "/:id/link",
  asyncHandler(async (req, res) => {
    needWrite(req);
    const run = await prisma.backupRun.findUnique({ where: { id: String(req.params.id) } });
    if (!run || !run.location) throw NotFound("This backup is no longer stored");
    res.json({ url: await backupStorage().link(run.location), fileName: run.fileName });
  }),
);

export default r;
