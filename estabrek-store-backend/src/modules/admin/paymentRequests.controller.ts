/**
 * /v1/admin/payment-requests — the payments functions asked for (lib/payLinks.ts): who was asked, how much, for
 * what, and whether it was paid. Looking needs orders:read; closing one that wasn't paid, orders:write
 * (admin.routes.ts).
 *
 * GET  /admin/payment-requests?status=PENDING|PAID|CANCELLED|EXPIRED&q=   newest first, 50 a page (?page=)
 * POST /admin/payment-requests/:id/cancel                                its link can't be paid any more
 */
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { payRow } from "../../lib/payLinks.js";

const r = Router();
const PAGE = 50;
const Query = z.object({ status: z.enum(["PENDING", "PAID", "CANCELLED", "EXPIRED"]).optional(), q: z.string().trim().max(120).optional(), page: z.coerce.number().int().min(1).max(1000).default(1) });

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = Query.parse(req.query);
    const now = new Date();
    const where: Prisma.PaymentRequestWhereInput = {
      // Waiting means not past its end yet; past it, it is "expired" (kept as waiting in the table).
      ...(q.status === "PENDING" ? { status: "PENDING", OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] } : q.status === "EXPIRED" ? { status: "PENDING", expiresAt: { lt: now } } : q.status ? { status: q.status } : {}),
      ...(q.q ? { AND: [{ OR: [{ title: { contains: q.q, mode: "insensitive" } }, { ref: q.q }, { email: { contains: q.q.toLowerCase() } }, { phone: { contains: q.q } }] }] } : {}),
    };
    const [rows, total, paid] = await Promise.all([
      prisma.paymentRequest.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (q.page - 1) * PAGE, take: PAGE }),
      prisma.paymentRequest.count({ where }),
      prisma.paymentRequest.groupBy({ by: ["currency"], where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
    ]);
    res.json({ rows: rows.map((x) => payRow(x, now)), total, page: q.page, pageSize: PAGE, paid: paid.map((p) => ({ currency: p.currency, count: p._count, amount: Number(p._sum.amount ?? 0) })) });
  }),
);

r.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const done = await prisma.paymentRequest.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED" } });
    if (!done.count) {
      const r0 = await prisma.paymentRequest.findUnique({ where: { id }, select: { status: true } });
      if (!r0) throw new AppError(404, "NOT_FOUND", "No such payment");
      throw new AppError(409, "NOT_WAITING", r0.status === "PAID" ? "It is paid already" : "It is closed already");
    }
    res.json(payRow(await prisma.paymentRequest.findUniqueOrThrow({ where: { id } })));
  }),
);

export default r;
