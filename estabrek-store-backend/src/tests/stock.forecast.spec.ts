import { describe, test, expect } from "vitest";
import { FORECAST_DEFAULTS, forecastProduct, forecastVariant, isRising, mergeForecastSettings, paceOf, roundDays, roundPace } from "../lib/stockForecast.js";

// Stock forecast (توقّع المخزون): pace, days left, reorder. No database.

const s = FORECAST_DEFAULTS; // window 28, lead 7, cover 30

describe("Pace", () => {
  test("half the last week, half the window", () => {
    expect(paceOf(7, 28, 28, false)).toBe(1); // 1/day both ways
    expect(paceOf(14, 28, 28, false)).toBe(1.5); // 2/day lately, 1/day over the month
  });

  test("rising products lean on the last week", () => {
    expect(paceOf(14, 28, 28, true)).toBe(1.75);
    expect(isRising({ views7: 10, viewsPrev7: 2, bags7: 6, bagsPrev7: 3 })).toBe(true);
    expect(isRising({ views7: 40, viewsPrev7: 20, bags7: 0, bagsPrev7: 0 })).toBe(true);
    expect(isRising({ views7: 12, viewsPrev7: 2, bags7: 2, bagsPrev7: 0 })).toBe(false); // too few to mean anything
    expect(isRising({ views7: 40, viewsPrev7: 35, bags7: 4, bagsPrev7: 4 })).toBe(false);
  });
});

describe("When it runs out", () => {
  test("“sells out in about 4 days at the current pace”, and what to reorder", () => {
    const f = forecastVariant({ available: 4, sold7: 7, soldWindow: 28 }, s, false);
    expect(f).toMatchObject({ pace: 1, daysLeft: 4, status: "soon", rough: false });
    // Lead 7 + cover 30 at 1/day = 37, minus the 4 left.
    expect(f.reorder).toBe(33);
  });

  test("plenty left: watch, then fine, no reorder", () => {
    expect(forecastVariant({ available: 18, sold7: 7, soldWindow: 28 }, s, false)).toMatchObject({ status: "watch", reorder: 0 });
    expect(forecastVariant({ available: 60, sold7: 7, soldWindow: 28 }, s, false)).toMatchObject({ status: "ok", reorder: 0 });
    // Within a week after the lead time: time to reorder already.
    expect(forecastVariant({ available: 12, sold7: 7, soldWindow: 28 }, s, false).reorder).toBe(25);
  });

  test("sold out but selling: reorder a full lead + cover; never sold: nothing", () => {
    expect(forecastVariant({ available: 0, sold7: 7, soldWindow: 28 }, s, false)).toMatchObject({ status: "soldOut", daysLeft: 0, reorder: 37 });
    expect(forecastVariant({ available: 0, sold7: 0, soldWindow: 0 }, s, false)).toMatchObject({ status: "empty", reorder: 0 });
    expect(forecastVariant({ available: 5, sold7: 0, soldWindow: 0 }, s, false)).toMatchObject({ status: "noSales", daysLeft: null, reorder: 0, rough: true });
  });

  test("a product: what's left over its sizes, and the first size to go", () => {
    const m = { ...forecastVariant({ available: 2, sold7: 7, soldWindow: 28 }, s, false), available: 2, soldWindow: 28 };
    const l = { ...forecastVariant({ available: 40, sold7: 7, soldWindow: 28 }, s, false), available: 40, soldWindow: 28 };
    const p = forecastProduct([l, m]);
    expect(p).toMatchObject({ available: 42, pace: 2, daysLeft: 21, status: "soon", firstOutDays: 2, soldWindow: 56 });
    expect(p.reorder).toBe(m.reorder);
  });
});

describe("Settings and rounding", () => {
  test("only whole numbers in range are kept", () => {
    expect(mergeForecastSettings({ leadDays: 14, coverDays: 1000, windowDays: 7.5, unseenDays: "60" })).toEqual({ ...FORECAST_DEFAULTS, leadDays: 14, unseenDays: 60 });
    expect(mergeForecastSettings(null)).toEqual(FORECAST_DEFAULTS);
  });

  test("pieces a day and days for the page", () => {
    expect(roundPace(1.2345)).toBe(1.2);
    expect(roundPace(0.0333)).toBe(0.03);
    expect(roundDays(3.6)).toBe(4);
    expect(roundDays(0.44)).toBe(0.4);
    expect(roundDays(null)).toBeNull();
  });
});
