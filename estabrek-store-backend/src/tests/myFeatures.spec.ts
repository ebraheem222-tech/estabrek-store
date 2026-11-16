import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import type { FnDef } from "../lib/fnDef.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { forgetHits } from "../lib/hitLimit.js";
import { resetRunsForTests } from "../lib/runs.js";
import { resetTasksForTests, runTasks } from "../lib/tasks.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// ميزاتي (M), with the database: a feature the owner built is a name over tables, functions and
// pages made elsewhere in the studio. A thing belongs to one feature at most; deleting a feature
// only ungroups. Switched off, the feature's functions aren't started and its tables' API answers
// as closed. Requests to /v1/admin without a token run as the test owner.

const PREFIX = "mf-spec-";
const admin = "/v1/admin";
const at = `${admin}/my-features`;
type Full = { id: string; name: string; note: string | null; enabled: boolean; tables: any[]; functions: any[]; pages: any[]; free: { tables: any[]; functions: any[]; pages: any[] } };

const mkTable = async (slug: string) => (await request(app).post(`${admin}/collections`).send({ slug: `${PREFIX}${slug}`, name: { en: slug }, fields: [{ id: "title", type: "text", required: true }] }).expect(201)).body.id as string;
async function mkFn(name: string, def: Partial<FnDef>, publish = true) {
  const made = (await request(app).post(`${admin}/functions`).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  await request(app).put(`${admin}/functions/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200);
  if (publish) await request(app).post(`${admin}/functions/${made.id}/publish`).expect(200);
  return made.id as string;
}
const mkPage = async (name: string) => (await prisma.page.create({ data: { name: `${PREFIX}${name}`, slug: `/${PREFIX}${name}`, kind: "page" } })).id;
const feature = async (name: string, note?: string) => (await request(app).post(at).send({ name: `${PREFIX}${name}`, ...(note ? { note } : {}) }).expect(201)).body as Full;
const add = (id: string, kind: string, refId: string) => request(app).post(`${at}/${id}/items`).send({ kind, refId });
const one = async (id: string) => (await request(app).get(`${at}/${id}`).expect(200)).body as Full;
const ids = (list: Array<{ id: string }>) => list.map((x) => x.id);
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}

async function clean() {
  await resetRunsForTests();
  await prisma.task.deleteMany({ where: { kind: "function" } });
  await prisma.feature.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.run.deleteMany({ where: { OR: [{ kind: "function", name: { startsWith: PREFIX } }, { kind: "task", name: "function" }] } });
  await prisma.page.deleteMany({ where: { name: { startsWith: PREFIX } } });
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@mf-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  forgetFeatureGate();
  forgetTriggers();
  forgetHits();
  invalidateAccess();
}
beforeAll(async () => {
  await clean();
  startFunctions();
});
beforeEach(clean);
afterAll(async () => {
  await clean();
  await resetTasksForTests();
});

describe("A feature", () => {
  test("is a name with a note; the list says how many things each holds", async () => {
    const made = await feature("friends", "Friend requests");
    expect(made).toMatchObject({ name: `${PREFIX}friends`, note: "Friend requests", enabled: true, tables: [], functions: [], pages: [] });
    const table = await mkTable("requests");
    await add(made.id, "table", table).expect(201);
    const list = (await request(app).get(at).expect(200)).body;
    expect(list.features.find((f: { id: string }) => f.id === made.id)).toMatchObject({ name: `${PREFIX}friends`, enabled: true, counts: { table: 1, function: 0, page: 0 } });
    const renamed = (await request(app).put(`${at}/${made.id}`).send({ name: `${PREFIX}friendship`, note: "" }).expect(200)).body;
    expect(renamed).toMatchObject({ name: `${PREFIX}friendship`, note: null });
    expect((await request(app).post(at).send({ name: " " }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    expect((await request(app).put(`${at}/${made.id}`).send({ colour: "red" }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    expect((await request(app).get(`${at}/nope`).expect(404)).body.error).toBe("FEATURE_NOT_FOUND");
  });

  test("holds tables, functions and pages as they are now; a thing is one feature's at most", async () => {
    const [requests, friends, send, accept, page, spare] = [await mkTable("requests"), await mkTable("friends"), await mkFn("send", { do: [{ act: "return", value: 1 }] }), await mkFn("accept", { do: [{ act: "return", value: 2 }] }, false), await mkPage("my-friends"), await mkPage("spare")];
    await request(app).post(`${admin}/collections/${requests}/rows`).send({ lang: "en", values: { title: "One" } }).expect(201);
    await request(app).put(`${admin}/api/tables/${requests}`).send({ read: "customer", create: "off", update: "off", delete: "off" }).expect(200);
    await request(app).post(`${admin}/functions/${send}/triggers`).send({ kind: "call", config: { who: "customer" }, slug: `${PREFIX}send` }).expect(201);
    const f = await feature("friends");
    // Before anything joins: everything of ours is free to be added.
    expect(ids(f.free.tables)).toEqual(expect.arrayContaining([requests, friends]));
    expect(ids(f.free.functions)).toEqual(expect.arrayContaining([send, accept]));
    expect(ids(f.free.pages)).toEqual(expect.arrayContaining([page, spare]));
    for (const [kind, ref] of [["table", requests], ["table", friends], ["function", send], ["function", accept], ["page", page]]) await add(f.id, kind, ref).expect(201);
    const full = await one(f.id);
    // In the order they joined, each as it is now.
    expect(full.tables).toEqual([
      { id: requests, slug: `${PREFIX}requests`, name: { en: "requests" }, fields: 1, rows: 1, api: { read: "customer", create: "off", update: "off", delete: "off" } },
      { id: friends, slug: `${PREFIX}friends`, name: { en: "friends" }, fields: 1, rows: 0, api: { read: "off", create: "off", update: "off", delete: "off" } },
    ]);
    expect(full.functions.map((x) => [x.id, x.published, x.changed, x.triggers])).toEqual([[send, true, false, 1], [accept, false, true, 0]]);
    expect(full.pages).toEqual([{ id: page, name: `${PREFIX}my-friends`, slug: `/${PREFIX}my-friends`, status: "DRAFT", hasDraft: false }]);
    // What is in a feature isn't offered again.
    expect(ids(full.free.tables)).not.toEqual(expect.arrayContaining([requests]));
    expect(ids(full.free.functions)).not.toEqual(expect.arrayContaining([send]));
    expect(ids(full.free.pages)).toEqual(expect.arrayContaining([spare]));
    expect(ids(full.free.pages)).not.toEqual(expect.arrayContaining([page]));
    // Asked twice, it is there once; another feature can't take it.
    await add(f.id, "table", requests).expect(201);
    expect((await one(f.id)).tables).toHaveLength(2);
    const other = await feature("other");
    expect((await add(other.id, "table", requests).expect(409)).body).toMatchObject({ error: "ITEM_TAKEN", details: { feature: `${PREFIX}friends` } });
    // Not a thing; not a kind.
    expect((await add(f.id, "table", "nope").expect(404)).body.error).toBe("ITEM_NOT_FOUND");
    expect((await add(f.id, "function", requests).expect(404)).body.error).toBe("ITEM_NOT_FOUND");
    expect((await add(f.id, "order", requests).expect(400)).body.error).toBe("VALIDATION_ERROR");
    // It leaves: free again, and the other feature can have it.
    const left = (await request(app).delete(`${at}/${f.id}/items/table/${requests}`).expect(200)).body as Full;
    expect(ids(left.tables)).toEqual([friends]);
    expect(ids(left.free.tables)).toEqual(expect.arrayContaining([requests]));
    expect((await request(app).delete(`${at}/${f.id}/items/table/${requests}`).expect(404)).body.error).toBe("ITEM_NOT_FOUND");
    await add(other.id, "table", requests).expect(201);
  });

  test("a thing deleted where it was made is no longer the feature's; a feature deleted leaves its things where they are", async () => {
    const [table, fn] = [await mkTable("gone"), await mkFn("stays", { do: [{ act: "return", value: 1 }] })];
    const f = await feature("temp");
    await add(f.id, "table", table).expect(201);
    await add(f.id, "function", fn).expect(201);
    await request(app).delete(`${admin}/collections/${table}`).expect(200);
    const full = await one(f.id);
    expect(full.tables).toEqual([]);
    expect(await prisma.featureItem.count({ where: { featureId: f.id } })).toBe(1);
    // The function says whose it is.
    expect((await request(app).get(`${admin}/functions/${fn}`).expect(200)).body.feature).toEqual({ id: f.id, name: `${PREFIX}temp`, enabled: true });
    await request(app).delete(`${at}/${f.id}`).expect(200);
    expect((await request(app).get(`${admin}/functions/${fn}`).expect(200)).body).toMatchObject({ id: fn, feature: null });
    expect((await request(app).get(`${at}/${f.id}`).expect(404)).body.error).toBe("FEATURE_NOT_FOUND");
  });
});

describe("Switched off", () => {
  test("its tables' API answers as closed, its functions aren't started; switched back on, everything works as before", async () => {
    const table = await mkTable("log");
    await request(app).put(`${admin}/api/tables/${table}`).send({ read: "public", create: "public", update: "off", delete: "off" }).expect(200);
    const called = await mkFn("called", { do: [{ act: "return", value: "hello" }] });
    await request(app).post(`${admin}/functions/${called}/triggers`).send({ kind: "call", config: { who: "public" }, slug: `${PREFIX}hello` }).expect(201);
    const onRow = await mkFn("on-row", { inputs: [{ name: "row", type: "any" }], do: [{ act: "notify", title: `${PREFIX}saw {{input.row.title}}` }] });
    await request(app).post(`${admin}/functions/${onRow}/triggers`).send({ kind: "row", config: { table, on: ["added"] } }).expect(201);
    const f = await feature("switch");
    for (const [kind, ref] of [["table", table], ["function", called], ["function", onRow]]) await add(f.id, kind, ref).expect(201);
    const api = `/v1/data/${PREFIX}log`;
    const saw = () => prisma.adminNotification.count({ where: { title: { startsWith: `${PREFIX}saw` } } });
    const listed = async () => (await request(app).get("/v1/data").expect(200)).body.tables.some((t: { table: string }) => t.table === `${PREFIX}log`);

    // On: the table is read and written, the address answers, a row starts its function.
    await request(app).get(api).expect(200);
    expect(await listed()).toBe(true);
    expect((await request(app).post(`/v1/fn/${PREFIX}hello`).send({}).expect(200)).body).toEqual({ ok: true, value: "hello" });
    await request(app).post(api).send({ values: { title: "one" } }).expect(201);
    await settled();
    expect(await saw()).toBe(1);

    // Off: at once.
    expect((await request(app).put(`${at}/${f.id}`).send({ enabled: false }).expect(200)).body.enabled).toBe(false);
    expect((await request(app).get(api).expect(404)).body.error).toBe("NOT_FOUND");
    await request(app).post(api).send({ values: { title: "two" } }).expect(404);
    expect(await listed()).toBe(false);
    expect((await request(app).post(`/v1/fn/${PREFIX}hello`).send({}).expect(404)).body.error).toBe("NOT_FOUND");
    // The admin still works on it: a row added from the grid is saved, and starts nothing.
    await request(app).post(`${admin}/collections/${table}/rows`).send({ lang: "en", values: { title: "three" } }).expect(201);
    await settled();
    expect(await saw()).toBe(1);
    // The admin's own run still runs; the function says its feature is off.
    expect((await request(app).post(`${admin}/functions/${called}/run`).send({ dry: false, which: "live" }).expect(200)).body.value).toBe("hello");
    expect((await request(app).get(`${admin}/functions/${called}`).expect(200)).body.feature).toMatchObject({ id: f.id, enabled: false });

    // On again.
    await request(app).put(`${at}/${f.id}`).send({ enabled: true }).expect(200);
    await request(app).get(api).expect(200);
    expect((await request(app).post(`/v1/fn/${PREFIX}hello`).send({}).expect(200)).body.value).toBe("hello");
    await request(app).post(`${admin}/collections/${table}/rows`).send({ lang: "en", values: { title: "four" } }).expect(201);
    await settled();
    expect(await saw()).toBe(2);
    await prisma.adminNotification.deleteMany({ where: { title: { startsWith: `${PREFIX}saw` } } });

    // Off, and then the feature itself deleted: its things are nobody's, and on.
    await request(app).put(`${at}/${f.id}`).send({ enabled: false }).expect(200);
    await request(app).get(api).expect(404);
    await request(app).delete(`${at}/${f.id}`).expect(200);
    await request(app).get(api).expect(200);
    expect((await request(app).post(`/v1/fn/${PREFIX}hello`).send({}).expect(200)).body.ok).toBe(true);
    // A thing that leaves a feature that is off is on again too.
    const g = await feature("again");
    await add(g.id, "table", table).expect(201);
    await request(app).put(`${at}/${g.id}`).send({ enabled: false }).expect(200);
    await request(app).get(api).expect(404);
    await request(app).delete(`${at}/${g.id}/items/table/${table}`).expect(200);
    await request(app).get(api).expect(200);
  });
});

describe("Who may", () => {
  test("looking needs features:read; changing needs features:write", async () => {
    const f = await feature("guarded");
    const table = await mkTable("guarded");
    const member = async (name: string, permissions: string[]) => {
      const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
      const m = await prisma.adminUser.create({ data: { email: `${name}@mf-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
      return `Bearer ${signAccessToken({ sub: m.id, role: "STAFF", email: m.email })}`;
    };
    const editor = await member("editor", ["pages:read", "functions:read"]);
    const reader = await member("reader", ["features:read"]);
    expect((await request(app).get(at).set("Authorization", editor).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["features:read"] });
    await request(app).get(at).set("Authorization", reader).expect(200);
    await request(app).get(`${at}/${f.id}`).set("Authorization", reader).expect(200);
    for (const call of [request(app).post(at).send({ name: "x" }), request(app).put(`${at}/${f.id}`).send({ enabled: false }), request(app).post(`${at}/${f.id}/items`).send({ kind: "table", refId: table }), request(app).delete(`${at}/${f.id}/items/table/${table}`), request(app).delete(`${at}/${f.id}`)])
      expect((await call.set("Authorization", reader).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["features:write"] });
    const all = (await request(app).get(`${admin}/staff/permissions`).expect(200)).body;
    expect(all.groups.find((g: { key: string }) => g.key === "features").permissions.map((p: { key: string }) => p.key)).toEqual(["features:read", "features:write"]);
  });
});
