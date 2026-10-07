/**
 * Admin side of delivering digital products and tickets:
 *  - productFiles: the files of a digital product (upload, outside link, rename, order, delete).
 *  - orderDelivery: an order's private link, files, tickets and the delivery email.
 *  - tickets: the door — find a ticket by code and check it in; bookings with counts.
 */
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { emailConfigured } from "../outbox/sender/email.js";
import {
  CLOSED_STATUSES,
  deliveryKinds,
  eventWhen,
  fileLink,
  fileStorage,
  newAccessToken,
  normalizeTicketCode,
  orderPagePath,
  orderPageUrl,
  releaseOrder,
  sendDeliveryEmail,
} from "../fulfillment/fulfillment.service.js";

/* ---------------- Product files ---------------- */

export const productFiles = Router({ mergeParams: true });

const BLOCKED_EXT = /\.(exe|msi|bat|cmd|com|scr|ps1|vbs|js|mjs|jar|dll|sh|apk|app|html?|svg|php)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.DIGITAL_MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

/** Browsers send Arabic file names as UTF-8 bytes that arrive read as latin1. */
function fixName(raw: string) {
  try {
    const s = Buffer.from(raw, "latin1").toString("utf8");
    return s.includes("�") ? raw : s;
  } catch {
    return raw;
  }
}

function fileView(f: { id: string; name: string; kind: string; url: string | null; bytes: number | null; format: string | null; position: number; createdAt: Date; _count?: { downloads: number } }) {
  return { id: f.id, name: f.name, kind: f.kind, url: f.kind === "link" ? f.url : null, bytes: f.bytes, format: f.format, position: f.position, createdAt: f.createdAt, orders: f._count?.downloads ?? 0 };
}

async function productOr404(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!p) throw NotFound("Product not found");
  return p;
}

productFiles.get(
  "/",
  asyncHandler(async (req, res) => {
    const productId = String(req.params.productId);
    await productOr404(productId);
    const files = await prisma.productFile.findMany({
      where: { productId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { downloads: true } } },
    });
    res.json({ files: files.map(fileView), storageReady: fileStorage().ready(), maxUploadMb: env.DIGITAL_MAX_UPLOAD_MB, maxDownloads: env.DIGITAL_MAX_DOWNLOADS });
  }),
);

productFiles.post(
  "/",
  (req, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (!err) return next();
      if (err?.code === "LIMIT_FILE_SIZE") {
        return next(new AppError(413, "FILE_TOO_BIG", `Files up to ${env.DIGITAL_MAX_UPLOAD_MB} MB; add bigger ones as a link`, { maxMb: env.DIGITAL_MAX_UPLOAD_MB }));
      }
      next(err);
    });
  },
  asyncHandler(async (req, res) => {
    const productId = String(req.params.productId);
    await productOr404(productId);
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file?.buffer?.length) throw new AppError(400, "NO_FILE", "Choose a file");
    const original = fixName(file.originalname || "file");
    if (BLOCKED_EXT.test(original)) throw new AppError(400, "FILE_TYPE_BLOCKED", "This kind of file can't be sold as a download");
    if (!fileStorage().ready()) throw new AppError(503, "STORAGE_NOT_READY", "Cloudinary isn't set up");
    const name = String((req.body as any)?.name ?? "").trim().slice(0, 120) || original.slice(0, 120);
    const put = await fileStorage().put(original, file.buffer);
    const last = await prisma.productFile.aggregate({ where: { productId }, _max: { position: true } });
    const row = await prisma.productFile.create({
      data: { productId, name, kind: "upload", location: put.location, bytes: put.bytes, format: put.format, position: (last._max.position ?? -1) + 1 },
    });
    res.status(201).json(fileView(row));
  }),
);

const LinkBody = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().url().max(1000).refine((u) => /^https:\/\//i.test(u), "https only"),
});

productFiles.post(
  "/link",
  validate({ body: LinkBody }),
  asyncHandler(async (req, res) => {
    const productId = String(req.params.productId);
    await productOr404(productId);
    const b = req.body as z.infer<typeof LinkBody>;
    const last = await prisma.productFile.aggregate({ where: { productId }, _max: { position: true } });
    const row = await prisma.productFile.create({ data: { productId, name: b.name, kind: "link", url: b.url, position: (last._max.position ?? -1) + 1 } });
    res.status(201).json(fileView(row));
  }),
);

const FilePatch = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().url().max(1000).refine((u) => /^https:\/\//i.test(u), "https only").optional(),
  position: z.number().int().min(0).max(1000).optional(),
});

productFiles.patch(
  "/:fileId",
  validate({ body: FilePatch }),
  asyncHandler(async (req, res) => {
    const cur = await prisma.productFile.findFirst({ where: { id: String(req.params.fileId), productId: String(req.params.productId) } });
    if (!cur) throw NotFound("File not found");
    const b = req.body as z.infer<typeof FilePatch>;
    if (b.url && cur.kind !== "link") throw new AppError(400, "NOT_A_LINK", "Only links have an address");
    const row = await prisma.productFile.update({ where: { id: cur.id }, data: b });
    res.json(fileView(row));
  }),
);

productFiles.delete(
  "/:fileId",
  asyncHandler(async (req, res) => {
    const cur = await prisma.productFile.findFirst({ where: { id: String(req.params.fileId), productId: String(req.params.productId) } });
    if (!cur) throw NotFound("File not found");
    await prisma.productFile.delete({ where: { id: cur.id } });
    if (cur.kind === "upload" && cur.location) await fileStorage().remove(cur.location).catch(() => undefined);
    res.json({ ok: true });
  }),
);

/** The owner checks a file (not counted). */
productFiles.get(
  "/:fileId/link",
  asyncHandler(async (req, res) => {
    const cur = await prisma.productFile.findFirst({ where: { id: String(req.params.fileId), productId: String(req.params.productId) } });
    if (!cur) throw NotFound("File not found");
    res.json({ url: await fileLink(cur) });
  }),
);

/* ---------------- Order delivery ---------------- */

export const orderDelivery = Router();

async function deliveryView(orderId: string) {
  const o = await prisma.orderRequest.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      customerName: true,
      phone: true,
      whatsapp: true,
      email: true,
      accessToken: true,
      deliveredAt: true,
      deliveryEmailAt: true,
      paymentStatus: true,
      downloads: { select: { fileId: true, count: true, lastAt: true, file: { select: { name: true } } } },
      tickets: {
        orderBy: { createdAt: "asc" },
        select: { id: true, code: true, label: true, status: true, checkedInAt: true, product: { select: { title: true, eventStartsAt: true, eventEndsAt: true } } },
      },
    },
  });
  if (!o) throw NotFound("Order not found");
  const kinds = await deliveryKinds(prisma, o.id);
  const needed = kinds.digital || kinds.booking;
  const items = await prisma.orderRequestItem.findMany({ where: { orderRequestId: o.id }, select: { productId: true } });
  const files = kinds.digital
    ? await prisma.productFile.findMany({
        where: { productId: { in: [...new Set(items.map((i) => i.productId))] }, product: { type: { fulfillment: "DIGITAL" } } },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, kind: true, product: { select: { title: true } } },
      })
    : [];
  const used = new Map(o.downloads.map((d) => [d.fileId, d]));
  return {
    needed,
    kinds,
    closed: CLOSED_STATUSES.has(o.status),
    released: Boolean(o.deliveredAt),
    deliveredAt: o.deliveredAt,
    path: o.accessToken ? orderPagePath(o.accessToken) : null,
    url: o.accessToken ? orderPageUrl(o.accessToken) : null,
    storefrontUrlSet: Boolean(env.STOREFRONT_URL),
    email: o.email,
    emailReady: emailConfigured(),
    emailSentAt: o.deliveryEmailAt,
    phone: o.whatsapp || o.phone,
    customerName: o.customerName,
    files: files.map((f) => ({ id: f.id, name: f.name, productTitle: f.product.title, kind: f.kind, downloads: used.get(f.id)?.count ?? 0, lastAt: used.get(f.id)?.lastAt ?? null })),
    maxDownloads: env.DIGITAL_MAX_DOWNLOADS,
    tickets: o.tickets.map((t) => ({ id: t.id, code: t.code, title: t.product.title, label: t.label, status: t.status, checkedInAt: t.checkedInAt, when: eventWhen(t.product.eventStartsAt, t.product.eventEndsAt) })),
  };
}

orderDelivery.get(
  "/:id/delivery",
  asyncHandler(async (req, res) => {
    res.json(await deliveryView(String(req.params.id)));
  }),
);

/** Hand the files/tickets over now (e.g. paid by bank transfer, before accepting). */
orderDelivery.post(
  "/:id/delivery/release",
  asyncHandler(async (req, res) => {
    const r = await releaseOrder(String(req.params.id), "manual");
    if (!r.released) {
      if (r.why === "NOT_FOUND") throw NotFound("Order not found");
      throw new AppError(409, r.why, r.why === "ORDER_CLOSED" ? "This order is closed" : "Nothing in this order is digital or a booking");
    }
    await sendDeliveryEmail(String(req.params.id)).catch(() => null);
    res.json(await deliveryView(String(req.params.id)));
  }),
);

const EmailBody = z.object({ email: z.string().trim().toLowerCase().email().max(160).optional() });

/** Send (or send again) the delivery email; can set the address first. */
orderDelivery.post(
  "/:id/delivery/email",
  validate({ body: EmailBody }),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const b = req.body as z.infer<typeof EmailBody>;
    if (b.email) await prisma.orderRequest.update({ where: { id }, data: { email: b.email } });
    const r = await sendDeliveryEmail(id, { force: true });
    if (!r.sent) {
      const msg: Record<string, string> = {
        NO_EMAIL: "No email on this order",
        NOT_RELEASED: "Files/tickets aren't released yet",
        ORDER_CLOSED: "This order is closed",
        NO_STOREFRONT_URL: "STOREFRONT_URL isn't set on the server",
        SEND_FAILED: "The email provider refused the email",
        NOT_FOUND: "Order not found",
      };
      throw new AppError(r.why === "NOT_FOUND" ? 404 : r.why === "SEND_FAILED" ? 502 : 409, r.why, msg[r.why] ?? r.why);
    }
    res.json({ ...(await deliveryView(id)), live: r.live });
  }),
);

/** A new private link: the old one stops working (e.g. it was shared by mistake). */
orderDelivery.post(
  "/:id/delivery/new-link",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const o = await prisma.orderRequest.findUnique({ where: { id }, select: { accessToken: true, status: true } });
    if (!o) throw NotFound("Order not found");
    if (!o.accessToken) throw new AppError(409, "NOT_RELEASED", "Files/tickets aren't released yet");
    await prisma.$transaction([
      prisma.orderRequest.update({ where: { id }, data: { accessToken: newAccessToken(), deliveryEmailAt: null } }),
      prisma.orderRequestHistory.create({ data: { orderRequestId: id, fromStatus: o.status, toStatus: o.status, note: "رابط جديد لصفحة الطلب (القديم وقف)" } }),
    ]);
    res.json(await deliveryView(id));
  }),
);

/* ---------------- Tickets (the door) ---------------- */

export const tickets = Router();

const ticketSelect = {
  id: true,
  code: true,
  label: true,
  holderName: true,
  status: true,
  checkedInAt: true,
  checkedInById: true,
  createdAt: true,
  orderRequestId: true,
  product: { select: { id: true, title: true, eventStartsAt: true, eventEndsAt: true, eventLocation: true } },
  orderRequest: { select: { status: true, phone: true, customerName: true } },
} satisfies Prisma.TicketSelect;

type TicketRow = Prisma.TicketGetPayload<{ select: typeof ticketSelect }>;

function ticketView(t: TicketRow) {
  return {
    id: t.id,
    code: t.code,
    label: t.label,
    holderName: t.holderName ?? t.orderRequest.customerName,
    phone: t.orderRequest.phone,
    status: t.status,
    orderClosed: CLOSED_STATUSES.has(t.orderRequest.status),
    checkedInAt: t.checkedInAt,
    orderId: t.orderRequestId,
    product: { id: t.product.id, title: t.product.title, when: eventWhen(t.product.eventStartsAt, t.product.eventEndsAt), startsAt: t.product.eventStartsAt, location: t.product.eventLocation },
  };
}

/** Bookings with their tickets: sold, at the door, still to come. */
tickets.get(
  "/events",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { type: { fulfillment: "BOOKING" } },
      orderBy: [{ eventStartsAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: 100,
      select: { id: true, title: true, isActive: true, eventStartsAt: true, eventEndsAt: true, eventLocation: true },
    });
    const counts = products.length
      ? await prisma.ticket.groupBy({ by: ["productId", "status"], where: { productId: { in: products.map((p) => p.id) } }, _count: { _all: true } })
      : [];
    const by = (id: string, s: string) => counts.find((c) => c.productId === id && c.status === s)?._count._all ?? 0;
    res.json({
      events: products.map((p) => ({
        ...p,
        when: eventWhen(p.eventStartsAt, p.eventEndsAt),
        valid: by(p.id, "VALID"),
        used: by(p.id, "USED"),
        cancelled: by(p.id, "CANCELLED"),
      })),
    });
  }),
);

const ListQuery = z.object({
  productId: z.string().max(64).optional(),
  status: z.enum(["VALID", "USED", "CANCELLED"]).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

tickets.get(
  "/",
  validate({ query: ListQuery }),
  asyncHandler(async (req, res) => {
    const q = ListQuery.parse(req.query);
    const where: Prisma.TicketWhereInput = {};
    if (q.productId) where.productId = q.productId;
    if (q.status) where.status = q.status;
    if (q.q) {
      const code = normalizeTicketCode(q.q);
      where.OR = [
        ...(code ? [{ code }] : []),
        { code: { contains: q.q.toUpperCase() } },
        { holderName: { contains: q.q, mode: "insensitive" } },
        { orderRequest: { phone: { contains: q.q.replace(/\D/g, "").replace(/^0/, "") || q.q } } },
      ];
    }
    const pageSize = 50;
    const [total, rows] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * pageSize, take: pageSize, select: ticketSelect }),
    ]);
    res.json({ total, page: q.page, pageSize, tickets: rows.map(ticketView) });
  }),
);

tickets.get(
  "/code/:code",
  asyncHandler(async (req, res) => {
    const code = normalizeTicketCode(String(req.params.code));
    if (!code) throw new AppError(400, "BAD_CODE", "A ticket code has 8 letters/numbers");
    const t = await prisma.ticket.findUnique({ where: { code }, select: ticketSelect });
    if (!t) throw new AppError(404, "TICKET_NOT_FOUND", "No ticket with this code");
    res.json(ticketView(t));
  }),
);

/** At the door: once only. A second scan answers 409 with when it was used. */
tickets.post(
  "/:id/check-in",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const t = await prisma.ticket.findUnique({ where: { id }, select: ticketSelect });
    if (!t) throw new AppError(404, "TICKET_NOT_FOUND", "No ticket with this code");
    if (t.status === "CANCELLED" || CLOSED_STATUSES.has(t.orderRequest.status)) {
      throw new AppError(409, "TICKET_CANCELLED", "This ticket was cancelled", { ticket: ticketView(t) });
    }
    const upd = await prisma.ticket.updateMany({ where: { id, status: "VALID" }, data: { status: "USED", checkedInAt: new Date(), checkedInById: req.user?.sub ?? null } });
    const now = await prisma.ticket.findUnique({ where: { id }, select: ticketSelect });
    if (upd.count !== 1) throw new AppError(409, "ALREADY_USED", "This ticket was already used", { ticket: ticketView(now!) });
    res.json(ticketView(now!));
  }),
);

/** Undo a check-in made by mistake. */
tickets.post(
  "/:id/undo",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const upd = await prisma.ticket.updateMany({ where: { id, status: "USED" }, data: { status: "VALID", checkedInAt: null, checkedInById: null } });
    if (upd.count !== 1) throw new AppError(409, "NOT_USED", "This ticket isn't checked in");
    const t = await prisma.ticket.findUnique({ where: { id }, select: ticketSelect });
    res.json(ticketView(t!));
  }),
);
