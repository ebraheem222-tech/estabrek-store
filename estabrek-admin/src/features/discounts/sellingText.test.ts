import { describe, expect, test } from "vitest";
import { actionText, campaignLogText, campaignProblems, campaignWhat, fromLocalInput, priceActionText, suggestionSentence, toLocalInput } from "./sellingText";

const ils = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);

describe("Sale rule texts", () => {
  test("why each suggestion", () => {
    expect(suggestionSentence({ rule: "unseen", why: { days: 30, stock: 22, stockValue: 2640 } })).toBe(`ما حدا شافه من 30 يوم (22 قطعة، ${ils(2640)}).`);
    expect(suggestionSentence({ rule: "lookedNotBought", why: { days: 30, views: 340, bags: 4 } })).toBe("340 مشاهدة و4 للسلة بآخر 30 يوم، وولا بيعة.");
    expect(suggestionSentence({ rule: "hotLowStock", why: { views7: 120, bags7: 9, left: 2 } })).toBe("مطلوب كثير (120 مشاهدة و9 للسلة هالأسبوع) وباقي 2 بس.");
  });

  test("what approving does", () => {
    expect(actionText({ kind: "discount", percent: 10, saleDays: 14 }, { price: 50, newPrice: 45 })).toBe(`خصم 10% لمدة 14 يوم: ${ils(50)} ← ${ils(45)}`);
    expect(actionText({ kind: "discount", percent: 5, saleDays: 7 })).toBe("خصم 5% لمدة 7 أيام");
    expect(actionText({ kind: "endDiscount" })).toBe("وقّف الخصم: بيرجع لسعره العادي.");
  });

  test("a price change in the history", () => {
    const f = (price: number, salePrice: number | null) => ({ price, originalPrice: salePrice ? price : null, salePrice, saleStartsAt: null, saleEndsAt: null });
    expect(priceActionText({ changes: [{ variantId: "a", before: f(50, null), after: f(50, 45) }] })).toBe(`${ils(50)} ← ${ils(45)} · مقاس واحد`);
    expect(priceActionText({ changes: [1, 2, 3].map((i) => ({ variantId: String(i), before: f(50, 40), after: f(50, null) })) })).toBe(`${ils(40)} ← ${ils(50)} · 3 مقاسات`);
  });
});

describe("Season texts", () => {
  test("what it does and what happened", () => {
    const names = (id: string) => ({ c1: "حجاب", c2: "عبايات" })[id] ?? id;
    expect(campaignWhat({ themePresetId: "luxury_gold", percentOff: 20, categoryIds: ["c1", "c2"], productIds: [] }, () => "Luxury Paper", names)).toBe("الثيم: Luxury Paper · خصم 20% على حجاب، عبايات");
    expect(campaignWhat({ themePresetId: null, percentOff: 15, categoryIds: [], productIds: [] }, () => "", names)).toBe("خصم 15% على كل المنتجات");
    expect(
      campaignLogText({
        percentOff: 20,
        log: { start: { at: "", products: 4, sizes: 12, leftAlone: 2, theme: true }, end: { at: "", restored: 11, changedSince: 1, themeBack: false, early: false } },
      }),
    ).toBe("نزل الخصم على 12 مقاس (2 عليهم خصم تاني، تركناهم) · رجع السعر لـ 11 (1 تغيّروا بالنص، تركناهم) · الثيم ضل متل ما غيّرته");
    expect(campaignLogText({ percentOff: null, log: { missed: true } })).toBe("السيرفر كان مطفي طول الموسم: ما تغيّر شي.");
    expect(campaignLogText({ percentOff: null, log: null })).toBeNull();
  });

  test("the form: local time in and out, and its checks", () => {
    const iso = new Date(2026, 2, 10, 20, 30).toISOString();
    expect(toLocalInput(iso)).toBe("2026-03-10T20:30");
    expect(fromLocalInput("2026-03-10T20:30")).toBe(iso);
    expect(fromLocalInput("")).toBeNull();
    const now = Date.parse("2026-03-01T00:00:00Z");
    const ok = { name: "رمضان", startsAt: "2026-03-10T00:00:00Z", endsAt: "2026-04-09T00:00:00Z", themePresetId: "luxury_gold", percentOff: null, categoryIds: [] };
    expect(campaignProblems(ok, now)).toEqual([]);
    expect(campaignProblems({ ...ok, name: " ", themePresetId: null }, now)).toEqual(["اكتب اسم للموسم.", "اختار ثيم أو خصم (أو الاثنين)."]);
    expect(campaignProblems({ ...ok, endsAt: "2026-03-05T00:00:00Z" }, now)).toEqual(["النهاية لازم تكون بعد البداية."]);
    expect(campaignProblems({ ...ok, percentOff: 90 }, now)).toEqual(["الخصم من 1 لـ 70%."]);
  });
});
