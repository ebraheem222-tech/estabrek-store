import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

import { extractDominantAndPaletteFromFile, autoGroupByColor, nameColor, rgbToHex } from "../../lib/colorAnalysis.js";
import { prisma } from "../../lib/prisma.js";
import { scanFile } from "../../lib/antivirus.js";
import { indexProductImageEmbedding } from "../../lib/productImageEmbeddings.js";
import { indexProductTextEmbedding } from "../../lib/productTextEmbeddings.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import {
  CreateCategoryBody, UpdateCategoryBody,
  CreateProductBody, UpdateProductBody,
  CreateItemBody, UpdateItemBody,
  CreateSizeBody, UpdateSizeBody,
  CreateVariantBody, UpdateVariantBody,
  AddImageBody, UpdateImageBody, ProductDeepUpdateBody, CommitImageGroupsBody,
  BulkProductsBody,
  ImportProductsBody,
} from "./catalog.schemas.js";
import { updateProductDeep, getProductDeep } from "./catalog.service.js";

function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeSkuBaseFromSlugOrTitle(slug: string, title: string) {
  const base = (slug || title || "PRODUCT")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "PRODUCT";
}

async function ensureDefaultSize(tx: any) {
  const existing = await tx.size.findFirst({ where: { active: true }, orderBy: [{ order: "asc" }, { name: "asc" }] });
  if (existing) return existing;

  // try reuse any size if exists
  const any = await tx.size.findFirst({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  if (any) return any;

  // create a sensible default
  return tx.size.create({ data: { name: "One Size", order: 0, active: true } });
}

const r = Router();

/* ========== Categories ========== */
r.get("/categories", asyncHandler(async (_req, res) => {
  const out = await prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { name: "asc" }] });
  res.json(out);
}));

r.post("/categories", validate({ body: CreateCategoryBody }), asyncHandler(async (req, res) => {
  const out = await prisma.category.create({ data: req.body });
  res.status(201).json(out);
}));

r.patch("/categories/:id", validate({ body: UpdateCategoryBody }), asyncHandler(async (req, res) => {
  const out = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
  res.json(out);
}));

r.delete("/categories/:id", asyncHandler(async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

/* ========== Products ========== */
r.get("/products", asyncHandler(async (req, res) => {
  // status = all | active | draft
  const status = String(req.query.status ?? "all");
  const where: any = {};
  if (status === "active") where.isActive = true;
  if (status === "draft") where.isActive = false;

  const out = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
  res.json(out);
}));

// Create product + auto default Item + default Variant
r.post("/products", validate({ body: CreateProductBody }), asyncHandler(async (req, res) => {
  const body = req.body as any;

  const created = await prisma.$transaction(async (tx) => {
    const title = body.title as string;
    const slug = body.slug ? String(body.slug) : slugify(title);

    const product = await tx.product.create({
      data: {
        title,
        slug,
        description: body.description ?? null,
        isActive: body.isActive ?? false, // default draft
        categoryId: body.categoryId,
      },
    });

    const size = await ensureDefaultSize(tx);

    const skuBase = makeSkuBaseFromSlugOrTitle(slug, title) + "-DEFAULT";
    const item = await tx.productItem.create({
      data: {
        productId: product.id,
        colorName: "Default",
        colorHex: null,
        skuBase,
        isActive: true,
      },
    });

    const sizeTag = (size.name || "SIZE").toUpperCase().replace(/\s+/g, "");
    const sku = `${skuBase}-${sizeTag}`;
    await tx.productVariant.create({
      data: {
        productItemId: item.id,
        sizeId: size.id,
        sku,
        price: 0,
        compareAt: null,
        stock: 0,
        weightGrams: null,
      },
    });

    return product;
  });

  void indexProductTextEmbedding(created.id).catch((err: any) => {
    console.warn("[product-embedding] failed", created.id, err?.message ?? err);
  });

  res.status(201).json(created);
}));

// Bulk actions
r.post("/products/bulk", validate({ body: BulkProductsBody }), asyncHandler(async (req, res) => {
  const { ids, action, isActive } = req.body as any;

  if (action === "delete") {
    const result = await prisma.product.deleteMany({ where: { id: { in: ids } } });
    return res.json({ ok: true, action, count: result.count });
  }

  // setActive
  const next = typeof isActive === "boolean" ? isActive : false;
  const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isActive: next } });
  return res.json({ ok: true, action, count: result.count, isActive: next });
}));

// CSV import (front parses CSV -> sends rows)
r.post("/products/import", validate({ body: ImportProductsBody }), asyncHandler(async (req, res) => {
  const { rows, mode, createMissingCategories, defaultCategoryId } = req.body as any;

  type RowResult = {
    index: number;
    slug?: string;
    title?: string;
    action: "created" | "updated" | "skipped" | "failed";
    productId?: string;
    itemId?: string;
    variantId?: string;
    message?: string;
  };

  const results: RowResult[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];

    try {
      const title = String(row.title ?? "").trim();
      const slug = (row.slug ? String(row.slug) : slugify(title)).trim();
      if (!title) throw new Error("title is required");
      if (!slug) throw new Error("slug is required (or cannot be generated from title)");

      // resolve category
      let categoryId: string | undefined = row.categoryId || undefined;
      if (!categoryId) {
        const catSlug = row.categorySlug ? String(row.categorySlug) : row.categoryName ? slugify(String(row.categoryName)) : undefined;
        if (catSlug) {
          const existing = await prisma.category.findFirst({ where: { slug: catSlug } });
          if (existing) categoryId = existing.id;
          else if (createMissingCategories) {
            const createdCat = await prisma.category.create({ data: { name: row.categoryName ? String(row.categoryName) : catSlug, slug: catSlug } });
            categoryId = createdCat.id;
          }
        }
      }
      if (!categoryId && defaultCategoryId) categoryId = defaultCategoryId;
      if (!categoryId) throw new Error("categoryId missing (and no defaultCategoryId)");

      const txResult = await prisma.$transaction(async (tx) => {
        const size = row.sizeName
          ? await tx.size.upsert({
              where: { name: String(row.sizeName) },
              create: { name: String(row.sizeName), order: 0, active: true },
              update: {},
            })
          : await ensureDefaultSize(tx);

        const colorName = (row.colorName ? String(row.colorName) : "Default").trim() || "Default";
        const colorHex = row.colorHex ? String(row.colorHex) : null;

        const skuBase = ((row.skuBase ? String(row.skuBase) : makeSkuBaseFromSlugOrTitle(slug, title)) + "-DEFAULT")
          .toUpperCase()
          .replace(/[^A-Z0-9\-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

        const existing = await tx.product.findUnique({ where: { slug } });

        // Safer behavior for real-world:
        // - Always UPSERT by slug unless explicitly mode=create
        // - On update: only update fields that are present in the row (do not force draft/active by default)
        const createData: any = {
          title,
          slug,
          description: row.description ?? null,
          isActive: typeof row.isActive === "boolean" ? row.isActive : false, // default draft on create
          categoryId,
        };

        const updateData: any = {
          title: title || undefined,
          description: row.description !== undefined ? (row.description ?? null) : undefined,
          categoryId: categoryId || undefined,
          isActive: typeof row.isActive === "boolean" ? row.isActive : undefined,
        };

        const product =
          mode === "create"
            ? await tx.product.create({ data: createData })
            : await tx.product.upsert({ where: { slug }, create: createData, update: updateData });

        const action: "created" | "updated" = existing ? "updated" : "created";

        // Ensure default Item always exists (upsert by (productId,colorName))
        const item = await tx.productItem.upsert({
          where: { productId_colorName: { productId: product.id, colorName } },
          create: {
            productId: product.id,
            colorName,
            colorHex,
            skuBase,
            isActive: true,
          },
          update: {
            colorHex: row.colorHex !== undefined ? colorHex : undefined,
            skuBase: row.skuBase ? skuBase : undefined,
            isActive: true,
          },
        });

        // Ensure default Variant always exists (upsert by (itemId,sizeId))
        const sizeTag = (size.name || "SIZE").toUpperCase().replace(/\s+/g, "");
        const sku = row.sku ? String(row.sku) : `${skuBase}-${sizeTag}`;

        const price = typeof row.price === "number" ? row.price : undefined;
        const stock = typeof row.stock === "number" ? row.stock : undefined;

        const variant = await tx.productVariant.upsert({
          where: { productItemId_sizeId: { productItemId: item.id, sizeId: size.id } },
          create: {
            productItemId: item.id,
            sizeId: size.id,
            sku,
            price: typeof row.price === "number" ? row.price : 0,
            compareAt: null,
            stock: typeof row.stock === "number" ? row.stock : 0,
            weightGrams: null,
          },
          update: {
            sku: row.sku ? sku : undefined,
            price: price ?? undefined,
            stock: stock ?? undefined,
          },
        });

        // Images (safe add-only)
        let images: string[] = [];
        if (Array.isArray(row.images)) images = row.images;
        else if (typeof row.images === "string") {
          images = String(row.images)
            .split(/\s*[|,]\s*/g)
            .map((s) => s.trim())
            .filter(Boolean);
        }

        if (images.length) {
          // keep only http(s)
          images = images.filter((u) => /^https?:\/\//i.test(u));

          const existingImgs = await tx.productItemImage.findMany({
            where: { productItemId: item.id },
            orderBy: { position: "asc" },
            select: { id: true, url: true, position: true, isPrimary: true },
          });
          const existingUrls = new Set(existingImgs.map((x) => x.url));

          const toInsert = images.filter((u) => !existingUrls.has(u));
          if (toInsert.length) {
            const maxPos = existingImgs.length ? Math.max(...existingImgs.map((x) => x.position ?? 0)) : -1;
            await tx.productItemImage.createMany({
              data: toInsert.map((url, i) => ({
                productItemId: item.id,
                url,
                alt: null,
                position: maxPos + 1 + i,
                isPrimary: false,
              })),
            });
          }

          // if no primary image yet, set first image (either existing or newly inserted) as primary
          const hasPrimary = existingImgs.some((x) => x.isPrimary);
          if (!hasPrimary) {
            const firstUrl = images[0];
            const first = await tx.productItemImage.findFirst({ where: { productItemId: item.id, url: firstUrl } });
            if (first) {
              await tx.productItemImage.update({ where: { id: first.id }, data: { isPrimary: true } });
            }
          }
        }

        return { action, productId: product.id, itemId: item.id, variantId: variant.id };
      });

      if (txResult.action === "created") createdCount++;
      else updatedCount++;

      results.push({
        index: idx,
        slug,
        title: String(row.title),
        action: txResult.action,
        productId: txResult.productId,
        itemId: txResult.itemId,
        variantId: txResult.variantId,
      });
    } catch (e: any) {
      failedCount++;
      results.push({
        index: idx,
        slug: row?.slug,
        title: row?.title,
        action: "failed",
        message: e?.message ?? String(e),
      });
    }
  }

  const ok = failedCount === 0;
  return res.json({
    ok,
    summary: {
      total: rows.length,
      created: createdCount,
      updated: updatedCount,
      failed: failedCount,
      mode: mode ?? "upsertBySlug",
    },
    results,
  });
}));

r.get("/products/:id", asyncHandler(async (req, res) => {
  const out = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      items: { include: { images: true, variants: { include: { size: true } } } },
      reviews: true,
      comments: true,
    },
  });
  res.json(out);
}));

r.patch("/products/:id", validate({ body: UpdateProductBody }), asyncHandler(async (req, res) => {
  const out = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
  const shouldIndex = ["title", "description", "categoryId", "slug"].some((key) => key in (req.body ?? {}));
  if (shouldIndex) {
    void indexProductTextEmbedding(out.id).catch((err: any) => {
      console.warn("[product-embedding] failed", out.id, err?.message ?? err);
    });
  }
  res.json(out);
}));

r.delete("/products/:id", asyncHandler(async (req, res) => {
  const id = req.params.id;

  // If a product has been used in orders (order requests), variants are RESTRICT,
  // so hard delete would fail with FK constraints. In that case, return a clear 409.
  const inUse = await prisma.productVariant.findFirst({
    where: {
      item: { productId: id },
      OR: [{ orderRequests: { some: {} } }, { orderRequestItems: { some: {} } }],
    },
    select: { id: true },
  });

  if (inUse) {
    return res.status(409).json({
      ok: false,
      code: "PRODUCT_IN_USE",
      message: "Product has orders and cannot be deleted. Archive it instead.",
    });
  }

  await prisma.product.delete({ where: { id } });
  res.json({ ok: true });
}));

// Archive product (soft-delete) - keeps history intact
r.post("/products/:id/archive", asyncHandler(async (req, res) => {
  const id = req.params.id;
  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { isActive: false } });
    await tx.productItem.updateMany({ where: { productId: id }, data: { isActive: false } });
  });
  res.json({ ok: true, archived: true });
}));

/* ========== Product Items (colors) ========== */
r.post("/items", validate({ body: CreateItemBody }), asyncHandler(async (req, res) => {
  const out = await prisma.productItem.create({ data: req.body });
  res.status(201).json(out);
}));

r.patch("/items/:id", validate({ body: UpdateItemBody }), asyncHandler(async (req, res) => {
  const out = await prisma.productItem.update({ where: { id: req.params.id }, data: req.body });
  res.json(out);
}));

r.delete("/items/:id", asyncHandler(async (req, res) => {
  await prisma.productItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

/* ========== Sizes ========== */
r.get("/sizes", asyncHandler(async (_req, res) => {
  const out = await prisma.size.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  res.json(out);
}));

r.post("/sizes", validate({ body: CreateSizeBody }), asyncHandler(async (req, res) => {
  const out = await prisma.size.create({ data: req.body });
  res.status(201).json(out);
}));

r.patch("/sizes/:id", validate({ body: UpdateSizeBody }), asyncHandler(async (req, res) => {
  const out = await prisma.size.update({ where: { id: req.params.id }, data: req.body });
  res.json(out);
}));

r.delete("/sizes/:id", asyncHandler(async (req, res) => {
  await prisma.size.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

/* ========== Variants (size+color) ========== */
r.post("/variants", validate({ body: CreateVariantBody }), asyncHandler(async (req, res) => {
  const out = await prisma.productVariant.create({ data: req.body });
  res.status(201).json(out);
}));

r.patch("/variants/:id", validate({ body: UpdateVariantBody }), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const body: any = req.body;

  const { reason, ...data } = body;

  // If stock is changing, create an InventoryAdjustment entry
  const out = await prisma.$transaction(async (tx) => {
    const before = await tx.productVariant.findUnique({ where: { id }, select: { stock: true } });
    const updated = await tx.productVariant.update({ where: { id }, data });

    if (typeof data.stock === "number" && before && before.stock !== updated.stock) {
      // resolve adminUserId safely (avoid FK errors in bypass auth)
      let adminUserId: string | null = null;
      const sub = req.user?.sub ?? null;
      if (sub) {
        const u = await tx.adminUser.findUnique({ where: { id: sub }, select: { id: true } });
        adminUserId = u?.id ?? null;
      }

      await tx.inventoryAdjustment.create({
        data: {
          variantId: id,
          delta: updated.stock - before.stock,
          beforeStock: before.stock,
          afterStock: updated.stock,
          reason: reason ? String(reason) : "Variant update",
          adminUserId,
        },
      });
    }

    return updated;
  });

  res.json(out);
}));

r.delete("/variants/:id", asyncHandler(async (req, res) => {
  await prisma.productVariant.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

/* ========== Images ========== */
r.post("/images", validate({ body: AddImageBody }), asyncHandler(async (req, res) => {
  const out = await prisma.productItemImage.create({ data: req.body });
  void indexProductImageEmbedding(out.id).catch((err: any) => {
    console.warn("[image-embedding] failed", out.id, err?.message ?? err);
  });
  res.status(201).json(out);
}));
r.patch("/images/:id", validate({ body: UpdateImageBody }), asyncHandler(async (req, res) => {
  const out = await prisma.productItemImage.update({ where: { id: req.params.id }, data: req.body });
  res.json(out);
}));
r.delete("/images/:id", asyncHandler(async (req, res) => {
  await prisma.productItemImage.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));


/* ========== Product Images Wizard (Batch Upload + Auto Group) ========== */

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const IMAGES_DIR = path.join(UPLOAD_ROOT, "images");

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function isAllowedImage(file: { originalname?: string; mimetype?: string }) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  return ALLOWED_IMAGE_EXT.has(ext) && ALLOWED_IMAGE_MIME.has(mime);
}

const imagesStorage = multer.diskStorage({
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

const imagesUpload = multer({
  storage: imagesStorage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB
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

async function optimizeImageInPlace(filePath: string) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let img = sharp(filePath, { failOnError: false }).rotate();
    const meta = await img.metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
      return { ok: false, width: null, height: null, size: 0 };
    }

    const maxW = 2000;
    const maxH = 2000;
    if (meta.width && meta.height && (meta.width > maxW || meta.height > maxH)) {
      img = img.resize({ width: maxW, height: maxH, fit: "inside", withoutEnlargement: true });
    }

    if (ext === ".png") img = img.png({ compressionLevel: 9, palette: true });
    else if (ext === ".webp") img = img.webp({ quality: 82 });
    else img = img.jpeg({ quality: 82, mozjpeg: true });

    const tmp = `${filePath}.tmp`;
    await img.toFile(tmp);
    await fs.rename(tmp, filePath);

    const outMeta = await sharp(filePath, { failOnError: false }).metadata();
    const st = await fs.stat(filePath);
    return { ok: true, width: outMeta.width ?? null, height: outMeta.height ?? null, size: st.size };
  } catch {
    // best effort
    try {
      const st = await fs.stat(filePath);
      return { ok: false, width: null, height: null, size: st.size };
    } catch {
      return { ok: false, width: null, height: null, size: 0 };
    }
  }
}

r.post("/products/:id/images/batch", (req, res) => {
  const handler = imagesUpload.array("files", 60);
  handler(req as any, res as any, async (err: any) => {
    if (err) {
      const code = err?.code;
      if (code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "FILE_TOO_LARGE", message: "Max file size is 12MB" });
      }
      if (code === "INVALID_FILE_TYPE") {
        return res.status(415).json({ error: "INVALID_FILE_TYPE", message: "Only PNG, JPG, or WebP images are allowed" });
      }
      return res.status(400).json({ error: "UPLOAD_FAILED", message: err?.message ?? String(err) });
    }

    try {
      const productId = req.params.id;
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, slug: true } });
      if (!product) return res.status(404).json({ error: "NOT_FOUND" });

      const files: any[] = Array.isArray((req as any).files) ? (req as any).files : [];
      if (!files.length) return res.status(400).json({ error: "NO_FILES" });

      const folder = `product/${productId}/pending`;
      const tagProduct = `product:${productId}`;
      const out: any[] = [];

      const processed: Array<{
        file: any;
        opt: { ok: boolean; width: number | null; height: number | null; size: number };
        colors: { dominantColorHex: string | null; palette: string[] };
      }> = [];
      const tempFiles: string[] = [];

      for (const f of files) {
        const fullPath = path.join(IMAGES_DIR, f.filename);
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
        const colors = await extractDominantAndPaletteFromFile(fullPath, 6);
        processed.push({ file: f, opt, colors });
      }

      if (!processed.length) {
        return res.status(415).json({ error: "INVALID_FILE_TYPE", message: "Only PNG, JPG, or WebP images are allowed" });
      }

      for (const { file: f, opt, colors } of processed) {
        const created = await prisma.mediaAsset.create({
          data: {
            kind: "IMAGE",
            filename: f.filename,
            displayName: f.originalname || f.filename,
            folder,
            tags: [tagProduct, "pending"],
            mime: f.mimetype || "image/*",
            size: opt.size || f.size,
            width: opt.width,
            height: opt.height,
            dominantColorHex: colors.dominantColorHex,
            palette: colors.palette as any,
          },
        });

        const rel = `/uploads/images/${created.filename}`;
        out.push({
          id: created.id,
          filename: created.filename,
          displayName: created.displayName,
          folder: created.folder,
          tags: created.tags,
          mimetype: created.mime,
          size: created.size,
          width: created.width,
          height: created.height,
          path: rel,
          url: makePublicUrl(req, rel),
          dominantColorHex: created.dominantColorHex,
          palette: created.palette,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        });
      }

      return res.status(201).json({ files: out });
    } catch (e: any) {
      return res.status(500).json({ error: "UPLOAD_FAILED", message: e?.message ?? String(e) });
    }
  });
});

r.get("/products/:id/images/pending", asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const folder = `product/${productId}/pending`;
  const assets = await prisma.mediaAsset.findMany({
    where: { folder },
    orderBy: { createdAt: "desc" },
  });

  const out = assets.map((a) => {
    const rel = `/uploads/images/${a.filename}`;
    return {
      id: a.id,
      filename: a.filename,
      displayName: a.displayName,
      folder: a.folder,
      tags: a.tags,
      mimetype: a.mime,
      size: a.size,
      width: a.width,
      height: a.height,
      path: rel,
      url: makePublicUrl(req, rel),
      dominantColorHex: (a as any).dominantColorHex ?? null,
      palette: (a as any).palette ?? null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  });

  res.json({ items: out });
}));

r.post("/products/:id/images/auto-group", asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const folder = `product/${productId}/pending`;
  const assetIds: string[] | null = Array.isArray(req.body?.assetIds) ? req.body.assetIds : null;
  const threshold = typeof req.body?.threshold === "number" ? req.body.threshold : 42;

  const assets = await prisma.mediaAsset.findMany({
    where: assetIds?.length ? { id: { in: assetIds } } : { folder },
    orderBy: { createdAt: "desc" },
  });

  const enriched = assets.map((a) => ({
    ...a,
    url: makePublicUrl(req, `/uploads/images/${a.filename}`),
    dominantColorHex: (a as any).dominantColorHex ?? null,
    palette: (a as any).palette ?? null,
  }));

  const grouped = autoGroupByColor(enriched as any, { threshold });

  const groups = grouped.map((g, idx) => {
    const colorName = g.colorName || nameColor(g.colorHex);
    return {
      groupId: `g${idx + 1}`,
      colorHex: g.colorHex,
      colorName,
      assets: g.items.map((a: any) => ({
        id: a.id,
        filename: a.filename,
        displayName: a.displayName,
        folder: a.folder,
        tags: a.tags,
        mimetype: a.mime,
        size: a.size,
        width: a.width,
        height: a.height,
        path: `/uploads/images/${a.filename}`,
        url: a.url,
        dominantColorHex: a.dominantColorHex ?? null,
        palette: a.palette ?? null,
      })),
    };
  });

  res.json({ groups });
}));

function slugifySkuPart(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

r.post(
  "/products/:id/images/commit-groups",
  validate({ body: CommitImageGroupsBody }),
  asyncHandler(async (req, res) => {
    const productId = req.params.id;
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, slug: true } });
    if (!product) return res.status(404).json({ error: "NOT_FOUND" });

    const groups = req.body.groups as Array<{
      colorName: string;
      colorHex?: string | null;
      assets: Array<{ assetId: string; view?: string | null; alt?: string | null }>;
      variants?:
        | {
            sizeIds: string[];
            price: number;
            compareAt?: number | null;
            stock?: number;
            stockBySize?: Record<string, number>;
            lowStockThreshold?: number;
            weightGrams?: number | null;
          }
        | null;
    }>;

    const createdImageIds: string[] = [];
    const result = await prisma.$transaction(async (tx) => {
      const createdItems: any[] = [];

      for (const g of groups) {
        const colorName = g.colorName.trim();
        if (!colorName) continue;

        const skuBase = `${product.slug}-${slugifySkuPart(colorName)}`.slice(0, 60);

        const item = await tx.productItem.upsert({
          where: { productId_colorName: { productId, colorName } },
          create: {
            productId,
            colorName,
            colorHex: g.colorHex ?? null,
            skuBase,
          },
          update: {
            colorHex: g.colorHex ?? null,
          },
        });

        // load assets for this group
        const assets = await tx.mediaAsset.findMany({ where: { id: { in: g.assets.map((x) => x.assetId) } } });
        const assetById = new Map(assets.map((a) => [a.id, a]));

        let pos = 0;
        for (const aIn of g.assets) {
          const a = assetById.get(aIn.assetId);
          if (!a) continue;
          const rel = `/uploads/images/${a.filename}`;
          const url = makePublicUrl(req, rel);

          const createdImg = await tx.productItemImage.create({
            data: {
              productItemId: item.id,
              url,
              alt: aIn.alt ?? null,
              position: pos,
              isPrimary: pos === 0,
              view: aIn.view ?? null,
              dominantColorHex: (a as any).dominantColorHex ?? null,
              palette: (a as any).palette ?? null,
            },
          });
          createdImageIds.push(createdImg.id);

          // move media asset out of pending folder
          const nextTags = (a.tags || []).filter((t) => t !== "pending");
          if (!nextTags.includes(`product:${productId}`)) nextTags.push(`product:${productId}`);
          await tx.mediaAsset.update({
            where: { id: a.id },
            data: {
              folder: `product/${productId}`,
              tags: nextTags,
            },
          });

          pos++;
        }

        createdItems.push(item);

        // ===== Variants (create/update per selected size) =====
        if (g.variants?.sizeIds?.length) {
          const sizeIds = g.variants.sizeIds;
          const sizes = await tx.size.findMany({ where: { id: { in: sizeIds } }, select: { id: true, name: true } });
          const sizeById = new Map(sizes.map((s) => [s.id, s]));

          const stockBySize = g.variants.stockBySize || {};
          const bulkStock = Number.isFinite(g.variants.stock as any) ? Number(g.variants.stock) : 0;
          const lowStockThreshold = Number.isFinite(g.variants.lowStockThreshold as any) ? Number(g.variants.lowStockThreshold) : 0;
          const weightGrams = g.variants.weightGrams == null ? null : Number(g.variants.weightGrams);
          const price = Number(g.variants.price);
          const compareAt = g.variants.compareAt == null ? null : Number(g.variants.compareAt);

          for (const sizeId of sizeIds) {
            const size = sizeById.get(sizeId);
            if (!size) continue;

            const sizeTag = (size.name || "SIZE").toUpperCase().replace(/\s+/g, "");
            const sku = `${skuBase}-${sizeTag}`;
            const stock = Number.isFinite(stockBySize[sizeId] as any) ? Number(stockBySize[sizeId]) : bulkStock;

            await tx.productVariant.upsert({
              where: { productItemId_sizeId: { productItemId: item.id, sizeId } },
              create: {
                productItemId: item.id,
                sizeId,
                sku,
                price,
                compareAt,
                stock,
                lowStockThreshold,
                weightGrams,
              },
              update: {
                sku,
                price,
                compareAt,
                stock,
                lowStockThreshold,
                weightGrams,
              },
            });
          }
        }
      }

      return { createdItems };
    });

    for (const id of createdImageIds) {
      void indexProductImageEmbedding(id).catch((err: any) => {
        console.warn("[image-embedding] failed", id, err?.message ?? err);
      });
    }

    res.json({ ok: true, ...result });
  })
);

/* ========== End Product Images Wizard ========== */


r.get("/products/:id/full", asyncHandler(async (req, res) => {
  const out = await getProductDeep(req.params.id);
  res.json(out);
}));

// FULL graph update
r.put(
  "/products/:id/full",
  validate({ body: ProductDeepUpdateBody }),
  asyncHandler(async (req, res) => {
    const out = await updateProductDeep(req.params.id, req.body, { adminUserId: req.user?.sub ?? null, reason: "Product full edit" });
    void indexProductTextEmbedding(req.params.id).catch((err: any) => {
      console.warn("[product-embedding] failed", req.params.id, err?.message ?? err);
    });
    res.json(out);
  })
);
export default r;
