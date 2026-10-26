/**
 * Sale rules and price changes (admin → البيع الذكي). The rules suggest
 * (lib/saleRules.ts); nothing changes until the owner approves. Every change
 * keeps each size's price fields before and after (PriceAction), so it can be
 * undone, as long as nobody changed that size since. A size with its own sale
 * (now or planned) is left as it is.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import { priorityOf } from "../../lib/popularity.js";
import { buildSuggestions, mergeRuleSettings, saleActive, samePrice, withSale, withoutSale, type PriceFields, type RuleName, type SaleAction } from "../../lib/saleRules.js";
import { readSellingSettings, stockInsights } from "./insights.service.js";

const DAY = 86400_000;
/** A product a rule changed isn't suggested the same again for this long. */
const RECENT_DAYS = 30;

type Db = Prisma.TransactionClient | typeof prisma;
type VariantRow = { id: string; price: Prisma.Decimal; originalPrice: Prisma.Decimal | null; salePrice: Prisma.Decimal | null; saleStartsAt: Date | null; saleEndsAt: Date | null };
const PRICE_SELECT = { id: true, price: true, originalPrice: true, salePrice: true, saleStartsAt: true, saleEndsAt: true } as const;

const n = (d: Prisma.Decimal | null) => (d == null ? null : Number(d));
export const fieldsOf = (v: VariantRow): PriceFields => ({
  price: Number(v.price),
  originalPrice: n(v.originalPrice),
  salePrice: n(v.salePrice),
  saleStartsAt: v.saleStartsAt ? v.saleStartsAt.toISOString() : null,
  saleEndsAt: v.saleEndsAt ? v.saleEndsAt.toISOString() : null,
});
const dec = (x: number | null) => (x == null ? null : new Prisma.Decimal(x));
const dataOf = (f: PriceFields) => ({
  price: new Prisma.Decimal(f.price),
  originalPrice: dec(f.originalPrice),
  salePrice: dec(f.salePrice),
  saleStartsAt: f.saleStartsAt ? new Date(f.saleStartsAt) : null,
  saleEndsAt: f.saleEndsAt ? new Date(f.saleEndsAt) : null,
});

export type PriceChange = { variantId: string; before: PriceFields; after: PriceFields };

export async function saleSuggestions(now = Date.now()) {
  const { forecast, data } = await readSellingSettings();
  const rules = mergeRuleSettings(data.rules);
  const insights = await stockInsights(forecast, now);
  const [skips, recent] = await Promise.all([
    prisma.saleSuggestionSkip.findMany({ where: { until: { gt: new Date(now) } }, select: { rule: true, productId: true } }),
    prisma.priceAction.findMany({ where: { rule: { not: null }, status: "applied", createdAt: { gte: new Date(now - RECENT_DAYS * DAY) } }, select: { rule: true, productId: true } }),
  ]);
  const skip = new Set([...skips, ...recent].map((s) => `${s.rule}|${s.productId}`));
  const hot = new Set(insights.products.filter((p) => priorityOf(p.productId) >= 1).map((p) => p.productId));
  const suggestions = buildSuggestions({ rules, unseenDays: forecast.unseenDays, unseen: insights.unseen, lookedNotBought: insights.lookedNotBought, products: insights.products, hot, skip });
  return { now, rules, unseenDays: forecast.unseenDays, viewsDays: insights.viewsDays, suggestions };
}

/**
 * One product's sizes changed together. discount: sizes without a sale of their
 * own get one from `from` to `to`; endDiscount: sizes on sale go back to their
 * regular price. Null when no size needed the change.
 */
export async function applyPriceAction(
  db: Db,
  input: { productId: string; rule: RuleName | null; action: SaleAction; campaignId?: string | null; from?: number; to?: number; adminUserId?: string | null },
  now = Date.now(),
) {
  const product = await db.product.findUnique({
    where: { id: input.productId },
    select: { id: true, title: true, items: { where: { isActive: true }, select: { variants: { select: PRICE_SELECT } } } },
  });
  if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND");
  const variants = product.items.flatMap((i) => i.variants);
  const changes: PriceChange[] = [];
  let leftAlone = 0;
  for (const v of variants) {
    const before = fieldsOf(v);
    let after: PriceFields;
    if (input.action.kind === "discount") {
      const planned = before.salePrice != null && before.salePrice > 0 && !!before.saleStartsAt && Date.parse(before.saleStartsAt) > now;
      if (saleActive(before, now) || planned) {
        leftAlone += 1;
        continue;
      }
      const from = input.from ?? now;
      const to = input.to ?? now + input.action.saleDays * DAY;
      after = withSale(before, input.action.percent, from, to);
    } else {
      if (!saleActive(before, now)) continue;
      after = withoutSale(before);
    }
    if (samePrice(before, after)) continue;
    await db.productVariant.update({ where: { id: v.id }, data: dataOf(after) });
    changes.push({ variantId: v.id, before, after });
  }
  if (!changes.length) return { action: null, sizes: variants.length, changed: 0, leftAlone };
  const action = await db.priceAction.create({
    data: {
      kind: input.campaignId ? "campaign" : input.action.kind,
      rule: input.rule,
      campaignId: input.campaignId ?? null,
      productId: product.id,
      title: product.title,
      changes: changes as unknown as Prisma.InputJsonValue,
      adminUserId: input.adminUserId ?? null,
    },
  });
  return { action, sizes: variants.length, changed: changes.length, leftAlone };
}

/** Puts the sizes back as they were, unless one was changed since (that one stays). */
export async function restorePriceAction(db: Db, id: string, status: "undone" | "ended", now = Date.now()) {
  const a = await db.priceAction.findUnique({ where: { id } });
  if (!a) throw new AppError(404, "PRICE_ACTION_NOT_FOUND");
  if (a.status !== "applied") throw new AppError(409, "PRICE_ACTION_NOT_APPLIED", "Already undone or ended");
  let restored = 0;
  let changedSince = 0;
  for (const c of a.changes as unknown as PriceChange[]) {
    const v = await db.productVariant.findUnique({ where: { id: c.variantId }, select: PRICE_SELECT });
    if (!v) continue;
    if (!samePrice(fieldsOf(v), c.after)) {
      changedSince += 1;
      continue;
    }
    await db.productVariant.update({ where: { id: v.id }, data: dataOf(c.before) });
    restored += 1;
  }
  await db.priceAction.update({ where: { id }, data: { status, undoneAt: new Date(now) } });
  return { restored, changedSince };
}

export async function undoPriceAction(id: string, now = Date.now()) {
  const a = await prisma.priceAction.findUnique({ where: { id }, select: { campaignId: true } });
  if (a?.campaignId) throw new AppError(409, "PRICE_ACTION_FROM_CAMPAIGN", "End the season instead");
  return prisma.$transaction((tx) => restorePriceAction(tx, id, "undone", now));
}

export type ApproveItem = { rule: RuleName; productId: string; percent?: number; saleDays?: number };

/** The owner's yes: each product changed (or why not). */
export async function approveSuggestions(items: ApproveItem[], adminUserId: string | null, now = Date.now()) {
  const { data } = await readSellingSettings();
  const rules = mergeRuleSettings(data.rules);
  const results = [];
  for (const it of items) {
    const action: SaleAction =
      it.rule === "hotLowStock"
        ? { kind: "endDiscount" }
        : { kind: "discount", percent: it.percent ?? rules[it.rule].percent, saleDays: it.saleDays ?? rules[it.rule].saleDays };
    try {
      const r = await prisma.$transaction((tx) => applyPriceAction(tx, { productId: it.productId, rule: it.rule, action, adminUserId }, now));
      results.push({ productId: it.productId, rule: it.rule, ok: true, actionId: r.action?.id ?? null, changed: r.changed, leftAlone: r.leftAlone });
    } catch (e) {
      results.push({ productId: it.productId, rule: it.rule, ok: false, error: e instanceof AppError ? e.code : "FAILED" });
    }
  }
  return results;
}

export async function skipSuggestion(rule: RuleName, productId: string, days: number, now = Date.now()) {
  const until = new Date(now + days * DAY);
  await prisma.saleSuggestionSkip.upsert({ where: { rule_productId: { rule, productId } }, create: { rule, productId, until }, update: { until } });
  return { until: until.toISOString() };
}

export async function recentPriceActions(take = 50) {
  return prisma.priceAction.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, kind: true, rule: true, campaignId: true, productId: true, title: true, changes: true, status: true, createdAt: true, undoneAt: true },
  });
}
