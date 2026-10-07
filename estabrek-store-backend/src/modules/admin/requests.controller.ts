/**
 * /v1/admin/requests — «الطلبات الخاصة»: what shoppers asked for (sizes,
 * colours, new pieces with photos) and "call me back" requests from Razan.
 * Inbox: orders area. Settings: /v1/admin/requests-settings (settings area).
 */
import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { isCloudinaryEnabled } from "../../lib/cloudinary.js";
import { emailConfigured } from "../outbox/sender/email.js";
import { REQUESTS_DEFAULTS, RequestsSchema, requestsOf } from "../requests/requests.settings.js";
import { notifyFound, photoLinks, photoStorage, requestDemand, storefrontLink, type RequestPhoto } from "../requests/requests.service.js";
import { adminIdOf, changedKeys, getOrCreateSettings, keepRevision, triggerSettingsRevalidate } from "./settings.controller.js";

export const requestsInbox = Router();

const select = {
  id: true,
  kind: true,
  status: true,
  name: true,
  phone: true,
  email: true,
  productId: true,
  variantId: true,
  wantedSize: true,
  wantedColor: true,
  details: true,
  photos: true,
  photosDeletedAt: true,
  source: true,
  linkedProductId: true,
  notifiedAt: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { id: true, title: true, slug: true } },
  linkedProduct: { select: { id: true, title: true, slug: true } },
} satisfies Prisma.CustomerRequestSelect;

type Row = Prisma.CustomerRequestGetPayload<{ select: typeof select }>;
const view = (r: Row) => {
  const { photos, ...rest } = r;
  return { ...rest, photoCount: Array.isArray(photos) ? photos.length : 0 };
};

const ListQuery = z.object({
  status: z.enum(["NEW", "SEARCHING", "FOUND", "UNAVAILABLE", "DONE", "OPEN"]).optional(),
  kind: z.enum(["SIZE", "COLOR", "NEW_PIECE", "CALLBACK"]).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

requestsInbox.get(
  "/",
  validate({ query: ListQuery }),
  asyncHandler(async (req, res) => {
    const q = ListQuery.parse(req.query);
    const where: Prisma.CustomerRequestWhereInput = {};
    if (q.status === "OPEN") where.status = { in: ["NEW", "SEARCHING"] };
    else if (q.status) where.status = q.status;
    if (q.kind) where.kind = q.kind;
    if (q.q) {
      const digits = q.q.replace(/\D/g, "").replace(/^0/, "");
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { details: { contains: q.q, mode: "insensitive" } },
        { wantedSize: { contains: q.q, mode: "insensitive" } },
        { wantedColor: { contains: q.q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ];
    }
    const pageSize = 30;
    const [total, rows] = await Promise.all([
      prisma.customerRequest.count({ where }),
      prisma.customerRequest.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * pageSize, take: pageSize, select }),
    ]);
    res.json({ total, page: q.page, pageSize, requests: rows.map(view) });
  }),
);

requestsInbox.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    res.json({ ...(await requestDemand()), settings: requestsOf(s.header) });
  }),
);

requestsInbox.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await prisma.customerRequest.findUnique({ where: { id: String(req.params.id) }, select });
    if (!r) throw NotFound("Request not found");
    res.json({
      ...view(r),
      photos: await photoLinks(r.photos),
      productUrl: r.product ? storefrontLink(`/p/${encodeURIComponent(r.product.slug)}`) : null,
      linkedUrl: r.linkedProduct ? storefrontLink(`/p/${encodeURIComponent(r.linkedProduct.slug)}`) : null,
      emailReady: emailConfigured(),
    });
  }),
);

const Patch = z.object({
  status: z.enum(["NEW", "SEARCHING", "FOUND", "UNAVAILABLE", "DONE"]).optional(),
  adminNote: z.string().trim().max(1000).nullable().optional(),
  linkedProductId: z.string().max(64).nullable().optional(),
});

requestsInbox.patch(
  "/:id",
  validate({ body: Patch }),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const cur = await prisma.customerRequest.findUnique({ where: { id }, select: { id: true } });
    if (!cur) throw NotFound("Request not found");
    const b = req.body as z.infer<typeof Patch>;
    if (b.linkedProductId) {
      const p = await prisma.product.findUnique({ where: { id: b.linkedProductId }, select: { id: true } });
      if (!p) throw new AppError(400, "PRODUCT_NOT_FOUND", "Product not found");
    }
    const r = await prisma.customerRequest.update({ where: { id }, data: b, select });
    res.json(view(r));
  }),
);

/** "لقيناها": email her (when she left one) and give the admin the WhatsApp text. */
requestsInbox.post(
  "/:id/notify",
  asyncHandler(async (req, res) => {
    res.json(await notifyFound(String(req.params.id)));
  }),
);

/** Spam or done with: deletes the request and its photos. */
requestsInbox.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const r = await prisma.customerRequest.findUnique({ where: { id: String(req.params.id) }, select: { id: true, photos: true } });
    if (!r) throw NotFound("Request not found");
    for (const p of (Array.isArray(r.photos) ? r.photos : []) as RequestPhoto[]) await photoStorage().remove(p.location).catch(() => undefined);
    await prisma.customerRequest.delete({ where: { id: r.id } });
    res.json({ ok: true });
  }),
);

/* ---------------- Settings ---------------- */

export const requestsSettings = Router();
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

requestsSettings.get(
  "/",
  asyncHandler(async (_req, res) => {
    const s = await getOrCreateSettings();
    res.json({ settings: requestsOf(s.header), defaults: REQUESTS_DEFAULTS, photosReady: isCloudinaryEnabled() });
  }),
);

requestsSettings.put(
  "/",
  validate({ body: RequestsSchema }),
  asyncHandler(async (req, res) => {
    const next = RequestsSchema.parse(req.body);
    const s = await getOrCreateSettings();
    const data = { header: { ...obj(s.header), requests: next } as Prisma.InputJsonValue };
    const current = s as unknown as Record<string, unknown>;
    const changed = changedKeys(current, data as Record<string, unknown>);
    if (changed.length) {
      await keepRevision(current, changed, await adminIdOf(req), "تعديل إعدادات الطلبات الخاصة");
      await prisma.siteSettings.update({ where: { id: s.id }, data });
      triggerSettingsRevalidate();
    }
    res.json({ settings: next });
  }),
);
