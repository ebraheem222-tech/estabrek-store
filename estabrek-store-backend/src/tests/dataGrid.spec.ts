import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { loadListData, purgeTrash, TRASH_DAYS } from "../lib/collections.js";

// The data grid (admin → الجداول) with the database: a table's rows filtered, sorted and searched
// where they live, cells changed one at a time, many rows at once, the trash, and CSV in and out.
// Requests without a token run as the test owner.

const SLUG = "grid-spec-products";
const BIG = "grid-spec-big";
const fields = [
  { id: "title", type: "text", name: { en: "Title" }, required: true },
  { id: "body", type: "longText" },
  { id: "price", type: "number" },
  { id: "day", type: "date" },
  { id: "active", type: "boolean" },
  { id: "kind", type: "select", options: [{ id: "new", name: { en: "New", ar: "جديد" } }, { id: "sale", name: { en: "On sale" } }, { id: "old", name: { en: "Old" } }] },
  { id: "cover", type: "image" },
  { id: "link", type: "link" },
  { id: "tint", type: "color" },
];
let id = "";
const base = () => `/v1/admin/collections/${id}`;
const rows = (q: Record<string, unknown> = {}) => request(app).get(`${base()}/rows`).query({ q: JSON.stringify(q) });
const slugs = async (q: Record<string, unknown> = {}) => ((await rows(q).expect(200)).body.rows as Array<{ slug: string }>).map((r) => r.slug);

async function clean() {
  await prisma.collection.deleteMany({ where: { slug: { in: [SLUG, BIG] } } });
}

beforeAll(async () => {
  await clean();
  const made = await request(app).post("/v1/admin/collections").send({ slug: SLUG, name: { en: "Grid spec" }, fields }).expect(201);
  id = made.body.id;
});
afterAll(clean);

const FILE = [
  { slug: "spring", status: "published", values: { "title.en": "Spring dress", "title.ar": "فستان الربيع", price: "1,200", day: "13/11/2026", active: "yes", kind: "جديد", link: "/shop", tint: "#C86B98" } },
  { slug: "summer", values: { title: "Summer hat", price: "80", day: "2026-06-01", active: "no", kind: "sale", body: "Light and wide" } },
  { slug: "autumn", status: "PUBLISHED", values: { title: "Autumn coat", price: 450, day: "2026-09-15", kind: "old", cover: "https://img.test/coat.jpg" } },
  { slug: "winter", values: { title: "Winter scarf", price: 0, active: true } },
  { values: { title: "No address here" } },
  { values: { "title.ar": "بدون عنوان إنجليزي", price: 5 } },
];

describe("Rows in from a file", () => {
  test("a dry run only reports: what would be added, and each refused row with why", async () => {
    const bad = [...FILE, { slug: "broken", values: { price: "cheap", kind: "other", nope: 1 } }, { slug: "Bad Slug", values: { title: "x" } }, { slug: "spring", values: { title: "twice" } }, { slug: "s2", status: "gone", values: { title: "x" } }];
    const out = await request(app).post(`${base()}/rows/import`).send({ rows: bad, lang: "en", dryRun: true }).expect(200);
    expect(out.body).toMatchObject({ dryRun: true, created: 6, updated: 0 });
    expect(out.body.rejected).toEqual([
      { row: 6, slug: "broken", issues: [{ field: "nope", message: "No such column" }, { field: "title", message: "Required" }, { field: "price", message: "A number" }, { field: "kind", message: "One of its choices" }] },
      { row: 7, slug: "bad slug", issues: [{ field: "slug", message: "Small letters, digits and -" }] },
      { row: 8, slug: "spring", issues: [{ field: "slug", message: "Twice in this file" }] },
      { row: 9, slug: "s2", issues: [{ field: "status", message: "DRAFT, PUBLISHED or ARCHIVED" }] },
    ]);
    expect(await prisma.collectionItem.count({ where: { collectionId: id } })).toBe(0);
  });

  test("the real one writes the good rows; addresses are made where none was given", async () => {
    const out = await request(app).post(`${base()}/rows/import`).send({ rows: FILE, lang: "en" }).expect(200);
    expect(out.body).toEqual({ dryRun: false, created: 6, updated: 0, rejected: [] });
    const spring = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug: "spring" } });
    expect(spring).toMatchObject({ status: "PUBLISHED", data: { title: { en: "Spring dress", ar: "فستان الربيع" }, price: 1200, day: "2026-11-13", active: true, kind: "new", link: "/shop", tint: "#C86B98" } });
    expect(spring.publishedAt).toBeInstanceOf(Date);
    const all = await slugs({ sort: [{ field: "$slug", dir: "asc" }] });
    expect(all.slice(0, 2)).toEqual(["autumn", "no-address-here"]);
    expect(all.filter((s) => /^row-[0-9a-f]{8}$/.test(s))).toHaveLength(1);
    // The same file again: every address is taken, nothing is added twice.
    const again = await request(app).post(`${base()}/rows/import`).send({ rows: FILE.slice(0, 4), lang: "en" }).expect(200);
    expect(again.body).toMatchObject({ created: 0, updated: 0 });
    expect(again.body.rejected.map((r: { issues: Array<{ message: string }> }) => r.issues[0].message)).toEqual(Array(4).fill("This address is already used"));
  });

  test("\"update the ones that exist\": the file's columns replace, the others stay", async () => {
    const out = await request(app)
      .post(`${base()}/rows/import`)
      .send({ mode: "upsert", lang: "he", rows: [{ slug: "summer", status: "PUBLISHED", values: { price: "95", title: "כובע קיץ" } }, { slug: "brand-new", values: { title: "חדש" } }] })
      .expect(200);
    expect(out.body).toEqual({ dryRun: false, created: 1, updated: 1, rejected: [] });
    const summer = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug: "summer" } });
    expect(summer).toMatchObject({ status: "PUBLISHED", data: { title: { en: "Summer hat", he: "כובע קיץ" }, price: 95, day: "2026-06-01", active: false, kind: "sale", body: { en: "Light and wide" } } });
    expect(summer.publishedAt).toBeInstanceOf(Date);
  });
});

describe("Asking the table", () => {
  test("pages, the total, the tabs' numbers and the time it took", async () => {
    const first = await rows({ pageSize: 3, sort: [{ field: "$slug", dir: "asc" }] }).expect(200);
    expect(first.body).toMatchObject({ total: 7, page: 1, pageSize: 3, counts: { all: 7, draft: 4, published: 3, archived: 0, trash: 0 } });
    expect(first.body.rows.map((r: { slug: string }) => r.slug)).toEqual(["autumn", "brand-new", "no-address-here"]);
    expect(first.body.rows[0]).toMatchObject({ collectionId: id, status: "PUBLISHED", data: { title: { en: "Autumn coat" } }, deletedAt: null });
    expect(typeof first.body.ms).toBe("number");
    const last = await rows({ pageSize: 3, page: 3, sort: [{ field: "$slug", dir: "asc" }] }).expect(200);
    expect(last.body.rows).toHaveLength(1);
    expect(await slugs({ view: "published", sort: [{ field: "$slug", dir: "asc" }] })).toEqual(["autumn", "spring", "summer"]);
  });

  test("search looks in every value and the address, never in the fields' names", async () => {
    expect(await slugs({ search: "SPRING DRESS" })).toEqual(["spring"]);
    // Anywhere in the words ("address" holds "dress").
    expect((await slugs({ search: "dress" })).sort()).toEqual(["no-address-here", "spring"]);
    expect(await slugs({ search: "الربيع" })).toEqual(["spring"]);
    expect(await slugs({ search: "wide" })).toEqual(["summer"]);
    expect(await slugs({ search: "brand" })).toEqual(["brand-new"]);
    expect(await slugs({ search: "title" })).toEqual([]);
    expect(await slugs({ search: "price" })).toEqual([]);
    // Words that look like a pattern are just words.
    expect(await slugs({ search: ".*" })).toEqual([]);
    expect(await slugs({ search: 'a"b\\c%' })).toEqual([]);
  });

  test("each kind of column answers its own questions", async () => {
    const by = async (...filters: Array<Record<string, unknown>>) => (await slugs({ filters, sort: [{ field: "$slug", dir: "asc" }] })).filter((s) => !s.startsWith("row-"));
    // Words, in any language.
    expect(await by({ field: "title", op: "contains", value: "COAT" })).toEqual(["autumn"]);
    expect(await by({ field: "title", op: "contains", value: "فستان" })).toEqual(["spring"]);
    expect(await by({ field: "title", op: "is", value: "summer hat" })).toEqual(["summer"]);
    expect(await by({ field: "title", op: "startsWith", value: "W" })).toEqual(["winter"]);
    expect(await by({ field: "title", op: "endsWith", value: "scarf" })).toEqual(["winter"]);
    expect(await by({ field: "title", op: "notContains", value: "a" })).toEqual(["brand-new", "spring"]);
    expect(await by({ field: "body", op: "notEmpty" })).toEqual(["summer"]);
    expect((await by({ field: "body", op: "empty" })).length).toBe(5);
    // Numbers (0 is a number, nothing is empty).
    expect(await by({ field: "price", op: "gt", value: 100 })).toEqual(["autumn", "spring"]);
    expect(await by({ field: "price", op: "lte", value: 95 })).toEqual(["summer", "winter"]);
    expect(await by({ field: "price", op: "between", value: 90, value2: 500 })).toEqual(["autumn", "summer"]);
    expect(await by({ field: "price", op: "is", value: "0" })).toEqual(["winter"]);
    expect(await by({ field: "price", op: "empty" })).toEqual(["brand-new", "no-address-here"]);
    expect(await by({ field: "price", op: "isNot", value: 0 })).toEqual(["autumn", "brand-new", "no-address-here", "spring", "summer"]);
    // Dates.
    expect(await by({ field: "day", op: "gte", value: "2026-09-15" })).toEqual(["autumn", "spring"]);
    expect(await by({ field: "day", op: "lt", value: "2026-09-15" })).toEqual(["summer"]);
    expect(await by({ field: "day", op: "between", value: "2026-06-01", value2: "2026-09-15" })).toEqual(["autumn", "summer"]);
    expect(await by({ field: "day", op: "is", value: "2026-11-13" })).toEqual(["spring"]);
    // Yes / no (never ticked is no).
    expect(await by({ field: "active", op: "isTrue" })).toEqual(["spring", "winter"]);
    expect((await by({ field: "active", op: "isFalse" })).sort()).toEqual(["autumn", "brand-new", "no-address-here", "summer"]);
    // Choices.
    expect(await by({ field: "kind", op: "is", value: "sale" })).toEqual(["summer"]);
    expect(await by({ field: "kind", op: "anyOf", value: ["new", "old"] })).toEqual(["autumn", "spring"]);
    expect(await by({ field: "kind", op: "isNot", value: "sale" })).toEqual(["autumn", "brand-new", "no-address-here", "spring", "winter"]);
    expect(await by({ field: "kind", op: "empty" })).toEqual(["brand-new", "no-address-here", "winter"]);
    // Pictures, links, colours.
    expect(await by({ field: "cover", op: "notEmpty" })).toEqual(["autumn"]);
    expect(await by({ field: "link", op: "contains", value: "shop" })).toEqual(["spring"]);
    expect(await by({ field: "tint", op: "is", value: "#c86b98" })).toEqual(["spring"]);
    // The row's own columns.
    expect(await by({ field: "$status", op: "is", value: "published" })).toEqual(["autumn", "spring", "summer"]);
    expect(await by({ field: "$status", op: "anyOf", value: ["DRAFT"] })).toEqual(["brand-new", "no-address-here", "winter"]);
    expect(await by({ field: "$slug", op: "startsWith", value: "s" })).toEqual(["spring", "summer"]);
    expect(await by({ field: "$slug", op: "contains", value: "ddr" })).toEqual(["no-address-here"]);
    expect(await by({ field: "$publishedAt", op: "empty" })).toEqual(["brand-new", "no-address-here", "winter"]);
    const today = new Date().toISOString().slice(0, 10);
    expect((await by({ field: "$createdAt", op: "gte", value: today })).length + (await by({ field: "$createdAt", op: "lt", value: today })).length).toBe(6);
    expect(await by({ field: "$createdAt", op: "gt", value: "2099-01-01" })).toEqual([]);
    expect((await by({ field: "$createdAt", op: "between", value: "2000-01-01", value2: "2099-01-01" })).length).toBe(6);
    // Together: all of them, or any of them.
    expect(await by({ field: "price", op: "gt", value: 50 }, { field: "active", op: "isTrue" })).toEqual(["spring"]);
    expect(await slugs({ match: "any", filters: [{ field: "kind", op: "is", value: "sale" }, { field: "price", op: "is", value: 0 }], sort: [{ field: "$slug", dir: "asc" }] })).toEqual(["summer", "winter"]);
    expect(await slugs({ search: "a", view: "published", filters: [{ field: "price", op: "lt", value: 1000 }], sort: [{ field: "price", dir: "desc" }] })).toEqual(["autumn", "summer"]);
  });

  test("sorting: numbers as numbers, words in the asked language, empty ones last either way", async () => {
    const named = (list: string[]) => list.filter((s) => !s.startsWith("row-"));
    expect(named(await slugs({ sort: [{ field: "price", dir: "desc" }, { field: "$slug", dir: "asc" }] }))).toEqual(["spring", "autumn", "summer", "winter", "brand-new", "no-address-here"]);
    expect(named(await slugs({ sort: [{ field: "price", dir: "asc" }, { field: "$slug", dir: "asc" }] })).slice(0, 4)).toEqual(["winter", "summer", "autumn", "spring"]);
    expect(named(await slugs({ lang: "en", sort: [{ field: "title", dir: "asc" }] })).slice(0, 4)).toEqual(["autumn", "no-address-here", "spring", "summer"]);
    expect((await slugs({ sort: [{ field: "day", dir: "desc" }] })).slice(0, 3)).toEqual(["spring", "autumn", "summer"]);
    expect((await slugs({ sort: [{ field: "active", dir: "desc" }, { field: "$slug", dir: "asc" }] })).slice(0, 2)).toEqual(["spring", "winter"]);
    expect((await slugs({ sort: [{ field: "$status", dir: "desc" }, { field: "$slug", dir: "asc" }] })).slice(0, 3)).toEqual(["autumn", "spring", "summer"]);
  });

  test("a question that doesn't fit the table is refused, and says which filter", async () => {
    const out = await rows({ filters: [{ field: "title", op: "empty" }, { field: "nope", op: "is", value: 1 }] }).expect(400);
    expect(out.body.error ?? out.body.code).toBe("BAD_GRID_QUERY");
    await rows({ filters: [{ field: "price", op: "contains", value: "1" }] }).expect(400);
    await rows({ sort: [{ field: "data", dir: "asc" }] }).expect(400);
    await request(app).get(`${base()}/rows`).query({ q: "{nope" }).expect(400);
    await request(app).get("/v1/admin/collections/no-such-table/rows").expect(404);
    const meta = await request(app).get("/v1/admin/collections/grid-meta").expect(200);
    expect(meta.body.ops.number).toContain("between");
    expect(meta.body.limits).toMatchObject({ rows: 50_000, pageSize: 200, importRows: 500, trashDays: 30 });
  });
});

describe("Changing rows", () => {
  const row = async (slug: string) => prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug } });

  test("a cell at a time: checked by its own field; the rest of the row stays", async () => {
    const winter = await row("winter");
    const out = await request(app).patch(`${base()}/rows/${winter.id}`).send({ values: { price: "35", kind: "On sale" } }).expect(200);
    expect(out.body.data).toEqual({ title: { en: "Winter scarf" }, price: 35, active: true, kind: "sale" });
    const bad = await request(app).patch(`${base()}/rows/${winter.id}`).send({ values: { price: "cheap" } }).expect(400);
    expect(JSON.stringify(bad.body)).toContain("A number");
    await request(app).patch(`${base()}/rows/${winter.id}`).send({ values: { title: "" } }).expect(400);
    const cleared = await request(app).patch(`${base()}/rows/${winter.id}`).send({ values: { price: null }, status: "PUBLISHED", sort: 5 }).expect(200);
    expect(cleared.body).toMatchObject({ status: "PUBLISHED", sort: 5, data: { title: { en: "Winter scarf" }, active: true, kind: "sale" } });
    expect(cleared.body.publishedAt).toBeTruthy();
    // Its address: a free one is taken, a used one is refused.
    await request(app).patch(`${base()}/rows/${winter.id}`).send({ slug: "spring" }).expect(409);
    await request(app).patch(`${base()}/rows/${winter.id}`).send({ slug: "Not OK" }).expect(400);
    expect((await request(app).patch(`${base()}/rows/${winter.id}`).send({ slug: "Winter-2026" }).expect(200)).body.slug).toBe("winter-2026");
    await request(app).patch(`${base()}/rows/${winter.id}`).send({ slug: "winter" }).expect(200);
    await request(app).patch(`${base()}/rows/nope`).send({ sort: 1 }).expect(404);
  });

  test("a new row: its address from its words, or given", async () => {
    const made = await request(app).post(`${base()}/rows`).send({ values: { title: "Spring dress" }, lang: "en" }).expect(201);
    expect(made.body).toMatchObject({ status: "DRAFT", data: { title: { en: "Spring dress" } } });
    expect(made.body.slug).toBe("spring-dress");
    // The same words again: the address is used, so it gets a few letters after it.
    const twin = await request(app).post(`${base()}/rows`).send({ values: { title: "Spring dress" }, lang: "en" }).expect(201);
    expect(twin.body.slug).toMatch(/^spring-dress-[0-9a-f]{6}$/);
    await request(app).post(`${base()}/rows`).send({ slug: "spring", values: { title: "x" } }).expect(400);
    await request(app).post(`${base()}/rows`).send({ values: { price: 5 } }).expect(400);
    await prisma.collectionItem.deleteMany({ where: { collectionId: id, slug: { startsWith: "spring-dress" } } });
  });

  test("many at once: by ticked rows, or by the grid's own question", async () => {
    const [summer, winter] = [await row("summer"), await row("winter")];
    const drafted = await request(app).post(`${base()}/rows/bulk`).send({ ids: [summer.id, winter.id, "nope"], op: "draft" }).expect(200);
    expect(drafted.body).toMatchObject({ changed: 2, counts: { published: 2 } });
    // Everything the question matches, whatever its page.
    const published = await request(app).post(`${base()}/rows/bulk`).send({ query: { filters: [{ field: "price", op: "notEmpty" }] }, op: "publish" }).expect(200);
    expect(published.body.changed).toBe(2);
    expect((await row("summer")).status).toBe("PUBLISHED");
    // The scarf has no price now: the question didn't match it.
    expect((await row("winter")).status).toBe("DRAFT");
    expect((await request(app).post(`${base()}/rows/bulk`).send({ ids: [winter.id], op: "publish" }).expect(200)).body).toMatchObject({ changed: 1, counts: { published: 5, draft: 2 } });
    // The moment it was published is now, whatever zone the database's own clock is told in.
    const stamped = await prisma.collectionItem.findUniqueOrThrow({ where: { id: winter.id } });
    for (const at of [stamped.publishedAt, stamped.updatedAt]) expect(Math.abs((at?.getTime() ?? 0) - Date.now())).toBeLessThan(60_000);
    // Already published: nothing to change.
    expect((await request(app).post(`${base()}/rows/bulk`).send({ ids: [winter.id], op: "publish" }).expect(200)).body.changed).toBe(0);
    // One value for all of them.
    const set = await request(app).post(`${base()}/rows/bulk`).send({ query: { view: "published" }, op: "set", field: "kind", value: "Old" }).expect(200);
    expect(set.body.changed).toBe(5);
    expect((await slugs({ filters: [{ field: "kind", op: "is", value: "old" }], sort: [{ field: "$slug", dir: "asc" }] })).filter((x) => !x.startsWith("row-"))).toEqual(["autumn", "spring", "summer", "winter"]);
    const emptied = await request(app).post(`${base()}/rows/bulk`).send({ ids: [summer.id], op: "set", field: "kind", value: "" }).expect(200);
    expect(emptied.body.changed).toBe(1);
    expect((await row("summer")).data).not.toHaveProperty("kind");
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [summer.id], op: "set", field: "price", value: "cheap" }).expect(400);
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [summer.id], op: "set", field: "title", value: "" }).expect(400);
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [summer.id], op: "set", field: "nope", value: 1 }).expect(400);
    await request(app).post(`${base()}/rows/bulk`).send({ op: "publish" }).expect(400);
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [summer.id], query: {}, op: "publish" }).expect(400);
    const archived = await request(app).post(`${base()}/rows/bulk`).send({ ids: [summer.id], op: "archive" }).expect(200);
    expect(archived.body.counts).toMatchObject({ archived: 1 });
    await request(app).post(`${base()}/rows/bulk`).send({ ids: [summer.id], op: "publish" }).expect(200);
  });
});

describe("The trash", () => {
  const row = async (slug: string) => prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug } });

  test("a deleted row waits in the trash: gone from the table, the lists and the shop; back with one press", async () => {
    const spring = await row("spring");
    const out = await request(app).post(`${base()}/rows/bulk`).send({ ids: [spring.id], op: "trash" }).expect(200);
    expect(out.body).toMatchObject({ changed: 1, counts: { all: 6, trash: 1 } });
    expect(await slugs({ search: "spring dress" })).toEqual([]);
    expect(await slugs({ view: "trash" })).toEqual(["spring"]);
    // The older list, the collections' numbers and the shop's lists don't see it.
    expect(((await request(app).get(`${base()}/items`).expect(200)).body as Array<{ slug: string }>).map((r) => r.slug)).not.toContain("spring");
    const listed = (await request(app).get("/v1/admin/collections").expect(200)).body.find((c: { id: string }) => c.id === id);
    expect(listed).toMatchObject({ items: 6, published: 4 });
    const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "l", type: "collectionList", props: { collectionId: id }, children: [] }] } };
    expect((await loadListData(tree as never)).get(id)?.items.map((i) => i.slug)).not.toContain("spring");
    // Nothing changes it while it's there, and its address stays its own.
    await request(app).patch(`${base()}/rows/${spring.id}`).send({ sort: 1 }).expect(409);
    expect((await request(app).post(`${base()}/rows/bulk`).send({ ids: [spring.id], op: "publish" }).expect(200)).body.changed).toBe(0);
    const taken = await request(app).post(`${base()}/rows/import`).send({ mode: "upsert", rows: [{ slug: "spring", values: { title: "again" } }] }).expect(200);
    expect(taken.body.rejected[0].issues).toEqual([{ field: "slug", message: "This address is in the trash" }]);
    const back = await request(app).post(`${base()}/rows/bulk`).send({ ids: [spring.id], op: "restore" }).expect(200);
    expect(back.body).toMatchObject({ changed: 1, counts: { all: 7, trash: 0 } });
    expect(await slugs({ search: "spring dress" })).toEqual(["spring"]);
  });

  test("only the trash is deleted for good; the older delete moves there first", async () => {
    const autumn = await row("autumn");
    // Not in the trash: "for good" does nothing.
    expect((await request(app).post(`${base()}/rows/bulk`).send({ ids: [autumn.id], op: "purge" }).expect(200)).body.changed).toBe(0);
    await request(app).delete(`${base()}/items/${autumn.id}`).expect(200);
    expect((await row("autumn")).deletedAt).toBeInstanceOf(Date);
    await request(app).delete(`${base()}/items/${autumn.id}`).expect(200);
    expect(await prisma.collectionItem.count({ where: { id: autumn.id } })).toBe(0);
    await request(app).delete(`${base()}/items/${autumn.id}`).expect(404);
  });

  test("the trash empties itself after its days", async () => {
    const winter = await row("winter");
    const summer = await row("summer");
    const day = 86_400_000;
    await prisma.collectionItem.update({ where: { id: winter.id }, data: { deletedAt: new Date(Date.now() - (TRASH_DAYS + 1) * day) } });
    await prisma.collectionItem.update({ where: { id: summer.id }, data: { deletedAt: new Date(Date.now() - (TRASH_DAYS - 1) * day) } });
    expect(await purgeTrash()).toEqual({ removed: 1 });
    expect(await prisma.collectionItem.count({ where: { id: winter.id } })).toBe(0);
    expect(await slugs({ view: "trash" })).toEqual(["summer"]);
    await request(app).post(`${base()}/rows/bulk`).send({ query: { view: "trash" }, op: "restore" }).expect(200);
  });
});

describe("Rows out", () => {
  test("CSV: the asked rows, every page of them, readable by a spreadsheet", async () => {
    await request(app).post(`${base()}/rows`).send({ slug: "tricky", values: { "title.en": '=SUM(A1) "quoted", with comma', body: "two\nlines" }, lang: "en" }).expect(201);
    const out = await request(app).get(`${base()}/rows/export`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }] }) }).expect(200);
    expect(out.headers["content-type"]).toContain("text/csv");
    expect(out.headers["content-disposition"]).toContain(`${SLUG}.csv`);
    const text = out.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.slice(1).split("\r\n");
    expect(lines[0]).toBe("slug,status,title.ar,title.en,title.he,body.ar,body.en,body.he,price,day,active,kind,cover,link,tint");
    expect(lines.find((l) => l.startsWith("spring,"))).toBe("spring,PUBLISHED,فستان الربيع,Spring dress,,,,,1200,2026-11-13,true,old,,/shop,#C86B98");
    expect(text).toContain(`tricky,DRAFT,,"'=SUM(A1) ""quoted"", with comma",,,"two\nlines",`);
    // Only what was asked.
    const some = await request(app).get(`${base()}/rows/export`).query({ q: JSON.stringify({ filters: [{ field: "price", op: "gt", value: 1000 }] }) }).expect(200);
    expect(some.text.slice(1).trim().split("\r\n")).toHaveLength(2);
    await request(app).get(`${base()}/rows/export`).query({ q: JSON.stringify({ filters: [{ field: "nope", op: "empty" }] }) }).expect(400);
    // The file goes back in as it came out (the quote that guarded the formula comes off).
    const again = await request(app).post(`${base()}/rows/import`).send({ mode: "upsert", lang: "en", rows: [{ slug: "tricky", values: { "title.en": `'=SUM(A1) "quoted", with comma` } }] }).expect(200);
    expect(again.body).toMatchObject({ updated: 1, rejected: [] });
    expect((await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: id, slug: "tricky" } })).data).toMatchObject({ title: { en: '=SUM(A1) "quoted", with comma' }, body: { en: "two\nlines" } });
  });
});

describe("A big table", () => {
  test("20,000 rows: filtered, searched and sorted in well under a second", async () => {
    const made = await request(app).post("/v1/admin/collections").send({ slug: BIG, name: { en: "Big" }, fields }).expect(201);
    const big = made.body.id as string;
    const kinds = ["new", "sale", "old"];
    for (let start = 0; start < 20_000; start += 5000) {
      await prisma.collectionItem.createMany({
        data: Array.from({ length: 5000 }, (_, k) => {
          const n = start + k;
          return { collectionId: big, slug: `row-${n}`, status: n % 3 ? "PUBLISHED" : "DRAFT", data: { title: { en: `Product ${n}`, ar: `منتج ${n}` }, body: { en: `Some longer words about product ${n}, its fabric and its fit.` }, price: n % 997, day: `2026-${String((n % 12) + 1).padStart(2, "0")}-15`, active: n % 2 === 0, kind: kinds[n % 3] } };
        }),
      });
    }
    const ask = (q: Record<string, unknown>) => request(app).get(`/v1/admin/collections/${big}/rows`).query({ q: JSON.stringify(q) }).expect(200);
    await ask({});
    const plain = await ask({ pageSize: 50 });
    expect(plain.body.total).toBe(20_000);
    const hard = await ask({ pageSize: 50, page: 3, search: "fabric", lang: "en", sort: [{ field: "price", dir: "desc" }, { field: "title", dir: "asc" }], filters: [{ field: "kind", op: "anyOf", value: ["new", "sale"] }, { field: "price", op: "between", value: 100, value2: 900 }, { field: "active", op: "isTrue" }, { field: "title", op: "contains", value: "product 1" }] });
    expect(hard.body.total).toBeGreaterThan(100);
    expect(hard.body.rows).toHaveLength(50);
    expect(plain.body.ms).toBeLessThan(1000);
    expect(hard.body.ms).toBeLessThan(1000);
    const all = await request(app).post(`/v1/admin/collections/${big}/rows/bulk`).send({ query: { view: "draft" }, op: "publish" }).expect(200);
    expect(all.body).toMatchObject({ changed: 6667, counts: { all: 20_000, published: 20_000, draft: 0 } });
    await prisma.collection.delete({ where: { id: big } });
  }, 120_000);
});
