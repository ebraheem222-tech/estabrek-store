/**
 * Sale rules (admin → البيع الذكي), the pure part. Rules only suggest; the owner
 * approves each change (modules/admin/selling.service.ts applies it and keeps
 * it for undo):
 *   unseen           nobody looked at it for unseenDays (توقّع المخزون) → X% off for N days
 *   lookedNotBought  looked at a lot, never bought → a smaller discount
 *   hotLowStock      on sale, popular right now, and only a few left → end the discount
 * Seasons (Campaign) are different: the owner schedules them, they run by themselves.
 */

export type RuleName = "unseen" | "lookedNotBought" | "hotLowStock";
export const RULE_NAMES: RuleName[] = ["unseen", "lookedNotBought", "hotLowStock"];

export type RuleSettings = {
  unseen: { on: boolean; percent: number; saleDays: number };
  lookedNotBought: { on: boolean; percent: number; saleDays: number };
  hotLowStock: { on: boolean; maxLeft: number };
};

export const RULE_DEFAULTS: RuleSettings = {
  unseen: { on: true, percent: 10, saleDays: 14 },
  lookedNotBought: { on: true, percent: 5, saleDays: 7 },
  hotLowStock: { on: true, maxLeft: 2 },
};

export const RULE_LIMITS = {
  percent: { min: 1, max: 70 },
  saleDays: { min: 1, max: 90 },
  maxLeft: { min: 1, max: 20 },
} as const;

const intIn = (v: unknown, k: keyof typeof RULE_LIMITS, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= RULE_LIMITS[k].min && n <= RULE_LIMITS[k].max ? n : fallback;
};
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export function mergeRuleSettings(saved: unknown): RuleSettings {
  const s = obj(saved);
  const u = obj(s.unseen);
  const l = obj(s.lookedNotBought);
  const h = obj(s.hotLowStock);
  const d = RULE_DEFAULTS;
  return {
    unseen: { on: typeof u.on === "boolean" ? u.on : d.unseen.on, percent: intIn(u.percent, "percent", d.unseen.percent), saleDays: intIn(u.saleDays, "saleDays", d.unseen.saleDays) },
    lookedNotBought: {
      on: typeof l.on === "boolean" ? l.on : d.lookedNotBought.on,
      percent: intIn(l.percent, "percent", d.lookedNotBought.percent),
      saleDays: intIn(l.saleDays, "saleDays", d.lookedNotBought.saleDays),
    },
    hotLowStock: { on: typeof h.on === "boolean" ? h.on : d.hotLowStock.on, maxLeft: intIn(h.maxLeft, "maxLeft", d.hotLowStock.maxLeft) },
  };
}

/**
 * The price with `percent` off: whole shekels from 20 up (a 10% off 89 is 80, not
 * 80.10), cents below; never the same as or more than the price.
 */
export function discountedPrice(price: number, percent: number): number {
  const x = price * (1 - percent / 100);
  let out = x >= 20 ? Math.round(x) : Math.round(x * 100) / 100;
  if (out >= price) out = Math.max(0.01, Math.round((price - (price >= 20 ? 1 : 0.01)) * 100) / 100);
  return out;
}

export type SaleAction = { kind: "discount"; percent: number; saleDays: number } | { kind: "endDiscount" };

export type Suggestion = {
  rule: RuleName;
  productId: string;
  title: string;
  slug: string;
  thumbUrl: string | null;
  action: SaleAction;
  /** The numbers behind it, for the sentence on the page. */
  why: Record<string, number | string | null>;
};

type ShelfRow = { productId: string; title: string; slug: string; thumbUrl: string | null; stock: number; stockValue: number; onSale: boolean; price: number };
type ForecastRow = { productId: string; title: string; slug: string; thumbUrl: string | null; available: number; rising: boolean; demand: { views7: number; bags7: number }; variants: Array<{ onSale: boolean }> };

export type SuggestionInput = {
  rules: RuleSettings;
  unseenDays: number;
  unseen: Array<ShelfRow & { ageDays: number; lastViewedAt: string | null }>;
  lookedNotBought: Array<ShelfRow & { views: number; bags: number }>;
  products: ForecastRow[];
  /** Among the most popular right now (the cache's hot list, or pinned). */
  hot: Set<string>;
  /** "rule|productId" the owner said no to, or that got the same change lately. */
  skip: Set<string>;
};

export function buildSuggestions(i: SuggestionInput): Suggestion[] {
  const out: Suggestion[] = [];
  const add = (s: Suggestion) => {
    if (!i.skip.has(`${s.rule}|${s.productId}`)) out.push(s);
  };
  const r = i.rules;
  if (r.hotLowStock.on) {
    for (const p of i.products) {
      if (p.available <= 0 || p.available > r.hotLowStock.maxLeft || !p.variants.some((v) => v.onSale)) continue;
      if (!i.hot.has(p.productId) && !p.rising) continue;
      add({ rule: "hotLowStock", productId: p.productId, title: p.title, slug: p.slug, thumbUrl: p.thumbUrl, action: { kind: "endDiscount" }, why: { left: p.available, views7: p.demand.views7, bags7: p.demand.bags7 } });
    }
  }
  if (r.unseen.on) {
    for (const p of i.unseen) {
      if (p.onSale) continue;
      add({
        rule: "unseen",
        productId: p.productId,
        title: p.title,
        slug: p.slug,
        thumbUrl: p.thumbUrl,
        action: { kind: "discount", percent: r.unseen.percent, saleDays: r.unseen.saleDays },
        why: { days: i.unseenDays, stock: p.stock, stockValue: p.stockValue, lastViewedAt: p.lastViewedAt, price: p.price, newPrice: discountedPrice(p.price, r.unseen.percent) },
      });
    }
  }
  if (r.lookedNotBought.on) {
    for (const p of i.lookedNotBought) {
      if (p.onSale) continue;
      add({
        rule: "lookedNotBought",
        productId: p.productId,
        title: p.title,
        slug: p.slug,
        thumbUrl: p.thumbUrl,
        action: { kind: "discount", percent: r.lookedNotBought.percent, saleDays: r.lookedNotBought.saleDays },
        why: { days: i.unseenDays, views: p.views, bags: p.bags, stock: p.stock, price: p.price, newPrice: discountedPrice(p.price, r.lookedNotBought.percent) },
      });
    }
  }
  return out;
}

/* ---------------- One size's price fields ---------------- */

export type PriceFields = { price: number; originalPrice: number | null; salePrice: number | null; saleStartsAt: string | null; saleEndsAt: string | null };

export function saleActive(f: Pick<PriceFields, "salePrice" | "saleStartsAt" | "saleEndsAt">, now: number) {
  return f.salePrice != null && f.salePrice > 0 && (!f.saleStartsAt || Date.parse(f.saleStartsAt) <= now) && (!f.saleEndsAt || Date.parse(f.saleEndsAt) >= now);
}

/** A sale on this size from `from` to `to` (the regular price kept, as the product editor does). */
export function withSale(f: PriceFields, percent: number, from: number, to: number): PriceFields {
  const base = f.originalPrice ?? f.price;
  return { price: f.price, originalPrice: base, salePrice: discountedPrice(base, percent), saleStartsAt: new Date(from).toISOString(), saleEndsAt: new Date(to).toISOString() };
}

/** The sale off now: back to the regular price (as the shop does when a sale ends). */
export function withoutSale(f: PriceFields): PriceFields {
  return { price: f.originalPrice ?? f.price, originalPrice: null, salePrice: null, saleStartsAt: null, saleEndsAt: null };
}

export const samePrice = (a: PriceFields, b: PriceFields) =>
  a.price === b.price && a.originalPrice === b.originalPrice && a.salePrice === b.salePrice && a.saleStartsAt === b.saleStartsAt && a.saleEndsAt === b.saleEndsAt;
