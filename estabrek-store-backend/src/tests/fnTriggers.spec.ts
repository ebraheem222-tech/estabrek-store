import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken, signCustomerToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetFeatures } from "../lib/features.js";
import type { FnDef } from "../lib/fnDef.js";
import { CHAIN_MAX, TRIGGER_LIMITS, forgetTriggers, nextRun, runFnSchedule } from "../lib/fnTriggers.js";
import { forgetHits } from "../lib/hitLimit.js";
import { emitAutomation, setAutomationHandler } from "../lib/automations.js";
import { flushRuns, resetRunsForTests } from "../lib/runs.js";
import { resetTasksForTests, runTasks } from "../lib/tasks.js";
import { forgetShoppers } from "../middleware/apiCaller.js";
import { resetAutomationsForTests, startAutomations } from "../modules/admin/automations.service.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// What starts a function (F3), with the database: a row of a table added, changed or deleted; a
// schedule; something that happened in the store; a call to its own address (a signed-in shopper,
// a key, anyone); a webhook. All but a call go through the queue. Requests to /v1/admin without a
// token run as the test owner. No jobs run here: `settled()` waits for what was started.

const PREFIX = "fn-trig-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
const MIN = 60_000;

const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const rowsOf = (id: string) => prisma.collectionItem.findMany({ where: { collectionId: id, deletedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
const data = (row: { data: unknown }) => row.data as Record<string, any>;
async function fn(name: string, def: Partial<FnDef>, publish = true) {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  expect(saved.problems).toEqual([]);
  if (publish) await request(app).post(`${at}/${made.id}/publish`).expect(200);
  return made.id as string;
}
type TriggerView = { id: string; kind: string; config: any; slug: string | null; address: string | null; enabled: boolean; fired: number; lastAt: string | null; nextAt: string | null; hands: string[] };
const trigger = async (id: string, body: Record<string, unknown>) => ((await request(app).post(`${at}/${id}/triggers`).send(body).expect(201)).body.triggers as TriggerView[]).at(-1)!;
const triggersOf = async (id: string) => (await request(app).get(`${at}/${id}`).expect(200)).body.triggers as TriggerView[];
/** Everything that was started has run: the queue is empty and nothing is on its way to it. */
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = (await prisma.task.count({ where: { kind: { in: ["function", "automation"] }, status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}
const logged = async () => {
  await flushRuns();
  await flushRuns();
  return prisma.run.findMany({ where: { kind: "function", name: { startsWith: PREFIX } }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] });
};

let people = "";
let notes = "";
let sara = "";
let saraId = "";

async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}
async function cleanRows() {
  await resetRunsForTests();
  await prisma.task.deleteMany({ where: { kind: { in: ["function", "automation"] } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.run.deleteMany({ where: { OR: [{ kind: "function", name: { startsWith: PREFIX } }, { kind: "task", name: "function" }] } });
  await prisma.apiKey.deleteMany({ where: { name: "Trigger spec" } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@fn-trig.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  for (const id of [people, notes]) if (id) await prisma.collectionItem.deleteMany({ where: { collectionId: id } });
  forgetTriggers();
  forgetKeys();
  forgetHits();
  forgetShoppers();
  invalidateAccess();
}
async function clean() {
  await cleanRows();
  await resetTasksForTests();
  resetAutomationsForTests();
  setAutomationHandler(null);
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@fn-trig.test" } } });
}

beforeAll(async () => {
  await clean();
  await setAccounts(true);
  people = await mk(`${PREFIX}people`, [{ id: "name", type: "text", required: true }, { id: "points", type: "number" }]);
  notes = await mk(`${PREFIX}notes`, [{ id: "text", type: "text", required: true }, { id: "kind", type: "text" }]);
  const user = await prisma.user.create({ data: { email: "sara@fn-trig.test", name: "Sara" } });
  saraId = user.id;
  sara = signCustomerToken(user.id);
  startFunctions();
});
beforeEach(cleanRows);
afterAll(clean);

/** Writes down what it was handed: one note per run. */
const noteDef = (text: string, kind = "{{input.event}}"): Partial<FnDef> => ({
  inputs: [{ name: "row", type: "any" }, { name: "before", type: "any" }, { name: "event", type: "text" }, { name: "table", type: "text" }],
  do: [{ act: "add", table: notes, values: { text, kind } }],
});
const noteTexts = async () => (await rowsOf(notes)).map((r) => `${data(r).kind?.en ?? ""}: ${data(r).text.en}`);
const addPerson = (values: Record<string, unknown>, slug?: string) => request(app).post(`${admin}/collections/${people}/rows`).send({ lang: "en", slug, values }).expect(201);

describe("A function's triggers", () => {
  test("each kind with its own settings; a call's address is the owner's word, a webhook's is made for it", async () => {
    const id = await fn("kinds", { do: [{ act: "return", value: 1 }] });
    const row = await trigger(id, { kind: "row", config: { table: people, on: ["added", "changed"] } });
    expect(row).toMatchObject({ kind: "row", config: { table: people, on: ["added", "changed"] }, slug: null, address: null, enabled: true, fired: 0, hands: ["row", "before", "event", "table"] });
    const every = await trigger(id, { kind: "schedule", config: { everyMinutes: 30 } });
    expect(Date.parse(every.nextAt!) - Date.now()).toBeGreaterThan(29 * MIN);
    expect(Date.parse(every.nextAt!) - Date.now()).toBeLessThanOrEqual(30 * MIN);
    expect((await trigger(id, { kind: "schedule", config: { at: "09:30" } })).nextAt).toBeTruthy();
    expect(await trigger(id, { kind: "event", config: { event: "order.created" } })).toMatchObject({ kind: "event", hands: ["event", "subject"] });
    const call = await trigger(id, { kind: "call", config: { who: "customer" }, slug: `${PREFIX}Join` });
    expect(call).toMatchObject({ slug: `${PREFIX}join`, address: `/v1/fn/${PREFIX}join`, hands: [] });
    const hook = await trigger(id, { kind: "webhook", config: {} });
    expect(hook.slug).toBeNull();
    expect(hook.address).toMatch(/^\/v1\/hooks\/[A-Za-z0-9_-]{24}$/);
    expect((await triggersOf(id)).map((t) => t.kind)).toEqual(["row", "schedule", "schedule", "event", "call", "webhook"]);
    // The list says what can start a function.
    expect((await request(app).get(at).expect(200)).body.triggers).toMatchObject({ kinds: ["row", "schedule", "event", "call", "webhook"], events: expect.arrayContaining(["order.created"]), callPerMinute: { customer: 30, public: 10 } });

    // Settings that aren't the kind's are refused.
    for (const bad of [
      { kind: "row", config: { table: "nope", on: ["added"] } },
      { kind: "row", config: { table: people, on: [] } },
      { kind: "row", config: { table: people, on: ["exploded"] } },
      { kind: "schedule", config: { everyMinutes: 1 } },
      { kind: "schedule", config: { at: "25:00" } },
      { kind: "event", config: { event: "world.ended" } },
      { kind: "call", config: { who: "customer" } },
      { kind: "call", config: { who: "customer" }, slug: "Not An Address" },
      { kind: "call", config: { who: "everyone" }, slug: "x-ok" },
      { kind: "webhook", config: { secret: "mine" } },
    ])
      expect((await request(app).post(`${at}/${id}/triggers`).send(bad).expect(400)).body.error).toBe("TRIGGER_INVALID");
    expect((await request(app).post(`${at}/${id}/triggers`).send({ kind: "teleport" }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    // An address is one function's.
    const other = await fn("other", { do: [{ act: "return", value: 2 }] });
    expect((await request(app).post(`${at}/${other}/triggers`).send({ kind: "call", config: { who: "public" }, slug: `${PREFIX}join` }).expect(409)).body.error).toBe("SLUG_TAKEN");

    // Changed, switched off, removed.
    const changed = (await request(app).put(`${at}/${id}/triggers/${every.id}`).send({ config: { everyMinutes: 60 }, enabled: false }).expect(200)).body.triggers.find((t: TriggerView) => t.id === every.id);
    expect(changed).toMatchObject({ config: { everyMinutes: 60 }, enabled: false });
    expect(Date.parse(changed.nextAt) - Date.now()).toBeGreaterThan(59 * MIN);
    expect((await request(app).put(`${at}/${id}/triggers/${call.id}`).send({ slug: `${PREFIX}enter` }).expect(200)).body.triggers.find((t: TriggerView) => t.id === call.id).address).toBe(`/v1/fn/${PREFIX}enter`);
    expect((await request(app).put(`${at}/${other}/triggers/${call.id}`).send({ enabled: false }).expect(404)).body.error).toBe("TRIGGER_NOT_FOUND");
    await request(app).delete(`${at}/${id}/triggers/${hook.id}`).expect(200);
    expect((await request(app).delete(`${at}/${id}/triggers/${hook.id}`).expect(404)).body.error).toBe("TRIGGER_NOT_FOUND");
    // So many and no more.
    for (let k = (await triggersOf(id)).length; k < TRIGGER_LIMITS.perFunction; k++) await trigger(id, { kind: "webhook", config: {} });
    expect((await request(app).post(`${at}/${id}/triggers`).send({ kind: "webhook", config: {} }).expect(400)).body.error).toBe("TOO_MANY_TRIGGERS");
    // A function deleted takes its triggers with it.
    await request(app).delete(`${at}/${id}`).expect(200);
    expect(await prisma.fnTrigger.count({ where: { fnId: id } })).toBe(0);
  });

  test("a webhook's address is its permission: a member who can only look isn't told it", async () => {
    const id = await fn("secret", { do: [{ act: "return", value: 1 }] });
    await trigger(id, { kind: "webhook", config: {} });
    const role = await prisma.staffRole.create({ data: { name: `${PREFIX}reader`, permissions: ["functions:read"] } });
    const m = await prisma.adminUser.create({ data: { email: "reader@fn-trig.test", name: "reader", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    const reader = `Bearer ${signAccessToken({ sub: m.id, role: "STAFF", email: m.email })}`;
    const seen = (await request(app).get(`${at}/${id}`).set("Authorization", reader).expect(200)).body.triggers[0];
    expect(seen).toMatchObject({ kind: "webhook", address: null, slug: null });
    expect((await request(app).post(`${at}/${id}/triggers`).set("Authorization", reader).send({ kind: "webhook", config: {} }).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["functions:write"] });
  });
});

describe("A row added, changed or deleted", () => {
  test("starts the functions that wait for it, with the row, what it was before, and what happened", async () => {
    const id = await fn("on-row", noteDef("{{input.row.name}} ({{input.row.points}}) was {{input.before.points}} in {{input.table}}"));
    const t = await trigger(id, { kind: "row", config: { table: people, on: ["added", "changed", "deleted"] } });
    const row = (await addPerson({ name: "Amal", points: 5 }, "amal")).body;
    await settled();
    expect(await noteTexts()).toEqual([`added: Amal (5) was  in ${PREFIX}people`]);
    await request(app).patch(`${admin}/collections/${people}/rows/${row.id}`).send({ lang: "en", values: { points: 9 } }).expect(200);
    await settled();
    await request(app).post(`${admin}/collections/${people}/rows/bulk`).send({ ids: [row.id], op: "trash" }).expect(200);
    await settled();
    expect(await noteTexts()).toEqual([`added: Amal (5) was  in ${PREFIX}people`, `changed: Amal (9) was 5 in ${PREFIX}people`, `deleted: Amal (9) was  in ${PREFIX}people`]);
    // Each run is counted on its trigger and written in the run log, with what started it.
    expect((await triggersOf(id)).find((x) => x.id === t.id)).toMatchObject({ fired: 3 });
    expect((await logged()).map((r) => [r.trigger, r.ok, r.result])).toEqual([["row.added", true, { added: 1 }], ["row.changed", true, { added: 1 }], ["row.deleted", true, { added: 1 }]]);
    // The queue's own log has a line per run too.
    expect(await prisma.task.count({ where: { kind: "function", status: "done" } })).toBe(3);
  });

  test("only what it waits for, only while it is published and on; a file's worth of rows starts nothing", async () => {
    const id = await fn("picky", noteDef("{{input.row.name}}"));
    const t = await trigger(id, { kind: "row", config: { table: people, on: ["changed"] } });
    const row = (await addPerson({ name: "Basel" })).body;
    await settled();
    expect(await noteTexts()).toEqual([]);
    // A file's worth of rows isn't a row added by hand.
    await request(app).post(`${admin}/collections/${people}/rows/import`).send({ lang: "en", mode: "upsert", rows: [{ slug: row.slug, values: { name: "Basel B." } }, { slug: "new-one", values: { name: "New" } }] }).expect(200);
    await settled();
    expect(await noteTexts()).toEqual([]);
    const change = (points: number) => request(app).patch(`${admin}/collections/${people}/rows/${row.id}`).send({ lang: "en", values: { points } }).expect(200);
    // The trigger off, the function off, the function with a trigger of a draft never published: nothing.
    await request(app).put(`${at}/${id}/triggers/${t.id}`).send({ enabled: false }).expect(200);
    await change(1);
    await request(app).put(`${at}/${id}/triggers/${t.id}`).send({ enabled: true }).expect(200);
    await request(app).put(`${at}/${id}`).send({ enabled: false }).expect(200);
    await change(2);
    await request(app).put(`${at}/${id}`).send({ enabled: true }).expect(200);
    const draft = await fn("never-published", noteDef("draft"), false);
    await trigger(draft, { kind: "row", config: { table: people, on: ["changed"] } });
    await settled();
    expect(await noteTexts()).toEqual([]);
    await change(3);
    await settled();
    expect(await noteTexts()).toEqual(["changed: Basel B."]);
  });

  test("functions that start each other stop by themselves", async () => {
    // A row in people adds a note; a note adds a row in people; and so on.
    const a = await fn("ping", { inputs: [{ name: "row", type: "any" }], do: [{ act: "add", table: notes, values: { text: "from {{input.row.name}}" } }] });
    const b = await fn("pong", { inputs: [{ name: "row", type: "any" }], do: [{ act: "add", table: people, values: { name: "after {{input.row.text}}" } }] });
    await trigger(a, { kind: "row", config: { table: people, on: ["added"] } });
    await trigger(b, { kind: "row", config: { table: notes, on: ["added"] } });
    await addPerson({ name: "Start" });
    await settled();
    // By hand, then three functions deep, and no deeper.
    expect((await rowsOf(people)).length + (await rowsOf(notes)).length).toBe(1 + CHAIN_MAX);
    const runs = await logged();
    expect(runs.filter((r) => r.ok)).toHaveLength(CHAIN_MAX);
    expect(runs.filter((r) => !r.ok).map((r) => r.error)).toEqual([`Functions started each other ${CHAIN_MAX} deep; this one wasn't started`]);
  });

  test("a run the server stopped in the middle of isn't run again by itself", async () => {
    const id = await fn("once", noteDef("ran"));
    const t = await trigger(id, { kind: "row", config: { table: people, on: ["added"] } });
    // As a server that stopped mid-run leaves it: taken, begun, never finished.
    const task = await prisma.task.create({ data: { kind: "function", payload: { fnId: id, triggerId: t.id, trigger: "row.added", chain: 1, input: {}, started: true }, status: "running", attempts: 1, maxAttempts: 3, runAt: new Date(Date.now() - MIN), lockedAt: new Date(Date.now() - 5 * MIN), lockedUntil: new Date(Date.now() - MIN) } });
    expect(await runTasks()).toEqual({ done: 0, retry: 1, failed: 0 });
    expect(await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({ status: "waiting", attempts: 2, lastError: "It was interrupted mid-run; it isn't run again by itself" });
    expect(await noteTexts()).toEqual([]);
    // Asked for again from the queue's page (its tries start over), it runs.
    await prisma.task.update({ where: { id: task.id }, data: { status: "failed", attempts: 3 } });
    await request(app).post(`${admin}/system/tasks/${task.id}/retry`).expect(200);
    await settled();
    expect(await noteTexts()).toEqual([": ran"]);
  });
});

describe("A schedule", () => {
  test("is started once for its moment, and its next moment is set", async () => {
    const id = await fn("timed", { inputs: [{ name: "at", type: "text" }], do: [{ act: "add", table: notes, values: { text: "at {{input.at}}", kind: "{{caller.kind}}" } }] });
    const t = await trigger(id, { kind: "schedule", config: { everyMinutes: 15 } });
    // Not due yet.
    expect(await runFnSchedule()).toEqual({ started: 0 });
    const due = new Date(Date.now() - 3 * 60 * MIN);
    await prisma.fnTrigger.update({ where: { id: t.id }, data: { nextAt: due } });
    expect(await runFnSchedule()).toEqual({ started: 1 });
    await settled();
    expect(await noteTexts()).toEqual([`system: at ${due.toISOString()}`]);
    // The hours it missed aren't run one by one: the next is a quarter of an hour from now.
    const next = Date.parse((await triggersOf(id))[0].nextAt!) - Date.now();
    expect(next).toBeGreaterThan(14 * MIN);
    expect(next).toBeLessThanOrEqual(15 * MIN);
    // The same moment asked again (another server, a restart) is the same run.
    await prisma.fnTrigger.update({ where: { id: t.id }, data: { nextAt: due } });
    await runFnSchedule();
    await settled();
    expect(await noteTexts()).toHaveLength(1);
    expect((await logged()).map((r) => r.trigger)).toEqual(["schedule"]);
  });

  test("every day at a time is on the store's clock", () => {
    // The store is in Asia/Jerusalem: two hours ahead of UTC in November, three in July.
    expect(nextRun({ at: "09:30" }, new Date("2026-11-16T05:00:00Z")).toISOString()).toBe("2026-11-16T07:30:00.000Z");
    expect(nextRun({ at: "09:30" }, new Date("2026-11-16T07:30:00Z")).toISOString()).toBe("2026-11-17T07:30:00.000Z");
    expect(nextRun({ at: "09:30" }, new Date("2026-07-01T10:00:00Z")).toISOString()).toBe("2026-07-02T06:30:00.000Z");
    expect(nextRun({ at: "00:05" }, new Date("2026-11-16T22:10:00Z")).toISOString()).toBe("2026-11-17T22:05:00.000Z");
    expect(nextRun({ everyMinutes: 90 }, new Date("2026-11-16T05:00:00Z")).toISOString()).toBe("2026-11-16T06:30:00.000Z");
  });
});

describe("Something that happened in the store", () => {
  test("starts the functions that wait for it, with what it was about", async () => {
    const id = await fn("on-order", { inputs: [{ name: "orderId", type: "text" }, { name: "total", type: "number" }, { name: "subject", type: "text" }], do: [{ act: "add", table: notes, values: { text: "{{input.orderId}}: {{input.total}} ({{input.subject}})", kind: "order" } }] });
    await trigger(id, { kind: "event", config: { event: "order.created" } });
    startAutomations();
    emitAutomation("order.created", { orderId: "ORD-7", total: 240 }, "order:7");
    // Another event isn't this one's.
    emitAutomation("video.ready", { video: "x" }, "video:1");
    await settled();
    expect(await noteTexts()).toEqual(["order: ORD-7: 240 (order:7)"]);
    expect((await logged()).map((r) => r.trigger)).toEqual(["event.order.created"]);
  });
});

describe("A call to its own address", () => {
  const call = (address: string, input: Record<string, unknown> = {}) => request(app).post(`/v1/fn/${address}`).send({ input });

  test("from a signed-in shopper: the function knows who called, and a row it adds can be theirs", async () => {
    const id = await fn("join", {
      inputs: [{ name: "text", type: "text", required: true }, { name: "caller", type: "any" }],
      do: [
        { act: "if", if: [{ left: "{{input.text}}", cmp: "eq", right: "no" }], do: [{ act: "stop", message: "Not like this" }] },
        { act: "add", table: notes, owner: "{{caller}}", values: { text: "{{input.text}} from {{caller.name}} <{{caller.email}}>", kind: "{{caller.kind}}" }, as: "made" },
        { act: "return", value: { id: "{{made.$id}}", by: "{{caller.id}}", said: "{{input.caller}}" } },
      ],
    });
    const t = await trigger(id, { kind: "call", config: { who: "customer", perMinute: 3 }, slug: `${PREFIX}join` });
    const address = `${PREFIX}join`;
    // Nobody signed in; a token that isn't a shopper's.
    expect((await call(address, { text: "hi" }).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    expect((await call(address, { text: "hi" }).set("Authorization", "Bearer nonsense").expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    // Who called is what the door saw, not what the caller says.
    const out = (await call(address, { text: "hi", caller: { id: "someone-else", kind: "admin" } }).set("Authorization", `Bearer ${sara}`).expect(200)).body;
    expect(out).toEqual({ ok: true, value: { id: expect.any(String), by: saraId, said: { id: "someone-else", kind: "admin" } } });
    const [row] = await rowsOf(notes);
    expect(row).toMatchObject({ id: out.value.id, ownerId: saraId });
    expect(data(row)).toMatchObject({ text: { en: "hi from Sara <sara@fn-trig.test>" }, kind: { en: "customer" } });
    // It stopped: the caller is told why.
    expect((await call(address, { text: "no" }).set("Authorization", `Bearer ${sara}`).expect(422)).body).toEqual({ ok: false, error: "Not like this" });
    expect((await call(address, {}).set("Authorization", `Bearer ${sara}`).expect(422)).body.error).toBe('It needs "text"');
    // So many a minute from one shopper.
    expect((await call(address, { text: "again" }).set("Authorization", `Bearer ${sara}`).expect(429)).body.error).toBe("RATE_LIMIT");
    expect((await triggersOf(id)).find((x) => x.id === t.id)!.fired).toBe(3);
    expect((await logged()).map((r) => [r.trigger, r.subject, r.ok])).toEqual([["call", "customer", true], ["call", "customer", false], ["call", "customer", false]]);
    // A body that isn't the shape is refused before anything runs.
    forgetHits();
    expect((await request(app).post(`/v1/fn/${address}`).set("Authorization", `Bearer ${sara}`).send({ text: "hi" }).expect(400)).body.error).toBe("VALIDATION_ERROR");
  });

  test("with a key, or from anyone; an address that isn't one, or whose function is off, isn't there", async () => {
    const who = await fn("who", { do: [{ act: "return", value: "{{caller.kind}}" }] });
    await trigger(who, { kind: "call", config: { who: "key" }, slug: `${PREFIX}keyed` });
    await trigger(who, { kind: "call", config: { who: "public" }, slug: `${PREFIX}open` });
    const key = (await request(app).post(`${admin}/api/keys`).send({ name: "Trigger spec", scopes: { tables: "*", acts: ["read"] } }).expect(201)).body.secret as string;
    expect((await call(`${PREFIX}keyed`).expect(401)).body.error).toBe("KEY_NEEDED");
    expect((await call(`${PREFIX}keyed`).set("Authorization", `Bearer ${sara}`).expect(401)).body.error).toBe("KEY_NEEDED");
    expect((await call(`${PREFIX}keyed`).set("X-Api-Key", "ek_wrongwrongwrongwrongwrong").expect(401)).body.error).toBe("INVALID_KEY");
    expect((await call(`${PREFIX}keyed`).set("X-Api-Key", key).expect(200)).body).toEqual({ ok: true, value: "key" });
    // Anyone; a signed-in shopper is still known as themselves.
    expect((await call(`${PREFIX}open`).expect(200)).body).toEqual({ ok: true, value: "public" });
    expect((await call(`${PREFIX}open`).set("Authorization", `Bearer ${sara}`).expect(200)).body).toEqual({ ok: true, value: "customer" });
    // Not an address; switched off; the function off.
    expect((await call(`${PREFIX}nope`).expect(404)).body.error).toBe("NOT_FOUND");
    await request(app).put(`${at}/${who}`).send({ enabled: false }).expect(200);
    expect((await call(`${PREFIX}open`).expect(404)).body.error).toBe("NOT_FOUND");
    await request(app).put(`${at}/${who}`).send({ enabled: true }).expect(200);
    expect((await call(`${PREFIX}open`).expect(200)).body.ok).toBe(true);
    // The admin's own run is the admin's.
    expect((await request(app).post(`${at}/${who}/run`).send({ dry: true, which: "live" }).expect(200)).body.value).toBe("admin");
  });

  test("a row's owner has to be a shopper", async () => {
    const id = await fn("owned", { inputs: [{ name: "owner", type: "text" }], do: [{ act: "add", table: notes, owner: "{{input.owner}}", values: { text: "x" } }] });
    await trigger(id, { kind: "call", config: { who: "public" }, slug: `${PREFIX}owned` });
    expect((await call(`${PREFIX}owned`, { owner: "nobody" }).expect(422)).body.error).toBe("No such shopper to own the row");
    expect((await call(`${PREFIX}owned`, { owner: saraId }).expect(200)).body.ok).toBe(true);
    // Nobody named: the store's own row.
    expect((await call(`${PREFIX}owned`, {}).expect(200)).body.ok).toBe(true);
    expect((await rowsOf(notes)).map((r) => r.ownerId)).toEqual([saraId, null]);
    // What a function may say about its caller.
    const bad = (await request(app).put(`${at}/${id}`).send({ draft: { inputs: [], do: [{ act: "return", value: "{{caller.password}}" }] } }).expect(200)).body;
    expect(bad.problems).toEqual([{ at: "do.0", message: 'The caller has no "password"' }]);
  });
});

describe("A webhook", () => {
  test("is taken in and run through the queue, with what was sent", async () => {
    const id = await fn("hooked", { inputs: [{ name: "body", type: "any" }, { name: "query", type: "any" }], do: [{ act: "add", table: notes, values: { text: "{{input.body.event}} #{{input.body.order.id}} via {{input.query.source}}", kind: "{{caller.kind}}" } }] });
    const hook = await trigger(id, { kind: "webhook", config: {} });
    expect((await request(app).post(`${hook.address}?source=erp`).send({ event: "paid", order: { id: 42 } }).expect(202)).body).toEqual({ ok: true });
    // Taken in, not run yet: the sender never waits for the function.
    await settled();
    expect(await noteTexts()).toEqual(["system: paid #42 via erp"]);
    expect((await logged()).map((r) => r.trigger)).toEqual(["webhook"]);
    // An address nobody was given; one too large.
    expect((await request(app).post("/v1/hooks/aaaaaaaaaaaaaaaaaaaaaaaa").send({}).expect(404)).body.error).toBe("NOT_FOUND");
    expect((await request(app).post(hook.address!).send({ blob: "x".repeat(TRIGGER_LIMITS.webhookBytes) }).expect(413)).body.error).toBe("TOO_LARGE");
    // Switched off: the address isn't there.
    await request(app).put(`${at}/${id}/triggers/${hook.id}`).send({ enabled: false }).expect(200);
    await request(app).post(hook.address!).send({}).expect(404);
  });
});
