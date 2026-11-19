import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetHits } from "../lib/hitLimit.js";
import { withCollections } from "../lib/collections.js";
import type { PageTree } from "../lib/pageTree.js";

// The missing field kinds (item 6), with the database: formatted words, a formula worked out from the row's other
// fields, and a rollup worked out from the rows a relation links (either way). Both are worked out as rows are read,
// never written: the grid sorts and filters by a rollup, the API answers both, a private field stays private through
// them, and pages show them like any other value. Requests to /v1/admin without a token run as the test owner.

const PREFIX = "calc-spec-";
type Row = { id: string; slug: string; status: string; data: Record<string, any> };
const at = (id: string) => `/v1/admin/collections/${id}`;
const mk = (slug: string, fields: unknown[]) => request(app).post("/v1/admin/collections").send({ slug, name: { en: slug }, fields });
const made = async (slug: string, fields: unknown[]) => (await mk(slug, fields).expect(201)).body as { id: string; fields: Array<Record<string, any>> };
const save = (id: string, slug: string, fields: unknown[], more: Record<string, unknown> = {}) => request(app).put(at(id)).send({ slug, name: { en: slug }, fields, ...more });
const rows = async (id: string, q: Record<string, unknown> = {}) => (await request(app).get(`${at(id)}/rows`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }], ...q }) }).expect(200)).body.rows as Row[];
const add = async (id: string, list: Array<{ slug: string; status?: string; values: Record<string, unknown> }>) => (await request(app).post(`${at(id)}/rows/import`).send({ lang: "en", rows: list }).expect(200)).body as { created: number; rejected: Array<{ issues: unknown[] }> };
const bySlug = (list: Row[]) => Object.fromEntries(list.map((r) => [r.slug, r.data]));

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  forgetKeys();
  forgetHits();
}
beforeAll(clean);
afterAll(clean);

/** Lines (price, qty, a shipping day), orders that link several lines, and the order's computed fields. */
let lines = "";
let orders = "";
const ORDER_FIELDS = (linesId: string) => [
  { id: "title", type: "text", required: true },
  { id: "lines", type: "relation", to: linesId, many: true },
  { id: "n", type: "rollup", via: "lines", calc: "count" },
  { id: "sum", type: "rollup", via: "lines", calc: "sum", of: "price" },
  { id: "latest", type: "rollup", via: "lines", calc: "max", of: "shipped" },
  { id: "live", type: "rollup", via: "lines", calc: "count", published: true },
  { id: "label", type: "formula", formula: 'title & " (" & n & ")"' },
  { id: "big", type: "formula", formula: "sum > 100" },
  { id: "withTax", type: "formula", formula: "round(sum * 1.17, 2)", result: "money", currency: "USD" },
];

beforeAll(async () => {
  lines = (await made(`${PREFIX}lines`, [{ id: "title", type: "text" }, { id: "price", type: "money", currency: "ILS" }, { id: "qty", type: "number" }, { id: "shipped", type: "date" }, { id: "total", type: "formula", formula: "price * qty" }])).id;
  expect((await add(lines, [
    { slug: "l1", status: "PUBLISHED", values: { title: "Scarf", price: 40, qty: 2, shipped: "2026-11-01" } },
    { slug: "l2", values: { title: "Pin", price: 15, qty: 1, shipped: "2026-11-20" } },
    { slug: "l3", status: "PUBLISHED", values: { title: "Bag", price: 90, qty: 1 } },
  ])).created).toBe(3);
  const o = await made(`${PREFIX}orders`, ORDER_FIELDS(lines));
  orders = o.id;
  expect((await add(orders, [
    { slug: "o1", status: "PUBLISHED", values: { title: "First", lines: "l1, l2" } },
    { slug: "o2", status: "PUBLISHED", values: { title: "Second", lines: "l3, l1, l2" } },
    { slug: "o3", values: { title: "Empty" } },
  ])).created).toBe(3);
});

describe("Saving computed fields", () => {
  test("each is told what it gives (a rollup of money is money in its currency)", async () => {
    const all = (await request(app).get("/v1/admin/collections").expect(200)).body as Array<{ id: string; fields: Array<Record<string, any>> }>;
    const table = all.find((c) => c.id === orders)!;
    const f = Object.fromEntries(table.fields.map((x) => [x.id, x]));
    expect(f.n).toMatchObject({ result: "number", calc: "count" });
    expect(f.sum).toMatchObject({ result: "money", currency: "ILS" });
    expect(f.latest).toMatchObject({ result: "date" });
    expect(f.label).toMatchObject({ result: "text" });
    expect(f.big).toMatchObject({ result: "boolean" });
    expect(f.withTax).toMatchObject({ result: "money", currency: "USD" });
  });

  test("what's wrong is refused with where", async () => {
    const slug = `${PREFIX}bad`;
    const issue = async (fields: unknown[]) => (await mk(slug, fields).expect(400)).body.issues[0] as { path: string; message: string; say?: { ar: string } };
    expect(await issue([{ id: "a", type: "number" }, { id: "b", type: "formula", formula: "a + nope" }])).toMatchObject({ path: "fields.1.formula", message: 'No field "nope" in this table' });
    expect((await issue([{ id: "a", type: "formula", formula: "b + 1" }, { id: "b", type: "formula", formula: "a * 2" }])).message).toMatch(/reads itself/);
    expect((await issue([{ id: "a", type: "formula", formula: "1 +" }])).say?.ar).toBe("المعادلة بتخلص قبل وقتها");
    expect((await issue([{ id: "a", type: "text" }, { id: "b", type: "formula", formula: "a", result: "number" }])).message).toBe("The equation gives words");
    expect((await issue([{ id: "a", type: "text" }, { id: "n", type: "rollup", via: "a" }])).message).toBe("A rollup reads through one of the table's relations");
    expect((await issue([{ id: "l", type: "relation", to: lines, many: true }, { id: "s", type: "rollup", via: "l", calc: "sum", of: "title" }])).message).toBe("A sum or an average is of numbers or money");
    expect((await issue([{ id: "l", type: "relation", to: lines, many: true }, { id: "s", type: "rollup", via: "l", calc: "sum", of: "total" }])).message).toBe("A rollup works on kept values, not on another computed field");
    expect((await issue([{ id: "l", type: "relation", to: "store:products", many: true }, { id: "s", type: "rollup", via: "l", calc: "sum", of: "price" }])).message).toBe("The store's rows can only be counted");
    expect((await issue([{ id: "n", type: "rollup", from: lines, via: "x" }])).message).toBe("Nothing links a new table yet: save it first");
    // Nothing is written into one, so no rule asks anything of what is written.
    expect((await mk(slug, [{ id: "a", type: "formula", formula: "1", required: true }]).expect(400)).body.issues[0].message).toBe("A computed field takes no rules (nothing is written into it)");
    expect((await mk(slug, [{ id: "a", type: "number", formula: "1" }]).expect(400)).body.issues[0].message).toBe("A formula field needs its equation (and only it has one)");
  });
});

describe("Reading them", () => {
  test("worked out for every row, rollups and formulas reading them", async () => {
    const got = bySlug(await rows(orders));
    expect(got.o1).toMatchObject({ n: 2, sum: 55, latest: "2026-11-20", live: 1, label: { en: "First (2)", ar: "First (2)" }, big: false, withTax: 64.35 });
    expect(got.o2).toMatchObject({ n: 3, sum: 145, live: 2, big: true, withTax: 169.65 });
    // Nothing linked: a count of 0, a sum of 0, no latest day.
    expect(got.o3).toMatchObject({ n: 0, sum: 0, big: false });
    expect(got.o3.latest).toBeUndefined();
    // And never kept in the row.
    const stored = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: orders, slug: "o1" } });
    expect(Object.keys(stored.data as object)).toEqual(["title"]);
    // A formula of the lines table.
    expect(bySlug(await rows(lines)).l1.total).toBe(80);
  });

  test("always up to date: a line changed, a link added, a row to the trash", async () => {
    const l2 = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: lines, slug: "l2" } });
    await request(app).patch(`${at(lines)}/rows/${l2.id}`).send({ lang: "en", values: { price: 115 } }).expect(200);
    expect(bySlug(await rows(orders)).o1).toMatchObject({ sum: 155, big: true });
    await request(app).post(`${at(lines)}/rows/bulk`).send({ ids: [l2.id], op: "trash" }).expect(200);
    expect(bySlug(await rows(orders)).o1).toMatchObject({ n: 1, sum: 40, latest: "2026-11-01" });
    await request(app).post(`${at(lines)}/rows/bulk`).send({ ids: [l2.id], op: "restore" }).expect(200);
    await request(app).patch(`${at(lines)}/rows/${l2.id}`).send({ lang: "en", values: { price: 15 } }).expect(200);
    expect(bySlug(await rows(orders)).o1).toMatchObject({ n: 2, sum: 55 });
  });

  test("the grid sorts and filters by a rollup; a formula is shown only", async () => {
    expect((await rows(orders, { sort: [{ field: "sum", dir: "desc" }] })).map((r) => r.slug)).toEqual(["o2", "o1", "o3"]);
    expect((await rows(orders, { filters: [{ field: "n", op: "gte", value: 2 }] })).map((r) => r.slug)).toEqual(["o1", "o2"]);
    expect((await rows(orders, { filters: [{ field: "latest", op: "gt", value: "2026-11-10" }] })).map((r) => r.slug)).toEqual(["o1", "o2"]);
    expect((await rows(orders, { filters: [{ field: "latest", op: "empty" }] })).map((r) => r.slug)).toEqual(["o3"]);
    const sorted = await request(app).get(`${at(orders)}/rows`).query({ q: JSON.stringify({ sort: [{ field: "label", dir: "asc" }] }) }).expect(400);
    expect(sorted.body.message).toMatch(/worked out as rows are read/);
    await request(app).get(`${at(orders)}/rows`).query({ q: JSON.stringify({ filters: [{ field: "big", op: "isTrue" }] }) }).expect(400);
  });

  test("writing one is let go: a row's form sends it back as shown", async () => {
    const o1 = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: orders, slug: "o1" } });
    await request(app).patch(`${at(orders)}/rows/${o1.id}`).send({ lang: "en", values: { title: "First!", n: 99, label: { en: "x" } } }).expect(200);
    const after = await prisma.collectionItem.findUniqueOrThrow({ where: { id: o1.id } });
    expect(after.data).toEqual({ title: { en: "First!" } });
    expect(bySlug(await rows(orders)).o1).toMatchObject({ n: 2, label: { en: "First! (2)" } });
    await request(app).patch(`${at(orders)}/rows/${o1.id}`).send({ lang: "en", values: { title: "First" } }).expect(200);
  });

  test("from the other side: how many posts link each author", async () => {
    const authors = (await made(`${PREFIX}authors`, [{ id: "title", type: "text" }])).id;
    const posts = (await made(`${PREFIX}posts`, [{ id: "title", type: "text" }, { id: "author", type: "relation", to: authors }, { id: "words", type: "number" }])).id;
    await add(authors, [{ slug: "amal", values: { title: "Amal" } }, { slug: "badr", values: { title: "Badr" } }]);
    await add(posts, [{ slug: "p1", status: "PUBLISHED", values: { author: "amal", words: 300 } }, { slug: "p2", values: { author: "amal", words: 100 } }, { slug: "p3", status: "PUBLISHED", values: { author: "badr", words: 50 } }]);
    const fields = [{ id: "title", type: "text" }, { id: "posts", type: "rollup", from: posts, via: "author" }, { id: "out", type: "rollup", from: posts, via: "author", published: true }, { id: "avgWords", type: "rollup", from: posts, via: "author", calc: "avg", of: "words" }];
    await save(authors, `${PREFIX}authors`, fields).expect(200);
    expect(bySlug(await rows(authors))).toMatchObject({ amal: { posts: 2, out: 1, avgWords: 200 }, badr: { posts: 1, out: 1, avgWords: 50 } });
    // Through a relation that doesn't link this table: refused.
    const wrong = await save(authors, `${PREFIX}authors`, [{ id: "title", type: "text" }, { id: "x", type: "rollup", from: posts, via: "words" }]).expect(400);
    expect(wrong.body.issues[0]).toMatchObject({ path: "fields.1.via", message: "That relation doesn't link this table" });
  });
});

describe("Turning a field into a computed one", () => {
  test("its values are put aside (a yes first) and come back when it turns back", async () => {
    const id = (await made(`${PREFIX}turn`, [{ id: "price", type: "number" }, { id: "total", type: "number" }])).id;
    await add(id, [{ slug: "a", values: { price: 10, total: 7 } }, { slug: "b", values: { price: 4 } }]);
    const asFormula = [{ id: "price", type: "number" }, { id: "total", type: "formula", formula: "price * 2" }];
    const asked = await save(id, `${PREFIX}turn`, asFormula).expect(409);
    expect(asked.body.changes[0]).toMatchObject({ field: "total", change: "retyped", to: "formula", lost: 1 });
    await save(id, `${PREFIX}turn`, asFormula, { accept: true }).expect(200);
    expect(bySlug(await rows(id))).toMatchObject({ a: { total: 20 }, b: { total: 8 } });
    await save(id, `${PREFIX}turn`, [{ id: "price", type: "number" }, { id: "total", type: "number" }]).expect(200);
    const back = bySlug(await rows(id));
    expect(back.a.total).toBe(7);
    expect(back.b.total).toBeUndefined();
  });
});

describe("Formatted words", () => {
  test("kept per language as written, searched, exported and read back", async () => {
    const id = (await made(`${PREFIX}notes`, [{ id: "title", type: "text" }, { id: "body", type: "richText" }, { id: "size", type: "formula", formula: "len(body)" }])).id;
    expect((await add(id, [{ slug: "n1", values: { title: "One", body: "**Soft** silk\n- one\n- two" } }])).created).toBe(1);
    const got = bySlug(await rows(id)).n1;
    expect(got.body).toEqual({ en: "**Soft** silk\n- one\n- two" });
    // The equation reads the words plain.
    expect(got.size).toBe(17);
    expect((await rows(id, { search: "silk" })).length).toBe(1);
    expect((await rows(id, { filters: [{ field: "body", op: "contains", value: "soft" }] })).length).toBe(1);
    const csv = (await request(app).get(`${at(id)}/rows/export`).expect(200)).text;
    const [head, line] = csv.trim().split(/\r?\n/);
    expect(head).toBe("slug,status,title.ar,title.en,title.he,body.ar,body.en,body.he,size");
    expect(line).toContain('"**Soft** silk\n- one\n- two"'.split("\n")[0]);
    // Read back as written: the computed column is let go.
    const back = await request(app).post(`${at(id)}/rows/import`).send({ lang: "en", rows: [{ slug: "n2", values: { "body.ar": "**ناعم**", size: "999" } }] }).expect(200);
    expect(back.body.rejected).toEqual([]);
    expect(bySlug(await rows(id)).n2).toMatchObject({ body: { ar: "**ناعم**" }, size: 4 });
  });
});

describe("The API and the pages", () => {
  test("answered as what they give; formatted words said so; a private field stays private through them", async () => {
    await request(app).put(`/v1/admin/api/tables/${orders}`).send({ read: "public", create: "off", update: "off", delete: "off" }).expect(200);
    const list = (await request(app).get(`/v1/data/${PREFIX}orders`).query({ lang: "en", shown: "1", sort: "slug" }).expect(200)).body.data as Array<{ slug: string; values: Record<string, unknown>; shown: Record<string, string> }>;
    const o1 = list.find((r) => r.slug === "o1")!;
    expect(o1.values).toMatchObject({ n: 2, sum: 55, label: "First (2)", big: false, latest: "2026-11-20" });
    expect(o1.shown.big).toBe("No");
    expect(o1.shown.sum).toMatch(/55/);
    // The API's own description of the table: read only.
    const doc = (await request(app).get("/v1/data").expect(200)).body.tables.find((t: { table: string }) => t.table === `${PREFIX}orders`);
    expect(doc.fields.find((f: { id: string }) => f.id === "sum")).toMatchObject({ type: "rollup", computed: true, result: "money" });

    // Formatted words, marked for the page.
    const notes = (await made(`${PREFIX}open-notes`, [{ id: "title", type: "text" }, { id: "body", type: "richText" }, { id: "cost", type: "number" }, { id: "double", type: "formula", formula: "cost * 2" }, { id: "named", type: "formula", formula: 'title & "!"' }])).id;
    await add(notes, [{ slug: "x", status: "PUBLISHED", values: { title: "Hi", body: "**Bold** words", cost: 21 } }]);
    await request(app).put(`/v1/admin/api/tables/${notes}`).send({ read: "public", create: "off", update: "off", delete: "off", private: ["cost"] }).expect(200);
    const [x] = (await request(app).get(`/v1/data/${PREFIX}open-notes`).query({ lang: "en", shown: "1" }).expect(200)).body.data as Array<{ values: Record<string, unknown>; shown: Record<string, string>; rich?: string[] }>;
    expect(x.shown.body).toBe("**Bold** words");
    expect(x.rich).toEqual(["body"]);
    // cost is private, so is what reads it.
    expect(Object.keys(x.values).sort()).toEqual(["body", "named", "title"]);

    // A sum of a field kept private in its own table is as private here; a count isn't.
    await request(app).put(`/v1/admin/api/tables/${lines}`).send({ read: "off", create: "off", update: "off", delete: "off", private: ["price"] }).expect(200);
    const hid = (await request(app).get(`/v1/data/${PREFIX}orders`).query({ lang: "en" }).expect(200)).body.data[0].values as Record<string, unknown>;
    expect("sum" in hid).toBe(false);
    expect("n" in hid).toBe(true);
    await request(app).put(`/v1/admin/api/tables/${lines}`).send({ read: "off", create: "off", update: "off", delete: "off", private: [] }).expect(200);
  });

  test("the editor's try: what it gives and what it works out to for the first rows", async () => {
    const ok = (await request(app).post(`${at(lines)}/formula`).send({ formula: "price * qty + 1", field: "total" }).expect(200)).body;
    expect(ok).toMatchObject({ ok: true, result: "number", reads: ["price", "qty"] });
    expect(ok.sample.map((s: { value: unknown }) => s.value).sort()).toEqual([16, 81, 91]);
    const no = (await request(app).post(`${at(lines)}/formula`).send({ formula: "price +* 2" }).expect(200)).body;
    expect(no).toMatchObject({ ok: false, at: 7 });
    // It can't read itself.
    expect((await request(app).post(`${at(lines)}/formula`).send({ formula: "total + 1", field: "total" }).expect(200)).body.ok).toBe(false);
  });

  test("a page's list shows them like any other value, formatted words marked", async () => {
    const tree = {
      version: 1,
      root: { id: "root", type: "page", props: {}, children: [{ id: "list", type: "collectionList", props: { collectionId: orders, sort: "title" }, children: [{ id: "card", type: "stack", props: {}, children: [
        { id: "t", type: "text", props: { text: { en: "x" }, bind: { text: "label" } } },
        { id: "s", type: "text", props: { text: { en: "x" }, bind: { text: "sum" } } },
      ] }] }] },
    } as unknown as PageTree;
    const out = (await withCollections(tree)) as unknown as { root: { children: Array<{ children: Array<{ children: Array<{ props: Record<string, any> }> }> }> } };
    const first = out.root.children[0].children[0].children;
    expect(first[0].props.text).toMatchObject({ en: "First (2)" });
    expect(first[1].props.text.en).toMatch(/55/);
  });
});
