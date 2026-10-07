/**
 * How products reach the shopper (أنواع المنتجات → طريقة التسليم):
 *  - SHIPPING: as always (the owner ships it).
 *  - DIGITAL: files she downloads from her private order page.
 *  - BOOKING: one ticket per seat, with a code shown at the door.
 *
 * Files and tickets are "released" when the order is paid online or the owner
 * accepts it; cancelling, rejecting or refunding the order takes them back.
 * The shopper reaches them through /order/<accessToken> (and an email when she
 * left one). Digital products never run out: their stock is kept high.
 */
import crypto from "node:crypto";
import { Readable } from "node:stream";
import type { Fulfillment, OrderReqStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { getCloudinary, isCloudinaryEnabled } from "../../lib/cloudinary.js";
import { AppError } from "../../utils/httpError.js";
import { emailConfigured, sendEmail } from "../outbox/sender/email.js";

type Db = Prisma.TransactionClient | typeof prisma;

/** Stock digital products always have (they never sell out). */
export const DIGITAL_STOCK = 100_000;
export const CLOSED_STATUSES = new Set<OrderReqStatus>(["REJECTED", "CANCELED", "REFUNDED"]);

/* ---------------- Codes and links ---------------- */

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
export function newTicketCode() {
  const bytes = crypto.randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Ticket codes typed by hand: any case, with or without the dash or spaces. */
export function normalizeTicketCode(raw: string) {
  const s = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : null;
}

export const newAccessToken = () => crypto.randomBytes(24).toString("base64url");

export function orderPagePath(token: string) {
  return `/order/${encodeURIComponent(token)}`;
}

/** Full link for emails and WhatsApp (needs STOREFRONT_URL). */
export function orderPageUrl(token: string) {
  const base = (env.STOREFRONT_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}${orderPagePath(token)}` : null;
}

/**
 * What the ticket's QR holds: a link to the admin door page with the code, so
 * any phone camera (iPhone included) opens it ready to check in. Without
 * ADMIN_APP_URL it's just the code.
 */
export function ticketQrText(code: string) {
  const base = (env.ADMIN_APP_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}/admin/tickets?code=${encodeURIComponent(code)}` : code;
}

/* ---------------- Which lines need delivering ---------------- */

const variantText = (...parts: Array<string | null | undefined>) =>
  parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p && p.toLowerCase() !== "default")
    .join(" · ") || null;

async function orderLines(db: Db, orderId: string) {
  const order = await db.orderRequest.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      customerName: true,
      email: true,
      phone: true,
      whatsapp: true,
      accessToken: true,
      deliveredAt: true,
      deliveryEmailAt: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: { id: true, productId: true, variantId: true, quantity: true, productTitle: true, colorName: true, sizeName: true, imageUrl: true },
      },
    },
  });
  if (!order) return null;
  const ids = [...new Set(order.items.map((i) => i.productId))];
  const products = ids.length
    ? await db.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, eventStartsAt: true, eventEndsAt: true, eventLocation: true, type: { select: { fulfillment: true } } },
      })
    : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = order.items.map((it) => {
    const p = byId.get(it.productId);
    return { ...it, fulfillment: (p?.type?.fulfillment ?? "SHIPPING") as Fulfillment, product: p ?? null };
  });
  return { order, lines };
}

/** What an order contains: { shipping, digital, booking } flags. */
export async function deliveryKinds(db: Db, orderId: string) {
  const loaded = await orderLines(db, orderId);
  const kinds = { shipping: false, digital: false, booking: false };
  for (const l of loaded?.lines ?? []) {
    if (l.fulfillment === "DIGITAL") kinds.digital = true;
    else if (l.fulfillment === "BOOKING") kinds.booking = true;
    else kinds.shipping = true;
  }
  return kinds;
}

/* ---------------- Release / take back ---------------- */

/**
 * Makes the order's tickets and opens its files (safe to call again: missing
 * tickets are added, cancelled ones come back). Returns false when the order
 * has nothing to deliver or is closed.
 */
export async function releaseOrderInTx(tx: Prisma.TransactionClient, orderId: string, reason: "paid" | "accepted" | "manual") {
  const loaded = await orderLines(tx, orderId);
  if (!loaded) return { released: false as const, why: "NOT_FOUND" as const };
  const { order, lines } = loaded;
  const deliverable = lines.filter((l) => l.fulfillment !== "SHIPPING");
  if (!deliverable.length) return { released: false as const, why: "NOTHING_TO_DELIVER" as const };
  if (CLOSED_STATUSES.has(order.status)) return { released: false as const, why: "ORDER_CLOSED" as const };

  let made = 0;
  const booking = deliverable.filter((l) => l.fulfillment === "BOOKING");
  if (booking.length) {
    const back = await tx.ticket.updateMany({ where: { orderRequestId: order.id, status: "CANCELLED" }, data: { status: "VALID" } });
    made += back.count;
    const have = await tx.ticket.groupBy({ by: ["orderItemId"], where: { orderRequestId: order.id }, _count: { _all: true } });
    const count = new Map(have.map((h) => [h.orderItemId, h._count._all]));
    for (const l of booking) {
      const missing = Math.max(0, l.quantity - (count.get(l.id) ?? 0));
      for (let i = 0; i < missing; i++) {
        await tx.ticket.create({
          data: {
            code: await freeTicketCode(tx),
            orderRequestId: order.id,
            orderItemId: l.id,
            productId: l.productId,
            variantId: l.variantId,
            label: variantText(l.colorName, l.sizeName),
            holderName: order.customerName,
          },
        });
        made++;
      }
    }
  }

  const first = !order.deliveredAt;
  await tx.orderRequest.update({
    where: { id: order.id },
    data: { accessToken: order.accessToken ?? newAccessToken(), ...(first ? { deliveredAt: new Date() } : {}) },
  });
  if (first || made) {
    const what = [deliverable.some((l) => l.fulfillment === "DIGITAL") ? "الملفات" : null, booking.length ? "التذاكر" : null].filter(Boolean).join(" و");
    const why = reason === "paid" ? "بعد الدفع أونلاين" : reason === "accepted" ? "بعد قبول الطلب" : "يدوياً";
    await tx.orderRequestHistory.create({
      data: { orderRequestId: order.id, fromStatus: order.status, toStatus: order.status, note: `تم تسليم ${what} للزبونة (${why})` },
    });
  }
  return { released: true as const, first };
}

async function freeTicketCode(tx: Prisma.TransactionClient) {
  for (let i = 0; i < 8; i++) {
    const code = newTicketCode();
    const taken = await tx.ticket.findUnique({ where: { code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new AppError(500, "TICKET_CODE_FAILED", "Could not make a ticket code");
}

/** Cancelled / rejected / refunded: valid tickets stop working (used ones stay as history). */
export async function revokeOrderInTx(tx: Prisma.TransactionClient, orderId: string) {
  const r = await tx.ticket.updateMany({ where: { orderRequestId: orderId, status: "VALID" }, data: { status: "CANCELLED" } });
  return r.count;
}

export async function releaseOrder(orderId: string, reason: "paid" | "accepted" | "manual") {
  return prisma.$transaction((tx) => releaseOrderInTx(tx, orderId, reason));
}

/* ---------------- Digital stock ---------------- */

/** Digital products never sell out: their sizes get a high stock (after a save, or when a type turns digital). */
export async function syncDigitalStock(where: { productIds?: string[]; typeId?: string }) {
  const product: Prisma.ProductWhereInput = { type: { fulfillment: "DIGITAL" } };
  if (where.productIds) product.id = { in: where.productIds };
  if (where.typeId) product.typeId = where.typeId;
  const r = await prisma.productVariant.updateMany({
    where: { stock: { lt: DIGITAL_STOCK }, item: { product } },
    data: { stock: DIGITAL_STOCK },
  });
  return r.count;
}

/** Variants of digital products: stock isn't taken or given back for them. */
export async function digitalVariantIds(db: Db, variantIds: string[]) {
  if (!variantIds.length) return new Set<string>();
  const rows = await db.productVariant.findMany({
    where: { id: { in: variantIds }, item: { product: { type: { fulfillment: "DIGITAL" } } } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

/** A booking whose time has passed can't be ordered any more. */
export function eventIsOver(p: { eventStartsAt?: Date | null; eventEndsAt?: Date | null }, now = new Date()) {
  const end = p.eventEndsAt ?? p.eventStartsAt;
  return Boolean(end && end.getTime() < now.getTime());
}

/* ---------------- What the shopper sees ---------------- */

const ISRAEL = "Asia/Jerusalem";
export function eventWhen(start?: Date | null, end?: Date | null) {
  if (!start) return null;
  const day = new Intl.DateTimeFormat("ar", { timeZone: ISRAEL, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(start);
  const time = (d: Date) => new Intl.DateTimeFormat("ar", { timeZone: ISRAEL, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return end ? `${day}، ${time(start)}–${time(end)}` : `${day}، ${time(start)}`;
}

async function downloadsFor(db: Db, orderId: string, productIds: string[]) {
  if (!productIds.length) return [];
  const [files, used] = await Promise.all([
    db.productFile.findMany({
      where: { productId: { in: productIds } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, productId: true, name: true, kind: true, bytes: true, format: true, product: { select: { title: true } } },
    }),
    db.orderDownload.findMany({ where: { orderRequestId: orderId }, select: { fileId: true, count: true } }),
  ]);
  const usedBy = new Map(used.map((u) => [u.fileId, u.count]));
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    productTitle: f.product.title,
    kind: f.kind,
    bytes: f.bytes,
    format: f.format,
    downloads: usedBy.get(f.id) ?? 0,
    left: Math.max(0, env.DIGITAL_MAX_DOWNLOADS - (usedBy.get(f.id) ?? 0)),
  }));
}

/** The private order page (/order/<token>): files, tickets and the order's state. */
export async function orderAccess(token: string) {
  if (!token || token.length < 20 || token.length > 64) throw new AppError(404, "NOT_FOUND", "Order not found");
  const order = await prisma.orderRequest.findUnique({ where: { accessToken: token }, select: { id: true } });
  if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
  const loaded = (await orderLines(prisma, order.id))!;
  const o = loaded.order;
  const closed = CLOSED_STATUSES.has(o.status);
  const digitalIds = [...new Set(loaded.lines.filter((l) => l.fulfillment === "DIGITAL").map((l) => l.productId))];
  const [files, tickets] = await Promise.all([
    closed || !o.deliveredAt ? [] : downloadsFor(prisma, o.id, digitalIds),
    prisma.ticket.findMany({
      where: { orderRequestId: o.id },
      orderBy: { createdAt: "asc" },
      select: { code: true, label: true, holderName: true, status: true, checkedInAt: true, productId: true, product: { select: { title: true, eventStartsAt: true, eventEndsAt: true, eventLocation: true } } },
    }),
  ]);
  return {
    id: o.id,
    shortId: o.id.slice(-6).toUpperCase(),
    status: o.status,
    closed,
    delivered: Boolean(o.deliveredAt) && !closed,
    createdAt: o.createdAt,
    firstName: (o.customerName ?? "").trim().split(/\s+/)[0] ?? "",
    items: loaded.lines.map((l) => ({
      title: l.productTitle,
      variant: variantText(l.colorName, l.sizeName),
      quantity: l.quantity,
      imageUrl: l.imageUrl,
      fulfillment: l.fulfillment,
    })),
    files,
    maxDownloads: env.DIGITAL_MAX_DOWNLOADS,
    tickets: closed
      ? []
      : tickets.map((t) => ({
          code: t.code,
          qr: ticketQrText(t.code),
          title: t.product.title,
          label: t.label,
          holderName: t.holderName,
          status: t.status,
          checkedInAt: t.checkedInAt,
          startsAt: t.product.eventStartsAt,
          endsAt: t.product.eventEndsAt,
          when: eventWhen(t.product.eventStartsAt, t.product.eventEndsAt),
          location: t.product.eventLocation,
        })),
  };
}

/** One download: counts it and hands back a short-lived link. */
export async function downloadLink(token: string, fileId: string) {
  const order = await prisma.orderRequest.findUnique({ where: { accessToken: token }, select: { id: true, status: true, deliveredAt: true } });
  if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
  if (CLOSED_STATUSES.has(order.status)) throw new AppError(410, "ORDER_CLOSED", "This order was cancelled");
  if (!order.deliveredAt) throw new AppError(409, "NOT_RELEASED", "Not ready yet");
  const file = await prisma.productFile.findUnique({ where: { id: fileId }, select: { id: true, productId: true, kind: true, location: true, url: true, name: true, format: true } });
  if (!file) throw new AppError(404, "FILE_NOT_FOUND", "File not found");
  const bought = await prisma.orderRequestItem.findFirst({
    where: { orderRequestId: order.id, productId: file.productId, variant: { item: { product: { type: { fulfillment: "DIGITAL" } } } } },
    select: { id: true },
  });
  if (!bought) throw new AppError(404, "FILE_NOT_FOUND", "File not found");

  const max = env.DIGITAL_MAX_DOWNLOADS;
  const counted = await prisma.$transaction(async (tx) => {
    const row = await tx.orderDownload.upsert({
      where: { orderRequestId_fileId: { orderRequestId: order.id, fileId: file.id } },
      create: { orderRequestId: order.id, fileId: file.id, count: 0 },
      update: {},
    });
    const upd = await tx.orderDownload.updateMany({ where: { id: row.id, count: { lt: max } }, data: { count: { increment: 1 }, lastAt: new Date() } });
    return upd.count === 1;
  });
  if (!counted) throw new AppError(429, "DOWNLOAD_LIMIT", `Each file can be downloaded ${max} times`, { max });
  return fileLink(file);
}

/* ---------------- Files in storage ---------------- */

export type FileStorage = {
  ready: () => boolean;
  put: (name: string, data: Buffer) => Promise<{ location: string; bytes: number; format: string | null }>;
  remove: (location: string) => Promise<void>;
  link: (location: string, name: string) => Promise<string>;
};

const FOLDER = "estabrek-digital";

export const cloudinaryFiles: FileStorage = {
  ready: () => isCloudinaryEnabled(),
  put: (name, data) =>
    new Promise((resolve, reject) => {
      const cld = getCloudinary();
      if (!cld) return reject(new AppError(503, "STORAGE_NOT_READY", "Cloudinary isn't set up"));
      const ext = /\.([a-z0-9]{1,8})$/i.exec(name)?.[1]?.toLowerCase() ?? null;
      const publicId = `${crypto.randomBytes(9).toString("hex")}${ext ? `.${ext}` : ""}`;
      const up = cld.uploader.upload_stream(
        { resource_type: "raw", type: "authenticated", folder: FOLDER, public_id: publicId, overwrite: false, unique_filename: false, use_filename: false },
        (err, res) => (err || !res ? reject(err ?? new Error("UPLOAD_FAILED")) : resolve({ location: res.public_id, bytes: res.bytes ?? data.length, format: ext })),
      );
      Readable.from(data).pipe(up);
    }),
  remove: async (location) => {
    const cld = getCloudinary();
    if (cld) await cld.uploader.destroy(location, { resource_type: "raw", type: "authenticated", invalidate: true });
  },
  link: async (location) => {
    const cld = getCloudinary();
    if (!cld) throw new AppError(503, "STORAGE_NOT_READY", "Cloudinary isn't set up");
    return cld.utils.private_download_url(location, "", {
      resource_type: "raw",
      type: "authenticated",
      attachment: true,
      expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    });
  },
};

let files: FileStorage = cloudinaryFiles;
export const fileStorage = () => files;
/** Tests only. */
export function setFileStorage(s: FileStorage) {
  files = s;
}

export async function fileLink(file: { kind: string; location: string | null; url: string | null; name: string }) {
  if (file.kind === "link") {
    if (!file.url) throw new AppError(404, "FILE_NOT_FOUND", "File not found");
    return file.url;
  }
  if (!file.location) throw new AppError(404, "FILE_NOT_FOUND", "File not found");
  return files.link(file.location, file.name);
}

/* ---------------- Email ---------------- */

/**
 * Emails her the order page link (with the tickets and file names) once, after
 * the release. `force` sends it again (admin "إعادة إرسال").
 */
export async function sendDeliveryEmail(orderId: string, opts?: { force?: boolean }) {
  const loaded = await orderLines(prisma, orderId);
  if (!loaded) return { sent: false, why: "NOT_FOUND" } as const;
  const o = loaded.order;
  if (!o.email) return { sent: false, why: "NO_EMAIL" } as const;
  if (!o.deliveredAt || !o.accessToken) return { sent: false, why: "NOT_RELEASED" } as const;
  if (CLOSED_STATUSES.has(o.status)) return { sent: false, why: "ORDER_CLOSED" } as const;
  if (o.deliveryEmailAt && !opts?.force) return { sent: false, why: "ALREADY_SENT" } as const;
  const url = orderPageUrl(o.accessToken);
  if (!url) return { sent: false, why: "NO_STOREFRONT_URL" } as const;

  const digitalIds = [...new Set(loaded.lines.filter((l) => l.fulfillment === "DIGITAL").map((l) => l.productId))];
  const [fileRows, tickets] = await Promise.all([
    downloadsFor(prisma, o.id, digitalIds),
    prisma.ticket.findMany({
      where: { orderRequestId: o.id, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "asc" },
      select: { code: true, label: true, product: { select: { title: true, eventStartsAt: true, eventEndsAt: true, eventLocation: true } } },
    }),
  ]);
  const res = await sendEmail({
    to: o.email,
    template: "ORDER_DELIVERY",
    payload: {
      name: (o.customerName ?? "").trim().split(/\s+/)[0] ?? "",
      orderNo: o.id.slice(-6).toUpperCase(),
      url,
      files: fileRows.map((f) => ({ name: f.name, productTitle: f.productTitle })),
      tickets: tickets.map((t) => ({
        code: t.code,
        title: t.product.title,
        label: t.label,
        when: eventWhen(t.product.eventStartsAt, t.product.eventEndsAt),
        location: t.product.eventLocation,
      })),
      maxDownloads: env.DIGITAL_MAX_DOWNLOADS,
    },
    idempotencyKey: `order-delivery-${o.id}-${o.deliveredAt.getTime()}${opts?.force ? `-${Date.now()}` : ""}`,
  });
  if (!res.ok) return { sent: false, why: "SEND_FAILED" } as const;
  await prisma.orderRequest.update({ where: { id: o.id }, data: { deliveryEmailAt: new Date() } });
  return { sent: true, live: emailConfigured() } as const;
}

/** Emails not sent yet (released in the last week). */
export async function sendPendingDeliveryEmails() {
  const due = await prisma.orderRequest.findMany({
    where: {
      email: { not: null },
      deliveredAt: { not: null, gte: new Date(Date.now() - 7 * 24 * 3600_000) },
      deliveryEmailAt: null,
      status: { notIn: [...CLOSED_STATUSES] },
    },
    select: { id: true },
    take: 20,
  });
  let sent = 0;
  for (const o of due) {
    const r = await sendDeliveryEmail(o.id).catch(() => null);
    if (r?.sent) sent++;
  }
  return { checked: due.length, sent };
}

let kick: NodeJS.Timeout | undefined;
let running: Promise<unknown> | null = null;
/** A second after an order change: send what became ready. */
export function kickDeliveryEmails(delayMs = 1000) {
  if (env.NODE_ENV === "test") return;
  clearTimeout(kick);
  kick = setTimeout(() => {
    if (running) return;
    running = sendPendingDeliveryEmails()
      .catch((e) => console.error("[delivery] email sweep failed:", (e as Error)?.message))
      .finally(() => (running = null));
  }, delayMs);
  kick.unref?.();
}
