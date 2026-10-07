// src/modules/admin/uploads.controller.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

import { prisma } from "../../lib/prisma.js";
import { scanFile } from "../../lib/antivirus.js";
import { deleteFromCloudinary, isCloudinaryEnabled, uploadImageToCloudinary } from "../../lib/cloudinary.js";
import { createBlurDataUrlFromFile } from "../../lib/lqip.js";
import { computeDhashHex, hammingHex } from "../../lib/imageHash.js";
import { findDuplicateMediaAsset } from "../../lib/mediaDedup.js";

const r = Router();

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const IMAGES_DIR = path.join(UPLOAD_ROOT, "images");

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function isAllowedImage(file: { originalname?: string; mimetype?: string }) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  return ALLOWED_IMAGE_EXT.has(ext) && ALLOWED_IMAGE_MIME.has(mime);
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(IMAGES_DIR, { recursive: true });
      cb(null, IMAGES_DIR);
    } catch (e: any) {
      cb(e, IMAGES_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".jpg";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (isAllowedImage(file)) return cb(null, true);
    const err = new Error("INVALID_FILE_TYPE") as any;
    err.code = "INVALID_FILE_TYPE";
    return cb(err, false);
  },
});

function makePublicUrl(req: any, rel: string) {
  const proto = req.headers["x-forwarded-proto"]?.toString() || req.protocol;
  const host = req.headers["x-forwarded-host"]?.toString() || req.get("host");
  return `${proto}://${host}${rel}`;
}

function guessMimeFromExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "image/*";
}

function parseTags(raw: any): string[] {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  const s = String(raw).trim();
  if (!s) return [];

  // allow JSON array
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x).trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }

  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function mergeTags(current: string[] | null | undefined, incoming: string[]) {
  if (!incoming.length) return current ?? [];
  const out = [...(current ?? [])];
  const set = new Set(out);
  for (const tag of incoming) {
    if (!set.has(tag)) {
      set.add(tag);
      out.push(tag);
    }
  }
  return out;
}

async function optimizeImageInPlace(filePath: string) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const isCloud = isCloudinaryEnabled();
    const meta = await sharp(filePath, { failOnError: false }).metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
      return { ok: false, width: null, height: null, size: 0 };
    }

    const maxW = isCloud ? 4000 : 2000;
    const maxH = isCloud ? 4000 : 2000;
    const needsResize = !!(meta.width && meta.height && (meta.width > maxW || meta.height > maxH));

    // If Cloudinary is enabled and no resize is needed, keep original bytes (no re-encode).
    if (isCloud && !needsResize) {
      const st = await fs.stat(filePath);
      return { ok: true, width: meta.width ?? null, height: meta.height ?? null, size: st.size };
    }

    let img = sharp(filePath, { failOnError: false }).rotate();
    if (needsResize) {
      img = img.resize({ width: maxW, height: maxH, fit: "inside", withoutEnlargement: true });
    }

    // encode based on ext
    if (ext === ".png") {
      img = isCloud ? img.png({ compressionLevel: 6, palette: false }) : img.png({ compressionLevel: 9, palette: true });
    } else if (ext === ".webp") {
      img = img.webp({ quality: isCloud ? 90 : 82 });
    } else {
      img = img.jpeg({ quality: isCloud ? 90 : 82, mozjpeg: true });
    }

    const tmpPath = `${filePath}.tmp`;
    await img.toFile(tmpPath);
    await fs.rename(tmpPath, filePath);

    const st = await fs.stat(filePath);
    return { ok: true, width: meta.width ?? null, height: meta.height ?? null, size: st.size };
  } catch {
    // If optimization fails, keep original.
    try {
      const st = await fs.stat(filePath);
      return { ok: false, width: null, height: null, size: st.size };
    } catch {
      return { ok: false, width: null, height: null, size: 0 };
    }
  }
}

async function syncDiskImagesToDb() {
  // If Cloudinary is enabled, disk uploads are not the source of truth.
  if (isCloudinaryEnabled()) return;
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const names = (await fs.readdir(IMAGES_DIR)).filter((n) => /\.(png|jpe?g|webp)$/i.test(n));
  if (!names.length) return;

  const existing = await prisma.mediaAsset.findMany({
    where: { filename: { in: names } },
    select: { filename: true },
  });
  const seen = new Set(existing.map((x) => x.filename));

  const now = new Date();
  const createRows: any[] = [];

  for (const filename of names) {
    if (seen.has(filename)) continue;
    const p = path.join(IMAGES_DIR, filename);
    const st = await fs.stat(p);
    const createdAt = new Date(st.mtimeMs);
    createRows.push({
      id: undefined,
      kind: "IMAGE",
      filename,
      displayName: filename,
      folder: null,
      tags: [],
      mime: guessMimeFromExt(filename),
      size: st.size,
      width: null,
      height: null,
      createdAt,
      updatedAt: now,
    });
  }

  if (createRows.length) {
    // createMany skips duplicates
    await prisma.mediaAsset.createMany({ data: createRows, skipDuplicates: true });
  }
}

function parseCursor(cursor?: string | null) {
  if (!cursor) return null;
  const [iso, id] = String(cursor).split("|");
  const d = new Date(iso);
  if (!id || Number.isNaN(d.getTime())) return null;
  return { createdAt: d, id };
}

async function ensureFolderExists(name: string | null | undefined) {
  const folderName = (name ?? "").trim();
  if (!folderName) return;
  // This makes folders "real" so the UI can show empty folders too.
  await prisma.mediaFolder.upsert({
    where: { name: folderName },
    update: {},
    create: { name: folderName },
  });
}

type MediaUsage =
  | { kind: "settings"; field: string }
  | { kind: "page"; pageId: string; slug: string; field: string }
  | { kind: "page_section"; pageId: string; slug: string; sectionId: string; sectionType: string }
  | { kind: "product"; productId: string; productSlug: string; productTitle: string; itemId: string; colorName: string; imageId: string };

function includesFilename(val: any, filename: string) {
  if (!val) return false;
  if (typeof val === "string") return val.includes(filename);
  try {
    return JSON.stringify(val).includes(filename);
  } catch {
    return false;
  }
}

async function findUsageByFilename(filename: string): Promise<MediaUsage[]> {
  const usage: MediaUsage[] = [];

  // Settings
  const settings = await prisma.siteSettings.findFirst({
    select: {
      logoUrl: true,
      faviconUrl: true,
      header: true,
      footer: true,
      scriptsHead: true,
      scriptsBody: true,
      customCss: true,
    },
  });
  if (settings) {
    if (includesFilename(settings.logoUrl, filename)) usage.push({ kind: "settings", field: "logoUrl" });
    if (includesFilename(settings.faviconUrl, filename)) usage.push({ kind: "settings", field: "faviconUrl" });
    if (includesFilename(settings.header, filename)) usage.push({ kind: "settings", field: "header" });
    if (includesFilename(settings.footer, filename)) usage.push({ kind: "settings", field: "footer" });
    if (includesFilename(settings.scriptsHead, filename)) usage.push({ kind: "settings", field: "scriptsHead" });
    if (includesFilename(settings.scriptsBody, filename)) usage.push({ kind: "settings", field: "scriptsBody" });
    if (includesFilename(settings.customCss, filename)) usage.push({ kind: "settings", field: "customCss" });
  }

  // Pages + sections
  const sections = await prisma.pageSection.findMany({ select: { id: true, pageId: true, type: true, data: true } });
  const sectionHits = sections.filter((s) => includesFilename(s.data, filename));
  const hitPageIds = new Set(sectionHits.map((s) => s.pageId));

  const pages = await prisma.page.findMany({
    select: { id: true, slug: true, customCss: true, headScripts: true, bodyScripts: true, canonicalUrl: true },
  });

  for (const p of pages) {
    if (includesFilename(p.customCss, filename)) usage.push({ kind: "page", pageId: p.id, slug: p.slug, field: "customCss" });
    if (includesFilename(p.headScripts, filename)) usage.push({ kind: "page", pageId: p.id, slug: p.slug, field: "headScripts" });
    if (includesFilename(p.bodyScripts, filename)) usage.push({ kind: "page", pageId: p.id, slug: p.slug, field: "bodyScripts" });
    if (includesFilename(p.canonicalUrl, filename)) usage.push({ kind: "page", pageId: p.id, slug: p.slug, field: "canonicalUrl" });
  }

  const pageById = new Map(pages.map((p) => [p.id, p] as const));
  for (const s of sectionHits) {
    const p = pageById.get(s.pageId);
    if (!p) continue;
    usage.push({ kind: "page_section", pageId: p.id, slug: p.slug, sectionId: s.id, sectionType: String(s.type) });
  }

  // Products (images table)
  const productImgs = await prisma.productItemImage.findMany({
    where: { url: { contains: filename } },
    select: {
      id: true,
      productItemId: true,
      item: {
        select: {
          id: true,
          colorName: true,
          product: { select: { id: true, slug: true, title: true } },
        },
      },
    },
  });
  for (const img of productImgs) {
    const prod = img.item.product;
    usage.push({
      kind: "product",
      productId: prod.id,
      productSlug: prod.slug,
      productTitle: prod.title,
      itemId: img.item.id,
      colorName: img.item.colorName,
      imageId: img.id,
    });
  }

  // Ensure folder table has any folders currently used by assets.
  if (hitPageIds.size) {
    // no-op, just keeping variable used to avoid lint noise in some configs
  }

  return usage;
}

function makeCursor(createdAt: Date, id: string) {
  return `${createdAt.toISOString()}|${id}`;
}

function mediaAssetToResponse(req: any, asset: any) {
  const rel = `/uploads/images/${asset.filename}`;
  const url = asset.url ? asset.url : makePublicUrl(req, rel);
  return {
    id: asset.id,
    url,
    path: asset.url ? asset.url : rel,
    filename: asset.filename,
    displayName: asset.displayName,
    folder: asset.folder,
    tags: asset.tags,
    mimetype: asset.mime,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    blurDataUrl: asset.blurDataUrl ?? null,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    provider: asset.provider,
    providerId: asset.providerId,
  };
}

// GET /admin/uploads/images
// Query:
//  - q: substring search on filename/displayName
//  - folder: exact folder filter
//  - tag: exact tag filter
//  - limit: number (default 60, max 200)
//  - cursor: `${createdAtIso}|${id}`
r.get("/images", async (req, res) => {
  try {
    // Keep DB in sync with disk (best-effort)
    // When using Cloudinary, there's no local disk to sync.
    if (!isCloudinaryEnabled() && !req.query.cursor) {
      await syncDiskImagesToDb();
    }

    const q = (req.query.q?.toString() ?? "").trim();
    const folderRaw = (req.query.folder?.toString() ?? "").trim();
    const tag = (req.query.tag?.toString() ?? "").trim();

    const limitRaw = Number(req.query.limit ?? 60);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 60));

    const cursor = parseCursor(req.query.cursor?.toString() ?? null);

    const where: any = {
      kind: "IMAGE",
    };
    if (q) {
      where.OR = [
        { filename: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ];
    }
    if (folderRaw) {
      if (folderRaw === "__unfiled__") where.folder = null;
      else where.folder = folderRaw;
    }
    if (tag) where.tags = { has: tag };

    if (cursor) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
          ],
        },
      ];
    }

    const rows = await prisma.mediaAsset.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);

    const items = page.map((r) => {
      const rel = `/uploads/images/${r.filename}`;
      const url = r.url ? r.url : makePublicUrl(req, rel);
      return {
        id: r.id,
        url,
        path: r.url ? r.url : rel,
        filename: r.filename,
        displayName: r.displayName,
        folder: r.folder,
        tags: r.tags,
        mimetype: r.mime,
        size: r.size,
        width: r.width,
        height: r.height,
        blurDataUrl: (r as any).blurDataUrl ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        provider: r.provider,
        providerId: r.providerId,
      };
    });

    const nextCursor = hasMore && page.length ? makeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id) : null;

    return res.json({ items, nextCursor });
  } catch (e: any) {
    return res.status(500).json({ error: "LIST_UPLOADS_FAILED", message: e?.message ?? String(e) });
  }
});

// GET /admin/uploads/images/folders
r.get("/images/folders", async (_req, res) => {
  try {
    // Ensure any folders used by assets exist in the folder table
    type FolderCountRow = { folder: string | null; _count: { id: number } };
    const countsRows = (await prisma.mediaAsset.groupBy({
      by: ["folder"],
      where: { kind: "IMAGE" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    })) as unknown as FolderCountRow[];

    const names = countsRows
      .map((r) => r.folder)
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
    for (const n of names) {
      await ensureFolderExists(n);
    }

    const countMap = new Map<string, number>();
    for (const row of countsRows) {
      if (row.folder) countMap.set(row.folder, row._count.id);
    }

    const folderRows = await prisma.mediaFolder.findMany({ orderBy: { name: "asc" } });
    const folders = folderRows.map((f) => ({ id: f.id, name: f.name, folder: f.name, count: countMap.get(f.name) ?? 0 }));

    const unfiledCount = await prisma.mediaAsset.count({ where: { kind: "IMAGE", folder: null } });
    res.json({ folders, unfiledCount });
  } catch (e: any) {
    res.status(500).json({ error: "LIST_FOLDERS_FAILED", message: e?.message ?? String(e) });
  }
});

// POST /admin/uploads/images/folders  { name }
r.post("/images/folders", async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "INVALID_NAME" });
    const folder = await prisma.mediaFolder.create({ data: { name } });
    return res.status(201).json({ folder: { id: folder.id, name: folder.name } });
  } catch (e: any) {
    // unique constraint
    if (String(e?.code || "").includes("P2002")) {
      return res.status(409).json({ error: "FOLDER_EXISTS" });
    }
    return res.status(400).json({ error: "CREATE_FOLDER_FAILED", message: e?.message ?? String(e) });
  }
});

// PATCH /admin/uploads/images/folders/:id  { name }
r.patch("/images/folders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const name = String(req.body?.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "INVALID_NAME" });

    const current = await prisma.mediaFolder.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "NOT_FOUND" });

    const updated = await prisma.$transaction(async (tx) => {
      const f = await tx.mediaFolder.update({ where: { id }, data: { name } });
      await tx.mediaAsset.updateMany({ where: { kind: "IMAGE", folder: current.name }, data: { folder: name } });
      return f;
    });
    return res.json({ folder: { id: updated.id, name: updated.name } });
  } catch (e: any) {
    if (String(e?.code || "").includes("P2002")) {
      return res.status(409).json({ error: "FOLDER_EXISTS" });
    }
    return res.status(400).json({ error: "RENAME_FOLDER_FAILED", message: e?.message ?? String(e) });
  }
});

// DELETE /admin/uploads/images/folders/:id
r.delete("/images/folders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const folder = await prisma.mediaFolder.findUnique({ where: { id } });
    if (!folder) return res.status(404).json({ error: "NOT_FOUND" });
    const count = await prisma.mediaAsset.count({ where: { kind: "IMAGE", folder: folder.name } });
    if (count > 0) {
      return res.status(409).json({ error: "FOLDER_NOT_EMPTY", count });
    }
    await prisma.mediaFolder.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(400).json({ error: "DELETE_FOLDER_FAILED", message: e?.message ?? String(e) });
  }
});

// GET /admin/uploads/images/tags
r.get("/images/tags", async (_req, res) => {
  try {
    // PostgreSQL: unnest tags
    const rows: Array<{ tag: string; count: bigint }> = await prisma.$queryRaw`
      SELECT unnest("tags") AS tag, count(*) AS count
      FROM "MediaAsset"
      WHERE "kind" = 'IMAGE'
      GROUP BY tag
      ORDER BY count DESC;
    `;

    const tags = rows.map((r) => ({ tag: r.tag, count: Number(r.count) }));
    res.json({ tags });
  } catch (e: any) {
    res.status(500).json({ error: "LIST_TAGS_FAILED", message: e?.message ?? String(e) });
  }
});

// GET /admin/uploads/images/duplicates
// Query:
//  - mode: exact | near (default exact)
//  - limit: number of groups (default 30, max 200)
//  - perGroup: number of items per group (default 30, max 200)
//  - maxDistance: for near (default 6)
//  - scanLimit: for near, max items to scan (default 400, max 2000)
r.get("/images/duplicates", async (req, res) => {
  try {
    const mode = (req.query.mode?.toString() ?? "exact").toLowerCase() === "near" ? "near" : "exact";
    const limitRaw = Number(req.query.limit ?? 30);
    const perGroupRaw = Number(req.query.perGroup ?? 30);
    const maxDistanceRaw = Number(req.query.maxDistance ?? 6);
    const scanLimitRaw = Number(req.query.scanLimit ?? 400);

    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 30));
    const perGroup = Math.max(1, Math.min(200, Number.isFinite(perGroupRaw) ? perGroupRaw : 30));
    const maxDistance = Math.max(1, Math.min(20, Number.isFinite(maxDistanceRaw) ? maxDistanceRaw : 6));
    const scanLimit = Math.max(50, Math.min(2000, Number.isFinite(scanLimitRaw) ? scanLimitRaw : 400));

    if (mode === "exact") {
      const rows: Array<{ imageHash: string; count: bigint }> = await prisma.$queryRaw`
        SELECT "imageHash", COUNT(*) AS count
        FROM "MediaAsset"
        WHERE "kind" = 'IMAGE' AND "imageHash" IS NOT NULL
        GROUP BY "imageHash"
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT ${limit};
      `;

      const groups = [];
      for (const row of rows) {
        const assets = await prisma.mediaAsset.findMany({
          where: { kind: "IMAGE", imageHash: row.imageHash },
          orderBy: { createdAt: "desc" },
          take: perGroup,
        });
        groups.push({
          hash: row.imageHash,
          count: Number(row.count),
          items: assets.map((a) => mediaAssetToResponse(req, a)),
        });
      }

      return res.json({ mode, groups });
    }

    // near-duplicate scan (best-effort, limited)
    const candidates = await prisma.mediaAsset.findMany({
      where: { kind: "IMAGE", imageHash: { not: null } },
      orderBy: { createdAt: "desc" },
      take: scanLimit,
      select: {
        id: true,
        filename: true,
        url: true,
        provider: true,
        providerId: true,
        displayName: true,
        folder: true,
        tags: true,
        mime: true,
        size: true,
        width: true,
        height: true,
        blurDataUrl: true,
        imageHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const used = new Set<string>();
    const groups: any[] = [];

    function sizeClose(a: number | null, b: number | null) {
      if (!a || !b) return true;
      const tol = Math.max(64, Math.round(a * 0.12));
      return Math.abs(a - b) <= tol;
    }

    for (let i = 0; i < candidates.length; i++) {
      const base = candidates[i]!;
      if (!base.imageHash || used.has(base.id)) continue;

      const items: any[] = [
        { distance: 0, asset: base },
      ];

      for (let j = i + 1; j < candidates.length; j++) {
        const other = candidates[j]!;
        if (!other.imageHash || used.has(other.id)) continue;
        if (!sizeClose(base.width, other.width) || !sizeClose(base.height, other.height)) continue;

        const dist = hammingHex(base.imageHash, other.imageHash);
        if (dist <= maxDistance) {
          items.push({ distance: dist, asset: other });
          if (items.length >= perGroup) break;
        }
      }

      if (items.length > 1) {
        for (const it of items) used.add(it.asset.id);
        groups.push({
          baseId: base.id,
          baseHash: base.imageHash,
          items: items.map((it) => ({ distance: it.distance, item: mediaAssetToResponse(req, it.asset) })),
        });
        if (groups.length >= limit) break;
      }
    }

    return res.json({ mode, maxDistance, scanLimit, groups });
  } catch (e: any) {
    return res.status(500).json({ error: "LIST_DUPLICATES_FAILED", message: e?.message ?? String(e) });
  }
});

// PATCH /admin/uploads/images/:id
r.patch("/images/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const displayName = req.body?.displayName !== undefined ? String(req.body.displayName).trim() : undefined;
    const folder = req.body?.folder !== undefined ? String(req.body.folder).trim() || null : undefined;
    const tags = req.body?.tags !== undefined ? parseTags(req.body.tags) : undefined;

    if (folder !== undefined) {
      await ensureFolderExists(folder);
    }

    const data: any = {};
    if (displayName !== undefined) data.displayName = displayName || null;
    if (folder !== undefined) data.folder = folder;
    if (tags !== undefined) data.tags = tags;

    const updated = await prisma.mediaAsset.update({ where: { id }, data });

    const rel = `/uploads/images/${updated.filename}`;
    const url = updated.url ? updated.url : makePublicUrl(req, rel);
    res.json({
      id: updated.id,
      url,
      path: updated.url ? updated.url : rel,
      filename: updated.filename,
      displayName: updated.displayName,
      folder: updated.folder,
      tags: updated.tags,
      mimetype: updated.mime,
      size: updated.size,
      width: updated.width,
      height: updated.height,
      blurDataUrl: (updated as any).blurDataUrl ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      provider: updated.provider,
      providerId: updated.providerId,
    });
  } catch (e: any) {
    res.status(400).json({ error: "UPDATE_MEDIA_FAILED", message: e?.message ?? String(e) });
  }
});

// PATCH /admin/uploads/images/bulk
r.patch("/images/bulk", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => String(x)) : [];
    if (!ids.length) return res.status(400).json({ error: "NO_IDS" });

    const folder = req.body?.folder !== undefined ? String(req.body.folder).trim() || null : undefined;
    const setTags = req.body?.setTags !== undefined ? parseTags(req.body.setTags) : undefined;
    const addTags = req.body?.addTags !== undefined ? parseTags(req.body.addTags) : undefined;
    const removeTags = req.body?.removeTags !== undefined ? parseTags(req.body.removeTags) : undefined;

    if (folder !== undefined) {
      await ensureFolderExists(folder);
    }

    if (folder !== undefined || setTags !== undefined) {
      await prisma.mediaAsset.updateMany({
        where: { id: { in: ids }, kind: "IMAGE" },
        data: {
          ...(folder !== undefined ? { folder } : {}),
          ...(setTags !== undefined ? { tags: setTags } : {}),
        },
      });
    }

    if ((addTags && addTags.length) || (removeTags && removeTags.length)) {
      const rows = await prisma.mediaAsset.findMany({ where: { id: { in: ids }, kind: "IMAGE" }, select: { id: true, tags: true } });
      for (const row of rows) {
        const current = row.tags ?? [];
        const next = Array.from(
          new Set([
            ...current,
            ...(addTags ?? []),
          ])
        ).filter((t) => !(removeTags ?? []).includes(t));
        await prisma.mediaAsset.update({ where: { id: row.id }, data: { tags: next } });
      }
    }

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(400).json({ error: "BULK_UPDATE_FAILED", message: e?.message ?? String(e) });
  }
});

// DELETE /admin/uploads/images/bulk
r.delete("/images/bulk", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x: any) => String(x)) : [];
    if (!ids.length) return res.status(400).json({ error: "NO_IDS" });

    const rows = await prisma.mediaAsset.findMany({
      where: { id: { in: ids }, kind: "IMAGE" },
      select: { id: true, filename: true, provider: true, providerId: true },
    });
    const usageById: Record<string, MediaUsage[]> = {};

    for (const row of rows) {
      const u = await findUsageByFilename(row.filename);
      if (u.length) usageById[row.id] = u;
    }
    if (Object.keys(usageById).length) {
      return res.status(409).json({ error: "MEDIA_IN_USE", usageById });
    }

    // delete files best-effort
    for (const row of rows) {
      if (row.provider === "CLOUDINARY" && row.providerId) {
        await deleteFromCloudinary(row.providerId).catch(() => undefined);
        continue;
      }
      const fp = path.join(IMAGES_DIR, row.filename);
      await fs.unlink(fp).catch(() => undefined);
    }

    await prisma.mediaAsset.deleteMany({ where: { id: { in: ids } } });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(400).json({ error: "BULK_DELETE_FAILED", message: e?.message ?? String(e) });
  }
});

// GET /admin/uploads/images/:id/usage
r.get("/images/:id/usage", async (req, res) => {
  try {
    const id = req.params.id;
    const row = await prisma.mediaAsset.findUnique({ where: { id }, select: { filename: true } });
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });
    const usage = await findUsageByFilename(row.filename);
    return res.json({ filename: row.filename, usage });
  } catch (e: any) {
    return res.status(400).json({ error: "USAGE_FAILED", message: e?.message ?? String(e) });
  }
});

// DELETE /admin/uploads/images/:id
r.delete("/images/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const row = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });

    const usage = await findUsageByFilename(row.filename);
    if (usage.length) {
      return res.status(409).json({ error: "MEDIA_IN_USE", usage });
    }

    if (row.provider === "CLOUDINARY" && row.providerId) {
      await deleteFromCloudinary(row.providerId).catch(() => undefined);
    } else {
      const fp = path.join(IMAGES_DIR, row.filename);
      try {
        await fs.unlink(fp);
      } catch {
        // ignore
      }
    }

    await prisma.mediaAsset.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: "DELETE_MEDIA_FAILED", message: e?.message ?? String(e) });
  }
});

// POST /admin/uploads/images
// Supports BOTH:
//  - single file field name: `file`
//  - multiple files field name: `files`
// Optional multipart fields:
//  - folder: string
//  - tags: comma-separated string OR JSON array
// Returns: { files: UploadedFile[] }
const imagesUpload = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 20 },
]);

r.post("/images", (req, res) => {
  imagesUpload(req as any, res as any, async (err: any) => {
    if (err) {
      const code = err?.code;
      if (code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "FILE_TOO_LARGE", message: "Max file size is 10MB" });
      }
      if (code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ error: "UNEXPECTED_FIELD", message: "Expected field name: file or files" });
      }
      if (code === "INVALID_FILE_TYPE") {
        return res.status(415).json({ error: "INVALID_FILE_TYPE", message: "Only PNG, JPG, or WebP images are allowed" });
      }
      return res.status(400).json({ error: "UPLOAD_FAILED", message: err?.message ?? String(err) });
    }

    try {
      const files: any[] = [];
      const f: any = (req as any).files;
      if (f?.file?.[0]) files.push(f.file[0]);
      if (Array.isArray(f?.files)) files.push(...f.files);

      if (!files.length) {
        return res.status(400).json({ error: "NO_FILE" });
      }

      const folder = (req.body?.folder ? String(req.body.folder).trim() : "") || null;
      const tags = parseTags(req.body?.tags);

      await ensureFolderExists(folder);

      const out: any[] = [];

      const processed: Array<{
        file: any;
        opt: { ok: boolean; width: number | null; height: number | null; size: number };
        blurDataUrl: string | null;
        imageHash: string | null;
      }> = [];
      const tempFiles: string[] = [];
      for (const file of files) {
        const fullPath = path.join(IMAGES_DIR, file.filename);
        tempFiles.push(fullPath);

        const scan = await scanFile(fullPath);
        if (!scan.ok) {
          await Promise.all(tempFiles.map((p) => fs.unlink(p).catch(() => undefined)));
          const status = scan.code === "FILE_INFECTED" ? 422 : 503;
          return res.status(status).json({ error: scan.code, message: scan.message });
        }

        const opt = await optimizeImageInPlace(fullPath);
        if (!opt.ok) {
          await fs.unlink(fullPath).catch(() => undefined);
          continue;
        }
        const blurDataUrl = await createBlurDataUrlFromFile(fullPath);
        const imageHash = await computeDhashHex(fullPath);
        processed.push({ file, opt, blurDataUrl, imageHash });
      }

      if (!processed.length) {
        return res.status(415).json({ error: "INVALID_FILE_TYPE", message: "Only PNG, JPG, or WebP images are allowed" });
      }

      const dedupCache = new Map<string, any>();

      for (const { file, opt, blurDataUrl, imageHash } of processed) {
        const fullPath = path.join(IMAGES_DIR, file.filename);

        if (imageHash) {
          const cached = dedupCache.get(imageHash);
          if (cached) {
            await fs.unlink(fullPath).catch(() => undefined);
            out.push(cached);
            continue;
          }

          let duplicate = await findDuplicateMediaAsset({
            hash: imageHash,
            width: opt.width,
            height: opt.height,
            scope: "global",
          });

          if (duplicate) {
            const updates: any = {};
            if (!duplicate.displayName && (file.originalname || file.filename)) {
              updates.displayName = file.originalname || file.filename;
            }
            if (!duplicate.folder && folder) {
              updates.folder = folder;
            }
            if (tags.length) {
              const merged = mergeTags(duplicate.tags, tags);
              if (merged.length !== (duplicate.tags?.length ?? 0)) {
                updates.tags = merged;
              }
            }
            if (!duplicate.blurDataUrl && blurDataUrl) {
              updates.blurDataUrl = blurDataUrl;
            }
            if (Object.keys(updates).length) {
              duplicate = await prisma.mediaAsset.update({ where: { id: duplicate.id }, data: updates });
            }

            await fs.unlink(fullPath).catch(() => undefined);
            const response = mediaAssetToResponse(req, duplicate);
            out.push(response);
            dedupCache.set(imageHash, response);
            continue;
          }
        }

        if (isCloudinaryEnabled()) {
          const uploaded = await uploadImageToCloudinary({
            filePath: fullPath,
            folder,
            displayName: file.originalname || file.filename,
            tags,
          });

          // Remove temp local file after upload
          await fs.unlink(fullPath).catch(() => undefined);

          const created = await prisma.mediaAsset.create({
            data: {
              kind: "IMAGE",
              filename: uploaded.publicId,
              url: uploaded.url,
              provider: "CLOUDINARY",
              providerId: uploaded.publicId,
              displayName: file.originalname || uploaded.publicId,
              folder,
              tags,
              mime: file.mimetype || guessMimeFromExt(file.filename),
              size: uploaded.bytes || opt.size || file.size,
              width: uploaded.width ?? opt.width,
              height: uploaded.height ?? opt.height,
              blurDataUrl: blurDataUrl ?? null,
              imageHash: imageHash ?? null,
            },
          });

          const response = mediaAssetToResponse(req, created);
          out.push(response);
          if (imageHash) dedupCache.set(imageHash, response);
        } else {
          const created = await prisma.mediaAsset.create({
            data: {
              kind: "IMAGE",
              filename: file.filename,
              displayName: file.originalname || file.filename,
              folder,
              tags,
              mime: file.mimetype || guessMimeFromExt(file.filename),
              size: opt.size || file.size,
              width: opt.width,
              height: opt.height,
              blurDataUrl: blurDataUrl ?? null,
              imageHash: imageHash ?? null,
            },
          });

          const response = mediaAssetToResponse(req, created);
          out.push(response);
          if (imageHash) dedupCache.set(imageHash, response);
        }
      }

      return res.status(201).json({ files: out });
    } catch (e: any) {
      return res.status(500).json({ error: "UPLOAD_FAILED", message: e?.message ?? String(e) });
    }
  });
});

export default r;
