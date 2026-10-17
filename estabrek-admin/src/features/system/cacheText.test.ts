import { describe, expect, it } from "vitest";
import type { CacheConfig, CacheLimits } from "../../api/cache.api";
import {
  boostedTtlText,
  budgets,
  cachePatch,
  changedPaths,
  describeChanged,
  durationText,
  endPreviewUrl,
  formatBytes,
  motionOutOfRange,
  motionPatch,
  motionPreviewUrl,
  outOfRange,
  ratioText,
  savedText,
  shortKey,
  smoothText,
  timesText,
  togglePinned,
} from "./cacheText";

const ns = (ttlSeconds: number, share: number) => ({ enabled: true, ttlSeconds, staleSeconds: 60, browserSeconds: 0, policy: "smart" as const, share });
const base: CacheConfig = {
  enabled: true,
  memoryMb: 64,
  useRedis: true,
  namespaces: {
    settings: ns(300, 5),
    pages: ns(300, 10),
    categories: ns(1800, 5),
    products: ns(600, 30),
    listings: ns(120, 20),
    filters: ns(300, 10),
    sku: ns(30, 5),
    search: ns(60, 10),
    misc: ns(60, 5),
  },
  popularity: {
    enabled: true,
    halfLifeHours: 24,
    weightView: 1,
    weightWishlist: 3,
    weightBag: 5,
    weightPurchase: 10,
    maxTtlMultiplier: 4,
    hotCount: 50,
    warmCount: 20,
    warmOnChange: true,
    pinned: [],
  },
};
const limits: CacheLimits = {
  memoryMb: { min: 8, max: 1024 },
  ttlSeconds: { min: 5, max: 86400 },
  staleSeconds: { min: 0, max: 3600 },
  browserSeconds: { min: 0, max: 3600 },
  share: { min: 1, max: 100 },
  halfLifeHours: { min: 1, max: 720 },
  weight: { min: 0, max: 100 },
  maxTtlMultiplier: { min: 1, max: 12 },
  hotCount: { min: 0, max: 500 },
  warmCount: { min: 0, max: 200 },
};
const edit = (f: (c: CacheConfig) => void) => {
  const c: CacheConfig = JSON.parse(JSON.stringify(base));
  f(c);
  return c;
};

describe("cache settings changes", () => {
  it("sends only what changed", () => {
    const draft = edit((c) => {
      c.memoryMb = 128;
      c.namespaces.products.ttlSeconds = 900;
      c.namespaces.products.policy = "lfu";
    });
    expect(cachePatch(draft, base)).toEqual({ memoryMb: 128, namespaces: { products: { ttlSeconds: 900, policy: "lfu" } } });
    expect(changedPaths(draft, base)).toEqual(["memoryMb", "namespaces.products.ttlSeconds", "namespaces.products.policy"]);
    expect(cachePatch(base, base)).toEqual({});
  });

  it("names changes in Arabic", () => {
    expect(describeChanged(["namespaces.sku.ttlSeconds"])).toBe("الألوان والمقاسات والمخزون (SKU): مدة الصلاحية (TTL)");
    expect(describeChanged([])).toBe("بدون تغيير");
    expect(describeChanged(["enabled", "memoryMb", "useRedis", "namespaces.pages.share"])).toContain("و1 غيرها");
  });

  it("finds values out of range", () => {
    const draft = edit((c) => {
      c.memoryMb = 4;
      c.namespaces.sku.ttlSeconds = 2.5;
      c.namespaces.search.share = NaN;
    });
    expect(outOfRange(draft, limits)).toEqual(["memoryMb", "namespaces.sku.ttlSeconds", "namespaces.search.share"]);
    expect(outOfRange(base, limits)).toEqual([]);
  });

  it("splits the memory by the shares", () => {
    const b = budgets(base);
    expect(b.products).toBe(Math.floor((64 * 1024 * 1024 * 30) / 100));
    expect(Object.values(b).reduce((s, x) => s + x, 0)).toBeLessThanOrEqual(64 * 1024 * 1024);
  });
});

describe("cache numbers in words", () => {
  it("sizes, ratios and times", () => {
    expect(formatBytes(0)).toBe("0");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(64 * 1024 * 1024)).toBe("64 MB");
    expect(ratioText(null)).toBe("—");
    expect(ratioText(0.876)).toBe("88%");
    expect(durationText(30)).toBe("30 ثانية");
    expect(durationText(120)).toBe("دقيقتين");
    expect(durationText(600)).toBe("10 دقايق");
    expect(durationText(86400)).toBe("يوم");
    expect(savedText(450)).toBe("450 ms");
    expect(savedText(12_000)).toBe("12 ثانية");
    expect(savedText(30 * 60_000)).toBe("30 دقيقة");
  });

  it("short keys", () => {
    expect(shortKey("/v1/catalog/products/slug/rose")).toBe("/catalog/products/slug/rose");
    expect(shortKey("POST /v1/catalog/products/by-ids#abc")).toBe("POST /catalog/products/by-ids (…)");
  });
});

describe("popularity settings", () => {
  it("sends popularity changes, pinned list included", () => {
    const draft = edit((c) => {
      c.popularity.halfLifeHours = 6;
      c.popularity.pinned = ["p1"];
    });
    expect(cachePatch(draft, base)).toEqual({ popularity: { halfLifeHours: 6, pinned: ["p1"] } });
    expect(changedPaths(draft, base)).toEqual(["popularity.halfLifeHours", "popularity.pinned"]);
    expect(describeChanged(["popularity.pinned"])).toBe("المنتجات المثبّتة");
  });

  it("checks popularity numbers", () => {
    const draft = edit((c) => {
      c.popularity.halfLifeHours = 0;
      c.popularity.weightBag = 101;
    });
    expect(outOfRange(draft, limits)).toEqual(["popularity.halfLifeHours", "popularity.weightBag"]);
  });

  it("pins, unpins, and shows the longer TTL", () => {
    expect(togglePinned([], "a")).toEqual(["a"]);
    expect(togglePinned(["a", "b"], "a")).toEqual(["b"]);
    expect(togglePinned(Array.from({ length: 50 }, (_, i) => `p${i}`), "new")).toHaveLength(50);
    expect(timesText(4)).toBe("× 4");
    expect(timesText(2.345)).toBe("× 2.3");
    expect(boostedTtlText(600, 1)).toBe("10 دقايق");
    expect(boostedTtlText(600, 4)).toBe("10 دقايق ← 40 دقايق");
  });
});

describe("motion settings", () => {
  const motion = {
    sections: {
      hero: { on: true, smoothMs: 110 },
      opening: { on: true, smoothMs: 90 },
      study: { on: true, smoothMs: 90 },
      seasons: { on: true, smoothMs: 90 },
      collections: { on: true, smoothMs: 90 },
      campaign: { on: true, smoothMs: 90 },
    },
    keyframeSnap: true,
    maxStepMs: 250,
    maxFps: 120 as 30 | 45 | 60 | 90 | 120,
    adaptive: true,
    liteMemoryGb: 2,
    liteOnSaveData: true,
    phoneGlass: false,
    desktopDpr: 160,
    phoneDpr: 140,
    lazyPercent: 100,
    prebuild3d: true,
    prebuildAfterMs: 1500,
    rumPercent: 100,
    videoPreload: "auto" as const,
  };
  const motionLimits = {
    smoothMs: { min: 30, max: 300 },
    maxStepMs: { min: 50, max: 500 },
    liteMemoryGb: { min: 0, max: 8 },
    dpr: { min: 100, max: 200 },
    lazyPercent: { min: 25, max: 400 },
    prebuildAfterMs: { min: 0, max: 15000 },
    rumPercent: { min: 0, max: 100 },
  };
  const change = (f: (m: typeof motion) => void) => {
    const m = JSON.parse(JSON.stringify(motion));
    f(m);
    return m;
  };

  it("sends only what changed, a section's field included", () => {
    const draft = change((m) => {
      m.sections.seasons.on = false;
      m.maxFps = 60;
    });
    expect(motionPatch(draft, motion)).toEqual({ sections: { seasons: { on: false } }, maxFps: 60 });
    expect(motionPatch(motion, motion)).toEqual({});
    expect(describeChanged(["storefront.sections.seasons.on", "storefront.maxFps"])).toBe("الفصول (3D): الحركة، أعلى سرعة للـ 3D");
  });

  it("finds motion numbers out of range", () => {
    const draft = change((m) => {
      m.sections.hero.smoothMs = 10;
      m.lazyPercent = 500;
    });
    expect(motionOutOfRange(draft, motionLimits)).toEqual(["storefront.sections.hero.smoothMs", "storefront.lazyPercent"]);
    expect(motionOutOfRange(motion, motionLimits)).toEqual([]);
  });

  it("builds a preview link the shop can read back", () => {
    const url = motionPreviewUrl("https://shop.example/", change((m) => (m.maxFps = 45)));
    const value = new URL(url).searchParams.get("motion-preview")!;
    expect(value).not.toMatch(/[+/=]/);
    const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    expect(JSON.parse(json).maxFps).toBe(45);
    expect(endPreviewUrl("https://shop.example/")).toBe("https://shop.example/?motion-preview=off");
    expect(smoothText(65)).toBe("سريع");
    expect(smoothText(140)).toBe("سينمائي");
  });
});
