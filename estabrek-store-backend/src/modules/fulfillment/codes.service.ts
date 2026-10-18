/**
 * Codes sold one per piece (admin → المنتج → الأكواد): game keys, gift cards,
 * licences the owner bought and uploads as a list. Each is stored encrypted
 * (lib/secretBox.ts) with a keyed hash so the same code can't be added twice.
 *   - A size's stock is the number of its codes still available (so the shop
 *     sells out with the last code, and "stock below N" alerts work as usual).
 *   - When an order is paid or accepted (releaseOrderInTx), each piece takes one
 *     code; two orders can never take the same one (row locks, SKIP LOCKED).
 *   - The shopper sees them on her private order page; the first view is noted.
 *   - If the order is cancelled, codes she never saw go back to the list; seen
 *     ones stay with the order (the owner decides what to do with them).
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import { keyedHash, open, seal } from "../../lib/secretBox.js";

type Db = Prisma.TransactionClient | typeof prisma;

export const MAX_UPLOAD = 5000;
const MIN_LEN = 4;
const MAX_LEN = 200;

/**
 * A pasted list or a CSV → the codes: one per line (or the first column), blank
 * lines and a header row ("code", "key", "serial") skipped, repeats within the
 * list dropped.
 */
export function parseCodeList(text: string) {
  const codes: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let repeated = 0;
  const lines = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/);
  lines.forEach((line, i) => {
    let v = line.split(/[,;\t]/)[0]?.trim() ?? "";
    v = v.replace(/^"(.*)"$/, "$1").trim();
    if (!v) return;
    if (i === 0 && /^(code|codes|key|keys|serial|serials|كود|الكود)$/i.test(v)) return;
    if (v.length < MIN_LEN || v.length > MAX_LEN || /[\u0000-\u001f]/.test(v)) {
      invalid.push(v.slice(0, 40));
      return;
    }
    const k = v.replace(/\s+/g, "").toUpperCase();
    if (seen.has(k)) {
      repeated += 1;
      return;
    }
    seen.add(k);
    codes.push(v);
  });
  return { codes, invalid, repeated };
}

/** "ABCD-EFGH-1234" → "1234" (what the admin shows). */
export const last4Of = (code: string) => code.replace(/[\s-]/g, "").slice(-4).toUpperCase();

/** The sizes using codes: stock = codes still available. */
export async function syncCodeStock(db: Db, variantIds: string[]) {
  const ids = [...new Set(variantIds)];
  if (!ids.length) return;
  const counts = await db.digitalCode.groupBy({ by: ["variantId"], where: { variantId: { in: ids }, status: "available" }, _count: { _all: true } });
  const by = new Map(counts.map((c) => [c.variantId, c._count._all]));
  for (const id of ids) await db.productVariant.update({ where: { id }, data: { stock: by.get(id) ?? 0 } });
}

/** Which of these sizes sell codes. */
export async function variantsWithCodes(db: Db, variantIds: string[]) {
  if (!variantIds.length) return new Set<string>();
  const rows = await db.digitalCode.findMany({ where: { variantId: { in: variantIds } }, select: { variantId: true }, distinct: ["variantId"] });
  return new Set(rows.map((r) => r.variantId));
}

export async function importCodes(input: { productId: string; variantId: string; text: string; batch?: string | null; adminUserId?: string | null }) {
  const variant = await prisma.productVariant.findFirst({ where: { id: input.variantId, item: { productId: input.productId } }, select: { id: true } });
  if (!variant) throw new AppError(404, "VARIANT_NOT_FOUND", "This size isn't part of the product");
  const { codes, invalid, repeated } = parseCodeList(input.text);
  if (codes.length > MAX_UPLOAD) throw new AppError(400, "TOO_MANY_CODES", `At most ${MAX_UPLOAD} at a time`);
  const rows = codes.map((c) => ({ code: c, hash: keyedHash(c) }));
  // Already here (on any product): skipped.
  const existing = new Set<string>();
  for (let i = 0; i < rows.length; i += 500) {
    const part = rows.slice(i, i + 500).map((r) => r.hash);
    for (const e of await prisma.digitalCode.findMany({ where: { codeHash: { in: part } }, select: { codeHash: true } })) existing.add(e.codeHash);
  }
  const fresh = rows.filter((r) => !existing.has(r.hash));
  const batch = input.batch?.trim().slice(0, 80) || null;
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < fresh.length; i += 500) {
      await tx.digitalCode.createMany({
        data: fresh.slice(i, i + 500).map((r) => ({
          productId: input.productId,
          variantId: input.variantId,
          codeEnc: seal(r.code),
          codeHash: r.hash,
          last4: last4Of(r.code),
          batch,
          createdById: input.adminUserId ?? null,
        })),
        skipDuplicates: true,
      });
    }
    await syncCodeStock(tx, [input.variantId]);
  });
  const available = await prisma.digitalCode.count({ where: { variantId: input.variantId, status: "available" } });
  return { added: fresh.length, duplicates: existing.size + repeated, invalid: invalid.length, invalidExamples: invalid.slice(0, 5), available };
}

/** Per size: how many are available, handed out, voided; and the latest codes (without the code). */
export async function codeSummary(productId: string, opts: { status?: string | null; take?: number; skip?: number } = {}) {
  const [variants, counts, rows, total] = await Promise.all([
    prisma.productVariant.findMany({
      where: { item: { productId } },
      select: { id: true, sku: true, size: { select: { name: true } }, item: { select: { colorName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.digitalCode.groupBy({ by: ["variantId", "status"], where: { productId }, _count: { _all: true } }),
    prisma.digitalCode.findMany({
      where: { productId, ...(opts.status ? { status: opts.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: Math.min(200, opts.take ?? 50),
      skip: opts.skip ?? 0,
      select: { id: true, variantId: true, last4: true, status: true, batch: true, orderRequestId: true, deliveredAt: true, viewedAt: true, createdAt: true },
    }),
    prisma.digitalCode.count({ where: { productId, ...(opts.status ? { status: opts.status } : {}) } }),
  ]);
  const by = (v: string, s: string) => counts.find((c) => c.variantId === v && c.status === s)?._count._all ?? 0;
  return {
    variants: variants.map((v) => ({ id: v.id, sku: v.sku, color: v.item.colorName, size: v.size.name, available: by(v.id, "available"), delivered: by(v.id, "delivered"), void: by(v.id, "void") })),
    codes: rows,
    total,
  };
}

/** A code taken out (a wrong or used one). Handed-out ones can be voided too, for the record. */
export async function voidCode(productId: string, id: string) {
  const c = await prisma.digitalCode.findFirst({ where: { id, productId }, select: { id: true, variantId: true, status: true } });
  if (!c) throw new AppError(404, "CODE_NOT_FOUND");
  if (c.status === "void") return { ok: true };
  await prisma.$transaction(async (tx) => {
    await tx.digitalCode.update({ where: { id }, data: { status: "void" } });
    await syncCodeStock(tx, [c.variantId]);
  });
  return { ok: true };
}

/** The whole code, for the owner (support, checking a supplier's list). */
export async function revealCode(productId: string, id: string) {
  const c = await prisma.digitalCode.findFirst({ where: { id, productId }, select: { codeEnc: true } });
  if (!c) throw new AppError(404, "CODE_NOT_FOUND");
  return { code: open(c.codeEnc) };
}

/**
 * An order's codes: each piece of a size that sells codes takes one (the ones it
 * has already stay). Returns what's still missing per order line.
 */
export async function assignCodesInTx(tx: Prisma.TransactionClient, orderId: string, lines: Array<{ id: string; variantId: string; quantity: number }>) {
  const withCodes = await variantsWithCodes(
    tx,
    lines.map((l) => l.variantId),
  );
  const short: Array<{ orderItemId: string; missing: number }> = [];
  const touched: string[] = [];
  for (const l of lines) {
    if (!withCodes.has(l.variantId)) continue;
    // A voided one (a bad code) is replaced the next time the order is released.
    const have = await tx.digitalCode.count({ where: { orderItemId: l.id, status: "delivered" } });
    const need = Math.max(0, l.quantity - have);
    if (!need) continue;
    const got = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "DigitalCode" SET "status" = 'delivered', "orderRequestId" = ${orderId}, "orderItemId" = ${l.id}, "deliveredAt" = NOW()
      WHERE "id" IN (
        SELECT "id" FROM "DigitalCode" WHERE "variantId" = ${l.variantId} AND "status" = 'available'
        ORDER BY "createdAt", "id" LIMIT ${need} FOR UPDATE SKIP LOCKED
      )
      RETURNING "id"`;
    touched.push(l.variantId);
    if (got.length < need) short.push({ orderItemId: l.id, missing: need - got.length });
  }
  if (touched.length) await syncCodeStock(tx, touched);
  return { short };
}

/** Cancelled before she looked: those codes go back to the list. */
export async function returnUnseenCodesInTx(tx: Prisma.TransactionClient, orderId: string) {
  const rows = await tx.digitalCode.findMany({ where: { orderRequestId: orderId, status: "delivered", viewedAt: null }, select: { id: true, variantId: true } });
  if (!rows.length) return 0;
  await tx.digitalCode.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { status: "available", orderRequestId: null, orderItemId: null, deliveredAt: null } });
  await syncCodeStock(
    tx,
    rows.map((r) => r.variantId),
  );
  return rows.length;
}

/** The private order page: her codes (the first time they're shown is noted). */
export async function codesForOrder(orderId: string) {
  const rows = await prisma.digitalCode.findMany({
    where: { orderRequestId: orderId, status: "delivered" },
    orderBy: { deliveredAt: "asc" },
    select: { id: true, codeEnc: true, viewedAt: true, orderItemId: true, product: { select: { title: true, redeemNote: true } } },
  });
  const unseen = rows.filter((r) => !r.viewedAt).map((r) => r.id);
  if (unseen.length) await prisma.digitalCode.updateMany({ where: { id: { in: unseen } }, data: { viewedAt: new Date() } });
  return rows.map((r) => ({ code: open(r.codeEnc), title: r.product.title, redeemNote: r.product.redeemNote, orderItemId: r.orderItemId }));
}
