/**
 * An order's invoice as a printable page (print → PDF from the browser): the store's name and logo, the shopper, each
 * piece with its colour and size, the discount spread over the lines, the totals, whether it was paid, and whether she
 * agreed to the store's terms. In the shopper's language (ar, en or he; right to left for ar and he). The admin prints
 * it from an order (modules/admin/orders.controller.ts) and the shopper from her account (modules/customer).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { SITE_ROW_ORDER } from "./siteRow.js";
import { annotateLinesWithDiscount, round2 } from "../utils/money.js";

export type InvoiceLang = "ar" | "en" | "he";

const VARIANT_INCLUDE = { item: { include: { product: true, images: { orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }] } } }, size: true } satisfies Prisma.ProductVariantInclude;
/** What an invoice reads of an order. */
export const INVOICE_SELECT = {
  id: true, quantity: true, unitPrice: true, subtotal: true, discountAmount: true, total: true, currencyCode: true, couponCode: true,
  customerName: true, phone: true, email: true, country: true, city: true, address: true, note: true,
  paymentProvider: true, paymentStatus: true, locale: true, termsAcceptedAt: true, createdAt: true, userId: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    select: { productTitle: true, colorName: true, colorHex: true, sizeName: true, sku: true, imageUrl: true, quantity: true, unitPrice: true, lineSubtotal: true },
  },
  variant: { include: VARIANT_INCLUDE },
} satisfies Prisma.OrderRequestSelect;
export type InvoiceOrder = Prisma.OrderRequestGetPayload<{ select: typeof INVOICE_SELECT }>;
export type InvoiceSite = { siteName: string | null; logoUrl: string | null; contactEmail: string | null; contactPhone: string | null; currencyCode: string | null };

/** The order (only where `where` matches: its id, and for a shopper her own account) and the store's details. */
export async function loadInvoice(where: Prisma.OrderRequestWhereInput): Promise<{ order: InvoiceOrder; site: InvoiceSite | null } | null> {
  const order = await prisma.orderRequest.findFirst({ where, select: INVOICE_SELECT });
  if (!order) return null;
  const site = await prisma.siteSettings.findFirst({ orderBy: SITE_ROW_ORDER, select: { siteName: true, logoUrl: true, contactEmail: true, contactPhone: true, currencyCode: true } });
  return { order, site };
}

type Words = {
  invoice: string; order: string; name: string; phone: string; address: string; note: string; details: string; coupon: string;
  product: string; variant: string; qty: string; price: string; before: string; discount: string; after: string;
  subtotal: string; discountTotal: string; total: string; paid: string; unpaid: string; terms: string; close: string; print: string; thanks: string;
};
export const INVOICE_WORDS: Record<InvoiceLang, Words> = {
  ar: {
    invoice: "فاتورة", order: "رقم الطلب", name: "الاسم", phone: "الهاتف", address: "العنوان", note: "ملاحظة", details: "تفاصيل الطلب", coupon: "كوبون",
    product: "المنتج", variant: "لون / مقاس", qty: "الكمية", price: "السعر", before: "قبل الخصم", discount: "خصم", after: "بعد الخصم",
    subtotal: "المجموع", discountTotal: "الخصم", total: "المجموع الكلي", paid: "مدفوع", unpaid: "الدفع عند الاستلام أو حسب الاتفاق", terms: "وافقت على شروط المتجر",
    close: "إغلاق", print: "طباعة / PDF", thanks: "شكراً لطلبك ❤️",
  },
  en: {
    invoice: "Invoice", order: "Order number", name: "Name", phone: "Phone", address: "Address", note: "Note", details: "Order details", coupon: "Coupon",
    product: "Product", variant: "Colour / size", qty: "Qty", price: "Price", before: "Before discount", discount: "Discount", after: "After discount",
    subtotal: "Subtotal", discountTotal: "Discount", total: "Total", paid: "Paid", unpaid: "Paid on delivery or as agreed", terms: "Agreed to the store's terms",
    close: "Close", print: "Print / PDF", thanks: "Thank you for your order ❤️",
  },
  he: {
    invoice: "חשבונית", order: "מספר הזמנה", name: "שם", phone: "טלפון", address: "כתובת", note: "הערה", details: "פרטי ההזמנה", coupon: "קופון",
    product: "מוצר", variant: "צבע / מידה", qty: "כמות", price: "מחיר", before: "לפני הנחה", discount: "הנחה", after: "אחרי הנחה",
    subtotal: "סכום ביניים", discountTotal: "הנחה", total: "סה״כ", paid: "שולם", unpaid: "תשלום במסירה או לפי סיכום", terms: "אישר/ה את תנאי החנות",
    close: "סגירה", print: "הדפסה / PDF", thanks: "תודה על ההזמנה ❤️",
  },
};

const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** The order's lines: its own (each piece as ordered), or one made from an old order's single piece. */
export function invoiceLines(order: InvoiceOrder) {
  const raw = order.items.length
    ? order.items.map((it) => ({ productTitle: it.productTitle, colorName: it.colorName, sizeName: it.sizeName, sku: it.sku, imageUrl: it.imageUrl, quantity: it.quantity ?? 1, unitPrice: Number(it.unitPrice ?? 0), lineSubtotal: Number(it.lineSubtotal ?? 0) }))
    : [{
        productTitle: order.variant?.item?.product?.title ?? "Item",
        colorName: order.variant?.item?.colorName ?? null,
        sizeName: order.variant?.size?.name ?? null,
        sku: order.variant?.sku ?? null,
        imageUrl: order.variant?.item?.images?.[0]?.url ?? null,
        quantity: order.quantity ?? 1,
        unitPrice: Number(order.unitPrice ?? order.variant?.price ?? 0),
        lineSubtotal: Number(order.subtotal ?? 0) || round2(Number(order.unitPrice ?? order.variant?.price ?? 0) * Number(order.quantity ?? 1)),
      }];
  const subtotal = Number(order.subtotal ?? raw.reduce((s, l) => s + Number(l.lineSubtotal ?? 0), 0));
  const discountAmount = Number(order.discountAmount ?? 0);
  const total = Number(order.total ?? round2(subtotal - discountAmount));
  return { lines: annotateLinesWithDiscount(raw, discountAmount) as Array<(typeof raw)[number] & { lineDiscount?: number; lineTotal?: number }>, subtotal, discountAmount, total };
}

/** The invoice page. `baseUrl` makes the store's own picture paths whole; `lang` is the shopper's, else Arabic. */
export function invoiceHtml(order: InvoiceOrder, site: InvoiceSite | null, opts: { baseUrl: string; lang?: string | null }): string {
  const lang: InvoiceLang = opts.lang === "en" || opts.lang === "he" ? opts.lang : "ar";
  const w = INVOICE_WORDS[lang];
  const dir = lang === "en" ? "ltr" : "rtl";
  // A 3-letter currency, else the store's (old orders may keep a symbol).
  const raw = order.currencyCode ?? site?.currencyCode ?? "ILS";
  const currency = /^[A-Z]{3}$/.test(raw) ? raw : "ILS";
  const locale = lang === "en" ? "en-GB" : lang === "he" ? "he-IL" : "ar-u-nu-latn";
  let nf: Intl.NumberFormat;
  try { nf = new Intl.NumberFormat(locale, { style: "currency", currency }); } catch { nf = new Intl.NumberFormat(locale, { style: "currency", currency: "ILS" }); }
  const fmt = (n: unknown) => { const x = Number(n ?? 0); return nf.format(Number.isFinite(x) ? x : 0); };
  const base = opts.baseUrl.replace(/\/+$/, "");
  const abs = (u?: string | null) => (!u ? "" : /^https?:\/\//i.test(u) ? u : u.startsWith("//") ? `https:${u}` : `${base}${u.startsWith("/") ? "" : "/"}${u}`);
  const { lines, subtotal, discountAmount, total } = invoiceLines(order);
  const date = (order.createdAt ? new Date(order.createdAt) : new Date()).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  const paid = String(order.paymentStatus ?? "").toUpperCase() === "PAID";
  const start = dir === "rtl" ? "right" : "left", end = dir === "rtl" ? "left" : "right";
  const linesHtml = lines.map((l) => `
        <tr>
          <td><div class="piece">${l.imageUrl ? `<img src="${escapeHtml(abs(l.imageUrl))}" alt="" />` : ""}<div><b>${escapeHtml(l.productTitle)}</b>${l.sku ? `<div class="muted">SKU: ${escapeHtml(l.sku)}</div>` : ""}</div></div></td>
          <td class="muted">${[l.colorName, l.sizeName].filter(Boolean).map(escapeHtml).join(" / ")}</td>
          <td class="num">${l.quantity ?? 1}</td>
          <td class="num">${fmt(l.unitPrice)}</td>
          <td class="num">${fmt(l.lineSubtotal)}</td>
          <td class="num">${fmt(l.lineDiscount ?? 0)}</td>
          <td class="num">${fmt(l.lineTotal ?? l.lineSubtotal)}</td>
        </tr>`).join("");
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(w.invoice)} ${escapeHtml(order.id.slice(-8))}</title>
  <style>
    :root { --fg:#111; --muted:#5b5b5b; --border:#e5e7eb; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif; color: var(--fg); background:#fff; }
    .page { max-width: 900px; margin: 24px auto; padding: 24px; }
    .top { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
    .brand { display:flex; gap:12px; align-items:center; }
    .logo { width:52px; height:52px; border-radius:12px; object-fit:cover; border:1px solid var(--border); }
    h1 { margin:0; font-size: 20px; }
    .muted { color: var(--muted); font-size: 13px; }
    .card { border:1px solid var(--border); border-radius:16px; padding:16px; margin-top:16px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px 16px; }
    .k { font-size:12px; color: var(--muted); } .v { font-size:14px; }
    table { width:100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom:1px solid var(--border); padding:10px 8px; text-align:${start}; vertical-align:top; font-size:14px; }
    th { font-size:12px; color: var(--muted); font-weight:600; }
    .num { text-align:${end}; white-space:nowrap; font-variant-numeric: tabular-nums; }
    .piece { display:flex; gap:10px; align-items:center; } .piece img { width:42px; height:42px; border-radius:10px; object-fit:cover; border:1px solid var(--border); }
    .totals { margin-top: 12px; display:flex; justify-content:flex-end; } .totals table { width: 320px; } .totals td { border-bottom:none; }
    .grand { font-weight:800; font-size: 16px; }
    .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; border:1px solid var(--border); }
    .badge.paid { background:#e8f7ee; border-color:#bfe8cf; color:#11663a; }
    .printbar { display:flex; justify-content:flex-end; gap:8px; margin-top: 16px; }
    .btn { appearance:none; border:1px solid var(--border); background:#111; color:#fff; padding:10px 14px; border-radius:12px; cursor:pointer; font-weight:600; font:inherit; }
    .btn.secondary { background:#fff; color:#111; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } .page { padding: 14px; margin: 0; } th:nth-child(5), td:nth-child(5), th:nth-child(6), td:nth-child(6) { display:none; } }
    @media print { .printbar { display:none; } .page { margin:0; padding:0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="brand">
        ${site?.logoUrl ? `<img class="logo" src="${escapeHtml(abs(site.logoUrl))}" alt="" />` : ""}
        <div>
          <h1>${escapeHtml(site?.siteName ?? "")}</h1>
          <div class="muted" dir="ltr">${escapeHtml([site?.contactPhone, site?.contactEmail].filter(Boolean).join(" · "))}</div>
        </div>
      </div>
      <div style="text-align:${end}">
        <div class="muted">${escapeHtml(w.invoice)}</div>
        <div class="v" style="font-weight:700" dir="ltr">#${escapeHtml(order.id.slice(-8).toUpperCase())}</div>
        <div class="muted">${escapeHtml(date)}</div>
      </div>
    </div>

    <div class="card">
      <div class="grid">
        <div><div class="k">${escapeHtml(w.name)}</div><div class="v">${escapeHtml(order.customerName || "-")}</div></div>
        <div><div class="k">${escapeHtml(w.phone)}</div><div class="v" dir="ltr">${escapeHtml(order.phone || "-")}</div></div>
        <div><div class="k">${escapeHtml(w.address)}</div><div class="v">${escapeHtml([order.city, order.address].filter(Boolean).join(" - ") || "-")}</div></div>
        <div><div class="k">${escapeHtml(w.note)}</div><div class="v">${escapeHtml(order.note || "-")}</div></div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:baseline; flex-wrap:wrap">
        <b>${escapeHtml(w.details)}</b>
        <span class="muted">${order.couponCode ? `${escapeHtml(w.coupon)}: ${escapeHtml(order.couponCode)}` : ""}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(w.product)}</th><th>${escapeHtml(w.variant)}</th><th class="num">${escapeHtml(w.qty)}</th><th class="num">${escapeHtml(w.price)}</th>
            <th class="num">${escapeHtml(w.before)}</th><th class="num">${escapeHtml(w.discount)}</th><th class="num">${escapeHtml(w.after)}</th>
          </tr>
        </thead>
        <tbody>${linesHtml}
        </tbody>
      </table>
      <div class="totals">
        <table>
          <tr><td class="k">${escapeHtml(w.subtotal)}</td><td class="num">${fmt(subtotal)}</td></tr>
          ${discountAmount > 0 ? `<tr><td class="k">${escapeHtml(w.discountTotal)}</td><td class="num">-${fmt(discountAmount)}</td></tr>` : ""}
          <tr><td class="grand">${escapeHtml(w.total)}</td><td class="num grand">${fmt(total)}</td></tr>
        </table>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px">
        <span class="badge${paid ? " paid" : ""}">${escapeHtml(paid ? w.paid : w.unpaid)}</span>
        ${order.termsAcceptedAt ? `<span class="badge">${escapeHtml(w.terms)}</span>` : ""}
      </div>
      <div class="printbar">
        <button class="btn secondary" onclick="window.close()">${escapeHtml(w.close)}</button>
        <button class="btn" onclick="window.print()">${escapeHtml(w.print)}</button>
      </div>
    </div>
    <div class="muted" style="margin-top:16px; text-align:center;">${escapeHtml(w.thanks)}</div>
  </div>
</body>
</html>`;
}
