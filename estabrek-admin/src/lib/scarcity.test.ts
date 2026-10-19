import { describe, expect, it } from "vitest";
import { normalizeScarcity, piecesLeftText, SCARCITY_DEFAULTS, sameScarcity, scarcityExamples, scarcityShows, scarcitySummary } from "./scarcity";

describe("«باقي قطعتان» setting", () => {
  it("keeps the old behaviour until the owner changes it", () => {
    expect(normalizeScarcity(undefined)).toEqual(SCARCITY_DEFAULTS);
    expect(normalizeScarcity(null)).toEqual({ enabled: true, showAt: 3, onPhoto: true, nearPrice: true });
  });

  it("reads a saved choice and keeps the count between 1 and 20", () => {
    expect(normalizeScarcity({ enabled: false, showAt: 5, onPhoto: false, nearPrice: true })).toEqual({ enabled: false, showAt: 5, onPhoto: false, nearPrice: true });
    expect(normalizeScarcity({ showAt: 0 }).showAt).toBe(1);
    expect(normalizeScarcity({ showAt: 99 }).showAt).toBe(20);
    expect(normalizeScarcity({ showAt: "7" }).showAt).toBe(7);
    expect(normalizeScarcity({ showAt: "x" }).showAt).toBe(3);
  });

  it("uses the storefront's wording", () => {
    expect(piecesLeftText(1)).toBe("آخر قطعة");
    expect(piecesLeftText(2)).toBe("باقي قطعتان");
    expect(piecesLeftText(5)).toBe("باقي 5 قطع");
    expect(piecesLeftText(12)).toBe("باقي 12 قطعة");
    expect(scarcityExamples(5).map((e) => e.text)).toEqual(["آخر قطعة", "باقي قطعتان", "باقي 5 قطع"]);
    expect(scarcityExamples(1).map((e) => e.text)).toEqual(["آخر قطعة"]);
    expect(scarcityExamples(2).map((e) => e.text)).toEqual(["آخر قطعة", "باقي قطعتان"]);
  });

  it("says what shoppers will see", () => {
    expect(scarcitySummary(SCARCITY_DEFAULTS)).toBe("بيبين على الصورة وجنب السعر لما يضل 3 قطع أو أقل.");
    expect(scarcitySummary({ ...SCARCITY_DEFAULTS, showAt: 1, nearPrice: false })).toBe("بيبين على الصورة بس لما تضل آخر قطعة.");
    expect(scarcitySummary({ ...SCARCITY_DEFAULTS, enabled: false })).toContain("ما بيشوفن");
    expect(scarcitySummary({ ...SCARCITY_DEFAULTS, onPhoto: false, nearPrice: false })).toContain("ما في مكان");
    expect(scarcityShows({ ...SCARCITY_DEFAULTS, onPhoto: false, nearPrice: false })).toBe(false);
    expect(sameScarcity(SCARCITY_DEFAULTS, { ...SCARCITY_DEFAULTS })).toBe(true);
    expect(sameScarcity(SCARCITY_DEFAULTS, { ...SCARCITY_DEFAULTS, showAt: 4 })).toBe(false);
  });
});
