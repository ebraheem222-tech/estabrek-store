import { afterAll, beforeAll, describe, expect, test } from "vitest";
import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import dataStore from "../modules/admin/dataStore.controller.js";
import { STORE_TABLES, storeOps } from "../lib/storeTables.js";

// The store's own tables in the data grid (admin → الجداول), to look at: products, categories,
// orders, customers answer the grid's same question. With the database; requests without a token
// run as the test owner.

const base = "/v1/admin/data/store";
const rows = (table: string, q: Record<string, unknown> = {}) => request(app).get(`${base}/${table}/rows`).query({ q: JSON.stringify(q) });
const slugs = async (table: string, q: Record<string, unknown> = {}) => ((await rows(table, q).expect(200)).body.rows as Array<{ slug: string }>).map((r) => r.slug);

beforeAll(async () => {
  await resetDb();
  await seedCatalog();
  // A second product (hidden, in the parent category, two sizes) and a few orders and customers.
  await prisma.product.create({
    data: {
      id: "p2",
      slug: "red-coat",
      title: "Red Coat",
      isActive: false,
      categoryId: "c1",
      items: { create: [{ id: "i2", colorName: "Red", isActive: true, skuBase: "", variants: { create: [{ id: "cvariant02", sku: "SKU-RED-M", price: new Prisma.Decimal(120), stock: 3, size: { connect: { id: "s1" } } }, { id: "cvariant03", sku: "SKU-RED-L", price: new Prisma.Decimal(95.5), stock: 0, size: { create: { id: "s2", name: "L", order: 2, active: true } } }] } }] },
    },
  });
  const sara = await prisma.user.create({ data: { id: "u1", name: "Sara", email: "sara@example.test", phone: "0599000001", marketingOptIn: true, lastLoginAt: new Date("2026-11-10T09:00:00Z") } });
  await prisma.user.create({ data: { id: "u2", name: "Lina", email: "lina@example.test", status: "SUSPENDED" } });
  await prisma.orderRequest.createMany({
    data: [
      { id: "or1", variantId: "cvariant01", quantity: 2, customerName: "Sara", phone: "0599000001", city: "Ramallah", total: new Prisma.Decimal(100), status: "NEW", source: "shop", userId: sara.id, createdAt: new Date("2026-11-01T10:00:00Z") },
      { id: "or2", variantId: "cvariant02", quantity: 1, customerName: "Lina", phone: "0599000002", city: "Nablus", total: new Prisma.Decimal(120), status: "SHIPPED", couponCode: "EID10", createdAt: new Date("2026-11-05T10:00:00Z") },
      { id: "or3", variantId: "cvariant01", quantity: 5, customerName: "Maya", phone: "0599000003", status: "CANCELED", createdAt: new Date("2026-11-09T10:00:00Z") },
    ],
  });
});
afterAll(resetDb);

describe("The store's tables in the grid", () => {
  test("the list: each table as the grid knows tables, read only, with how many rows", async () => {
    const out = await request(app).get(base).expect(200);
    expect(out.body.map((t: { slug: string; items: number; readOnly: boolean; hasAddress: boolean }) => [t.slug, t.items, t.readOnly, t.hasAddress])).toEqual([
      ["products", 2, true, true],
      ["categories", 2, true, true],
      ["orders", 3, true, false],
      ["customers", 2, true, false],
    ]);
    const products = out.body[0];
    expect(products).toMatchObject({ id: "$products", name: { ar: "المنتجات", en: "Products" } });
    expect(products.fields.map((f: { id: string; type: string; computed?: boolean }) => `${f.id}:${f.type}${f.computed ? ":worked-out" : ""}`)).toEqual(["title:text", "category:text", "kind:text", "active:boolean", "price:number:worked-out", "stock:number:worked-out", "colours:number:worked-out"]);
    expect(out.body[2].fields.find((f: { id: string }) => f.id === "state").options.map((o: { id: string }) => o.id)).toContain("SHIPPED");
  });

  test("products: their values, the lowest price and the stock worked out per page", async () => {
    const out = await rows("products", { sort: [{ field: "title", dir: "asc" }] }).expect(200);
    expect(out.body).toMatchObject({ total: 2, page: 1, counts: { all: 2, trash: 0 } });
    expect(out.body.rows.map((r: { slug: string; data: unknown }) => [r.slug, r.data])).toEqual([
      ["blue-shirt", { title: "Blue Shirt", category: "Shirts", active: true, price: 50, stock: 10, colours: 1 }],
      ["red-coat", { title: "Red Coat", category: "Men", active: false, price: 95.5, stock: 3, colours: 1 }],
    ]);
    expect(out.body.rows[0]).toMatchObject({ collectionId: "$products", status: "PUBLISHED", deletedAt: null });
    expect(await slugs("products", { search: "coat" })).toEqual(["red-coat"]);
    expect(await slugs("products", { search: "SHIRTS" })).toEqual(["blue-shirt"]);
    expect(await slugs("products", { filters: [{ field: "active", op: "isFalse" }] })).toEqual(["red-coat"]);
    expect(await slugs("products", { filters: [{ field: "category", op: "is", value: "men" }] })).toEqual(["red-coat"]);
    expect(await slugs("products", { filters: [{ field: "title", op: "startsWith", value: "blue" }] })).toEqual(["blue-shirt"]);
    expect((await slugs("products", { filters: [{ field: "kind", op: "empty" }] })).sort()).toEqual(["blue-shirt", "red-coat"]);
    expect(await slugs("products", { filters: [{ field: "$slug", op: "contains", value: "SHIRT" }] })).toEqual(["blue-shirt"]);
    expect(await slugs("products", { sort: [{ field: "category", dir: "asc" }] })).toEqual(["red-coat", "blue-shirt"]);
    // What is worked out per page can't be filtered or sorted by; the question says so.
    await rows("products", { filters: [{ field: "price", op: "gt", value: 60 }] }).expect(400);
    await rows("products", { sort: [{ field: "stock", dir: "desc" }] }).expect(400);
    await rows("products", { filters: [{ field: "nope", op: "empty" }] }).expect(400);
  });

  test("categories and customers", async () => {
    const cats = await rows("categories", { sort: [{ field: "name", dir: "asc" }] }).expect(200);
    expect(cats.body.rows.map((r: { slug: string; data: unknown }) => [r.slug, r.data])).toEqual([
      ["men", { name: "Men", products: 1, children: 1 }],
      ["shirts", { name: "Shirts", parent: "Men", products: 1, children: 0 }],
    ]);
    expect(await slugs("categories", { filters: [{ field: "parent", op: "empty" }] })).toEqual(["men"]);
    expect(await slugs("categories", { filters: [{ field: "parent", op: "contains", value: "me" }] })).toEqual(["shirts"]);
    const people = await rows("customers", { sort: [{ field: "name", dir: "asc" }] }).expect(200);
    expect(people.body.rows.map((r: { slug: string; data: unknown }) => [r.slug, r.data])).toEqual([
      ["u2", { name: "Lina", email: "lina@example.test", state: "SUSPENDED", marketing: false, orders: 0 }],
      ["u1", { name: "Sara", email: "sara@example.test", phone: "0599000001", state: "ACTIVE", marketing: true, lastLogin: "2026-11-10", orders: 1 }],
    ]);
    expect(await slugs("customers", { filters: [{ field: "state", op: "is", value: "suspended" }] })).toEqual(["u2"]);
    expect(await slugs("customers", { filters: [{ field: "marketing", op: "isTrue" }] })).toEqual(["u1"]);
    expect(await slugs("customers", { filters: [{ field: "lastLogin", op: "is", value: "2026-11-10" }] })).toEqual(["u1"]);
    expect(await slugs("customers", { filters: [{ field: "lastLogin", op: "empty" }] })).toEqual(["u2"]);
    expect(await slugs("customers", { filters: [{ field: "phone", op: "notEmpty" }] })).toEqual(["u1"]);
    expect(await slugs("customers", { search: "LINA@" })).toEqual(["u2"]);
    // Empty ones last, either way.
    expect(await slugs("customers", { sort: [{ field: "lastLogin", dir: "asc" }] })).toEqual(["u1", "u2"]);
    expect(await slugs("customers", { sort: [{ field: "lastLogin", dir: "desc" }] })).toEqual(["u1", "u2"]);
  });

  test("orders: numbers, choices, days, any or all", async () => {
    const all = await rows("orders", {}).expect(200);
    expect(all.body.rows.map((r: { slug: string }) => r.slug)).toEqual(["or3", "or2", "or1"]);
    expect(all.body.rows[1].data).toEqual({ customer: "Lina", phone: "0599000002", city: "Nablus", total: 120, quantity: 1, state: "SHIPPED", coupon: "EID10" });
    expect(await slugs("orders", { filters: [{ field: "total", op: "gte", value: 110 }] })).toEqual(["or2"]);
    expect(await slugs("orders", { filters: [{ field: "total", op: "between", value: 90, value2: 120 }] })).toEqual(["or2", "or1"]);
    expect(await slugs("orders", { filters: [{ field: "total", op: "empty" }] })).toEqual(["or3"]);
    expect(await slugs("orders", { filters: [{ field: "quantity", op: "gt", value: 1 }] })).toEqual(["or3", "or1"]);
    expect(await slugs("orders", { filters: [{ field: "state", op: "anyOf", value: ["NEW", "SHIPPED"] }] })).toEqual(["or2", "or1"]);
    expect(await slugs("orders", { filters: [{ field: "state", op: "isNot", value: "NEW" }] })).toEqual(["or3", "or2"]);
    expect(await slugs("orders", { filters: [{ field: "city", op: "empty" }] })).toEqual(["or3"]);
    expect(await slugs("orders", { filters: [{ field: "coupon", op: "notEmpty" }] })).toEqual(["or2"]);
    expect(await slugs("orders", { filters: [{ field: "$createdAt", op: "gte", value: "2026-11-05" }] })).toEqual(["or3", "or2"]);
    expect(await slugs("orders", { filters: [{ field: "$createdAt", op: "lte", value: "2026-11-05" }] })).toEqual(["or2", "or1"]);
    expect(await slugs("orders", { filters: [{ field: "$createdAt", op: "between", value: "2026-11-02", value2: "2026-11-08" }] })).toEqual(["or2"]);
    expect(await slugs("orders", { match: "any", filters: [{ field: "customer", op: "contains", value: "may" }, { field: "city", op: "is", value: "nablus" }] })).toEqual(["or3", "or2"]);
    expect(await slugs("orders", { sort: [{ field: "total", dir: "asc" }] })).toEqual(["or1", "or2", "or3"]);
    expect(await slugs("orders", { sort: [{ field: "total", dir: "desc" }], pageSize: 2 })).toEqual(["or2", "or1"]);
    expect(await slugs("orders", { sort: [{ field: "$createdAt", dir: "asc" }], pageSize: 2, page: 2 })).toEqual(["or3"]);
    expect(await slugs("orders", { view: "trash" })).toEqual([]);
    await rows("orders", { filters: [{ field: "state", op: "is", value: "gone" }] }).expect(400);
  });

  test("CSV out; nothing is written from here", async () => {
    const out = await request(app).get(`${base}/orders/rows/export`).query({ q: JSON.stringify({ filters: [{ field: "state", op: "is", value: "SHIPPED" }] }) }).expect(200);
    expect(out.headers["content-disposition"]).toContain("orders.csv");
    expect(out.text.slice(1).trim().split("\r\n")).toEqual(["id,customer,phone,city,total,quantity,state,source,coupon,createdAt", "or2,Lina,0599000002,Nablus,120,1,SHIPPED,,EID10,2026-11-05T10:00:00.000Z"]);
    await request(app).patch(`${base}/orders/rows/or1`).send({ values: { city: "x" } }).expect(404);
    await request(app).post(`${base}/orders/rows/bulk`).send({ ids: ["or1"], op: "trash" }).expect(404);
    await request(app).get(`${base}/nope/rows`).expect(404);
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
    const seller = as(["catalog:read"]);
    expect((await request(seller).get("/store").expect(200)).body.map((t: { slug: string }) => t.slug)).toEqual(["products", "categories"]);
    await request(seller).get("/store/products/rows").expect(200);
    await request(seller).get("/store/orders/rows").expect(403);
    await request(seller).get("/store/customers/rows/export").expect(403);
    expect((await request(as(["orders:read", "customers:read"])).get("/store").expect(200)).body.map((t: { slug: string }) => t.slug)).toEqual(["orders", "customers"]);
    expect((await request(as([])).get("/store").expect(200)).body).toEqual([]);
  });

  test("a worked-out column offers no questions; the others their kind's", () => {
    const col = (table: string, id: string) => STORE_TABLES[table].columns.find((c) => c.id === id)!;
    expect(storeOps(col("products", "price"))).toEqual([]);
    expect(storeOps(col("orders", "total"))).toContain("between");
    expect(storeOps(col("orders", "state"))).toContain("anyOf");
  });
});
