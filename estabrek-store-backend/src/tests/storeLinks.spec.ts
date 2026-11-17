import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { STORE_IDS, storePermission, storeTarget } from "../lib/storeLinks.js";

// A relation that links the store's own rows (B3; lib/storeLinks.ts): a row of one of the owner's
// tables links products, categories, orders or customers, with the same rules as a relation
// between two of the owner's tables. With the database; requests without a token run as the
// test owner.

const PREFIX = "storelink-spec-";
type Linked = { id: string; slug: string; status: string; title: Record<string, string> | null; store?: string; hidden?: boolean };
type Row = { id: string; slug: string; data: Record<string, any> };
const at = (id: string) => `/v1/admin/collections/${id}`;
const mk = async (slug: string, fields: unknown[]) => (await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}${slug}`, name: { en: slug }, fields }).expect(201)).body.id as string;
const rows = async (id: string, q: Record<string, unknown> = {}, auth?: string) => {
  const req = request(app).get(`${at(id)}/rows`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }], ...q }) });
  return ((await (auth ? req.set("Authorization", auth) : req).expect(200)).body.rows as Row[]);
};
const add = (id: string, slug: string, values: Record<string, unknown>) => request(app).post(`${at(id)}/rows`).send({ slug, lang: "en", values });
const patch = (table: string, id: string, values: Record<string, unknown>) => request(app).patch(`${at(table)}/rows/${id}`).send({ lang: "en", values });
const names = (r: Row | undefined, field: string) => ((r?.data[field] ?? []) as Linked[]).map((x) => x.title?.en ?? null);

let notes = "";
const FIELDS = [
  { id: "title", type: "text", required: true },
  // Many notes may be about one product; one note, several categories; an order has one note only; a customer has several notes of their own.
  { id: "product", type: "relation", to: "store:products" },
  { id: "categories", type: "relation", to: "store:categories", many: true },
  { id: "order", type: "relation", to: "store:orders", exclusive: true },
  { id: "customers", type: "relation", to: "store:customers", many: true, exclusive: true },
];

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.adminUser.deleteMany({ where: { email: "member@storelink-spec.test" } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  const fns = await prisma.fn.findMany({ where: { name: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { id: { in: fns.map((f) => f.id) } } });
  invalidateAccess();
  await resetDb();
}

beforeAll(async () => {
  await clean();
  await seedCatalog();
  await prisma.product.create({ data: { id: "p2", slug: "red-coat", title: "Red Coat", isActive: false, categoryId: "c1" } });
  await prisma.user.create({ data: { id: "u1", name: "Sara", email: "sara@example.test" } });
  await prisma.user.create({ data: { id: "u2", name: "", email: "lina@example.test" } });
  await prisma.orderRequest.createMany({
    data: [
      { id: "or1", variantId: "cvariant01", quantity: 2, customerName: "Sara", phone: "0599000001", total: new Prisma.Decimal(100), status: "NEW" },
      { id: "or2", variantId: "cvariant01", quantity: 1, customerName: "Lina", phone: "0599000002", total: new Prisma.Decimal(50), status: "SHIPPED" },
    ],
  });
  notes = await mk("notes", FIELDS);
});
afterAll(clean);

describe("A relation's other end may be one of the store's tables", () => {
  test("which ones, and what each asks of who looks", () => {
    // (Every table the grid shows is one: storeTablesRest.spec.ts; these four are the ones this spec links.)
    for (const s of ["products", "categories", "orders", "customers"] as const) expect(STORE_IDS).toContain(s);
    expect((["products", "categories", "orders", "customers"] as const).map((s) => storePermission(s))).toEqual(["catalog:read", "catalog:read", "orders:read", "customers:read"]);
    expect(storeTarget("store:products")).toBe("products");
    for (const not of ["products", "store:", "store:pages", "store:constructor", "", undefined, null, 5]) expect(storeTarget(not)).toBeNull();
  });

  test("the field is saved like any relation; a store table that isn't one is no table; nothing is deleted with a store row", async () => {
    const none = await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}bad`, name: { en: "x" }, fields: [{ id: "title", type: "text" }, { id: "what", type: "relation", to: "store:pages" }] }).expect(400);
    expect(none.body.issues).toEqual([{ path: "fields.1.to", message: "No such table to link" }]);
    const withIt = await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}bad`, name: { en: "x" }, fields: [{ id: "p", type: "relation", to: "store:products", onDelete: "cascade" }] }).expect(400);
    expect(withIt.body.issues[0].message).toBe("A link to the store's rows is only ever dropped");
    const saved = ((await request(app).get("/v1/admin/collections").expect(200)).body as Array<{ id: string; fields: any[] }>).find((c) => c.id === notes)!;
    expect(saved.fields.filter((f: { type: string }) => f.type === "relation").map((f: { id: string; to: string; many?: boolean; exclusive?: boolean }) => [f.id, f.to, !!f.many, !!f.exclusive])).toEqual([
      ["product", "store:products", false, false],
      ["categories", "store:categories", true, false],
      ["order", "store:orders", false, true],
      ["customers", "store:customers", true, true],
    ]);
  });
});

describe("Linking the store's rows", () => {
  let n1 = "";
  let n2 = "";

  test("by id, by a product's or a category's address, by a customer's email; read back by what each is called", async () => {
    const out = await add(notes, "n1", { title: "First", product: "blue-shirt", categories: "men, c2", order: "or1", customers: ["sara@example.test", "u2"] }).expect(201);
    n1 = out.body.id;
    expect(out.body.data.product).toEqual([{ id: "p1", slug: "blue-shirt", status: "PUBLISHED", title: { ar: "Blue Shirt", en: "Blue Shirt", he: "Blue Shirt" }, store: "products" }]);
    expect(names(out.body, "categories")).toEqual(["Men", "Shirts"]);
    // An order is called by its customer; a customer by their name, or their email where they gave none.
    expect(out.body.data.order).toEqual([{ id: "or1", slug: "or1", status: "PUBLISHED", title: { ar: "Sara", en: "Sara", he: "Sara" }, store: "orders" }]);
    expect((out.body.data.customers as Linked[]).map((c) => [c.id, c.slug, c.title?.en])).toEqual([["u1", "u1", "Sara"], ["u2", "u2", "lina@example.test"]]);
    // The links are kept in their own table; the row's own values never hold them; the store's tables are untouched.
    expect((await prisma.collectionItem.findUniqueOrThrow({ where: { id: n1 } })).data).toEqual({ title: { en: "First" } });
    expect(await prisma.storeLink.count({ where: { fromId: n1 } })).toBe(6);
    expect(await prisma.collectionLink.count({ where: { fromId: n1 } })).toBe(0);
    // The grid reads them the same way; a cell replaces them, in the order given; an empty one unlinks.
    expect(names((await rows(notes))[0], "product")).toEqual(["Blue Shirt"]);
    expect(names((await patch(notes, n1, { categories: ["c2", "c1"] }).expect(200)).body, "categories")).toEqual(["Shirts", "Men"]);
    expect((await patch(notes, n1, { product: [] }).expect(200)).body.data.product).toBeUndefined();
    expect(names((await patch(notes, n1, { product: [{ id: "p2" }] }).expect(200)).body, "product")).toEqual(["Red Coat"]);
  });

  test("the relation's own rules: one row, a row that is there, a store row linked from one row only", async () => {
    expect((await patch(notes, n1, { product: "p1, p2" }).expect(400)).body.details.issues).toEqual([{ field: "product", message: "One row only" }]);
    expect((await patch(notes, n1, { product: "no-such-product" }).expect(400)).body.details.issues).toEqual([{ field: "product", message: "No such row", value: "no-such-product" }]);
    // A row of another store table isn't one of this one's.
    expect((await patch(notes, n1, { product: "c1" }).expect(400)).body.details.issues[0]).toMatchObject({ message: "No such row", value: "c1" });
    // An order takes one note only (one to one); the same product may be in many notes (many to one).
    const second = await add(notes, "n2", { title: "Second", product: "p2", order: "or1" }).expect(400);
    expect(second.body.details.issues).toEqual([{ field: "order", message: "Already linked from another row", value: "or1" }]);
    const made = await add(notes, "n2", { title: "Second", product: "p2", order: "or2" }).expect(201);
    n2 = made.body.id;
    expect(names(made.body, "product")).toEqual(["Red Coat"]);
    // A customer belongs to one note (one to many): Sara is the first note's.
    expect((await patch(notes, n2, { customers: "u1" }).expect(400)).body.details.issues[0]).toMatchObject({ field: "customers", message: "Already linked from another row" });
    // Saving the row it already belongs to changes nothing; letting go frees it.
    await patch(notes, n1, { customers: ["u1", "u2"] }).expect(200);
    await patch(notes, n1, { customers: ["u2"] }).expect(200);
    expect(names((await patch(notes, n2, { customers: "u1" }).expect(200)).body, "customers")).toEqual(["Sara"]);
  });

  test("the grid asks about it like any relation: empty, not empty, any of these rows, and by how many", async () => {
    await add(notes, "n3", { title: "Third" }).expect(201);
    const slugs = async (q: Record<string, unknown>) => (await rows(notes, q)).map((r) => r.slug);
    expect(await slugs({ filters: [{ field: "product", op: "empty" }] })).toEqual(["n3"]);
    expect(await slugs({ filters: [{ field: "product", op: "notEmpty" }] })).toEqual(["n1", "n2"]);
    expect(await slugs({ filters: [{ field: "categories", op: "anyOf", value: ["c1"] }] })).toEqual(["n1"]);
    expect(await slugs({ filters: [{ field: "order", op: "anyOf", value: ["or2", "or-none"] }] })).toEqual(["n2"]);
    expect(await slugs({ sort: [{ field: "categories", dir: "desc" }, { field: "$slug", dir: "asc" }] })).toEqual(["n1", "n2", "n3"]);
    // The same rows given to several rows at once (the grid's "set a value").
    const all = (await rows(notes)).map((r) => r.id);
    await request(app).post(`${at(notes)}/rows/bulk`).send({ ids: all, op: "set", field: "categories", value: ["c2"], lang: "en" }).expect(200);
    expect((await rows(notes)).map((r) => names(r, "categories"))).toEqual([["Shirts"], ["Shirts"], ["Shirts"]]);
    // One that takes one row can't be given to many.
    expect((await request(app).post(`${at(notes)}/rows/bulk`).send({ ids: all, op: "set", field: "order", value: ["or1"], lang: "en" }).expect(400)).body.details.issues[0].message).toBe("Only one row can link this row");
  });

  test("a store row that is deleted stops showing, and holds nothing back; a note deleted for good takes its links", async () => {
    await prisma.product.create({ data: { id: "p3", slug: "gone-soon", title: "Gone soon", isActive: true, categoryId: "c1" } });
    await patch(notes, n1, { product: "gone-soon" }).expect(200);
    await prisma.product.delete({ where: { id: "p3" } });
    const after = (await rows(notes)).find((r) => r.id === n1)!;
    expect(after.data.product).toBeUndefined();
    expect((await rows(notes, { filters: [{ field: "product", op: "empty" }] })).map((r) => r.slug)).toContain("n1");
    // A note to the trash and back keeps its links; deleted for good, they go with it.
    await request(app).post(`${at(notes)}/rows/bulk`).send({ ids: [n2], op: "trash" }).expect(200);
    await request(app).post(`${at(notes)}/rows/bulk`).send({ ids: [n2], op: "restore" }).expect(200);
    expect(names((await rows(notes)).find((r) => r.id === n2), "product")).toEqual(["Red Coat"]);
    await request(app).post(`${at(notes)}/rows/bulk`).send({ ids: [n2], op: "trash" }).expect(200);
    await request(app).post(`${at(notes)}/rows/bulk`).send({ ids: [n2], op: "purge" }).expect(200);
    expect(await prisma.storeLink.count({ where: { fromId: n2 } })).toBe(0);
    // The order it held is free for another note.
    expect(names((await patch(notes, n1, { order: "or2" }).expect(200)).body, "order")).toEqual(["Lina"]);
  });
});

describe("Who is told what", () => {
  test("a linked store row is named only to who may see that store table; the box that picks rows asks for it too", async () => {
    const table = await mk("private", [{ id: "title", type: "text" }, { id: "who", type: "relation", to: "store:customers" }, { id: "what", type: "relation", to: "store:products" }]);
    await add(table, "x1", { title: "X", who: "sara@example.test", what: "blue-shirt" }).expect(201);
    const role = await prisma.staffRole.create({ data: { name: `${PREFIX}catalog-only`, permissions: ["pages:read", "pages:write", "catalog:read"] } });
    const u = await prisma.adminUser.create({ data: { email: "member@storelink-spec.test", name: "member", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    invalidateAccess();
    const member = `Bearer ${signAccessToken({ sub: u.id, email: u.email, role: "STAFF" } as never)}`;
    const seen = (await rows(table, {}, member))[0];
    // The product by its name; the customer only as a row that is linked (no name, no email).
    expect(seen.data.what).toEqual([{ id: "p1", slug: "blue-shirt", status: "PUBLISHED", title: { ar: "Blue Shirt", en: "Blue Shirt", he: "Blue Shirt" }, store: "products" }]);
    expect(seen.data.who).toEqual([{ id: "u1", slug: "u1", status: "PUBLISHED", title: null, store: "customers", hidden: true }]);
    expect(JSON.stringify(seen)).not.toContain("Sara");
    expect(JSON.stringify(seen)).not.toContain("sara@example.test");
    // The owner sees both.
    expect(names((await rows(table))[0], "who")).toEqual(["Sara"]);
    // What they may not see they can't link by name either (what a name finds would say who the store's customers are):
    // the row keeps the customer it has, or lets go of it, and takes no other. The product is theirs to change.
    const as = (req: request.Test) => req.set("Authorization", member);
    for (const name of ["lina@example.test", "u2", "no-such@example.test"]) {
      expect((await as(patch(table, seen.id, { who: name })).expect(400)).body.details.issues, name).toEqual([{ field: "who", message: "Linking this table's rows needs the permission to see it" }]);
    }
    expect((await as(add(table, "x2", { title: "Y", who: "u1" })).expect(400)).body.details.issues[0].field).toBe("who");
    expect((await as(request(app).post(`${at(table)}/rows/bulk`).send({ ids: [seen.id], op: "set", field: "who", value: ["u2"], lang: "en" })).expect(400)).body.details.issues[0].field).toBe("who");
    // Saved as it is (the row's window sends every value back), with another value changed.
    const kept = (await as(patch(table, seen.id, { title: "X2", who: ["u1"], what: "red-coat" })).expect(200)).body as Row;
    expect([kept.data.title, (kept.data.who as Linked[])[0].hidden, names(kept, "what")]).toEqual([{ en: "X2" }, true, ["Red Coat"]]);
    await as(add(table, "x3", { title: "Z", what: "p1" })).expect(201);
    expect(names((await rows(table)).find((r) => r.slug === "x1"), "who")).toEqual(["Sara"]);
    // The box that picks: the store table's own permission.
    const lookup = (t: string, search = "") => request(app).get(`/v1/admin/data/store/${t}/lookup`).query({ search });
    expect((await lookup("products", "coat").set("Authorization", member).expect(200)).body).toEqual({ rows: [{ id: "p2", slug: "red-coat", status: "PUBLISHED", title: { ar: "Red Coat", en: "Red Coat", he: "Red Coat" }, store: "products" }], total: 1 });
    await lookup("customers").set("Authorization", member).expect(403);
    expect(((await lookup("customers", "sara").expect(200)).body.rows as Linked[]).map((r) => [r.id, r.title?.en])).toEqual([["u1", "Sara"]]);
    expect(((await lookup("orders").expect(200)).body.rows as Linked[]).map((r) => r.title?.en).sort()).toEqual(["Lina", "Sara"]);
    await lookup("pages").expect(404);
    // Letting go is theirs: the link is dropped.
    expect((await as(patch(table, seen.id, { who: [] })).expect(200)).body.data.who).toBeUndefined();
    expect(await prisma.storeLink.count({ where: { fromId: seen.id, toTable: "customers" } })).toBe(0);
  });

  test("the public API and a function: a store link isn't answered to a key, and a function reads it by name", async () => {
    // A table's rows over the API: its relation to the store isn't among what a key is told (nothing of the store leaves this way).
    const table = await mk("open", [{ id: "title", type: "text" }, { id: "what", type: "relation", to: "store:products" }]);
    const made = (await add(table, "o1", { title: "O", what: "blue-shirt" }).expect(201)).body;
    await request(app).patch(`${at(table)}/rows/${made.id}`).send({ lang: "en", status: "PUBLISHED" }).expect(200);
    await request(app).put(`/v1/admin/api/tables/${table}`).send({ read: "public", create: "public", update: "off", delete: "off" }).expect(200);
    const out1 = (await request(app).get(`/v1/data/${PREFIX}open?lang=en`).expect(200)).body as { data: Array<{ slug: string; values: Record<string, unknown> }> };
    expect(out1.data.map((r) => [r.slug, Object.keys(r.values)])).toEqual([["o1", ["title"]]]);
    expect(JSON.stringify(out1)).not.toContain("Blue Shirt");
    expect((await request(app).get(`/v1/data/${PREFIX}open/o1?expand=what`).expect(403)).body.error).toBe("NOT_ALLOWED");
    expect((await request(app).get(`/v1/data/${PREFIX}open?what[notEmpty]=1`).expect(400)).body.error).toBe("BAD_QUERY");
    const sent = (await request(app).post(`/v1/data/${PREFIX}open`).send({ values: { title: "From outside", what: "blue-shirt" }, lang: "en" }).expect(400)).body;
    expect(sent).toMatchObject({ error: "ROW_INVALID", details: { issues: [{ field: "what", message: "The table it links isn't open to you" }] } });
    // A function is the owner's own logic: it reads the linked product.
    const fn = (await request(app).post("/v1/admin/functions").send({ name: `${PREFIX}reads` }).expect(201)).body.id as string;
    await request(app).put(`/v1/admin/functions/${fn}`).send({ draft: { lang: "en", inputs: [], do: [{ act: "find", table, as: "rows" }, { act: "return", value: "{{rows.first.what}}" }] } }).expect(200);
    const out = (await request(app).post(`/v1/admin/functions/${fn}/run`).send({ input: {}, dry: true, which: "draft" }).expect(200)).body;
    expect(out).toMatchObject({ ok: true, value: [{ id: "p1", slug: "blue-shirt", title: "Blue Shirt" }] });
    await request(app).delete(`/v1/admin/functions/${fn}`).expect(200);
  });
});
