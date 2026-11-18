import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetHits } from "../lib/hitLimit.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { forgetShoppers } from "../modules/data/data.routes.js";
import { allow, isOpen, NO_ROLES, type ActRoles } from "../lib/dataApi.js";

// App users (stage 2, item 3): roles and groups for shoppers. The owner makes roles (three ready ones, or their own)
// and groups, and gives them to shoppers; a table may let a role's holders do an act on every row (a moderator reads
// the drafts and publishes them; never a key's private fields), and let a shopper read what their group's members
// added; a function's door may be for a role only, and a run knows the caller's roles. Requests to /v1/admin
// without a token run as the test owner.

const PREFIX = "roles-spec-";
const POSTS = `${PREFIX}posts`;
const admin = "/v1/admin";
const at = `${admin}/shopper-roles`;
type Row = { id: string; slug: string; status: string; values: Record<string, any> };
const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const open = (id: string, settings: Record<string, unknown>) => request(app).put(`${admin}/api/tables/${id}`).send({ read: "off", create: "off", update: "off", delete: "off", ...settings });
const as = (who: string | null) => {
  const head = (req: request.Test) => (!who ? req : who.startsWith("ek_") ? req.set("X-Api-Key", who) : req.set("Authorization", `Bearer ${who}`));
  return {
    get: (path: string) => head(request(app).get(`/v1/data${path}`)),
    post: (path: string, body: object) => head(request(app).post(`/v1/data${path}`)).send(body),
    patch: (path: string, body: object) => head(request(app).patch(`/v1/data${path}`)).send(body),
    del: (path: string) => head(request(app).delete(`/v1/data${path}`)),
  };
};
/** A note's words (a text field is answered in every language unless one is asked for). */
const noteOf = (r: Row) => (r.values.note && typeof r.values.note === "object" ? r.values.note.ar : r.values.note);
const notes = (rows: Row[]) => rows.map(noteOf).sort();

let posts = "";
const ids: Record<string, string> = {};
const tokens: Record<string, string> = {};
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
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.apiKey.deleteMany({ where: { name: "Roles spec" } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@roles-spec.test" } } });
  await prisma.shopperRole.deleteMany({});
  await prisma.shopperGroup.deleteMany({});
  forgetKeys();
  forgetHits();
  forgetShoppers();
  forgetTriggers();
}
/** One shopper's roles and groups, as the admin gives them. */
const give = (who: string, body: { roles?: string[]; groups?: string[] }) => request(app).put(`${at}/shoppers/${ids[who]}`).send(body);

beforeAll(async () => {
  await clean();
  await setAccounts(true);
  for (const name of ["mona", "sami", "rana", "yara"]) {
    const u = await prisma.user.create({ data: { email: `${name}@roles-spec.test`, name: name[0].toUpperCase() + name.slice(1) } });
    ids[name] = u.id;
    tokens[name] = signCustomerToken(u.id);
  }
  posts = await mk(POSTS, [{ id: "note", type: "text", required: true }, { id: "secret", type: "text" }]);
  key = (await request(app).post(`${admin}/api/keys`).send({ name: "Roles spec", scopes: { tables: "*", acts: ["read", "create", "update", "delete"] } }).expect(201)).body.secret as string;
});
afterAll(async () => {
  await clean();
  await setAccounts(false);
});
beforeEach(() => {
  forgetHits();
  forgetShoppers();
});

describe("The rule, alone", () => {
  test("a role's holder does an act on every row, even one that is off to shoppers; keys don't get what is off", () => {
    const roles: ActRoles = { ...NO_ROLES, update: ["moderator"] };
    const access = { read: "customer", create: "customer", update: "off", delete: "off" } as const;
    const key = { id: "k", name: "k", prefix: "", scopes: { tables: "*" as const, acts: ["read", "create", "update", "delete"] as never }, perMinute: 60, revokedAt: null, expiresAt: null };
    expect(allow(access, "update", null, "t", "u1", { mine: ["moderator"], table: roles })).toEqual({ as: "role" });
    expect(allow(access, "update", null, "t", "u2", { mine: ["member"], table: roles })).toEqual({ no: "closed" });
    expect(allow(access, "update", null, "t", null, { mine: [], table: roles })).toEqual({ no: "signInNeeded" });
    expect(allow(access, "update", key, "t", null, { mine: [], table: roles })).toEqual({ no: "closed" });
    expect(allow(access, "delete", null, "t", "u1", { mine: ["moderator"], table: roles })).toEqual({ no: "closed" });
    // Reading: a moderator would get "role" only where the act names it; here the shopper's own rows.
    expect(allow(access, "read", null, "t", "u1", { mine: ["moderator"], table: roles })).toEqual({ as: "customer" });
    expect(isOpen({ read: "off", create: "off", update: "off", delete: "off" }, roles)).toBe(true);
    expect(isOpen({ read: "off", create: "off", update: "off", delete: "off" })).toBe(false);
  });
});

describe("Roles and groups", () => {
  test("three ready roles and the owner's own; a key is fixed, a name changes; deleting one takes it from everyone", async () => {
    let page = (await request(app).get(at).expect(200)).body;
    expect(page.presets.map((p: { key: string }) => p.key)).toEqual(["member", "moderator", "seller"]);
    for (const preset of ["member", "moderator", "seller"]) page = (await request(app).post(`${at}/roles`).send({ preset }).expect(201)).body;
    expect(page.presets).toEqual([]);
    expect(page.roles.map((r: { key: string; name: Record<string, string> }) => [r.key, r.name.ar])).toEqual([
      ["member", "عضو"],
      ["moderator", "مشرف"],
      ["seller", "بائع"],
    ]);
    expect((await request(app).post(`${at}/roles`).send({ key: "seller", name: { en: "Again" } }).expect(409)).body.error).toBe("ROLE_TAKEN");
    expect((await request(app).post(`${at}/roles`).send({ key: "Bad Key", name: { en: "x" } }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    expect((await request(app).post(`${at}/roles`).send({ key: "nameless", name: {} }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    await request(app).post(`${at}/roles`).send({ key: "vip", name: { en: "VIP", ar: "مميّز" }, note: "Big buyers" }).expect(201);
    page = (await request(app).patch(`${at}/roles/vip`).send({ name: { en: "VIP buyer" } }).expect(200)).body;
    expect(page.roles.find((r: { key: string }) => r.key === "vip")).toMatchObject({ name: { en: "VIP buyer" }, note: "Big buyers", shoppers: 0 });

    // Given to shoppers: only roles there are.
    expect((await give("mona", { roles: ["moderator", "nope"] }).expect(400)).body.details.issues).toEqual([{ path: "roles", message: 'No role "nope"' }]);
    expect((await give("mona", { roles: ["moderator", "vip", "vip"] }).expect(200)).body.roles).toEqual(["moderator", "vip"]);
    await give("sami", { roles: ["seller", "vip"] }).expect(200);
    page = (await request(app).get(at).expect(200)).body;
    expect(page.roles.find((r: { key: string }) => r.key === "vip").shoppers).toBe(2);
    page = (await request(app).delete(`${at}/roles/vip`).expect(200)).body;
    expect(page.roles.map((r: { key: string }) => r.key)).toEqual(["member", "moderator", "seller"]);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.mona } })).roles).toEqual(["moderator"]);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.sami } })).roles).toEqual(["seller"]);
    // The admin's list of customers says them.
    const list = (await request(app).get(`${admin}/customers`).query({ q: "mona@roles-spec.test" }).expect(200)).body.rows;
    expect(list[0]).toMatchObject({ roles: ["moderator"], groups: [] });
  });

  test("groups: made, joined by email (the unknown said), left; deleting one empties it", async () => {
    const made = (await request(app).post(`${at}/groups`).send({ name: "Team Rose", note: "The shop's team" }).expect(201)).body;
    const team = made.made as string;
    expect((await request(app).post(`${at}/groups`).send({ name: "Team Rose" }).expect(409)).body.error).toBe("GROUP_TAKEN");
    const joined = (await request(app).post(`${at}/groups/${team}/members`).send({ emails: ["RANA@roles-spec.test", "yara@roles-spec.test", "nobody@roles-spec.test"] }).expect(200)).body;
    expect(joined).toEqual({ added: ["rana@roles-spec.test", "yara@roles-spec.test"], already: [], unknown: ["nobody@roles-spec.test"], full: [] });
    expect((await request(app).post(`${at}/groups/${team}/members`).send({ emails: ["rana@roles-spec.test"] }).expect(200)).body.already).toEqual(["rana@roles-spec.test"]);
    const members = (await request(app).get(`${at}/groups/${team}/members`).expect(200)).body.members;
    expect(members.map((m: { email: string }) => m.email)).toEqual(["rana@roles-spec.test", "yara@roles-spec.test"]);
    expect((await request(app).get(at).expect(200)).body.groups).toEqual([expect.objectContaining({ id: team, name: "Team Rose", members: 2 })]);
    const other = (await request(app).post(`${at}/groups`).send({ name: "Gone soon" }).expect(201)).body.made as string;
    await give("mona", { groups: [other] }).expect(200);
    await request(app).delete(`${at}/groups/${other}`).expect(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.mona } })).groups).toEqual([]);
  });
});

describe("A table's roles", () => {
  beforeAll(async () => {
    // Shoppers add notes (their own), read their own; moderators read every one and publish them.
    await open(posts, { read: "customer", create: "customer", update: "customer", delete: "customer", private: ["secret"], roles: { read: ["moderator"], update: ["moderator"] } }).expect(200);
    for (const [who, note] of [["rana", "rana's"], ["yara", "yara's"], ["sami", "sami's"]] as const) await as(tokens[who]).post(`/${POSTS}`, { values: { note } }).expect(201);
    await as(key).post(`/${POSTS}`, { values: { note: "the shop's", secret: "for keys" } }).expect(201);
  });

  test("saved with the table's access; a role that isn't there is refused; kept when a save says nothing of it", async () => {
    expect((await open(posts, { read: "customer", roles: { read: ["ghost"] } }).expect(400)).body).toMatchObject({ error: "NO_SUCH_ROLE", details: { roles: ["ghost"] } });
    const list = (await request(app).get(`${admin}/api`).expect(200)).body.tables;
    expect(list.find((t: { id: string }) => t.id === posts)).toMatchObject({ roles: { read: ["moderator"], create: [], update: ["moderator"], delete: [] }, group: false, open: true });
  });

  test("a moderator reads every row, drafts too, and publishes one; never a key's private field; a plain shopper still their own", async () => {
    const mod = as(tokens.mona);
    const all = (await mod.get(`/${POSTS}`).expect(200)).body.data as Row[];
    expect(notes(all)).toEqual(["rana's", "sami's", "the shop's", "yara's"]);
    expect(all.every((r) => !("secret" in r.values))).toBe(true);
    expect(all.find((r) => noteOf(r) === "rana's")!.status).toBe("DRAFT");
    const ranas = all.find((r) => noteOf(r) === "rana's")!;
    const published = (await mod.patch(`/${POSTS}/${ranas.id}`, { status: "published" }).expect(200)).body as Row;
    expect(published.status).toBe("PUBLISHED");
    // Never a private field, nor deleting (not a role's act here).
    expect((await mod.patch(`/${POSTS}/${ranas.id}`, { values: { secret: "x" } }).expect(400)).body.details.issues).toEqual([{ field: "secret", message: "No such column" }]);
    expect((await mod.del(`/${POSTS}/${ranas.id}`).expect(404)).body.error).toBe("NOT_FOUND");
    // Asking for her own still works as a shopper's question.
    expect((await mod.get(`/${POSTS}?mine=1`).expect(200)).body.data).toEqual([]);
    // A plain shopper: their own rows, and only their own to change; status stays a key's or a role's.
    const rana = as(tokens.rana);
    expect(notes((await rana.get(`/${POSTS}`).expect(200)).body.data)).toEqual(["rana's"]);
    const yaras = all.find((r) => noteOf(r) === "yara's")!;
    expect((await rana.patch(`/${POSTS}/${yaras.id}`, { values: { note: "mine now" } }).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await rana.patch(`/${POSTS}/${ranas.id}`, { status: "draft" }).expect(400)).body.details.issues).toEqual([{ field: "status", message: "Only a key sets the status" }]);
  });

  test("an act off to shoppers but open to a role: the role's holder only; anyone else is told why", async () => {
    await open(posts, { read: "customer", create: "customer", update: "off", delete: "off", private: ["secret"], roles: { update: ["moderator"] } }).expect(200);
    const sams = ((await as(key).get(`/${POSTS}`).expect(200)).body.data as Row[]).find((r) => noteOf(r) === "sami's")!;
    expect(noteOf((await as(tokens.mona).patch(`/${POSTS}/${sams.id}`, { values: { note: "sami's (edited)" } }).expect(200)).body)).toBe("sami's (edited)");
    expect((await as(tokens.sami).patch(`/${POSTS}/${sams.id}`, { values: { note: "x" } }).expect(403)).body.error).toBe("NOT_ALLOWED");
    expect((await as(null).patch(`/${POSTS}/${sams.id}`, { values: { note: "x" } }).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    expect((await as(key).patch(`/${POSTS}/${sams.id}`, { values: { note: "x" } }).expect(403)).body.error).toBe("NOT_ALLOWED");
    // The role taken away: refused at once.
    await give("mona", { roles: [] }).expect(200);
    expect((await as(tokens.mona).patch(`/${POSTS}/${sams.id}`, { values: { note: "y" } }).expect(403)).body.error).toBe("NOT_ALLOWED");
    await give("mona", { roles: ["moderator"] }).expect(200);
    // The documents say who does what.
    const docs = (await as(tokens.mona).get("").expect(200)).body.tables.find((t: { table: string }) => t.table === POSTS);
    expect(docs.acts).toEqual({ read: true, create: true, update: true, delete: false });
    const openapi = (await as(tokens.mona).get("/openapi.json").expect(200)).body;
    expect(JSON.stringify(openapi)).toContain("holding one of the roles");
  });
});

describe("A table's group", () => {
  test("a shopper reads what their group's members added where the table says so; changing stays their own; leaving ends it", async () => {
    const team = (await request(app).get(at).expect(200)).body.groups[0].id as string;
    await open(posts, { read: "customer", create: "customer", update: "customer", delete: "off", private: ["secret"] }).expect(200);
    // Not yet: their own only.
    expect(notes((await as(tokens.rana).get(`/${POSTS}`).expect(200)).body.data)).toEqual(["rana's"]);
    await open(posts, { read: "customer", create: "customer", update: "customer", delete: "off", private: ["secret"], group: true }).expect(200);
    const seen = (await as(tokens.rana).get(`/${POSTS}`).expect(200)).body.data as Row[];
    expect(notes(seen)).toEqual(["rana's", "yara's"]);
    // One row by its id, too; and the shop's halves: "added" is the group's, "tome" isn't.
    const yaras = seen.find((r) => noteOf(r) === "yara's")!;
    expect(noteOf((await as(tokens.rana).get(`/${POSTS}/${yaras.id}`).expect(200)).body)).toBe("yara's");
    expect((await as(tokens.rana).get(`/${POSTS}?mine=tome`).expect(200)).body.data).toEqual([]);
    // Changing stays with the one who added it.
    expect((await as(tokens.rana).patch(`/${POSTS}/${yaras.id}`, { values: { note: "x" } }).expect(404)).body.error).toBe("NOT_FOUND");
    // Sami isn't in the group: his own only.
    expect(notes((await as(tokens.sami).get(`/${POSTS}`).expect(200)).body.data)).toEqual(["sami's (edited)"]);
    // Yara leaves: Rana sees her own only again.
    await request(app).delete(`${at}/groups/${team}/members/${ids.yara}`).expect(200);
    expect(notes((await as(tokens.rana).get(`/${POSTS}`).expect(200)).body.data)).toEqual(["rana's"]);
    expect((await request(app).get(`${admin}/api`).expect(200)).body.tables.find((t: { id: string }) => t.id === posts).group).toBe(true);
  });
});

describe("A function's door for a role", () => {
  test("a seller calls it, anyone else is refused; the run knows the caller's roles and groups", async () => {
    const made = (await request(app).post(`${admin}/functions`).send({ name: `${PREFIX}sellers` }).expect(201)).body;
    const saved = (await request(app).put(`${admin}/functions/${made.id}`).send({ draft: { inputs: [], do: [{ act: "return", value: { roles: "{{caller.roles}}", groups: "{{caller.groups}}" } }] } }).expect(200)).body;
    expect(saved.problems).toEqual([]);
    await request(app).post(`${admin}/functions/${made.id}/publish`).expect(200);
    await request(app).post(`${admin}/functions/${made.id}/triggers`).send({ kind: "call", config: { who: "customer", roles: ["seller"] }, slug: `${PREFIX}sellers` }).expect(201);
    const call = (who: string | null) => {
      const req = request(app).post(`/v1/fn/${PREFIX}sellers`);
      return (who ? req.set("Authorization", `Bearer ${who}`) : req).send({ input: {} });
    };
    expect((await call(tokens.sami).expect(200)).body).toEqual({ ok: true, value: { roles: ["seller"], groups: [] } });
    expect((await call(tokens.rana).expect(403)).body.error).toBe("ROLE_NEEDED");
    expect((await call(null).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
  });
});
