import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";

// One history for everything (admin → السجل) with the database. Requests
// without a token run as the test owner. Seeded: p1 "Blue Shirt", SKU-BLUE-M, 10 left.

async function clean() {
  await prisma.productRevision.deleteMany();
  await prisma.settingsRevision.deleteMany();
  await prisma.siteSettings.deleteMany();
  await resetDb();
}

const history = async (area?: string) => (await request(app).get(`/v1/admin/history${area ? `?area=${area}` : ""}`).expect(200)).body;
const restore = (area: string, id: string) => request(app).post("/v1/admin/history/restore").send({ area, id });

beforeEach(async () => {
  await clean();
  await seedCatalog();
});
afterAll(clean);

describe("السجل", () => {
  test("a product edit, and back with one click", async () => {
    await request(app).patch("/v1/admin/catalog/products/p1").send({ title: "Red Shirt" }).expect(200);
    const h = await history("products");
    expect(h.entries[0]).toMatchObject({ area: "products", title: "Blue Shirt", what: ["edit"], restore: "before" });
    await restore("products", h.entries[0].id).expect(200);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: "p1" } })).title).toBe("Blue Shirt");
    // Going back was kept too: it can be undone.
    expect(await prisma.productRevision.count({ where: { reason: "restore" } })).toBe(1);
  });

  test("a deleted product comes back with its colour and size", async () => {
    await request(app).delete("/v1/admin/catalog/products/p1").expect(200);
    expect(await prisma.product.count({ where: { id: "p1" } })).toBe(0);
    const h = await history("products");
    expect(h.entries[0].what).toEqual(["delete"]);
    await restore("products", h.entries[0].id).expect(200);
    const back = await prisma.product.findUniqueOrThrow({ where: { id: "p1" }, include: { items: { include: { variants: true, images: true } } } });
    expect(back.slug).toBe("blue-shirt");
    expect(back.items[0].variants.map((v) => [v.sku, v.stock])).toEqual([["SKU-BLUE-M", 10]]);
    expect(back.items[0].images).toHaveLength(1);
  });

  test("a stock change undone with the opposite one, once", async () => {
    await request(app).post("/v1/admin/inventory/variants/cvariant01/adjust").send({ mode: "delta", value: -3, reason: "عدّ" }).expect((r) => expect([200, 201]).toContain(r.status));
    const h = await history("stock");
    const change = h.entries.find((e: any) => e.detail?.delta === -3);
    expect(change).toMatchObject({ restore: "undo", done: false });
    await restore("stock", change.id).expect(200);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: "cvariant01" } })).stock).toBe(10);
    await restore("stock", change.id).expect(409);
    expect((await history("stock")).entries.find((e: any) => e.id === change.id).done).toBe(true);
  });

  test("settings, and the day's view across parts", async () => {
    await request(app).patch("/v1/admin/settings").send({ siteName: "متجر تاني" }).expect(200);
    const h = await history();
    const s = h.entries.find((e: any) => e.area === "settings");
    expect(s.what).toContain("siteName");
    await restore("settings", s.id).expect(200);
    expect((await prisma.siteSettings.findFirstOrThrow()).siteName).not.toBe("متجر تاني");
    // Nothing from tomorrow.
    const tomorrow = new Date(Date.now() + 86400_000).toISOString();
    expect((await request(app).get(`/v1/admin/history?from=${tomorrow}`).expect(200)).body.entries).toEqual([]);
    await restore("nope", "x").expect(400);
  });
});
