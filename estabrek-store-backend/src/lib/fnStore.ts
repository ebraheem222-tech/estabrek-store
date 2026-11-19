/**
 * A function's store steps (stage 2, item 7; lib/fnDef.ts says their shape): what a run may do to the
 * store itself, not only to the owner's tables.
 *
 *   coupon    a discount code (admin → الكوبونات): a percent or an amount off, for so many uses and
 *             days, and maybe for one phone number only (the way the quiz's prizes are). Its code is
 *             the one the step gives, or one made up.
 *   stock     a piece's quantity (admin → المخزون): so many more, so many fewer, or exactly so many,
 *             written in the piece's stock history like a change made in the admin. Never below 0.
 *   customer  a shopper's roles and groups (lib/shopperRoles.ts): given or taken; or only read (their
 *             name, email and phone, for the steps after it: a coupon for their phone, an email).
 *
 * Who may publish a function with one of these must also be allowed that thing in the admin
 * (fnDef.ts `storeRights`): a member who builds functions but may not make coupons can't make
 * coupons through one. A dry run checks everything and changes nothing: a coupon's code is made up
 * and not kept, and a piece's quantity is as the run's earlier steps would have left it.
 */
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { COUPON_CODE, STORE_NUMBERS, couponPhone, isBlank, numberProblem, type COUPON_OFF, type CUSTOMER_MARKS, type NumberRule, type STOCK_HOW } from "./fnDef.js";
import { ROLE_LIMITS, uniq } from "./shopperRoles.js";
import { forgetShoppers } from "../middleware/apiCaller.js";

/** A store step couldn't do its thing: said as the run's failure. */
export class StoreError extends Error {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** No 0/O, 1/I/L: a code is read off a phone and typed in. */
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newCouponCode = () => Array.from({ length: 8 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");

/** A number a step was given, filled: checked by its rule; empty is undefined. */
function numberAt(v: unknown, rule: NumberRule): number | undefined {
  const problem = numberProblem(v, rule);
  if (problem) throw new StoreError(problem);
  return isBlank(v) ? undefined : Number(typeof v === "string" ? v.trim() : v);
}

/* ---------------- A coupon ---------------- */

export type CouponAsk = { code: string; off: (typeof COUPON_OFF)[number]; value: unknown; max?: unknown; minCart?: unknown; uses?: unknown; days?: unknown; phone: string; note: string };
/** A coupon as the steps after it see it ({{coupon.code}}). */
export type CouponMade = { id: string | null; code: string; off: (typeof COUPON_OFF)[number]; value: number; max: number | null; minCart: number | null; uses: number; endsAt: string | null; phone: string | null; dry?: true };

export async function makeCoupon(ask: CouponAsk, dry: boolean, now = new Date()): Promise<CouponMade> {
  const percent = ask.off === "percent";
  const value = numberAt(ask.value, STORE_NUMBERS[percent ? "percent" : "amount"]);
  if (value === undefined) throw new StoreError("The discount is empty");
  if (!percent && !isBlank(ask.max)) throw new StoreError("The most off is for a percent");
  const max = percent ? (numberAt(ask.max, STORE_NUMBERS.max) ?? null) : null;
  const minCart = numberAt(ask.minCart, STORE_NUMBERS.minCart) ?? null;
  const uses = numberAt(ask.uses, STORE_NUMBERS.uses) ?? 1;
  const days = numberAt(ask.days, STORE_NUMBERS.days);
  const phoneText = ask.phone.trim();
  const phone = phoneText ? couponPhone(phoneText) : null;
  if (phoneText && !phone) throw new StoreError(`"${phoneText.slice(0, 40)}" isn't a phone number`);
  const given = ask.code.trim().toUpperCase();
  if (given && !COUPON_CODE.test(given)) throw new StoreError("A coupon's code is 2 to 32 letters, digits, - or _");
  const endsAt = days === undefined ? null : new Date(now.getTime() + Math.round(days * 86_400_000));
  const made = (id: string | null, code: string): CouponMade => ({ id, code, off: ask.off, value, max, minCart, uses, endsAt: endsAt?.toISOString() ?? null, phone, ...(dry ? { dry: true as const } : {}) });
  const taken = () => new StoreError(`A coupon "${given}" is there already`);
  if (dry) {
    if (given && (await prisma.coupon.findUnique({ where: { code: given }, select: { id: true } }))) throw taken();
    return made(null, given || newCouponCode());
  }
  // A made-up code that happens to be taken: another one.
  for (let i = 0; i < 5; i++) {
    try {
      const c = await prisma.coupon.create({
        data: {
          code: given || newCouponCode(),
          discountType: percent ? "PERCENT" : "FIXED",
          discountValue: new Prisma.Decimal(value),
          maxDiscount: max === null ? null : new Prisma.Decimal(max),
          minCart: minCart === null ? null : new Prisma.Decimal(minCart),
          usageLimit: uses,
          phone,
          isActive: true,
          startsAt: now,
          endsAt,
          note: ask.note.trim().slice(0, 200) || "من function",
        },
        select: { id: true, code: true },
      });
      return made(c.id, c.code);
    } catch (e) {
      if ((e as Prisma.PrismaClientKnownRequestError)?.code !== "P2002") throw e;
      if (given) throw taken();
    }
  }
  throw new StoreError("No free code was found: try again");
}

/* ---------------- A piece's quantity ---------------- */

export type StockAsk = { sku: string; how: (typeof STOCK_HOW)[number]; amount: unknown; reason: string };
/** A piece's quantity as the steps after it see it ({{stock.after}}). */
export type StockDone = { sku: string; product: string; color: string; size: string; before: number; after: number; dry?: true };

export async function changeStock(ask: StockAsk, dry: boolean, /** A dry run's quantities, as its earlier steps would have left them. */ pretend: Map<string, number>): Promise<StockDone> {
  const sku = ask.sku.trim();
  if (!sku) throw new StoreError("Which piece? (its SKU)");
  const amount = numberAt(ask.amount, STORE_NUMBERS.quantity);
  if (amount === undefined) throw new StoreError("The amount is empty");
  if (sku.length > 120) throw new StoreError(`No piece with the SKU "${sku.slice(0, 60)}"`);
  const v = await prisma.productVariant.findFirst({
    where: { OR: [{ sku }, { id: sku }] },
    select: { id: true, sku: true, stock: true, size: { select: { name: true } }, item: { select: { colorName: true, product: { select: { title: true } } } } },
  });
  if (!v) throw new StoreError(`No piece with the SKU "${sku.slice(0, 60)}"`);
  const next = (before: number) => (ask.how === "add" ? before + amount : ask.how === "take" ? before - amount : amount);
  const check = (before: number, after: number) => {
    if (after < 0) throw new StoreError(`Only ${before} left of ${v.sku}`);
    if (after > STORE_NUMBERS.quantity.max) throw new StoreError(`A piece holds up to ${STORE_NUMBERS.quantity.max}`);
  };
  const done = (before: number, after: number): StockDone => ({ sku: v.sku, product: v.item.product.title, color: v.item.colorName, size: v.size.name, before, after, ...(dry ? { dry: true as const } : {}) });
  if (dry) {
    const before = pretend.get(v.id) ?? v.stock;
    const after = next(before);
    check(before, after);
    pretend.set(v.id, after);
    return done(before, after);
  }
  // The quantity as it is at this moment (another order may be taking from it now), held until the change is written.
  const out = await prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<Array<{ stock: number }>>`SELECT "stock" FROM "ProductVariant" WHERE "id" = ${v.id} FOR UPDATE`;
    if (!row) throw new StoreError(`No piece with the SKU "${sku.slice(0, 60)}"`);
    const before = row.stock;
    const after = next(before);
    check(before, after);
    if (after !== before) {
      await tx.productVariant.update({ where: { id: v.id }, data: { stock: after } });
      await tx.inventoryAdjustment.create({ data: { variantId: v.id, delta: after - before, beforeStock: before, afterStock: after, reason: ask.reason.trim().slice(0, 200) || "من function" } });
    }
    return { before, after };
  });
  return done(out.before, out.after);
}

/* ---------------- A customer ---------------- */

export type CustomerAsk = { who: string; mark: (typeof CUSTOMER_MARKS)[number]; what: string };
/** A customer as the steps after it see them ({{buyer.phone}}). */
export type CustomerSeen = { id: string; name: string; email: string; phone: string | null; roles: string[]; groups: string[] };
export type CustomerDone = { customer: CustomerSeen; /** The role's key or the group's name the step was about. */ what: string; /** It as the run's line says it: a role by its name in the function's language. */ shown: string; /** Whether anything changed (a role they had already: nothing). */ changed: boolean };

export async function markCustomer(ask: CustomerAsk, dry: boolean, lang: "ar" | "en" | "he" = "ar"): Promise<CustomerDone> {
  const who = ask.who.trim();
  if (!who) throw new StoreError("Which customer? (nobody here)");
  const user = who.length > 200 ? null : await prisma.user.findFirst({ where: EMAIL.test(who) ? { email: who.toLowerCase() } : { id: who }, select: { id: true, name: true, email: true, phone: true, roles: true, groups: true } });
  if (!user) throw new StoreError(`No customer "${who.slice(0, 60)}"`);
  let { roles, groups } = user;
  let what = "";
  let shown = "";
  const asked = ask.what.trim();
  if (ask.mark === "giveRole" || ask.mark === "takeRole") {
    if (!asked) throw new StoreError("Which role?");
    const role = asked.length > 40 ? null : await prisma.shopperRole.findUnique({ where: { key: asked }, select: { key: true, name: true } });
    if (!role) throw new StoreError(`No role "${asked.slice(0, 40)}"`);
    roles = ask.mark === "giveRole" ? uniq([...roles, asked]) : roles.filter((r) => r !== asked);
    if (roles.length > ROLE_LIMITS.rolesPerShopper) throw new StoreError(`A customer holds up to ${ROLE_LIMITS.rolesPerShopper} roles`);
    what = asked;
    const names = (role.name ?? {}) as Partial<Record<"ar" | "en" | "he", string>>;
    shown = names[lang] || names.ar || names.en || names.he || asked;
  } else if (ask.mark === "join" || ask.mark === "leave") {
    if (!asked) throw new StoreError("Which group?");
    const g = await prisma.shopperGroup.findFirst({ where: { OR: [{ id: asked }, { name: asked }] }, select: { id: true, name: true } });
    if (!g) throw new StoreError(`No group "${asked.slice(0, 40)}"`);
    groups = ask.mark === "join" ? uniq([...groups, g.id]) : groups.filter((x) => x !== g.id);
    if (groups.length > ROLE_LIMITS.groupsPerShopper) throw new StoreError(`A customer is in up to ${ROLE_LIMITS.groupsPerShopper} groups`);
    what = g.name;
    shown = g.name;
  }
  const changed = roles.length !== user.roles.length || groups.length !== user.groups.length;
  if (changed && !dry) {
    // Added or taken one at a time in the database itself: two runs at once don't undo each other.
    if (ask.mark === "giveRole") await prisma.$executeRaw`UPDATE "User" SET "roles" = array_append("roles", ${what}), "updatedAt" = now() WHERE "id" = ${user.id} AND NOT (${what} = ANY("roles"))`;
    else if (ask.mark === "takeRole") await prisma.$executeRaw`UPDATE "User" SET "roles" = array_remove("roles", ${what}), "updatedAt" = now() WHERE "id" = ${user.id}`;
    else {
      const id = groups.length > user.groups.length ? groups[groups.length - 1] : user.groups.find((x) => !groups.includes(x))!;
      if (ask.mark === "join") await prisma.$executeRaw`UPDATE "User" SET "groups" = array_append("groups", ${id}), "updatedAt" = now() WHERE "id" = ${user.id} AND NOT (${id} = ANY("groups"))`;
      else await prisma.$executeRaw`UPDATE "User" SET "groups" = array_remove("groups", ${id}), "updatedAt" = now() WHERE "id" = ${user.id}`;
    }
    // A shopper's roles and groups are kept a moment with their sign-in (middleware/apiCaller.ts).
    forgetShoppers();
  }
  return { customer: { id: user.id, name: user.name, email: user.email, phone: user.phone ?? null, roles, groups }, what, shown, changed };
}
