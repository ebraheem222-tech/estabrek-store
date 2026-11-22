import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { tablePermission } from "../modules/admin/permissions.js";
import { closedTo, linksFor } from "../lib/links.js";

// What a member given the owner's tables one by one (E0.5) is told of the rows those tables link,
// and of who links them. A linked row of a table they weren't given is told by its id alone (no
// address, words or status); who links a row is said only through the tables they were given (the
// column itself would name the other table, and its rows by name); a row of such a table is never
// looked up for them by name (what a name finds, or doesn't, would say what that table holds); and
// a refused delete says which table holds the rows, not which of its rows. With the database;
// requests without a token run as the test owner, a Bearer token as that member.
// (The same for the store's tables: storeLinks.spec.ts, storeLinkedFrom.spec.ts.)

const PREFIX = "names-spec-";
const admin = "/v1/admin";
const ORDERS = `${PREFIX}orders`;
const SUPPLIERS = `${PREFIX}suppliers`;
const NOTES = `${PREFIX}notes`;
const FROM_SELF = `$from.${ORDERS}.helpers`;
const FROM_NOTES = `$from.${NOTES}.order`;
const REFUSED = "Linking this table's rows needs the permission to see it";
type Linked = { id: string; slug: string; status: string; title: Record<string, string> | null; hidden?: boolean };
type Row = { id: string; slug: string; data: Record<string, unknown>; from?: Record<string, { n: number; rows: Linked[] }> };
type Page = { rows: Row[]; total: number; incoming: Array<{ id: string; table: string; slug: string }> };
let orders = "";
let suppliers = "";
let notes = "";
let acme = "";
let other = "";
let o1 = "";
let o2 = "";
/** Given the orders, to change. */
let clerk = "";
/** Every table (pages:read). */
let reader = "";

const at = (table: string) => `${admin}/collections/${table}`;
const as = (req: request.Test, auth?: string) => (auth ? req.set("Authorization", auth) : req);
const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const add = async (table: string, slug: string, values: Record<string, unknown>) => (await request(app).post(`${at(table)}/rows`).send({ slug, status: "PUBLISHED", lang: "en", values }).expect(201)).body.id as string;
const page = (auth?: string, q: Record<string, unknown> = {}) => as(request(app).get(`${at(orders)}/rows`).query({ q: JSON.stringify({ sort: [{ field: "$slug", dir: "asc" }], ...q }) }), auth);
const patch = (row: string, values: Record<string, unknown>, auth?: string) => as(request(app).patch(`${at(orders)}/rows/${row}`).send({ lang: "en", values }), auth);
const bulk = (body: Record<string, unknown>, auth?: string) => as(request(app).post(`${at(orders)}/rows/bulk`).send({ lang: "en", ...body }), auth);
const member = async (name: string, permissions: string[]) => {
  const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
  const user = await prisma.adminUser.create({ data: { email: `${name}@names-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
  return `Bearer ${signAccessToken({ sub: user.id, role: "STAFF", email: user.email })}`;
};
const said = (body: unknown) => JSON.stringify(body);
/** What only who may see the suppliers and the notes may be told. */
const SECRETS = ["Acme", "acme-supplier", "Private note", NOTES];

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@names-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  suppliers = await mk(SUPPLIERS, [{ id: "title", type: "text" }]);
  // Orders: each from one supplier, and helped by other orders (a relation of the table to itself).
  const fields = [{ id: "title", type: "text" }, { id: "supplier", type: "relation", to: suppliers }];
  orders = await mk(ORDERS, fields);
  await request(app).put(at(orders)).send({ slug: ORDERS, name: { en: ORDERS }, fields: [...fields, { id: "helpers", type: "relation", to: orders, many: true }], accept: true }).expect(200);
  // Notes about an order, which don't let it be deleted.
  notes = await mk(NOTES, [{ id: "title", type: "text" }, { id: "order", type: "relation", to: orders, onDelete: "restrict" }]);
  acme = await add(suppliers, "acme-supplier", { title: "Acme" });
  other = await add(suppliers, "other-supplier", { title: "Other" });
  o1 = await add(orders, "o1", { title: "Order one", supplier: "acme-supplier" });
  o2 = await add(orders, "o2", { title: "Order two", helpers: ["o1"] });
  await add(notes, "n1", { title: "Private note", order: "o1" });
  clerk = await member("clerk", ["dashboard:read", tablePermission(orders, "write")]);
  reader = await member("reader", ["dashboard:read", "pages:read"]);
});
afterAll(clean);

describe("A member given some of the tables", () => {
  test("is told a linked row of a table they weren't given by its id alone, and who links a row only through their own tables", async () => {
    const mine = (await page(clerk).expect(200)).body as Page;
    const [one, two] = mine.rows;
    expect([one.slug, two.slug]).toEqual(["o1", "o2"]);
    // The supplier: only that one is linked.
    expect(one.data.supplier).toEqual([{ id: acme, slug: acme, status: "PUBLISHED", title: null, hidden: true }]);
    // Their own table, linked to itself: by name, both ways.
    expect(two.data.helpers).toEqual([{ id: o1, slug: "o1", status: "PUBLISHED", title: { en: "Order one" } }]);
    expect(mine.incoming.map((x) => x.id)).toEqual([FROM_SELF]);
    expect(one.from).toEqual({ [FROM_SELF]: { n: 1, rows: [{ id: o2, slug: "o2", status: "PUBLISHED", title: { en: "Order two" } }] } });
    expect(two.from).toEqual({});
    for (const secret of SECRETS) expect(said(mine), secret).not.toContain(secret);
    // The owner, and a member with every table, are told everything.
    for (const auth of [undefined, reader]) {
      const all = (await page(auth).expect(200)).body as Page;
      expect(all.incoming.map((x) => x.id)).toEqual([FROM_SELF, FROM_NOTES]);
      expect(all.rows[0].data.supplier).toEqual([{ id: acme, slug: "acme-supplier", status: "PUBLISHED", title: { en: "Acme" } }]);
      expect(all.rows[0].from![FROM_NOTES].rows.map((r) => [r.slug, r.title?.en])).toEqual([["n1", "Private note"]]);
    }
  });

  test("can't ask the grid about another table's links; the file and the older list say no more than the grid", async () => {
    expect((await page(clerk, { filters: [{ field: FROM_NOTES, op: "notEmpty" }] }).expect(400)).body.message).toBe(`No column "${FROM_NOTES}" in this table`);
    await page(clerk, { sort: [{ field: FROM_NOTES, dir: "desc" }] }).expect(400);
    await bulk({ query: { filters: [{ field: FROM_NOTES, op: "notEmpty" }] }, op: "draft" }, clerk).expect(400);
    // Their own table's: as before.
    expect(((await page(clerk, { filters: [{ field: FROM_SELF, op: "notEmpty" }] }).expect(200)).body as Page).rows.map((r) => r.slug)).toEqual(["o1"]);
    // The supplier by its id: it is linked, nothing more.
    expect(((await page(clerk, { filters: [{ field: "supplier", op: "anyOf", value: [acme] }] }).expect(200)).body as Page).rows.map((r) => r.slug)).toEqual(["o1"]);
    const csv = (await as(request(app).get(`${at(orders)}/rows/export`).query({ q: "{}" }), clerk).expect(200)).text;
    expect(csv).toContain(acme);
    for (const secret of SECRETS) expect(csv, secret).not.toContain(secret);
    expect((await request(app).get(`${at(orders)}/rows/export`).query({ q: "{}" }).expect(200)).text).toContain("acme-supplier");
    const items = (await as(request(app).get(`${at(orders)}/items`), clerk).expect(200)).body as Row[];
    expect(items.find((x) => x.slug === "o1")!.data.supplier).toEqual([{ id: acme, slug: acme, status: "PUBLISHED", title: null, hidden: true }]);
    for (const secret of SECRETS) expect(said(items), secret).not.toContain(secret);
  });

  test("can't look a row of such a table up by name: a row keeps what it links there, or lets go of it, and takes nothing else", async () => {
    // By its address, by its id, or a name that is no row at all: the same answer.
    for (const name of ["acme-supplier", acme, "other-supplier", other, "no-such-supplier"]) {
      expect((await patch(o2, { supplier: name }, clerk).expect(400)).body.details.issues, name).toEqual([{ field: "supplier", message: REFUSED }]);
    }
    // A new row, a file's worth, many rows at once: the same.
    expect((await as(request(app).post(`${at(orders)}/rows`).send({ slug: "o3", lang: "en", values: { title: "Three", supplier: "acme-supplier" } }), clerk).expect(400)).body.details.issues).toEqual([{ field: "supplier", message: REFUSED }]);
    const file = (await as(request(app).post(`${at(orders)}/rows/import`).send({ lang: "en", dryRun: true, rows: [{ slug: "o4", values: { title: "Four", supplier: "other-supplier" } }] }), clerk).expect(200)).body;
    expect(file.rejected).toEqual([{ row: 0, slug: "o4", issues: [{ field: "supplier", message: REFUSED }] }]);
    expect((await bulk({ ids: [o2], op: "set", field: "supplier", value: [acme] }, clerk).expect(400)).body.details.issues).toEqual([{ field: "supplier", message: REFUSED }]);
    // The older route too.
    expect((await as(request(app).put(`${at(orders)}/items/${o2}`).send({ data: { supplier: "acme-supplier" } }), clerk).expect(400)).body.issues).toEqual([{ field: "supplier", message: REFUSED }]);
    // Saved as it is (the row's window sends every value back), with another value changed.
    const kept = (await patch(o1, { title: "Order one!", supplier: [acme] }, clerk).expect(200)).body as Row;
    expect([kept.data.title, kept.data.supplier]).toEqual([{ en: "Order one!" }, [{ id: acme, slug: acme, status: "PUBLISHED", title: null, hidden: true }]]);
    // Its answer, like the grid's: who links it only through their own table.
    expect(Object.keys(kept.from!)).toEqual([FROM_SELF]);
    for (const secret of SECRETS) expect(said(kept), secret).not.toContain(secret);
    // Letting go is theirs.
    expect((await patch(o1, { supplier: [] }, clerk).expect(200)).body.data.supplier).toBeUndefined();
    expect(await prisma.collectionLink.count({ where: { fromId: o1, fieldId: "supplier" } })).toBe(0);
    // Who may see the suppliers links them by name, as before.
    expect(((await patch(o1, { supplier: "acme-supplier" }).expect(200)).body as Row).data.supplier).toEqual([{ id: acme, slug: "acme-supplier", status: "PUBLISHED", title: { en: "Acme" } }]);
  });

  test("a refused delete says which table holds the rows, not which of its rows", async () => {
    const no = await bulk({ ids: [o1], op: "trash" }, clerk).expect(409);
    expect(no.body).toMatchObject({ error: "ROWS_LINKED", details: { blockers: [{ table: notes, slug: NOTES, field: "order", rows: 1, sample: "" }] } });
    const old = await as(request(app).delete(`${at(orders)}/items/${o1}`), clerk).expect(409);
    expect(old.body).toMatchObject({ error: "ROWS_LINKED", blockers: [{ table: notes, field: "order", rows: 1, sample: "" }] });
    // The row's name as a whole value: a table's random id may hold the letters "n1".
    expect(said(no.body)).not.toContain('"n1"');
    // The owner is told the row.
    expect((await bulk({ ids: [o1], op: "trash" }).expect(409)).body.details.blockers[0].sample).toBe("n1");
    expect(await prisma.collectionItem.count({ where: { id: o1, deletedAt: null } })).toBe(1);
  });

  test("the pure part: a table is closed to a reader who may not see it, and its linked rows are told by their ids", async () => {
    const view = { table: (id: string) => id === orders };
    expect([closedTo(view, suppliers), closedTo(view, orders), closedTo({}, suppliers), closedTo(view, "store:products"), closedTo({ store: () => false }, "store:products")]).toEqual([true, false, false, false, true]);
    const links = await linksFor(prisma, { id: orders, fields: [{ id: "supplier", type: "relation", to: suppliers }] as never }, [o1], view);
    expect(links.get(o1)).toEqual({ supplier: [{ id: acme, slug: acme, status: "PUBLISHED", title: null, hidden: true }] });
  });
});
