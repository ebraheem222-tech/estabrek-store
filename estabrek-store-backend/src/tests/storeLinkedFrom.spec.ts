import { afterAll, beforeAll, describe, expect, test } from "vitest";
import express from "express";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import dataStore from "../modules/admin/dataStore.controller.js";
import { FROM_ASK_CAP, STORE_TABLES, storeFilter, storeOrder } from "../lib/storeTables.js";
import { storeRowsLinked } from "../lib/links.js";

// Who links a store row: each relation of the owner's tables that links one of the store's tables
// is a read-only column of that table's grid ("$from.<table address>.<field id>"): how many rows
// link the row, the first few by name, and "is anything linking it" as a question. With the
// database; requests without a token run as the test owner.
// (The same column on the owner's own tables: relations.spec.ts.)

const base = "/v1/admin/data/store";
const PREFIX = "storefrom-spec-";
type Linked = { id: string; slug: string; status: string; title: Record<string, string> | null };
type Row = { id: string; slug: string; data: Record<string, unknown>; from?: Record<string, { n: number; rows: Linked[] }> };
type Inc = { id: string; table: string; slug: string; name: Record<string, string>; field: string; fieldName: Record<string, string> | null; single: boolean };
type Page = { rows: Row[]; total: number; incoming: Inc[] };
const rows = (table: string, q: Record<string, unknown> = {}) => request(app).get(`${base}/${table}/rows`).query({ q: JSON.stringify(q) });
const read = async (table: string, q: Record<string, unknown> = {}) => (await rows(table, q).expect(200)).body as Page;
const slugs = async (table: string, q: Record<string, unknown> = {}) => (await read(table, { sort: [{ field: "$slug", dir: "asc" }], ...q })).rows.map((r) => r.slug);
const mk = async (slug: string, fields: unknown[]) => (await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}${slug}`, name: { en: slug }, fields }).expect(201)).body.id as string;
const add = async (table: string, slug: string, values: Record<string, unknown>) => (await request(app).post(`/v1/admin/collections/${table}/rows`).send({ slug, lang: "en", values }).expect(201)).body.id as string;
const bulk = (table: string, body: Record<string, unknown>) => request(app).post(`/v1/admin/collections/${table}/rows/bulk`).send(body).expect(200);

const NOTES = `${PREFIX}notes`;
const about = `$from.${NOTES}.about`;
const also = `$from.${NOTES}.also`;
const plan = `$from.${PREFIX}plans.product`;
let notes = "";
let plans = "";
let n4 = "";

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await resetDb();
}

beforeAll(async () => {
  await clean();
  await seedCatalog();
  await prisma.product.create({ data: { id: "p2", slug: "red-coat", title: "Red Coat", isActive: false, categoryId: "c1" } });
  await prisma.product.create({ data: { id: "p3", slug: "green-hat", title: "Green Hat", isActive: true, categoryId: "c1" } });
  await prisma.user.create({ data: { id: "u1", name: "Sara", email: "sara@example.test" } });
  await prisma.user.create({ data: { id: "u2", name: "Lina", email: "lina@example.test" } });
  // Notes: each is about one product (many notes a product), may mention others, and names the customers it is for.
  notes = await mk("notes", [
    { id: "title", type: "text", name: { en: "Title" } },
    { id: "about", type: "relation", name: { en: "About" }, to: "store:products" },
    { id: "also", type: "relation", name: { en: "Also" }, to: "store:products", many: true },
    { id: "buyers", type: "relation", to: "store:customers", many: true },
  ]);
  // Plans: a product has one plan at most.
  plans = await mk("plans", [{ id: "title", type: "text" }, { id: "product", type: "relation", to: "store:products", exclusive: true }]);
  await add(notes, "n1", { title: "First", about: "blue-shirt", buyers: ["u1"] });
  await add(notes, "n2", { title: "Second", about: "blue-shirt", also: ["red-coat"], buyers: ["u1", "u2"] });
  await add(notes, "n3", { title: "Third", about: "red-coat" });
  n4 = await add(notes, "n4", { title: "Fourth", about: "blue-shirt" });
  await add(plans, "pl1", { title: "Winter plan", product: "red-coat" });
});
afterAll(clean);

describe("A store table sees who links its rows", () => {
  test("each relation that links it is a column: how many rows link the row, and the first few by name", async () => {
    const page = await read("products", { sort: [{ field: "title", dir: "asc" }] });
    // In the order the linking tables were made, then their fields'.
    expect(page.incoming).toEqual([
      { id: about, table: notes, slug: NOTES, name: { en: "notes" }, field: "about", fieldName: { en: "About" }, single: false },
      { id: also, table: notes, slug: NOTES, name: { en: "notes" }, field: "also", fieldName: { en: "Also" }, single: false },
      { id: plan, table: plans, slug: `${PREFIX}plans`, name: { en: "plans" }, field: "product", fieldName: null, single: true },
    ]);
    const blue = page.rows[0];
    expect(blue.slug).toBe("blue-shirt");
    expect(blue.from![about].n).toBe(3);
    expect(blue.from![about].rows.map((r) => [r.slug, r.status, r.title?.en]).sort()).toEqual([["n1", "DRAFT", "First"], ["n2", "DRAFT", "Second"], ["n4", "DRAFT", "Fourth"]]);
    // Nothing through the other relations: said by leaving them out.
    expect(Object.keys(blue.from!)).toEqual([about]);
    const red = page.rows[2];
    expect([red.slug, red.from![about].n, red.from![also].rows.map((r) => r.slug), red.from![plan].rows.map((r) => r.title?.en)]).toEqual(["red-coat", 1, ["n2"], ["Winter plan"]]);
    // A product nothing links: an empty answer, not a missing one.
    expect([page.rows[1].slug, page.rows[1].from]).toEqual(["green-hat", {}]);
    // The values themselves are as they were (who links a row is no value of it).
    expect(blue.data).toMatchObject({ title: "Blue Shirt", active: true });
    // Customers, through the notes' own relation to them.
    const people = await read("customers", { sort: [{ field: "name", dir: "asc" }] });
    expect(people.incoming.map((x) => x.id)).toEqual([`$from.${NOTES}.buyers`]);
    expect(people.rows.map((r) => [r.slug, r.from![`$from.${NOTES}.buyers`]?.n ?? 0])).toEqual([["u2", 1], ["u1", 2]]);
    // A table no relation links: no such columns, and its rows say nothing about it.
    const cats = await read("categories");
    expect([cats.incoming, cats.rows.every((r) => r.from === undefined)]).toEqual([[], true]);
  });

  test("a row in the trash doesn't count; back from it, it does", async () => {
    await bulk(notes, { ids: [n4], op: "trash" });
    const n = async () => (await read("products", { filters: [{ field: "$slug", op: "is", value: "blue-shirt" }] })).rows[0].from![about];
    expect([(await n()).n, (await n()).rows.map((r) => r.slug).sort()]).toEqual([2, ["n1", "n2"]]);
    await bulk(notes, { ids: [n4], op: "restore" });
    expect((await n()).n).toBe(3);
    await bulk(notes, { ids: [n4], op: "trash" });
  });

  test("the question: is anything linking it, or nothing; with the grid's other questions", async () => {
    expect(await slugs("products", { filters: [{ field: about, op: "notEmpty" }] })).toEqual(["blue-shirt", "red-coat"]);
    expect(await slugs("products", { filters: [{ field: about, op: "empty" }] })).toEqual(["green-hat"]);
    expect(await slugs("products", { filters: [{ field: also, op: "notEmpty" }] })).toEqual(["red-coat"]);
    expect(await slugs("products", { filters: [{ field: plan, op: "empty" }] })).toEqual(["blue-shirt", "green-hat"]);
    // With the others: all of them, or any.
    expect(await slugs("products", { filters: [{ field: about, op: "notEmpty" }, { field: "active", op: "isTrue" }] })).toEqual(["blue-shirt"]);
    expect(await slugs("products", { match: "any", filters: [{ field: plan, op: "notEmpty" }, { field: "title", op: "contains", value: "hat" }] })).toEqual(["green-hat", "red-coat"]);
    expect((await read("products", { filters: [{ field: about, op: "notEmpty" }], search: "coat" })).total).toBe(1);
    // The file of the asked rows follows the same question.
    const csv = (await request(app).get(`${base}/products/rows/export`).query({ q: JSON.stringify({ filters: [{ field: about, op: "empty" }] }) }).expect(200)).text;
    expect(csv.slice(1).trim().split("\r\n").map((line) => line.split(",")[0])).toEqual(["slug", "green-hat"]);
    // What it can't be asked: another question, a column that isn't there, an order (it is counted beside the page).
    expect((await rows("products", { filters: [{ field: about, op: "is", value: "n1" }] }).expect(400)).body.error).toBe("BAD_GRID_QUERY");
    expect((await rows("products", { filters: [{ field: `$from.${NOTES}.title`, op: "notEmpty" }] }).expect(400)).body.message).toBe(`No column "$from.${NOTES}.title" in this table`);
    expect((await rows("categories", { filters: [{ field: about, op: "notEmpty" }] }).expect(400)).body.message).toContain("No column");
    expect((await rows("products", { sort: [{ field: about, dir: "desc" }] }).expect(400)).body.message).toContain("can't be sorted by");
    // The pure parts say the same.
    const t = STORE_TABLES.products;
    expect(storeFilter(t, { field: about, op: "notEmpty" }, new Map([[about, ["p1"]]]))).toEqual({ id: { in: ["p1"] } });
    expect(storeFilter(t, { field: about, op: "empty" }, new Map([[about, []]]))).toEqual({ id: { notIn: [] } });
    expect(() => storeFilter(t, { field: about, op: "notEmpty" })).toThrow(/No column/);
    expect(() => storeOrder(t, { sort: [{ field: about, dir: "asc" }] })).toThrow(/sorted by/);
    // Read with a limit, so a table too large to ask this way is told so instead of being read whole.
    expect(FROM_ASK_CAP).toBe(10_000);
    expect((await storeRowsLinked(prisma, { table: notes, field: "about" }, "products", 10)).sort()).toEqual(["p1", "p2"]);
    expect(await storeRowsLinked(prisma, { table: notes, field: "about" }, "products", 0)).toHaveLength(1);
  });

  test("a linking row is named only to who may see its table", async () => {
    const as = (permissions: string[]) => {
      const a = express();
      a.use((req, _res, next) => {
        (req as any).access = { owner: false, permissions: new Set(permissions) };
        next();
      });
      a.use("/store", dataStore);
      a.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode ?? 500).json({ error: err.code, message: err.message }));
      return a;
    };
    const page = async (permissions: string[], q: Record<string, unknown> = {}) => (await request(as(permissions)).get("/store/products/rows").query({ q: JSON.stringify(q) })) as { status: number; body: Page & { message?: string } };
    // The catalogue only: the products, and nothing of the owner's tables (no column, no names, no question).
    const seller = await page(["catalog:read"]);
    expect([seller.status, seller.body.incoming, seller.body.rows.every((r) => r.from === undefined)]).toEqual([200, [], true]);
    expect(JSON.stringify(seller.body)).not.toMatch(/First|Winter plan/);
    const asked = await page(["catalog:read"], { filters: [{ field: about, op: "notEmpty" }] });
    expect([asked.status, asked.body.message]).toEqual([400, `No column "${about}" in this table`]);
    // One table given to the role: that table's relations, not the other's.
    const one = await page(["catalog:read", `data:${plans}:read`]);
    expect(one.body.incoming.map((x) => x.id)).toEqual([plan]);
    expect(JSON.stringify(one.body)).toContain("Winter plan");
    expect(JSON.stringify(one.body)).not.toContain("First");
    expect((await page(["catalog:read", `data:${plans}:read`], { filters: [{ field: plan, op: "notEmpty" }] })).body.rows.map((r) => r.slug)).toEqual(["red-coat"]);
    // Every table (pages:read): all of them.
    expect((await page(["catalog:read", "pages:read"])).body.incoming.map((x) => x.id)).toEqual([about, also, plan]);
  });

  test("a relation that is taken off the table takes its column with it; put back, its links are there again", async () => {
    const fields = (await prisma.collection.findUniqueOrThrow({ where: { id: plans } })).fields as Array<{ id: string }>;
    const put = (list: unknown[]) => request(app).put(`/v1/admin/collections/${plans}`).send({ slug: `${PREFIX}plans`, name: { en: "plans" }, fields: list, accept: true }).expect(200);
    await put(fields.filter((f) => f.id !== "product"));
    expect((await read("products")).incoming.map((x) => x.id)).toEqual([about, also]);
    await rows("products", { filters: [{ field: plan, op: "notEmpty" }] }).expect(400);
    await put(fields);
    expect(await slugs("products", { filters: [{ field: plan, op: "notEmpty" }] })).toEqual(["red-coat"]);
  });
});
