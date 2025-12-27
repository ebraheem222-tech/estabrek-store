import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { calcPage, buildPageMeta } from "../../utils/paginate.js";
import { CouponParams, CouponsListQuery, CreateCouponBody, UpdateCouponBody } from "./coupons.schemas.js";

const r = Router();

/**
 * GET /v1/admin/coupons
 * Query: page, pageSize, q, active
 */
r.get(
  "/",
  validate({ query: CouponsListQuery }),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const active = req.query.active as any;

    const page = calcPage({ page: req.query.page as any, pageSize: req.query.pageSize as any });

    const where: any = {};
    if (q) {
      where.code = { contains: q.toUpperCase(), mode: "insensitive" };
    }
    if (typeof active === "boolean") {
      where.isActive = active;
    }

    const [total, rows] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: page.skip,
        take: page.take,
      }),
    ]);

    res.json({
      rows,
      meta: buildPageMeta(total, page),
    });
  })
);

/**
 * GET /v1/admin/coupons/:id
 */
r.get(
  "/:id",
  validate({ params: CouponParams }),
  asyncHandler(async (req, res) => {
    const id = (req.params as any).id as string;
    const row = await prisma.coupon.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(row);
  })
);

/**
 * POST /v1/admin/coupons
 */
r.post(
  "/",
  validate({ body: CreateCouponBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as any;

    try {
      const created = await prisma.coupon.create({
        data: {
          code: body.code,
          usageLimit: body.usageLimit ?? null,
          minCart: body.minCart ?? null,
          discountType: body.discountType ?? "PERCENT",
          discountValue: body.discountValue ?? 0,
          maxDiscount: body.maxDiscount ?? null,
          isActive: body.isActive ?? true,
          startsAt: body.startsAt ?? null,
          endsAt: body.endsAt ?? null,
          note: body.note ?? null,
        },
      });
      res.status(201).json(created);
    } catch (e: any) {
      // Unique constraint on code
      if (String(e?.code) === "P2002") {
        return res.status(409).json({ error: "CODE_EXISTS" });
      }
      throw e;
    }
  })
);

/**
 * PATCH /v1/admin/coupons/:id
 */
r.patch(
  "/:id",
  validate({ params: CouponParams, body: UpdateCouponBody }),
  asyncHandler(async (req, res) => {
    const id = (req.params as any).id as string;
    const body = req.body as any;

    const exists = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: "NOT_FOUND" });

    try {
      const updated = await prisma.coupon.update({
        where: { id },
        data: {
          ...(body.code !== undefined ? { code: body.code } : {}),
          ...(body.usageLimit !== undefined ? { usageLimit: body.usageLimit } : {}),
          ...(body.minCart !== undefined ? { minCart: body.minCart } : {}),
          ...(body.discountType !== undefined ? { discountType: body.discountType } : {}),
          ...(body.discountValue !== undefined ? { discountValue: body.discountValue } : {}),
          ...(body.maxDiscount !== undefined ? { maxDiscount: body.maxDiscount } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.startsAt !== undefined ? { startsAt: body.startsAt } : {}),
          ...(body.endsAt !== undefined ? { endsAt: body.endsAt } : {}),
          ...(body.note !== undefined ? { note: body.note } : {}),
        },
      });
      res.json(updated);
    } catch (e: any) {
      if (String(e?.code) === "P2002") {
        return res.status(409).json({ error: "CODE_EXISTS" });
      }
      throw e;
    }
  })
);

/**
 * DELETE /v1/admin/coupons/:id
 */
r.delete(
  "/:id",
  validate({ params: CouponParams }),
  asyncHandler(async (req, res) => {
    const id = (req.params as any).id as string;
    const exists = await prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: "NOT_FOUND" });

    await prisma.coupon.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default r;
