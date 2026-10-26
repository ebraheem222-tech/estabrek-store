/**
 * Smart selling's numbers (admin → توقّع المخزون): per size how fast it sells and
 * when it runs out, what to reorder, the products nobody looked at, and the ones
 * people look at but don't buy. Sold = pieces in orders that weren't rejected,
 * canceled or refunded; what can still be sold = stock minus what open orders
 * hold (catalog.service heldQuantities). The math is in lib/stockForecast.ts.
 */
import { prisma } from "../../lib/prisma.js";
import { storeDay } from "../../lib/popularity.js";
import { heldQuantities } from "../catalog/catalog.service.js";
import {
  STATUS_ORDER,
  forecastProduct,
  forecastVariant,
  isRising,
  mergeForecastSettings,
  roundDays,
  roundPace,
  type Demand,
  type ForecastSettings,
} from "../../lib/stockForecast.js";

const DAY = 86400_000;
const LIVE = ["NEW", "CONTACTED", "ACCEPTED", "SHIPPED", "CLOSED"] as const;
/** Looked at this many times without a sale: "people look but don't buy". */
export const LOOKED_NOT_BOUGHT_VIEWS = 30;

export async function readSellingSettings() {
  const row = await prisma.sellingSettings.findUnique({ where: { id: "default" } });
  const data = row?.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
  return { row, data, forecast: mergeForecastSettings(data.forecast) };
}

const saleOn = (v: { salePrice: unknown; saleStartsAt: Date | null; saleEndsAt: Date | null }, now: number) => {
  const sale = v.salePrice == null ? 0 : Number(v.salePrice);
  return sale > 0 && (!v.saleStartsAt || v.saleStartsAt.getTime() <= now) && (!v.saleEndsAt || v.saleEndsAt.getTime() >= now);
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function stockInsights(s: ForecastSettings, now = Date.now()) {
  const longest = Math.max(s.windowDays, s.unseenDays, 14);
  const since = new Date(now - longest * DAY);
  const today = storeDay(now);
  const dayAgo = (n: number) => dayKey(new Date(today.getTime() - n * DAY));

  const [variants, lines, legacy, days, firstDay, lastViews] = await Promise.all([
    prisma.productVariant.findMany({
      where: { item: { isActive: true, product: { isActive: true } } },
      select: {
        id: true,
        sku: true,
        stock: true,
        price: true,
        salePrice: true,
        saleStartsAt: true,
        saleEndsAt: true,
        size: { select: { name: true, order: true } },
        item: {
          select: {
            colorName: true,
            colorHex: true,
            images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
            product: { select: { id: true, title: true, slug: true, createdAt: true, category: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.orderRequestItem.findMany({
      where: { orderRequest: { createdAt: { gte: since }, status: { in: [...LIVE] } } },
      select: { variantId: true, quantity: true, orderRequest: { select: { createdAt: true } } },
    }),
    // Orders from before order lines existed: one piece kind per order.
    prisma.orderRequest.findMany({
      where: { createdAt: { gte: since }, status: { in: [...LIVE] }, items: { none: {} } },
      select: { variantId: true, quantity: true, createdAt: true },
    }),
    prisma.productPopularityDay.findMany({
      where: { day: { gte: new Date(today.getTime() - (longest - 1) * DAY) } },
      select: { day: true, productId: true, views: true, bags: true },
    }),
    prisma.productPopularityDay.aggregate({ _min: { day: true } }),
    prisma.productPopularityDay.groupBy({ by: ["productId"], where: { views: { gt: 0 } }, _max: { day: true } }),
  ]);

  // Sold pieces per size: last 7 days, the window, the "unseen" window.
  const sold = new Map<string, { d7: number; window: number; unseen: number }>();
  const addSold = (variantId: string, qty: number, at: Date) => {
    const age = (now - at.getTime()) / DAY;
    const e = sold.get(variantId) ?? { d7: 0, window: 0, unseen: 0 };
    const q = Math.max(1, qty);
    if (age <= 7) e.d7 += q;
    if (age <= s.windowDays) e.window += q;
    if (age <= s.unseenDays) e.unseen += q;
    sold.set(variantId, e);
  };
  for (const l of lines) addSold(l.variantId, l.quantity, l.orderRequest.createdAt);
  for (const o of legacy) addSold(o.variantId, o.quantity, o.createdAt);

  // Looks and bags per product: this week, the week before, and the "unseen" window.
  const demand = new Map<string, Demand & { viewsUnseen: number; bagsUnseen: number }>();
  const d7 = dayAgo(6);
  const d14 = dayAgo(13);
  const dU = dayAgo(s.unseenDays - 1);
  for (const r of days) {
    const k = dayKey(r.day);
    const e = demand.get(r.productId) ?? { views7: 0, viewsPrev7: 0, bags7: 0, bagsPrev7: 0, viewsUnseen: 0, bagsUnseen: 0 };
    if (k >= d7) {
      e.views7 += r.views;
      e.bags7 += r.bags;
    } else if (k >= d14) {
      e.viewsPrev7 += r.views;
      e.bagsPrev7 += r.bags;
    }
    if (k >= dU) {
      e.viewsUnseen += r.views;
      e.bagsUnseen += r.bags;
    }
    demand.set(r.productId, e);
  }
  const lastViewed = new Map(lastViews.map((r) => [r.productId, r._max.day]));

  const held = await heldQuantities(
    prisma,
    variants.map((v) => v.id),
  );

  type P = (typeof variants)[number]["item"]["product"];
  const byProduct = new Map<string, { product: P; thumbUrl: string | null; rows: typeof variants }>();
  for (const v of variants) {
    const p = v.item.product;
    const e = byProduct.get(p.id) ?? { product: p, thumbUrl: null, rows: [] };
    e.thumbUrl ??= v.item.images[0]?.url ?? null;
    e.rows.push(v);
    byProduct.set(p.id, e);
  }

  const products = [];
  const unseen = [];
  const lookedNotBought = [];
  for (const { product: p, thumbUrl, rows } of byProduct.values()) {
    const dem = demand.get(p.id) ?? { views7: 0, viewsPrev7: 0, bags7: 0, bagsPrev7: 0, viewsUnseen: 0, bagsUnseen: 0 };
    const rising = isRising(dem);
    const vs = rows
      .sort((a, b) => a.item.colorName.localeCompare(b.item.colorName) || a.size.order - b.size.order)
      .map((v) => {
        const sd = sold.get(v.id) ?? { d7: 0, window: 0, unseen: 0 };
        const h = held.get(v.id) ?? 0;
        const available = Math.max(0, v.stock - h);
        const f = forecastVariant({ available, sold7: sd.d7, soldWindow: sd.window }, s, rising);
        return {
          variantId: v.id,
          sku: v.sku,
          color: v.item.colorName,
          colorHex: v.item.colorHex,
          size: v.size.name,
          stock: v.stock,
          held: h,
          available,
          sold7: sd.d7,
          soldWindow: sd.window,
          soldUnseen: sd.unseen,
          price: Number(saleOn(v, now) ? v.salePrice : v.price),
          onSale: saleOn(v, now),
          ...f,
        };
      });
    const total = forecastProduct(vs);
    const stock = vs.reduce((n, v) => n + v.stock, 0);
    const stockValue = Math.round(vs.reduce((n, v) => n + Math.max(0, v.stock) * v.price, 0));
    const soldUnseen = vs.reduce((n, v) => n + v.soldUnseen, 0);
    const prices = vs.map((v) => v.price).filter((n) => n > 0);
    const price = prices.length ? Math.min(...prices) : 0;
    const base = { productId: p.id, title: p.title, slug: p.slug, category: p.category?.name ?? null, thumbUrl };
    products.push({
      ...base,
      rising,
      demand: { views7: dem.views7, viewsPrev7: dem.viewsPrev7, bags7: dem.bags7, bagsPrev7: dem.bagsPrev7 },
      status: total.status,
      stock,
      available: total.available,
      pace: roundPace(total.pace),
      daysLeft: roundDays(total.daysLeft),
      firstOutDays: roundDays(total.firstOutDays),
      reorder: total.reorder,
      soldWindow: total.soldWindow,
      variants: vs.map(({ soldUnseen: _u, price: _p, ...v }) => ({ ...v, pace: roundPace(v.pace), daysLeft: roundDays(v.daysLeft) })),
    });
    const ageDays = Math.floor((now - p.createdAt.getTime()) / DAY);
    const lv = lastViewed.get(p.id) ?? null;
    // On the shelf for longer than the window, something in stock, not one look and not one sale.
    if (stock > 0 && ageDays >= s.unseenDays && dem.viewsUnseen === 0 && soldUnseen === 0) {
      unseen.push({ ...base, stock, stockValue, price, ageDays, lastViewedAt: lv ? lv.toISOString() : null, onSale: vs.some((v) => v.onSale) });
    } else if (stock > 0 && dem.viewsUnseen >= LOOKED_NOT_BOUGHT_VIEWS && soldUnseen === 0) {
      lookedNotBought.push({ ...base, stock, stockValue, price, views: dem.viewsUnseen, bags: dem.bagsUnseen, onSale: vs.some((v) => v.onSale) });
    }
  }

  products.sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
      (a.firstOutDays ?? a.daysLeft ?? Infinity) - (b.firstOutDays ?? b.daysLeft ?? Infinity) ||
      b.pace - a.pace,
  );
  unseen.sort((a, b) => b.stockValue - a.stockValue);
  lookedNotBought.sort((a, b) => b.views - a.views);

  const since0 = firstDay._min.day;
  return {
    now,
    settings: s,
    /** The first day with popularity counts: "nobody looked" needs at least unseenDays of them. */
    viewsSince: since0 ? since0.toISOString() : null,
    viewsDays: since0 ? Math.floor((today.getTime() - since0.getTime()) / DAY) + 1 : 0,
    summary: {
      products: products.length,
      soldOut: products.filter((p) => p.status === "soldOut").length,
      soon: products.filter((p) => p.status === "soon").length,
      watch: products.filter((p) => p.status === "watch").length,
      reorderPieces: products.reduce((n, p) => n + p.reorder, 0),
      unseen: unseen.length,
      unseenValue: unseen.reduce((n, p) => n + p.stockValue, 0),
      lookedNotBought: lookedNotBought.length,
    },
    products: products.slice(0, 300),
    unseen: unseen.slice(0, 100),
    lookedNotBought: lookedNotBought.slice(0, 50),
  };
}

export async function stockInsightsNow(now = Date.now()) {
  const { forecast } = await readSellingSettings();
  return stockInsights(forecast, now);
}
