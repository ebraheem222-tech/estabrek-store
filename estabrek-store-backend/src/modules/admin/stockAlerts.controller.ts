import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async.js";
import { NotFound } from "../../utils/httpError.js";
import { hasPermission } from "../../middleware/access.js";
import { stockAlertsOn } from "../../lib/features.js";
import { emailConfigured } from "../outbox/sender/email.js";
import { sweepStockAlerts } from "../stockAlerts/stockAlerts.service.js";

/** /v1/admin/stock-alerts — who is waiting for which sold-out size (inventory:read / inventory:write). */
const r = Router();

/** "s•••@gmail.com" for members who can't see shoppers' details. */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "•••";
  return `${name.slice(0, 1)}•••@${domain}`;
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const showEmails = hasPermission(req as any, "customers:read");
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const [groups, waiting, sent30, recent] = await Promise.all([
      prisma.stockAlert.groupBy({
        by: ["variantId"],
        where: { status: "WAITING" },
        _count: { _all: true },
        _min: { createdAt: true },
        orderBy: { _count: { variantId: "desc" } },
        take: 100,
      }),
      prisma.stockAlert.count({ where: { status: "WAITING" } }),
      prisma.stockAlert.count({ where: { status: "SENT", notifiedAt: { gte: since } } }),
      prisma.stockAlert.findMany({
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
          notifiedAt: true,
          variant: { select: { size: { select: { name: true } }, item: { select: { colorName: true, product: { select: { title: true } } } } } },
        },
      }),
    ]);

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: groups.map((g) => g.variantId) } },
      select: {
        id: true,
        sku: true,
        stock: true,
        size: { select: { name: true } },
        item: {
          select: {
            colorName: true,
            images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
            product: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    res.json({
      enabled: await stockAlertsOn(),
      ready: { email: emailConfigured(), storefrontUrl: Boolean(env.STOREFRONT_URL) },
      totals: { waiting, sentLast30Days: sent30 },
      pieces: groups.flatMap((g) => {
        const v = byId.get(g.variantId);
        if (!v) return [];
        return [
          {
            variantId: v.id,
            sku: v.sku,
            stock: v.stock,
            productId: v.item.product.id,
            productTitle: v.item.product.title,
            productSlug: v.item.product.slug,
            colorName: v.item.colorName,
            sizeName: v.size?.name ?? "",
            image: v.item.images[0]?.url ?? null,
            waiting: g._count._all,
            since: g._min.createdAt,
          },
        ];
      }),
      recent: recent.map((a) => ({
        id: a.id,
        email: showEmails ? a.email : maskEmail(a.email),
        status: a.status,
        createdAt: a.createdAt,
        notifiedAt: a.notifiedAt,
        productTitle: a.variant.item.product.title,
        colorName: a.variant.item.colorName,
        sizeName: a.variant.size?.name ?? "",
      })),
    });
  }),
);

// POST /v1/admin/stock-alerts/send-now — send the emails that are due now (instead of waiting for the next sweep)
r.post(
  "/send-now",
  asyncHandler(async (_req, res) => {
    res.json(await sweepStockAlerts(100));
  }),
);

// DELETE /v1/admin/stock-alerts/:id — cancel one waiting alert
r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const out = await prisma.stockAlert.updateMany({ where: { id: String(req.params.id), status: "WAITING" }, data: { status: "CANCELLED" } });
    if (!out.count) throw NotFound("This alert is not waiting");
    res.json({ ok: true });
  }),
);

export default r;
