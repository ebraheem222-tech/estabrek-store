import { afterAll, beforeAll, describe, expect, test } from "vitest";
import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import dataStore from "../modules/admin/dataStore.controller.js";
import { STORE_TABLES, changedAt, madeAt } from "../lib/storeTables.js";
import { STORE_IDS, storePermission } from "../lib/storeLinks.js";

// The rest of the store's tables in the data grid, to look at, and as the other end of a relation:
// product types, sizes, colours and sizes, stock movements, back-in-stock alerts, order lines,
// customers' requests, addresses, wishlists, newsletter subscribers, coupons and their uses,
// reviews and comments. With the database; requests without a token run as the test owner.
// (Products, categories, orders and customers: dataStore.spec.ts; the relation's rules: storeLinks.spec.ts.)

const base = "/v1/admin/data/store";
const PREFIX = "storerest-spec-";
type Row = { id: string; slug: string; data: Record<string, any>; createdAt: string | null; updatedAt: string | null };
const rows = (table: string, q: Record<string, unknown> = {}) => request(app).get(`${base}/${table}/rows`).query({ q: JSON.stringify(q) });
const read = async (table: string, q: Record<string, unknown> = {}) => (await rows(table, q).expect(200)).body.rows as Row[];
const ids = async (table: string, q: Record<string, unknown> = {}) => (await read(table, q)).map((r) => r.id);
const csv = async (table: string, q: Record<string, unknown> = {}) => (await request(app).get(`${base}/${table}/rows/export`).query({ q: JSON.stringify(q) }).expect(200)).text.slice(1).trim().split("\r\n");
const day = (d: string) => new Date(`${d}T10:00:00Z`);
// The tables the tests' reset doesn't empty may hold other specs' rows: this spec's own are asked for by their ids.
const mine = { field: "$slug", op: "startsWith", value: "st-" };

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await resetDb();
  // What the reset leaves: this spec's own rows of the tables it doesn't empty.
  await prisma.coupon.deleteMany({ where: { id: { startsWith: "st-" } } });
  await prisma.customerRequest.deleteMany({ where: { id: { startsWith: "st-" } } });
  await prisma.newsletterSubscriber.deleteMany({ where: { id: { startsWith: "st-" } } });
  await prisma.productType.deleteMany({ where: { id: { startsWith: "st-" } } });
  await prisma.adminUser.deleteMany({ where: { email: "keeper@storerest-spec.test" } });
}

beforeAll(async () => {
  await clean();
  await seedCatalog();
  await prisma.productType.create({ data: { id: "st-type", name: "Clothes", slug: "st-clothes", description: "Things to wear" } });
  await prisma.productType.create({ data: { id: "st-type2", name: "Courses", slug: "st-courses", fulfillment: "DIGITAL", showColor: false, showSize: false } });
  await prisma.product.update({ where: { id: "p1" }, data: { typeId: "st-type" } });
  await prisma.size.create({ data: { id: "s2", name: "L", order: 2, active: false } });
  await prisma.productVariant.create({ data: { id: "cvariant02", productItemId: "i1", sizeId: "s2", sku: "SKU-BLUE-L", price: new Prisma.Decimal(60), salePrice: new Prisma.Decimal(45), stock: 0, lowStockThreshold: 2 } });
  const keeper = await prisma.adminUser.create({ data: { email: "keeper@storerest-spec.test", name: "Stock keeper", passwordHash: "x", role: "STAFF", status: "ACTIVE" } });
  await prisma.inventoryAdjustment.createMany({
    data: [
      { id: "st-m1", variantId: "cvariant01", delta: 5, beforeStock: 5, afterStock: 10, reason: "New delivery", adminUserId: keeper.id, createdAt: day("2026-11-01") },
      { id: "st-m2", variantId: "cvariant02", delta: -3, beforeStock: 3, afterStock: 0, createdAt: day("2026-11-03") },
    ],
  });
  await prisma.user.create({ data: { id: "u1", name: "Sara", email: "sara@example.test" } });
  await prisma.user.create({ data: { id: "u2", name: "Lina", email: "lina@example.test" } });
  await prisma.orderRequest.createMany({
    data: [
      { id: "or1", variantId: "cvariant01", quantity: 2, customerName: "Sara", phone: "0599000001", total: new Prisma.Decimal(100), status: "NEW" },
      { id: "or2", variantId: "cvariant02", quantity: 1, customerName: "Lina", phone: "0599000002", total: new Prisma.Decimal(45), status: "SHIPPED" },
    ],
  });
  await prisma.orderRequestItem.createMany({
    data: [
      { id: "st-l1", orderRequestId: "or1", variantId: "cvariant01", quantity: 2, unitPrice: new Prisma.Decimal(50), lineSubtotal: new Prisma.Decimal(100), productId: "p1", productTitle: "Blue Shirt", colorName: "Blue", sizeName: "M", sku: "SKU-BLUE-M", createdAt: day("2026-11-01") },
      { id: "st-l2", orderRequestId: "or2", variantId: "cvariant02", quantity: 1, unitPrice: new Prisma.Decimal(45), lineSubtotal: new Prisma.Decimal(45), productId: "p1", productTitle: "Blue Shirt", createdAt: day("2026-11-02") },
    ],
  });
  await prisma.coupon.createMany({
    data: [
      { id: "st-c1", code: "EID10", discountType: "PERCENT", discountValue: new Prisma.Decimal(10), usageLimit: 100, usedCount: 1, startsAt: day("2026-11-01"), endsAt: day("2026-11-30"), note: "Eid", createdAt: day("2026-10-20") },
      { id: "st-c2", code: "VIP50", discountType: "FIXED", discountValue: new Prisma.Decimal(50), minCart: new Prisma.Decimal(200), isActive: false, phone: "0599000001", createdAt: day("2026-10-25") },
    ],
  });
  await prisma.couponRedemption.create({ data: { id: "st-r1", couponId: "st-c1", orderRequestId: "or2", phone: "0599000002", redeemedAt: day("2026-11-05") } });
  await prisma.review.createMany({
    data: [
      { id: "st-rv1", productId: "p1", userId: "u1", rating: 5, title: "Lovely", body: "Soft and warm", status: "APPROVED", createdAt: day("2026-11-06") },
      { id: "st-rv2", productId: "p1", rating: 2, body: "Too small for me", status: "PENDING", createdAt: day("2026-11-07") },
    ],
  });
  await prisma.productComment.create({ data: { id: "st-cm1", productId: "p1", userId: "u2", body: "Is it cotton?", status: "PENDING" } });
  await prisma.stockAlert.createMany({
    data: [
      { id: "st-a1", email: "wait@example.test", variantId: "cvariant02", productId: "p1", status: "WAITING", token: "st-token-1", createdAt: day("2026-11-08") },
      { id: "st-a2", email: "told@example.test", variantId: "cvariant02", productId: "p1", status: "SENT", token: "st-token-2", notifiedAt: day("2026-11-10"), createdAt: day("2026-11-04") },
    ],
  });
  await prisma.customerRequest.createMany({
    data: [
      { id: "st-q1", kind: "SIZE", name: "Maya", phone: "0599000003", productId: "p1", wantedSize: "XL", createdAt: day("2026-11-09") },
      { id: "st-q2", kind: "CALLBACK", status: "DONE", name: "Noor", phone: "0599000004", email: "noor@example.test", details: "Call me after five", createdAt: day("2026-11-02") },
    ],
  });
  await prisma.address.createMany({
    data: [
      { id: "st-ad1", userId: "u1", fullName: "Sara K", phone: "0599000001", city: "Ramallah", address: "Main st 5", label: "Home", isDefault: true, createdAt: day("2026-11-01") },
      { id: "st-ad2", userId: "u2", fullName: "Lina O", phone: "0599000002", city: "Nablus", address: "Old town", createdAt: day("2026-11-02") },
    ],
  });
  await prisma.wishlistItem.create({ data: { id: "st-w1", userId: "u1", productId: "p1" } });
  await prisma.newsletterSubscriber.createMany({ data: [{ id: "st-n1", email: "news@example.test", source: "footer", createdAt: day("2026-11-01") }, { id: "st-n2", email: "more@example.test", createdAt: day("2026-11-02") }] });
});
afterAll(clean);

describe("Every store table is in the grid", () => {
  test("the list, in the catalogue's, the stock's, the orders', the customers', the discounts' and the words' order; the dates each keeps", async () => {
    const out = (await request(app).get(base).expect(200)).body as Array<{ slug: string; items: number; hasAddress: boolean; made: boolean; changed: boolean; readOnly: boolean; name: Record<string, string> }>;
    expect(out.map((t) => [t.slug, t.hasAddress, t.made, t.changed])).toEqual([
      ["products", true, true, true],
      ["categories", true, true, true],
      ["types", true, true, true],
      ["sizes", false, false, false],
      ["variants", false, true, true],
      ["movements", false, true, false],
      ["alerts", false, true, true],
      ["orders", false, true, true],
      ["lines", false, true, false],
      ["requests", false, true, true],
      ["customers", false, true, true],
      ["addresses", false, true, true],
      ["wishlist", false, true, false],
      ["subscribers", false, true, false],
      ["coupons", false, true, true],
      ["redemptions", false, true, false],
      ["reviews", false, true, true],
      ["comments", false, true, false],
    ]);
    // How many rows each holds (the ones the reset empties: exactly this spec's).
    const items = Object.fromEntries(out.map((t) => [t.slug, t.items]));
    expect([items.products, items.sizes, items.variants, items.movements, items.alerts, items.lines, items.addresses, items.wishlist, items.redemptions, items.reviews, items.comments]).toEqual([1, 2, 2, 2, 2, 2, 2, 1, 1, 2, 1]);
    for (const s of ["types", "requests", "subscribers", "coupons"]) expect(items[s], s).toBeGreaterThanOrEqual(2);
    expect(out.every((t) => t.readOnly && t.name.ar && t.name.en && t.name.he)).toBe(true);
    // Every column is named in the three languages; a choice's choices too.
    for (const t of Object.values(STORE_TABLES)) for (const c of t.columns) expect([t.id, c.id, !!c.name.ar && !!c.name.en && !!c.name.he, (c.options ?? []).every((o) => o.name.ar && o.name.en && o.name.he)]).toEqual([t.id, c.id, true, true]);
    // Each table is a relation's other end too, behind the same permission.
    expect(STORE_IDS).toEqual(Object.keys(STORE_TABLES));
    expect(STORE_IDS.map((s) => storePermission(s))).toEqual(Object.values(STORE_TABLES).map((t) => t.permission));
    expect([madeAt(STORE_TABLES.sizes), changedAt(STORE_TABLES.sizes), madeAt(STORE_TABLES.redemptions), madeAt(STORE_TABLES.orders), changedAt(STORE_TABLES.lines)]).toEqual([null, null, "redeemedAt", "createdAt", null]);
  });

  test("the catalogue: product types, sizes (no dates), colours and sizes (through the colour to its product)", async () => {
    expect((await read("types", { filters: [mine], sort: [{ field: "name", dir: "asc" }] })).map((r) => [r.slug, r.data])).toEqual([
      ["st-clothes", { name: "Clothes", about: "Things to wear", delivery: "SHIPPING", colour: true, size: true, products: 1 }],
      ["st-courses", { name: "Courses", delivery: "DIGITAL", colour: false, size: false, products: 0 }],
    ]);
    expect(await ids("types", { filters: [mine, { field: "delivery", op: "is", value: "digital" }] })).toEqual(["st-type2"]);
    expect(await ids("types", { filters: [mine, { field: "about", op: "empty" }] })).toEqual(["st-type2"]);
    // Sizes keep no dates: in their own order; a date isn't a column of theirs.
    const sizes = await read("sizes");
    expect(sizes.map((r) => [r.slug, r.data, r.createdAt, r.updatedAt])).toEqual([["s1", { name: "M", order: 1, active: true, variants: 1 }, null, null], ["s2", { name: "L", order: 2, active: false, variants: 1 }, null, null]]);
    expect(await ids("sizes", { filters: [{ field: "active", op: "isFalse" }] })).toEqual(["s2"]);
    expect(await ids("sizes", { sort: [{ field: "order", dir: "desc" }] })).toEqual(["s2", "s1"]);
    expect((await rows("sizes", { filters: [{ field: "$createdAt", op: "gte", value: "2026-11-01" }] }).expect(400)).body.message).toBe('No column "$createdAt" in this table');
    await rows("sizes", { sort: [{ field: "$updatedAt", dir: "asc" }] }).expect(400);
    expect(await csv("sizes")).toEqual(["id,name,order,active,variants", "s1,M,1,true,1", "s2,L,2,false,1"]);
    // A colour and size: its product is two rows away.
    expect((await read("variants", { sort: [{ field: "price", dir: "asc" }] })).map((r) => [r.id, r.data])).toEqual([
      ["cvariant01", { sku: "SKU-BLUE-M", product: "Blue Shirt", colour: "Blue", size: "M", price: 50, stock: 10, lowAt: 0 }],
      ["cvariant02", { sku: "SKU-BLUE-L", product: "Blue Shirt", colour: "Blue", size: "L", price: 60, salePrice: 45, stock: 0, lowAt: 2 }],
    ]);
    expect(await ids("variants", { filters: [{ field: "product", op: "contains", value: "SHIRT" }], sort: [{ field: "size", dir: "asc" }] })).toEqual(["cvariant02", "cvariant01"]);
    expect(await ids("variants", { filters: [{ field: "product", op: "is", value: "red coat" }] })).toEqual([]);
    expect(await ids("variants", { filters: [{ field: "salePrice", op: "notEmpty" }] })).toEqual(["cvariant02"]);
    expect(await ids("variants", { filters: [{ field: "stock", op: "is", value: 0 }] })).toEqual(["cvariant02"]);
    expect(await ids("variants", { search: "blue-l" })).toEqual(["cvariant02"]);
    expect(await ids("variants", { sort: [{ field: "product", dir: "desc" }, { field: "sku", dir: "asc" }] })).toEqual(["cvariant02", "cvariant01"]);
    // A row that must be there is never asked "is it missing": the question is answered, with nothing.
    expect(await ids("variants", { filters: [{ field: "product", op: "empty" }] })).toEqual([]);
    expect(await ids("products", { filters: [{ field: "category", op: "empty" }] })).toEqual([]);
    expect(await ids("products", { filters: [{ field: "kind", op: "notEmpty" }] })).toEqual(["p1"]);
  });

  test("the stock: movements (who did it may be nobody), alerts without who waits", async () => {
    const moves = await read("movements");
    expect(moves.map((r) => [r.id, r.data])).toEqual([
      ["st-m2", { product: "Blue Shirt", sku: "SKU-BLUE-L", change: -3, before: 3, after: 0 }],
      ["st-m1", { product: "Blue Shirt", sku: "SKU-BLUE-M", change: 5, before: 5, after: 10, reason: "New delivery", by: "Stock keeper" }],
    ]);
    // It never changes after it is made: "changed" is when it was made, and isn't a column to ask about.
    expect(moves[0].updatedAt).toBe(moves[0].createdAt);
    await rows("movements", { filters: [{ field: "$updatedAt", op: "gte", value: "2026-11-01" }] }).expect(400);
    expect(await ids("movements", { filters: [{ field: "$createdAt", op: "lte", value: "2026-11-02" }] })).toEqual(["st-m1"]);
    expect(await ids("movements", { filters: [{ field: "by", op: "empty" }] })).toEqual(["st-m2"]);
    expect(await ids("movements", { filters: [{ field: "by", op: "contains", value: "keeper" }] })).toEqual(["st-m1"]);
    expect(await ids("movements", { filters: [{ field: "change", op: "lt", value: 0 }] })).toEqual(["st-m2"]);
    expect(await ids("movements", { filters: [{ field: "product", op: "startsWith", value: "blue" }, { field: "sku", op: "endsWith", value: "-m" }] })).toEqual(["st-m1"]);
    expect(await ids("movements", { search: "delivery" })).toEqual(["st-m1"]);
    const alerts = await rows("alerts", { sort: [{ field: "state", dir: "asc" }] }).expect(200);
    expect((alerts.body.rows as Row[]).map((r) => [r.id, r.data])).toEqual([
      ["st-a1", { product: "Blue Shirt", sku: "SKU-BLUE-L", state: "WAITING" }],
      ["st-a2", { product: "Blue Shirt", sku: "SKU-BLUE-L", state: "SENT", told: "2026-11-10" }],
    ]);
    // Who waits is the customers' to see: it isn't answered, searched or exported here.
    expect(JSON.stringify(alerts.body)).not.toContain("example.test");
    expect(await ids("alerts", { search: "wait@" })).toEqual([]);
    expect((await csv("alerts")).join("\n")).not.toContain("example.test");
    expect(await ids("alerts", { filters: [{ field: "told", op: "empty" }] })).toEqual(["st-a1"]);
    expect(await ids("alerts", { filters: [{ field: "state", op: "anyOf", value: ["SENT", "FAILED"] }] })).toEqual(["st-a2"]);
    await rows("alerts", { filters: [{ field: "email", op: "contains", value: "wait" }] }).expect(400);
  });

  test("the orders': lines and customers' requests", async () => {
    expect((await read("lines")).map((r) => [r.id, r.data])).toEqual([
      ["st-l2", { order: "or2", product: "Blue Shirt", quantity: 1, unitPrice: 45, subtotal: 45 }],
      ["st-l1", { order: "or1", product: "Blue Shirt", colour: "Blue", size: "M", sku: "SKU-BLUE-M", quantity: 2, unitPrice: 50, subtotal: 100 }],
    ]);
    expect(await ids("lines", { filters: [{ field: "order", op: "is", value: "or1" }] })).toEqual(["st-l1"]);
    expect(await ids("lines", { filters: [{ field: "subtotal", op: "between", value: 40, value2: 50 }] })).toEqual(["st-l2"]);
    expect(await ids("lines", { filters: [{ field: "colour", op: "empty" }] })).toEqual(["st-l2"]);
    expect((await read("requests", { filters: [mine] })).map((r) => [r.id, r.data])).toEqual([
      ["st-q1", { kind: "SIZE", state: "NEW", name: "Maya", phone: "0599000003", product: "Blue Shirt", size: "XL" }],
      ["st-q2", { kind: "CALLBACK", state: "DONE", name: "Noor", phone: "0599000004", email: "noor@example.test", details: "Call me after five" }],
    ]);
    expect(await ids("requests", { filters: [mine, { field: "kind", op: "anyOf", value: ["SIZE", "COLOR"] }] })).toEqual(["st-q1"]);
    expect(await ids("requests", { filters: [mine, { field: "product", op: "empty" }] })).toEqual(["st-q2"]);
    expect(await ids("requests", { filters: [mine, { field: "state", op: "isNot", value: "NEW" }] })).toEqual(["st-q2"]);
    expect(await ids("requests", { filters: [mine], search: "after five" })).toEqual(["st-q2"]);
  });

  test("the customers': addresses, wishlists, newsletter subscribers", async () => {
    expect((await read("addresses", { sort: [{ field: "city", dir: "asc" }] })).map((r) => [r.id, r.data])).toEqual([
      ["st-ad2", { customer: "lina@example.test", fullName: "Lina O", phone: "0599000002", city: "Nablus", address: "Old town", main: false }],
      ["st-ad1", { customer: "sara@example.test", fullName: "Sara K", phone: "0599000001", city: "Ramallah", address: "Main st 5", label: "Home", main: true }],
    ]);
    expect(await ids("addresses", { filters: [{ field: "customer", op: "startsWith", value: "SARA@" }] })).toEqual(["st-ad1"]);
    expect(await ids("addresses", { filters: [{ field: "main", op: "isTrue" }] })).toEqual(["st-ad1"]);
    expect(await ids("addresses", { sort: [{ field: "customer", dir: "asc" }] })).toEqual(["st-ad2", "st-ad1"]);
    expect((await read("wishlist")).map((r) => [r.id, r.data])).toEqual([["st-w1", { customer: "sara@example.test", name: "Sara", product: "Blue Shirt" }]]);
    expect(await ids("wishlist", { filters: [{ field: "product", op: "contains", value: "coat" }] })).toEqual([]);
    expect((await read("subscribers", { filters: [mine] })).map((r) => [r.id, r.data])).toEqual([["st-n2", { email: "more@example.test" }], ["st-n1", { email: "news@example.test", source: "footer" }]]);
    expect(await ids("subscribers", { filters: [mine, { field: "source", op: "empty" }] })).toEqual(["st-n2"]);
    expect(await csv("subscribers", { filters: [mine] })).toEqual(["id,email,source,createdAt", "st-n2,more@example.test,,2026-11-02T10:00:00.000Z", "st-n1,news@example.test,footer,2026-11-01T10:00:00.000Z"]);
  });

  test("the discounts and what shoppers wrote: coupons, their uses, reviews, comments (never who)", async () => {
    expect((await read("coupons", { filters: [mine] })).map((r) => [r.id, r.data])).toEqual([
      ["st-c2", { code: "VIP50", kind: "FIXED", value: 50, minCart: 200, used: 0, active: false, phone: "0599000001" }],
      ["st-c1", { code: "EID10", kind: "PERCENT", value: 10, used: 1, limit: 100, active: true, starts: "2026-11-01", ends: "2026-11-30", note: "Eid" }],
    ]);
    expect(await ids("coupons", { filters: [mine, { field: "kind", op: "is", value: "fixed" }] })).toEqual(["st-c2"]);
    expect(await ids("coupons", { filters: [mine, { field: "ends", op: "between", value: "2026-11-15", value2: "2026-12-01" }] })).toEqual(["st-c1"]);
    expect(await ids("coupons", { filters: [mine, { field: "limit", op: "empty" }] })).toEqual(["st-c2"]);
    expect(await ids("coupons", { filters: [mine, { field: "value", op: "gte", value: 20 }] })).toEqual(["st-c2"]);
    expect(await ids("coupons", { filters: [mine], search: "eid" })).toEqual(["st-c1"]);
    // A use is made when the coupon is redeemed: that is its date.
    const uses = await rows("redemptions").expect(200);
    expect((uses.body.rows as Row[]).map((r) => [r.id, r.data, r.createdAt])).toEqual([["st-r1", { coupon: "EID10", order: "or2" }, "2026-11-05T10:00:00.000Z"]]);
    expect(JSON.stringify(uses.body)).not.toContain("0599");
    expect(await ids("redemptions", { filters: [{ field: "$createdAt", op: "between", value: "2026-11-05", value2: "2026-11-05" }] })).toEqual(["st-r1"]);
    expect(await ids("redemptions", { filters: [{ field: "coupon", op: "is", value: "vip50" }] })).toEqual([]);
    const reviews = await rows("reviews", { sort: [{ field: "rating", dir: "desc" }] }).expect(200);
    expect((reviews.body.rows as Row[]).map((r) => [r.id, r.data])).toEqual([
      ["st-rv1", { product: "Blue Shirt", rating: 5, title: "Lovely", body: "Soft and warm", state: "APPROVED" }],
      ["st-rv2", { product: "Blue Shirt", rating: 2, body: "Too small for me", state: "PENDING" }],
    ]);
    expect(JSON.stringify(reviews.body)).not.toMatch(/Sara|sara@/);
    expect(await ids("reviews", { filters: [{ field: "rating", op: "gte", value: 4 }] })).toEqual(["st-rv1"]);
    expect(await ids("reviews", { filters: [{ field: "state", op: "is", value: "PENDING" }] })).toEqual(["st-rv2"]);
    expect(await ids("reviews", { filters: [{ field: "title", op: "empty" }] })).toEqual(["st-rv2"]);
    expect((await read("comments")).map((r) => [r.id, r.data])).toEqual([["st-cm1", { product: "Blue Shirt", body: "Is it cotton?", state: "PENDING" }]]);
    expect(await ids("comments", { search: "cotton" })).toEqual(["st-cm1"]);
  });

  test("each table asks for its own page's permission", async () => {
    const as = (permissions: string[]) => {
      const a = express();
      a.use((req, _res, next) => {
        (req as any).access = { owner: false, permissions: new Set(permissions) };
        next();
      });
      a.use("/store", dataStore);
      a.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode ?? 500).json({ error: err.code }));
      return a;
    };
    const list = async (permissions: string[]) => (await request(as(permissions)).get("/store").expect(200)).body.map((t: { slug: string }) => t.slug);
    expect(await list(["catalog:read"])).toEqual(["products", "categories", "types", "sizes", "variants"]);
    expect(await list(["inventory:read"])).toEqual(["movements", "alerts"]);
    expect(await list(["orders:read"])).toEqual(["orders", "lines", "requests"]);
    expect(await list(["customers:read"])).toEqual(["customers", "addresses", "wishlist", "subscribers"]);
    expect(await list(["discounts:read"])).toEqual(["coupons", "redemptions"]);
    expect(await list(["ugc:read"])).toEqual(["reviews", "comments"]);
    const stock = as(["inventory:read"]);
    await request(stock).get("/store/movements/rows").expect(200);
    await request(stock).get("/store/variants/rows").expect(403);
    await request(stock).get("/store/coupons/rows/export").expect(403);
    await request(stock).get("/store/addresses/lookup").expect(403);
    await request(stock).get("/store/alerts/lookup").expect(200);
  });
});

describe("Every store table is a relation's other end", () => {
  type Linked = { id: string; slug: string; title: { en: string } | null; store?: string };
  // What a row of each is asked by, and what it is then called (and its address, where it has one).
  const ASKS: Array<[string, string, string, string]> = [
    ["products", "blue-shirt", "Blue Shirt", "blue-shirt"],
    ["categories", "shirts", "Shirts", "shirts"],
    ["types", "ST-Clothes", "Clothes", "st-clothes"],
    ["sizes", "l", "L", "s2"],
    ["variants", "sku-blue-l", "Blue Shirt · Blue · L", "SKU-BLUE-L"],
    ["movements", "st-m2", "SKU-BLUE-L -3", "st-m2"],
    ["alerts", "st-a1", "Blue Shirt", "st-a1"],
    ["orders", "or1", "Sara", "or1"],
    ["lines", "st-l1", "Blue Shirt × 2", "st-l1"],
    ["requests", "st-q1", "Maya", "st-q1"],
    ["customers", "LINA@example.test", "Lina", "u2"],
    ["addresses", "st-ad1", "Sara K · Ramallah", "st-ad1"],
    ["wishlist", "st-w1", "Blue Shirt · sara@example.test", "st-w1"],
    ["subscribers", "NEWS@example.test", "news@example.test", "st-n1"],
    ["coupons", "eid10", "EID10", "EID10"],
    ["redemptions", "st-r1", "EID10 · or2", "st-r1"],
    ["reviews", "st-rv2", "Too small for me", "st-rv2"],
    ["comments", "st-cm1", "Is it cotton?", "st-cm1"],
  ];

  test("a row links one of each, asked by its id or what it goes by, and reads them back by name", async () => {
    expect(ASKS.map((a) => a[0])).toEqual(STORE_IDS);
    const fields = [{ id: "title", type: "text" }, ...ASKS.map(([s]) => ({ id: s, type: "relation", to: `store:${s}`, many: true }))];
    const table = (await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}all`, name: { en: "All" }, fields }).expect(201)).body.id as string;
    const made = await request(app).post(`/v1/admin/collections/${table}/rows`).send({ slug: "one", lang: "en", values: { title: "One", ...Object.fromEntries(ASKS.map(([s, ask]) => [s, [ask]])) } });
    expect(made.body.details?.issues ?? []).toEqual([]);
    expect(made.status).toBe(201);
    expect(ASKS.map(([s]) => [s, ((made.body.data[s] ?? []) as Linked[]).map((x) => [x.title?.en ?? null, x.slug, x.store])])).toEqual(ASKS.map(([s, , name, slug]) => [s, [[name, slug, s]]]));
    expect(await prisma.storeLink.count({ where: { collectionId: table } })).toBe(ASKS.length);
    // The grid asks about any of them; a store row that is deleted stops showing.
    const q = (filters: unknown[]) => request(app).get(`/v1/admin/collections/${table}/rows`).query({ q: JSON.stringify({ filters }) });
    expect((await q([{ field: "coupons", op: "notEmpty" }, { field: "variants", op: "anyOf", value: ["cvariant02"] }]).expect(200)).body.total).toBe(1);
    await prisma.couponRedemption.deleteMany({ where: { id: "st-r1" } });
    expect((await q([{ field: "redemptions", op: "empty" }]).expect(200)).body.rows[0].data.redemptions).toBeUndefined();
    // No such row of that table: said, by the name that was asked.
    const bad = await request(app).patch(`/v1/admin/collections/${table}/rows/${made.body.id}`).send({ lang: "en", values: { sizes: ["XXL"] } }).expect(400);
    expect(bad.body.details.issues).toEqual([{ field: "sizes", message: "No such row", value: "XXL" }]);
  });

  test("the box that picks: each table's rows by name, found by the grid's own search", async () => {
    // (Where other specs' rows may be around, the row is asked for by its words.)
    const FIND: Record<string, string> = { types: "clothes", requests: "maya", subscribers: "news@", coupons: "eid10" };
    for (const [s, , name] of ASKS.filter(([s]) => s !== "redemptions")) {
      const out = (await request(app).get(`${base}/${s}/lookup`).query(FIND[s] ? { search: FIND[s] } : {}).expect(200)).body as { rows: Linked[]; total: number };
      expect([s, out.rows.map((r) => r.title?.en).includes(name), out.rows.every((r) => r.store === s)]).toEqual([s, true, true]);
    }
    const found = (await request(app).get(`${base}/coupons/lookup`).query({ search: "vip" }).expect(200)).body;
    expect(found).toEqual({ rows: [{ id: "st-c2", slug: "VIP50", status: "PUBLISHED", title: { ar: "VIP50", en: "VIP50", he: "VIP50" }, store: "coupons" }], total: 1 });
    expect(((await request(app).get(`${base}/variants/lookup`).query({ search: "blue-m" }).expect(200)).body.rows as Linked[]).map((r) => [r.title?.en, r.slug])).toEqual([["Blue Shirt · Blue · M", "SKU-BLUE-M"]]);
  });
});
