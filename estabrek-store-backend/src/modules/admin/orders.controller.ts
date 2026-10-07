// src/modules/admin/orders.controller.ts
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { z } from "zod";
import { annotateLinesWithDiscount, round2 } from "../../utils/money.js";
import { ORDER_REQUEST_STATUSES, applyOrderStatusTransition } from "../orders/orderStatusWorkflow.js";

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



r.get(
  "/:id/invoice",
  asyncHandler(async (req, res) => {
    const order = await prisma.orderRequest.findUnique({
      where: { id: req.params.id },
      select: {
        ...ORDER_REQUEST_BASE_SELECT,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            ...ORDER_REQUEST_ITEM_SELECT,
            variant: {
              include: {
                item: {
                  include: {
                    product: true,
                    images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
                  },
                },
                size: true,
              },
            },
          },
        },
        variant: { include: { item: { include: { product: true, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] } } }, size: true } },
      },
    });
    if (!order) return res.status(404).json({ error: "NOT_FOUND" });

    const site = await prisma.siteSettings.findFirst({
      select: { siteName: true, logoUrl: true, contactEmail: true, contactPhone: true, currencyCode: true },
    });

    // Currency safety: Intl.NumberFormat expects a 3-letter ISO code. Some old records
    // might store the symbol (e.g. "₪"). Fallback to ILS in that case.
    const rawCurrency = (order.currencyCode as any) ?? (site?.currencyCode ?? "ILS");
    const currencyCode = typeof rawCurrency === "string" && /^[A-Z]{3}$/.test(rawCurrency)
      ? rawCurrency
      : "ILS";

    const escapeHtml = (str: any) =>
      String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[c] ?? c);

    // Build invoice lines (prefer items snapshot, fallback to legacy single-variant flow)
    const rawLines = (order.items && order.items.length)
      ? order.items.map((it: any) => ({
          productTitle: it.productTitle,
          colorName: it.colorName,
          colorHex: it.colorHex,
          sizeName: it.sizeName,
          sku: it.sku,
          imageUrl: it.imageUrl,
          quantity: it.quantity ?? 1,
          unitPrice: Number(it.unitPrice ?? 0),
          lineSubtotal: Number(it.lineSubtotal ?? 0),
        }))
      : [{
          productTitle: order.variant?.item?.product?.title ?? "Item",
          colorName: order.variant?.item?.colorName ?? null,
          colorHex: order.variant?.item?.colorHex ?? null,
          sizeName: order.variant?.size?.name ?? null,
          sku: order.variant?.sku ?? null,
          imageUrl: order.variant?.item?.images?.[0]?.url ?? null,
          quantity: order.quantity ?? 1,
          unitPrice: Number(order.unitPrice ?? order.variant?.price ?? 0),
          lineSubtotal: Number(order.subtotal ?? 0) || round2(Number(order.unitPrice ?? order.variant?.price ?? 0) * Number(order.quantity ?? 1)),
        }];

    const subtotal = Number(order.subtotal ?? rawLines.reduce((s: number, l: any) => s + Number(l.lineSubtotal ?? 0), 0));
    const discountAmount = Number(order.discountAmount ?? 0);
    const total = Number(order.total ?? round2(subtotal - discountAmount));

    const lines = annotateLinesWithDiscount(rawLines as any, discountAmount);

    let nf: Intl.NumberFormat;
    try {
      nf = new Intl.NumberFormat("he-IL", { style: "currency", currency: currencyCode });
    } catch {
      nf = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });
    }
    const fmt = (n: any) => {
      const x = typeof n === "string" ? Number(n) : Number(n ?? 0);
      if (!Number.isFinite(x)) return nf.format(0);
      return nf.format(x);
    };

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const abs = (u?: string | null) => {
      if (!u) return "";
      if (u.startsWith("http://") || u.startsWith("https://")) return u;
      if (u.startsWith("//")) return `${req.protocol}:${u}`;
      if (u.startsWith("/")) return `${baseUrl}${u}`;
      return `${baseUrl}/${u}`;
    };

    const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
    const dateStr = createdAt.toLocaleString("he-IL");
    const couponLabel = order.couponCode ? `Coupon: ${escapeHtml(order.couponCode)}` : "";

    const linesHtml = lines.map((l: any) => {
      const colorSize = [l.colorName, l.sizeName].filter(Boolean).map(escapeHtml).join(" / ");
      const sku = l.sku ? `SKU: ${escapeHtml(l.sku)}` : "";
      return `
        <tr>
          <td>
            <div style="display:flex; gap:10px; align-items:center;">
              ${l.imageUrl ? `<img src="${escapeHtml(abs(l.imageUrl) || "")}" style="width:42px;height:42px;border-radius:12px;object-fit:cover;border:1px solid var(--border)" />` : ``}
              <div>
                <div style="font-weight:650">${escapeHtml(l.productTitle)}</div>
                <div class="muted" style="font-size:12px">${sku}</div>
              </div>
            </div>
          </td>
          <td><div class="muted" style="font-size:13px">${colorSize}</div></td>
          <td class="right">${l.quantity ?? 1}</td>
          <td class="right">${fmt(l.unitPrice)}</td>
          <td class="right">${fmt(l.lineSubtotal)}</td>
          <td class="right">${fmt(l.lineDiscount ?? 0)}</td>
          <td class="right">${fmt(l.lineTotal ?? l.lineSubtotal)}</td>
        </tr>
      `;
    }).join("");

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <base href="${baseUrl}" />
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(order.id)}</title>
  <style>
    :root { --fg:#111; --muted:#555; --border:#e5e7eb; --bg:#fff; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial; background: var(--bg); color: var(--fg); }
    .page { max-width: 900px; margin: 24px auto; padding: 24px; }
    .top { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
    .brand { display:flex; gap:12px; align-items:center; }
    .logo { width:48px; height:48px; border-radius:12px; object-fit:cover; border:1px solid var(--border); }
    h1 { margin:0; font-size: 20px; }
    .muted { color: var(--muted); font-size: 13px; }
    .card { border:1px solid var(--border); border-radius:16px; padding:16px; margin-top:16px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px 16px; }
    .k { font-size:12px; color: var(--muted); }
    .v { font-size:14px; }
    table { width:100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom:1px solid var(--border); padding:10px 8px; text-align:right; vertical-align:top; }
    th { font-size:12px; color: var(--muted); font-weight:600; }
    td { font-size:14px; }
    .right { text-align:left; }
    .totals { margin-top: 12px; display:flex; justify-content:flex-end; }
    .totals table { width: 320px; }
    .totals td { border-bottom:none; }
    .totals .k { color: var(--muted); }
    .totals .grand { font-weight:800; font-size: 16px; }
    .printbar { display:flex; justify-content:flex-end; gap:8px; margin-top: 12px; }
    .btn { appearance:none; border:1px solid var(--border); background:#111; color:#fff; padding:10px 12px; border-radius:12px; cursor:pointer; font-weight:600; }
    .btn.secondary { background:#fff; color:#111; }
    @media print {
      .printbar { display:none; }
      .page { margin:0; padding:0; }
      body { background:#fff; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="brand">
        ${site?.logoUrl ? `<img class="logo" src="${escapeHtml(abs(site.logoUrl) || "")}" alt="logo" />` : ``}
        <div>
          <h1>${escapeHtml(site?.siteName ?? "Store")}</h1>
          <div class="muted">${escapeHtml(site?.contactPhone ?? "")} ${escapeHtml(site?.contactEmail ?? "")}</div>
        </div>
      </div>
      <div style="text-align:left">
        <div class="muted">Invoice</div>
        <div class="v" style="font-weight:700">${escapeHtml(order.id)}</div>
        <div class="muted">${escapeHtml(dateStr)}</div>
      </div>
    </div>

    <div class="card">
      <div class="grid">
        <div>
          <div class="k">الاسم</div>
          <div class="v">${escapeHtml(order.customerName ?? "-")}</div>
        </div>
        <div>
          <div class="k">الهاتف</div>
          <div class="v">${escapeHtml(order.phone ?? "-")}</div>
        </div>
        <div>
          <div class="k">العنوان</div>
          <div class="v">${escapeHtml([order.city, order.address].filter(Boolean).join(" - ") || "-")}</div>
        </div>
        <div>
          <div class="k">ملاحظة</div>
          <div class="v">${escapeHtml(order.note ?? "-")}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:baseline;">
        <div style="font-weight:700">تفاصيل الطلب</div>
        <div class="muted">${couponLabel}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>لون/مقاس</th>
            <th class="right">الكمية</th>
            <th class="right">سعر</th>
            <th class="right">قبل الخصم</th>
            <th class="right">خصم</th>
            <th class="right">بعد الخصم</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr><td class="k">Subtotal</td><td class="right">${fmt(subtotal)}</td></tr>
          <tr><td class="k">Discount</td><td class="right">-${fmt(discountAmount)}</td></tr>
          <tr><td class="k">Shipping</td><td class="right">${fmt(0)}</td></tr>
          <tr><td class="k">Tax</td><td class="right">${fmt(0)}</td></tr>
          <tr><td class="grand">Total</td><td class="right grand">${fmt(total)}</td></tr>
        </table>
      </div>

      <div class="printbar">
        <button class="btn secondary" onclick="window.close()">إغلاق</button>
        <button class="btn" onclick="window.print()">طباعة / PDF</button>
      </div>
    </div>

    <div class="muted" style="margin-top:16px; text-align:center;">
      شكراً لطلبك ❤️
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
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
