import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";

// The other side of a relation, with the database (B3): a table's grid shows who links its rows.
// Every relation that links the table (another table's, or its own) is a read-only column: how many
// rows link each row and the first few, read from the same links, with nothing kept for it. Asked
// about (linked from some, from none), sorted by, and gone with the relation. Requests without a
// token run as the test owner.

const PREFIX = "from-spec-";
type From = Record<string, { n: number; rows: Array<{ id: string; slug: string; status: string; title: Record<string, string> | null }> }>;
type Row = { id: string; slug: string; status: string; data: Record<string, unknown>; from?: From };
type Page = { rows: Row[]; total: number; incoming: Array<{ id: string; table: string; slug: string; name: unknown; field: string; fieldName: unknown; single: boolean }> };
const at = (id: string) => `/v1/admin/collections/${id}`;
const mk = async (slug: string, fields: unknown[]) => (await request(app).post("/v1/admin/collections").send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const save = (id: string, slug: string, fields: unknown[], more: Record<string, unknown> = {}) => request(app).put(at(id)).send({ slug, name: { en: slug }, fields, ...more });
const page = async (id: string, q: Record<string, unknown> = {}) => (await request(app).get(`${at(id)}/rows`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }], ...q }) }).expect(200)).body as Page;
const add = async (id: string, list: Array<{ slug: string; values: Record<string, unknown> }>) => (await request(app).post(`${at(id)}/rows/import`).send({ lang: "en", rows: list }).expect(200)).body as { created: number; rejected: unknown[] };
const bulk = (table: string, body: Record<string, unknown>) => request(app).post(`${at(table)}/rows/bulk`).send(body);
const idOf = async (table: string, slug: string) => (await prisma.collectionItem.findUniqueOrThrow({ where: { collectionId_slug: { collectionId: table, slug } } })).id;
const slugs = (list: Array<{ slug: string }>) => list.map((r) => r.slug);
const by = (rows: Row[]) => Object.fromEntries(rows.map((r) => [r.slug, r]));

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
}

const A = `${PREFIX}authors`;
const B = `${PREFIX}books`;
const AUTHOR = `$from.${B}.author`;
const HELPERS = `$from.${B}.helpers`;
const MENTOR = `$from.${A}.mentor`;
let authors = "";
let books = "";
const authorFields = () => [{ id: "title", type: "text", required: true }, { id: "mentor", type: "relation", to: authors, name: { en: "Mentor" } }];
const bookFields = () => [
  { id: "title", type: "text", required: true },
  { id: "author", type: "relation", to: authors, name: { en: "Author", ar: "الكاتب" } },
  { id: "helpers", type: "relation", to: authors, many: true },
];

beforeAll(async () => {
  await clean();
  // The authors first (a relation needs its table), then their relation to themselves.
  authors = await mk(A, [{ id: "title", type: "text", required: true }]);
  await save(authors, A, authorFields()).expect(200);
  books = await mk(B, bookFields());
  expect((await add(authors, ["a1", "a2", "a3", "a4"].map((s) => ({ slug: s, values: { title: s.toUpperCase() } })))).created).toBe(4);
  expect((await add(authors, [{ slug: "a5", values: { title: "A5", mentor: "a1" } }])).created).toBe(1);
  const list = [
    { slug: "b1", values: { title: "First", author: "a1", helpers: "a2, a3" } },
    { slug: "b2", values: { title: "Second", author: "a1" } },
    { slug: "b3", values: { title: "Third", author: "a2" } },
    { slug: "b4", values: { title: "Fourth" } },
    // Seven more by the third author: more than a cell shows.
    ...Array.from({ length: 7 }, (_, k) => ({ slug: `c${k + 1}`, values: { title: `Extra ${k + 1}`, author: "a3" } })),
  ];
  const made = await add(books, list);
  expect(made).toMatchObject({ created: 11, rejected: [] });
});
afterAll(clean);

describe("A table sees who links its rows", () => {
  test("every relation that links it is a column of its grid, in the order the tables were made", async () => {
    const got = await page(authors);
    expect(got.incoming).toEqual([
      { id: MENTOR, table: authors, slug: A, name: { en: A }, field: "mentor", fieldName: { en: "Mentor" }, single: false },
      { id: AUTHOR, table: books, slug: B, name: { en: B }, field: "author", fieldName: { en: "Author", ar: "الكاتب" }, single: false },
      { id: HELPERS, table: books, slug: B, name: { en: B }, field: "helpers", fieldName: null, single: false },
    ]);
    // Nothing links the books: no such columns there, and their rows say nothing of it.
    const other = await page(books);
    expect(other.incoming).toEqual([]);
    expect(other.rows.every((r) => r.from === undefined)).toBe(true);
    const meta = await request(app).get("/v1/admin/collections/grid-meta").expect(200);
    expect(meta.body.ops.$from).toEqual(["empty", "notEmpty"]);
  });

  test("a row says how many rows link it through each relation, and names the first few", async () => {
    const r = by((await page(authors)).rows);
    expect(r.a1.from![AUTHOR].n).toBe(2);
    expect(slugs(r.a1.from![AUTHOR].rows).sort()).toEqual(["b1", "b2"]);
    expect(r.a1.from![AUTHOR].rows.find((x) => x.slug === "b1")).toMatchObject({ status: "DRAFT", title: { en: "First" } });
    // Its own table's relation is read the same way.
    expect(r.a1.from![MENTOR]).toMatchObject({ n: 1, rows: [{ slug: "a5", title: { en: "A5" } }] });
    expect(r.a1.from![HELPERS]).toBeUndefined();
    expect(r.a2.from![AUTHOR]).toMatchObject({ n: 1, rows: [{ slug: "b3" }] });
    expect(r.a2.from![HELPERS]).toMatchObject({ n: 1, rows: [{ slug: "b1" }] });
    // Eight rows link the third author: all are counted, five are named.
    expect(r.a3.from![AUTHOR].n).toBe(7);
    expect(r.a3.from![AUTHOR].rows).toHaveLength(5);
    expect(r.a3.from![HELPERS].n).toBe(1);
    // Nobody links these.
    expect(r.a4.from).toEqual({});
    expect(r.a5.from).toEqual({});
    // The row's own values don't hold any of it.
    expect(Object.keys(r.a1.data).some((k) => k.startsWith("$"))).toBe(false);
    // A row written and answered says it too.
    const patched = await request(app).patch(`${at(authors)}/rows/${r.a2.id}`).send({ lang: "en", values: { title: "A2 again" } }).expect(200);
    expect(patched.body.from[AUTHOR].n).toBe(1);
  });

  test("a linking row in the trash doesn't count, and counts again when it is back", async () => {
    const b2 = await idOf(books, "b2");
    await bulk(books, { ids: [b2], op: "trash" }).expect(200);
    expect(by((await page(authors)).rows).a1.from![AUTHOR]).toMatchObject({ n: 1, rows: [{ slug: "b1" }] });
    await bulk(books, { ids: [b2], op: "restore" }).expect(200);
    expect(by((await page(authors)).rows).a1.from![AUTHOR].n).toBe(2);
  });

  test("it is asked about: linked from some, from none; and sorted by how many link", async () => {
    expect(slugs((await page(authors, { filters: [{ field: AUTHOR, op: "notEmpty" }] })).rows)).toEqual(["a1", "a2", "a3"]);
    expect(slugs((await page(authors, { filters: [{ field: AUTHOR, op: "empty" }] })).rows)).toEqual(["a4", "a5"]);
    expect(slugs((await page(authors, { filters: [{ field: MENTOR, op: "notEmpty" }] })).rows)).toEqual(["a1"]);
    // With another filter, any of them.
    expect(slugs((await page(authors, { match: "any", filters: [{ field: MENTOR, op: "notEmpty" }, { field: HELPERS, op: "notEmpty" }] })).rows)).toEqual(["a1", "a2", "a3"]);
    // The most linked first; those nobody links last (by address among themselves).
    expect(slugs((await page(authors, { sort: [{ field: AUTHOR, dir: "desc" }, { field: "$slug", dir: "asc" }] })).rows)).toEqual(["a3", "a1", "a2", "a4", "a5"]);
    expect(slugs((await page(authors, { sort: [{ field: AUTHOR, dir: "asc" }, { field: "$slug", dir: "asc" }] })).rows)).toEqual(["a2", "a1", "a3", "a4", "a5"]);
    // Not this table's column, or not a question for it: refused.
    const no = await request(app).get(`${at(authors)}/rows`).query({ q: JSON.stringify({ filters: [{ field: `$from.${B}.title`, op: "empty" }] }) }).expect(400);
    expect(no.body).toMatchObject({ error: "BAD_GRID_QUERY", message: `No column "$from.${B}.title" in this table` });
    await request(app).get(`${at(authors)}/rows`).query({ q: JSON.stringify({ filters: [{ field: AUTHOR, op: "anyOf", value: ["x"] }] }) }).expect(400);
    await request(app).get(`${at(books)}/rows`).query({ q: JSON.stringify({ filters: [{ field: AUTHOR, op: "empty" }] }) }).expect(400);
  });

  test("many rows at once can be chosen by it: the authors nobody wrote with are archived", async () => {
    const out = await bulk(authors, { query: { filters: [{ field: AUTHOR, op: "empty" }, { field: HELPERS, op: "empty" }] }, op: "archive" }).expect(200);
    expect(out.body.changed).toBe(2);
    expect(slugs((await page(authors, { view: "archived" })).rows)).toEqual(["a4", "a5"]);
    await bulk(authors, { ids: [await idOf(authors, "a4"), await idOf(authors, "a5")], op: "draft" }).expect(200);
  });

  test("the file of a table is as it was: who links a row is not one of its values", async () => {
    const csv = await request(app).get(`${at(authors)}/rows/export`).query({ q: JSON.stringify({}) }).expect(200);
    const head = csv.text.replace(/^﻿/, "").split("\r\n")[0];
    expect(head).not.toContain("$from");
    expect(head.split(",")).toContain("mentor");
  });
});

describe("The column goes and comes with the relation", () => {
  test("a relation removed, or pointed at another table, no longer shows on the other side; its links wait", async () => {
    const links = () => prisma.collectionLink.count({ where: { collectionId: books, fieldId: "author" } });
    const had = await links();
    expect(had).toBe(10);
    // The books lose their author field.
    await save(books, B, bookFields().filter((f) => f.id !== "author"), { accept: true }).expect(200);
    const gone = await page(authors);
    expect(gone.incoming.map((x) => x.id)).toEqual([MENTOR, HELPERS]);
    expect(by(gone.rows).a1.from![AUTHOR]).toBeUndefined();
    await request(app).get(`${at(authors)}/rows`).query({ q: JSON.stringify({ filters: [{ field: AUTHOR, op: "empty" }] }) }).expect(400);
    // Not one link was deleted: the field comes back, and so does everything the other side showed.
    expect(await links()).toBe(had);
    await save(books, B, bookFields(), { accept: true }).expect(200);
    const back = await page(authors);
    expect(back.incoming.map((x) => x.id)).toEqual([MENTOR, AUTHOR, HELPERS]);
    expect(by(back.rows).a3.from![AUTHOR].n).toBe(7);
  });

  test("a relation where a row is linked from one row only says so", async () => {
    const one = `${PREFIX}passports`;
    const passports = await mk(one, [{ id: "title", type: "text" }, { id: "holder", type: "relation", to: authors, exclusive: true }]);
    expect((await add(passports, [{ slug: "p1", values: { title: "P1", holder: "a4" } }])).created).toBe(1);
    const got = await page(authors);
    expect(got.incoming.find((x) => x.table === passports)).toMatchObject({ id: `$from.${one}.holder`, single: true });
    expect(by(got.rows).a4.from![`$from.${one}.holder`]).toMatchObject({ n: 1, rows: [{ slug: "p1" }] });
    // The table that links goes: its column goes with it, and the rows are as they were.
    await request(app).delete(at(passports)).expect(200);
    const after = await page(authors);
    expect(after.incoming.some((x) => x.slug === one)).toBe(false);
    expect(by(after.rows).a4.from).toEqual({});
  });
});
