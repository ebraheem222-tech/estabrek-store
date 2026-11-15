import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetKeys, hashKey } from "../lib/apiKeys.js";
import { forgetHits } from "../lib/hitLimit.js";

// The automatic API, with the database (B4): a table the owner opens gets /v1/data/<its address>
// with no code written for it. Closed until opened, act by act; a key is made in the admin, shown
// once and kept as a hash; anyone sees published rows only; rows are written under the table's own
// rules. Requests to /v1/admin without a token run as the test owner; requests to /v1/data carry a
// key or nothing.

const PREFIX = "api-spec-";
const P = `${PREFIX}posts`;
const A = `${PREFIX}authors`;
const N = `${PREFIX}notes`;
type Row = { id: string; slug: string; status: string; values: Record<string, any>; createdAt: string; updatedAt: string; publishedAt: string | null };
type Page = { data: Row[]; page: number; pageSize: number; total: number; pages: number };
type KeyView = { id: string; name: string; prefix: string; state: string; scopes: { tables: "*" | string[]; acts: string[] }; perMinute: number; lastUsedAt: string | null };

const admin = "/v1/admin";
const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const add = async (id: string, rows: Array<{ slug: string; status?: string; values: Record<string, unknown> }>) => (await request(app).post(`${admin}/collections/${id}/rows/import`).send({ lang: "en", rows }).expect(200)).body as { created: number; rejected: unknown[] };
const open = (id: string, access: Record<string, string>) => request(app).put(`${admin}/api/tables/${id}`).send({ read: "off", create: "off", update: "off", delete: "off", ...access });
const newKey = async (body: Record<string, unknown> = {}) => (await request(app).post(`${admin}/api/keys`).send({ name: "Spec key", scopes: { tables: "*", acts: ["read", "create", "update", "delete"] }, ...body }).expect(201)).body as { key: KeyView; secret: string };
const api = (path = "") => `/v1/data${path}`;
const get = (path: string, key?: string) => (key ? request(app).get(api(path)).set("X-Api-Key", key) : request(app).get(api(path)));
const slugs = (page: Page) => page.data.map((r) => r.slug);

let posts = "";
let authors = "";
let notes = "";

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.apiKey.deleteMany();
  await prisma.adminAuditLog.deleteMany({ where: { area: "data-api" } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@api-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  forgetKeys();
  forgetHits();
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  authors = await mk(A, [{ id: "name", type: "text", required: true }, { id: "city", type: "text" }]);
  posts = await mk(P, [
    { id: "title", type: "text", required: true },
    { id: "price", type: "number", min: 0 },
    { id: "body", type: "longText" },
    { id: "tag", type: "select", options: [{ id: "new" }, { id: "sale" }] },
    { id: "email", type: "email", unique: true },
    { id: "author", type: "relation", to: authors },
  ]);
  notes = await mk(N, [{ id: "title", type: "text", required: true }]);
  expect((await add(authors, [{ slug: "a1", status: "PUBLISHED", values: { name: "Amal", city: "Haifa" } }, { slug: "a2", values: { name: "Basel" } }])).created).toBe(2);
  expect(
    (
      await add(posts, [
        { slug: "p1", status: "PUBLISHED", values: { title: "Silk scarf", "title.ar": "وشاح حرير", price: 10, tag: "new", email: "one@shop.test", author: "a1" } },
        { slug: "p2", status: "PUBLISHED", values: { title: "Wool scarf", price: 30, tag: "sale", author: "a2" } },
        { slug: "p3", values: { title: "Linen (draft)", price: 20 } },
      ])
    ).created,
  ).toBe(3);
});
afterAll(clean);
beforeEach(() => {
  forgetHits();
});

describe("A table and the outside", () => {
  test("closed until its owner opens it: it answers as a table that isn't there", async () => {
    expect((await get(`/${P}`).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await get(`/${P}/p1`).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await request(app).post(api(`/${P}`)).send({ values: { title: "x" } }).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await get(`/${PREFIX}no-such-table`).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await get("").expect(200)).body.tables.filter((t: { table: string }) => t.table.startsWith(PREFIX))).toEqual([]);
    // A key doesn't open a closed table either.
    const { secret } = await newKey();
    expect((await get(`/${P}`, secret).expect(404)).body.error).toBe("NOT_FOUND");
  });

  test("the admin opens it act by act; changing and deleting are never for everyone", async () => {
    const page = (await request(app).get(`${admin}/api`).expect(200)).body;
    expect(page.base).toBe("/v1/data");
    const before = page.tables.find((t: { id: string }) => t.id === posts);
    expect(before).toMatchObject({ slug: P, open: false, access: { read: "off", create: "off", update: "off", delete: "off" } });
    expect(before.fields.map((f: { id: string }) => f.id)).toEqual(["title", "price", "body", "tag", "email", "author"]);
    for (const bad of [{ update: "public" }, { delete: "public" }, { read: "anyone" }]) expect((await open(posts, bad).expect(400)).body.error).toBe("VALIDATION_ERROR");
    expect((await request(app).put(`${admin}/api/tables/${posts}`).send({ read: "public" }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    expect((await open("no-such-id", { read: "public" }).expect(404)).body.error).toBe("NOT_FOUND");
    const was = await prisma.collection.findUniqueOrThrow({ where: { id: posts } });
    const after = (await open(posts, { read: "public" }).expect(200)).body;
    expect(after).toMatchObject({ id: posts, open: true, access: { read: "public", create: "off", update: "off", delete: "off" } });
    // The table itself (its fields, its name, when it last changed) is as it was.
    const now = await prisma.collection.findUniqueOrThrow({ where: { id: posts } });
    expect(now.updatedAt).toEqual(was.updatedAt);
    expect(now.fields).toEqual(was.fields);
  });

  test("anyone reads the published rows, and only those", async () => {
    const page = (await get(`/${P}?sort=slug`).expect(200)).body as Page;
    expect(page).toMatchObject({ page: 1, pageSize: 25, total: 2, pages: 1 });
    expect(slugs(page)).toEqual(["p1", "p2"]);
    const p1 = page.data[0];
    expect(Object.keys(p1)).toEqual(["id", "slug", "status", "values", "createdAt", "updatedAt", "publishedAt"]);
    // The authors' table is closed: the relation to it isn't in the answer.
    expect(p1.values).toEqual({ title: { en: "Silk scarf", ar: "وشاح حرير" }, price: 10, body: null, tag: "new", email: "one@shop.test" });
    expect((await get(`/${P}`).expect(200)).headers["cache-control"]).toBe("no-store");
    // One row, by its address or its id; a draft isn't there for anyone.
    expect((await get(`/${P}/p1`).expect(200)).body.id).toBe(p1.id);
    expect((await get(`/${P}/${p1.id}?lang=ar&fields=title`).expect(200)).body.values).toEqual({ title: "وشاح حرير" });
    expect((await get(`/${P}/p3`).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await get(`/${P}?status=draft`).expect(400)).body.error).toBe("BAD_QUERY");
    // Open for reading only: nothing else, and it says which.
    expect((await request(app).post(api(`/${P}`)).send({ values: { title: "x" } }).expect(403)).body.error).toBe("NOT_ALLOWED");
    expect((await request(app).patch(api(`/${P}/p1`)).send({ values: { price: 1 } }).expect(403)).body.error).toBe("NOT_ALLOWED");
    expect((await request(app).delete(api(`/${P}/p1`)).expect(403)).body.error).toBe("NOT_ALLOWED");
    expect((await get("").expect(200)).body.tables.filter((t: { table: string }) => t.table.startsWith(PREFIX))).toMatchObject([{ table: P, acts: { read: true, create: false, update: false, delete: false } }]);
  });

  test("a list is filtered, sorted, searched and paged from its address", async () => {
    const list = async (query: string) => slugs((await get(`/${P}?${query}`).expect(200)).body as Page);
    expect(await list("sort=-price")).toEqual(["p2", "p1"]);
    expect(await list("price[gte]=20")).toEqual(["p2"]);
    expect(await list("price[between]=5,15")).toEqual(["p1"]);
    expect(await list("tag[anyOf]=new,sale&sort=price")).toEqual(["p1", "p2"]);
    expect(await list("title[contains]=wool")).toEqual(["p2"]);
    expect(await list(`search=${encodeURIComponent("حرير")}`)).toEqual(["p1"]);
    expect(await list("title[contains]=wool&price[lt]=15&match=any&sort=slug")).toEqual(["p1", "p2"]);
    expect(await list("email[notEmpty]=1")).toEqual(["p1"]);
    const second = (await get(`/${P}?pageSize=1&page=2&sort=slug`).expect(200)).body as Page;
    expect(second).toMatchObject({ page: 2, pageSize: 1, total: 2, pages: 2 });
    expect(slugs(second)).toEqual(["p2"]);
    // A draft never shows, whatever is asked.
    expect(await list("price[is]=20")).toEqual([]);
    for (const query of ["titel[contains]=x", "price=10", "pageSize=500", "title[like]=x", "sort=nope"]) expect((await get(`/${P}?${query}`).expect(400)).body.error, query).toBe("BAD_QUERY");
    expect((await get(`/${P}?price[gte]=abc`).expect(400)).body.error).toBe("BAD_GRID_QUERY");
  });

  test("a relation shows as far as the table it links is open", async () => {
    await open(authors, { read: "public" }).expect(200);
    const page = (await get(`/${P}?sort=slug&lang=en`).expect(200)).body as Page;
    // p2's author is a draft: anyone sees p2, not who wrote it.
    expect(page.data.map((r) => r.values.author)).toEqual([[{ id: expect.any(String), slug: "a1", status: "PUBLISHED", title: "Amal" }], []]);
    const opened = (await get(`/${P}/p1?expand=author&lang=en`).expect(200)).body as Row;
    expect(opened.values.author).toMatchObject([{ slug: "a1", status: "PUBLISHED", values: { name: "Amal", city: "Haifa" } }]);
    expect((await get(`/${P}?author[notEmpty]=1`).expect(200)).body.total).toBe(2);
    await open(authors, {}).expect(200);
    expect((await get(`/${P}/p1?expand=author`).expect(403)).body.error).toBe("NOT_ALLOWED");
    expect("author" in ((await get(`/${P}/p1`).expect(200)).body as Row).values).toBe(false);
    // Not answered, so not asked about either: a filter or an order by it would say what the closed table holds.
    for (const query of ["author[notEmpty]=1", "author[anyOf]=x", "sort=author"]) expect((await get(`/${P}?${query}`).expect(400)).body, query).toMatchObject({ error: "BAD_QUERY", message: 'No column "author" in this table' });
  });
});

describe("Keys", () => {
  test("a key is answered once, kept as a hash, and never shown again", async () => {
    const made = await newKey({ name: "ERP sync", perMinute: 90, expiresAt: "2099-12-31" });
    expect(made.secret).toMatch(/^ek_[A-Za-z0-9_-]{32}$/);
    expect(made.key).toMatchObject({ name: "ERP sync", prefix: made.secret.slice(0, 8), state: "active", perMinute: 90, scopes: { tables: "*", acts: ["read", "create", "update", "delete"] } });
    expect((made.key as unknown as { expiresAt: string }).expiresAt).toBe("2099-12-31T23:59:59.999Z");
    const kept = await prisma.apiKey.findUniqueOrThrow({ where: { id: made.key.id } });
    expect(kept.hash).toBe(hashKey(made.secret));
    expect(JSON.stringify(kept)).not.toContain(made.secret);
    const page = JSON.stringify((await request(app).get(`${admin}/api`).expect(200)).body);
    expect(page).toContain(made.key.prefix);
    expect(page).not.toContain(made.secret);
    expect(page).not.toContain(kept.hash);
    // What a key can't be.
    for (const [body, error] of [
      [{ name: "" }, "VALIDATION_ERROR"],
      [{ scopes: { tables: "*", acts: [] } }, "VALIDATION_ERROR"],
      [{ scopes: { tables: ["no-such-table"], acts: ["read"] } }, "KEY_INVALID"],
      [{ scopes: { tables: [], acts: ["read"] } }, "KEY_INVALID"],
      [{ perMinute: 0 }, "VALIDATION_ERROR"],
      [{ perMinute: 100000 }, "VALIDATION_ERROR"],
      [{ expiresAt: "2020-01-01" }, "KEY_INVALID"],
      [{ expiresAt: "soon" }, "VALIDATION_ERROR"],
    ] as const) expect((await request(app).post(`${admin}/api/keys`).send({ name: "x", scopes: { tables: "*", acts: ["read"] }, ...body }).expect(400)).body.error, JSON.stringify(body)).toBe(error);
  });

  test("a table open to keys: no key, a wrong key, a key without the right, the right key", async () => {
    await open(posts, { read: "key", create: "key", update: "key", delete: "key" }).expect(200);
    expect((await get(`/${P}`).expect(401)).body.error).toBe("KEY_NEEDED");
    expect((await get(`/${P}`, `ek_${"x".repeat(32)}`).expect(401)).body.error).toBe("INVALID_KEY");
    expect((await get(`/${P}`, "not-a-key").expect(401)).body.error).toBe("INVALID_KEY");
    const other = await newKey({ name: "Notes only", scopes: { tables: [notes], acts: ["read", "create"] } });
    expect((await get(`/${P}`, other.secret).expect(403)).body.error).toBe("NOT_ALLOWED");
    const reader = await newKey({ name: "Reader", scopes: { tables: [posts], acts: ["read"] } });
    // A key sees every row that isn't in the trash, drafts too.
    const page = (await get(`/${P}?sort=slug`, reader.secret).expect(200)).body as Page;
    expect(slugs(page)).toEqual(["p1", "p2", "p3"]);
    expect(slugs((await get(`/${P}?status=draft`, reader.secret).expect(200)).body)).toEqual(["p3"]);
    expect((await get(`/${P}/p3`, reader.secret).expect(200)).body.status).toBe("DRAFT");
    // The same key in the other header.
    expect((await request(app).get(api(`/${P}/p3`)).set("Authorization", `Bearer ${reader.secret}`).expect(200)).body.slug).toBe("p3");
    // It may read, not write.
    expect((await request(app).post(api(`/${P}`)).set("X-Api-Key", reader.secret).send({ values: { title: "x" } }).expect(403)).body.error).toBe("NOT_ALLOWED");
    // Its tables are what the list of tables shows it.
    expect((await get("", reader.secret).expect(200)).body.tables.filter((t: { table: string }) => t.table.startsWith(PREFIX))).toMatchObject([{ table: P, acts: { read: true, create: false, update: false, delete: false } }]);
    // It was used: the admin sees when (written at most once a minute).
    await expect.poll(async () => (await prisma.apiKey.findUniqueOrThrow({ where: { id: reader.key.id } })).lastUsedAt).not.toBeNull();
  });

  test("a key writes rows under the table's own rules, and the activity log says which key", async () => {
    const { secret, key } = await newKey({ name: "Writer" });
    const post = (body: unknown) => request(app).post(api(`/${P}`)).set("X-Api-Key", secret).send(body as object);
    const made = (await post({ values: { title: "From the API", price: 5, email: "Two@Shop.test" }, lang: "en" }).expect(201)).body as Row;
    expect(made).toMatchObject({ slug: "from-the-api", status: "DRAFT", publishedAt: null, values: { title: { en: "From the API" }, price: 5, email: "two@shop.test", tag: null } });
    const live = (await post({ slug: "p9", status: "published", values: { title: "Live" } }).expect(201)).body as Row;
    expect(live).toMatchObject({ slug: "p9", status: "PUBLISHED" });
    expect(live.publishedAt).not.toBeNull();
    // The key's scope is every table, but the authors' table isn't open: a row can't be linked into it (nor seen through it).
    expect((await post({ values: { title: "x", author: ["a1"] } }).expect(400)).body).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field: "author" }] } });
    await open(authors, { read: "key" }).expect(200);
    const linked = (await post({ slug: "p10", values: { title: "Linked", author: ["a2"] } }).expect(201)).body as Row;
    expect(linked.values.author).toMatchObject([{ slug: "a2", status: "DRAFT", title: { en: "Basel" } }]);
    expect((await post({ values: { title: "x", author: ["no-such-author"] } }).expect(400)).body).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field: "author" }] } });
    // The rules of the fields, as in the admin: required, a limit, the only value, a choice, an unknown column.
    for (const [values, field] of [
      [{ price: 3 }, "title"],
      [{ title: "x", price: -1 }, "price"],
      [{ title: "x", email: "one@shop.test" }, "email"],
      [{ title: "x", tag: "nope" }, "tag"],
      [{ title: "x", nope: 1 }, "nope"],
    ] as const) expect((await post({ values }).expect(400)).body, JSON.stringify(values)).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field }] } });
    expect((await post({ slug: "p9", values: { title: "again" } }).expect(400)).body.error).toBe("ROW_INVALID");
    expect((await post({ values: { title: "x" }, more: 1 }).expect(400)).body.error).toBe("VALIDATION_ERROR");

    // Some of a row changes; the rest stays.
    const patch = (row: string, body: unknown) => request(app).patch(api(`/${P}/${row}`)).set("X-Api-Key", secret).send(body as object);
    const changed = (await patch(made.id, { values: { price: 7, "title": { en: "From the API", ar: "من الـ API" } }, status: "PUBLISHED" }).expect(200)).body as Row;
    expect(changed).toMatchObject({ id: made.id, status: "PUBLISHED", values: { price: 7, email: "two@shop.test", title: { en: "From the API", ar: "من الـ API" } } });
    expect((await patch("from-the-api", { slug: "renamed" }).expect(200)).body.slug).toBe("renamed");
    expect((await patch("renamed", { values: { price: -4 } }).expect(400)).body).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field: "price" }] } });
    expect((await patch("no-such-row", { values: { price: 1 } }).expect(404)).body.error).toBe("NOT_FOUND");

    // Deleting moves to the trash: gone from the API, still there for the admin to bring back.
    expect((await request(app).delete(api(`/${P}/renamed`)).set("X-Api-Key", secret).expect(200)).body).toEqual({ ok: true, id: made.id });
    expect((await get(`/${P}/renamed`, secret).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: made.id } })).deletedAt).not.toBeNull();
    expect((await request(app).delete(api(`/${P}/renamed`)).set("X-Api-Key", secret).expect(404)).body.error).toBe("NOT_FOUND");
    await request(app).delete(api(`/${P}/p9`)).set("X-Api-Key", secret).expect(200);
    await request(app).delete(api(`/${P}/p10`)).set("X-Api-Key", secret).expect(200);
    await open(authors, {}).expect(200);

    await expect.poll(async () => prisma.adminAuditLog.count({ where: { area: "data-api" } })).toBe(8);
    const log = await prisma.adminAuditLog.findMany({ where: { area: "data-api" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    expect(log.map((l) => `${l.verb} ${l.path}`).sort()).toEqual([`create /data/${P}`, `create /data/${P}`, `create /data/${P}`, `delete /data/${P}/:id`, `delete /data/${P}/:id`, `delete /data/${P}/:id`, `update /data/${P}/:id`, `update /data/${P}/:id`]);
    expect(log.find((l) => l.targetId === made.id && l.verb === "create")).toMatchObject({ adminUserId: null, actorEmail: `API key: Writer (${key.prefix}…)`, fields: ["title", "price", "email"], status: 201 });
    // Field names only, never what was written.
    expect(JSON.stringify(log)).not.toContain("two@shop.test");
  });

  test("a key stops when it is revoked, when its day passes, when it is deleted", async () => {
    const a = await newKey({ name: "To revoke" });
    await get(`/${P}`, a.secret).expect(200);
    expect((await request(app).post(`${admin}/api/keys/${a.key.id}/revoke`).expect(200)).body.key.state).toBe("revoked");
    expect((await get(`/${P}`, a.secret).expect(401)).body.error).toBe("KEY_REVOKED");
    // Revoked stays revoked.
    expect((await request(app).patch(`${admin}/api/keys/${a.key.id}`).send({ name: "Back" }).expect(409)).body.error).toBe("KEY_REVOKED");

    const b = await newKey({ name: "To end" });
    const narrowed = (await request(app).patch(`${admin}/api/keys/${b.key.id}`).send({ name: "Narrowed", scopes: { tables: [notes], acts: ["read"] }, perMinute: 5 }).expect(200)).body.key as KeyView;
    expect(narrowed).toMatchObject({ name: "Narrowed", perMinute: 5, scopes: { tables: [notes], acts: ["read"] }, prefix: b.key.prefix });
    // Narrowed from the admin: it stops reaching the posts at once.
    expect((await get(`/${P}`, b.secret).expect(403)).body.error).toBe("NOT_ALLOWED");
    await prisma.apiKey.update({ where: { id: b.key.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    forgetKeys();
    expect((await get(`/${P}`, b.secret).expect(401)).body.error).toBe("KEY_EXPIRED");
    expect((await request(app).get(`${admin}/api`).expect(200)).body.keys.find((k: KeyView) => k.id === b.key.id).state).toBe("expired");

    const c = await newKey({ name: "To delete" });
    await request(app).delete(`${admin}/api/keys/${c.key.id}`).expect(200);
    expect((await get(`/${P}`, c.secret).expect(401)).body.error).toBe("INVALID_KEY");
    expect((await request(app).delete(`${admin}/api/keys/${c.key.id}`).expect(404)).body.error).toBe("NOT_FOUND");
  });

  test("a key gets its own number of requests a minute", async () => {
    const { secret } = await newKey({ name: "Slow", perMinute: 3 });
    for (let k = 1; k <= 3; k++) {
      const ok = await get(`/${P}?pageSize=1`, secret).expect(200);
      expect(ok.headers["x-ratelimit-key-limit"]).toBe("3");
      expect(ok.headers["x-ratelimit-key-remaining"]).toBe(String(3 - k));
    }
    const stopped = await get(`/${P}?pageSize=1`, secret).expect(429);
    expect(stopped.body.error).toBe("RATE_LIMIT_KEY");
    expect(Number(stopped.headers["retry-after"])).toBeGreaterThan(0);
    // Another key isn't held up by it.
    await get(`/${P}?pageSize=1`, (await newKey({ name: "Fast" })).secret).expect(200);
  });
});

describe("Rows from anyone", () => {
  test("a table open for adding takes rows without a key: as drafts, a few a minute from one place", async () => {
    await open(notes, { create: "public" }).expect(200);
    const send = (body: unknown) => request(app).post(api(`/${N}`)).send(body as object);
    const made = (await send({ values: { title: "Hello from a form" }, lang: "en" }).expect(201)).body as Row;
    expect(made).toMatchObject({ status: "DRAFT", slug: "hello-from-a-form", values: { title: { en: "Hello from a form" } } });
    // Not readable from outside (reading is closed), and nothing but the values is the sender's to set.
    expect((await get(`/${N}/${made.id}`).expect(403)).body.error).toBe("NOT_ALLOWED");
    expect((await send({ values: { title: "x" }, status: "PUBLISHED" }).expect(400)).body).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field: "status" }] } });
    expect((await send({ values: { title: "x" }, slug: "mine" }).expect(400)).body).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field: "slug" }] } });
    expect((await send({ values: {} }).expect(400)).body).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field: "title" }] } });
    expect((await request(app).patch(api(`/${N}/${made.id}`)).send({ values: { title: "y" } }).expect(403)).body.error).toBe("NOT_ALLOWED");
    // Ten a minute from one place (the refusals above counted too).
    forgetHits();
    for (let k = 0; k < 10; k++) await send({ values: { title: `Note ${k}` }, lang: "en" }).expect(201);
    const stopped = await send({ values: { title: "One too many" } }).expect(429);
    expect(stopped.body.error).toBe("RATE_LIMIT");
    expect(await prisma.collectionItem.count({ where: { collectionId: notes } })).toBe(11);
    // A key isn't counted with them.
    const { secret } = await newKey({ name: "Notes", scopes: { tables: [notes], acts: ["create"] } });
    expect((await request(app).post(api(`/${N}`)).set("X-Api-Key", secret).send({ values: { title: "By key" }, status: "PUBLISHED" }).expect(201)).body.status).toBe("PUBLISHED");
  });
});

describe("Who may set it up", () => {
  const asMember = (id: string) => `Bearer ${signAccessToken({ sub: id, role: "STAFF", email: `${id}@t.local` })}`;
  const member = async (name: string, permissions: string[]) => {
    const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
    return prisma.adminUser.create({ data: { email: `${name}@api-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
  };

  test("the tables' own permission isn't enough: looking needs api:read, changing api:write", async () => {
    const editor = await member("editor", ["pages:read", "pages:write"]);
    const viewer = await member("viewer", ["api:read"]);
    const keeper = await member("keeper", ["api:read", "api:write"]);
    expect((await request(app).get(`${admin}/api`).set("Authorization", asMember(editor.id)).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["api:read"] });
    expect((await request(app).get(`${admin}/api`).set("Authorization", asMember(viewer.id)).expect(200)).body.tables.length).toBeGreaterThan(0);
    expect((await request(app).put(`${admin}/api/tables/${notes}`).set("Authorization", asMember(viewer.id)).send({ read: "public", create: "off", update: "off", delete: "off" }).expect(403)).body.required).toEqual(["api:write"]);
    expect((await request(app).post(`${admin}/api/keys`).set("Authorization", asMember(viewer.id)).send({ name: "x", scopes: { tables: "*", acts: ["read"] } }).expect(403)).body.error).toBe("PERMISSION_DENIED");
    const made = (await request(app).post(`${admin}/api/keys`).set("Authorization", asMember(keeper.id)).send({ name: "Keeper's", scopes: { tables: "*", acts: ["read"] } }).expect(201)).body;
    expect((await prisma.apiKey.findUniqueOrThrow({ where: { id: made.key.id } })).createdBy).toBe("keeper@api-spec.test");
    // The role editor lists the new permissions.
    const groups = (await request(app).get(`${admin}/staff/permissions`).expect(200)).body.groups as Array<{ key: string; permissions: Array<{ key: string }> }>;
    expect(groups.find((g) => g.key === "api")?.permissions.map((p) => p.key)).toEqual(["api:read", "api:write"]);
    // An admin's own token on the data routes is nobody's key: the request is anyone's.
    expect((await request(app).get(api(`/${N}`)).set("Authorization", asMember(keeper.id)).expect(403)).body.error).toBe("NOT_ALLOWED");
  });
});
