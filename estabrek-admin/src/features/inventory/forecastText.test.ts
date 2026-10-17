import { describe, expect, test } from "vitest";
import type { ForecastProduct, ForecastVariant } from "../../api/insights.api";
import { daysText, filterProducts, forecastSentence, lastViewedText, paceText, reorderRows } from "./forecastText";

const v = (over: Partial<ForecastVariant>): ForecastVariant => ({
  variantId: "v",
  sku: "SKU",
  color: "أسود",
  colorHex: null,
  size: "M",
  stock: 4,
  held: 0,
  available: 4,
  sold7: 7,
  soldWindow: 28,
  onSale: false,
  pace: 1,
  daysLeft: 4,
  status: "soon",
  reorder: 33,
  rough: false,
  ...over,
});
const p = (over: Partial<ForecastProduct>): ForecastProduct => ({
  productId: "p",
  title: "حجاب شيفون",
  slug: "hijab",
  category: null,
  thumbUrl: null,
  rising: false,
  demand: { views7: 0, viewsPrev7: 0, bags7: 0, bagsPrev7: 0 },
  status: "soon",
  stock: 4,
  available: 4,
  pace: 1,
  daysLeft: 4,
  firstOutDays: 4,
  reorder: 33,
  soldWindow: 28,
  variants: [v({})],
  ...over,
});

describe("Stock forecast texts", () => {
  test("days and pace in words", () => {
    expect(daysText(0)).toBe("خلص");
    expect(daysText(0.4)).toBe("أقل من يوم");
    expect(daysText(1)).toBe("يوم");
    expect(daysText(2)).toBe("يومين");
    expect(daysText(4)).toBe("4 أيام");
    expect(daysText(15)).toBe("15 يوم");
    expect(paceText(2)).toBe("2 قطعة باليوم");
    expect(paceText(0.2)).toBe("قطعة كل 5 أيام");
    expect(paceText(0)).toBe("ما انباع");
  });

  test("“This hijab will sell out in about 4 days at the current pace”", () => {
    expect(forecastSentence(p({}))).toBe("بيخلص بعد حوالي 4 أيام على هالسرعة.");
    // With more sizes: which one goes first.
    const two = p({ firstOutDays: 2, variants: [v({ size: "L", daysLeft: 9, status: "watch" }), v({ size: "S", daysLeft: 2 })] });
    expect(forecastSentence(two)).toBe("S أسود بيخلص بعد حوالي يومين على هالسرعة.");
    expect(forecastSentence(p({ status: "soldOut", variants: [v({ status: "soldOut", daysLeft: 0 })] }))).toBe("خلص والناس عم تطلبه.");
    expect(forecastSentence(p({ status: "noSales" }))).toBe("ما انباع منه شي بهالمدة.");
    expect(forecastSentence(p({ firstOutDays: 0.5 }))).toBe("بيخلص خلال يوم على هالسرعة.");
  });

  test("last seen", () => {
    const now = Date.parse("2026-10-17T12:00:00Z");
    expect(lastViewedText(null, now)).toBe("ولا مشاهدة من ما بلّش العدّ");
    expect(lastViewedText("2026-09-01T00:00:00Z", now)).toBe("آخر مشاهدة قبل 46 يوم");
    expect(lastViewedText("2026-10-17T00:00:00Z", now)).toBe("آخر مشاهدة اليوم");
  });

  test("filters and the reorder list", () => {
    const list = [p({}), p({ productId: "ok", status: "ok", reorder: 0, variants: [v({ status: "ok", reorder: 0 })] })];
    expect(filterProducts(list, "urgent").map((x) => x.productId)).toEqual(["p"]);
    expect(filterProducts(list, "reorder").map((x) => x.productId)).toEqual(["p"]);
    expect(filterProducts(list, "all")).toHaveLength(2);
    const { head, rows } = reorderRows(list, { windowDays: 28, leadDays: 7, coverDays: 30, unseenDays: 30 });
    expect(head[6]).toBe("انباع آخر 28 يوم");
    expect(rows).toEqual([["SKU", "حجاب شيفون", "أسود", "M", 4, 7, 28, 1, 4, 33]]);
  });
});
