import { describe, expect, test } from "vitest";
import { rateText, runningForText, splitText, startValues, valueText, verdictText, whatText } from "./abText";

const c = (over: object) => ({ rateA: 0.05, rateB: 0.06, lift: 0.2, confidence: 0.5, verdict: "same" as const, moreVisits: null, ...over });

describe("A/B test texts", () => {
  test("what's tested and its values", () => {
    expect(whatText("heroOpening", null)).toBe("افتتاحية الرئيسية");
    expect(whatText("motion", "maxFps")).toBe("أعلى سرعة للـ 3D");
    expect(valueText("heroOpening", null, "photo")).toBe("الصورة");
    expect(valueText("motion", "maxFps", 90)).toBe("90 إطار/ث");
    expect(valueText("motion", "phoneGlass", true)).toBe("شغّال");
    expect(valueText("motion", "maxStepMs", 150)).toBe("150 ms");
    expect(valueText("motion", "lazyPercent", 150)).toBe("150%");
  });

  test("A starts as the shop's value, B as a sensible other one", () => {
    expect(startValues("heroOpening", null, null)).toEqual({ a: "film", b: "photo" });
    expect(startValues("motion", "maxFps", { maxFps: 120 })).toEqual({ a: 120, b: 90 });
    expect(startValues("motion", "maxFps", { maxFps: 30 })).toEqual({ a: 30, b: 45 });
    expect(startValues("motion", "phoneGlass", { phoneGlass: false })).toEqual({ a: false, b: true });
    expect(startValues("motion", "lazyPercent", { lazyPercent: 100 })).toEqual({ a: 100, b: 150 });
    expect(startValues("motion", "desktopDpr", { desktopDpr: 190 })).toEqual({ a: 190, b: 160 });
    expect(startValues("motion", "videoPreload", { videoPreload: "auto" })).toEqual({ a: "auto", b: "metadata" });
  });

  test("the answer, in a sentence", () => {
    expect(verdictText(c({ verdict: "early" }), "bags")).toBe("لسا بكير: بدها زيارات وطلبات أكثر ليبين الفرق.");
    expect(verdictText(c({ rateA: 0.05, rateB: 0.075, confidence: 0.998, verdict: "B" }), "bags")).toBe("B بتجيب إضافات للسلة أكثر بـ 50% (متأكدين 99%).");
    expect(verdictText(c({ rateA: 0.08, rateB: 0.05, confidence: 0.97, verdict: "A" }), "orders")).toBe("A بتجيب طلبات أكثر بـ 60% (متأكدين 97%).");
    expect(verdictText(c({ confidence: 0.6, moreVisits: 4200 }), "bags")).toBe("ما في فرق واضح لهلّق (متأكدين 60%). بدها تقريباً 4,200 زيارة كمان لكل جهة.");
  });

  test("rates, split and how long", () => {
    expect(rateText(0.075)).toBe("7.5%");
    expect(rateText(0.25)).toBe("25%");
    expect(rateText(0)).toBe("0%");
    expect(splitText(30)).toBe("70% A · 30% B");
    const now = Date.parse("2026-10-17T12:00:00Z");
    expect(runningForText({ status: "running", startedAt: "2026-10-12T10:00:00Z", stoppedAt: null }, now)).toBe("صرلها 5 أيام");
    expect(runningForText({ status: "stopped", startedAt: "2026-10-01T00:00:00Z", stoppedAt: "2026-10-13T00:00:00Z" }, now)).toBe("اشتغلت 12 يوم");
    expect(runningForText({ status: "draft", startedAt: null, stoppedAt: null }, now)).toBeNull();
  });
});
