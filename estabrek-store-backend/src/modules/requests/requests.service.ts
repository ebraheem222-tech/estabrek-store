/**
 * Shopper requests: «اطلبي قطعتكِ» (a size / colour / new piece the shop
 * doesn't carry, with up to a few photos) and «بدي حدا يحكيني» (call me back,
 * from Razan's guided ordering). Photos are private: re-encoded (no location
 * data), kept in Cloudinary as authenticated images, shown to the admin by
 * short-lived links, and deleted after the owner's number of days.
 */
import crypto from "node:crypto";
import { Readable } from "node:stream";
import sharp from "sharp";
import type { Prisma, RequestKind, RequestStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { getCloudinary, isCloudinaryEnabled } from "../../lib/cloudinary.js";
import { AppError } from "../../utils/httpError.js";
import { emailConfigured, sendEmail } from "../outbox/sender/email.js";
import { razanOf } from "../razan/razan.settings.js";
import { requestsOf } from "./requests.settings.js";

export type RequestPhoto = { location: string; bytes: number; width?: number; height?: number };

/* ---------------- Photo storage ---------------- */

export type PhotoStorage = {
  ready: () => boolean;
  put: (data: Buffer) => Promise<{ location: string }>;
  remove: (location: string) => Promise<void>;
  link: (location: string) => Promise<string>;
};

const FOLDER = "estabrek-requests";

export const cloudinaryPhotos: PhotoStorage = {
  ready: () => isCloudinaryEnabled(),
  put: (data) =>
    new Promise((resolve, reject) => {
      const cld = getCloudinary();
      if (!cld) return reject(new AppError(503, "STORAGE_NOT_READY", "Cloudinary isn't set up"));
      const up = cld.uploader.upload_stream(
        { resource_type: "image", type: "authenticated", folder: FOLDER, public_id: crypto.randomBytes(10).toString("hex"), overwrite: false, format: "webp" },
        (err, res) => (err || !res ? reject(err ?? new Error("UPLOAD_FAILED")) : resolve({ location: res.public_id })),
      );
      Readable.from(data).pipe(up);
    }),
  remove: async (location) => {
    const cld = getCloudinary();
    if (cld) await cld.uploader.destroy(location, { resource_type: "image", type: "authenticated", invalidate: true });
  },
  link: async (location) => {
    const cld = getCloudinary();
    if (!cld) throw new AppError(503, "STORAGE_NOT_READY", "Cloudinary isn't set up");
    return cld.utils.private_download_url(location, "webp", { resource_type: "image", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 10 * 60 });
  },
};

let photos: PhotoStorage = cloudinaryPhotos;
export const photoStorage = () => photos;
/** Tests only. */
export function setPhotoStorage(s: PhotoStorage) {
  photos = s;
}

/** Any phone photo → a plain webp of at most 1600 px: no location or camera data is kept. */
async function cleanPhoto(buf: Buffer) {
  try {
    const img = sharp(buf, { failOnError: false }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
    const { data, info } = await img.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new AppError(400, "BAD_PHOTO", "This photo can't be read");
  }
}

/* ---------------- Creating a request ---------------- */

export type NewRequest = {
  kind: RequestKind;
  name: string;
  phone: string;
  email?: string | null;
  productId?: string | null;
  variantId?: string | null;
  wantedSize?: string | null;
  wantedColor?: string | null;
  details?: string | null;
  source?: string | null;
};

const perIp = new Map<string, number[]>();
const IP_PER_HOUR = 10;

function ipAllowed(ip: string | null | undefined) {
  if (!ip) return true;
  const now = Date.now();
  const list = (perIp.get(ip) ?? []).filter((t) => t > now - 3600_000);
  if (list.length >= IP_PER_HOUR) return false;
  list.push(now);
  if (perIp.size > 20_000) perIp.clear();
  perIp.set(ip, list);
  return true;
}

const phoneCore = (raw: string) => raw.replace(/\D/g, "").replace(/^(00)?(972|970)/, "").replace(/^0/, "");

export async function createRequest(input: NewRequest, files: Buffer[], ip?: string | null) {
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  const cfg = requestsOf(s?.header);
  if (input.kind === "CALLBACK") {
    if (!razanOf(s?.header).helpOrder.enabled) throw new AppError(404, "FEATURE_OFF", "This isn't available");
  } else {
    if (!cfg.enabled) throw new AppError(404, "FEATURE_OFF", "This isn't available");
    const allowed = { SIZE: cfg.kinds.size, COLOR: cfg.kinds.color, NEW_PIECE: cfg.kinds.newPiece }[input.kind];
    if (!allowed) throw new AppError(400, "KIND_OFF", "This kind of request isn't taken");
  }
  if (phoneCore(input.phone).length < 7) throw new AppError(400, "BAD_PHONE", "Phone number looks wrong");
  if (!ipAllowed(ip)) throw new AppError(429, "TOO_MANY_REQUESTS", "Too many requests, try later");
  const core = phoneCore(input.phone);
  const today = await prisma.customerRequest.count({ where: { phone: { contains: core }, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } });
  if (today >= cfg.perPhoneDay) throw new AppError(429, "TOO_MANY_REQUESTS", "Too many requests from this number today");

  // The piece she was on (ignored if it doesn't exist).
  let productId: string | null = null;
  let variantId: string | null = null;
  if (input.productId) {
    const p = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
    productId = p?.id ?? null;
  }
  if (input.variantId && productId) {
    const v = await prisma.productVariant.findFirst({ where: { id: input.variantId, item: { productId } }, select: { id: true } });
    variantId = v?.id ?? null;
  }

  const want = input.kind === "CALLBACK" ? 0 : Math.min(cfg.maxPhotos, files.length);
  if (want && !photos.ready()) throw new AppError(503, "STORAGE_NOT_READY", "Photos can't be saved right now");
  const saved: RequestPhoto[] = [];
  try {
    for (const f of files.slice(0, want)) {
      const clean = await cleanPhoto(f);
      const put = await photos.put(clean.data);
      saved.push({ location: put.location, bytes: clean.data.length, width: clean.width, height: clean.height });
    }
  } catch (e) {
    await Promise.all(saved.map((p) => photos.remove(p.location).catch(() => undefined)));
    throw e;
  }

  return prisma.customerRequest.create({
    data: {
      kind: input.kind,
      name: input.name.trim().slice(0, 120),
      phone: input.phone.trim().slice(0, 40),
      email: input.email?.trim().toLowerCase() || null,
      productId,
      variantId,
      wantedSize: input.wantedSize?.trim().slice(0, 40) || null,
      wantedColor: input.wantedColor?.trim().slice(0, 60) || null,
      details: input.details?.trim().slice(0, 1000) || null,
      photos: saved as unknown as Prisma.InputJsonValue,
      source: input.source?.trim().slice(0, 40) || null,
      ip: ip ?? null,
    },
    select: { id: true, kind: true, status: true, createdAt: true },
  });
}

/* ---------------- Admin ---------------- */

export const KIND_LABEL: Record<RequestKind, string> = { SIZE: "مقاس", COLOR: "لون", NEW_PIECE: "قطعة جديدة", CALLBACK: "اتصلوا فيي" };

export async function photoLinks(list: unknown) {
  const arr = Array.isArray(list) ? (list as RequestPhoto[]) : [];
  return Promise.all(arr.map(async (p) => ({ url: await photos.link(p.location).catch(() => null), width: p.width ?? null, height: p.height ?? null })));
}

export function storefrontLink(path: string) {
  const base = (env.STOREFRONT_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}${path}` : null;
}

/** Tells her the piece is here (email when she left one); the admin also gets a WhatsApp text. */
export async function notifyFound(id: string) {
  const r = await prisma.customerRequest.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, linkedProduct: { select: { title: true, slug: true } } },
  });
  if (!r) throw new AppError(404, "NOT_FOUND", "Request not found");
  if (!r.linkedProduct) throw new AppError(409, "NO_PRODUCT", "Choose the product first");
  const url = storefrontLink(`/p/${encodeURIComponent(r.linkedProduct.slug)}`);
  const first = r.name.trim().split(/\s+/)[0] ?? "";
  const text = `أهلاً ${first} 🌸\nلقينا اللي طلبتيه: ${r.linkedProduct.title}${url ? `\n${url}` : ""}\nالكمية قليلة، فإذا عجبتكِ لا تتأخري.`;
  let emailed = false;
  if (r.email && url) {
    const res = await sendEmail({
      to: r.email,
      template: "REQUEST_FOUND",
      payload: { name: first, productTitle: r.linkedProduct.title, url },
      idempotencyKey: `request-found-${r.id}-${r.linkedProduct.slug}`,
    });
    emailed = res.ok && emailConfigured();
  }
  await prisma.customerRequest.update({ where: { id: r.id }, data: { notifiedAt: new Date(), status: "FOUND" } });
  return { whatsappText: text, phone: r.phone, emailed };
}

/** What shoppers ask for most (last 30 days). */
export async function requestDemand() {
  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const where = { createdAt: { gte: since }, kind: { not: "CALLBACK" as RequestKind } };
  const [byKind, sizes, colors, products, open] = await Promise.all([
    prisma.customerRequest.groupBy({ by: ["kind"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.customerRequest.groupBy({ by: ["wantedSize"], where: { ...where, wantedSize: { not: null } }, _count: { _all: true }, orderBy: { _count: { wantedSize: "desc" } }, take: 8 }),
    prisma.customerRequest.groupBy({ by: ["wantedColor"], where: { ...where, wantedColor: { not: null } }, _count: { _all: true }, orderBy: { _count: { wantedColor: "desc" } }, take: 8 }),
    prisma.customerRequest.groupBy({ by: ["productId"], where: { ...where, productId: { not: null } }, _count: { _all: true }, orderBy: { _count: { productId: "desc" } }, take: 8 }),
    prisma.customerRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const titles = await prisma.product.findMany({ where: { id: { in: products.map((p) => p.productId!).filter(Boolean) } }, select: { id: true, title: true, slug: true } });
  const byId = new Map(titles.map((t) => [t.id, t]));
  return {
    byKind: Object.fromEntries(byKind.map((k) => [k.kind, k._count._all])),
    status: Object.fromEntries(open.map((k) => [k.status, k._count._all])) as Partial<Record<RequestStatus, number>>,
    sizes: sizes.map((x) => ({ value: x.wantedSize!, count: x._count._all })),
    colors: colors.map((x) => ({ value: x.wantedColor!, count: x._count._all })),
    products: products.filter((x) => byId.has(x.productId!)).map((x) => ({ ...byId.get(x.productId!)!, count: x._count._all })),
  };
}

/* ---------------- Old photos are deleted ---------------- */

export async function purgeOldPhotos(now = new Date()) {
  const s = await prisma.siteSettings.findFirst({ select: { header: true } });
  const days = requestsOf(s?.header).photoDays;
  const old = await prisma.customerRequest.findMany({
    where: { photosDeletedAt: null, createdAt: { lt: new Date(now.getTime() - days * 24 * 3600_000) }, NOT: { photos: { equals: [] } } },
    select: { id: true, photos: true },
    take: 200,
  });
  let removed = 0;
  for (const r of old) {
    for (const p of (Array.isArray(r.photos) ? r.photos : []) as RequestPhoto[]) {
      await photos.remove(p.location).catch(() => undefined);
      removed++;
    }
    await prisma.customerRequest.update({ where: { id: r.id }, data: { photos: [], photosDeletedAt: now } });
  }
  return { requests: old.length, photos: removed };
}

let timer: NodeJS.Timeout | undefined;
export function startRequestPhotoCleanup() {
  if (env.NODE_ENV === "test" || timer) return;
  const run = () => void purgeOldPhotos().catch((e) => console.error("[requests] photo cleanup failed:", (e as Error)?.message));
  setTimeout(run, 2 * 60_000).unref?.();
  timer = setInterval(run, 6 * 3600_000);
  timer.unref?.();
}
