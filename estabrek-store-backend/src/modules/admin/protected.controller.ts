/**
 * Protected products in the admin (modules/protected):
 *   - productProtected   /catalog/products/:productId/protected   master files (kept encrypted)
 *   - protectedTypes     /catalog/protected-types                  how each kind of file carries the mark
 *   - protectedTrace     /catalog/protected-trace                  a leaked file → whose copy it was
 *   - orderLicences      /orders/:id/delivery/licences/:licenceId  reveal, renew, stop, restore a serial
 */
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError } from "../../utils/httpError.js";
import { addMaster, deleteType, listTypes, productProtected as protectedView, removeMaster, renewLicence, revealSerial, saveType, setLicenceStopped, traceLeak } from "../protected/protected.service.js";
import { resetActivation } from "../protected/activation.service.js";

/** Browsers send Arabic file names as UTF-8 bytes that arrive read as latin1. */
function fixName(raw: string) {
  try {
    const s = Buffer.from(raw, "latin1").toString("utf8");
    return s.includes("�") ? raw : s;
  } catch {
    return raw;
  }
}

const masterUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.PROTECTED_MAX_UPLOAD_MB * 1024 * 1024, files: 1 } });
const single = (field: string, maxMb: number) => (req: any, res: any, next: any) =>
  masterUpload.single(field)(req, res, (err: any) => {
    if (!err) return next();
    if (err?.code === "LIMIT_FILE_SIZE") return next(new AppError(413, "FILE_TOO_BIG", `Files up to ${maxMb} MB`, { maxMb }));
    next(err);
  });

async function adminId(req: any) {
  if (!req.user?.sub) return null;
  const a = await prisma.adminUser.findUnique({ where: { id: String(req.user.sub) }, select: { id: true } });
  return a?.id ?? null;
}

/* ---------------- Master files ---------------- */

export const productProtected = Router({ mergeParams: true });

productProtected.get(
  "/",
  asyncHandler(async (req: any, res) => {
    res.json(await protectedView(String(req.params.productId), req.user?.sub ?? null));
  }),
);

productProtected.post(
  "/",
  single("file", env.PROTECTED_MAX_UPLOAD_MB),
  asyncHandler(async (req: any, res) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer?.length) throw new AppError(400, "NO_FILE", "Choose a file");
    const row = await addMaster({ productId: String(req.params.productId), name: fixName(file.originalname || "file"), data: file.buffer, adminUserId: await adminId(req) });
    res.status(201).json(row);
  }),
);

productProtected.delete(
  "/:fileId",
  asyncHandler(async (req: any, res) => {
    res.json(await removeMaster(String(req.params.productId), String(req.params.fileId), await adminId(req)));
  }),
);

/* ---------------- File types ---------------- */

export const protectedTypes = Router();

protectedTypes.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ types: await listTypes() });
  }),
);

const TypeBody = z
  .object({
    label: z.string().trim().min(1).max(60),
    mode: z.enum(["comment", "stl", "package"]),
    commentStart: z.string().trim().max(12).nullable().optional(),
    commentEnd: z.string().trim().max(12).nullable().optional(),
  })
  .strict();

protectedTypes.put(
  "/:ext",
  validate({ body: TypeBody }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof TypeBody>;
    res.json({ types: await saveType({ ext: String(req.params.ext), ...b }) });
  }),
);

protectedTypes.delete(
  "/:ext",
  asyncHandler(async (req, res) => {
    res.json({ types: await deleteType(String(req.params.ext)) });
  }),
);

/* ---------------- Leaks ---------------- */

export const protectedTrace = Router();

/** A leaked file (upload) or pasted text: the orders whose marks are in it. */
protectedTrace.post(
  "/",
  single("file", env.PROTECTED_MAX_UPLOAD_MB),
  asyncHandler(async (req: any, res) => {
    const file = req.file as Express.Multer.File | undefined;
    const text = typeof req.body?.text === "string" ? req.body.text.slice(0, 2_000_000) : "";
    if (!file?.buffer?.length && !text) throw new AppError(400, "NOTHING_TO_TRACE", "Upload the file or paste its text");
    res.json(await traceLeak(file?.buffer?.length ? file.buffer : Buffer.from(text, "utf8")));
  }),
);

/* ---------------- An order's serials ---------------- */

export const orderLicences = Router();

orderLicences.post(
  "/:id/delivery/licences/:licenceId/reveal",
  asyncHandler(async (req, res) => {
    res.json(await revealSerial(String(req.params.id), String(req.params.licenceId)));
  }),
);

orderLicences.post(
  "/:id/delivery/licences/:licenceId/renew",
  asyncHandler(async (req, res) => {
    res.json(await renewLicence(String(req.params.id), String(req.params.licenceId)));
  }),
);

orderLicences.post(
  "/:id/delivery/licences/:licenceId/stop",
  asyncHandler(async (req, res) => {
    res.json(await setLicenceStopped(String(req.params.id), String(req.params.licenceId), true));
  }),
);

orderLicences.post(
  "/:id/delivery/licences/:licenceId/restore",
  asyncHandler(async (req, res) => {
    res.json(await setLicenceStopped(String(req.params.id), String(req.params.licenceId), false));
  }),
);

/** Frees a PC from a serial (she changed computers). */
orderLicences.post(
  "/:id/delivery/licences/:licenceId/activations/:activationId/reset",
  asyncHandler(async (req, res) => {
    res.json(await resetActivation(String(req.params.id), String(req.params.licenceId), String(req.params.activationId)));
  }),
);
