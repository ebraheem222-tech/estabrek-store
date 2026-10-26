import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { cacheResponse } from "../middleware/responseCache.js";
import { applyCacheConfig, cacheDefaults, type CacheConfig } from "../lib/cacheConfig.js";
import { cacheGet, cacheSet, cacheSnapshot, purgeCache, resetCacheForTests, setBoundaryForTests } from "../lib/cache.js";
import { noteQuery } from "../lib/dbWrites.js";

// The cache in front of the routes, on a small app of its own (no database):
// hits, keys, what is never cached, clearing on writes, stale copies while one
// request rebuilds, one build at a time, and sale/publish times.

let calls = 0;
let gate: Promise<void> | null = null;
let open: () => void = () => undefined;
/** The next builds wait until release() (to make requests overlap). */
function hold() {
  gate = new Promise<void>((resolve) => (open = resolve));
}
function release() {
  gate = null;
  open();
}

const app = express();
app.use(express.json());
app.get("/v1/catalog/products/:id", cacheResponse("products"), async (req, res) => {
  calls += 1;
  const n = calls;
  if (gate) await gate;
  if (req.params.id === "missing") return res.status(404).json({ error: "NOT_FOUND" });
  if (req.params.id === "boom") return res.status(500).json({ error: "BOOM" });
  res.json({ id: req.params.id, n });
});
app.post("/v1/catalog/products/by-ids", cacheResponse("listings"), (req, res) => {
  calls += 1;
  res.json({ items: req.body.ids, n: calls });
});
app.get("/v1/settings", cacheResponse("settings"), (_req, res) => {
  calls += 1;
  res.json({ n: calls });
});

const T0 = Date.UTC(2026, 9, 16, 12, 0, 0);
const later = (ms: number) => vi.setSystemTime(Date.now() + ms);

function config(over: (c: CacheConfig) => void = () => undefined) {
  const c = cacheDefaults();
  over(c);
  applyCacheConfig(c);
}

/** No sale or page change coming (no database to ask here). */
function calm() {
  setBoundaryForTests("catalog", Infinity);
  setBoundaryForTests("cms", Infinity);
}

/** A write as Prisma would run it (lib/prisma.ts passes every query on). */
function write(sql: string) {
  noteQuery(sql);
  calm();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  resetCacheForTests();
  config();
  calm();
  calls = 0;
  gate = null;
});
afterEach(() => {
  release();
  vi.useRealTimers();
});

describe("Serving from the cache", () => {
  test("the same request again comes from memory, whatever the query order", async () => {
    const a = await request(app).get("/v1/catalog/products/p1?b=2&a=1").expect(200);
    expect(a.headers["x-cache"]).toBe("MISS");
    const b = await request(app).get("/v1/catalog/products/p1?a=1&b=2").expect(200);
    expect(b.headers["x-cache"]).toBe("HIT");
    expect(b.body).toEqual(a.body);
    expect(b.headers["content-type"]).toMatch(/application\/json/);
    expect(calls).toBe(1);
    await request(app).get("/v1/catalog/products/p2").expect(200);
    expect(calls).toBe(2);
  });

  test("a POST with the same body (keys in any order) shares one entry", async () => {
    await request(app).post("/v1/catalog/products/by-ids").send({ ids: ["a", "b"], lite: true }).expect(200);
    const again = await request(app).post("/v1/catalog/products/by-ids").send({ lite: true, ids: ["a", "b"] }).expect(200);
    expect(again.headers["x-cache"]).toBe("HIT");
    const other = await request(app).post("/v1/catalog/products/by-ids").send({ ids: ["b", "a"], lite: true }).expect(200);
    expect(other.headers["x-cache"]).toBe("MISS");
    expect(calls).toBe(2);
  });

  test("not found is kept too; server errors and signed-in requests never are", async () => {
    await request(app).get("/v1/catalog/products/missing").expect(404);
    const nf = await request(app).get("/v1/catalog/products/missing").expect(404);
    expect(nf.headers["x-cache"]).toBe("HIT");

    await request(app).get("/v1/catalog/products/boom").expect(500);
    await request(app).get("/v1/catalog/products/boom").expect(500);

    const auth = await request(app).get("/v1/catalog/products/p1").set("Authorization", "Bearer x").expect(200);
    expect(auth.headers["x-cache"]).toBe("BYPASS");
    expect(calls).toBe(4);
  });

  test("a namespace (or the whole cache) switched off is passed through", async () => {
    config((c) => (c.namespaces.products.enabled = false));
    await request(app).get("/v1/catalog/products/p1").expect(200);
    const off = await request(app).get("/v1/catalog/products/p1").expect(200);
    expect(off.headers["x-cache"]).toBe("BYPASS");
    config((c) => (c.enabled = false));
    expect((await request(app).get("/v1/settings")).headers["x-cache"]).toBe("BYPASS");
    expect(calls).toBe(3);
  });

  test("browsers may keep it when the admin allows (otherwise no header is added)", async () => {
    const plain = await request(app).get("/v1/catalog/products/p1");
    expect(plain.headers["cache-control"]).toBeUndefined();
    config((c) => (c.namespaces.products.browserSeconds = 30));
    const hit = await request(app).get("/v1/catalog/products/p1");
    expect(hit.headers["cache-control"]).toBe("public, max-age=30, stale-while-revalidate=120");
  });
});

describe("Staying correct", () => {
  test("a write to products or stock clears the product caches, not the settings", async () => {
    await request(app).get("/v1/catalog/products/p1");
    await request(app).get("/v1/settings");
    write('UPDATE "public"."ProductVariant" SET "stock" = $1 WHERE "id" = $2');
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("MISS");
    expect((await request(app).get("/v1/settings")).headers["x-cache"]).toBe("HIT");
    write('UPDATE "public"."SiteSettings" SET "siteName" = $1');
    expect((await request(app).get("/v1/settings")).headers["x-cache"]).toBe("MISS");
  });

  test("writes elsewhere (orders, sessions) and reads leave it alone", async () => {
    await request(app).get("/v1/catalog/products/p1");
    write('INSERT INTO "public"."OrderRequest" ("id") VALUES ($1)');
    write('SELECT "public"."Product"."id" FROM "public"."Product" WHERE 1=1');
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("HIT");
  });

  test("an answer built right after a write is dropped 1.5 s later (the write may still have been committing)", async () => {
    write('UPDATE "public"."Product" SET "title" = $1');
    await request(app).get("/v1/catalog/products/p1");
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("HIT");
    await new Promise((r) => setTimeout(r, 1600));
    calm();
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("MISS");
  });

  test("an answer built while the data changed isn't kept", async () => {
    hold();
    const pending = request(app).get("/v1/catalog/products/p1").then((r) => r);
    await vi.waitFor(() => expect(calls).toBe(1));
    write('UPDATE "public"."Product" SET "title" = $1');
    release();
    await pending;
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("MISS");
  });

  test("nothing stays fresh past a sale's start or end", async () => {
    setBoundaryForTests("catalog", Date.now() + 2_000);
    await request(app).get("/v1/catalog/products/p1");
    later(1_000);
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("HIT");
    later(1_500);
    calm();
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("MISS");
  });

  test("emptying one namespace from the admin leaves the others", async () => {
    await request(app).get("/v1/catalog/products/p1");
    await request(app).get("/v1/settings");
    expect(purgeCache("products")).toBe(1);
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("MISS");
    expect((await request(app).get("/v1/settings")).headers["x-cache"]).toBe("HIT");
    purgeCache();
    expect((await request(app).get("/v1/settings")).headers["x-cache"]).toBe("MISS");
  });
});

describe("Under load", () => {
  test("after the TTL: one request rebuilds, the others get the previous copy at once", async () => {
    const first = await request(app).get("/v1/catalog/products/p1");
    later(cacheDefaults().namespaces.products.ttlSeconds * 1000 + 1_000); // past fresh, within stale
    hold();
    const rebuilding = request(app).get("/v1/catalog/products/p1").then((r) => r);
    await vi.waitFor(() => expect(calls).toBe(2));
    const meanwhile = await request(app).get("/v1/catalog/products/p1");
    expect(meanwhile.headers["x-cache"]).toBe("STALE");
    expect(meanwhile.body).toEqual(first.body);
    release();
    const rebuilt = await rebuilding;
    expect(rebuilt.headers["x-cache"]).toBe("MISS");
    expect(rebuilt.body.n).toBe(2);
    expect((await request(app).get("/v1/catalog/products/p1")).body.n).toBe(2);
  });

  test("past the stale window it's built again before answering", async () => {
    await request(app).get("/v1/catalog/products/p1");
    const c = cacheDefaults().namespaces.products;
    later((c.ttlSeconds + c.staleSeconds) * 1000 + 1_000);
    expect((await request(app).get("/v1/catalog/products/p1")).headers["x-cache"]).toBe("MISS");
  });

  test("identical requests arriving together build it once", async () => {
    hold();
    const a = request(app).get("/v1/catalog/products/p9").then((r) => r);
    await vi.waitFor(() => expect(calls).toBe(1));
    const b = request(app).get("/v1/catalog/products/p9").then((r) => r);
    await new Promise((r) => setTimeout(r, 50));
    release();
    const [ra, rb] = await Promise.all([a, b]);
    expect(calls).toBe(1);
    expect(ra.body).toEqual(rb.body);
    expect(rb.headers["x-cache"]).toBe("HIT");
  });
});

describe("Older callers and the numbers", () => {
  test("cacheGet/cacheSet keep working and are cleared by writes", async () => {
    await cacheSet("settings:public", { siteName: "Estabrek" }, 30_000);
    expect(await cacheGet("settings:public")).toEqual({ siteName: "Estabrek" });
    write('UPDATE "public"."SiteSettings" SET "siteName" = $1');
    expect(await cacheGet("settings:public")).toBeUndefined();
    await cacheSet("other:thing", 5, 1_000);
    expect(await cacheGet("other:thing")).toBe(5);
    later(1_500);
    expect(await cacheGet("other:thing")).toBeUndefined();
  });

  test("hits, misses, time saved and the busiest keys", async () => {
    for (let i = 0; i < 4; i++) await request(app).get("/v1/catalog/products/p1");
    await request(app).get("/v1/settings");
    const snap = cacheSnapshot();
    const products = snap.namespaces.find((n) => n.name === "products")!;
    expect(products).toMatchObject({ hits: 3, misses: 1, entries: 1, loads: 1, policy: "smart", on: true });
    expect(products.hitRatio).toBeCloseTo(0.75, 6);
    expect(snap.totals).toMatchObject({ hits: 3, misses: 2 });
    expect(snap.top[0]).toMatchObject({ ns: "products", key: "/v1/catalog/products/p1", hits: 3 });
    expect(snap.history.at(-1)).toMatchObject({ hits: 3, misses: 2 });
    expect(snap.redis.configured).toBe(!!process.env.REDIS_URL);
    expect(snap.memory.usedBytes).toBeGreaterThan(0);
  });
});
