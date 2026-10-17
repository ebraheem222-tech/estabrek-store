import { describe, test, expect } from "vitest";
import { RULE_DEFAULTS, buildSuggestions, discountedPrice, mergeRuleSettings, saleActive, samePrice, withSale, withoutSale, type SuggestionInput } from "../lib/saleRules.js";

// Sale rules (البيع الذكي): what each rule suggests, the discounted price, and one
// size's price fields with and without a sale. No database.

const shelf = { title: "T", slug: "t", thumbUrl: null, stock: 10, stockValue: 1000, onSale: false, price: 100 };
const base = (over: Partial<SuggestionInput> = {}): SuggestionInput => ({
  rules: RULE_DEFAULTS,
  unseenDays: 30,
  unseen: [],
  lookedNotBought: [],
  products: [],
  hot: new Set(),
  skip: new Set(),
  ...over,
});
const product = (id: string, available: number, onSale: boolean, rising = false) => ({
  productId: id,
  title: id,
  slug: id,
  thumbUrl: null,
  available,
  rising,
  demand: { views7: 120, bags7: 9 },
  variants: [{ onSale }],
});

describe("Suggestions", () => {
  test("“Not viewed in 30 days → suggest 10% off”", () => {
    const out = buildSuggestions(base({ unseen: [{ ...shelf, productId: "u1", ageDays: 60, lastViewedAt: null }] }));
    expect(out).toEqual([
      expect.objectContaining({ rule: "unseen", productId: "u1", action: { kind: "discount", percent: 10, saleDays: 14 }, why: expect.objectContaining({ days: 30, price: 100, newPrice: 90 }) }),
    ]);
  });

  test("“Very popular and only 2 left → end its discount”", () => {
    const out = buildSuggestions(
      base({
        products: [product("hot", 2, true), product("cold", 2, true), product("rising", 1, true, true), product("plenty", 9, true), product("noSale", 1, false), product("gone", 0, true)],
        hot: new Set(["hot", "plenty", "noSale", "gone"]),
      }),
    );
    expect(out.map((s) => [s.rule, s.productId, s.action.kind])).toEqual([
      ["hotLowStock", "hot", "endDiscount"],
      ["hotLowStock", "rising", "endDiscount"],
    ]);
    expect(out[0].why).toMatchObject({ left: 2, views7: 120, bags7: 9 });
  });

  test("looked at but not bought: a smaller discount; already on sale or said no to: nothing", () => {
    const out = buildSuggestions(
      base({
        unseen: [{ ...shelf, productId: "onSale", ageDays: 60, lastViewedAt: null, onSale: true }, { ...shelf, productId: "skipped", ageDays: 60, lastViewedAt: null }],
        lookedNotBought: [{ ...shelf, productId: "l1", views: 300, bags: 4 }],
        skip: new Set(["unseen|skipped"]),
      }),
    );
    expect(out.map((s) => [s.rule, s.productId])).toEqual([["lookedNotBought", "l1"]]);
    expect(out[0].action).toEqual({ kind: "discount", percent: 5, saleDays: 7 });
  });

  test("a rule switched off suggests nothing", () => {
    const rules = mergeRuleSettings({ unseen: { on: false } });
    expect(buildSuggestions(base({ rules, unseen: [{ ...shelf, productId: "u1", ageDays: 60, lastViewedAt: null }] }))).toEqual([]);
  });
});

describe("Prices", () => {
  test("whole shekels from 20 up; never the same price", () => {
    expect(discountedPrice(89, 10)).toBe(80);
    expect(discountedPrice(120, 15)).toBe(102);
    expect(discountedPrice(12.5, 10)).toBe(11.25);
    expect(discountedPrice(20, 1)).toBe(19.8); // 19.80 is under 20: cents
    expect(discountedPrice(25, 1)).toBe(24); // 24.75 rounds to 25 = the price: one less
  });

  test("a sale on a size keeps the regular price; ending it puts it back", () => {
    const now = Date.parse("2026-10-17T10:00:00Z");
    const plain = { price: 100, originalPrice: null, salePrice: null, saleStartsAt: null, saleEndsAt: null };
    const on = withSale(plain, 10, now, now + 14 * 86400_000);
    expect(on).toEqual({ price: 100, originalPrice: 100, salePrice: 90, saleStartsAt: "2026-10-17T10:00:00.000Z", saleEndsAt: "2026-10-31T10:00:00.000Z" });
    expect(saleActive(on, now + 1000)).toBe(true);
    expect(saleActive(on, now + 15 * 86400_000)).toBe(false);
    expect(withoutSale(on)).toEqual(plain);
    expect(samePrice(withoutSale(on), plain)).toBe(true);
    expect(samePrice(on, plain)).toBe(false);
  });

  test("settings: only values in range are kept", () => {
    expect(mergeRuleSettings({ unseen: { percent: 95, saleDays: 3 }, hotLowStock: { maxLeft: 0, on: false } })).toEqual({
      ...RULE_DEFAULTS,
      unseen: { ...RULE_DEFAULTS.unseen, saleDays: 3 },
      hotLowStock: { on: false, maxLeft: RULE_DEFAULTS.hotLowStock.maxLeft },
    });
  });
});
