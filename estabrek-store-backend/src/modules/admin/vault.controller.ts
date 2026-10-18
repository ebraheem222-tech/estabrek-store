/**
 * Admin → الخزنة (/v1/admin/vault): the vault's state, the owner's 20-minute
 * session (password + authenticator code), moving older masters in, the vault's
 * own log, the licence keys, and the Windows launcher buyers download.
 */
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError } from "../../utils/httpError.js";
import { closeVaultSession, moveLocalFilesToVault, openVaultSession, requireVaultSession, vaultEvents, vaultStatus } from "../vault/vaultAdmin.service.js";
import { CHECK_EVERY_DAYS, OFFLINE_GRACE_DAYS, publicKeys } from "../protected/activation.service.js";
import { listLaunchers, removeLauncher, uploadLauncher } from "../protected/launcher.service.js";

export const vaultAdmin = Router();

const me = (req: any) => {
  const id = req.user?.sub;
  if (!id) throw new AppError(401, "UNAUTHORIZED", "Sign in again");
  return String(id);
};

vaultAdmin.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const [status, keys, launchers] = await Promise.all([vaultStatus(me(req)), publicKeys(), listLaunchers()]);
    res.json({ ...status, keys, launchers, checkEveryDays: CHECK_EVERY_DAYS, offlineGraceDays: OFFLINE_GRACE_DAYS, launcherMaxMb: env.LAUNCHER_MAX_UPLOAD_MB });
  }),
);

const OpenBody = z.object({ password: z.string().min(1).max(200), code: z.string().trim().min(6).max(10) }).strict();

vaultAdmin.post(
  "/session",
  validate({ body: OpenBody }),
  asyncHandler(async (req: any, res) => {
    res.json(await openVaultSession(me(req), req.body as z.infer<typeof OpenBody>, { ip: req.ip, ua: req.get("user-agent") ?? null }));
  }),
);

vaultAdmin.delete(
  "/session",
  asyncHandler(async (req: any, res) => {
    res.json(await closeVaultSession(me(req)));
  }),
);

/** Masters kept in the database from before the vault: moved in. */
vaultAdmin.post(
  "/move-in",
  asyncHandler(async (req: any, res) => {
    res.json(await moveLocalFilesToVault(await requireVaultSession(me(req))));
  }),
);

vaultAdmin.get(
  "/events",
  asyncHandler(async (req: any, res) => {
    res.json({ events: await vaultEvents(me(req)) });
  }),
);

/* ---------------- The launcher ---------------- */

const launcherUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.LAUNCHER_MAX_UPLOAD_MB * 1024 * 1024, files: 1 } });

vaultAdmin.post(
  "/launchers",
  (req, res, next) =>
    launcherUpload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      if (err?.code === "LIMIT_FILE_SIZE") return next(new AppError(413, "FILE_TOO_BIG", `Up to ${env.LAUNCHER_MAX_UPLOAD_MB} MB`));
      next(err);
    }),
  asyncHandler(async (req: any, res) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer?.length) throw new AppError(400, "NO_FILE", "Choose the launcher (.exe)");
    res.status(201).json(await uploadLauncher({ version: String(req.body?.version ?? ""), notes: req.body?.notes ?? null, data: file.buffer, adminUserId: me(req) }));
  }),
);

vaultAdmin.delete(
  "/launchers/:id",
  asyncHandler(async (req, res) => {
    res.json(await removeLauncher(String(req.params.id)));
  }),
);
