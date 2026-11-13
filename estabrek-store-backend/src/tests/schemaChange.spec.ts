import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";

// Changing a table's fields with the database (B2): the change is counted before it's made,
// values that would stop showing need a yes, a kind changed back brings every value back, and
// each change keeps a version to go back to. Requests without a token run as the test owner.

const SLUG = "schema-spec-things";
const BIG = "schema-spec-big";
const kind = { id: "kind", type: "select", options: [{ id: "new", name: { en: "New" } }, { id: "sale", name: { en: "On sale" } }] };
const fields = [{ id: "title", type: "text", required: true }, { id: "price", type: "text" }, kind, { id: "note", type: "text" }];
let id = "";
const base = () => `/v1/admin/collections/${id}`;
const body = (next: unknown[], more: Record<string, unknown> = {}) => ({ slug: SLUG, name: { en: "Schema spec" }, fields: next, ...more });
const data = async () => Object.fromEntries((await prisma.collectionItem.findMany({ where: { collectionId: id }, orderBy: { slug: "asc" } })).map((r) => [r.slug, r.data as Record<string, unknown>]));
const impactOf = (changes: Array<{ field: string }>, field: string) => changes.find((c) => c.field === field) as Record<string, any> | undefined;
const slugs = async (q: Record<string, unknown>) => ((await request(app).get(`${base()}/rows`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }], ...q }) }).expect(200)).body.rows as Array<{ slug: string }>).map((r) => r.slug);

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { in: [SLUG, BIG] } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { slug: { in: [SLUG, BIG] } } });
}
beforeAll(async () => {
  await clean();
  id = (await request(app).post("/v1/admin/collections").send(body(fields)).expect(201)).body.id;
  const out = await request(app)
    .post(`${base()}/rows/import`)
    .send({
      lang: "en",
      rows: [
        { slug: "a", values: { title: "A", price: "120", kind: "new", note: "first" } },
        { slug: "b", values: { title: "B", price: "1,250.5", kind: "sale", note: "second" } },
        { slug: "c", values: { title: "C", price: "cheap", kind: "sale" } },
        { slug: "d", values: { title: "D", kind: "new" } },
      ],
    })
    .expect(200);
  expect(out.body.created).toBe(4);
});
afterAll(clean);

describe("A field's kind changes", () => {
  const priced = [fields[0], { id: "price", type: "number" }, kind, fields[3]];

  test("the change is counted first: what turns, what can't, with why; nothing is written", async () => {
    const out = await request(app).post(`${base()}/fields/preview`).send(body(priced)).expect(200);
    expect(out.body.needsAccept).toBe(true);
    expect(out.body.changes).toEqual([{ field: "price", change: "retyped", from: "text", to: "number", rows: 3, converted: 2, lost: 1, hidden: 0, failing: 0, missing: 0, doubles: 0, samples: [{ slug: "c", value: '{"en":"cheap"}', why: "A number" }] }]);
    expect((await data()).a.price).toEqual({ en: "120" });
    expect(await prisma.studioRevision.count({ where: { objectId: id } })).toBe(0);
  });

  test("without a yes it's refused, with what it would do; with it the values turn and the old ones are put aside", async () => {
    const no = await request(app).put(base()).send(body(priced)).expect(409);
    expect(no.body.error).toBe("SCHEMA_CHANGE_NEEDS_CONFIRM");
    expect(impactOf(no.body.changes, "price")).toMatchObject({ converted: 2, lost: 1 });
    expect((await prisma.collection.findUniqueOrThrow({ where: { id } })).fields).toEqual(fields);

    const yes = await request(app).put(base()).send(body(priced, { accept: true })).expect(200);
    expect(yes.body.fields).toEqual(priced);
    expect(impactOf(yes.body.changes, "price")).toMatchObject({ converted: 2, lost: 1 });
    const now = await data();
    expect(now.a).toMatchObject({ price: 120, price$was: { en: "120" } });
    expect(now.b).toMatchObject({ price: 1250.5, price$was: { en: "1,250.5" } });
    expect(now.c).not.toHaveProperty("price");
    expect(now.c.price$was).toEqual({ en: "cheap" });
    expect(now.d).not.toHaveProperty("price$was");
    // The grid sees numbers now; what was put aside isn't shown, searched or sent out.
    expect(await slugs({ filters: [{ field: "price", op: "gt", value: 500 }] })).toEqual(["b"]);
    expect(await slugs({ filters: [{ field: "price", op: "empty" }] })).toEqual(["c", "d"]);
    expect(await slugs({ search: "cheap" })).toEqual([]);
    expect(await slugs({ search: "second" })).toEqual(["b"]);
    const csv = (await request(app).get(`${base()}/rows/export`).expect(200)).text;
    expect(csv).not.toContain("cheap");
    expect(csv).not.toContain("$was");
    // …nor answered by the routes: a row's values are its fields' values.
    const answered = (await request(app).get(`${base()}/rows`).expect(200)).body.rows as Array<{ slug: string; data: Record<string, unknown> }>;
    expect(answered.find((r) => r.slug === "a")!.data).toEqual({ title: { en: "A" }, price: 120, kind: "new", note: { en: "first" } });
    expect(JSON.stringify(answered)).not.toContain("$was");
    expect(JSON.stringify((await request(app).get(`${base()}/items`).expect(200)).body)).not.toContain("$was");
    const c = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug: "c" } });
    expect((await request(app).patch(`${base()}/rows/${c.id}`).send({ values: { note: "third" }, lang: "en" }).expect(200)).body.data).toEqual({ title: { en: "C" }, kind: "sale", note: { en: "third" } });
  });

  test("a row written again keeps what was put aside, whichever way it's written", async () => {
    const c = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug: "c" } });
    await request(app).patch(`${base()}/rows/${c.id}`).send({ values: { note: "third" }, lang: "en" }).expect(200);
    await request(app).put(`${base()}/items/${c.id}`).send({ data: { title: { en: "C" }, kind: "sale", note: { en: "third!" } } }).expect(200);
    await request(app).post(`${base()}/rows/import`).send({ mode: "upsert", lang: "en", rows: [{ slug: "c", values: { title: "C again" } }] }).expect(200);
    expect((await data()).c).toEqual({ title: { en: "C again" }, kind: "sale", note: { en: "third!" }, price$was: { en: "cheap" } });
  });

  test("each change keeps a version; going back brings every value back as it was, the one that couldn't turn too", async () => {
    const list = await request(app).get(`${base()}/revisions`).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].fields.map((f: { id: string; type: string }) => `${f.id}:${f.type}`)).toEqual(["title:text", "price:text", "kind:select", "note:text"]);
    expect(impactOf(list.body[0].changes, "price")).toMatchObject({ change: "retyped", lost: 1 });
    const rev = list.body[0].id;
    const look = await request(app).post(`${base()}/revisions/${rev}/preview`).send({}).expect(200);
    // Nothing would be put aside this time: all three come back.
    expect(look.body.needsAccept).toBe(false);
    expect(impactOf(look.body.changes, "price")).toMatchObject({ change: "retyped", from: "number", to: "text", converted: 3, lost: 0 });
    const back = await request(app).post(`${base()}/revisions/${rev}/restore`).send({}).expect(200);
    expect(back.body.fields).toEqual(fields);
    const now = await data();
    expect(now.a.price).toEqual({ en: "120" });
    expect(now.b.price).toEqual({ en: "1,250.5" });
    expect(now.c.price).toEqual({ en: "cheap" });
    for (const slug of ["a", "b", "c", "d"]) expect(now[slug]).not.toHaveProperty("price$was");
    // Going back is a change too: it has its own version.
    expect((await request(app).get(`${base()}/revisions`).expect(200)).body).toHaveLength(2);
    await request(app).post(`${base()}/revisions/nope/restore`).send({}).expect(404);
  });
});

describe("The one history", () => {
  test("a table's changes are listed with everything else; going back is done from the table, where it's shown first", async () => {
    const out = await request(app).get("/v1/admin/history").query({ area: "tables" }).expect(200);
    const mine = (out.body.entries as Array<{ id: string; area: string; title: string | null; what: string[]; detail: { tableId?: string }; restore: string | null; link: string | null }>).filter((e) => e.detail?.tableId === id);
    expect(mine).toHaveLength(2);
    expect(mine.every((e) => e.area === "tables" && e.title === "Schema spec" && e.restore === null && e.link === "/admin/collections")).toBe(true);
    expect(mine.map((e) => e.what)).toEqual([["price:retyped:number:text"], ["price:retyped:text:number"]]);
    expect(out.body.areas).toEqual(["tables"]);
    const no = await request(app).post("/v1/admin/history/restore").send({ area: "tables", id: mine[0].id }).expect(409);
    expect(no.body.error).toBe("TABLE_VERSION_FROM_TABLE");
    // Listed among the other areas too.
    const all = await request(app).get("/v1/admin/history").expect(200);
    expect(all.body.areas).toContain("tables");
  });
});

describe("A field goes, and comes back", () => {
  const without = fields.filter((f) => f.id !== "note");

  test("its values stay in the rows, hidden; they show again when the field is back", async () => {
    const look = await request(app).post(`${base()}/fields/preview`).send(body(without)).expect(200);
    expect(look.body).toMatchObject({ needsAccept: true, changes: [{ field: "note", change: "removed", from: "text", rows: 3, hidden: 3, lost: 0 }] });
    await request(app).put(base()).send(body(without)).expect(409);
    await request(app).put(base()).send(body(without, { accept: true })).expect(200);
    expect((await data()).a.note).toEqual({ en: "first" });
    expect(await slugs({ search: "first" })).toEqual([]);
    await request(app).get(`${base()}/rows`).query({ q: JSON.stringify({ filters: [{ field: "note", op: "notEmpty" }] }) }).expect(400);
    // Back with the same kind: the values fit and show.
    const again = await request(app).post(`${base()}/fields/preview`).send(body(fields)).expect(200);
    expect(again.body).toMatchObject({ needsAccept: false, changes: [{ field: "note", change: "added", to: "text", rows: 3, converted: 3, lost: 0 }] });
    await request(app).put(base()).send(body(fields)).expect(200);
    expect(await slugs({ search: "first" })).toEqual(["a"]);
    // Back as another kind: the old words don't fit a number; they're put aside, not shown as numbers.
    await request(app).put(base()).send(body(without, { accept: true })).expect(200);
    const asNumber = [...without, { id: "note", type: "number" }];
    const look2 = await request(app).post(`${base()}/fields/preview`).send(body(asNumber)).expect(200);
    expect(look2.body).toMatchObject({ needsAccept: true, changes: [{ field: "note", change: "added", to: "number", rows: 3, converted: 0, lost: 3 }] });
    await request(app).put(base()).send(body(fields)).expect(200);
  });
});

describe("Rules and choices change", () => {
  test("nothing is rewritten; the rows that wouldn't pass now are counted, with a few shown", async () => {
    const tighter = [{ id: "title", type: "text", required: true, unique: true }, { id: "price", type: "text", max: 4, required: true }, { ...kind, options: [kind.options[0]] }, fields[3]];
    const before = await data();
    const look = await request(app).post(`${base()}/fields/preview`).send(body(tighter)).expect(200);
    expect(look.body.needsAccept).toBe(false);
    expect(impactOf(look.body.changes, "price")).toMatchObject({ change: "ruled", rows: 3, failing: 2, missing: 1 });
    expect(impactOf(look.body.changes, "price")!.samples.map((s: { slug: string; why: string }) => `${s.slug}: ${s.why}`)).toEqual(["b: Too long", "c: Too long"]);
    expect(impactOf(look.body.changes, "kind")).toMatchObject({ change: "ruled", rows: 4, failing: 2, samples: [{ slug: "b", value: "sale", why: "One of its choices" }, { slug: "c", value: "sale", why: "One of its choices" }] });
    expect(impactOf(look.body.changes, "title")).toMatchObject({ change: "ruled", doubles: 0 });
    // No yes needed: the rows stay as they are.
    await request(app).put(base()).send(body(tighter)).expect(200);
    expect(await data()).toEqual(before);
    // "No doubles" asked of a column that has doubles: counted.
    const c = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug: "c" } });
    await prisma.collectionItem.update({ where: { id: c.id }, data: { data: { ...(c.data as object), kind: "new" } } });
    const doubled = [fields[0], fields[1], { ...kind, unique: false }, { id: "note", type: "text", unique: true }];
    await prisma.collectionItem.updateMany({ where: { collectionId: id, slug: { in: ["a", "b"] } }, data: { data: { title: { en: "Same" }, note: { en: "Twice" } } } });
    const look2 = await request(app).post(`${base()}/fields/preview`).send(body(doubled)).expect(200);
    expect(impactOf(look2.body.changes, "note")).toMatchObject({ change: "ruled", doubles: 2 });
    await request(app).put(base()).send(body(fields)).expect(200);
  });

  test("a save that changes nothing for the rows keeps no version; a bad table is refused before anything is counted", async () => {
    const before = await prisma.studioRevision.count({ where: { objectId: id } });
    await request(app).put(base()).send(body(fields)).expect(200);
    expect(await prisma.studioRevision.count({ where: { objectId: id } })).toBe(before);
    // A new name for a field is a change of the table (a version), not of the rows.
    const renamed = [{ ...fields[0], name: { en: "Title" } }, ...fields.slice(1)];
    expect((await request(app).put(base()).send(body(renamed)).expect(200)).body.changes).toEqual([]);
    expect(await prisma.studioRevision.count({ where: { objectId: id } })).toBe(before + 1);
    await request(app).post(`${base()}/fields/preview`).send(body([{ id: "x", type: "nope" }])).expect(400);
    await request(app).post("/v1/admin/collections/nope/fields/preview").send(body(fields)).expect(404);
  });
});

describe("A big table", () => {
  test("3,000 rows change kind and back, a thousand at a time, losing nothing", async () => {
    const made = await request(app).post("/v1/admin/collections").send({ slug: BIG, name: { en: "Big" }, fields: [{ id: "title", type: "text" }, { id: "n", type: "text" }] }).expect(201);
    const big = made.body.id as string;
    await prisma.collectionItem.createMany({ data: Array.from({ length: 3000 }, (_, k) => ({ collectionId: big, slug: `row-${k}`, data: { title: { en: `Row ${k}` }, n: { en: k % 10 === 0 ? `about ${k}` : String(k) } } })) });
    const numbers = { slug: BIG, name: { en: "Big" }, fields: [{ id: "title", type: "text" }, { id: "n", type: "number" }] };
    const look = await request(app).post(`/v1/admin/collections/${big}/fields/preview`).send(numbers).expect(200);
    expect(look.body.changes[0]).toMatchObject({ rows: 3000, converted: 2700, lost: 300 });
    expect(look.body.changes[0].samples).toHaveLength(5);
    await request(app).put(`/v1/admin/collections/${big}`).send({ ...numbers, accept: true }).expect(200);
    expect(await prisma.collectionItem.count({ where: { collectionId: big, data: { path: ["n"], equals: 1234 } } })).toBe(1);
    const rev = (await request(app).get(`/v1/admin/collections/${big}/revisions`).expect(200)).body[0].id;
    await request(app).post(`/v1/admin/collections/${big}/revisions/${rev}/restore`).send({}).expect(200);
    const after = await prisma.collectionItem.findMany({ where: { collectionId: big, slug: { in: ["row-10", "row-1234", "row-2999"] } }, orderBy: { slug: "asc" } });
    expect(after.map((r) => r.data)).toEqual([{ title: { en: "Row 10" }, n: { en: "about 10" } }, { title: { en: "Row 1234" }, n: { en: "1234" } }, { title: { en: "Row 2999" }, n: { en: "2999" } }]);
    // The table gone, its versions go with it.
    await request(app).delete(`/v1/admin/collections/${big}`).expect(200);
    expect(await prisma.studioRevision.count({ where: { objectId: big } })).toBe(0);
  }, 60_000);
});
