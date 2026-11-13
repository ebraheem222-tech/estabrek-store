import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";

// Relations between tables with the database (B3): a relation field links a row to rows of a
// table; the links live in one table of their own, read both ways. Linking by address or id, the
// field's own rules, what deleting a linked row does (unlink, with it, forbidden), no link left
// without its rows, and a change of fields that hides links, never deletes them. Requests without
// a token run as the test owner.

const PREFIX = "rel-spec-";
type Row = { id: string; slug: string; status: string; data: Record<string, any> };
const at = (id: string) => `/v1/admin/collections/${id}`;
const mk = async (slug: string, fields: unknown[]) => (await request(app).post("/v1/admin/collections").send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const save = (id: string, slug: string, fields: unknown[], more: Record<string, unknown> = {}) => request(app).put(at(id)).send({ slug, name: { en: slug }, fields, ...more });
const preview = async (id: string, slug: string, fields: unknown[]) => (await request(app).post(`${at(id)}/fields/preview`).send({ slug, name: { en: slug }, fields }).expect(200)).body as { needsAccept: boolean; changes: Array<Record<string, any>> };
const rows = async (id: string, q: Record<string, unknown> = {}) => (await request(app).get(`${at(id)}/rows`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }], ...q }) }).expect(200)).body.rows as Row[];
const row = async (id: string, slug: string) => (await rows(id, { filters: [{ field: "$slug", op: "is", value: slug }] }))[0];
const add = async (id: string, list: Array<{ slug: string; values: Record<string, unknown> }>, more: Record<string, unknown> = {}) => (await request(app).post(`${at(id)}/rows/import`).send({ lang: "en", rows: list, ...more }).expect(200)).body as { created: number; updated: number; rejected: Array<{ row: number; slug: string | null; issues: Array<Record<string, unknown>> }> };
const patch = (table: string, id: string, values: Record<string, unknown>) => request(app).patch(`${at(table)}/rows/${id}`).send({ lang: "en", values });
const bulk = (table: string, body: Record<string, unknown>) => request(app).post(`${at(table)}/rows/bulk`).send(body);
const idOf = async (table: string, slug: string) => (await prisma.collectionItem.findUniqueOrThrow({ where: { collectionId_slug: { collectionId: table, slug } } })).id;
const linked = (r: Row | undefined, field: string) => ((r?.data[field] ?? []) as Array<{ slug: string }>).map((x) => x.slug);
const slugs = (list: Row[]) => list.map((r) => r.slug);

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
}
beforeAll(clean);
afterAll(clean);

let made = 0;
/** Authors, tags, and books that link an author (one) and tags (several). */
async function world(author: Record<string, unknown> = {}, tags: Record<string, unknown> = {}) {
  const k = ++made;
  const names = { authors: `${PREFIX}authors-${k}`, tags: `${PREFIX}tags-${k}`, books: `${PREFIX}books-${k}` };
  const authors = await mk(names.authors, [{ id: "title", type: "text", required: true }]);
  const tagsId = await mk(names.tags, [{ id: "title", type: "text" }]);
  const fields = [{ id: "title", type: "text", required: true }, { id: "author", type: "relation", to: authors, ...author }, { id: "tags", type: "relation", to: tagsId, many: true, ...tags }, { id: "note", type: "text" }];
  const books = await mk(names.books, fields);
  expect((await add(authors, ["a1", "a2", "a3"].map((s) => ({ slug: s, values: { title: s.toUpperCase() } })))).created).toBe(3);
  expect((await add(tagsId, ["t1", "t2", "t3"].map((s) => ({ slug: s, values: { title: s.toUpperCase() } })))).created).toBe(3);
  return { names, authors, tags: tagsId, books, fields };
}

describe("A relation is a field that links a table", () => {
  test("its table has to be there; only a relation links one", async () => {
    const no = await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}bad`, name: { en: "x" }, fields: [{ id: "title", type: "text" }, { id: "author", type: "relation", to: "no-such-table" }] }).expect(400);
    expect(no.body.issues).toEqual([{ path: "fields.1.to", message: "No such table to link" }]);
    const bare = await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}bad`, name: { en: "x" }, fields: [{ id: "author", type: "relation" }] }).expect(400);
    expect(bare.body.issues[0].message).toBe("A relation needs the table it links");
    const other = await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}bad`, name: { en: "x" }, fields: [{ id: "title", type: "text", many: true }] }).expect(400);
    expect(other.body.issues[0].message).toBe("Only a relation links a table");
    const rules = await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}bad`, name: { en: "x" }, fields: [{ id: "author", type: "relation", to: "x", unique: true }] }).expect(400);
    expect(rules.body.issues[0].message).toBe("This kind of field can't ask for the only value");
    const meta = await request(app).get("/v1/admin/collections/grid-meta").expect(200);
    expect(meta.body.ops.relation).toEqual(["anyOf", "empty", "notEmpty"]);
    expect(meta.body.limits.links).toBe(200);
  });
});

describe("Linking rows", () => {
  let w: Awaited<ReturnType<typeof world>>;
  let b1 = "";
  beforeAll(async () => {
    w = await world();
  });

  test("by address or id; read back as the rows themselves, in the row's order; never among its values", async () => {
    const out = await request(app).post(`${at(w.books)}/rows`).send({ slug: "b1", lang: "en", values: { title: "B1", author: "a1", tags: "t1, t2" } }).expect(201);
    b1 = out.body.id;
    expect(out.body.data.author).toEqual([{ id: await idOf(w.authors, "a1"), slug: "a1", status: "DRAFT", title: { en: "A1" } }]);
    expect(linked(out.body, "tags")).toEqual(["t1", "t2"]);
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: b1 } })).data).toEqual({ title: { en: "B1" } });
    expect(await prisma.collectionLink.count({ where: { fromId: b1 } })).toBe(3);
    // A cell: the new rows by id, in the order given; the other relation stays.
    const cell = await patch(w.books, b1, { tags: [await idOf(w.tags, "t3"), await idOf(w.tags, "t1")] }).expect(200);
    expect(linked(cell.body, "tags")).toEqual(["t3", "t1"]);
    expect(linked(await row(w.books, "b1"), "author")).toEqual(["a1"]);
    // An empty cell unlinks.
    expect((await patch(w.books, b1, { author: [] }).expect(200)).body.data.author).toBeUndefined();
    expect((await patch(w.books, b1, { author: "a2" }).expect(200)).body.data.author[0].slug).toBe("a2");
    expect((await patch(w.books, b1, { author: null }).expect(200)).body.data.author).toBeUndefined();
    await patch(w.books, b1, { author: [{ id: await idOf(w.authors, "a1") }] }).expect(200);
  });

  test("the field's own rules: one row, a row that is there, not itself", async () => {
    const two = await patch(w.books, b1, { author: "a1, a2" }).expect(400);
    expect(two.body.details.issues).toEqual([{ field: "author", message: "One row only" }]);
    const none = await patch(w.books, b1, { tags: "t1, zz" }).expect(400);
    expect(none.body.details.issues).toEqual([{ field: "tags", message: "No such row", value: "zz" }]);
    expect((await patch(w.books, b1, { tags: 5 }).expect(400)).body.details.issues[0].message).toBe("Rows by their id or address");
    // A row in the trash can't be linked.
    await bulk(w.tags, { ids: [await idOf(w.tags, "t2")], op: "trash" }).expect(200);
    expect((await patch(w.books, b1, { tags: "t2" }).expect(400)).body.details.issues[0]).toMatchObject({ message: "No such row", value: "t2" });
    await bulk(w.tags, { ids: [await idOf(w.tags, "t2")], op: "restore" }).expect(200);
    // Nothing changed meanwhile.
    expect(linked(await row(w.books, "b1"), "tags")).toEqual(["t3", "t1"]);
    // A table that links itself: a row can't link itself.
    const fields = [{ id: "title", type: "text", required: true }, { id: "parent", type: "relation", to: w.authors }];
    await save(w.authors, w.names.authors, fields).expect(200);
    const a1 = await idOf(w.authors, "a1");
    expect((await patch(w.authors, a1, { parent: [a1] }).expect(400)).body.details.issues[0].message).toBe("A row can't link itself");
    expect(linked((await patch(w.authors, a1, { parent: "a2" }).expect(200)).body, "parent")).toEqual(["a2"]);
  });

  test("a file: a cell names rows by address; an empty cell says nothing; a row that isn't there is reported", async () => {
    const out = await add(w.books, [
      { slug: "b2", values: { title: "B2", author: "a2", tags: "t1; t2" } },
      { slug: "b3", values: { title: "B3", tags: "" } },
      { slug: "b4", values: { title: "B4", author: "nobody" } },
    ]);
    expect(out).toMatchObject({ created: 2, rejected: [{ row: 2, slug: "b4", issues: [{ field: "author", message: "No such row", value: "nobody" }] }] });
    expect(linked(await row(w.books, "b2"), "tags")).toEqual(["t1", "t2"]);
    // Changing rows from a file: the given relation is replaced, the other stays, an empty cell says nothing.
    const again = await add(w.books, [{ slug: "b2", values: { tags: "t3" } }, { slug: "b1", values: { tags: "" } }], { mode: "upsert" });
    expect(again).toMatchObject({ updated: 2, rejected: [] });
    expect(linked(await row(w.books, "b2"), "tags")).toEqual(["t3"]);
    expect(linked(await row(w.books, "b2"), "author")).toEqual(["a2"]);
    expect(linked(await row(w.books, "b1"), "tags")).toEqual(["t3", "t1"]);
    // Only looked at: nothing written.
    const dry = await add(w.books, [{ slug: "b9", values: { title: "B9", author: "a3" } }], { dryRun: true });
    expect(dry).toMatchObject({ created: 1, rejected: [] });
    expect(await row(w.books, "b9")).toBeUndefined();
    // The file out: linked rows by their addresses.
    const csv = (await request(app).get(`${at(w.books)}/rows/export`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }] }) }).expect(200)).text;
    expect(csv.split("\r\n")[0]).toBe("﻿slug,status,title.ar,title.en,title.he,author,tags,note.ar,note.en,note.he");
    expect(csv.split("\r\n")[1]).toBe('b1,DRAFT,,B1,,a1,"t3, t1",,,');
    expect(csv.split("\r\n")[3]).toBe("b3,DRAFT,,B3,,,,,,");
  });

  test("asked of the grid: linked to these rows, to none, to some; ordered by how many", async () => {
    const a1 = await idOf(w.authors, "a1");
    expect(slugs(await rows(w.books, { filters: [{ field: "author", op: "anyOf", value: [a1] }] }))).toEqual(["b1"]);
    expect(slugs(await rows(w.books, { filters: [{ field: "author", op: "anyOf", value: [a1, await idOf(w.authors, "a2")] }] }))).toEqual(["b1", "b2"]);
    expect(slugs(await rows(w.books, { filters: [{ field: "author", op: "empty" }] }))).toEqual(["b3"]);
    expect(slugs(await rows(w.books, { filters: [{ field: "tags", op: "notEmpty" }] }))).toEqual(["b1", "b2"]);
    expect(slugs(await rows(w.books, { sort: [{ field: "tags", dir: "desc" }, { field: "$slug", dir: "asc" }] }))).toEqual(["b1", "b2", "b3"]);
    await request(app).get(`${at(w.books)}/rows`).query({ q: JSON.stringify({ filters: [{ field: "author", op: "contains", value: "a" }] }) }).expect(400);
  });

  test("rows to pick from: a few, by their words or address, lightly", async () => {
    const all = (await request(app).get(`${at(w.tags)}/rows/lookup`).expect(200)).body;
    expect(all.total).toBe(3);
    expect(all.rows.find((r: { slug: string }) => r.slug === "t1")).toEqual({ id: await idOf(w.tags, "t1"), slug: "t1", status: "DRAFT", title: { en: "T1" } });
    const some = (await request(app).get(`${at(w.tags)}/rows/lookup`).query({ search: "T2" }).expect(200)).body;
    expect(some.rows.map((r: { slug: string }) => r.slug)).toEqual(["t2"]);
    await request(app).get(`/v1/admin/collections/nope/rows/lookup`).expect(404);
  });

  test("many rows at once: the same rows linked from each, or unlinked", async () => {
    const all = await bulk(w.books, { query: { filters: [{ field: "tags", op: "notEmpty" }] }, op: "set", field: "tags", value: "t2, t1" }).expect(200);
    expect(all.body.changed).toBe(2);
    expect(linked(await row(w.books, "b1"), "tags")).toEqual(["t2", "t1"]);
    expect(linked(await row(w.books, "b2"), "tags")).toEqual(["t2", "t1"]);
    expect(linked(await row(w.books, "b3"), "tags")).toEqual([]);
    await bulk(w.books, { ids: [await idOf(w.books, "b2")], op: "set", field: "tags", value: "" }).expect(200);
    expect(linked(await row(w.books, "b2"), "tags")).toEqual([]);
    expect((await bulk(w.books, { ids: [b1], op: "set", field: "author", value: "a1, a2" }).expect(400)).body.details.issues[0].message).toBe("One row only");
    expect((await bulk(w.books, { ids: [b1], op: "set", field: "author", value: "ghost" }).expect(400)).body.details.issues[0].message).toBe("No such row");
  });

  test("the older item routes link the same way", async () => {
    const a3 = await idOf(w.authors, "a3");
    const out = await request(app).post(`${at(w.books)}/items`).send({ slug: "old", data: { title: { en: "Old" }, author: [a3], tags: ["t1"] } }).expect(201);
    expect(linked(out.body, "author")).toEqual(["a3"]);
    const list = (await request(app).get(`${at(w.books)}/items`).expect(200)).body as Row[];
    expect(linked(list.find((r) => r.slug === "old"), "tags")).toEqual(["t1"]);
    // The whole form again without the author: its tags are replaced, its author stays.
    const put = await request(app).put(`${at(w.books)}/items/${out.body.id}`).send({ data: { title: { en: "Old" }, tags: [] } }).expect(200);
    expect(put.body.data.tags).toBeUndefined();
    expect(linked(put.body, "author")).toEqual(["a3"]);
    const bad = await request(app).post(`${at(w.books)}/items`).send({ slug: "old2", data: { title: { en: "Old" }, author: ["ghost"] } }).expect(400);
    expect(bad.body).toMatchObject({ error: "ITEM_INVALID", issues: [{ field: "author", message: "No such row", value: "ghost" }] });
  });
});

describe("A row there linked from one row only; a relation that must be filled", () => {
  test("one-to-one: a row another row holds is refused, in the table and within one file", async () => {
    const w = await world({ exclusive: true, required: true });
    expect((await request(app).post(`${at(w.books)}/rows`).send({ slug: "b1", lang: "en", values: { title: "B1" } }).expect(400)).body.details.issues).toEqual([{ field: "author", message: "Required" }]);
    const b1 = (await request(app).post(`${at(w.books)}/rows`).send({ slug: "b1", lang: "en", values: { title: "B1", author: "a1" } }).expect(201)).body.id;
    const taken = await request(app).post(`${at(w.books)}/rows`).send({ slug: "b2", lang: "en", values: { title: "B2", author: "a1" } }).expect(400);
    expect(taken.body.details.issues).toEqual([{ field: "author", message: "Already linked from another row", value: "a1" }]);
    const file = await add(w.books, [{ slug: "b3", values: { title: "B3", author: "a2" } }, { slug: "b4", values: { title: "B4", author: "a2" } }, { slug: "b5", values: { title: "B5" } }]);
    expect(file).toMatchObject({ created: 1, rejected: [{ row: 1, issues: [{ message: "Already linked from another row", value: "a2" }] }, { row: 2, issues: [{ field: "author", message: "Required" }] }] });
    // The row that holds it may say so again; it can't be emptied; many rows can't share one.
    await patch(w.books, b1, { author: "a1", title: "B1 again" }).expect(200);
    expect((await patch(w.books, b1, { author: [] }).expect(400)).body.details.issues[0].message).toBe("Required");
    expect((await bulk(w.books, { ids: [b1, await idOf(w.books, "b3")], op: "set", field: "author", value: "a3" }).expect(400)).body.details.issues[0].message).toBe("Only one row can link this row");
    await bulk(w.books, { ids: [b1], op: "set", field: "author", value: "a3" }).expect(200);
    expect(linked(await row(w.books, "b1"), "author")).toEqual(["a3"]);
    // A row in the trash still holds what it links (as it still holds an only value).
    await bulk(w.books, { ids: [b1], op: "trash" }).expect(200);
    expect((await request(app).post(`${at(w.books)}/rows`).send({ slug: "b6", lang: "en", values: { title: "B6", author: "a3" } }).expect(400)).body.details.issues[0].message).toBe("Already linked from another row");
    await bulk(w.books, { ids: [b1], op: "purge" }).expect(200);
    await request(app).post(`${at(w.books)}/rows`).send({ slug: "b6", lang: "en", values: { title: "B6", author: "a3" } }).expect(201);
  });
});

describe("Deleting a linked row", () => {
  test("unlink (the default): the link waits in the trash with its row, and goes for good with it", async () => {
    const w = await world();
    await add(w.books, [{ slug: "b1", values: { title: "B1", author: "a1", tags: "t1" } }]);
    const a1 = await idOf(w.authors, "a1");
    expect((await bulk(w.authors, { ids: [a1], op: "trash" }).expect(200)).body).toMatchObject({ changed: 1 });
    // The moment it went is now, whatever zone the database's clock is told in.
    expect(Math.abs((await prisma.collectionItem.findUniqueOrThrow({ where: { id: a1 } })).deletedAt!.getTime() - Date.now())).toBeLessThan(60_000);
    expect((await row(w.books, "b1")).data.author).toBeUndefined();
    expect(slugs(await rows(w.books, { filters: [{ field: "author", op: "empty" }] }))).toEqual(["b1"]);
    expect(await prisma.collectionLink.count({ where: { toId: a1 } })).toBe(1);
    // The row's whole form saved meanwhile (it sends the author it shows: none): the waiting link stays.
    await patch(w.books, await idOf(w.books, "b1"), { title: "B1 again", author: null, tags: ["t1"] }).expect(200);
    expect(await prisma.collectionLink.count({ where: { toId: a1 } })).toBe(1);
    await bulk(w.authors, { ids: [a1], op: "restore" }).expect(200);
    expect(linked(await row(w.books, "b1"), "author")).toEqual(["a1"]);
    // For good: no link is left without its row.
    await bulk(w.authors, { ids: [a1], op: "trash" }).expect(200);
    await bulk(w.authors, { ids: [a1], op: "purge" }).expect(200);
    expect(await prisma.collectionLink.count({ where: { toId: a1 } })).toBe(0);
    expect(linked(await row(w.books, "b1"), "tags")).toEqual(["t1"]);
    // The linking row deleted for good: its own links go too.
    const b1 = await idOf(w.books, "b1");
    await bulk(w.books, { ids: [b1], op: "trash" }).expect(200);
    await bulk(w.books, { ids: [b1], op: "purge" }).expect(200);
    expect(await prisma.collectionLink.count({ where: { collectionId: w.books } })).toBe(0);
  });

  test("with it: the rows linking it go to the trash with it, and what links those; they come back with it", async () => {
    const w = await world({ onDelete: "cascade" });
    const reviews = await mk(`${PREFIX}reviews`, [{ id: "title", type: "text" }, { id: "book", type: "relation", to: w.books, onDelete: "cascade" }]);
    await add(w.books, [{ slug: "b1", values: { title: "B1", author: "a1" } }, { slug: "b2", values: { title: "B2", author: "a2" } }]);
    await add(reviews, [{ slug: "r1", values: { title: "R1", book: "b1" } }, { slug: "r2", values: { title: "R2", book: "b2" } }]);
    const a1 = await idOf(w.authors, "a1");
    expect((await bulk(w.authors, { ids: [a1], op: "trash" }).expect(200)).body).toMatchObject({ changed: 1, withThem: 2 });
    expect(slugs(await rows(w.books))).toEqual(["b2"]);
    expect(slugs(await rows(reviews))).toEqual(["r2"]);
    expect(slugs(await rows(w.books, { view: "trash" }))).toEqual(["b1"]);
    expect((await bulk(w.authors, { ids: [a1], op: "restore" }).expect(200)).body).toMatchObject({ changed: 1, withThem: 2 });
    expect(slugs(await rows(w.books))).toEqual(["b1", "b2"]);
    expect(linked(await row(reviews, "r1"), "book")).toEqual(["b1"]);
    // A row trashed on its own earlier doesn't come back with a row trashed later.
    await bulk(reviews, { ids: [await idOf(reviews, "r1")], op: "trash" }).expect(200);
    await new Promise((done) => setTimeout(done, 20));
    await bulk(w.authors, { ids: [a1], op: "trash" }).expect(200);
    // Only the book comes back out of the books' trash; the author stays there, so the book shows none.
    expect((await bulk(w.books, { ids: [await idOf(w.books, "b1")], op: "restore" }).expect(200)).body).toMatchObject({ changed: 1 });
    expect((await row(w.books, "b1")).data.author).toBeUndefined();
    expect(slugs(await rows(reviews))).toEqual(["r2"]);
    // The older route deletes the same way.
    const gone = await request(app).delete(`${at(w.authors)}/items/${await idOf(w.authors, "a2")}`).expect(200);
    expect(gone.body).toEqual({ ok: true, withThem: 2 });
    expect(slugs(await rows(w.books))).toEqual(["b1"]);
  });

  test("forbidden: a row that stays and holds it refuses the whole act; nothing is trashed", async () => {
    const w = await world({ onDelete: "restrict" });
    await add(w.books, [{ slug: "b1", values: { title: "B1", author: "a1" } }, { slug: "b2", values: { title: "B2", author: "a1" } }]);
    const [a1, a2] = [await idOf(w.authors, "a1"), await idOf(w.authors, "a2")];
    const no = await bulk(w.authors, { ids: [a1, a2], op: "trash" }).expect(409);
    expect(no.body).toMatchObject({ error: "ROWS_LINKED", details: { blockers: [{ table: w.books, slug: w.names.books, field: "author", fieldName: null, rows: 2, sample: "b1" }] } });
    expect(slugs(await rows(w.authors))).toEqual(["a1", "a2", "a3"]);
    // The older route says the same.
    const old = await request(app).delete(`${at(w.authors)}/items/${a1}`).expect(409);
    expect(old.body).toMatchObject({ error: "ROWS_LINKED", blockers: [{ field: "author", rows: 2 }] });
    // A whole question: one held row refuses it all.
    await bulk(w.authors, { query: {}, op: "trash" }).expect(409);
    expect((await rows(w.authors)).length).toBe(3);
    // A row nobody holds goes; and the held one too once its holders let go (or are in the trash themselves).
    await bulk(w.authors, { ids: [a2], op: "trash" }).expect(200);
    await patch(w.books, await idOf(w.books, "b1"), { author: [] }).expect(200);
    await bulk(w.books, { ids: [await idOf(w.books, "b2")], op: "trash" }).expect(200);
    await bulk(w.authors, { ids: [a1], op: "trash" }).expect(200);
    expect(slugs(await rows(w.authors))).toEqual(["a3"]);
  });

  test("forbidden inside one table: rows that go together don't hold each other", async () => {
    const w = await world();
    await save(w.authors, w.names.authors, [{ id: "title", type: "text", required: true }, { id: "parent", type: "relation", to: w.authors, onDelete: "restrict" }]).expect(200);
    const [a1, a2] = [await idOf(w.authors, "a1"), await idOf(w.authors, "a2")];
    await patch(w.authors, a2, { parent: [a1] }).expect(200);
    await bulk(w.authors, { ids: [a1], op: "trash" }).expect(409);
    expect((await bulk(w.authors, { ids: [a1, a2], op: "trash" }).expect(200)).body.changed).toBe(2);
  });
});

describe("A table that is linked", () => {
  test("can't be deleted while other tables link it; a table deleted takes its rows' links", async () => {
    const w = await world();
    await add(w.books, [{ slug: "b1", values: { title: "B1", author: "a1", tags: "t1, t2" } }]);
    const no = await request(app).delete(at(w.authors)).expect(409);
    expect(no.body).toMatchObject({ error: "TABLE_LINKED", tables: [{ id: w.books, slug: w.names.books, field: "author" }] });
    expect(await prisma.collectionLink.count({ where: { collectionId: w.books } })).toBe(3);
    await request(app).delete(at(w.books)).expect(200);
    expect(await prisma.collectionLink.count({ where: { collectionId: w.books } })).toBe(0);
    await request(app).delete(at(w.authors)).expect(200);
    await request(app).delete(at(w.tags)).expect(200);
  });
});

describe("Changing a relation's field", () => {
  let w: Awaited<ReturnType<typeof world>>;
  const without = (id: string) => w.fields.filter((f) => f.id !== id);
  const withField = (id: string, over: Record<string, unknown>) => w.fields.map((f) => (f.id === id ? { ...f, ...over } : f));
  beforeAll(async () => {
    w = await world();
    await add(w.books, [
      { slug: "b1", values: { title: "B1", author: "a1", tags: "t1, t2", note: "first" } },
      { slug: "b2", values: { title: "B2", author: "a1", tags: "t1" } },
      { slug: "b3", values: { title: "B3", note: "third" } },
    ]);
  });

  test("removed: its links stay, hidden, and the change needs a yes; put back, they show again", async () => {
    const seen = await preview(w.books, w.names.books, without("tags"));
    expect(seen.needsAccept).toBe(true);
    expect(seen.changes).toEqual([{ field: "tags", change: "removed", from: "relation", rows: 2, converted: 0, lost: 0, hidden: 2, failing: 0, missing: 0, doubles: 0, samples: [] }]);
    expect((await save(w.books, w.names.books, without("tags")).expect(409)).body.error).toBe("SCHEMA_CHANGE_NEEDS_CONFIRM");
    await save(w.books, w.names.books, without("tags"), { accept: true }).expect(200);
    expect((await row(w.books, "b1")).data.tags).toBeUndefined();
    expect(await prisma.collectionLink.count({ where: { collectionId: w.books, fieldId: "tags" } })).toBe(3);
    const back = await preview(w.books, w.names.books, w.fields);
    expect(back).toMatchObject({ needsAccept: false, changes: [{ field: "tags", change: "added", to: "relation", rows: 2, converted: 2, hidden: 0 }] });
    await save(w.books, w.names.books, w.fields).expect(200);
    expect(linked(await row(w.books, "b1"), "tags")).toEqual(["t1", "t2"]);
  });

  test("its rules: counted, never rewritten", async () => {
    const one = await preview(w.books, w.names.books, withField("tags", { many: false }));
    expect(one).toMatchObject({ needsAccept: false, changes: [{ field: "tags", change: "ruled", rows: 2, failing: 1 }] });
    const single = await preview(w.books, w.names.books, withField("author", { exclusive: true }));
    expect(single.changes).toMatchObject([{ field: "author", change: "ruled", rows: 2, doubles: 2 }]);
    const must = await preview(w.books, w.names.books, withField("author", { required: true }));
    expect(must.changes).toMatchObject([{ field: "author", change: "ruled", rows: 2, missing: 1 }]);
    // What deleting does touches no row: not a change for the rows.
    expect((await preview(w.books, w.names.books, withField("author", { onDelete: "restrict" }))).changes).toEqual([]);
    // Pointed at another table: the links to the first one are hidden.
    const moved = await preview(w.books, w.names.books, withField("author", { to: w.tags }));
    expect(moved).toMatchObject({ needsAccept: true, changes: [{ field: "author", change: "ruled", rows: 2, hidden: 2, converted: 0 }] });
  });

  test("another kind: written values are put aside and come back; links are hidden and come back", async () => {
    const linking = withField("note", { type: "relation", to: w.tags });
    const seen = await preview(w.books, w.names.books, linking);
    expect(seen).toMatchObject({ needsAccept: true, changes: [{ field: "note", change: "retyped", from: "text", to: "relation", rows: 2, converted: 0, lost: 2, samples: [{ slug: "b1", why: "Links to rows, not a written value" }, { slug: "b3" }] }] });
    await save(w.books, w.names.books, linking, { accept: true }).expect(200);
    expect((await row(w.books, "b1")).data.note).toBeUndefined();
    await patch(w.books, await idOf(w.books, "b1"), { note: "t3" }).expect(200);
    expect(linked(await row(w.books, "b1"), "note")).toEqual(["t3"]);
    // Back to words: the words return, the link is hidden (and counted).
    const back = await preview(w.books, w.names.books, w.fields);
    expect(back).toMatchObject({ needsAccept: true, changes: [{ field: "note", change: "retyped", from: "relation", to: "text", converted: 2, hidden: 1 }] });
    await save(w.books, w.names.books, w.fields, { accept: true }).expect(200);
    expect((await row(w.books, "b1")).data.note).toEqual({ en: "first" });
    expect((await row(w.books, "b3")).data.note).toEqual({ en: "third" });
    expect(await prisma.collectionLink.count({ where: { collectionId: w.books, fieldId: "note" } })).toBe(1);
  });
});
