import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import {
  LowStockQuery,
  AdjustParams,
  AdjustBody,
  AdjustmentsQuery,
  ThresholdBody,
  VariantsQuery,
  BulkStockBody,
} from "./inventory.schemas.js";

const r = Router();

/**
 * GET /v1/admin/inventory/low-stock
 * - lists variants that have lowStockThreshold > 0
 * - supports:
 *    - q (sku/product title/color)
 *    - onlyBelow=1 (return only variants with stock <= threshold)
 */
r.get(
  "/low-stock",
  validate({ query: LowStockQuery }),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const onlyBelowRaw = String(req.query.onlyBelow ?? "");
    const onlyBelow = onlyBelowRaw === "1" || onlyBelowRaw === "true";

    const take = Number(req.query.take ?? 50);
    const skip = Number(req.query.skip ?? 0);

    const variants = await prisma.productVariant.findMany({
      where: {
        lowStockThreshold: { gt: 0 },
        ...(q
          ? {
              OR: [
                { sku: { contains: q, mode: "insensitive" } },
                { item: { colorName: { contains: q, mode: "insensitive" } } },
                { item: { product: { title: { contains: q, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        size: true,
        item: { include: { product: { include: { category: true } } } },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    let rows = variants.map((v) => {
      const threshold = v.lowStockThreshold ?? 0;
      return {
        variantId: v.id,
        sku: v.sku,
        stock: v.stock,
        lowStockThreshold: threshold,
        shortage: v.stock - threshold, // negative means below
        size: v.size?.name ?? null,
        itemId: v.item?.id ?? null,
        colorName: v.item?.colorName ?? null,
        colorHex: v.item?.colorHex ?? null,
        productId: v.item?.product?.id ?? null,
        productTitle: v.item?.product?.title ?? null,
        productSlug: v.item?.product?.slug ?? null,
        categoryId: v.item?.product?.category?.id ?? null,
        categoryName: v.item?.product?.category?.name ?? null,
        updatedAt: v.updatedAt,
        createdAt: v.createdAt,
      };
    });

    if (onlyBelow) rows = rows.filter((r) => r.stock <= r.lowStockThreshold);

    // sort: most urgent first (most below threshold)
    rows.sort((a, b) => (a.shortage - b.shortage) || (a.stock - b.stock));

    const total = rows.length;
    const paged = rows.slice(skip, skip + take);

    res.json({ total, rows: paged, take, skip });
  })
);

const variantInclude = {
  size: true,
  item: {
    select: {
      id: true,
      colorName: true,
      colorHex: true,
      isActive: true,
      images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }], take: 1, select: { url: true } },
      product: { select: { id: true, title: true, slug: true, isActive: true, createdAt: true, category: { select: { id: true, name: true } } } },
    },
  },
};

function variantRow(v: any) {
  return {
    variantId: v.id,
    sku: v.sku,
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold ?? 0,
    price: Number(v.salePrice ?? v.price),
    sizeId: v.sizeId,
    size: v.size?.name ?? null,
    sizeOrder: v.size?.order ?? 0,
    itemId: v.item?.id ?? null,
    colorName: v.item?.colorName ?? null,
    colorHex: v.item?.colorHex ?? null,
    itemActive: v.item?.isActive ?? true,
    imageUrl: v.item?.images?.[0]?.url ?? null,
    productId: v.item?.product?.id ?? null,
    productTitle: v.item?.product?.title ?? null,
    productSlug: v.item?.product?.slug ?? null,
    productActive: v.item?.product?.isActive ?? false,
    categoryId: v.item?.product?.category?.id ?? null,
    categoryName: v.item?.product?.category?.name ?? null,
    updatedAt: v.updatedAt,
  };
}

/**
 * GET /v1/admin/inventory/variants
 * Every size (SKU) with its product, colour and stock. `sku=` finds one exact code (a scan).
 */
r.get(
  "/variants",
  validate({ query: VariantsQuery }),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const sku = String(req.query.sku ?? "").trim();
    const stock = String(req.query.stock ?? "all");
    const take = Number(req.query.take ?? 2000);
    const skip = Number(req.query.skip ?? 0);

    const where: any = {};
    if (sku) where.sku = { equals: sku, mode: "insensitive" };
    if (req.query.productId) where.item = { productId: String(req.query.productId) };
    if (req.query.categoryId) where.item = { ...(where.item ?? {}), product: { categoryId: String(req.query.categoryId) } };
    if (q) {
      where.OR = [
        { sku: { contains: q, mode: "insensitive" } },
        { item: { colorName: { contains: q, mode: "insensitive" } } },
        { item: { product: { title: { contains: q, mode: "insensitive" } } } },
      ];
    }
    if (stock === "out") where.stock = { lte: 0 };
    if (stock === "ok") where.stock = { gt: 0 };

    const variants = await prisma.productVariant.findMany({ where, include: variantInclude });
    let rows = variants.map(variantRow);
    if (stock === "low") rows = rows.filter((r) => r.stock > 0 && r.lowStockThreshold > 0 && r.stock <= r.lowStockThreshold);
    // Newest products first, then colours and sizes in their own order.
    const created = new Map(variants.map((v: any) => [v.id, new Date(v.item?.product?.createdAt ?? 0).getTime()]));
    rows.sort(
      (a, b) =>
        (created.get(b.variantId)! - created.get(a.variantId)!) ||
        String(a.productId).localeCompare(String(b.productId)) ||
        String(a.colorName).localeCompare(String(b.colorName)) ||
        (a.sizeOrder - b.sizeOrder) ||
        a.sku.localeCompare(b.sku),
    );
    if (sku && !rows.length) return res.status(404).json({ error: "NOT_FOUND", message: "No size with this SKU" });
    const totals = {
      skus: rows.length,
      units: rows.reduce((s, r) => s + Math.max(0, r.stock), 0),
      out: rows.filter((r) => r.stock <= 0).length,
      low: rows.filter((r) => r.stock > 0 && r.lowStockThreshold > 0 && r.stock <= r.lowStockThreshold).length,
    };
    res.json({ total: rows.length, take, skip, totals, rows: rows.slice(skip, skip + take) });
  })
);

/**
 * POST /v1/admin/inventory/bulk
 * Many stock changes in one go, each written to the history. Rows are found by
 * variantId or SKU; a row that can't be applied is reported, the others are saved.
 */
r.post(
  "/bulk",
  validate({ body: BulkStockBody }),
  asyncHandler(async (req, res) => {
    const { rows, reason } = req.body as { rows: any[]; reason?: string | null };
    const userSub = req.user?.sub ?? null;

    const results = await prisma.$transaction(
      async (tx) => {
        let adminUserId: string | null = null;
        if (userSub) {
          const u = await tx.adminUser.findUnique({ where: { id: userSub }, select: { id: true } });
          adminUserId = u?.id ?? null;
        }
        const ids = rows.filter((r) => r.variantId).map((r) => String(r.variantId));
        const skus = rows.filter((r) => !r.variantId && r.sku).map((r) => String(r.sku).trim());
        const found = await tx.productVariant.findMany({
          where: { OR: [{ id: { in: ids } }, ...skus.map((s) => ({ sku: { equals: s, mode: "insensitive" as const } }))] },
          select: { id: true, sku: true, stock: true, lowStockThreshold: true },
        });
        const byId = new Map(found.map((v) => [v.id, v]));
        const bySku = new Map(found.map((v) => [v.sku.toUpperCase(), v]));
        const out: Array<{ key: string; variantId?: string; sku?: string; ok: boolean; before?: number; after?: number; error?: string }> = [];
        for (const row of rows) {
          const key = row.variantId ? String(row.variantId) : String(row.sku).trim();
          const v = row.variantId ? byId.get(String(row.variantId)) : bySku.get(String(row.sku).trim().toUpperCase());
          if (!v) { out.push({ key, ok: false, error: "NOT_FOUND" }); continue; }
          const before = v.stock;
          const after = row.value === undefined ? before : row.mode === "delta" ? before + row.value : row.value;
          if (after < 0) { out.push({ key, variantId: v.id, sku: v.sku, ok: false, before, error: "NEGATIVE_STOCK" }); continue; }
          const data: any = {};
          if (after !== before) data.stock = after;
          if (row.lowStockThreshold !== undefined && row.lowStockThreshold !== v.lowStockThreshold) data.lowStockThreshold = row.lowStockThreshold;
          if (Object.keys(data).length) await tx.productVariant.update({ where: { id: v.id }, data });
          if (after !== before) {
            await tx.inventoryAdjustment.create({
              data: { variantId: v.id, delta: after - before, beforeStock: before, afterStock: after, reason: reason ? String(reason) : "Bulk stock update", adminUserId },
            });
          }
          // A later row for the same size starts from this result.
          v.stock = after;
          if (data.lowStockThreshold !== undefined) v.lowStockThreshold = data.lowStockThreshold;
          out.push({ key, variantId: v.id, sku: v.sku, ok: true, before, after });
        }
        return out;
      },
      { timeout: 30_000, maxWait: 5_000 },
    );
    res.json({ updated: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
  })
);

/**
 * GET /v1/admin/inventory/adjustments
 * - list inventory adjustments (who/when/how much/why)
 */
r.get(
  "/adjustments",
  validate({ query: AdjustmentsQuery }),
  asyncHandler(async (req, res) => {
    const take = Number(req.query.take ?? 50);
    const skip = Number(req.query.skip ?? 0);

    const variantId = req.query.variantId ? String(req.query.variantId) : undefined;
    const adminUserId = req.query.adminUserId ? String(req.query.adminUserId) : undefined;

    const where: any = {};
    if (variantId) where.variantId = variantId;
    if (adminUserId) where.adminUserId = adminUserId;
    if (req.query.productId) where.variant = { item: { productId: String(req.query.productId) } };
    const q = String(req.query.q ?? "").trim();
    if (q) {
      where.OR = [
        { variant: { sku: { contains: q, mode: "insensitive" } } },
        { variant: { item: { product: { title: { contains: q, mode: "insensitive" } } } } },
        { reason: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.inventoryAdjustment.count({ where }),
      prisma.inventoryAdjustment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          adminUser: { select: { id: true, email: true, name: true } },
          variant: {
            include: {
              size: true,
              item: { include: { product: true } },
            },
          },
        },
      }),
    ]);

    res.json({
      total,
      take,
      skip,
      rows: rows.map((a) => ({
        id: a.id,
        variantId: a.variantId,
        sku: a.variant?.sku ?? null,
        productTitle: a.variant?.item?.product?.title ?? null,
        productId: a.variant?.item?.product?.id ?? null,
        colorName: a.variant?.item?.colorName ?? null,
        size: a.variant?.size?.name ?? null,
        delta: a.delta,
        beforeStock: a.beforeStock,
        afterStock: a.afterStock,
        reason: a.reason,
        adminUser: a.adminUser,
        createdAt: a.createdAt,
      })),
    });
  })
);

/**
 * POST /v1/admin/inventory/variants/:variantId/adjust
 * Quick adjust stock (delta or set exact)
 */
r.post(
  "/variants/:variantId/adjust",
  validate({ params: AdjustParams, body: AdjustBody }),
  asyncHandler(async (req, res) => {
    const { variantId } = req.params as any;
    const { mode, value, reason } = req.body as any;

    const userSub = req.user?.sub ?? null;

    const out = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { size: true, item: { include: { product: true } } },
      });
      if (!variant) {
        return { error: "NOT_FOUND" as const };
      }

      const beforeStock = variant.stock;
      let afterStock = beforeStock;

      if (mode === "delta") afterStock = beforeStock + Number(value);
      else afterStock = Number(value);

      if (!Number.isFinite(afterStock) || afterStock < 0) {
        return { error: "NEGATIVE_STOCK" as const };
      }

      // resolve adminUserId safely (avoid FK errors in bypass auth)
      let adminUserId: string | null = null;
      if (userSub) {
        const u = await tx.adminUser.findUnique({ where: { id: userSub }, select: { id: true } });
        adminUserId = u?.id ?? null;
      }

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: afterStock },
        include: { size: true, item: { include: { product: true } } },
      });

      const delta = afterStock - beforeStock;

      const adj = await tx.inventoryAdjustment.create({
        data: {
          variantId,
          delta,
          beforeStock,
          afterStock,
          reason: reason ? String(reason) : null,
          adminUserId,
        },
      });

      return { updated, adj };
    });

    if ((out as any).error === "NOT_FOUND") return res.status(404).json({ error: "NOT_FOUND" });
    if ((out as any).error === "NEGATIVE_STOCK") return res.status(400).json({ error: "NEGATIVE_STOCK" });

    res.json({
      variant: (out as any).updated,
      adjustment: (out as any).adj,
    });
  })
);

/**
 * PATCH /v1/admin/inventory/variants/:variantId/threshold
 * Set low stock threshold (0 = disabled)
 */
r.patch(
  "/variants/:variantId/threshold",
  validate({ params: AdjustParams, body: ThresholdBody }),
  asyncHandler(async (req, res) => {
    const { variantId } = req.params as any;
    const { lowStockThreshold } = req.body as any;

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { lowStockThreshold: Number(lowStockThreshold) },
    });

    res.json(updated);
  })
);

export default r;
