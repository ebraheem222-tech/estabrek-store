import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { MemoryStore, type CacheEntry, type EvictionPolicy } from "../lib/cacheEngine.js";
import { applyCacheConfig, cacheDefaults, mergeCacheConfig, cacheChanges, type CacheConfig } from "../lib/cacheConfig.js";
import {
  decay,
  heatOf,
  isBot,
  notePurchases,
  noteSignals,
  pendingForTests,
  priorityOf,
  rankedProducts,
  refreshHot,
  resetPopularityForTests,
  scoreOf,
  setPopularityResolversForTests,
  storeDay,
  ttlMultiplier,
  warmList,
  onHotChange,
} from "../lib/popularity.js";
import { lifetimes, remember, resetCacheForTests, setBoundaryForTests, cacheSnapshot, purgeCache, isFresh } from "../lib/cache.js";
import { registerWarmer, resetWarmForTests, warmNow, warmStatus } from "../lib/cacheWarm.js";
import { noteQuery } from "../lib/dbWrites.js";

// The smart part of the cache: popularity scores from shoppers' signals, longer
// TTLs and eviction protection for popular products, and the warm-up. No database:
// product and variant lookups are replaced by a small fake catalog.

const PRODUCTS = new Set(["rose", "lily", "tulip", "daisy", "iris"]);
const VARIANTS = new Map([
  ["v-rose-m", "rose"],
  ["v-lily-s", "lily"],
]);
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const shopper = (n = 1) => ({ ip: `203.0.113.${n}`, userAgent: UA });
const T0 = Date.UTC(2026, 9, 16, 9, 0, 0);
const HOUR = 3600_000;

function config(over: (c: CacheConfig) => void = () => undefined) {
  const c = cacheDefaults();
  over(c);
  applyCacheConfig(c);
}

beforeEach(() => {
  resetPopularityForTests();
  resetCacheForTests();
  resetWarmForTests();
  setPopularityResolversForTests({
    products: async (ids) => ids.filter((id) => PRODUCTS.has(id)),
    variants: async (ids) => new Map(ids.flatMap((id) => (VARIANTS.has(id) ? [[id, VARIANTS.get(id)!] as const] : []))),
  });
  config();
  setBoundaryForTests("catalog", Infinity);
  setBoundaryForTests("cms", Infinity);
});
afterEach(() => {
  setPopularityResolversForTests(null);
  vi.useRealTimers();
});

describe("Scores", () => {
  test("halve every half-life", () => {
    expect(decay(8, T0, T0 + 24 * HOUR, 24 * HOUR)).toBeCloseTo(4, 9);
    expect(decay(8, T0, T0 + 72 * HOUR, 24 * HOUR)).toBeCloseTo(1, 9);
    expect(decay(8, T0, T0, 24 * HOUR)).toBe(8);
  });

  test("a view, a wishlist, a bag and a purchase weigh 1, 3, 5 and 10", async () => {
    await noteSignals([{ kind: "view", productId: "rose" }], shopper(1), T0);
    await noteSignals([{ kind: "wishlist", productId: "rose" }], shopper(1), T0);
    await noteSignals([{ kind: "bag", variantId: "v-rose-m" }], shopper(1), T0);
    await notePurchases([{ variantId: "v-rose-m", quantity: 1 }], T0);
    expect(scoreOf("rose", T0)).toBeCloseTo(19, 9);
    expect(scoreOf("rose", T0 + 24 * HOUR)).toBeCloseTo(9.5, 9);
    const p = pendingForTests().get("rose")!;
    expect(p).toMatchObject({ views: 1, wishlists: 1, bags: 1, purchases: 1 });
  });

  test("the same shopper repeating counts once per window; another shopper counts", async () => {
    await noteSignals([{ kind: "view", productId: "lily" }], shopper(1), T0);
    await noteSignals([{ kind: "view", productId: "lily" }], shopper(1), T0 + 60_000); // a refresh
    expect(scoreOf("lily", T0 + 60_000)).toBeCloseTo(decay(1, T0, T0 + 60_000, 24 * HOUR), 9);
    await noteSignals([{ kind: "view", productId: "lily" }], shopper(2), T0 + 60_000);
    await noteSignals([{ kind: "view", productId: "lily" }], shopper(1), T0 + 31 * 60_000); // 31 minutes later
    expect(pendingForTests().get("lily")!.views).toBe(3);
  });

  test("bots, unknown products and unknown variants don't count", async () => {
    expect(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot(UA)).toBe(false);
    expect(await noteSignals([{ kind: "view", productId: "rose" }], { ip: "1.2.3.4", userAgent: "curl/8.4.0" }, T0)).toBe(0);
    expect(await noteSignals([{ kind: "view", productId: "made-up" }, { kind: "bag", variantId: "v-none" }], shopper(), T0)).toBe(0);
    expect(scoreOf("rose", T0)).toBe(0);
    expect(cacheSnapshot().popularity.ignored).toMatchObject({ bots: 1, unknown: 2 });
  });

  test("a big order counts up to 5 times per product", async () => {
    await notePurchases([{ variantId: "v-lily-s", quantity: 40 }], T0);
    expect(scoreOf("lily", T0)).toBe(50);
  });

  test("switched off: nothing is counted", async () => {
    config((c) => (c.popularity.enabled = false));
    expect(await noteSignals([{ kind: "view", productId: "rose" }], shopper(), T0)).toBe(0);
    expect(await notePurchases([{ variantId: "v-rose-m", quantity: 1 }], T0)).toBe(0);
  });

  test("days follow the store's time zone", () => {
    // 23:30 UTC on the 16th is already the 17th in Jerusalem.
    expect(storeDay(Date.UTC(2026, 9, 16, 23, 30)).toISOString().slice(0, 10)).toBe("2026-10-17");
  });
});

/** rose: 100 views from different shoppers, lily: 10, tulip: 1. */
async function someTraffic() {
  for (let i = 0; i < 100; i++) await noteSignals([{ kind: "view", productId: "rose" }], shopper(i), T0);
  for (let i = 0; i < 10; i++) await noteSignals([{ kind: "view", productId: "lily" }], shopper(i), T0);
  await noteSignals([{ kind: "view", productId: "tulip" }], shopper(1), T0);
  refreshHot(T0);
}

describe("What popularity changes in the cache", () => {
  test("the most popular product gets the longest TTL, the others less (log scale)", async () => {
    await someTraffic();
    expect(heatOf("rose", T0)).toBe(1);
    expect(ttlMultiplier("rose", T0)).toBe(4);
    const lily = ttlMultiplier("lily", T0);
    const tulip = ttlMultiplier("tulip", T0);
    expect(lily).toBeGreaterThan(tulip);
    expect(lily).toBeLessThan(4);
    expect(tulip).toBeGreaterThan(1);
    expect(ttlMultiplier("daisy", T0)).toBe(1);
  });

  test("product pages of popular products stay fresh longer; grids don't change", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    await someTraffic();
    const ttl = cacheDefaults().namespaces.products.ttlSeconds * 1000;
    expect(lifetimes("products", T0, undefined, "rose").freshUntil).toBe(T0 + 4 * ttl);
    expect(lifetimes("products", T0, undefined, "daisy").freshUntil).toBe(T0 + ttl);
    expect(lifetimes("listings", T0, undefined, "rose").freshUntil).toBe(T0 + cacheDefaults().namespaces.listings.ttlSeconds * 1000);
    // Nothing goes past a sale's start or end, popular or not.
    setBoundaryForTests("catalog", T0 + 60_000);
    expect(lifetimes("products", T0, undefined, "rose").freshUntil).toBe(T0 + 60_000);
  });

  test("the top hotCount are popular (1), pinned ones are 2, the rest 0", async () => {
    config((c) => {
      c.popularity.hotCount = 2;
      c.popularity.pinned = ["iris"];
    });
    await someTraffic();
    expect(priorityOf("rose")).toBe(1);
    expect(priorityOf("lily")).toBe(1);
    expect(priorityOf("tulip")).toBe(0);
    expect(priorityOf("iris")).toBe(2);
    expect(ttlMultiplier("iris", T0)).toBe(4);
    expect(warmList(3)).toEqual(["iris", "rose", "lily"]);
    expect(rankedProducts(10, T0).map((x) => x.id)).toEqual(["iris", "rose", "lily", "tulip"]);
  });

  test("a change in the list is announced (the cache re-ranks what it holds)", async () => {
    let told = 0;
    const off = onHotChange(() => (told += 1));
    await someTraffic();
    expect(told).toBe(1);
    refreshHot(T0); // nothing new
    expect(told).toBe(1);
    off();
  });

  test("entries of popular products get their rank when stored and when the list changes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    remember("products", "/v1/catalog/products/lily", { body: "{}", status: 200, text: "{}", costMs: 3 }, undefined, undefined, "lily");
    await someTraffic();
    remember("products", "/v1/catalog/products/rose", { body: "{}", status: 200, text: "{}", costMs: 3 }, undefined, undefined, "rose");
    const top = cacheSnapshot().top;
    expect(cacheSnapshot().namespaces.find((n) => n.name === "products")!.entries).toBe(2);
    expect(top).toEqual([]); // nothing read yet
    expect(isFresh("products", "/v1/catalog/products/rose")).toBe(true);
  });
});

describe("Popular entries leave memory last", () => {
  const SIZE = 1000;
  const entry = (key: string, priority = 0): CacheEntry => ({
    key,
    body: "{}",
    bytes: SIZE,
    createdAt: T0,
    freshUntil: T0 + 60_000,
    staleUntil: T0 + 120_000,
    stamp: "s",
    costMs: 1,
    hits: 0,
    lastHit: T0,
    subject: key,
    priority,
  });

  for (const policy of ["lru", "fifo", "lfu", "smart"] as EvictionPolicy[]) {
    test(`${policy}: a crowd of new answers doesn't push out the popular one`, () => {
      const s = new MemoryStore("t", policy, 6 * SIZE);
      s.set(entry("hot", 1), T0);
      s.set(entry("pinned", 2), T0);
      for (let i = 0; i < 30; i++) s.set(entry(`new${i}`), T0 + i);
      expect(s.peek("hot")).toBeDefined();
      expect(s.peek("pinned")).toBeDefined();
      expect(s.size).toBe(6);
    });
  }

  test("when everything is popular, the less popular goes first", () => {
    const s = new MemoryStore("t", "lru", 4 * SIZE);
    s.set(entry("a", 1), T0);
    s.set(entry("b", 2), T0);
    s.set(entry("c", 1), T0);
    s.set(entry("d", 2), T0);
    s.set(entry("e", 2), T0);
    expect(s.peek("a")).toBeUndefined();
    expect(s.peek("b")).toBeDefined();
  });

  test("becoming popular moves an entry to the protected part (smart)", () => {
    const s = new MemoryStore("t", "smart", 10 * SIZE);
    s.set(entry("x"), T0);
    expect(s.protectedSize).toBe(0);
    s.reprioritize((id) => (id === "x" ? 1 : 0));
    expect(s.protectedSize).toBe(1);
    expect(s.peek("x")?.priority).toBe(1);
  });
});

describe("Warm-up", () => {
  test("builds pinned and popular products first, once at a time", async () => {
    config((c) => {
      c.popularity.warmCount = 2;
      c.popularity.pinned = ["iris"];
    });
    await someTraffic();
    const asked: string[][] = [];
    registerWarmer("fake", async (ids) => {
      asked.push(ids);
      await new Promise((r) => setTimeout(r, 20));
      return { built: ids.length, skipped: 0 };
    });
    const [a, b] = await Promise.all([warmNow("test"), warmNow("test-again")]);
    expect(a).toBe(b);
    expect(asked).toEqual([["iris", "rose"]]);
    expect(a).toMatchObject({ reason: "test", products: 2, built: 2, errors: 0 });
    expect(warmStatus().last?.built).toBe(2);
  });

  test("a product change and emptying the cache schedule one", async () => {
    await someTraffic();
    let runs = 0;
    registerWarmer("fake", async (ids) => {
      runs += 1;
      return { built: ids.length, skipped: 0 };
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    noteQuery('UPDATE "public"."ProductVariant" SET "stock" = $1');
    noteQuery('UPDATE "public"."ProductVariant" SET "stock" = $1');
    expect(warmStatus().scheduled).toBe(true);
    await vi.advanceTimersByTimeAsync(5_100);
    expect(runs).toBe(1);
    purgeCache("products");
    await vi.advanceTimersByTimeAsync(1_100);
    expect(runs).toBe(2);
    config((c) => (c.popularity.warmOnChange = false));
    noteQuery('UPDATE "public"."Product" SET "title" = $1');
    expect(warmStatus().scheduled).toBe(false);
  });

  test("nothing to build when popularity is off", async () => {
    config((c) => (c.popularity.enabled = false));
    registerWarmer("fake", async () => ({ built: 99, skipped: 0 }));
    expect((await warmNow("test")).built).toBe(0);
  });
});

describe("Settings", () => {
  test("popularity settings merge and fall back like the rest", () => {
    const m = mergeCacheConfig({ popularity: { halfLifeHours: 6, pinned: ["a", "a", "b"] } });
    expect(m.popularity).toMatchObject({ halfLifeHours: 6, pinned: ["a", "b"], weightView: 1 });
    expect(mergeCacheConfig({ popularity: { halfLifeHours: 0 } }).popularity).toEqual(cacheDefaults().popularity);
    expect(cacheChanges(cacheDefaults(), m)).toEqual(["popularity.halfLifeHours", "popularity.pinned"]);
  });
});

describe("The signals route", () => {
  let app: express.Express;
  // The shop's routes load a lot the first time (search, images…).
  beforeAll(async () => {
    process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/none";
    process.env.JWT_SECRET ||= "test-secret-at-least-16";
    const storefront = (await import("../modules/storefront/storefront.routes.js")).default;
    app = express();
    app.use(express.json());
    app.use("/v1/storefront", storefront);
  }, 60_000);

  test("takes a beacon (text/plain) and counts it", async () => {
    await request(app)
      .post("/v1/storefront/signals")
      .set("Content-Type", "text/plain")
      .set("User-Agent", UA)
      .send(JSON.stringify({ e: [{ k: "view", p: "rose" }, { k: "bag", v: "v-lily-s" }] }))
      .expect(204);
    expect(scoreOf("rose")).toBeGreaterThan(0);
    expect(scoreOf("lily")).toBeGreaterThan(4);
  });

  test("refuses junk and too many at once", async () => {
    await request(app).post("/v1/storefront/signals").set("Content-Type", "text/plain").send("not json").expect(400);
    await request(app).post("/v1/storefront/signals").send({ e: [{ k: "steal", p: "rose" }] }).expect(400);
    const many = Array.from({ length: 21 }, () => ({ k: "view", p: "rose" }));
    await request(app).post("/v1/storefront/signals").send({ e: many }).expect(400);
  });
});
