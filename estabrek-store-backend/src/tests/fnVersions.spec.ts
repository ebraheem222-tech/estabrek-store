import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import type { FnDef } from "../lib/fnDef.js";
import { forgetReady } from "../lib/fnReady.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { VERSION_LIMITS, versionDef } from "../lib/fnVersions.js";
import { flushRuns, resetRunsForTests } from "../lib/runs.js";
import { resetTasksForTests, runTasks } from "../lib/tasks.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// A function's versions, with the database: every publish is kept as a numbered version that never
// changes; an older one is published again or taken into the draft; a run asked for through the
// queue is of the version that was published when it was asked for. Requests to /v1/admin without
// a token run as the test owner.

const PREFIX = "fnver-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
const says = (word: string): Partial<FnDef> => ({ do: [{ act: "notify", title: `${PREFIX}${word}` }, { act: "return", value: word }] });
const draft = (id: string, def: Partial<FnDef>) => request(app).put(`${at}/${id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } });
const publish = (id: string) => request(app).post(`${at}/${id}/publish`);
const one = async (id: string) => (await request(app).get(`${at}/${id}`).expect(200)).body;
const run = async (id: string) => (await request(app).post(`${at}/${id}/run`).send({ input: {}, dry: false, which: "live" }).expect(200)).body;
const restore = (id: string, n: number, to: "live" | "draft") => request(app).post(`${at}/${id}/versions/${n}/restore`).send({ to });
/** A function published once, saying "one"; its id. */
async function made(name: string, def: Partial<FnDef> = says("one")) {
  const id = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body.id as string;
  await draft(id, def).expect(200);
  await publish(id).expect(200);
  return id;
}
const rang = async () => (await prisma.adminNotification.findMany({ where: { title: { startsWith: PREFIX } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })).map((n) => n.title.slice(PREFIX.length));
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = (await prisma.task.count({ where: { kind: "function", status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}
const logged = async () => {
  await flushRuns();
  await flushRuns();
  return prisma.run.findMany({ where: { kind: "function", name: { startsWith: PREFIX } }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] });
};

async function clean() {
  await resetRunsForTests();
  await prisma.task.deleteMany({ where: { kind: "function" } });
  await prisma.run.deleteMany({ where: { OR: [{ kind: "function", name: { startsWith: PREFIX } }, { kind: "task", name: "function" }] } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnConnection.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@fnver-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  invalidateAccess();
  forgetTriggers();
  forgetReady();
}
beforeAll(async () => {
  await resetTasksForTests();
  startFunctions();
});
beforeEach(clean);
afterAll(clean);

describe("Every publish is a version", () => {
  test("numbered in order, kept as it was published, and the function says which one runs", async () => {
    const id = (await request(app).post(at).send({ name: `${PREFIX}numbers` }).expect(201)).body.id as string;
    // Not published yet: no version.
    expect(await one(id)).toMatchObject({ published: false, version: null, versions: [], versionsKept: VERSION_LIMITS.kept });
    await draft(id, says("one")).expect(200);
    const first = (await publish(id).expect(200)).body;
    expect(first).toMatchObject({ published: true, version: 1, changed: false });
    expect(first.versions).toEqual([{ n: 1, at: expect.any(String), by: expect.any(String), back: null, steps: 2, inputs: 0 }]);
    // The draft changed: nothing new is published, and version 1 is what runs.
    await draft(id, { inputs: [{ name: "who", type: "text" }], do: [{ act: "notify", title: `${PREFIX}two` }, { act: "return", value: "two" }, { act: "stop", message: "never" }] }).expect(200);
    expect(await one(id)).toMatchObject({ version: 1, changed: true });
    expect(await run(id)).toMatchObject({ ok: true, value: "one", version: 1 });
    const second = (await publish(id).expect(200)).body;
    expect(second.version).toBe(2);
    expect(second.versions.map((v: { n: number; steps: number; inputs: number }) => [v.n, v.steps, v.inputs])).toEqual([[2, 3, 1], [1, 2, 0]]);
    expect(await run(id)).toMatchObject({ ok: true, value: "two", version: 2 });
    // The list of functions says it too.
    expect((await request(app).get(at).expect(200)).body.functions.find((f: { id: string }) => f.id === id)).toMatchObject({ published: true, version: 2 });
    // A version's steps are read as they were published; one that isn't there isn't.
    expect((await request(app).get(`${at}/${id}/versions/1`).expect(200)).body).toEqual({ n: 1, def: { lang: "en", inputs: [], do: [{ act: "notify", title: `${PREFIX}one` }, { act: "return", value: "one" }] } });
    for (const bad of ["3", "0", "-1", "one", "1.5"]) expect((await request(app).get(`${at}/${id}/versions/${bad}`).expect(404)).body.error).toBe("VERSION_NOT_FOUND");
    // A run in the log says which version it was.
    expect((await logged()).map((r) => [r.ok, r.detail])).toEqual([[true, { v: 1 }], [true, { v: 2 }]]);
    // The function gone, its versions go with it.
    await request(app).delete(`${at}/${id}`).expect(200);
    expect(await prisma.fnVersion.count({ where: { fnId: id } })).toBe(0);
  });

  test("so many are kept and no more: the oldest go", async () => {
    const id = await made("many");
    // Fifty publishes later (written straight in: publishing fifty times says nothing new).
    await prisma.fnVersion.createMany({ data: Array.from({ length: VERSION_LIMITS.kept - 1 }, (_, k) => ({ fnId: id, n: k + 2, def: { inputs: [], do: [{ act: "return", value: k + 2 }] } })) });
    await prisma.fn.update({ where: { id }, data: { version: VERSION_LIMITS.kept } });
    expect((await one(id)).versions).toHaveLength(VERSION_LIMITS.kept);
    await draft(id, says("newest")).expect(200);
    const after = (await publish(id).expect(200)).body;
    expect(after.version).toBe(VERSION_LIMITS.kept + 1);
    expect(after.versions).toHaveLength(VERSION_LIMITS.kept);
    expect(after.versions.at(-1).n).toBe(2);
    expect(await versionDef(id, 1)).toBeNull();
    await request(app).get(`${at}/${id}/versions/1`).expect(404);
  });
});

describe("Going back to an older version", () => {
  test("into the draft: what is published stays; published again: a new version with the old steps", async () => {
    const id = await made("back");
    await draft(id, says("two")).expect(200);
    await publish(id).expect(200);
    // Into the draft, to work on.
    const toDraft = (await restore(id, 1, "draft").expect(200)).body;
    expect(toDraft).toMatchObject({ version: 2, changed: true });
    expect(toDraft.draft.do[1]).toEqual({ act: "return", value: "one" });
    expect(await run(id)).toMatchObject({ value: "two", version: 2 });
    // Published again: the history only grows, and says where the steps came from.
    await draft(id, says("three, unpublished")).expect(200);
    const again = (await restore(id, 1, "live").expect(200)).body;
    expect(again).toMatchObject({ version: 3, published: true, changed: true });
    expect(again.versions.map((v: { n: number; back: number | null }) => [v.n, v.back])).toEqual([[3, 1], [2, null], [1, null]]);
    expect(await run(id)).toMatchObject({ ok: true, value: "one", version: 3 });
    // The draft that was being written is still there.
    expect((await one(id)).draft.do[1]).toEqual({ act: "return", value: "three, unpublished" });
    await restore(id, 9, "live").expect(404);
    await restore(id, 1, "elsewhere" as never).expect(400);
  });

  test("an older version isn't asked today's tests, but what it talks about must still be there", async () => {
    const id = await made("gate");
    await draft(id, says("two")).expect(200);
    // A test written for the newer steps: the old ones wouldn't pass it.
    await request(app).put(`${at}/${id}`).send({ tests: [{ id: "test1", name: "says two", input: {}, expect: { ok: true, value: "two" } }] }).expect(200);
    await publish(id).expect(200);
    await draft(id, says("one")).expect(200);
    expect((await publish(id).expect(409)).body.error).toBe("FN_TESTS_FAILED");
    expect((await restore(id, 1, "live").expect(200)).body.version).toBe(3);
    expect(await run(id)).toMatchObject({ value: "one" });

    // A version that sends through a connection, and the connection deleted since.
    const conn = `${admin}/connections`;
    const cid = ((await request(app).post(`${conn}/ready`).send({ kind: "slack", name: `${PREFIX}team`, key: ["https://hooks.slack.com", "services", "T0123ABCD", "B0456EFGH", "abcdefghijklmnopqrstuvwx"].join("/") }).expect(201)).body.ready as Array<{ id: string; name: string }>).find((c) => c.name === `${PREFIX}team`)!.id;
    const uses = await made("uses", { do: [{ act: "ready", via: cid, what: "message", give: { text: "hi" } }] });
    await draft(uses, says("without it")).expect(200);
    await publish(uses).expect(200);
    // Nothing that runs or is being written uses it: it may go (a version is history, it holds nothing in place).
    await request(app).delete(`${conn}/ready/${cid}`).expect(200);
    const refused = (await restore(uses, 1, "live").expect(409)).body;
    expect(refused).toMatchObject({ error: "FN_HAS_PROBLEMS", details: { problems: [{ at: "do.0", message: "This connection isn't there any more" }] } });
    expect(await one(uses)).toMatchObject({ version: 2 });
    // Into the draft it goes, where the problem is shown on its step.
    expect((await restore(uses, 1, "draft").expect(200)).body.problems).toEqual([{ at: "do.0", message: "This connection isn't there any more" }]);
  });

  test("looking at versions needs functions:read; going back needs functions:write", async () => {
    const id = await made("perm");
    const role = await prisma.staffRole.create({ data: { name: `${PREFIX}reader`, permissions: ["functions:read"] } });
    const u = await prisma.adminUser.create({ data: { email: "reader@fnver-spec.test", name: "reader", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    const reader = `Bearer ${signAccessToken({ sub: u.id, email: u.email, role: "STAFF" } as never)}`;
    expect((await request(app).get(`${at}/${id}`).set("Authorization", reader).expect(200)).body.versions).toHaveLength(1);
    await request(app).get(`${at}/${id}/versions/1`).set("Authorization", reader).expect(200);
    await restore(id, 1, "draft").set("Authorization", reader).expect(403);
    await restore(id, 1, "live").set("Authorization", reader).expect(403);
  });
});

describe("A run asked for through the queue", () => {
  test("is of the version that was published when it was asked for", async () => {
    const id = await made("queued");
    const hook = ((await request(app).post(`${at}/${id}/triggers`).send({ kind: "webhook" }).expect(201)).body.triggers as Array<{ address: string }>).at(-1)!.address;
    // Nobody takes work from the queue for a moment, so what is asked for waits its turn.
    await resetTasksForTests();
    // Asked for while version 1 is published…
    await request(app).post(hook).send({}).expect(202);
    const task = await prisma.task.findFirstOrThrow({ where: { kind: "function" } });
    expect(task).toMatchObject({ status: "waiting", payload: { fnId: id, version: 1 } });
    // …and version 2 is published before it gets its turn.
    await draft(id, says("two")).expect(200);
    await publish(id).expect(200);
    startFunctions();
    await settled();
    expect(await rang()).toEqual(["one"]);
    // What is asked for now is version 2.
    await request(app).post(hook).send({}).expect(202);
    await settled();
    expect(await rang()).toEqual(["one", "two"]);
    expect((await logged()).map((r) => [r.trigger, r.ok, r.detail])).toEqual([["webhook", true, { v: 1 }], ["webhook", true, { v: 2 }]]);
  });

  test("a version that isn't kept any more runs what is published now", async () => {
    const id = await made("gone");
    const hook = ((await request(app).post(`${at}/${id}/triggers`).send({ kind: "webhook" }).expect(201)).body.triggers as Array<{ address: string }>).at(-1)!.address;
    await resetTasksForTests();
    await request(app).post(hook).send({}).expect(202);
    await draft(id, says("two")).expect(200);
    await publish(id).expect(200);
    await prisma.fnVersion.delete({ where: { fnId_n: { fnId: id, n: 1 } } });
    startFunctions();
    await settled();
    expect(await rang()).toEqual(["two"]);
    expect((await logged()).map((r) => r.detail)).toEqual([{ v: 2 }]);
  });
});
