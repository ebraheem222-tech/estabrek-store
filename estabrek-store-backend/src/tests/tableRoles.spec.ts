import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { cleanPermissions, isTablePermission, tablePermission, tableRight } from "../modules/admin/permissions.js";

// Tables given to a role one by one (E0.5), with the database. A role with pages:read / pages:write
// has every table, as before; a role can instead be given single tables: to see their rows
// ("data:<id>:read") or to change them too ("data:<id>:write"). A table's fields, versions and API
// stay with pages:write and api:write. Requests without a token run as the test owner; a Bearer
// token runs as that member.

const PREFIX = "roles-spec-";
const admin = "/v1/admin";
const A = `${PREFIX}orders-notes`;
const B = `${PREFIX}suppliers`;
const C = `${PREFIX}secret`;
let a = "";
let b = "";
let c = "";
let rowA = "";
const as = (id: string) => `Bearer ${signAccessToken({ sub: id, role: "STAFF", email: `${id}@t.local` })}`;
const mk = async (slug: string) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields: [{ id: "title", type: "text", required: true }, { id: "note", type: "longText" }] }).expect(201)).body.id as string;
const member = async (name: string, permissions: string[]) => {
  const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
  const user = await prisma.adminUser.create({ data: { email: `${name}@roles-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
  return { id: user.id, role: role.id, auth: as(user.id) };
};
const get = (path: string, auth: string) => request(app).get(`${admin}${path}`).set("Authorization", auth);
const send = (method: "post" | "put" | "patch" | "delete", path: string, auth: string, body: object = {}) => request(app)[method](`${admin}${path}`).set("Authorization", auth).send(body);

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((x) => x.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((x) => x.id) } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@roles-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  a = await mk(A);
  b = await mk(B);
  c = await mk(C);
  for (const id of [a, b, c]) await request(app).post(`${admin}/collections/${id}/rows/import`).send({ lang: "en", rows: [{ slug: "r1", values: { title: "First" } }, { slug: "r2", values: { title: "Second" } }] }).expect(200);
  rowA = (await prisma.collectionItem.findUniqueOrThrow({ where: { collectionId_slug: { collectionId: a, slug: "r1" } } })).id;
});
afterAll(clean);

describe("A table's permission", () => {
  test("is the table's id and what may be done; changing a table includes seeing it", () => {
    expect(tablePermission("cabc12345678", "read")).toBe("data:cabc12345678:read");
    for (const ok of ["data:cabc12345678:read", "data:cmwi0ribv000bvs80kcifhm9e:write"]) expect(isTablePermission(ok), ok).toBe(true);
    for (const no of ["data:x:read", "data:cabc12345678:delete", "data::read", "pages:read", "data:CABC12345678:read", "data:cabc12345678:read ", 5, null]) expect(isTablePermission(no), String(no)).toBe(false);
    const has = (list: string[]) => (p: string) => list.includes(p);
    expect(tableRight(has(["data:t1234567:read"]), "t1234567", "read")).toBe(true);
    expect(tableRight(has(["data:t1234567:read"]), "t1234567", "write")).toBe(false);
    expect(tableRight(has(["data:t1234567:write"]), "t1234567", "read")).toBe(true);
    expect(tableRight(has(["data:t1234567:write"]), "t7654321", "read")).toBe(false);
    // Every table, as before.
    expect(tableRight(has(["pages:read"]), "t1234567", "read")).toBe(true);
    expect(tableRight(has(["pages:read"]), "t1234567", "write")).toBe(false);
    expect(tableRight(has(["pages:write"]), "t1234567", "write")).toBe(true);
  });

  test("is kept with a role's other permissions: the catalogue's in order, then the tables, each once", () => {
    expect(cleanPermissions(["data:cbbb12345678:write", "pages:read", "nonsense", "data:caaa12345678:read", "dashboard:read", "data:caaa12345678:read", "data:x:read"])).toEqual(["dashboard:read", "pages:read", "data:caaa12345678:read", "data:cbbb12345678:write"]);
    expect(cleanPermissions(null)).toEqual([]);
  });
});

describe("A member given tables one by one", () => {
  test("sees those tables and no others; a table given to see can't be changed", async () => {
    const m = await member("looker", ["dashboard:read", tablePermission(a, "read"), tablePermission(b, "write")]);
    const list = (await get("/collections", m.auth).expect(200)).body as Array<{ id: string; slug: string }>;
    expect(list.map((t) => t.slug)).toEqual([A, B]);
    await get("/collections/grid-meta", m.auth).expect(200);
    // The rows of what was given: the page, the file, the rows to pick from.
    expect((await get(`/collections/${a}/rows`, m.auth).expect(200)).body.total).toBe(2);
    await get(`/collections/${a}/rows/export`, m.auth).expect(200);
    await get(`/collections/${a}/rows/lookup`, m.auth).expect(200);
    await get(`/collections/${b}/rows`, m.auth).expect(200);
    // The table that wasn't: not its rows, by any of their routes.
    for (const path of [`/collections/${c}/rows`, `/collections/${c}/rows/export`, `/collections/${c}/rows/lookup`, `/collections/${c}/items`])
      expect((await get(path, m.auth).expect(403)).body, path).toMatchObject({ error: "PERMISSION_DENIED", required: ["pages:read"] });
    // Given to see: nothing is written, by a cell, a new row, many at once, a file, or the older routes.
    for (const [method, path, body] of [
      ["post", `/collections/${a}/rows`, { values: { title: "x" } }],
      ["patch", `/collections/${a}/rows/${rowA}`, { values: { note: "x" } }],
      ["post", `/collections/${a}/rows/bulk`, { ids: [rowA], op: "trash" }],
      ["post", `/collections/${a}/rows/import`, { rows: [{ values: { title: "x" } }] }],
      ["post", `/collections/${a}/items`, { slug: "x", data: { title: { en: "x" } } }],
      ["delete", `/collections/${a}/items/${rowA}`, {}],
    ] as const) expect((await send(method, path, m.auth, body).expect(403)).body, path).toMatchObject({ error: "PERMISSION_DENIED", required: ["pages:write"] });
    expect(await prisma.collectionItem.count({ where: { collectionId: a, deletedAt: null } })).toBe(2);
    // Given to change: its rows are written.
    const made = (await send("post", `/collections/${b}/rows`, m.auth, { values: { title: "A new supplier" }, lang: "en" }).expect(201)).body;
    expect((await send("patch", `/collections/${b}/rows/${made.id}`, m.auth, { values: { note: "Pays late" }, lang: "en" }).expect(200)).body.data.note).toEqual({ en: "Pays late" });
    expect((await send("post", `/collections/${b}/rows/bulk`, m.auth, { ids: [made.id], op: "publish" }).expect(200)).body.changed).toBe(1);
    expect((await send("post", `/collections/${b}/rows/import`, m.auth, { lang: "en", rows: [{ values: { title: "From a file" } }] }).expect(200)).body.created).toBe(1);
  });

  test("a table's fields, versions, page and API are not a row's: they stay with the general permissions", async () => {
    const m = await member("writer", [tablePermission(b, "write")]);
    for (const [method, path, body] of [
      ["put", `/collections/${b}`, { slug: B, name: { en: "renamed" }, fields: [{ id: "title", type: "text" }] }],
      ["delete", `/collections/${b}`, {}],
      ["post", `/collections`, { slug: `${PREFIX}new`, name: { en: "new" }, fields: [{ id: "title", type: "text" }] }],
      ["post", `/collections/${b}/fields/preview`, { slug: B, name: { en: B }, fields: [{ id: "title", type: "text" }] }],
      ["post", `/collections/${b}/template`, {}],
    ] as const) expect((await send(method, path, m.auth, body).expect(403)).body.error, path).toBe("PERMISSION_DENIED");
    expect((await get(`/collections/${b}/revisions`, m.auth).expect(403)).body.error).toBe("PERMISSION_DENIED");
    expect((await get("/collections/presets", m.auth).expect(403)).body.error).toBe("PERMISSION_DENIED");
    expect((await get("/api", m.auth).expect(403)).body.error).toBe("PERMISSION_DENIED");
    expect((await prisma.collection.findUniqueOrThrow({ where: { id: b } })).slug).toBe(B);
  });

  test("with no table at all there is no way in; with pages:read every table, as before", async () => {
    const none = await member("none", ["dashboard:read"]);
    expect((await get("/collections", none.auth).expect(403)).body.error).toBe("PERMISSION_DENIED");
    expect((await get("/collections/grid-meta", none.auth).expect(403)).body.error).toBe("PERMISSION_DENIED");
    expect((await get(`/collections/${a}/rows`, none.auth).expect(403)).body.error).toBe("PERMISSION_DENIED");
    const reader = await member("reader", ["pages:read"]);
    expect(((await get("/collections", reader.auth).expect(200)).body as Array<{ slug: string }>).filter((t) => t.slug.startsWith(PREFIX)).map((t) => t.slug)).toEqual([A, B, C]);
    await get(`/collections/${c}/rows`, reader.auth).expect(200);
    await get("/collections/presets", reader.auth).expect(200);
    expect((await send("post", `/collections/${c}/rows`, reader.auth, { values: { title: "x" } }).expect(403)).body.required).toEqual(["pages:write"]);
    // Reading every table plus one table to change: that one is written, the others aren't.
    const mixed = await member("mixed", ["pages:read", tablePermission(c, "write")]);
    await send("post", `/collections/${c}/rows`, mixed.auth, { values: { title: "Allowed" }, lang: "en" }).expect(201);
    expect((await send("post", `/collections/${a}/rows`, mixed.auth, { values: { title: "x" } }).expect(403)).body.error).toBe("PERMISSION_DENIED");
  });
});

describe("Giving tables to a role", () => {
  test("the role editor is told the tables; a role keeps the ones it is given", async () => {
    const out = (await request(app).get(`${admin}/staff/permissions`).expect(200)).body as { groups: unknown[]; tables: Array<{ id: string; slug: string }> };
    expect(out.groups.length).toBeGreaterThan(5);
    expect(out.tables.filter((t) => t.slug.startsWith(PREFIX)).map((t) => t.slug)).toEqual([A, B, C]);
    const role = (await request(app).post(`${admin}/staff/roles`).send({ name: `${PREFIX}support`, permissions: ["orders:read", tablePermission(a, "write"), tablePermission(b, "read")] }).expect(201)).body;
    expect(role.permissions).toEqual(["orders:read", ...[tablePermission(a, "write"), tablePermission(b, "read")].sort()]);
    const changed = (await request(app).patch(`${admin}/staff/roles/${role.id}`).send({ permissions: ["orders:read", tablePermission(b, "read")] }).expect(200)).body;
    expect(changed.permissions).toEqual(["orders:read", tablePermission(b, "read")]);
    expect((await request(app).post(`${admin}/staff/roles`).send({ name: `${PREFIX}bad`, permissions: ["data:nope:read"] }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    // The member's own profile lists them (the admin's menu and grid read it).
    const user = await prisma.adminUser.create({ data: { email: "support@roles-spec.test", name: "support", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    const me = (await request(app).get(`${admin}/account/me`).set("Authorization", as(user.id)).expect(200)).body;
    expect((me.admin ?? me).permissions).toContain(tablePermission(b, "read"));
  });

  test("a member gives only what they have: a table of theirs, or any table when they have them all", async () => {
    const lead = await member("lead", ["staff:read", "staff:write", "dashboard:read", tablePermission(a, "write")]);
    const give = (permissions: string[], name: string) => send("post", "/staff/roles", lead.auth, { name: `${PREFIX}${name}`, permissions });
    await give(["dashboard:read", tablePermission(a, "read")], "a-read").expect(201);
    await give([tablePermission(a, "write")], "a-write").expect(201);
    expect((await give([tablePermission(b, "read")], "b-read").expect(403)).body).toMatchObject({ error: "CANNOT_GRANT", details: { missing: [tablePermission(b, "read")] } });
    expect((await give(["pages:read"], "all").expect(403)).body.error).toBe("CANNOT_GRANT");
    const chief = await member("chief", ["staff:read", "staff:write", "pages:read", "pages:write"]);
    await send("post", "/staff/roles", chief.auth, { name: `${PREFIX}any`, permissions: [tablePermission(c, "write")] }).expect(201);
    // Taking a table away from a role needs it too (a member can't strip what they can't see into).
    const role = await prisma.staffRole.findFirstOrThrow({ where: { name: `${PREFIX}any` } });
    expect((await send("patch", `/staff/roles/${role.id}`, lead.auth, { permissions: [] }).expect(403)).body.error).toBe("CANNOT_GRANT");
    await send("patch", `/staff/roles/${role.id}`, chief.auth, { permissions: [] }).expect(200);
  });
});
