import { describe, expect, test } from "vitest";
import type { RumItem, RumReport } from "../../api/speed.api";
import { RUM_FEW, rumAdvice, rumCountText, rumLimitsText, rumRowName, rumValueText, sparkPath } from "./rumText";

const item = (over: Partial<RumItem>): RumItem => ({
  page: "product",
  device: "phone",
  os: "android",
  visits: 100,
  metrics: {},
  worse: [],
  daily: [],
  ...over,
});

describe("Shoppers' speed texts", () => {
  test("each measure in its own unit", () => {
    expect(rumValueText("lcp", 2430)).toBe("2.4 ث");
    expect(rumValueText("inp", 180)).toBe("180 ms");
    expect(rumValueText("cls", 0.0812)).toBe("0.08");
    expect(rumValueText("scrollFps", 57.6)).toBe("58 إطار/ث");
    expect(rumValueText("slowFrames", 3.25)).toBe("3.3%");
    expect(rumValueText("slowFrames", 22.4)).toBe("22%");
    expect(rumValueText("lcp", null)).toBe("—");
  });

  test("the limits, the right way round for frames a second", () => {
    expect(rumLimitsText("lcp", { better: "lower", good: 2500, poor: 4000 })).toBe("لحد 2.5 ث منيح · فوق 4.0 ث ضعيف");
    expect(rumLimitsText("scrollFps", { better: "higher", good: 55, poor: 30 })).toBe("من 55 إطار/ث وفوق منيح · تحت 30 إطار/ث ضعيف");
  });

  test("a row's name; the system only when split by it", () => {
    expect(rumRowName(item({}))).toBe("صفحة منتج · تلفون · Android");
    expect(rumRowName(item({ page: "checkout", device: "desktop", os: "all" }))).toBe("الدفع · كمبيوتر");
  });

  test("few visits are marked", () => {
    expect(rumCountText({ value: 1, rating: "good", count: 1240, avg: 1 })).toBe("1,240 زيارة");
    expect(rumCountText({ value: 1, rating: "good", count: RUM_FEW - 1, avg: 1 })).toContain("(قليل)");
    expect(rumCountText(undefined)).toBe("ما في قياس");
  });
});

describe("Advice", () => {
  const v = (rating: "good" | "okay" | "poor", count = 100) => ({ value: 1, rating, count, avg: 1 });

  test("weak measures get a tip, worst first, with where they're weak", () => {
    const report: Pick<RumReport, "overall" | "items"> = {
      overall: { lcp: v("okay"), inp: v("good"), scrollFps: v("good") },
      items: [
        item({ metrics: { scrollFps: v("poor") } }),
        item({ page: "home", metrics: { scrollFps: v("poor", 5) } }), // too few visits to blame
      ],
    };
    const a = rumAdvice(report);
    expect(a.map((x) => [x.metric, x.rating])).toEqual([
      ["scrollFps", "poor"],
      ["lcp", "okay"],
    ]);
    expect(a[0].where).toEqual(["صفحة منتج · تلفون · Android"]);
    expect(a[0].text).toContain("الزجاج");
  });

  test("all good: nothing to say", () => {
    expect(rumAdvice({ overall: { lcp: v("good") }, items: [item({ metrics: { lcp: v("good") } })] })).toEqual([]);
  });
});

describe("Sparkline", () => {
  test("one line through the days that have a number, newest on the left", () => {
    expect(sparkPath([], 100, 20)).toBe("");
    expect(sparkPath([null, null], 100, 20)).toBe("");
    // Oldest first: 1000 (90 px, bottom), 2000, no visits, 3000 (0 px, top).
    expect(sparkPath([1000, 2000, null, 3000], 90, 20)).toBe("M90 19L60 10L0 1");
  });
});
