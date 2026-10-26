import { describe, test, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { applyCacheConfig, cacheConfig, cacheDefaults } from "../lib/cacheConfig.js";
import { resetCacheForTests } from "../lib/cache.js";
import { resetPopularityForTests } from "../lib/popularity.js";
import { registerCatalogWarmers } from "../modules/catalog/catalog.warm.js";

// The cache page (admin → السرعة والكاش) and the cache in front of the real
// routes. Requests without a token run as the test owner (NODE_ENV=test bypass).

const asMember = (id: string) => `Bearer ${signAccessToken({ sub: id, role: "STAFF", email: `${id}@t.local` })}`;

async function cleanSettings() {
  await prisma.performanceSettingsRevision.deleteMany();
  await prisma.performanceSettings.deleteMany();
  applyCacheConfig(cacheDefaults());
  resetCacheForTests();
}

beforeEach(async () => {
  invalidateAccess();
  await cleanSettings();
});

afterAll(async () => {
  await cleanSettings();
});

describe("Cache settings", () => {
  test("starts on the defaults, with the ranges, the rules and live numbers", async () => {
    const out = await request(app).get("/v1/admin/system/cache").expect(200);
    expect(out.body.config).toEqual(cacheDefaults());
    expect(out.body.limits.ttlSeconds).toEqual({ min: 5, max: 86_400 });
    expect(out.body.policies).toEqual(["smart", "lru", "fifo", "lfu"]);
    expect(out.body.live.namespaces.map((n: any) => n.name)).toEqual([
      "settings",
      "pages",
      "categories",
      "products",
      "listings",
      "filters",
      "sku",
      "search",
      "misc",
    ]);
    expect(out.body.revisions).toEqual([]);
  });

  test("a change is in force at once, keeps the old settings, and can be undone", async () => {
    const out = await request(app)
      .patch("/v1/admin/system/cache")
      .send({ memoryMb: 128, namespaces: { products: { ttlSeconds: 900, policy: "lfu" } } })
      .expect(200);
    expect(out.body.changed.sort()).toEqual(["memoryMb", "namespaces.products.policy", "namespaces.products.ttlSeconds"]);
    expect(cacheConfig().memoryMb).toBe(128);
    expect(cacheConfig().namespaces.products).toMatchObject({ ttlSeconds: 900, policy: "lfu" });

    const got = await request(app).get("/v1/admin/system/cache").expect(200);
    expect(got.body.revisions).toHaveLength(1);
    expect(got.body.live.namespaces.find((n: any) => n.name === "products").policy).toBe("lfu");
    await request(app).post(`/v1/admin/system/cache/revisions/${got.body.revisions[0].id}/restore`).expect(200);
    expect(cacheConfig()).toEqual(cacheDefaults());

    await request(app).patch("/v1/admin/system/cache").send({ useRedis: false }).expect(200);
    await request(app).post("/v1/admin/system/cache/reset").expect(200);
    expect(cacheConfig()).toEqual(cacheDefaults());
  });

  test("values out of range, unknown names and unknown rules are refused", async () => {
    await request(app).patch("/v1/admin/system/cache").send({ namespaces: { sku: { ttlSeconds: 1 } } }).expect(400);
    await request(app).patch("/v1/admin/system/cache").send({ memoryMb: 4096 }).expect(400);
    await request(app).patch("/v1/admin/system/cache").send({ namespaces: { nope: { ttlSeconds: 60 } } }).expect(400);
    await request(app).patch("/v1/admin/system/cache").send({ namespaces: { products: { policy: "random" } } }).expect(400);
    await request(app).post("/v1/admin/system/cache/purge").send({ namespace: "nope" }).expect(400);
    expect(await prisma.performanceSettingsRevision.count()).toBe(0);
  });

  test("team members without system access can't see or change it", async () => {
    const role = await prisma.staffRole.create({ data: { name: "r-cache", permissions: ["dashboard:read"] } });
    const m = await prisma.adminUser.create({
      data: {
        email: "cache-member@t.local",
        name: "cache-member",
        passwordHash: await argon2.hash("Member-pass-123", { type: argon2.argon2id }),
        role: "STAFF",
        staffRoleId: role.id,
      },
    });
    try {
      await request(app).get("/v1/admin/system/cache").set("Authorization", asMember(m.id)).expect(403);
      await request(app).post("/v1/admin/system/cache/purge").set("Authorization", asMember(m.id)).send({}).expect(403);
    } finally {
      await prisma.adminUser.delete({ where: { id: m.id } });
      await prisma.staffRole.delete({ where: { id: role.id } });
    }
  });
});

describe("The cache in front of the shop's routes", () => {
  beforeEach(async () => {
    await resetDb();
    await seedCatalog();
    resetCacheForTests();
  });

  test("a product page is served from memory until the product changes", async () => {
    const first = await request(app).get("/v1/catalog/products/slug/blue-shirt").expect(200);
    expect(first.headers["x-cache"]).toBe("MISS");
    const again = await request(app).get("/v1/catalog/products/slug/blue-shirt").expect(200);
    expect(again.headers["x-cache"]).toBe("HIT");
    expect(again.body.title).toBe("Blue Shirt");

    // Any write through Prisma (admin, orders, webhooks) clears it.
    await prisma.product.update({ where: { id: "p1" }, data: { title: "Navy Shirt" } });
    const after = await request(app).get("/v1/catalog/products/slug/blue-shirt").expect(200);
    expect(after.headers["x-cache"]).toBe("MISS");
    expect(after.body.title).toBe("Navy Shirt");
  });

  test("stock changes show at once", async () => {
    await request(app).get("/v1/catalog/products/p1").expect(200);
    await prisma.productVariant.update({ where: { id: "cvariant01" }, data: { stock: 0 } });
    const out = await request(app).get("/v1/catalog/products/p1").expect(200);
    expect(out.headers["x-cache"]).toBe("MISS");
    expect(out.body.items[0].variants[0].stock).toBe(0);
  });

  test("emptying from the admin starts the shop's caches over", async () => {
    await request(app).get("/v1/catalog/categories/tree").expect(200);
    expect((await request(app).get("/v1/catalog/categories/tree")).headers["x-cache"]).toBe("HIT");
    const out = await request(app).post("/v1/admin/system/cache/purge").send({ namespace: "categories" }).expect(200);
    expect(out.body).toMatchObject({ ok: true, namespace: "categories" });
    expect((await request(app).get("/v1/catalog/categories/tree")).headers["x-cache"]).toBe("MISS");

    const live = await request(app).get("/v1/admin/system/cache/live").expect(200);
    const categories = live.body.namespaces.find((n: any) => n.name === "categories");
    expect(categories.misses).toBeGreaterThanOrEqual(2);
    expect(categories.hits).toBeGreaterThanOrEqual(1);
  });

  test("switched off from the admin, every request goes to the database", async () => {
    await request(app).patch("/v1/admin/system/cache").send({ enabled: false }).expect(200);
    await request(app).get("/v1/catalog/products/p1").expect(200);
    const out = await request(app).get("/v1/catalog/products/p1").expect(200);
    expect(out.headers["x-cache"]).toBe("BYPASS");
  });
});

describe("Popularity (the smart part)", () => {
  const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

  beforeAll(() => registerCatalogWarmers());
  beforeEach(async () => {
    await resetDb();
    await seedCatalog();
    resetCacheForTests();
    resetPopularityForTests();
  });

  test("the shop's signals are counted, saved, and shown on the admin page", async () => {
    await request(app)
      .post("/v1/storefront/signals")
      .set("User-Agent", UA)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ e: [{ k: "view", p: "p1" }, { k: "bag", v: "cvariant01" }, { k: "view", p: "nope" }] }))
      .expect(204);

    // The page saves what's waiting first.
    const out = await request(app).get("/v1/admin/system/cache/popular").expect(200);
    const row = await prisma.productPopularity.findUnique({ where: { productId: "p1" } });
    expect(row).toMatchObject({ views: 1, bags: 1, wishlists: 0, purchases: 0 });
    expect(row!.score).toBeCloseTo(6, 2);
    expect(await prisma.productPopularityDay.count({ where: { productId: "p1" } })).toBe(1);

    expect(out.body.items).toHaveLength(1);
    expect(out.body.items[0]).toMatchObject({ productId: "p1", title: "Blue Shirt", slug: "blue-shirt", heat: 1, ttlMultiplier: 4 });
    expect(out.body.items[0].window).toEqual({ views: 1, wishlists: 0, bags: 1, purchases: 0 });
    expect(out.body.items[0].daily).toHaveLength(14);
    expect(out.body.items[0].daily.at(-1)).toMatchObject({ views: 1, bags: 1 });
    expect(out.body.store.at(-1)).toMatchObject({ views: 1, bags: 1 });

    // Deleting the product removes its popularity too (cascade).
    await resetDb();
    expect(await prisma.productPopularity.count()).toBe(0);
  });

  test("a pinned product is built in advance and the next shopper gets it from the cache", async () => {
    await request(app).patch("/v1/admin/system/cache").send({ popularity: { pinned: ["p1"] } }).expect(200);
    const warm = await request(app).post("/v1/admin/system/cache/warm").expect(200);
    expect(warm.body).toMatchObject({ reason: "admin", products: 1, errors: 0 });
    expect(warm.body.built).toBe(2); // by slug and by id

    const bySlug = await request(app).get("/v1/catalog/products/slug/blue-shirt").expect(200);
    expect(bySlug.headers["x-cache"]).toBe("HIT");
    expect(bySlug.body.title).toBe("Blue Shirt");
    const byId = await request(app).get("/v1/catalog/products/p1").expect(200);
    expect(byId.headers["x-cache"]).toBe("HIT");

    const live = await request(app).get("/v1/admin/system/cache/live").expect(200);
    expect(live.body.warm.last).toMatchObject({ reason: "admin", built: 2 });
    expect(live.body.popularity.pinned).toBe(1);
  });

  test("popularity settings are checked like the others", async () => {
    await request(app).patch("/v1/admin/system/cache").send({ popularity: { halfLifeHours: 0 } }).expect(400);
    await request(app).patch("/v1/admin/system/cache").send({ popularity: { surprise: 1 } }).expect(400);
    const ok = await request(app).patch("/v1/admin/system/cache").send({ popularity: { halfLifeHours: 6, weightView: 2 } }).expect(200);
    expect(ok.body.changed.sort()).toEqual(["popularity.halfLifeHours", "popularity.weightView"]);
  });
});

describe("The shop's motion settings", () => {
  test("saved with the cache settings, in the history, and sent with the public settings", async () => {
    const out = await request(app)
      .patch("/v1/admin/system/cache")
      .send({ storefront: { maxFps: 60, phoneGlass: true, sections: { seasons: { on: false } } } })
      .expect(200);
    expect(out.body.changed.sort()).toEqual(["storefront.maxFps", "storefront.phoneGlass", "storefront.sections.seasons.on"]);
    expect(out.body.storefront.sections.seasons).toEqual({ on: false, smoothMs: 90 });

    const page = await request(app).get("/v1/admin/system/cache").expect(200);
    expect(page.body.storefront.maxFps).toBe(60);
    expect(page.body.storefrontDefaults.maxFps).toBe(120);
    expect(page.body.fpsChoices).toEqual([30, 45, 60, 90, 120]);
    expect(page.body.revisions).toHaveLength(1);

    // The shop's public settings carry them (and the cached copy was cleared by the save).
    const pub = await request(app).get("/v1/settings").expect(200);
    expect(pub.body.site.performance).toMatchObject({ maxFps: 60, phoneGlass: true });
    expect(pub.body.site.performance.sections.seasons.on).toBe(false);

    // Restoring the version before puts both parts back.
    await request(app).post(`/v1/admin/system/cache/revisions/${page.body.revisions[0].id}/restore`).expect(200);
    const back = await request(app).get("/v1/settings").expect(200);
    expect(back.body.site.performance.maxFps).toBe(120);
  });

  test("motion values out of range or unknown are refused", async () => {
    await request(app).patch("/v1/admin/system/cache").send({ storefront: { maxFps: 75 } }).expect(400);
    await request(app).patch("/v1/admin/system/cache").send({ storefront: { sections: { hero: { smoothMs: 5 } } } }).expect(400);
    await request(app).patch("/v1/admin/system/cache").send({ storefront: { sections: { attic: { on: false } } } }).expect(400);
    await request(app).patch("/v1/admin/system/cache").send({ storefront: { turbo: true } }).expect(400);
  });
});
