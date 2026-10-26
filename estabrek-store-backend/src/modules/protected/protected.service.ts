/**
 * Protected digital products (admin → المنتج → «محمي»): scripts, models, programs.
 *   - The owner uploads master files: into the vault when there is one (src/vault,
 *     an open vault session needed), else kept encrypted in the database (never on
 *     the public file storage).
 *   - When an order is paid or accepted (releaseOrderInTx) each piece gets a
 *     licence: a random serial (shown only on the buyer's private order page) and
 *     a mark id.
 *   - Inside the licence's window (default 24 h) and up to its download count
 *     (default 3), the buyer downloads a ZIP encrypted with her serial: her
 *     copies of the files, each carrying the mark (marks.ts), and LICENCE.txt.
 *   - A cancelled order's serials stop; reopened, they come back. The owner can
 *     renew a window, stop one serial, and trace a leaked file to its order.
 */
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/httpError.js";
import { keyedHash, open, openBytes, seal, sealBytes } from "../../lib/secretBox.js";
import { allTypes, extOf, findMarks, newMarkId, newSerial, normalizeSerial, placementFor, probeFile, ruleFor, serialLast4, type FileTypeRule, type MarkMode, type Probe } from "./marks.js";
import { safeEntryName } from "./zipAes.js";
import { makePackage } from "./package.js";
import { vaultAddFile, vaultOn, vaultPackage, vaultRemoveFile } from "../vault/vaultClient.js";
import { moveLocalFilesToVault, requireVaultSession, vaultSessionFor } from "../vault/vaultAdmin.service.js";

type Db = Prisma.TransactionClient | typeof prisma;

export const DEFAULT_LICENCE_HOURS = 24;
export const DEFAULT_LICENCE_DOWNLOADS = 3;
export const DEFAULT_LICENCE_DEVICES = 1;
const CLOSED = new Set(["REJECTED", "CANCELED", "REFUNDED"]);
const shortId = (orderId: string) => orderId.slice(-6).toUpperCase();
const serialHash = (serial: string) => keyedHash(`licence:${normalizeSerial(serial)}`);

/* ---------------- File types ---------------- */

export async function customTypes(db: Db = prisma): Promise<FileTypeRule[]> {
  const rows = await db.protectedFileType.findMany();
  return rows.map((r) => ({ ext: r.ext, label: r.label, mode: r.mode as MarkMode, commentStart: r.commentStart, commentEnd: r.commentEnd, builtIn: false }));
}

export async function listTypes() {
  return allTypes(await customTypes());
}

export async function saveType(input: { ext: string; label: string; mode: MarkMode; commentStart?: string | null; commentEnd?: string | null }) {
  const ext = input.ext.trim().toLowerCase().replace(/^\./, "");
  if (!/^[a-z0-9_+-]{1,16}$/.test(ext)) throw new AppError(400, "BAD_EXTENSION", "Letters and digits only, up to 16");
  if (input.mode === "comment" && !input.commentStart?.trim()) throw new AppError(400, "COMMENT_REQUIRED", "How a comment starts in this kind of file");
  const data = {
    label: input.label.trim().slice(0, 60) || ext.toUpperCase(),
    mode: input.mode,
    commentStart: input.mode === "comment" ? input.commentStart!.trim().slice(0, 12) : null,
    commentEnd: input.mode === "comment" && input.commentEnd?.trim() ? input.commentEnd.trim().slice(0, 12) : null,
  };
  await prisma.protectedFileType.upsert({ where: { ext }, create: { ext, ...data }, update: data });
  return listTypes();
}

/** The owner's own type removed (a built-in one goes back to how the shop knows it). */
export async function deleteType(ext: string) {
  await prisma.protectedFileType.deleteMany({ where: { ext: ext.toLowerCase() } });
  return listTypes();
}

/* ---------------- Master files ---------------- */

const fileSelect = { id: true, name: true, ext: true, bytes: true, sha256: true, probe: true, createdAt: true, vaultFileId: true } as const;

const fileView = (f: { id: string; name: string; ext: string; bytes: number; sha256: string; probe: unknown; createdAt: Date; vaultFileId: string | null }, custom: FileTypeRule[]) => {
  const rule = ruleFor(f.ext, custom);
  return { id: f.id, name: f.name, ext: f.ext, bytes: f.bytes, sha256: f.sha256, createdAt: f.createdAt, type: rule.label, mode: rule.mode, storedIn: f.vaultFileId ? ("vault" as const) : ("database" as const), ...placementFor(rule, f.probe as Probe) };
};

export async function productProtected(productId: string, adminId?: string | null) {
  const [product, files, custom, counts] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { id: true, isProtected: true, licenceHours: true, licenceDownloads: true, licenceDevices: true } }),
    prisma.protectedFile.findMany({ where: { productId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: fileSelect }),
    customTypes(),
    prisma.licence.groupBy({ by: ["status"], where: { productId }, _count: { _all: true } }),
  ]);
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");
  const sold = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return {
    isProtected: product.isProtected,
    hours: product.licenceHours,
    downloads: product.licenceDownloads,
    devices: product.licenceDevices,
    defaults: { hours: DEFAULT_LICENCE_HOURS, downloads: DEFAULT_LICENCE_DOWNLOADS, devices: DEFAULT_LICENCE_DEVICES },
    /** With a vault, changing the files needs an open vault session. */
    vault: { on: vaultOn(), session: (() => { const v = vaultSessionFor(adminId); return v ? new Date(v.expiresAt).toISOString() : null; })() },
    files: files.map((f) => fileView(f, custom)),
    maxUploadMb: env.PROTECTED_MAX_UPLOAD_MB,
    sold: { active: sold("active"), revoked: sold("revoked") },
  };
}

export async function addMaster(input: { productId: string; name: string; data: Buffer; adminUserId?: string | null }) {
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");
  if (!input.data.length) throw new AppError(400, "NO_FILE", "Choose a file");
  const name = safeEntryName(input.name);
  const last = await prisma.protectedFile.aggregate({ where: { productId: input.productId }, _max: { position: true } });
  if (vaultOn()) {
    // Into the vault (the product's older files kept here go in with it, so a copy is made in one place).
    const session = await requireVaultSession(input.adminUserId);
    await moveLocalFilesToVault(session, { productId: input.productId });
    const meta = await vaultAddFile(session, input.productId, name, input.data);
    const row = await prisma.protectedFile.create({
      data: {
        productId: input.productId,
        name: meta.name,
        ext: meta.ext,
        bytes: meta.bytes,
        sha256: meta.sha256,
        dataEnc: null,
        vaultFileId: meta.id,
        probe: meta.probe as unknown as Prisma.InputJsonValue,
        position: (last._max.position ?? -1) + 1,
        createdById: input.adminUserId ?? null,
      },
      select: fileSelect,
    });
    return fileView(row, await customTypes());
  }
  const row = await prisma.protectedFile.create({
    data: {
      productId: input.productId,
      name,
      ext: extOf(name),
      bytes: input.data.length,
      sha256: crypto.createHash("sha256").update(input.data).digest("hex"),
      dataEnc: new Uint8Array(sealBytes(input.data)),
      probe: probeFile(input.data) as unknown as Prisma.InputJsonValue,
      position: (last._max.position ?? -1) + 1,
      createdById: input.adminUserId ?? null,
    },
    select: fileSelect,
  });
  return fileView(row, await customTypes());
}

export async function removeMaster(productId: string, fileId: string, adminUserId?: string | null) {
  const row = await prisma.protectedFile.findFirst({ where: { id: fileId, productId }, select: { id: true, vaultFileId: true } });
  if (!row) throw new AppError(404, "FILE_NOT_FOUND", "File not found");
  if (row.vaultFileId) await vaultRemoveFile(await requireVaultSession(adminUserId), row.vaultFileId);
  await prisma.protectedFile.delete({ where: { id: row.id } });
  return { ok: true };
}

/* ---------------- Licences: made, stopped, shown ---------------- */

type LicenceLine = { id: string; productId: string; quantity: number; product: { isProtected?: boolean | null; licenceHours?: number | null; licenceDownloads?: number | null } | null };

/**
 * One licence per piece of each protected line (the ones it has stay). Serials a
 * cancelled order lost come back when it's released again. Returns how many
 * were made or came back.
 */
export async function issueLicencesInTx(tx: Prisma.TransactionClient, orderId: string, lines: LicenceLine[]) {
  const mine = lines.filter((l) => l.product?.isProtected);
  if (!mine.length) return 0;
  const back = await tx.licence.updateMany({ where: { orderRequestId: orderId, status: "revoked", revokedReason: "order" }, data: { status: "active", revokedReason: null, revokedAt: null } });
  const have = await tx.licence.groupBy({ by: ["orderItemId"], where: { orderRequestId: orderId }, _count: { _all: true } });
  const count = new Map(have.map((h) => [h.orderItemId, h._count._all]));
  let made = back.count;
  for (const l of mine) {
    const missing = Math.max(0, l.quantity - (count.get(l.id) ?? 0));
    const hours = l.product?.licenceHours ?? DEFAULT_LICENCE_HOURS;
    for (let i = 0; i < missing; i++) {
      const serial = newSerial();
      await tx.licence.create({
        data: {
          productId: l.productId,
          orderRequestId: orderId,
          orderItemId: l.id,
          serialEnc: seal(serial),
          serialHash: serialHash(serial),
          last4: serialLast4(serial),
          markId: newMarkId(),
          expiresAt: new Date(Date.now() + hours * 3600_000),
          maxDownloads: l.product?.licenceDownloads ?? DEFAULT_LICENCE_DOWNLOADS,
        },
      });
      made++;
    }
  }
  return made;
}

/** The order was cancelled, rejected or refunded: its serials stop (they come back if it's released again). */
export async function revokeLicencesInTx(tx: Prisma.TransactionClient, orderId: string) {
  const r = await tx.licence.updateMany({ where: { orderRequestId: orderId, status: "active" }, data: { status: "revoked", revokedReason: "order", revokedAt: new Date() } });
  return r.count;
}

/** The buyer's private order page: her serials, the window and the downloads left. */
export async function licencesForOrder(orderId: string, now = new Date()) {
  const rows = await prisma.licence.findMany({
    where: { orderRequestId: orderId, status: "active" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      serialEnc: true,
      expiresAt: true,
      downloads: true,
      maxDownloads: true,
      product: { select: { title: true, licenceDevices: true, _count: { select: { protectedFiles: true } } } },
      _count: { select: { activations: { where: { status: "active" } } } },
    },
  });
  return rows.map((l) => ({
    id: l.id,
    title: l.product.title,
    serial: open(l.serialEnc),
    expiresAt: l.expiresAt,
    expired: l.expiresAt.getTime() <= now.getTime(),
    downloadsLeft: Math.max(0, l.maxDownloads - l.downloads),
    maxDownloads: l.maxDownloads,
    ready: l.product._count.protectedFiles > 0,
    /** PCs the launcher is activated on, and how many the serial allows. */
    devices: { used: l._count.activations, max: l.product.licenceDevices ?? DEFAULT_LICENCE_DEVICES },
  }));
}

/** The owner's view of an order's serials (the serial itself only on request). */
export async function orderLicences(orderId: string) {
  const rows = await prisma.licence.findMany({
    where: { orderRequestId: orderId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      productId: true,
      last4: true,
      status: true,
      revokedReason: true,
      expiresAt: true,
      downloads: true,
      maxDownloads: true,
      lastDownloadAt: true,
      createdAt: true,
      product: { select: { title: true, licenceDevices: true, _count: { select: { protectedFiles: true } } } },
      activations: { orderBy: { createdAt: "asc" }, select: { id: true, deviceName: true, status: true, appVersion: true, createdAt: true, lastSeenAt: true } },
    },
  });
  return rows.map(({ product, ...l }) => ({ ...l, title: product.title, ready: product._count.protectedFiles > 0, maxDevices: product.licenceDevices ?? DEFAULT_LICENCE_DEVICES }));
}

async function orderLicence(orderId: string, licenceId: string) {
  const l = await prisma.licence.findFirst({ where: { id: licenceId, orderRequestId: orderId }, include: { product: { select: { licenceHours: true, licenceDownloads: true } } } });
  if (!l) throw new AppError(404, "LICENCE_NOT_FOUND", "Serial not found on this order");
  return l;
}

export async function revealSerial(orderId: string, licenceId: string) {
  return { serial: open((await orderLicence(orderId, licenceId)).serialEnc) };
}

/** A fresh window and all the downloads again (she lost the file, the time ran out). */
export async function renewLicence(orderId: string, licenceId: string) {
  const l = await orderLicence(orderId, licenceId);
  const hours = l.product.licenceHours ?? DEFAULT_LICENCE_HOURS;
  await prisma.licence.update({ where: { id: l.id }, data: { expiresAt: new Date(Date.now() + hours * 3600_000), downloads: 0, maxDownloads: l.product.licenceDownloads ?? DEFAULT_LICENCE_DOWNLOADS } });
  return { ok: true };
}

/** The owner stops one serial (it was shared), or lets it work again. */
export async function setLicenceStopped(orderId: string, licenceId: string, stopped: boolean) {
  const l = await orderLicence(orderId, licenceId);
  await prisma.licence.update({
    where: { id: l.id },
    data: stopped ? { status: "revoked", revokedReason: "owner", revokedAt: new Date() } : { status: "active", revokedReason: null, revokedAt: null },
  });
  return { ok: true };
}

/* ---------------- The download ---------------- */

/** The buyer's copy: her marked files and LICENCE.txt, in a ZIP whose password is her serial. */
export async function buildPackage(licenceId: string) {
  const l = await prisma.licence.findUniqueOrThrow({
    where: { id: licenceId },
    select: { id: true, serialEnc: true, markId: true, createdAt: true, orderRequestId: true, product: { select: { id: true, title: true, slug: true } } },
  });
  const [files, custom] = await Promise.all([
    prisma.protectedFile.findMany({ where: { productId: l.product.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { name: true, ext: true, dataEnc: true, vaultFileId: true, probe: true } }),
    customTypes(),
  ]);
  if (!files.length) throw new AppError(409, "NOT_READY", "This product's files aren't uploaded yet");
  const base = { serial: open(l.serialEnc), markId: l.markId, orderShortId: shortId(l.orderRequestId), title: l.product.title, slug: l.product.slug, issuedAt: l.createdAt, customTypes: custom };
  const inVault = files.filter((f) => f.vaultFileId).length;
  if (inVault === files.length) return vaultPackage({ ...base, productId: l.product.id, licenceId: l.id });
  if (inVault) throw new AppError(409, "FILES_SPLIT", "Some of this product's files are in the vault and some aren't: open a vault session and move them in");
  return makePackage({ ...base, files: files.map((f) => ({ name: f.name, ext: f.ext, probe: f.probe as Probe, data: openBytes(f.dataEnc!) })) });
}

/**
 * One download from the order page: checks the order, the serial, the window and
 * the count; makes the copy; counts it (two clicks at once can't pass the limit).
 */
export async function downloadLicence(token: string, licenceId: string, meta: { ip?: string | null; userAgent?: string | null } = {}) {
  if (!token || token.length < 20 || token.length > 64) throw new AppError(404, "NOT_FOUND", "Order not found");
  const order = await prisma.orderRequest.findUnique({ where: { accessToken: token }, select: { id: true, status: true, deliveredAt: true } });
  if (!order) throw new AppError(404, "NOT_FOUND", "Order not found");
  if (CLOSED.has(order.status)) throw new AppError(410, "ORDER_CLOSED", "This order was cancelled");
  if (!order.deliveredAt) throw new AppError(409, "NOT_RELEASED", "Not ready yet");
  const l = await prisma.licence.findFirst({ where: { id: licenceId, orderRequestId: order.id } });
  if (!l) throw new AppError(404, "LICENCE_NOT_FOUND", "Serial not found");
  if (l.status !== "active") throw new AppError(410, "LICENCE_STOPPED", "This serial was stopped");
  if (l.expiresAt.getTime() <= Date.now()) throw new AppError(410, "LICENCE_EXPIRED", "The download window is over", { expiresAt: l.expiresAt });
  if (l.downloads >= l.maxDownloads) throw new AppError(429, "DOWNLOAD_LIMIT", `Up to ${l.maxDownloads} downloads`, { max: l.maxDownloads });
  const pkg = await buildPackage(l.id);
  const counted = await prisma.licence.updateMany({
    where: { id: l.id, status: "active", downloads: { lt: l.maxDownloads }, expiresAt: { gt: new Date() } },
    data: { downloads: { increment: 1 }, lastDownloadAt: new Date() },
  });
  if (!counted.count) throw new AppError(429, "DOWNLOAD_LIMIT", `Up to ${l.maxDownloads} downloads`, { max: l.maxDownloads });
  await prisma.licenceDownload.create({
    data: { licenceId: l.id, ipHash: meta.ip ? keyedHash(`ip:${meta.ip}`) : null, userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 200) : null },
  });
  return pkg;
}

/* ---------------- Leaks ---------------- */

/** A leaked file (or its text): whose copy was it? */
export async function traceLeak(data: Buffer) {
  const marks = findMarks(data);
  if (!marks.length) return { marks, found: [] };
  const rows = await prisma.licence.findMany({
    where: { markId: { in: marks } },
    select: {
      markId: true,
      status: true,
      downloads: true,
      createdAt: true,
      lastDownloadAt: true,
      product: { select: { id: true, title: true } },
      orderRequest: { select: { id: true, customerName: true, phone: true, createdAt: true } },
      log: { orderBy: { at: "desc" }, take: 5, select: { at: true, userAgent: true } },
    },
  });
  return {
    marks,
    found: rows.map((r) => ({
      markId: r.markId,
      status: r.status,
      downloads: r.downloads,
      issuedAt: r.createdAt,
      lastDownloadAt: r.lastDownloadAt,
      product: r.product,
      order: { id: r.orderRequest.id, shortId: shortId(r.orderRequest.id), customerName: r.orderRequest.customerName, phone: r.orderRequest.phone, createdAt: r.orderRequest.createdAt },
      recent: r.log,
    })),
  };
}
