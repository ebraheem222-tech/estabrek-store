import { describe, test, expect } from "vitest";
import { mergeStorefrontMotion, storefrontMotionChanges, storefrontMotionDefaults, StorefrontMotionSchema } from "../lib/storefrontMotion.js";
import { groupsWritten } from "../lib/dbWrites.js";

// The shop's motion settings (admin → السرعة والكاش → الحركة والتحميل). No database.

describe("Storefront motion settings", () => {
  test("the defaults are what the shop did before (hero 0.11 s, the rest 0.09 s, 120 fps…)", () => {
    const d = storefrontMotionDefaults();
    expect(d.sections.hero).toEqual({ on: true, smoothMs: 110 });
    expect(d.sections.campaign).toEqual({ on: true, smoothMs: 90 });
    expect(d).toMatchObject({ maxFps: 120, adaptive: true, liteMemoryGb: 2, phoneGlass: false, desktopDpr: 160, phoneDpr: 140, lazyPercent: 100, prebuildAfterMs: 1500, maxStepMs: 250 });
    expect(StorefrontMotionSchema.safeParse(d).success).toBe(true);
  });

  test("saved values on top of the defaults; broken ones fall back one by one", () => {
    const m = mergeStorefrontMotion({
      maxFps: 60,
      lazyPercent: 9999,
      videoPreload: "everything",
      sections: { seasons: { on: false }, hero: { smoothMs: 2 }, nope: { on: false } },
    });
    expect(m.maxFps).toBe(60);
    expect(m.lazyPercent).toBe(100);
    expect(m.videoPreload).toBe("auto");
    expect(m.sections.seasons).toEqual({ on: false, smoothMs: 90 });
    expect(m.sections.hero).toEqual({ on: true, smoothMs: 110 });
    expect(mergeStorefrontMotion(null)).toEqual(storefrontMotionDefaults());
    expect(mergeStorefrontMotion({ maxFps: 75 }).maxFps).toBe(120);
  });

  test("changes are named field by field", () => {
    const a = storefrontMotionDefaults();
    const b = mergeStorefrontMotion({ phoneGlass: true, sections: { study: { smoothMs: 140 } } });
    expect(storefrontMotionChanges(a, b)).toEqual(["storefront.sections.study.smoothMs", "storefront.phoneGlass"]);
    expect(storefrontMotionChanges(a, a)).toEqual([]);
  });

  test("saving them clears the cached public settings the shop reads", () => {
    expect(groupsWritten('UPDATE "public"."PerformanceSettings" SET "data" = $1')).toEqual(["settings"]);
  });
});
