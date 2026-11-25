// src/modules/admin/orders.controller.ts
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { SITE_ROW_ORDER } from "../../lib/siteRow.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { z } from "zod";
import { annotateLinesWithDiscount, round2 } from "../../utils/money.js";
import { ORDER_REQUEST_STATUSES, applyOrderStatusTransition } from "../orders/orderStatusWorkflow.js";
import { pushOrderUpdate } from "../../lib/push.js";
import { invoiceHtml, loadInvoice } from "../../lib/invoice.js";

const r = Router();

const ORDER_REQUEST_BASE_SELECT = {
  id: true,
  variantId: true,
  quantity: true,
  unitPrice: true,
  subtotal: true,
  discountAmount: true,
  total: true,
  currencyCode: true,
  couponCode: true,
  customerName: true,
  phone: true,
  whatsapp: true,
  email: true,
  deliveredAt: true,
  country: true,
  city: true,
  address: true,
  note: true,
  status: true,
  source: true,
  paymentProvider: true,
  paymentStatus: true,
  paymentReference: true,
  contactedAt: true,
  acceptedAt: true,
  rejectedAt: true,
  // The shopper's language (ar/en/he): messages to them are written in it.
  locale: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ORDER_REQUEST_ITEM_SELECT = {
  id: true,
  orderRequestId: true,
  variantId: true,
  quantity: true,
  unitPrice: true,
  lineSubtotal: true,
  productId: true,
  productTitle: true,
  productSlug: true,
  itemId: true,
  colorName: true,
  colorHex: true,
  sizeId: true,
  sizeName: true,
  sku: true,
  imageUrl: true,
  details: true,
  createdAt: true,
} as const;

// When older orders don\'t have OrderRequestItem rows, synthesize a single line from the snapshot fields.
function buildVirtualLine(o: any) {
  const v = o?.variant;
  const item = v?.item;
  const product = item?.product;
  const primaryImageUrl = item?.images?.[0]?.url ?? null;
  return {
    id: `virtual-${o.id}`,
    orderRequestId: o.id,
    variantId: o.variantId,
    variantIdSnapshot: o.variantId,
    quantity: o.quantity ?? 1,
    unitPrice: o.unitPrice,
    lineSubtotal: o.subtotal,
    productId: product?.id ?? o.productId ?? "",
    productTitle: product?.title ?? o.productTitle ?? "",
    productSlug: product?.slug ?? o.productSlug ?? null,
    itemId: item?.id ?? null,
    colorName: item?.colorName ?? null,
    colorHex: item?.colorHex ?? null,
    sizeId: v?.size?.id ?? null,
    sizeName: v?.size?.name ?? null,
    sku: v?.sku ?? null,
    imageUrl: primaryImageUrl,
    createdAt: o.createdAt,
  };
}

const ListQuery = z.object({
  status: z.enum(ORDER_REQUEST_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  /** Name, phone/WhatsApp (any format) or order id. */
  q: z.string().trim().max(100).optional(),
  /** Inclusive date range on createdAt (ISO date or datetime). */
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  source: z.string().trim().max(40).optional(),
  city: z.string().trim().max(80).optional(),
  payment: z.enum(["paid", "unpaid"]).optional(),
});

type ListQueryT = z.infer<typeof ListQuery>;

/** Digits only, without the country code or the leading 0, so 054-420-4029 and +972544204029 both match. */
function phoneCore(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.replace(/^(00)?(972|970)/, "").replace(/^0/, "");
}

function buildOrdersWhere(q: Omit<ListQueryT, "page" | "pageSize">) {
  const and: any[] = [];
  if (q.status) and.push({ status: q.status });
  if (q.from || q.to) {
    const createdAt: any = {};
    if (q.from) createdAt.gte = q.from;
    if (q.to) {
      // A bare date means "until the end of that day".
      const to = new Date(q.to);
      if (to.getUTCHours() === 0 && to.getUTCMinutes() === 0 && to.getUTCSeconds() === 0) to.setUTCDate(to.getUTCDate() + 1);
      createdAt.lt = to;
    }
    and.push({ createdAt });
  }
  if (q.source) and.push({ source: q.source });
  if (q.city) and.push({ city: { contains: q.city, mode: "insensitive" } });
  if (q.payment === "paid") and.push({ paymentStatus: { in: ["PAID", "paid", "COLLECTED"] } });
  if (q.payment === "unpaid") and.push({ OR: [{ paymentStatus: null }, { paymentStatus: { notIn: ["PAID", "paid", "COLLECTED"] } }] });
  if (q.q) {
    const text = q.q.trim();
    const or: any[] = [
      { customerName: { contains: text, mode: "insensitive" } },
      { email: { contains: text.toLowerCase() } },
      { id: { startsWith: text } },
      { city: { contains: text, mode: "insensitive" } },
    ];
    const core = phoneCore(text);
    if (core.length >= 4) {
      or.push({ phone: { contains: core } }, { whatsapp: { contains: core } });
    }
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}

r.get(
  "/",
  validate({ query: ListQuery }),
  asyncHandler(async (req, res) => {
    const q = ListQuery.parse(req.query);

    const where = buildOrdersWhere(q);
    const skip = (q.page - 1) * q.pageSize;

    const [total, data] = await Promise.all([
      prisma.orderRequest.count({ where }),
      prisma.orderRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: q.pageSize,
        select: {
          ...ORDER_REQUEST_BASE_SELECT,
          // Only what the list shows: the first photo is enough for a thumbnail.
          variant: {
            include: {
              item: { include: { product: true, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 } } },
              size: true,
            },
          },
          items: {
            orderBy: { createdAt: "asc" },
            select: ORDER_REQUEST_ITEM_SELECT,
          },
        },
      }),
    ]);

    res.json({
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
      data,
    });
  })
);

// GET /v1/admin/orders/summary — light endpoint the admin polls for new-order alerts and status counts.
r.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [groups, latestNew] = await Promise.all([
      prisma.orderRequest.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.orderRequest.findMany({
        where: { status: "NEW" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, customerName: true, total: true, currencyCode: true, city: true, source: true, createdAt: true },
      }),
    ]);
    const counts: Record<string, number> = {};
    for (const s of ORDER_REQUEST_STATUSES) counts[s] = 0;
    for (const g of groups as any[]) counts[g.status] = g._count?._all ?? 0;
    res.json({ counts, latestNew, now: new Date().toISOString() });
  })
);

r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const o = await prisma.orderRequest.findUnique({
      where: { id: req.params.id },
      select: {
        ...ORDER_REQUEST_BASE_SELECT,
        variant: { include: { item: { include: { product: true, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] } } }, size: true } },
        items: { orderBy: { createdAt: "asc" }, select: ORDER_REQUEST_ITEM_SELECT },
        messages: true,
        history: true,
      },
    });
    if (!o) return res.status(404).json({ error: "NOT_FOUND" });

    // add accounting-safe line totals for admin UI
    const discountAmount = Number(o.discountAmount ?? 0);
    const baseItems = (o.items && o.items.length) ? o.items : [buildVirtualLine(o)];
    const items = annotateLinesWithDiscount(baseItems as any, discountAmount);

    res.json({ ...o, items });})
);



// The order's invoice, printable (lib/invoice.ts), in the order's language unless ?lang= says another.
r.get(
  "/:id/invoice",
  asyncHandler(async (req, res) => {
    const found = await loadInvoice({ id: req.params.id });
    if (!found) return res.status(404).json({ error: "NOT_FOUND" });
    const lang = typeof req.query.lang === "string" ? req.query.lang : found.order.locale ?? "ar";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(invoiceHtml(found.order, found.site, { baseUrl: `${req.protocol}://${req.get("host")}`, lang }));
  })
);


r.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        toStatus: z.enum(ORDER_REQUEST_STATUSES),
        note: z.string().trim().max(500).nullable().optional(),
      })
      .safeParse(req.body ?? {});

    if (!parsed.success) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Invalid toStatus or note" });
    }

    const result = await prisma.$transaction(
      async (tx) =>
        applyOrderStatusTransition(tx, {
          orderId: req.params.id,
          toStatus: parsed.data.toStatus,
          note: parsed.data.note ?? null,
          actor: "admin",
          adminUserId: req.user?.sub ?? null,
        }),
      { isolationLevel: "Serializable" }
    );

    if (!result.ok) {
      if (result.code === "NOT_FOUND") return res.status(404).json({ error: "NOT_FOUND" });
      if (result.code === "VARIANT_NOT_FOUND") {
        return res.status(404).json({ error: "VARIANT_NOT_FOUND", variantId: result.variantId });
      }
      if (result.code === "INSUFFICIENT_STOCK") {
        return res.status(400).json({
          error: "INSUFFICIENT_STOCK",
          variantId: result.variantId,
          requested: result.requested,
          available: result.available,
        });
      }
      return res.status(400).json({ error: result.code, message: result.message });
    }

    // Its shopper's phones are told (lib/push.ts; never waits, never fails the change).
    if (result.from !== result.order.status) void pushOrderUpdate(result.order.id, result.order.status);
    res.json(result.order);
  })
);

const UpdateDetailsBody = z.object({
  customerName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(3).max(40).optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  /** Where the files/tickets email goes. */
  email: z.union([z.string().trim().toLowerCase().email().max(160), z.literal("")]).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  /** Cash on delivery: "PAID" once the money was collected, null to undo. */
  paymentStatus: z.enum(["PAID", "UNPAID"]).nullable().optional(),
  paymentProvider: z.string().trim().max(40).nullable().optional(),
  paymentReference: z.string().trim().max(120).nullable().optional(),
  /** Optional line for the order timeline. */
  note: z.string().trim().max(500).nullable().optional(),
});

// PATCH /v1/admin/orders/:id/details — delivery details and cash-on-delivery collection.
r.patch(
  "/:id/details",
  asyncHandler(async (req, res) => {
    const parsed = UpdateDetailsBody.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "BAD_REQUEST", message: "Invalid order details" });
    const { note, ...fields } = parsed.data;

    const existing = await prisma.orderRequest.findUnique({ where: { id: req.params.id }, select: { id: true, status: true, paymentStatus: true } });
    if (!existing) return res.status(404).json({ error: "NOT_FOUND" });

    const data: any = {};
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) data[k] = v === "" ? null : v;
    if (data.paymentStatus === "UNPAID") data.paymentStatus = null;

    const lines: string[] = [];
    if (fields.paymentStatus === "PAID" && existing.paymentStatus !== "PAID") lines.push("تم تسجيل استلام المبلغ");
    if (fields.paymentStatus !== undefined && fields.paymentStatus !== "PAID" && existing.paymentStatus === "PAID") lines.push("أُلغي تسجيل استلام المبلغ");
    if (["customerName", "phone", "whatsapp", "email", "city", "address"].some((k) => (fields as any)[k] !== undefined)) lines.push("تم تعديل بيانات الزبونة/التوصيل");
    if (note) lines.push(note);

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.orderRequest.update({ where: { id: existing.id }, data, select: ORDER_REQUEST_BASE_SELECT });
      if (lines.length) {
        await tx.orderRequestHistory.create({
          data: { orderRequestId: existing.id, fromStatus: existing.status, toStatus: existing.status, note: lines.join(" — ") },
        });
      }
      return updated;
    });
    res.json(order);
  })
);

r.post(
  "/:id/message",
  asyncHandler(async (req, res) => {
    const { channel, to, template, payloadJson } = req.body as {
      channel: "WHATSAPP" | "SMS" | "EMAIL";
      to: string;
      template?: string;
      payloadJson?: any;
    };

    const order = await prisma.orderRequest.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!order) return res.status(404).json({ error: "NOT_FOUND" });

    const msg = await prisma.outboxMessage.create({
      data: {
        channel,
        to,
        template: template ?? null,
        payloadJson: payloadJson ?? undefined,
        status: "QUEUED",
        orderRequestId: req.params.id,
      },
    });

    res.status(201).json(msg);
  })
);

export default r;
