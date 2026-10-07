import { createHash, randomBytes, randomInt } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { env } from "../../config/env.js";
import { signCustomerToken } from "../../config/security.js";
import { policy } from "../../lib/securityPolicy.js";
import { sendEmail } from "../outbox/sender/email.js";

/**
 * Shopper accounts: sign in with a 6-digit code sent by email (no password),
 * then profile, orders, favourites and addresses. Buying as a guest still works.
 */

const SESSION_DAYS = 60;
const CODES_PER_15_MIN = 5;
const fail = (status: number, code: string, message: string) => new AppError(status, code, message);
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const b64url = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/* ============================== Sign in ============================== */

/** Sends a sign-in code. Always answers the same way (doesn't reveal who has an account). */
export async function startLogin(emailRaw: string, ctx: { ip?: string }) {
  const email = normalizeEmail(emailRaw);
  const recent = await prisma.customerOtp.count({ where: { email, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } });
  if (recent >= CODES_PER_15_MIN) throw fail(429, "TOO_MANY_CODES", "Too many codes requested; try again in a few minutes");

  const user = await prisma.user.findUnique({ where: { email }, select: { status: true } });
  const minutes = policy().otp.ttlMinutes;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Older codes for this email stop working.
  await prisma.customerOtp.updateMany({ where: { email, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.customerOtp.create({
    data: { email, codeHash: await argon2.hash(code, { type: argon2.argon2id }), expiresAt: new Date(Date.now() + minutes * 60_000), ip: ctx.ip },
  });
  // A suspended account gets no code (and the answer looks the same).
  if (user?.status !== "SUSPENDED") {
    await sendEmail({ to: email, template: "CUSTOMER_LOGIN_CODE", payload: { code, minutes } });
  }
  return { ok: true as const, minutes, ...(env.NODE_ENV !== "production" ? { devCode: code } : {}) };
}

async function newSession(userId: string, ctx: { ip?: string; ua?: string }) {
  const refreshToken = b64url(randomBytes(32));
  await prisma.customerSession.create({
    data: {
      userId,
      refreshTokenHash: sha256(refreshToken),
      ip: ctx.ip,
      userAgent: ctx.ua?.slice(0, 300),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
    },
  });
  return { accessToken: signCustomerToken(userId, policy().session.accessMinutes), refreshToken, refreshExpiresInDays: SESSION_DAYS };
}

export async function verifyLogin(emailRaw: string, code: string, ctx: { ip?: string; ua?: string }) {
  const email = normalizeEmail(emailRaw);
  const otp = await prisma.customerOtp.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw fail(401, "CODE_EXPIRED", "The code expired; ask for a new one");
  if (otp.attempts >= policy().otp.maxAttempts) throw fail(429, "TOO_MANY_ATTEMPTS", "Too many wrong codes; ask for a new one");
  const ok = await argon2.verify(otp.codeHash, code.trim()).catch(() => false);
  if (!ok) {
    await prisma.customerOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw fail(401, "WRONG_CODE", "Wrong code");
  }
  await prisma.customerOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.status === "SUSPENDED") throw fail(403, "ACCOUNT_SUSPENDED", "This account is turned off");
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date(), emailVerifiedAt: existing.emailVerifiedAt ?? new Date() },
      })
    : await prisma.user.create({ data: { email, name: "", emailVerifiedAt: new Date(), lastLoginAt: new Date() } });

  const tokens = await newSession(user.id, ctx);
  return { ...tokens, user: toMe(user), isNew: !existing };
}

export async function refreshLogin(refreshToken: string, ctx: { ip?: string; ua?: string }) {
  const session = await prisma.customerSession.findUnique({
    where: { refreshTokenHash: sha256(refreshToken) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) throw fail(401, "SESSION_EXPIRED", "Please sign in again");
  if (session.user.status === "SUSPENDED") throw fail(403, "ACCOUNT_SUSPENDED", "This account is turned off");
  // Rotate: the old refresh token stops working.
  const next = b64url(randomBytes(32));
  await prisma.customerSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: sha256(next),
      ip: ctx.ip,
      userAgent: ctx.ua?.slice(0, 300),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
    },
  });
  return {
    accessToken: signCustomerToken(session.userId, policy().session.accessMinutes),
    refreshToken: next,
    refreshExpiresInDays: SESSION_DAYS,
    user: toMe(session.user),
  };
}

export async function logoutLogin(refreshToken: string) {
  await prisma.customerSession.updateMany({
    where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { ok: true as const };
}

/* ============================== Me ============================== */

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  preferredSize: string | null;
  favoriteColor: string | null;
  marketingOptIn: boolean;
  createdAt: Date;
};

export function toMe(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    preferredSize: u.preferredSize,
    favoriteColor: u.favoriteColor,
    marketingOptIn: u.marketingOptIn,
    createdAt: u.createdAt,
  };
}

async function activeUser(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) throw fail(401, "ACCOUNT_NOT_FOUND", "Please sign in again");
  if (u.status === "SUSPENDED") throw fail(403, "ACCOUNT_SUSPENDED", "This account is turned off");
  return u;
}

export async function getMe(userId: string) {
  return toMe(await activeUser(userId));
}

export async function updateMe(
  userId: string,
  input: { name?: string; phone?: string | null; preferredSize?: string | null; favoriteColor?: string | null; marketingOptIn?: boolean },
) {
  await activeUser(userId);
  const u = await prisma.user.update({ where: { id: userId }, data: input });
  return toMe(u);
}

/** Signs out every device (e.g. a lost phone). */
export async function logoutEverywhere(userId: string) {
  const out = await prisma.customerSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  return { ok: true as const, signedOut: out.count };
}

/* ============================== Orders ============================== */

export async function myOrders(userId: string) {
  await activeUser(userId);
  const rows = await prisma.orderRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      createdAt: true,
      subtotal: true,
      discountAmount: true,
      total: true,
      currencyCode: true,
      couponCode: true,
      paymentProvider: true,
      paymentStatus: true,
      city: true,
      address: true,
      items: {
        select: {
          id: true,
          productTitle: true,
          productSlug: true,
          colorName: true,
          sizeName: true,
          quantity: true,
          unitPrice: true,
          lineSubtotal: true,
          imageUrl: true,
        },
      },
    },
  });
  return rows.map((o) => ({
    ...o,
    subtotal: o.subtotal == null ? null : Number(o.subtotal),
    discountAmount: o.discountAmount == null ? null : Number(o.discountAmount),
    total: o.total == null ? null : Number(o.total),
    items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), lineSubtotal: Number(i.lineSubtotal) })),
  }));
}

/* ============================== Favourites ============================== */

const WISHLIST_MAX = 200;

/** Products as the storefront's favourites list shows them. */
async function wishlistView(userId: string) {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId, product: { isActive: true } },
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          items: {
            where: { isActive: true },
            take: 1,
            orderBy: { createdAt: "asc" },
            select: {
              images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
              variants: { orderBy: { price: "asc" }, take: 1, select: { price: true } },
            },
          },
        },
      },
    },
  });
  return rows.map((r) => {
    const item = r.product.items[0];
    return {
      id: r.product.id,
      title: r.product.title,
      slug: r.product.slug,
      image: item?.images[0]?.url ?? null,
      price: item?.variants[0] ? Number(item.variants[0].price) : null,
      addedAt: r.createdAt.getTime(),
    };
  });
}

export async function getWishlist(userId: string) {
  await activeUser(userId);
  return wishlistView(userId);
}

export async function addToWishlist(userId: string, productId: string) {
  await activeUser(userId);
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw NotFound("Product not found");
  const count = await prisma.wishlistItem.count({ where: { userId } });
  if (count >= WISHLIST_MAX) throw fail(409, "WISHLIST_FULL", "The favourites list is full");
  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });
  return { ok: true as const };
}

export async function removeFromWishlist(userId: string, productId: string) {
  await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  return { ok: true as const };
}

/** Favourites saved on this device before signing in are added to the account. */
export async function mergeWishlist(userId: string, productIds: string[]) {
  await activeUser(userId);
  const ids = [...new Set(productIds)].slice(0, WISHLIST_MAX);
  if (ids.length) {
    const existing = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
    await prisma.wishlistItem.createMany({
      data: existing.map((p) => ({ userId, productId: p.id })),
      skipDuplicates: true,
    });
  }
  return wishlistView(userId);
}

/* ============================== Addresses ============================== */

const ADDRESS_MAX = 10;
type AddressInput = { label?: string | null; fullName: string; phone: string; city: string; address: string; notes?: string | null; isDefault?: boolean };

export async function listAddresses(userId: string) {
  await activeUser(userId);
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
}

export async function createAddress(userId: string, input: AddressInput) {
  await activeUser(userId);
  const count = await prisma.address.count({ where: { userId } });
  if (count >= ADDRESS_MAX) throw fail(409, "TOO_MANY_ADDRESSES", "Up to 10 addresses");
  const isDefault = input.isDefault === true || count === 0;
  return prisma.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...input, userId, isDefault } });
  });
}

export async function updateAddress(userId: string, id: string, input: Partial<AddressInput>) {
  await activeUser(userId);
  const found = await prisma.address.findFirst({ where: { id, userId } });
  if (!found) throw NotFound("Address not found");
  return prisma.$transaction(async (tx) => {
    if (input.isDefault === true) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: input });
  });
}

export async function deleteAddress(userId: string, id: string) {
  const found = await prisma.address.findFirst({ where: { id, userId } });
  if (!found) throw NotFound("Address not found");
  await prisma.address.delete({ where: { id } });
  // Keep one default when others remain.
  if (found.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return { ok: true as const };
}

/** Is this shopper account still on? (used when linking an order to it) */
export async function activeCustomerId(userId: string | undefined | null) {
  if (!userId) return null;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  return u && u.status === "ACTIVE" ? u.id : null;
}
