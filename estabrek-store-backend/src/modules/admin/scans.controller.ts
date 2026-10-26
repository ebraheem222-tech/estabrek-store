import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { NotFound } from "../../utils/httpError.js";
import { scanFile } from "../../lib/antivirus.js";
import { deleteFromCloudinary, isCloudinaryEnabled, uploadImageToCloudinary } from "../../lib/cloudinary.js";
import { makePublicUrl } from "./uploads.controller.js";
import { ScanLink, ScanManifest } from "../../lib/scanManifest.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";

/**
 * /v1/admin/media/scans — 360° scans of products (admin → الوسائط → مسح 3D). The admin's
 * browser films nothing itself: it reads the store's video, cuts the product out of one
 * turn on the printed mat, and sends here one sprite sheet (WebP, see-through background)
 * with its manifest: where each frame is in the sheet, its angle, the camera's height, the
 * product's size and the checks the video passed. Kept in the media library as kind
 * "SCAN" (the manifest in videoMeta), the sheet on Cloudinary or this server's disk.
 * A scan can be linked to a product (and one of its colours): the shop's product page
 * then shows it (lib/productSpins.ts); ?productId= lists one product's.
 */
const r = Router();

const SCANS_DIR = path.resolve(process.cwd(), "uploads", "scans");
const SCAN_FOLDER = "estabrek/scans";
const KIND = "SCAN";
const MAX_SHEET_BYTES = 15 * 1024 * 1024;
const SHEET_TYPES = new Map([
  ["image/webp", ".webp"],
  ["image/png", ".png"],
]);

function scanToResponse(req: any, asset: any) {
  return {
    id: asset.id,
    displayName: asset.displayName,
    url: asset.url ?? makePublicUrl(req, `/uploads/${asset.filename}`),
    size: asset.size,
    width: asset.width,
    height: asset.height,
    manifest: asset.videoMeta,
    createdAt: asset.createdAt,
  };
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const productId = typeof req.query.productId === "string" && /^[\w-]{1,64}$/.test(req.query.productId) ? req.query.productId : null;
    const items = await prisma.mediaAsset.findMany({
      where: { kind: KIND, ...(productId ? { videoMeta: { path: ["product", "id"], equals: productId } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ items: items.map((a) => scanToResponse(req, a)) });
  }),
);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, _file, cb) => cb(null, `scan-${Date.now()}-${randomBytes(6).toString("hex")}`),
  }),
  limits: { fileSize: MAX_SHEET_BYTES, files: 1 },
  fileFilter: (_r, file, cb) => {
    if (SHEET_TYPES.has((file.mimetype || "").toLowerCase())) return cb(null, true);
    const err = new Error("INVALID_FILE_TYPE") as any;
    err.code = "INVALID_FILE_TYPE";
    cb(err);
  },
}).single("sheet");

r.post("/", (req, res, next) => {
  upload(req as any, res as any, async (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "FILE_TOO_LARGE", message: "Max sheet size is 15MB" });
      if (err.code === "INVALID_FILE_TYPE") return res.status(415).json({ error: "INVALID_FILE_TYPE", message: "The sheet must be WebP or PNG" });
      return res.status(400).json({ error: "UPLOAD_FAILED", message: err.message ?? String(err) });
    }
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "NO_FILE" });
    const drop = () => fs.unlink(file.path).catch(() => undefined);
    let manifest: z.infer<typeof ScanManifest>;
    try {
      manifest = ScanManifest.parse(JSON.parse(String(req.body?.manifest ?? "")));
    } catch {
      await drop();
      return res.status(400).json({ error: "BAD_MANIFEST", message: "The scan's manifest isn't valid" });
    }
    try {
      const scan = await scanFile(file.path);
      if (!scan.ok) {
        await drop();
        return res.status(scan.code === "FILE_INFECTED" ? 422 : 503).json({ error: scan.code, message: scan.message });
      }
      const displayName = String(req.body?.displayName || manifest.video.name || "scan").slice(0, 200);
      const ext = SHEET_TYPES.get(file.mimetype.toLowerCase())!;
      let data: { filename: string; url: string | null; provider: string; providerId: string | null };
      if (isCloudinaryEnabled()) {
        const up = await uploadImageToCloudinary({ filePath: file.path, folder: SCAN_FOLDER, displayName });
        await drop();
        data = { filename: up.publicId, url: up.url, provider: "CLOUDINARY", providerId: up.publicId };
      } else {
        await fs.mkdir(SCANS_DIR, { recursive: true });
        const name = `${path.basename(file.path)}${ext}`;
        await fs.rename(file.path, path.join(SCANS_DIR, name)).catch(async () => {
          await fs.copyFile(file.path, path.join(SCANS_DIR, name));
          await drop();
        });
        data = { filename: `scans/${name}`, url: null, provider: "LOCAL", providerId: null };
      }
      const created = await prisma.mediaAsset.create({
        data: {
          kind: KIND,
          ...data,
          displayName,
          tags: [],
          mime: file.mimetype,
          size: file.size,
          width: manifest.cols * manifest.cellW,
          height: manifest.rows * manifest.cellH,
          videoMeta: manifest as any,
        },
      });
      res.status(201).json(scanToResponse(req, created));
    } catch (e) {
      await drop();
      next(e);
    }
  });
});

/** PATCH /:id { productId?, itemId?, modelUrl?, displayName? } — what product it shows, its 3D model, its name. */
r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = ScanLink.safeParse(req.body ?? {});
    if (!body.success) return res.status(400).json({ error: "BAD_LINK", message: body.error.issues[0]?.message ?? "Not valid" });
    const asset = await prisma.mediaAsset.findFirst({ where: { id: String(req.params.id), kind: KIND } });
    if (!asset) throw NotFound("Scan not found");
    const was = ScanManifest.safeParse(asset.videoMeta);
    if (!was.success) return res.status(409).json({ error: "BAD_MANIFEST", message: "This scan's manifest isn't valid" });
    const manifest = { ...was.data };
    const before = manifest.product?.id ?? null;
    const { productId, itemId, modelUrl, displayName } = body.data;
    if (productId === null) manifest.product = null;
    else if (productId !== undefined) {
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, items: { select: { id: true } } } });
      if (!product) return res.status(404).json({ error: "PRODUCT_NOT_FOUND" });
      if (itemId && !product.items.some((i) => i.id === itemId)) return res.status(400).json({ error: "NOT_THIS_PRODUCT", message: "That colour isn't this product's" });
      manifest.product = { id: productId, itemId: itemId ?? null };
    }
    if (modelUrl !== undefined) manifest.model = modelUrl ? { url: modelUrl } : null;
    const updated = await prisma.mediaAsset.update({ where: { id: asset.id }, data: { videoMeta: manifest as any, ...(displayName ? { displayName } : {}) } });
    // The product pages it leaves and joins change: touching the products clears their caches (lib/dbWrites.ts), then the shop's.
    const touched = [...new Set([before, manifest.product?.id ?? null].filter((x): x is string => Boolean(x)))];
    for (const id of touched) await prisma.product.update({ where: { id }, data: { updatedAt: new Date() } }).catch(() => undefined);
    if (touched.length || modelUrl !== undefined) void revalidateStorefront({ tags: ["catalog:products"] }).catch(() => undefined);
    res.json(scanToResponse(req, updated));
  }),
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.findFirst({ where: { id: String(req.params.id), kind: KIND } });
    if (!asset) throw NotFound("Scan not found");
    if (asset.provider === "CLOUDINARY" && asset.providerId) await deleteFromCloudinary(asset.providerId).catch(() => undefined);
    else await fs.unlink(path.resolve(process.cwd(), "uploads", asset.filename)).catch(() => undefined);
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    res.json({ ok: true });
  }),
);

export default r;
