/**
 * POST /v1/requests — a shopper's request (form fields, optional photos as
 * multipart "photos"): «اطلبي قطعتكِ» or «بدي حدا يحكيني».
 */
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { createRequest } from "./requests.service.js";

const r = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5, fields: 20 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(file.mimetype)),
});

const Body = z.object({
  kind: z.enum(["SIZE", "COLOR", "NEW_PIECE", "CALLBACK"]),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(40),
  email: z.union([z.string().trim().toLowerCase().email().max(160), z.literal("")]).optional(),
  productId: z.string().max(64).optional(),
  variantId: z.string().max(64).optional(),
  wantedSize: z.string().trim().max(40).optional(),
  wantedColor: z.string().trim().max(60).optional(),
  details: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(40).optional(),
});

r.post(
  "/",
  (req, res, next) => {
    upload.array("photos", 5)(req, res, (err: any) => {
      if (!err) return next();
      if (err?.code === "LIMIT_FILE_SIZE") return next(new AppError(413, "PHOTO_TOO_BIG", "Each photo up to 8 MB"));
      if (err?.code === "LIMIT_FILE_COUNT" || err?.code === "LIMIT_UNEXPECTED_FILE") return next(new AppError(400, "TOO_MANY_PHOTOS", "Too many photos"));
      next(err);
    });
  },
  asyncHandler(async (req, res) => {
    const parsed = Body.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError(400, "VALIDATION_ERROR", "Check the form", parsed.error.flatten());
    const files = ((req as any).files as Express.Multer.File[] | undefined) ?? [];
    const created = await createRequest({ ...parsed.data, email: parsed.data.email || null }, files.map((f) => f.buffer), req.ip);
    res.status(201).json({ ok: true, id: created.id });
  }),
);

export default r;
