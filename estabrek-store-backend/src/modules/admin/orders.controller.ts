// src/modules/admin/orders.controller.ts
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { z } from "zod";
import { annotateLinesWithDiscount, round2 } from "../../utils/money.js";

const r = Router();

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
  status: z.enum(["NEW","CONTACTED","ACCEPTED","REJECTED","SHIPPED","CLOSED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

r.get(
  "/",
  validate({ query: ListQuery }),
  asyncHandler(async (req, res) => {
    const q = ListQuery.parse(req.query);

    const where = q.status ? { status: q.status } : {};
    const skip = (q.page - 1) * q.pageSize;

    const [total, data] = await Promise.all([
      prisma.orderRequest.count({ where }),
      prisma.orderRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: q.pageSize,
        include: {
            variant: {
            include: {
              item: { include: { product: true, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] } } },
              size: true,
            },
          },
          items: {
        orderBy: { createdAt: "asc" },
        include: {
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
          messages: true,
          history: true,
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

r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const o = await prisma.orderRequest.findUnique({
      where: { id: req.params.id },
      include: {
        variant: { include: { item: { include: { product: true, images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] } } }, size: true } },
        items: { orderBy: { createdAt: "asc" } },
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
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
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
        coupon: true,
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
    const toStatus = req.body?.toStatus as
      | "NEW" | "CONTACTED" | "ACCEPTED" | "REJECTED" | "SHIPPED" | "CLOSED";
    if (!toStatus) return res.status(400).json({ error: "BAD_REQUEST", message: "toStatus required" });

    const existing = await prisma.orderRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "NOT_FOUND" });

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.orderRequest.update({
        where: { id: req.params.id },
        data: { status: toStatus },
      });
      await tx.orderRequestHistory.create({
        data: {
          orderRequestId: req.params.id,
          fromStatus: existing.status,
          toStatus,
          note: "Updated via admin",
        },
      });
      return u;
    });

    res.json(updated);
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

    const order = await prisma.orderRequest.findUnique({ where: { id: req.params.id } });
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
