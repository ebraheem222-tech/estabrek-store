import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { NotFound } from "../../utils/httpError.js";
import { getWishlist } from "../customer/customer.service.js";
import { customerAccountsOn } from "../../lib/features.js";
import { emailConfigured } from "../outbox/sender/email.js";

/** /v1/admin/customers — shopper accounts (customers:read; changes need customers:write). */
const r = Router();

const ListQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).max(64).optional(),
});

r.get("/", asyncHandler(async (req, res) => {
  // Parsed here (the query object may hold the raw strings).
  const q = ListQuery.parse(req.query);
  const take = q.take ?? 30;
  const where: any = {};
  if (q.status) where.status = q.status;
  if (q.q) {
    where.OR = [
      { email: { contains: q.q, mode: "insensitive" } },
      { name: { contains: q.q, mode: "insensitive" } },
      { phone: { contains: q.q } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        marketingOptIn: true,
        _count: { select: { orders: true, wishlist: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  const page = rows.slice(0, take).map(({ _count, ...u }) => ({ ...u, orders: _count.orders, favourites: _count.wishlist }));
  res.json({ rows: page, total, nextCursor: rows.length > take ? rows[take - 1].id : null, accountsEnabled: await customerAccountsOn(), emailReady: emailConfigured() });
}));

r.get("/:id", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      marketingOptIn: true,
      preferredSize: true,
      favoriteColor: true,
    },
  });
  if (!user) throw NotFound("Customer not found");
  const [orders, addresses, sessions, favourites] = await Promise.all([
    prisma.orderRequest.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, status: true, total: true, currencyCode: true, createdAt: true, paymentStatus: true, _count: { select: { items: true } } },
    }),
    prisma.address.findMany({ where: { userId: id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    prisma.customerSession.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } }),
    // getWishlist refuses suspended accounts; read favourites directly for the admin.
    prisma.wishlistItem.count({ where: { userId: id } }),
  ]);
  let favouriteItems: Awaited<ReturnType<typeof getWishlist>> = [];
  if (user.status === "ACTIVE" && favourites) favouriteItems = await getWishlist(id);
  res.json({
    customer: user,
    orders: orders.map(({ _count, total, ...o }) => ({ ...o, total: total == null ? null : Number(total), items: _count.items })),
    addresses,
    activeSessions: sessions,
    favourites: favouriteItems,
    favouritesCount: favourites,
  });
}));

r.patch(
  "/:id",
  validate({ body: z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).strict() }),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const found = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw NotFound("Customer not found");
    const user = await prisma.user.update({ where: { id }, data: { status: req.body.status }, select: { id: true, status: true } });
    // Suspended: signed out of every device now.
    if (req.body.status === "SUSPENDED") {
      await prisma.customerSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    res.json(user);
  }),
);

export default r;
