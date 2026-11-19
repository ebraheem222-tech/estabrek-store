import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { PROJECT_LIMITS, sizeOfProject } from "../../lib/projectFile.js";
import { applyProject, exportProject, previewProject, saveSnapshot, snapshotFile, snapshotsList } from "../../lib/projectSync.js";

/**
 * /v1/admin/system/project — the project as one file (stage 3, item 2; admin → النظام → المشروع كملف). The
 * whole project goes out and comes in here, so only the store's owner may (it can change every table,
 * function and page at once).
 *
 * GET    /                        — what the project holds now, and the saved copies
 * GET    /file                    — the project as a file, to download
 * POST   /preview { file, remove?, accept? } — what bringing the file in would do; nothing is written
 * POST   /apply   { file, remove?, accept?, label? } — brought in (the project as it was is kept first, named `label`)
 * POST   /snapshots { label }     — the project as it is now, kept
 * GET    /snapshots/:id/file      — a saved copy, to download
 * POST   /snapshots/:id/preview { remove?, accept? } — what going back to it would do
 * POST   /snapshots/:id/back    { remove?, accept?, label? } — the project taken back to it (as it is now is kept first)
 * DELETE /snapshots/:id
 *
 * `remove`: things only here ("table:<id>", "page:<id>"…) to go; `accept`: tables whose field changes
 * would set values aside, accepted ("table:<id>").
 */
const r = Router();

r.use((req, _res, next) => {
  if (!req.access?.owner) return next(new AppError(403, "OWNER_ONLY", "Only the store's owner takes the whole project out or brings one in"));
  next();
});

type Lang = "ar" | "en" | "he";
const Lang = z.enum(["ar", "en", "he"]);
const langOf = (req: Request): Lang => {
  const l = Lang.safeParse(req.query?.lang ?? (req.body as { lang?: unknown } | undefined)?.lang);
  return l.success ? l.data : "ar";
};
const Refs = z.array(z.string().max(120)).max(2000).optional();
const FileBody = z.object({ file: z.unknown(), remove: Refs, accept: Refs, label: z.string().trim().max(120).optional(), lang: Lang.optional() }).strict();
const BackBody = z.object({ remove: Refs, accept: Refs, label: z.string().trim().max(120).optional(), lang: Lang.optional() }).strict();
const SaveBody = z.object({ label: z.string().trim().min(1).max(120) }).strict();

const fileName = (at: Date) => `estabrek-project-${at.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
const sendFile = (res: import("express").Response, body: unknown, name: string) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.setHeader("Cache-Control", "no-store");
  // The admin runs on another address: let it read the file name.
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.send(JSON.stringify(body, null, 2));
};
const by = (req: Request) => req.access?.email ?? null;

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [project, snapshots] = await Promise.all([exportProject(), snapshotsList()]);
    res.json({ size: sizeOfProject(project), needs: project.needs ?? null, snapshots, limits: { bytes: PROJECT_LIMITS.bytes, snapshots: PROJECT_LIMITS.snapshots } });
  }),
);

r.get(
  "/file",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    sendFile(res, await exportProject(now), fileName(now));
  }),
);

r.post(
  "/preview",
  asyncHandler(async (req, res) => {
    const body = FileBody.parse(req.body ?? {});
    res.json(await previewProject(body.file, { remove: body.remove, accept: body.accept, lang: body.lang ?? langOf(req) }));
  }),
);

r.post(
  "/apply",
  asyncHandler(async (req, res) => {
    const body = FileBody.parse(req.body ?? {});
    const label = body.label || "Before a project file came in";
    res.json(await applyProject(body.file, { remove: body.remove, accept: body.accept, lang: body.lang ?? langOf(req), by: by(req), label, reason: "before" }));
  }),
);

r.post(
  "/snapshots",
  asyncHandler(async (req, res) => {
    const body = SaveBody.parse(req.body ?? {});
    res.status(201).json(await saveSnapshot(body.label, "saved", by(req)));
  }),
);

r.get(
  "/snapshots/:id/file",
  asyncHandler(async (req, res) => {
    const s = await snapshotFile(String(req.params.id));
    sendFile(res, s.file, fileName(s.createdAt));
  }),
);

r.post(
  "/snapshots/:id/preview",
  asyncHandler(async (req, res) => {
    const body = BackBody.parse(req.body ?? {});
    const s = await snapshotFile(String(req.params.id));
    res.json(await previewProject(s.file, { remove: body.remove, accept: body.accept, lang: body.lang ?? langOf(req) }));
  }),
);

r.post(
  "/snapshots/:id/back",
  asyncHandler(async (req, res) => {
    const body = BackBody.parse(req.body ?? {});
    const s = await snapshotFile(String(req.params.id));
    res.json(await applyProject(s.file, { remove: body.remove, accept: body.accept, lang: body.lang ?? langOf(req), by: by(req), label: body.label || `Before going back to: ${s.label}`, reason: "back" }));
  }),
);

r.delete(
  "/snapshots/:id",
  asyncHandler(async (req, res) => {
    const gone = await prisma.projectSnapshot.deleteMany({ where: { id: String(req.params.id) } });
    if (!gone.count) throw new AppError(404, "SNAPSHOT_NOT_FOUND", "No such saved copy of the project");
    res.status(204).end();
  }),
);

export default r;
