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
