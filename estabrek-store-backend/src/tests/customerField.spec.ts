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
import { personView } from "../lib/dataApi.js";

// A field of kind "customer" (M): a shopper the row points at, kept as the email they sign in with. Where the table
// is open to shoppers the row is also theirs to read, never to change; who it points at is answered to a key as the
// email, to anyone else as a first name and whether it is them; and without a key it can't be asked about.
// Requests to /v1/admin without a token run as the test owner.

const PREFIX = "cust-spec-";
const R = `${PREFIX}requests`;
const P = `${PREFIX}thanks`;
type Row = { id: string; slug: string; status: string; values: Record<string, any> };
type Page = { data: Row[]; total: number };
const admin = "/v1/admin";
const api = (path = "") => `/v1/data${path}`;
const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const open = (id: string, settings: Record<string, unknown>) => request(app).put(`${admin}/api/tables/${id}`).send({ read: "off", create: "off", update: "off", delete: "off", ...settings });
const as = (who: string | null) => {
  const head = (req: request.Test) => (!who ? req : who.startsWith("ek_") ? req.set("X-Api-Key", who) : req.set("Authorization", `Bearer ${who}`));
  return {
    get: (path: string) => head(request(app).get(api(path))),
    post: (path: string, body: object) => head(request(app).post(api(path))).send(body),
    patch: (path: string, body: object) => head(request(app).patch(api(path))).send(body),
    del: (path: string) => head(request(app).delete(api(path))),
  };
};
const tos = (page: Page) => page.data.map((r) => r.values.note).sort();

let requests = "";
let thanks = "";
let sara = "";
let lina = "";
let dana = "";
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
  await prisma.apiKey.deleteMany({ where: { name: "Customer field spec" } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@cust-spec.test" } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@cust-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  forgetKeys();
  forgetHits();
  forgetShoppers();
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  await setAccounts(true);
  // Friend requests: the one who adds it owns it; `to` points at the friend.
  requests = await mk(R, [{ id: "to", type: "customer", required: true }, { id: "note", type: "text" }, { id: "state", type: "select", options: [{ id: "waiting" }, { id: "accepted" }] }]);
  // Thanks anyone reads; each points at the shopper it thanks.
  thanks = await mk(P, [{ id: "note", type: "text", required: true }, { id: "who", type: "customer" }]);
  const [a, b, c] = await Promise.all([
    prisma.user.create({ data: { email: "sara@cust-spec.test", name: "Sara Haddad" } }),
    prisma.user.create({ data: { email: "lina@cust-spec.test", name: "Lina Nasser" } }),
    prisma.user.create({ data: { email: "dana@cust-spec.test", name: "" } }),
  ]);
  saraId = a.id;
  linaId = b.id;
  sara = signCustomerToken(a.id);
  lina = signCustomerToken(b.id);
  dana = signCustomerToken(c.id);
  key = (await request(app).post(`${admin}/api/keys`).send({ name: "Customer field spec", scopes: { tables: "*", acts: ["read", "create", "update", "delete"] } }).expect(201)).body.secret as string;
  await open(requests, { read: "customer", create: "customer", update: "customer", delete: "customer" }).expect(200);
  await open(thanks, { read: "public", create: "customer" }).expect(200);
});
afterAll(async () => {
  await clean();
  await setAccounts(false);
});
beforeEach(() => {
  forgetHits();
});

describe("A field that points at a shopper", () => {
  test("takes an email, kept in small letters; anything else is refused in the field's name", async () => {
    const bad = await as(sara).post(`/${R}`, { values: { to: "not an email", note: { en: "bad" } } }).expect(400);
    expect(bad.body.details.issues).toEqual([{ field: "to", message: "A shopper's email address" }]);
    expect((await as(sara).post(`/${R}`, { values: { note: { en: "nobody" } } }).expect(400)).body.details.issues[0].field).toBe("to");
    const made = (await as(sara).post(`/${R}`, { values: { to: "  Lina@Cust-Spec.Test ", note: "to lina", state: "waiting" }, lang: "en" }).expect(201)).body as Row;
    // The one who wrote it reads the address back; it isn't her.
    expect(made.values.to).toEqual({ name: "Lina", me: false, email: "lina@cust-spec.test" });
    const stored = await prisma.collectionItem.findUniqueOrThrow({ where: { id: made.id } });
    expect((stored.data as Record<string, unknown>).to).toBe("lina@cust-spec.test");
    expect(stored.ownerId).toBe(saraId);
    // An address nobody has an account with yet is taken all the same (nobody learns who is a customer).
    const later = (await as(sara).post(`/${R}`, { values: { to: "noor@cust-spec.test", note: "to noor" }, lang: "en" }).expect(201)).body as Row;
    expect(later.values.to).toEqual({ name: null, me: false, email: "noor@cust-spec.test" });
  });

  test("the row is also the shopper's it points at, to read: in her list and by its address; nobody else's", async () => {
    await as(lina).post(`/${R}`, { values: { to: "dana@cust-spec.test", note: "lina to dana" }, lang: "en" }).expect(201);
    const hers = (await as(lina).get(`/${R}?lang=en&sort=createdAt`).expect(200)).body as Page;
    // What Sara sent her, and what she sent Dana; not what Sara sent someone else.
    expect(tos(hers)).toEqual(["lina to dana", "to lina"]);
    const got = hers.data.find((r) => r.values.note === "to lina")!;
    // It points at her: her whole name and her own address. The sender isn't told to her by this field.
    expect(got.values.to).toEqual({ name: "Lina Nasser", me: true, email: "lina@cust-spec.test" });
    expect(((await as(lina).get(`/${R}/${got.id}`).expect(200)).body as Row).values.to.me).toBe(true);
    // Dana: only the one pointing at her; her account has no name.
    const danas = (await as(dana).get(`/${R}?lang=en`).expect(200)).body as Page;
    expect(tos(danas)).toEqual(["lina to dana"]);
    expect(danas.data[0].values.to).toEqual({ name: null, me: true, email: "dana@cust-spec.test" });
    expect((await as(dana).get(`/${R}/${got.id}`).expect(404)).body.error).toBe("NOT_FOUND");
    // Sara: her two, none of Lina's.
    expect(tos((await as(sara).get(`/${R}?lang=en`).expect(200)).body as Page)).toEqual(["to lina", "to noor"]);
    // A key: every row, and the address itself.
    const all = (await as(key).get(`/${R}?lang=en&to[is]=LINA@cust-spec.test`).expect(200)).body as Page;
    expect(all.data.map((r) => r.values.to)).toEqual(["lina@cust-spec.test"]);
  });

  test("reading isn't changing: the shopper it points at can't change or delete the row; its owner can", async () => {
    const row = ((await as(sara).get(`/${R}?lang=en`).expect(200)).body as Page).data.find((r) => r.values.note === "to lina")!;
    expect((await as(lina).patch(`/${R}/${row.id}`, { values: { state: "accepted" } }).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await as(lina).del(`/${R}/${row.id}`).expect(404)).body.error).toBe("NOT_FOUND");
    const changed = (await as(sara).patch(`/${R}/${row.id}`, { values: { state: "accepted" } }).expect(200)).body as Row;
    expect(changed.values.state).toBe("accepted");
    // Lina sees the change.
    expect((((await as(lina).get(`/${R}/${row.id}`).expect(200)).body as Row).values.state)).toBe("accepted");
  });

  test("without a key, who a row points at can't be asked about: no filter, no sort, no search", async () => {
    expect((await as(sara).get(`/${R}?to[is]=lina@cust-spec.test`).expect(400)).body.message).toContain('No column "to"');
    expect((await as(sara).get(`/${R}?sort=to`).expect(400)).body.message).toContain('No column "to"');
    // A search that would match an address finds nothing through it.
    expect(((await as(sara).get(`/${R}?search=noor@cust-spec`).expect(200)).body as Page).total).toBe(0);
    expect(((await as(key).get(`/${R}?search=noor@cust-spec`).expect(200)).body as Page).total).toBe(1);
    // It can still be picked among the fields answered.
    const picked = (await as(sara).get(`/${R}?fields=to&lang=en`).expect(200)).body as Page;
    expect(Object.keys(picked.data[0].values)).toEqual(["to"]);
  });

  test("where everyone reads: anyone gets a first name and nothing more; `mine` brings the rows that point at the shopper", async () => {
    const mine = (await as(sara).post(`/${P}`, { values: { note: "thank you Lina", who: "lina@cust-spec.test" }, lang: "en" }).expect(201)).body as Row;
    // (The table isn't open for changes, to a key either: the owner publishes it from the admin.)
    await prisma.collectionItem.update({ where: { id: mine.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    const waiting = (await as(sara).post(`/${P}`, { values: { note: "one more for Lina", who: "lina@cust-spec.test" }, lang: "en" }).expect(201)).body as Row;
    expect(waiting.status).toBe("DRAFT");
    const anyone = (await as(null).get(`/${P}?lang=en`).expect(200)).body as Page;
    expect(anyone.data.map((r) => r.values.who)).toEqual([{ name: "Lina", me: false }]);
    expect(JSON.stringify(anyone)).not.toContain("cust-spec.test");
    // Another shopper reading everyone's rows: the same.
    expect(((await as(dana).get(`/${P}?lang=en`).expect(200)).body as Page).data.map((r) => r.values.who)).toEqual([{ name: "Lina", me: false }]);
    // Lina's own: both, the waiting one too, as hers.
    const hers = (await as(lina).get(`/${P}?mine=1&lang=en&sort=createdAt`).expect(200)).body as Page;
    expect(hers.data.map((r) => [r.values.note, r.status, r.values.who.me])).toEqual([["thank you Lina", "PUBLISHED", true], ["one more for Lina", "DRAFT", true]]);
    expect((await as(null).get(`/${P}?who[notEmpty]=1`).expect(400)).body.error).toBe("BAD_QUERY");
  });

  test("a function reads and writes it as the email: rows that point at the caller are found by it", async () => {
    const id = (await request(app).post(`${admin}/functions`).send({ name: `${PREFIX}to me` }).expect(201)).body.id as string;
    const saved = (await request(app).put(`${admin}/functions/${id}`).send({ draft: { inputs: [], do: [{ act: "find", table: requests, filters: [{ field: "to", op: "is", value: "{{caller.email}}" }], as: "rows" }, { act: "return", value: "{{rows.length}}" }] } }).expect(200)).body;
    expect(saved.problems).toEqual([]);
    await request(app).post(`${admin}/functions/${id}/publish`).expect(200);
    await request(app).post(`${admin}/functions/${id}/triggers`).send({ kind: "call", config: { who: "customer" }, slug: `${PREFIX}to-me` }).expect(201);
    const call = (who: string) => request(app).post(`/v1/fn/${PREFIX}to-me`).set("Authorization", `Bearer ${who}`).send({ input: {} });
    expect((await call(lina).expect(200)).body).toEqual({ ok: true, value: 1 });
    expect((await call(sara).expect(200)).body).toEqual({ ok: true, value: 0 });
  });

  test("the admin's grid says who a row points at, to members who may see the customers; the kind can be the only value", async () => {
    const rows = async (auth?: string) => {
      const req = request(app).get(`${admin}/collections/${requests}/rows`).query({ q: JSON.stringify({ filters: [{ field: "to", op: "is", value: "lina@cust-spec.test" }] }) });
      return (await (auth ? req.set("Authorization", auth) : req).expect(200)).body.rows as Array<{ data: Record<string, unknown>; customers?: Record<string, { id: string; name: string }> }>;
    };
    const full = await rows();
    expect(full).toHaveLength(1);
    expect(full[0].data.to).toBe("lina@cust-spec.test");
    expect(full[0].customers).toEqual({ to: { id: linaId, name: "Lina Nasser" } });
    const role = await prisma.staffRole.create({ data: { name: `${PREFIX}editor`, permissions: ["pages:read"] } });
    const member = await prisma.adminUser.create({ data: { email: "editor@cust-spec.test", name: "editor", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    const seen = await rows(`Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`);
    expect(seen[0].customers).toBeUndefined();
    // "The only value": one request to each shopper.
    const fields = [{ id: "to", type: "customer", required: true, unique: true, message: { en: "She already has a request" } }, { id: "note", type: "text" }, { id: "state", type: "select", options: [{ id: "waiting" }, { id: "accepted" }] }];
    await request(app).put(`${admin}/collections/${requests}`).send({ slug: R, name: { en: R }, fields, accept: true }).expect(200);
    const twice = await as(dana).post(`/${R}`, { values: { to: "LINA@cust-spec.test" }, lang: "en" }).expect(400);
    expect(twice.body.details.issues[0]).toMatchObject({ field: "to", say: { en: "She already has a request" } });
  });

  test("the documents say how it is written and how it is answered", async () => {
    const doc = (await as(sara).get("/openapi.json").expect(200)).body;
    const values = doc.components.schemas.CustSpecRequestsValues.properties.to;
    expect(values.oneOf.map((x: Record<string, unknown>) => x.$ref ?? x.type)).toEqual(["string", "#/components/schemas/Shopper", "null"]);
    expect(doc.components.schemas.Shopper.required).toEqual(["name", "me"]);
    expect(doc.components.schemas.CustSpecRequestsCreate.properties.values.properties.to).toMatchObject({ type: "string", format: "email" });
  });
});

describe("Who a row points at, as a caller is answered it", () => {
  test("a first name to others, the whole name and the address to the shopper, the address to the row's owner", () => {
    const names = new Map([["lina@x.test", "Lina  Nasser"], ["dana@x.test", ""]]);
    expect(personView("lina@x.test", "owner", { id: null, email: null, names })).toEqual({ name: "Lina", me: false });
    expect(personView("lina@x.test", "owner", { id: "other", email: "other@x.test", names })).toEqual({ name: "Lina", me: false });
    expect(personView("lina@x.test", "owner", { id: "lina", email: "lina@x.test", names })).toEqual({ name: "Lina  Nasser", me: true, email: "lina@x.test" });
    expect(personView("lina@x.test", "owner", { id: "owner", email: "sara@x.test", names })).toEqual({ name: "Lina", me: false, email: "lina@x.test" });
    expect(personView("dana@x.test", null, { id: null, email: null, names })).toEqual({ name: null, me: false });
    expect(personView("noor@x.test", null, { id: null, email: null, names })).toEqual({ name: null, me: false });
  });
});
