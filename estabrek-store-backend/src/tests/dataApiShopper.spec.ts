import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken, signCustomerToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetHits } from "../lib/hitLimit.js";
import { forgetShoppers } from "../modules/data/data.routes.js";

// The automatic API for a signed-in shopper, with the database (B4): a table open "to the shopper"
// shows each one their own rows and nothing else, lets them add, change and delete those; fields
// the owner marked private are a key's alone (not answered, asked about, searched or written
// without one). Requests to /v1/admin without a token run as the test owner.

const PREFIX = "shop-spec-";
const R = `${PREFIX}requests`;
const V = `${PREFIX}reviews`;
const C = `${PREFIX}contact`;
const B = `${PREFIX}brands`;
type Row = { id: string; slug: string; status: string; values: Record<string, any> };
type Page = { data: Row[]; total: number };
const admin = "/v1/admin";
const api = (path = "") => `/v1/data${path}`;
const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const open = (id: string, settings: Record<string, unknown>) => request(app).put(`${admin}/api/tables/${id}`).send({ read: "off", create: "off", update: "off", delete: "off", ...settings });
const newKey = async () => (await request(app).post(`${admin}/api/keys`).send({ name: "Shopper spec", scopes: { tables: "*", acts: ["read", "create", "update", "delete"] } }).expect(201)).body.secret as string;
/** A request as a shopper (their token), with a key, or as anyone. */
const as = (who: string | null) => {
  const head = (req: request.Test) => (!who ? req : who.startsWith("ek_") ? req.set("X-Api-Key", who) : req.set("Authorization", `Bearer ${who}`));
  return {
    get: (path: string) => head(request(app).get(api(path))),
    post: (path: string, body: object) => head(request(app).post(api(path))).send(body),
    patch: (path: string, body: object) => head(request(app).patch(api(path))).send(body),
    del: (path: string) => head(request(app).delete(api(path))),
  };
};

let requests = "";
let reviews = "";
let contact = "";
let brands = "";
let sara = "";
let lina = "";
let saraId = "";
let linaId = "";
let key = "";

async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.apiKey.deleteMany({ where: { name: "Shopper spec" } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@shop-spec.test" } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@shop-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  forgetKeys();
  forgetHits();
  forgetShoppers();
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  await setAccounts(true);
  brands = await mk(B, [{ id: "name", type: "text", required: true }, { id: "city", type: "text" }]);
  requests = await mk(R, [
    { id: "title", type: "text", required: true },
    { id: "details", type: "longText" },
    { id: "staffNote", type: "text" },
    { id: "cost", type: "number", default: 0 },
  ]);
  reviews = await mk(V, [
    { id: "text", type: "text", required: true },
    { id: "stars", type: "number", min: 1, max: 5 },
    { id: "staffNote", type: "text" },
    { id: "brand", type: "relation", to: brands },
  ]);
  contact = await mk(C, [{ id: "name", type: "text", required: true }]);
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { email: "sara@shop-spec.test", name: "Sara" } }),
    prisma.user.create({ data: { email: "lina@shop-spec.test", name: "Lina" } }),
  ]);
  saraId = a.id;
  linaId = b.id;
  sara = signCustomerToken(a.id);
  lina = signCustomerToken(b.id);
  key = await newKey();
  await open(requests, { read: "customer", create: "customer", update: "customer", delete: "customer", private: ["staffNote", "cost"] }).expect(200);
  await open(reviews, { read: "public", create: "customer", private: ["staffNote"] }).expect(200);
  await open(contact, { create: "public" }).expect(200);
});
afterAll(async () => {
  await clean();
  await setAccounts(false);
});
beforeEach(() => {
  forgetHits();
});

describe("A table open to the shopper", () => {
  test("needs a signed-in shopper: nobody else gets in, and with accounts off nobody is one", async () => {
    expect((await as(null).get(`/${R}`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    expect((await as(null).post(`/${R}`, { values: { title: "x" } }).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    // Something else in that header (an admin's own token) is nobody's.
    const adminToken = signAccessToken({ sub: "some-admin", role: "STAFF", email: "x@t.local" });
    expect((await as(adminToken).get(`/${R}`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    expect((await as("not.a.token").get(`/${R}`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    await as(sara).get(`/${R}`).expect(200);
    await setAccounts(false);
    expect((await as(sara).get(`/${R}`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    await setAccounts(true);
    // A shopper sees it among the tables they reach; anyone doesn't.
    const tables = async (who: string | null) => ((await as(who).get("").expect(200)).body.tables as Array<{ table: string; acts: Record<string, boolean>; fields: Array<{ id: string }> }>).filter((t) => t.table.startsWith(PREFIX));
    expect((await tables(null)).map((t) => t.table)).toEqual([V, C]);
    const mine = await tables(sara);
    expect(mine.map((t) => t.table)).toEqual([R, V, C]);
    expect(mine[0].acts).toEqual({ read: true, create: true, update: true, delete: true });
    // The private fields aren't theirs to know of.
    expect(mine[0].fields.map((f) => f.id)).toEqual(["title", "details"]);
    expect((await tables(key))[0].fields.map((f) => f.id)).toEqual(["title", "details", "staffNote", "cost"]);
  });

  test("a shopper adds rows that are theirs: drafts, with the values only", async () => {
    const made = (await as(sara).post(`/${R}`, { values: { title: "A red scarf, size M", details: "For a gift" }, lang: "en" }).expect(201)).body as Row;
    expect(made).toMatchObject({ status: "DRAFT", values: { title: { en: "A red scarf, size M" }, details: { en: "For a gift" } } });
    // What is a key's alone isn't in the answer, though the row has it (the field's own default).
    expect(Object.keys(made.values)).toEqual(["title", "details"]);
    const kept = await prisma.collectionItem.findUniqueOrThrow({ where: { id: made.id } });
    expect(kept.ownerId).toBe(saraId);
    expect(kept.data).toMatchObject({ cost: 0 });
    for (const [body, field] of [
      [{ values: { title: "x" }, status: "PUBLISHED" }, "status"],
      [{ values: { title: "x" }, slug: "mine" }, "slug"],
      [{ values: { title: "x", staffNote: "let me in" } }, "staffNote"],
      [{ values: { title: "x", "staffNote.en": "let me in" } }, "staffNote.en"],
      [{ values: { title: "x", cost: 5 } }, "cost"],
      [{ values: { details: "no title" } }, "title"],
    ] as const) expect((await as(sara).post(`/${R}`, body).expect(400)).body, field).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field }] } });
    // A private field answers exactly as a column that isn't there.
    const hidden = (await as(sara).post(`/${R}`, { values: { title: "x", staffNote: "y" } }).expect(400)).body.details.issues[0];
    const absent = (await as(sara).post(`/${R}`, { values: { title: "x", nope: "y" } }).expect(400)).body.details.issues[0];
    expect(hidden.message).toBe(absent.message);
    await as(lina).post(`/${R}`, { values: { title: "Lina's own" }, lang: "en" }).expect(201);
    await as(sara).post(`/${R}`, { values: { title: "A second one" }, lang: "en" }).expect(201);
  });

  test("each shopper sees their own rows only; a key sees them all, private fields too", async () => {
    const hers = (await as(sara).get(`/${R}?sort=title&lang=en`).expect(200)).body as Page;
    expect(hers.total).toBe(2);
    expect(hers.data.map((r) => r.values.title)).toEqual(["A red scarf, size M", "A second one"]);
    expect(Object.keys(hers.data[0].values)).toEqual(["title", "details"]);
    const linas = (await as(lina).get(`/${R}?lang=en`).expect(200)).body as Page;
    expect(linas.data.map((r) => r.values.title)).toEqual(["Lina's own"]);
    // Another's row, asked for by its id or address, is a row that isn't there.
    expect((await as(lina).get(`/${R}/${hers.data[0].id}`).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await as(lina).get(`/${R}/${hers.data[0].slug}`).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await as(sara).get(`/${R}/${hers.data[0].id}`).expect(200)).body.id).toBe(hers.data[0].id);
    // Their own rows by status, like any list.
    expect(((await as(sara).get(`/${R}?status=published`).expect(200)).body as Page).total).toBe(0);
    expect(((await as(sara).get(`/${R}?title[contains]=second`).expect(200)).body as Page).total).toBe(1);
    const all = (await as(key).get(`/${R}?sort=title&lang=en`).expect(200)).body as Page;
    expect(all.total).toBe(3);
    expect(Object.keys(all.data[0].values)).toEqual(["title", "details", "staffNote", "cost"]);
    expect(all.data[0].values.cost).toBe(0);
  });

  test("a shopper changes and deletes their own rows, never another's, and never what is a key's", async () => {
    const hers = ((await as(sara).get(`/${R}?sort=title`).expect(200)).body as Page).data;
    const changed = (await as(sara).patch(`/${R}/${hers[0].id}`, { values: { details: "Wrapped, please" }, lang: "en" }).expect(200)).body as Row;
    expect(changed.values).toEqual({ title: { en: "A red scarf, size M" }, details: { en: "Wrapped, please" } });
    expect((await as(lina).patch(`/${R}/${hers[0].id}`, { values: { details: "mine now" } }).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await as(lina).del(`/${R}/${hers[0].id}`).expect(404)).body.error).toBe("NOT_FOUND");
    for (const [body, field] of [[{ status: "PUBLISHED" }, "status"], [{ slug: "renamed" }, "slug"], [{ values: { cost: 1 } }, "cost"]] as const)
      expect((await as(sara).patch(`/${R}/${hers[0].id}`, body).expect(400)).body, field).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field }] } });
    // The staff's note, put there by a key, stays through the shopper's change and stays unseen.
    await as(key).patch(`/${R}/${hers[0].id}`, { values: { staffNote: "Call her first", cost: 40 }, lang: "en" }).expect(200);
    const again = (await as(sara).patch(`/${R}/${hers[0].id}`, { values: { details: "No wrapping" }, lang: "en" }).expect(200)).body as Row;
    expect(JSON.stringify(again)).not.toContain("Call her first");
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: hers[0].id } })).data).toMatchObject({ staffNote: { en: "Call her first" }, cost: 40, details: { en: "No wrapping" } });
    expect((await as(sara).del(`/${R}/${hers[1].id}`).expect(200)).body).toEqual({ ok: true, id: hers[1].id });
    expect(((await as(sara).get(`/${R}`).expect(200)).body as Page).total).toBe(1);
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: hers[1].id } })).deletedAt).not.toBeNull();
  });

  test("a shopper whose account is turned off stops being one; an account deleted leaves its rows without an owner", async () => {
    await prisma.user.update({ where: { id: linaId }, data: { status: "SUSPENDED" } });
    forgetShoppers();
    expect((await as(lina).get(`/${R}`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    await prisma.user.update({ where: { id: linaId }, data: { status: "ACTIVE" } });
    forgetShoppers();
    await as(lina).get(`/${R}`).expect(200);
    const gone = await prisma.user.create({ data: { email: "gone@shop-spec.test", name: "Gone" } });
    const row = (await as(signCustomerToken(gone.id)).post(`/${R}`, { values: { title: "Before leaving" }, lang: "en" }).expect(201)).body as Row;
    await prisma.user.delete({ where: { id: gone.id } });
    forgetShoppers();
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: row.id } })).ownerId).toBeNull();
    expect((await as(signCustomerToken(gone.id)).get(`/${R}`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
  });

  test("a shopper's writes to one table are counted by the minute", async () => {
    forgetHits();
    for (let k = 0; k < 30; k++) await as(lina).patch(`/${R}/no-such-row-${k}`, { values: { details: "x" } }).expect(404);
    // Looking for a row isn't a write; the writes are.
    const mine = ((await as(lina).get(`/${R}`).expect(200)).body as Page).data[0];
    for (let k = 0; k < 30; k++) await as(lina).patch(`/${R}/${mine.id}`, { values: { details: `Take ${k}` }, lang: "en" }).expect(200);
    const stopped = await as(lina).patch(`/${R}/${mine.id}`, { values: { details: "One too many" } }).expect(429);
    expect(stopped.body.error).toBe("RATE_LIMIT");
    // Another shopper isn't held up by it.
    await as(sara).post(`/${R}`, { values: { title: "Still fine" }, lang: "en" }).expect(201);
  });
});

describe("A table everyone reads", () => {
  test("a shopper's review waits as a draft: `mine` shows it to them, and to nobody else", async () => {
    await as(key).post(`/${V}`, { slug: "v1", status: "published", values: { text: "Lovely", stars: 5, staffNote: "Verified buyer" }, lang: "en" }).expect(201);
    const draft = (await as(sara).post(`/${V}`, { values: { text: "Soft and warm", stars: 4 }, lang: "en" }).expect(201)).body as Row;
    expect(draft.status).toBe("DRAFT");
    const slugs = async (who: string | null, query = "") => ((await as(who).get(`/${V}?${query}`).expect(200)).body as Page).data.map((r) => r.slug);
    expect(await slugs(null)).toEqual(["v1"]);
    expect(await slugs(sara)).toEqual(["v1"]);
    expect(await slugs(sara, "mine=1")).toEqual([draft.slug]);
    expect(await slugs(lina, "mine=1")).toEqual([]);
    expect((await as(sara).get(`/${V}/${draft.id}?mine=1`).expect(200)).body.id).toBe(draft.id);
    expect((await as(sara).get(`/${V}/${draft.id}`).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await as(lina).get(`/${V}/${draft.id}?mine=1`).expect(404)).body.error).toBe("NOT_FOUND");
    // `mine` is a signed-in shopper's question.
    expect((await as(null).get(`/${V}?mine=1`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    expect((await as(key).get(`/${V}?mine=1`).expect(400)).body.error).toBe("BAD_QUERY");
    expect((await as(sara).get(`/${V}?mine=maybe`).expect(400)).body.error).toBe("BAD_QUERY");
    // Changing a review isn't open at all here, also not to its writer.
    expect((await as(sara).patch(`/${V}/${draft.id}`, { values: { stars: 5 } }).expect(403)).body.error).toBe("NOT_ALLOWED");
  });

  test("a private field is a key's alone: not answered, asked about, sorted by or searched", async () => {
    const one = (await as(null).get(`/${V}/v1?lang=en`).expect(200)).body as Row;
    expect(one.values).toEqual({ text: "Lovely", stars: 5 });
    expect((await as(key).get(`/${V}/v1?lang=en`).expect(200)).body.values).toMatchObject({ text: "Lovely", stars: 5, staffNote: "Verified buyer" });
    for (const query of ["staffNote[contains]=Verified", "staffNote[notEmpty]=1", "sort=staffNote", "fields=staffNote"]) {
      expect((await as(null).get(`/${V}?${query}`).expect(400)).body, query).toMatchObject({ error: "BAD_QUERY" });
      expect((await as(sara).get(`/${V}?${query}`).expect(400)).body.error, query).toBe("BAD_QUERY");
    }
    expect(((await as(key).get(`/${V}?staffNote[contains]=Verified`).expect(200)).body as Page).total).toBe(1);
    // The words of a private field aren't found by anyone's search; a key's finds them.
    expect(((await as(null).get(`/${V}?search=Verified`).expect(200)).body as Page).total).toBe(0);
    expect(((await as(null).get(`/${V}?search=Lovely`).expect(200)).body as Page).total).toBe(1);
    expect(((await as(key).get(`/${V}?search=Verified`).expect(200)).body as Page).total).toBe(1);
  });

  test("a linked row whose name is private there shows without it; opened, it shows without its private fields", async () => {
    await request(app).post(`${admin}/collections/${brands}/rows/import`).send({ lang: "en", rows: [{ slug: "b1", status: "PUBLISHED", values: { name: "Atelier", city: "Haifa" } }] }).expect(200);
    await open(brands, { read: "public", private: ["name"] }).expect(200);
    // (Changing a review isn't open from outside: the owner links it, in the admin.)
    const v1 = await prisma.collectionItem.findUniqueOrThrow({ where: { collectionId_slug: { collectionId: reviews, slug: "v1" } } });
    await request(app).patch(`${admin}/collections/${reviews}/rows/${v1.id}`).send({ values: { brand: ["b1"] } }).expect(200);
    const seen = (await as(null).get(`/${V}/v1?lang=en`).expect(200)).body as Row;
    expect(seen.values.brand).toEqual([{ id: expect.any(String), slug: "b1", status: "PUBLISHED", title: null }]);
    const opened = (await as(null).get(`/${V}/v1?lang=en&expand=brand`).expect(200)).body as Row;
    expect(opened.values.brand[0].values).toEqual({ city: "Haifa" });
    const whole = (await as(key).get(`/${V}/v1?lang=en&expand=brand`).expect(200)).body as Row;
    expect(whole.values.brand[0].values).toEqual({ name: "Atelier", city: "Haifa" });
  });

  test("where anyone may add, a signed-in shopper's row is still theirs", async () => {
    const anon = (await as(null).post(`/${C}`, { values: { name: "A visitor" }, lang: "en" }).expect(201)).body as Row;
    const hers = (await as(sara).post(`/${C}`, { values: { name: "Sara herself" }, lang: "en" }).expect(201)).body as Row;
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: anon.id } })).ownerId).toBeNull();
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: hers.id } })).ownerId).toBe(saraId);
    // A key's row has no owner.
    const keyed = (await as(key).post(`/${C}`, { values: { name: "By key" }, lang: "en" }).expect(201)).body as Row;
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: keyed.id } })).ownerId).toBeNull();
  });
});

describe("From the admin", () => {
  test("the page says which fields are private and whether shopper accounts are on; a table's settings keep what isn't sent", async () => {
    const page = (await request(app).get(`${admin}/api`).expect(200)).body;
    expect(page.customerAccounts).toBe(true);
    expect(page.who).toEqual(["off", "key", "customer", "public"]);
    expect(page.limits).toMatchObject({ publicWritesPerMinute: 10, customerWritesPerMinute: 30 });
    const table = page.tables.find((t: { id: string }) => t.id === requests);
    expect(table).toMatchObject({ access: { read: "customer", create: "customer", update: "customer", delete: "customer" }, private: ["staffNote", "cost"] });
    // Only the acts sent: the private fields stay. Sent: they are replaced, each once.
    const acts = { read: "customer", create: "customer", update: "customer", delete: "off" };
    expect((await request(app).put(`${admin}/api/tables/${requests}`).send(acts).expect(200)).body.private).toEqual(["staffNote", "cost"]);
    expect((await request(app).put(`${admin}/api/tables/${requests}`).send({ ...acts, delete: "customer", private: ["staffNote", "staffNote"] }).expect(200)).body.private).toEqual(["staffNote"]);
    expect((await as(sara).get(`/${R}`).expect(200)).body.data.every((r: Row) => "cost" in r.values && !("staffNote" in r.values))).toBe(true);
    expect((await request(app).put(`${admin}/api/tables/${requests}`).send({ ...acts, private: ["nope"] }).expect(400)).body).toMatchObject({ error: "NO_SUCH_FIELD", details: { fields: ["nope"] } });
    for (const bad of [{ ...acts, update: "public" }, { ...acts, read: "shopper" }, { ...acts, private: "staffNote" }]) expect((await request(app).put(`${admin}/api/tables/${requests}`).send(bad).expect(400)).body.error).toBe("VALIDATION_ERROR");
    await request(app).put(`${admin}/api/tables/${requests}`).send({ ...acts, delete: "customer", private: ["staffNote", "cost"] }).expect(200);
    await setAccounts(false);
    expect((await request(app).get(`${admin}/api`).expect(200)).body.customerAccounts).toBe(false);
    await setAccounts(true);
  });

  test("the grid says whose row it is, by name to members who may see the customers", async () => {
    const rows = async (auth?: string) => {
      const req = request(app).get(`${admin}/collections/${requests}/rows`).query({ q: JSON.stringify({ sort: [{ field: "$createdAt", dir: "asc" }] }) });
      return ((await (auth ? req.set("Authorization", auth) : req).expect(200)).body.rows as Array<{ ownerId: string | null; owner?: { id: string; name?: string; email?: string } }>).filter((r) => r.ownerId === saraId);
    };
    const owner = await rows();
    expect(owner.length).toBeGreaterThan(0);
    expect(owner[0].owner).toEqual({ id: saraId, name: "Sara", email: "sara@shop-spec.test" });
    const role = await prisma.staffRole.create({ data: { name: `${PREFIX}editor`, permissions: ["pages:read"] } });
    const member = await prisma.adminUser.create({ data: { email: "editor@shop-spec.test", name: "editor", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    const seen = await rows(`Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`);
    expect(seen[0].owner).toEqual({ id: saraId });
  });

  test("the documents: a shopper's own say their token gets in; nobody's say more than they could call", async () => {
    type Doc = { paths: Record<string, Record<string, { security: unknown[] }>>; components: { schemas: Record<string, { properties: Record<string, unknown> }> } };
    const doc = async (who: string | null) => (await as(who).get("/openapi.json").expect(200)).body as Doc;
    const anyone = await doc(null);
    expect(Object.keys(anyone.paths).filter((p) => p.includes(R))).toEqual([]);
    expect(JSON.stringify(anyone)).not.toContain("staffNote");
    const hers = await doc(sara);
    expect(Object.keys(hers.paths).filter((p) => p.includes(R))).toEqual([`/${R}`, `/${R}/{row}`]);
    expect(hers.paths[`/${R}`].get.security).toEqual([{ shopper: [] }, { apiKey: [] }]);
    expect(Object.keys(hers.paths[`/${R}/{row}`])).toEqual(["get", "patch", "delete"]);
    expect(Object.keys(hers.components.schemas.ShopSpecRequestsValues.properties)).toEqual(["title", "details"]);
    expect(JSON.stringify(hers)).not.toContain("staffNote");
    const whole = await doc(key);
    expect(Object.keys(whole.components.schemas.ShopSpecRequestsValues.properties)).toEqual(["title", "details", "staffNote", "cost"]);
  });
});
