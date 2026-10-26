/**
 * Licences for the Windows launcher (phase 4, estabrek-launcher):
 *   - activate: the serial + the PC's fingerprint hash (made on the PC; its
 *     identifiers never leave it). Within the product's PC limit (default 1) it
 *     gets a licence signed for that PC (licenceToken.ts): by the vault when there
 *     is one, else by the backend's own key.
 *   - check: the launcher asks again every few days; a stopped serial, a cancelled
 *     order or a PC the owner freed stops working there.
 * The owner sees each serial's PCs on the order and can free one (the buyer
 * changed PC). Public calls are rate-limited per address.
 */
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/httpError.js";
import { keyedHash } from "../../lib/secretBox.js";
import { normalizeSerial } from "./marks.js";
import { keyFromSeed, signToken, verifyToken, type LicencePayload, type PublicKeyInfo, type SigningKey } from "./licenceToken.js";
import { vaultOn, vaultPublicKeys, vaultSign } from "../vault/vaultClient.js";
import { DEFAULT_LICENCE_DEVICES } from "./protected.service.js";

const CLOSED = new Set(["REJECTED", "CANCELED", "REFUNDED"]);
/** The launcher checks online at least this often; offline it keeps working this many days more. */
export const CHECK_EVERY_DAYS = 7;
export const OFFLINE_GRACE_DAYS = 14;
const serialHash = (serial: string) => keyedHash(`licence:${normalizeSerial(serial)}`);

/* ---------------- Keys ---------------- */

let local: { seed: string; key: SigningKey } | null = null;
function localKey() {
  const seed = env.LICENCE_SIGNING_SEED ?? `jwt:${env.JWT_SECRET}`;
  if (!local || local.seed !== seed) local = { seed, key: keyFromSeed(seed) };
  return local.key;
}

let vaultKeys: { at: number; keys: PublicKeyInfo[] } | null = null;

/** Every key a launcher may meet: the one signing now first (vault or local), then the other. */
export async function publicKeys(): Promise<PublicKeyInfo[]> {
  const mine = [localKey().info];
  if (!vaultOn()) return mine;
  if (!vaultKeys || Date.now() - vaultKeys.at > 10 * 60_000) {
    try {
      vaultKeys = { at: Date.now(), keys: await vaultPublicKeys() };
    } catch {
      if (!vaultKeys) return mine;
    }
  }
  return [...vaultKeys.keys, ...mine.filter((k) => !vaultKeys!.keys.some((v) => v.kid === k.kid))];
}

async function sign(payload: LicencePayload) {
  return vaultOn() ? vaultSign(payload as unknown as Record<string, unknown>) : signToken(payload as unknown as Record<string, unknown>, localKey());
}

/* ---------------- Rate limits ---------------- */

const hits = new Map<string, number[]>();
function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new AppError(429, "TOO_MANY_TRIES", "Too many tries: wait a little");
  list.push(now);
  hits.set(key, list);
  if (hits.size > 20_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
}
/** Tests: start the counters again. */
export const resetLimitsForTests = () => hits.clear();

/* ---------------- Activate / check ---------------- */

const DEVICE = /^[0-9a-f]{64}$/;

function payloadFor(l: { id: string; productId: string; markId: string; product: { title: string } }, activationId: string, deviceHash: string): LicencePayload {
  const now = Math.floor(Date.now() / 1000);
  return { v: 1, lic: l.id, act: activationId, prod: l.productId, title: l.product.title, mark: l.markId, dev: deviceHash, iat: now, chk: now + CHECK_EVERY_DAYS * 86400 };
}

const answer = async (l: Parameters<typeof payloadFor>[0] & { product: { title: string; licenceDevices: number | null } }, activationId: string, deviceHash: string) => {
  const used = await prisma.activation.count({ where: { licenceId: l.id, status: "active" } });
  return {
    token: await sign(payloadFor(l, activationId, deviceHash)),
    product: { id: l.productId, title: l.product.title },
    devices: { used, max: l.product.licenceDevices ?? DEFAULT_LICENCE_DEVICES },
    checkEveryDays: CHECK_EVERY_DAYS,
    offlineGraceDays: OFFLINE_GRACE_DAYS,
  };
};

export async function activate(input: { serial: string; deviceHash: string; deviceName?: string | null; appVersion?: string | null }, meta: { ip?: string | null } = {}) {
  const ip = meta.ip ?? "unknown";
  limit(`act:${ip}`, 30, 60 * 60_000);
  const device = String(input.deviceHash ?? "").toLowerCase();
  if (!DEVICE.test(device)) throw new AppError(400, "BAD_DEVICE", "The launcher sent no PC fingerprint");
  const l = await prisma.licence.findUnique({
    where: { serialHash: serialHash(input.serial) },
    select: { id: true, productId: true, markId: true, status: true, orderRequest: { select: { status: true } }, product: { select: { title: true, licenceDevices: true } } },
  });
  if (!l) {
    // Wrong serials count more: guessing one has to stay slow.
    limit(`bad:${ip}`, 10, 60 * 60_000);
    throw new AppError(404, "SERIAL_NOT_FOUND", "This serial isn't ours");
  }
  if (l.status !== "active") throw new AppError(403, "LICENCE_STOPPED", "This serial was stopped");
  if (CLOSED.has(l.orderRequest.status)) throw new AppError(403, "ORDER_CLOSED", "This order was cancelled");

  const name = input.deviceName ? String(input.deviceName).slice(0, 60) : null;
  const version = input.appVersion ? String(input.appVersion).slice(0, 20) : null;
  const ipHash = meta.ip ? keyedHash(`ip:${meta.ip}`) : null;
  const max = l.product.licenceDevices ?? DEFAULT_LICENCE_DEVICES;

  const act = await prisma.$transaction(async (tx) => {
    // One at a time per serial: two PCs activating together can't both pass the limit.
    await tx.$executeRaw`SELECT 1 FROM "Licence" WHERE "id" = ${l.id} FOR UPDATE`;
    const mine = await tx.activation.findUnique({ where: { licenceId_deviceHash: { licenceId: l.id, deviceHash: device } } });
    if (mine?.status === "active") {
      return tx.activation.update({ where: { id: mine.id }, data: { lastSeenAt: new Date(), deviceName: name ?? mine.deviceName, appVersion: version ?? mine.appVersion, ipHash } });
    }
    const used = await tx.activation.count({ where: { licenceId: l.id, status: "active" } });
    if (used >= max) throw new AppError(403, "DEVICE_LIMIT", `This serial is already on ${max} PC(s)`, { max });
    if (mine) return tx.activation.update({ where: { id: mine.id }, data: { status: "active", resetAt: null, lastSeenAt: new Date(), deviceName: name, appVersion: version, ipHash } });
    return tx.activation.create({ data: { licenceId: l.id, deviceHash: device, deviceName: name, appVersion: version, ipHash } });
  });
  return answer(l, act.id, device);
}

/** The launcher's periodic check: still allowed on this PC? A fresh licence if so. */
export async function checkLicence(input: { token: string; deviceHash: string }, meta: { ip?: string | null } = {}) {
  limit(`chk:${meta.ip ?? "unknown"}`, 240, 60 * 60_000);
  const p = verifyToken<LicencePayload>(input.token, await publicKeys());
  if (!p || p.v !== 1) throw new AppError(401, "BAD_LICENCE", "This licence isn't ours");
  if (String(input.deviceHash ?? "").toLowerCase() !== p.dev) throw new AppError(403, "OTHER_PC", "This licence is for another PC");
  const act = await prisma.activation.findUnique({
    where: { id: p.act },
    select: { id: true, status: true, licence: { select: { id: true, productId: true, markId: true, status: true, orderRequest: { select: { status: true } }, product: { select: { title: true, licenceDevices: true } } } } },
  });
  if (!act || act.licence.id !== p.lic) throw new AppError(403, "DEVICE_RESET", "This PC was removed from the serial");
  if (act.status !== "active") throw new AppError(403, "DEVICE_RESET", "This PC was removed from the serial");
  if (act.licence.status !== "active") throw new AppError(403, "LICENCE_STOPPED", "This serial was stopped");
  if (CLOSED.has(act.licence.orderRequest.status)) throw new AppError(403, "ORDER_CLOSED", "This order was cancelled");
  await prisma.activation.update({ where: { id: act.id }, data: { lastSeenAt: new Date() } });
  return answer(act.licence, act.id, p.dev);
}

/* ---------------- The owner ---------------- */

export async function activationsFor(licenceIds: string[]) {
  if (!licenceIds.length) return new Map<string, Array<{ id: string; deviceName: string | null; status: string; createdAt: Date; lastSeenAt: Date; appVersion: string | null }>>();
  const rows = await prisma.activation.findMany({
    where: { licenceId: { in: licenceIds } },
    orderBy: { createdAt: "asc" },
    select: { id: true, licenceId: true, deviceName: true, status: true, createdAt: true, lastSeenAt: true, appVersion: true },
  });
  const by = new Map<string, Array<Omit<(typeof rows)[number], "licenceId">>>();
  for (const { licenceId, ...r } of rows) by.set(licenceId, [...(by.get(licenceId) ?? []), r]);
  return by;
}

/** Frees a PC (she changed computers): the launcher there stops at its next check. */
export async function resetActivation(orderId: string, licenceId: string, activationId: string) {
  const a = await prisma.activation.findFirst({ where: { id: activationId, licenceId, licence: { orderRequestId: orderId } }, select: { id: true } });
  if (!a) throw new AppError(404, "ACTIVATION_NOT_FOUND", "PC not found on this serial");
  await prisma.activation.update({ where: { id: a.id }, data: { status: "reset", resetAt: new Date() } });
  return { ok: true };
}
