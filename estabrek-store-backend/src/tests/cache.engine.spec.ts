import { describe, test, expect } from "vitest";
import { MemoryStore, entryBytes, fadedHits, stableJson, stableQuery, type CacheEntry, type EvictionPolicy } from "../lib/cacheEngine.js";
import { groupsWritten } from "../lib/dbWrites.js";
import { cacheChanges, cacheDefaults, mergeCacheConfig, namespaceBudgets } from "../lib/cacheConfig.js";

// Pure parts of the cache: the memory stores and their eviction rules, the keys,
// which writes clear what, and the settings. No database needed.

const T0 = 1_000_000;
const SIZE = 1000; // every test entry takes exactly this many bytes

function entry(key: string, over: Partial<CacheEntry> = {}): CacheEntry {
  return {
    key,
    body: "{}",
    status: 200,
    bytes: SIZE,
    createdAt: T0,
    freshUntil: T0 + 60_000,
    staleUntil: T0 + 120_000,
    stamp: "s1",
    costMs: 5,
    hits: 0,
    lastHit: T0,
    ...over,
  };
}

/** A store with room for `slots` test entries. */
const storeOf = (policy: EvictionPolicy, slots: number) => new MemoryStore("t", policy, slots * SIZE);
const keys = (s: MemoryStore) => s.entries().map((e) => e.key).sort();

describe("Eviction rules", () => {
  test("LRU: the one used longest ago leaves first", () => {
    const s = storeOf("lru", 4);
    for (const k of ["a", "b", "c", "d"]) s.set(entry(k), T0);
    s.get("a", "s1", T0 + 1); // a is now the most recent
    s.set(entry("e"), T0 + 2);
    expect(keys(s)).toEqual(["a", "c", "d", "e"]);
    expect(s.stats.evictions.size).toBe(1);
  });

  test("FIFO: the first stored leaves first, uses don't matter", () => {
    const s = storeOf("fifo", 4);
    for (const k of ["a", "b", "c", "d"]) s.set(entry(k), T0);
    s.get("a", "s1", T0 + 1);
    s.get("a", "s1", T0 + 2);
    s.set(entry("e"), T0 + 3);
    expect(keys(s)).toEqual(["b", "c", "d", "e"]);
  });

  test("LFU: the least used leaves first", () => {
    const s = storeOf("lfu", 4);
    for (const k of ["a", "b", "c", "d"]) s.set(entry(k), T0);
    for (let i = 0; i < 5; i++) s.get("a", "s1", T0 + i);
    s.get("b", "s1", T0 + 10);
    s.get("d", "s1", T0 + 11);
    s.set(entry("e"), T0 + 20);
    expect(keys(s)).toEqual(["a", "b", "d", "e"]);
  });

  test("LFU: old uses fade (half every 10 minutes)", () => {
    expect(fadedHits({ hits: 8, lastHit: T0 }, T0)).toBe(8);
    expect(fadedHits({ hits: 8, lastHit: T0 }, T0 + 10 * 60_000)).toBeCloseTo(4, 6);
    expect(fadedHits({ hits: 8, lastHit: T0 }, T0 + 30 * 60_000)).toBeCloseTo(1, 6);
  });

  test("smart: a crawl through many pages once doesn't push out the popular ones", () => {
    const s = storeOf("smart", 10);
    for (const k of ["hot1", "hot2", "hot3"]) {
      s.set(entry(k), T0);
      s.get(k, "s1", T0 + 1); // second use → protected
    }
    for (let i = 0; i < 50; i++) s.set(entry(`bot${i}`), T0 + 10 + i);
    expect(s.peek("hot1")).toBeDefined();
    expect(s.peek("hot2")).toBeDefined();
    expect(s.peek("hot3")).toBeDefined();
    expect(s.protectedSize).toBe(3);
    expect(s.bytes).toBeLessThanOrEqual(10 * SIZE);
  });

  test("LRU on the same crawl loses the popular ones (why smart is the default)", () => {
    const s = storeOf("lru", 10);
    for (const k of ["hot1", "hot2", "hot3"]) {
      s.set(entry(k), T0);
      s.get(k, "s1", T0 + 1);
    }
    for (let i = 0; i < 50; i++) s.set(entry(`bot${i}`), T0 + 10 + i);
    expect(s.peek("hot1")).toBeUndefined();
  });

  test("smart: the protected part keeps at most 80% of the space", () => {
    const s = storeOf("smart", 10);
    for (let i = 0; i < 10; i++) {
      s.set(entry(`k${i}`), T0 + i);
      s.get(`k${i}`, "s1", T0 + i);
    }
    expect(s.protectedSize).toBe(8);
    expect(s.size).toBe(10);
  });

  test("a fresh copy of a protected answer stays protected and keeps its uses", () => {
    const s = storeOf("smart", 10);
    s.set(entry("p"), T0);
    s.get("p", "s1", T0 + 1);
    s.get("p", "s1", T0 + 2);
    s.set(entry("p", { createdAt: T0 + 5 }), T0 + 5);
    expect(s.protectedSize).toBe(1);
    expect(s.peek("p")?.hits).toBe(2);
  });
});

describe("Size, freshness and stamps", () => {
  test("never above its size; an answer too big for it isn't kept", () => {
    const s = storeOf("smart", 4);
    for (let i = 0; i < 20; i++) s.set(entry(`k${i}`), T0 + i);
    expect(s.bytes).toBeLessThanOrEqual(4 * SIZE);
    expect(s.set(entry("huge", { bytes: 2 * SIZE }), T0)).toBe(false); // > 25% of the store
    expect(s.stats.tooBig).toBe(1);
  });

  test("fresh, then stale, then gone", () => {
    const s = storeOf("lru", 4);
    s.set(entry("a"), T0);
    expect(s.get("a", "s1", T0 + 1000)?.fresh).toBe(true);
    expect(s.get("a", "s1", T0 + 90_000)?.fresh).toBe(false);
    expect(s.get("a", "s1", T0 + 130_000)).toBeUndefined();
    expect(s.stats.evictions.expired).toBe(1);
  });

  test("another stamp (the data changed) drops the entry", () => {
    const s = storeOf("lru", 4);
    s.set(entry("a"), T0);
    expect(s.get("a", "s2", T0 + 1)).toBeUndefined();
    expect(s.has("a")).toBe(false);
    expect(s.stats.evictions.invalidated).toBe(1);
  });

  test("sweep drops expired and out-of-date entries", () => {
    const s = storeOf("lru", 5);
    s.set(entry("old", { staleUntil: T0 + 10 }), T0);
    s.set(entry("other", { stamp: "s0" }), T0);
    s.set(entry("ok"), T0);
    expect(s.sweep(T0 + 100, (x) => x === "s1")).toBe(2);
    expect(keys(s)).toEqual(["ok"]);
  });

  test("a smaller size or another rule keeps what fits", () => {
    const s = storeOf("smart", 6);
    for (let i = 0; i < 6; i++) {
      s.set(entry(`k${i}`), T0 + i);
      s.get(`k${i}`, "s1", T0 + 10 + i);
    }
    s.configure("lru", 4 * SIZE, T0 + 20);
    expect(s.size).toBe(4);
    expect(s.rule).toBe("lru");
    expect(keys(s)).toEqual(["k2", "k3", "k4", "k5"]); // the most recently used stay
  });

  test("clear by prefix", () => {
    const s = storeOf("lru", 5);
    for (const k of ["page:ar:home", "page:en:home", "settings"]) s.set(entry(k), T0);
    expect(s.clear("manual", "page:")).toBe(2);
    expect(keys(s)).toEqual(["settings"]);
  });

  test("bytes count the key and the text", () => {
    expect(entryBytes("k", "1234")).toBe((1 + 4) * 2 + 160);
  });
});

describe("Keys", () => {
  test("query order doesn't matter", () => {
    expect(stableQuery({ b: "2", a: "1" })).toBe(stableQuery({ a: "1", b: "2" }));
    expect(stableQuery({ c: ["x", "y"] })).toBe("c=x&c=y");
    expect(stableQuery({})).toBe("");
  });

  test("body keys in any order give the same text", () => {
    expect(stableJson({ b: [1, { y: 1, x: 2 }], a: null })).toBe(stableJson({ a: null, b: [1, { x: 2, y: 1 }] }));
    expect(stableJson({ a: undefined, b: 1 })).toBe('{"b":1}');
  });
});

describe("Which writes clear what", () => {
  test("product, stock, page and settings writes", () => {
    expect(groupsWritten('UPDATE "public"."ProductVariant" SET "stock" = $1 WHERE "id" = $2')).toEqual(["catalog"]);
    expect(groupsWritten('INSERT INTO "public"."Product" ("id","slug") VALUES ($1,$2) RETURNING "id"')).toEqual(["catalog"]);
    expect(groupsWritten('DELETE FROM "public"."Category" WHERE "id" = $1')).toEqual(["catalog"]);
    expect(groupsWritten('UPDATE "public"."PageSection" SET "data" = $1')).toEqual(["cms"]);
    expect(groupsWritten('UPDATE "public"."SiteSettings" SET "siteName" = $1')).toEqual(["settings"]);
    expect(groupsWritten('INSERT INTO "public"."NavigationItem" ("id") VALUES ($1)')).toEqual(["cms", "settings"]);
  });

  test("reads and other tables don't; a TRUNCATE (backup restore) clears everything", () => {
    expect(groupsWritten('SELECT "public"."Product"."id" FROM "public"."Product"')).toEqual([]);
    expect(groupsWritten('INSERT INTO "public"."OrderRequest" ("id") VALUES ($1)')).toEqual([]);
    expect(groupsWritten("BEGIN")).toEqual([]);
    expect(groupsWritten('TRUNCATE "Product", "Page" CASCADE')).toEqual(["catalog", "cms", "settings"]);
  });
});

describe("Settings", () => {
  test("saved values on top of the defaults; broken parts fall back", () => {
    const merged = mergeCacheConfig({
      memoryMb: 128,
      namespaces: { products: { ttlSeconds: 900, policy: "lfu" }, listings: { ttlSeconds: -5 }, nope: { ttlSeconds: 1 } },
    });
    expect(merged.memoryMb).toBe(128);
    expect(merged.namespaces.products).toMatchObject({ ttlSeconds: 900, policy: "lfu", share: 30 });
    expect(merged.namespaces.listings).toEqual(cacheDefaults().namespaces.listings);
    expect(mergeCacheConfig({ memoryMb: 999999 }).memoryMb).toBe(cacheDefaults().memoryMb);
    expect(mergeCacheConfig(null)).toEqual(cacheDefaults());
  });

  test("changes are named field by field", () => {
    const a = cacheDefaults();
    const b = mergeCacheConfig({ useRedis: false, namespaces: { sku: { ttlSeconds: 15 } } });
    expect(cacheChanges(a, b)).toEqual(["useRedis", "namespaces.sku.ttlSeconds"]);
    expect(cacheChanges(a, a)).toEqual([]);
  });

  test("memory is split by the shares", () => {
    const budgets = namespaceBudgets(cacheDefaults());
    const total = Object.values(budgets).reduce((s, x) => s + x, 0);
    expect(total).toBeLessThanOrEqual(64 * 1024 * 1024);
    expect(total).toBeGreaterThan(64 * 1024 * 1024 - 20);
    expect(budgets.products).toBe(Math.floor((64 * 1024 * 1024 * 30) / 100));
  });
});
