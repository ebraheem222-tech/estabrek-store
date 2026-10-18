import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { revokeOrderInTx, syncDigitalStock } from "../modules/fulfillment/fulfillment.service.js";

// Codes sold one per piece (game keys, gift cards) with the database. Requests
// without a token run as the test owner. The seeded size cvariant01 (product p1)
// becomes a digital product that sells codes.

const codesUrl = "/v1/admin/catalog/products/p1/codes";
const stock = async () => (await prisma.productVariant.findUniqueOrThrow({ where: { id: "cvariant01" } })).stock;

async function clean() {
  await prisma.digitalCode.deleteMany();
  await prisma.adminNotification.deleteMany();
  await resetDb();
  await prisma.productType.deleteMany({ where: { slug: "game-keys" } });
}

async function order(qty = 1) {
  const r = await request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: "cvariant01", quantity: qty }], customerName: "ليلى", phone: "0599111222" });
  expect([200, 201]).toContain(r.status);
  return String(r.body.id);
}

const release = (id: string) => request(app).post(`/v1/admin/orders/${id}/delivery/release`);
const page = async (id: string) => {
  const o = await prisma.orderRequest.findUniqueOrThrow({ where: { id }, select: { accessToken: true } });
  return (await request(app).get(`/v1/orders/access/${o.accessToken}`).expect(200)).body;
};

beforeEach(async () => {
  await clean();
  await seedCatalog();
  const t = await prisma.productType.create({ data: { name: "أكواد ألعاب", slug: "game-keys", fulfillment: "DIGITAL", showColor: false, showSize: false } });
  await prisma.product.update({ where: { id: "p1" }, data: { typeId: t.id, redeemNote: "فعّليه من Steam ← المكتبة" } });
});
afterAll(clean);

describe("Codes", () => {
  test("a list goes in encrypted; repeats skipped; the stock is what's left", async () => {
    const up = await request(app).post(codesUrl).send({ variantId: "cvariant01", text: "AAAA-1111\nBBBB-2222\naaaa-1111", batch: "فاتورة 17" }).expect(200);
    expect(up.body).toMatchObject({ added: 2, duplicates: 1, invalid: 0, available: 2 });
    expect(await stock()).toBe(2);
    const row = await prisma.digitalCode.findFirstOrThrow();
    expect(row.codeEnc).not.toContain("AAAA");
    expect(row.last4).toMatch(/^(1111|2222)$/);
    // The same list again: nothing new.
    expect((await request(app).post(codesUrl).send({ variantId: "cvariant01", text: "BBBB-2222" }).expect(200)).body).toMatchObject({ added: 0, duplicates: 1 });
    // Digital products never "run out"… except these: the stock stays the codes left.
    await syncDigitalStock({ productIds: ["p1"] });
    expect(await stock()).toBe(2);
    const sum = await request(app).get(codesUrl).expect(200);
    expect(sum.body.variants[0]).toMatchObject({ available: 2, delivered: 0 });
    expect(JSON.stringify(sum.body.codes)).not.toContain("AAAA");
  });

  test("checkout can't take more than the codes left; a save can't change the count", async () => {
    await request(app).post(codesUrl).send({ variantId: "cvariant01", text: "AAAA-1111\nBBBB-2222" }).expect(200);
    const r = await request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: "cvariant01", quantity: 3 }], customerName: "ليلى", phone: "0599111222" });
    expect(r.status).toBe(409);
    expect(r.body.error).toBe("OUT_OF_STOCK");
    // Handed out: no longer held by the order (the count already went down).
    const id = await order(1);
    await release(id).expect(200);
    const quote = await request(app).post("/v1/catalog/cart-quote").send({ items: [{ variantId: "cvariant01", quantity: 1 }] }).expect(200);
    expect(quote.body.lines[0].available).toBe(1);
    expect(quote.body.lines[0]).not.toHaveProperty("sellsCodes");
    await prisma.productVariant.update({ where: { id: "cvariant01" }, data: { stock: 100000 } });
    await syncDigitalStock({ productIds: ["p1"] });
    expect(await stock()).toBe(1);
  });

  test("a paid order gets one per piece, shown on her page with how to use it", async () => {
    await request(app).post(codesUrl).send({ variantId: "cvariant01", text: "AAAA-1111\nBBBB-2222\nCCCC-3333" }).expect(200);
    const id = await order(2);
    await release(id).expect(200);
    expect(await stock()).toBe(1);
    const p = await page(id);
    expect(p.codes).toHaveLength(2);
    expect(p.codes[0]).toMatchObject({ title: "Blue Shirt", redeemNote: "فعّليه من Steam ← المكتبة" });
    expect(["AAAA-1111", "BBBB-2222"]).toContain(p.codes[0].code);
    expect(await prisma.digitalCode.count({ where: { orderRequestId: id, viewedAt: { not: null } } })).toBe(2);
    // Releasing again doesn't take more.
    await release(id).expect(200);
    expect(await prisma.digitalCode.count({ where: { orderRequestId: id } })).toBe(2);
  });

  test("cancelled before she looked: the codes go back; a bad one is replaced", async () => {
    await request(app).post(codesUrl).send({ variantId: "cvariant01", text: "AAAA-1111\nBBBB-2222" }).expect(200);
    const a = await order();
    await release(a).expect(200);
    await prisma.$transaction((tx) => revokeOrderInTx(tx, a));
    expect(await prisma.digitalCode.count({ where: { status: "available" } })).toBe(2);
    expect(await stock()).toBe(2);

    const b = await order();
    await release(b).expect(200);
    const mine = await prisma.digitalCode.findFirstOrThrow({ where: { orderRequestId: b } });
    const after = await request(app).post(`/v1/admin/orders/${b}/delivery/codes/${mine.id}/replace`).expect(200);
    expect(after.body.codes.map((c: any) => c.status).sort()).toEqual(["delivered", "void"]);
    const full = await request(app).post(`/v1/admin/orders/${b}/delivery/codes/${mine.id}/reveal`).expect(200);
    expect(["AAAA-1111", "BBBB-2222"]).toContain(full.body.code);
  });

  test("ran out: the order says so and the admin bell rings; the product can't be deleted with codes left", async () => {
    await request(app).post(codesUrl).send({ variantId: "cvariant01", text: "AAAA-1111\nBBBB-2222" }).expect(200);
    const id = await order(2);
    // A bad code taken out after she ordered: one short when it's handed over.
    const bad = await prisma.digitalCode.findFirstOrThrow({ where: { status: "available" } });
    await request(app).post(`${codesUrl}/${bad.id}/void`).expect(200);
    await release(id).expect(200);
    expect(await prisma.digitalCode.count({ where: { orderRequestId: id } })).toBe(1);
    expect((await prisma.adminNotification.findFirstOrThrow()).title).toBe("الأكواد خلصت");
    const card = await request(app).get(`/v1/admin/orders/${id}/delivery`).expect(200);
    expect(card.body).toMatchObject({ sellsCodes: true, codesMissing: 1 });
    // More codes came: releasing again hands over the missing one.
    await request(app).post(codesUrl).send({ variantId: "cvariant01", text: "EEEE-5555" }).expect(200);
    expect((await release(id).expect(200)).body.codesMissing).toBe(0);

    await prisma.orderRequest.deleteMany();
    await prisma.digitalCode.deleteMany();
    await request(app).post(codesUrl).send({ variantId: "cvariant01", text: "DDDD-4444" }).expect(200);
    const del = await request(app).delete("/v1/admin/catalog/products/p1").expect(409);
    expect(del.body.code).toBe("PRODUCT_HAS_CODES");
  });
});
