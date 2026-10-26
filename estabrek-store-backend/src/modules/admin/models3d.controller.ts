import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { scanFile } from "../../lib/antivirus.js";
import { MODEL_FOLDER, cloudinaryRaw, deleteRawFromCloudinary, isCloudinaryEnabled, signModelUpload } from "../../lib/cloudinary.js";
import { GLB_MAX_BYTES, GLB_MAX_MB, glbHeader } from "../../lib/glb.js";
import { makePublicUrl } from "./uploads.controller.js";

/**
 * /v1/admin/media/models — the store's own 3D models (.glb) for a gaming theme's stage
 * (admin → ثيمات المتجر → محرّر المشهد), kept in the media library as kind "MODEL".
 * With Cloudinary the admin's browser sends the file straight there as a raw file
 * (POST /sign gives it a signature) and then tells us (POST /): we check it is ours,
 * not too big, and really a binary glTF 2.0. Without Cloudinary the file comes here
 * (POST /local). The stage keeps only the address (settings header.storeThemeOptions).
 */
const r = Router();

const MODELS_DIR = path.resolve(process.cwd(), "uploads", "models");
const KIND = "MODEL";
const newId = () => randomBytes(6).toString("hex");

function modelToResponse(req: any, asset: any) {
  return {
    id: asset.id,
    displayName: asset.displayName,
    url: asset.url ?? makePublicUrl(req, `/uploads/${asset.filename}`),
    size: asset.size,
    provider: asset.provider,
    createdAt: asset.createdAt,
  };
}

/** The first 12 bytes of a file Cloudinary keeps (its header). */
async function remoteHead(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-11" } });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer()).slice(0, 12);
  } catch {
    return null;
  }
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.mediaAsset.findMany({ where: { kind: KIND }, orderBy: { createdAt: "desc" }, take: 200 });
    res.json({ items: items.map((a) => modelToResponse(req, a)), maxBytes: GLB_MAX_BYTES, cloudinary: isCloudinaryEnabled() });
  }),
);

/** Cloudinary: what the browser needs to send the file. */
r.post(
  "/sign",
  asyncHandler(async (_req, res) => {
    if (!isCloudinaryEnabled()) throw new AppError(409, "CLOUDINARY_NOT_CONFIGURED", "Models go to the server's disk (no Cloudinary): use /local");
    res.json({ ...signModelUpload(), maxBytes: GLB_MAX_BYTES });
  }),
);

const CompleteBody = z
  .object({
    publicId: z.string().trim().min(1).max(300),
    displayName: z.string().trim().max(200).optional(),
  })
  .strict();

/** Cloudinary: the browser finished sending the file. */
r.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!isCloudinaryEnabled()) throw new AppError(409, "CLOUDINARY_NOT_CONFIGURED", "Cloudinary isn't set up");
    const body = CompleteBody.parse(req.body ?? {});
    if (!body.publicId.startsWith(`${MODEL_FOLDER}/`)) throw new AppError(400, "NOT_OUR_MODEL", "Only models uploaded from this admin can be added");
    const existing = await prisma.mediaAsset.findFirst({ where: { kind: KIND, providerId: body.publicId } });
    if (existing) return res.json(modelToResponse(req, existing));
    let info;
    try {
      info = await cloudinaryRaw(body.publicId);
    } catch {
      throw new AppError(404, "MODEL_NOT_FOUND", "Cloudinary doesn't have this file");
    }
    if (info.bytes > GLB_MAX_BYTES) {
      await deleteRawFromCloudinary(info.publicId).catch(() => undefined);
      throw new AppError(413, "FILE_TOO_LARGE", `Max model size is ${GLB_MAX_MB}MB`);
    }
    const head = await remoteHead(info.url);
    const check = head ? glbHeader(head) : null;
    if (!check?.ok) {
      await deleteRawFromCloudinary(info.publicId).catch(() => undefined);
      throw new AppError(415, "NOT_A_GLB", "Only binary glTF 2.0 files (.glb)");
    }
    const created = await prisma.mediaAsset.create({
      data: {
        kind: KIND,
        filename: info.publicId,
        url: info.url,
        provider: "CLOUDINARY",
        providerId: info.publicId,
        displayName: body.displayName || info.publicId.split("/").pop() || "model",
        tags: [],
        mime: "model/gltf-binary",
        size: info.bytes,
      },
    });
    res.status(201).json(modelToResponse(req, created));
  }),
);

const localStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(MODELS_DIR, { recursive: true });
      cb(null, MODELS_DIR);
    } catch (e: any) {
      cb(e, MODELS_DIR);
    }
  },
  filename: (_req, _file, cb) => cb(null, `${Date.now()}-${newId()}.glb`),
});

/** Without Cloudinary: the file comes to this server. */
r.post("/local", (req, res, next) => {
  if (isCloudinaryEnabled()) return res.status(409).json({ error: "USE_CLOUDINARY", message: "Models go to Cloudinary: use /sign" });
  const upload = multer({
    storage: localStorage,
    limits: { fileSize: GLB_MAX_BYTES },
    fileFilter: (_r, file, cb) => {
      if (path.extname(file.originalname || "").toLowerCase() === ".glb") return cb(null, true);
      const err = new Error("INVALID_FILE_TYPE") as any;
      err.code = "INVALID_FILE_TYPE";
      cb(err);
    },
  }).single("file");
  upload(req as any, res as any, async (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "FILE_TOO_LARGE", message: `Max model size is ${GLB_MAX_MB}MB` });
      if (err.code === "INVALID_FILE_TYPE") return res.status(415).json({ error: "INVALID_FILE_TYPE", message: "Only .glb files" });
      return res.status(400).json({ error: "UPLOAD_FAILED", message: err.message ?? String(err) });
    }
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "NO_FILE" });
    const full = path.join(MODELS_DIR, file.filename);
    const drop = () => fs.unlink(full).catch(() => undefined);
    try {
      const fd = await fs.open(full, "r");
      const head = new Uint8Array(12);
      try {
        await fd.read(head, 0, 12, 0);
      } finally {
        await fd.close();
      }
      if (!glbHeader(head, file.size).ok) {
        await drop();
        return res.status(415).json({ error: "NOT_A_GLB", message: "Only binary glTF 2.0 files (.glb)" });
      }
      const scan = await scanFile(full);
      if (!scan.ok) {
        await drop();
        return res.status(scan.code === "FILE_INFECTED" ? 422 : 503).json({ error: scan.code, message: scan.message });
      }
      const created = await prisma.mediaAsset.create({
        data: {
          kind: KIND,
          filename: `models/${file.filename}`,
          provider: "LOCAL",
          displayName: String(req.body?.displayName || file.originalname || file.filename).slice(0, 200),
          tags: [],
          mime: "model/gltf-binary",
          size: file.size,
        },
      });
      res.status(201).json(modelToResponse(req, created));
    } catch (e) {
      await drop();
      next(e);
    }
  });
});

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.findFirst({ where: { id: String(req.params.id), kind: KIND } });
    if (!asset) throw NotFound("Model not found");
    if (asset.provider === "CLOUDINARY" && asset.providerId) await deleteRawFromCloudinary(asset.providerId).catch(() => undefined);
    else await fs.unlink(path.resolve(process.cwd(), "uploads", asset.filename)).catch(() => undefined);
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    res.json({ ok: true });
  }),
);

export default r;
