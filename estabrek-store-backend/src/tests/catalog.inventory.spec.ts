import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";

// Ids must look like cuids for the admin schemas.
const CAT = "ccat000001";
const M = "csizem0001";
const L = "csizel0001";
const XL = "csizexl001";
const P = "cprod00001";
const P2 = "cprod00002";
const BLACK = "citemblack";
const PINK = "citempink1";
const V_BM = "cvarbm0001";
const V_BL = "cvarbl0001";
const V_PM = "cvarpm0001";

async function seed() {
  await prisma.orderRequestItem.deleteMany();
  await resetDb();
  await prisma.category.create({ data: { id: CAT, name: "Abayas", slug: "abayas" } });
  await prisma.size.createMany({ data: [{ id: M, name: "M", order: 1 }, { id: L, name: "L", order: 2 }, { id: XL, name: "XL", order: 3 }] });
  await prisma.product.create({
    data: {
      id: P, title: "Rose Abaya", slug: "rose-abaya", isActive: true, categoryId: CAT,
      items: {
        create: [
          {
            id: BLACK, colorName: "Black", colorHex: "#111111", skuBase: "ABAYA-BLK",
            images: { create: [{ url: "https://example.com/black.jpg", isPrimary: true }] },
            variants: {
              create: [
                { id: V_BM, sku: "ABAYA-BLK-M", price: new Prisma.Decimal(250), stock: 5, lowStockThreshold: 2, size: { connect: { id: M } } },
                { id: V_BL, sku: "ABAYA-BLK-L", price: new Prisma.Decimal(260), stock: 1, lowStockThreshold: 2, size: { connect: { id: L } } },
              ],
            },
          },
          {
            id: PINK, colorName: "Pink", colorHex: "#f5c0d0", skuBase: "ABAYA-PNK",
            variants: { create: [{ id: V_PM, sku: "ABAYA-PNK-M", price: new Prisma.Decimal(250), stock: 0, size: { connect: { id: M } } }] },
          },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      id: P2, title: "Silk Hijab", slug: "silk-hijab", isActive: true, categoryId: CAT,
      items: { create: [{ colorName: "Beige", skuBase: "HIJAB-BEI", variants: { create: [{ sku: "HIJAB-BEI-M", price: new Prisma.Decimal(60), stock: 9, size: { connect: { id: M } } }] } }] },
    },
  });
}

/** The current graph as the admin would send it back (ids kept). */
async function graph() {
  const res = await request(app).get(`/v1/admin/catalog/products/${P}/full`).expect(200);
  return res.body.items.map((it: any) => ({
    id: it.id, colorName: it.colorName, colorHex: it.colorHex, skuBase: it.skuBase,
    images: it.images.map((im: any) => ({ id: im.id, url: im.url, isPrimary: im.isPrimary, position: im.position })),
    variants: it.variants.map((v: any) => ({ id: v.id, sizeId: v.sizeId, sku: v.sku, price: Number(v.price) })),
  }));
}

beforeEach(seed);

describe("Admin products list", () => {
  test("each product carries a summary: photo, prices, stock and SKUs", async () => {
    const res = await request(app).get("/v1/admin/catalog/products").expect(200);
    const abaya = res.body.find((p: any) => p.id === P);
    expect(abaya.items).toBeUndefined();
    expect(abaya.summary).toMatchObject({
      thumbUrl: "https://example.com/black.jpg",
      priceMin: 250,
      priceMax: 260,
      stockTotal: 6,
      variantCount: 3,
      outCount: 1,
      lowCount: 1,
    });
    expect(abaya.summary.skus).toEqual(expect.arrayContaining(["ABAYA-BLK-M", "ABAYA-PNK-M"]));
    expect(abaya.summary.colors.map((c: any) => c.name)).toEqual(["Black", "Pink"]);
  });

  test("searches by SKU", async () => {
    const res = await request(app).get("/v1/admin/catalog/products?q=hijab-bei").expect(200);
    expect(res.body.map((p: any) => p.id)).toEqual([P2]);
  });
});

describe("Saving the whole product", () => {
  test("stock that is not sent is kept (not reset to 0)", async () => {
    const items = await graph();
    await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items }).expect(200);
    const v = await prisma.productVariant.findUnique({ where: { id: V_BM } });
    expect(v?.stock).toBe(5);
  });

  test("a size can be removed and added again in the same save, reusing its SKU", async () => {
    const items = await graph();
    const black = items.find((it: any) => it.id === BLACK);
    black.variants = black.variants.filter((v: any) => v.id !== V_BL).concat({ sizeId: L, sku: "ABAYA-BLK-L", price: 270, stock: 4 });
    const res = await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items, deleteVariantIds: [V_BL] }).expect(200);
    const l = res.body.items.find((it: any) => it.id === BLACK).variants.find((v: any) => v.sizeId === L);
    expect(l).toMatchObject({ sku: "ABAYA-BLK-L", stock: 4 });
    expect(l.id).not.toBe(V_BL);
    expect(res.body.kept).toEqual({ variants: [], items: [] });
  });

  test("two sizes can swap SKUs", async () => {
    const items = await graph();
    const black = items.find((it: any) => it.id === BLACK);
    for (const v of black.variants) v.sku = v.id === V_BM ? "ABAYA-BLK-L" : "ABAYA-BLK-M";
    await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items }).expect(200);
    expect((await prisma.productVariant.findUnique({ where: { id: V_BM } }))?.sku).toBe("ABAYA-BLK-L");
    expect((await prisma.productVariant.findUnique({ where: { id: V_BL } }))?.sku).toBe("ABAYA-BLK-M");
  });

  test("the same SKU twice is refused with the code", async () => {
    const items = await graph();
    items[1].variants[0].sku = "ABAYA-BLK-M";
    const res = await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items }).expect(400);
    expect(res.body).toMatchObject({ error: "DUPLICATE_SKU", details: { skus: ["ABAYA-BLK-M"] } });
  });

  test("an SKU of another product is refused and names that product", async () => {
    const items = await graph();
    items[1].variants[0].sku = "hijab-bei-m";
    const res = await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items }).expect(409);
    expect(res.body.error).toBe("SKU_TAKEN");
    expect(res.body.details.products[0]).toMatchObject({ sku: "HIJAB-BEI-M", productId: P2, title: "Silk Hijab" });
    // nothing was changed
    expect((await prisma.productVariant.findUnique({ where: { id: V_PM } }))?.sku).toBe("ABAYA-PNK-M");
  });

  test("ids from another product are refused", async () => {
    const other = await prisma.productVariant.findFirst({ where: { sku: "HIJAB-BEI-M" } });
    const res = await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ deleteVariantIds: [other!.id] }).expect(400);
    expect(res.body.error).toBe("NOT_IN_PRODUCT");
    expect(await prisma.productVariant.count({ where: { id: other!.id } })).toBe(1);
  });

  test("a size with orders is kept at stock 0 instead of failing the save", async () => {
    await prisma.orderRequest.create({ data: { variantId: V_BM, quantity: 1, customerName: "Sara", phone: "0500000000", status: "NEW" } });
    const items = (await graph()).map((it: any) => (it.id === BLACK ? { ...it, variants: it.variants.filter((v: any) => v.id !== V_BM) } : it));
    const res = await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items, deleteVariantIds: [V_BM] }).expect(200);
    expect(res.body.kept.variants).toEqual([{ id: V_BM, sku: "ABAYA-BLK-M" }]);
    const v = await prisma.productVariant.findUnique({ where: { id: V_BM } });
    expect(v?.stock).toBe(0);
    const adj = await prisma.inventoryAdjustment.findMany({ where: { variantId: V_BM } });
    expect(adj.map((a) => a.delta)).toEqual([-5]);
  });

  test("adding a kept size back brings the same row back", async () => {
    await prisma.orderRequest.create({ data: { variantId: V_BM, quantity: 1, customerName: "Sara", phone: "0500000000", status: "NEW" } });
    const items = await graph();
    const black = items.find((it: any) => it.id === BLACK);
    black.variants = black.variants.filter((v: any) => v.id !== V_BM).concat({ sizeId: M, sku: "ABAYA-BLK-M", price: 255, stock: 3 });
    const res = await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items, deleteVariantIds: [V_BM] }).expect(200);
    const m = res.body.items.find((it: any) => it.id === BLACK).variants.find((v: any) => v.sizeId === M);
    expect(m).toMatchObject({ id: V_BM, sku: "ABAYA-BLK-M", stock: 3 });
    expect(res.body.kept.variants).toEqual([]);
  });

  test("a colour with orders is hidden instead of deleted", async () => {
    await prisma.orderRequest.create({ data: { variantId: V_PM, quantity: 1, customerName: "Sara", phone: "0500000000", status: "NEW" } });
    const items = (await graph()).filter((it: any) => it.id !== PINK);
    const res = await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items, deleteItemIds: [PINK] }).expect(200);
    expect(res.body.kept.items).toEqual([{ id: PINK, colorName: "Pink" }]);
    expect((await prisma.productItem.findUnique({ where: { id: PINK } }))?.isActive).toBe(false);
  });

  test("a new size's opening stock is written to the history", async () => {
    const items = await graph();
    items.find((it: any) => it.id === BLACK).variants.push({ sizeId: XL, sku: "ABAYA-BLK-XL", price: 270, stock: 6 });
    await request(app).put(`/v1/admin/catalog/products/${P}/full`).send({ items }).expect(200);
    const v = await prisma.productVariant.findFirst({ where: { sku: "ABAYA-BLK-XL" } });
    const adj = await prisma.inventoryAdjustment.findMany({ where: { variantId: v!.id } });
    expect(adj).toHaveLength(1);
    expect(adj[0]).toMatchObject({ delta: 6, beforeStock: 0, afterStock: 6 });
  });
});

describe("Stock page", () => {
  test("lists every SKU with its product, colour, size and totals", async () => {
    const res = await request(app).get("/v1/admin/inventory/variants").expect(200);
    expect(res.body.total).toBe(4);
    expect(res.body.totals).toMatchObject({ skus: 4, units: 15, out: 1, low: 1 });
    const row = res.body.rows.find((r: any) => r.sku === "ABAYA-BLK-L");
    expect(row).toMatchObject({ productId: P, productTitle: "Rose Abaya", colorName: "Black", size: "L", stock: 1, lowStockThreshold: 2, price: 260, imageUrl: "https://example.com/black.jpg" });
  });

  test("filters: sold out, low, search", async () => {
    const out = await request(app).get("/v1/admin/inventory/variants?stock=out").expect(200);
    expect(out.body.rows.map((r: any) => r.sku)).toEqual(["ABAYA-PNK-M"]);
    const low = await request(app).get("/v1/admin/inventory/variants?stock=low").expect(200);
    expect(low.body.rows.map((r: any) => r.sku)).toEqual(["ABAYA-BLK-L"]);
    const q = await request(app).get("/v1/admin/inventory/variants?q=hijab").expect(200);
    expect(q.body.rows.map((r: any) => r.sku)).toEqual(["HIJAB-BEI-M"]);
  });

  test("a scanned SKU finds exactly one size (any letter case); an unknown code is 404", async () => {
    const res = await request(app).get("/v1/admin/inventory/variants?sku=abaya-blk-m").expect(200);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0].variantId).toBe(V_BM);
    await request(app).get("/v1/admin/inventory/variants?sku=NOPE-1").expect(404);
  });

  test("bulk: set and add by SKU or id, each written to the history; bad rows reported", async () => {
    const res = await request(app)
      .post("/v1/admin/inventory/bulk")
      .send({
        reason: "Delivery",
        rows: [
          { sku: "abaya-blk-m", mode: "delta", value: 3 },
          { variantId: V_PM, mode: "set", value: 7, lowStockThreshold: 2 },
          { sku: "ABAYA-BLK-L", mode: "delta", value: -5 },
          { sku: "MISSING-1", mode: "set", value: 1 },
        ],
      })
      .expect(200);
    expect(res.body).toMatchObject({ updated: 2, failed: 2 });
    expect(res.body.results.map((r: any) => r.error ?? "ok")).toEqual(["ok", "ok", "NEGATIVE_STOCK", "NOT_FOUND"]);
    expect((await prisma.productVariant.findUnique({ where: { id: V_BM } }))?.stock).toBe(8);
    const pink = await prisma.productVariant.findUnique({ where: { id: V_PM } });
    expect(pink).toMatchObject({ stock: 7, lowStockThreshold: 2 });
    const adj = await prisma.inventoryAdjustment.findMany({ where: { reason: "Delivery" } });
    expect(adj).toHaveLength(2);
  });

  test("quick adjust accepts an empty reason", async () => {
    await request(app).post(`/v1/admin/inventory/variants/${V_BM}/adjust`).send({ mode: "delta", value: -1, reason: null }).expect(200);
    expect((await prisma.productVariant.findUnique({ where: { id: V_BM } }))?.stock).toBe(4);
  });

  test("history can be searched by product name or SKU", async () => {
    await request(app).post("/v1/admin/inventory/bulk").send({ rows: [{ sku: "HIJAB-BEI-M", mode: "delta", value: 1 }] }).expect(200);
    await request(app).post("/v1/admin/inventory/bulk").send({ rows: [{ sku: "ABAYA-BLK-M", mode: "delta", value: 1 }] }).expect(200);
    const res = await request(app).get("/v1/admin/inventory/adjustments?q=silk").expect(200);
    expect(res.body.rows.map((r: any) => r.sku)).toEqual(["HIJAB-BEI-M"]);
    expect(res.body.rows[0]).toMatchObject({ productId: P2, colorName: "Beige" });
  });
});
