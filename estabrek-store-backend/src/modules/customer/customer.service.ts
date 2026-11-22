import { createHash, randomBytes, randomInt } from "node:crypto";
import { orderSteps } from "../catalog/orderTrack.service.js";
import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { SITE_ROW_ORDER } from "../../lib/siteRow.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { env } from "../../config/env.js";
import { signCustomerToken } from "../../config/security.js";
import { policy } from "../../lib/securityPolicy.js";
import { sendEmail } from "../outbox/sender/email.js";
import { shopperLanguage } from "../../lib/shopperLanguage.js";
import { GoogleTokenError, googleOf, verifyGoogleToken } from "../../lib/googleSignIn.js";
import { DISCORD_SECRET, SocialError, discordProfile, discordUrl, readState, socialOf, steamId, steamUrl } from "../../lib/socialSignIn.js";
import { open as openSecret } from "../../lib/secretBox.js";

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
export async function startLogin(emailRaw: string, ctx: { ip?: string; lang?: string }) {
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
    await sendEmail({ to: email, template: "CUSTOMER_LOGIN_CODE", payload: { code, minutes }, lang: (await shopperLanguage(ctx.lang)).lang });
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

/**
 * Signing in with Google (lib/googleSignIn.ts): the token Google's button gave the shop, checked; then the account of
 * that Google account, else the one with its email (they are linked from now on), else a new one with Google's name.
 * An account already linked to another Google account isn't opened by this one.
 */
export async function googleLogin(credential: string, ctx: { ip?: string; ua?: string }) {
  const settings = await prisma.siteSettings.findFirst({ orderBy: SITE_ROW_ORDER, select: { header: true } });
  const google = googleOf(settings?.header ?? null);
  if (!google.on || !google.clientId) throw fail(404, "GOOGLE_OFF", "Signing in with Google is switched off");
  let profile;
  try {
    profile = await verifyGoogleToken(credential, google.clientId);
  } catch (e) {
    if (e instanceof GoogleTokenError) throw fail(401, e.message, e.message === "GOOGLE_EMAIL" ? "Google doesn't vouch for this account's email" : "Google's sign-in didn't check out; try again");
    throw fail(503, "GOOGLE_UNREACHABLE", "Google couldn't be reached; try again in a moment");
  }
  const linked = await prisma.user.findUnique({ where: { googleSub: profile.sub } });
  const byEmail = linked ? null : await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail?.googleSub && byEmail.googleSub !== profile.sub) throw fail(409, "GOOGLE_OTHER_ACCOUNT", "This email's account is linked to another Google account");
  const existing = linked ?? byEmail;
  if (existing?.status === "SUSPENDED") throw fail(403, "ACCOUNT_SUSPENDED", "This account is turned off");
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { lastLoginAt: new Date(), emailVerifiedAt: existing.emailVerifiedAt ?? new Date(), googleSub: profile.sub, ...(!existing.name.trim() && profile.name ? { name: profile.name } : {}) },
      })
    : await prisma.user.create({ data: { email: profile.email, name: profile.name, emailVerifiedAt: new Date(), lastLoginAt: new Date(), googleSub: profile.sub } });
  const tokens = await newSession(user.id, ctx);
  return { ...tokens, user: toMe(user), isNew: !existing };
}

/* ---------- Discord (sign in) and Steam (link): lib/socialSignIn.ts ---------- */

async function socialSettings() {
  const settings = await prisma.siteSettings.findFirst({ orderBy: SITE_ROW_ORDER, select: { header: true } });
  return socialOf(settings?.header ?? null);
}
const socialFail = (e: unknown) => {
  if (!(e instanceof SocialError)) return fail(503, "SOCIAL_UNREACHABLE", "Discord or Steam couldn't be reached; try again in a moment");
  const said: Record<string, [number, string]> = {
    SOCIAL_STATE: [400, "This sign-in ran out or was already used; start again"],
    SOCIAL_RETURN: [400, "Not this shop's own address to come back to"],
    DISCORD_EMAIL: [401, "Discord doesn't vouch for this account's email"],
    DISCORD_REFUSED: [401, "Discord's sign-in didn't check out; try again"],
    STEAM_REFUSED: [401, "Steam's answer didn't check out; try again"],
  };
  const [status, message] = said[e.message] ?? [400, "It didn't check out"];
  return fail(status, e.message, message);
};

/** Where the shopper goes to sign in with Discord (404 while it is off). */
export async function discordStart(redirectUri: string, back: string) {
  const s = await socialSettings();
  if (!s.discord.on || !s.discord.clientId) throw fail(404, "DISCORD_OFF", "Signing in with Discord is switched off");
  try {
    return { url: discordUrl(s.discord.clientId, redirectUri, back) };
  } catch (e) {
    throw socialFail(e);
  }
}

/** Discord sent the shopper back with a code: signed in (an account by their Discord, else their verified email, else a new one). */
export async function discordLogin(code: string, rawState: string, ctx: { ip?: string; ua?: string }) {
  const s = await socialSettings();
  if (!s.discord.on || !s.discord.clientId) throw fail(404, "DISCORD_OFF", "Signing in with Discord is switched off");
  const kept = await prisma.fnSecret.findUnique({ where: { name: DISCORD_SECRET }, select: { sealed: true } });
  if (!kept) throw fail(409, "DISCORD_SECRET", `The secret ${DISCORD_SECRET} isn't kept yet (admin → الاتصالات والأسرار)`);
  let profile;
  let back = "/";
  try {
    const state = readState(rawState, "discord");
    back = state.b;
    profile = await discordProfile(code, state, s.discord.clientId, openSecret(kept.sealed));
  } catch (e) {
    throw socialFail(e);
  }
  const linked = await prisma.user.findUnique({ where: { discordId: profile.id } });
  const byEmail = linked ? null : await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail?.discordId && byEmail.discordId !== profile.id) throw fail(409, "DISCORD_OTHER_ACCOUNT", "This email's account is linked to another Discord account");
  const existing = linked ?? byEmail;
  if (existing?.status === "SUSPENDED") throw fail(403, "ACCOUNT_SUSPENDED", "This account is turned off");
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date(), emailVerifiedAt: existing.emailVerifiedAt ?? new Date(), discordId: profile.id, ...(!existing.name.trim() && profile.name ? { name: profile.name } : {}) } })
    : await prisma.user.create({ data: { email: profile.email, name: profile.name, emailVerifiedAt: new Date(), lastLoginAt: new Date(), discordId: profile.id } });
  const tokens = await newSession(user.id, ctx);
  return { ...tokens, user: toMe(user), isNew: !existing, back };
}

/** Where a signed-in shopper goes to link their Steam account (404 while it is off). */
export async function steamStart(userId: string, returnTo: string, back: string) {
  if (!(await socialSettings()).steam.on) throw fail(404, "STEAM_OFF", "Linking a Steam account is switched off");
  try {
    return { url: steamUrl(userId, returnTo, back) };
  } catch (e) {
    throw socialFail(e);
  }
}

/** Steam sent the shopper back: their SteamID kept on the account the state names. */
export async function steamLink(params: Record<string, string>, rawState: string) {
  if (!(await socialSettings()).steam.on) throw fail(404, "STEAM_OFF", "Linking a Steam account is switched off");
  let id;
  let state;
  try {
    state = readState(rawState, "steam");
    id = await steamId(params, state);
  } catch (e) {
    throw socialFail(e);
  }
  const other = await prisma.user.findUnique({ where: { steamId: id }, select: { id: true } });
  if (other && other.id !== state.u) throw fail(409, "STEAM_OTHER_ACCOUNT", "This Steam account is linked to another account");
  const user = await prisma.user.update({ where: { id: state.u! }, data: { steamId: id } });
  return { user: toMe(user), back: state.b };
}

/** Their Steam account unlinked. */
export async function steamUnlink(userId: string) {
  return toMe(await prisma.user.update({ where: { id: userId }, data: { steamId: null } }));
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
    // The game accounts they play with (a game server's site): linked or not, and which.
    discordId: (u as { discordId?: string | null }).discordId ?? null,
    steamId: (u as { steamId?: string | null }).steamId ?? null,
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
      // Where the order is: each status it reached and when (the account's tracker).
      history: { select: { toStatus: true, at: true } },
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
  return rows.map(({ history, ...o }) => ({
    ...o,
    steps: orderSteps(o.createdAt, history),
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
