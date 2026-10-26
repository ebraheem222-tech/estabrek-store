/**
 * Stock forecast (admin → توقّع المخزون), the pure part: how fast each size
 * sells, when it runs out, how many to reorder, and which products nobody looks
 * at. The numbers come from the orders (sold pieces) and the popularity counts
 * per day (views, bags); modules/admin/insights.service.ts reads them.
 *
 *   pace      pieces a day: half the last 7 days' pace + half the window's (28 days),
 *             or ¾ the last 7 days when the product is rising (more bags / views
 *             this week than the week before), so a sudden run shows up quickly.
 *   daysLeft  what can still be sold (stock minus what open orders hold) / pace.
 *   reorder   when it runs out before a new delivery could arrive (lead time + a
 *             week): enough for the lead time plus `coverDays` at the same pace.
 */

export type ForecastSettings = {
  /** Days of orders the long pace is taken from. */
  windowDays: number;
  /** Days a new delivery takes to arrive (from ordering to the shelf). */
  leadDays: number;
  /** Days of selling a reorder should cover after it arrives. */
  coverDays: number;
  /** "Nobody looked at it" after this many days without a view. */
  unseenDays: number;
};

export const FORECAST_DEFAULTS: ForecastSettings = { windowDays: 28, leadDays: 7, coverDays: 30, unseenDays: 30 };

export const FORECAST_LIMITS: Record<keyof ForecastSettings, { min: number; max: number }> = {
  windowDays: { min: 7, max: 90 },
  leadDays: { min: 0, max: 90 },
  coverDays: { min: 7, max: 180 },
  unseenDays: { min: 7, max: 120 },
};

export function mergeForecastSettings(saved: unknown): ForecastSettings {
  const s = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const out = { ...FORECAST_DEFAULTS };
  for (const k of Object.keys(FORECAST_DEFAULTS) as Array<keyof ForecastSettings>) {
    const v = Number(s[k]);
    if (Number.isInteger(v) && v >= FORECAST_LIMITS[k].min && v <= FORECAST_LIMITS[k].max) out[k] = v;
  }
  return out;
}

export type StockStatus = "soldOut" | "soon" | "watch" | "ok" | "noSales" | "empty";

/** Worst first (the order of the list). */
export const STATUS_ORDER: StockStatus[] = ["soldOut", "soon", "watch", "ok", "noSales", "empty"];

export type Demand = { views7: number; viewsPrev7: number; bags7: number; bagsPrev7: number };

/** More bags or views this week than the week before (and enough to mean something). */
export function isRising(d: Demand) {
  return (d.bags7 >= 3 && d.bags7 >= 1.5 * d.bagsPrev7) || (d.views7 >= 30 && d.views7 >= 1.5 * d.viewsPrev7);
}

export function paceOf(sold7: number, soldWindow: number, windowDays: number, rising: boolean) {
  const recent = sold7 / 7;
  const long = soldWindow / Math.max(7, windowDays);
  const w = rising ? 0.75 : 0.5;
  return w * recent + (1 - w) * long;
}

export type VariantForecast = {
  pace: number;
  daysLeft: number | null;
  status: StockStatus;
  reorder: number;
  /** Fewer than 3 sold in the window: a rough guess. */
  rough: boolean;
};

export function forecastVariant(v: { available: number; sold7: number; soldWindow: number }, s: ForecastSettings, rising: boolean): VariantForecast {
  const pace = paceOf(v.sold7, v.soldWindow, s.windowDays, rising);
  const rough = v.soldWindow < 3;
  if (v.available <= 0) {
    const reorder = pace > 0 ? Math.ceil(pace * (s.leadDays + s.coverDays)) : 0;
    return { pace, daysLeft: 0, status: pace > 0 ? "soldOut" : "empty", reorder, rough };
  }
  if (pace <= 0) return { pace, daysLeft: null, status: "noSales", reorder: 0, rough };
  const daysLeft = v.available / pace;
  const status: StockStatus = daysLeft <= s.leadDays ? "soon" : daysLeft <= s.leadDays + 14 ? "watch" : "ok";
  const reorderPoint = s.leadDays + 7;
  const reorder = daysLeft <= reorderPoint ? Math.max(0, Math.ceil(pace * (s.leadDays + s.coverDays)) - v.available) : 0;
  return { pace, daysLeft, status, reorder, rough };
}

/** A product from its sizes: what's left over all of them, and the first size to run out. */
export function forecastProduct(variants: Array<VariantForecast & { available: number; soldWindow: number }>) {
  const available = variants.reduce((s, v) => s + Math.max(0, v.available), 0);
  const pace = variants.reduce((s, v) => s + v.pace, 0);
  const worst = [...variants].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity))[0];
  return {
    available,
    pace,
    daysLeft: pace > 0 ? available / pace : null,
    status: worst?.status ?? ("empty" as StockStatus),
    firstOutDays: worst && (worst.status === "soon" || worst.status === "soldOut" || worst.status === "watch") ? worst.daysLeft : null,
    reorder: variants.reduce((s, v) => s + v.reorder, 0),
    soldWindow: variants.reduce((s, v) => s + v.soldWindow, 0),
  };
}

/** Rounded for the page: pieces a day with one decimal (two under 1), days whole. */
export const roundPace = (p: number) => (p >= 1 ? Math.round(p * 10) / 10 : Math.round(p * 100) / 100);
export const roundDays = (d: number | null) => (d == null ? null : d < 1 ? Math.round(d * 10) / 10 : Math.round(d));
