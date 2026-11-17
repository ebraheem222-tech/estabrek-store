import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { HTTP_LIMITS, setTransportForTests, siteUrl, type Transport } from "../lib/fnHttp.js";
import { rowEventsInFlight } from "../lib/fnTriggers.js";
import { emitAutomation, setAutomationHandler } from "../lib/automations.js";
import { resetAutomationsForTests, startAutomations } from "../modules/admin/automations.service.js";
import { resetTasksForTests, retryDelayMs, runTasks } from "../lib/tasks.js";
import { flushRuns } from "../lib/runs.js";
import { PING, WEBHOOK_EVENTS, WEBHOOK_LIMITS, WEBHOOK_TASK, bodyOf, cleanDeliveries, emitWebhooks, forgetEndpoints, newSecret, oneLine, retryWaits, sign, startWebhooksOut, verify } from "../lib/webhooksOut.js";

// Outgoing webhooks (F6): the store's events sent to the owner's own addresses, each delivery
// signed; one that fails is tried again; every delivery is kept in a log. With the database;
// the network is stood in for. Requests without a token run as the test owner.

const base = "/v1/admin/webhooks";
const PREFIX = "hook-spec-";
type Endpoint = { id: string; name: string; url: string; events: string[]; tables: string[]; hint: string; enabled: boolean; failures: number; pausedAt: string | null; lastOkAt: string | null; lastError: string | null; waiting: number };
type Delivery = { id: string; event: string; eventId: string; status: string; attempts: number; code: number | null; error: string | null; ms: number | null; nextAt: string | null; finishedAt: string | null; body?: string };
type Call = { url: string; headers: Record<string, string>; body: string };

/** The network: what was sent, and what each site answers (200 when nothing else is said). */
const calls: Call[] = [];
let answer: (call: Call) => { status: number; text?: string } | Error = () => ({ status: 200 });
const network: Transport = async ({ url, headers, body }) => {
  const call = { url: url.toString(), headers, body: body ?? "" };
  calls.push(call);
  const out = answer(call);
  if (out instanceof Error) throw out;
  return { status: out.status, type: "text/plain", text: out.text ?? "", cut: false };
};

const make = (body: Record<string, unknown>) => request(app).post(base).send({ name: `${PREFIX}one`, url: "https://hooks.example.test/in", events: ["row.added"], ...body });
const made = async (body: Record<string, unknown> = {}) => (await make(body).expect(201)).body as { endpoint: Endpoint; secret: string };
const list = async () => (await request(app).get(base).expect(200)).body as { endpoints: Endpoint[]; events: { rows: string[]; store: string[]; ping: string }; tables: Array<{ id: string; slug: string }>; limits: Record<string, unknown> };
const one = async (id: string) => (await list()).endpoints.find((e) => e.id === id)!;
const log = async (id: string, q: Record<string, string> = {}) => ((await request(app).get(`${base}/${id}/deliveries`).query(q).expect(200)).body.deliveries as Delivery[]);
const signedBy = (secret: string, c: Call, now?: number) => verify(secret, { id: c.headers["webhook-id"], timestamp: c.headers["webhook-timestamp"], signature: c.headers["webhook-signature"] }, c.body, now);

/** Everything that was started has left: the queue has nothing due and nothing is on its way to it. */
async function settled() {
  for (let quiet = 0; quiet < 3; ) {
    await new Promise((r) => setTimeout(r, 25));
    await runTasks();
    quiet = rowEventsInFlight() || (await prisma.task.count({ where: { kind: { in: [WEBHOOK_TASK, "automation"] }, status: { in: ["waiting", "running"] }, runAt: { lte: new Date() } } })) ? 0 : quiet + 1;
  }
}
/** The tries that wait for later are made due now, and run. */
async function later() {
  await prisma.task.updateMany({ where: { kind: WEBHOOK_TASK, status: "waiting" }, data: { runAt: new Date() } });
  await settled();
}

let notes = "";
let other = "";
const addRow = (table: string, slug: string, values: Record<string, unknown>) => request(app).post(`/v1/admin/collections/${table}/rows`).send({ slug, lang: "en", values }).expect(201);

async function cleanRows() {
  // (Only this spec's tasks: emptying the whole queue would also forget who does each kind of task.)
  await prisma.task.deleteMany({ where: { kind: { in: [WEBHOOK_TASK, "automation"] } } });
  await prisma.webhookEndpoint.deleteMany({});
  await prisma.adminNotification.deleteMany({ where: { link: "/admin/webhooks" } });
  for (const id of [notes, other]) if (id) await prisma.collectionItem.deleteMany({ where: { collectionId: id } });
  forgetEndpoints();
  calls.length = 0;
  answer = () => ({ status: 200 });
}
async function clean() {
  await cleanRows();
  await resetTasksForTests();
  resetAutomationsForTests();
  setAutomationHandler(null);
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@hook-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.run.deleteMany({ where: { kind: "task", name: WEBHOOK_TASK } });
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  setTransportForTests(network);
  const mk = async (slug: string) => (await request(app).post("/v1/admin/collections").send({ slug: `${PREFIX}${slug}`, name: { en: slug }, fields: [{ id: "title", type: "text" }, { id: "points", type: "number" }] }).expect(201)).body.id as string;
  notes = await mk("notes");
  other = await mk("other");
  startWebhooksOut();
});
beforeEach(cleanRows);
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("A delivery's signature", () => {
  test("is over the delivery's id, the moment it leaves and the very body; a receiver checks it with the secret", () => {
    const secret = newSecret();
    // The form receivers' libraries read: a prefix, then 24 random bytes in base64.
    expect(secret).toMatch(/^whsec_[A-Za-z0-9+/]{32}$/);
    expect(newSecret()).not.toBe(secret);
    const now = 1_800_000_000_000;
    const seconds = now / 1000;
    const body = JSON.stringify({ id: "evt_1", event: "row.added", data: { n: 1 } });
    const signature = sign(secret, "d1", seconds, body);
    expect(signature).toMatch(/^v1,[A-Za-z0-9+/]{43}=$/);
    const headers = { id: "d1", timestamp: String(seconds), signature };
    expect(verify(secret, headers, body, now)).toBe(true);
    // Another secret, another body, another id, another moment: not ours.
    expect(verify(newSecret(), headers, body, now)).toBe(false);
    expect(verify(secret, headers, body.replace("1}", "2}"), now)).toBe(false);
    expect(verify(secret, { ...headers, id: "d2" }, body, now)).toBe(false);
    expect(verify(secret, { ...headers, timestamp: String(seconds + 1) }, body, now)).toBe(false);
    // An old one (or one from the future) is refused though it is signed; a little drift between two clocks isn't.
    expect(verify(secret, headers, body, now + (WEBHOOK_LIMITS.freshSeconds + 1) * 1000)).toBe(false);
    expect(verify(secret, headers, body, now - (WEBHOOK_LIMITS.freshSeconds + 1) * 1000)).toBe(false);
    expect(verify(secret, headers, body, now + 60_000)).toBe(true);
    // Several signatures may come (a secret being renewed): one of ours is enough.
    expect(verify(secret, { ...headers, signature: `v1,AAAA ${signature}` }, body, now)).toBe(true);
    expect(verify(secret, { ...headers, signature: "" }, body, now)).toBe(false);
    expect(verify(secret, { ...headers, timestamp: "soon" }, body, now)).toBe(false);
  });

  test("what is sent: whole, or (too large) what it is about and that the rest was left out", () => {
    const small = { id: "evt_1", event: "row.added", at: "2026-11-17T10:00:00.000Z", data: { table: { id: "t", slug: "notes" }, row: { id: "r1", slug: "one", values: { title: "x" } } } };
    expect(JSON.parse(bodyOf(small))).toEqual(small);
    const large = bodyOf({ ...small, data: { ...small.data, row: { id: "r1", slug: "one", values: { title: "x".repeat(HTTP_LIMITS.body) } } } });
    expect(JSON.parse(large)).toEqual({ id: "evt_1", event: "row.added", at: small.at, data: { table: { id: "t", slug: "notes" }, row: { id: "r1", slug: "one" }, truncated: true } });
    expect(JSON.parse(bodyOf({ id: "e", event: "order.created", at: small.at, data: { note: "y".repeat(HTTP_LIMITS.body) } })).data).toEqual({ truncated: true });
    // A failed try waits longer each time: half a minute, then four times as long, never more than six hours.
    expect(retryWaits()).toEqual([30, 120, 480, 1920, 7680, 21600, 21600]);
    expect(retryWaits()).toHaveLength(WEBHOOK_LIMITS.tries - 1);
    // What a receiver answered is said in a line: a page of HTML by its words, a long answer by its beginning.
    expect(oneLine('<!doctype html><html><head><title>Not here</title><style>body { margin: 0 }</style><script>track("<b>")</script></head>\n<body><h1>Not here</h1><p>Try  another address.</p></body></html>')).toBe("Not here Not here Try another address.");
    expect(oneLine("  plain\n words ")).toBe("plain words");
    expect(oneLine("x".repeat(500))).toHaveLength(120);
  });
});

describe("An endpoint", () => {
  test("is made with its secret, answered once; nothing else ever answers it", async () => {
    const { endpoint, secret } = await made({ events: ["row.deleted", "order.created", "row.added"], tables: [notes] });
    expect(endpoint).toMatchObject({ name: `${PREFIX}one`, url: "https://hooks.example.test/in", events: ["row.added", "row.deleted", "order.created"], tables: [notes], enabled: true, failures: 0, waiting: 0, hint: secret.slice(-4) });
    expect(secret).toMatch(/^whsec_/);
    const page = await list();
    expect(JSON.stringify(page)).not.toContain(secret);
    expect(JSON.stringify(page)).not.toContain("sealed");
    expect(page.events).toEqual({ rows: ["row.added", "row.changed", "row.deleted"], store: ["order.created", "stock.low", "video.ready", "product.viral", "job.failing", "deploy.failed"], ping: PING });
    expect(page.tables.map((t) => t.id)).toEqual(expect.arrayContaining([notes, other]));
    expect(page.limits).toMatchObject({ endpoints: 20, tries: 8, pauseAfter: 10, keepDays: 14, waits: retryWaits() });
    // Kept encrypted: the database holds neither the secret nor anything it could be read from without the server's key.
    const kept = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } });
    expect(kept.sealed).not.toContain(secret.slice(6));
    // Changed, switched off and on, and its secret renewed: the new one is answered once, the old one signs nothing more.
    const changed = (await request(app).patch(`${base}/${endpoint.id}`).send({ name: `${PREFIX}renamed`, url: "https://other.example.test/hook?x=1", events: ["row.changed"], tables: [], enabled: false }).expect(200)).body.endpoint as Endpoint;
    expect(changed).toMatchObject({ name: `${PREFIX}renamed`, url: "https://other.example.test/hook?x=1", events: ["row.changed"], tables: [], enabled: false });
    const renewed = (await request(app).post(`${base}/${endpoint.id}/secret`).expect(200)).body as { endpoint: Endpoint; secret: string };
    expect([renewed.secret === secret, renewed.endpoint.hint]).toEqual([false, renewed.secret.slice(-4)]);
    await request(app).delete(`${base}/${endpoint.id}`).expect(200);
    expect((await list()).endpoints).toEqual([]);
    await request(app).patch(`${base}/${endpoint.id}`).send({ name: "x" }).expect(404);
    await request(app).post(`${base}/${endpoint.id}/test`).expect(404);
  });

  test("goes only to an https address of a site by its name; only to events and tables that are there", async () => {
    const why = async (body: Record<string, unknown>) => (await make(body).expect(400)).body.details.issues[0] as { path: string; message: string };
    expect(await why({ url: "http://hooks.example.test/in" })).toEqual({ path: "url", message: "The address starts with https://" });
    expect((await why({ url: "https://10.0.0.5/in" })).message).toBe("A site is called by its name");
    expect((await why({ url: "https://[::1]/in" })).message).toBe("A site is called by its name");
    expect((await why({ url: "https://localhost/in" })).message).toBe("A site is called by its name");
    expect((await why({ url: "https://hooks.example.test:8443/in" })).message).toBe("Only the standard https port is called");
    expect((await why({ url: "https://user:pass@hooks.example.test/in" })).message).toBe("An address doesn't carry a name and password");
    expect((await why({ url: "https://hooks.example.test/{{secret.X}}" })).message).toBe("An address has no spaces or braces");
    expect((await why({ url: "not an address" })).path).toBe("url");
    expect(await why({ events: ["row.added", "row.exploded"] })).toEqual({ path: "events", message: 'No event called "row.exploded"' });
    expect((await why({ events: [] })).path).toBe("events");
    expect(await why({ tables: ["no-such-table"] })).toEqual({ path: "tables", message: "No such table" });
    expect((await why({ name: " " })).path).toBe("name");
    expect((await make({ secret: "mine" }).expect(400)).body.error).toBe("VALIDATION_ERROR");
    expect(siteUrl(" https://hooks.example.test/in ").hostname).toBe("hooks.example.test");
    expect(WEBHOOK_EVENTS).toHaveLength(9);
    // So many, and no more.
    await prisma.webhookEndpoint.createMany({ data: Array.from({ length: WEBHOOK_LIMITS.endpoints }, (_, i) => ({ name: `${PREFIX}${i}`, url: "https://hooks.example.test/in", sealed: "x", hint: "xxxx" })) });
    expect((await make({}).expect(409)).body.error).toBe("TOO_MANY");
  });

  test("looking takes connections:read, changing connections:write", async () => {
    const member = async (name: string, permissions: string[]) => {
      const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
      const u = await prisma.adminUser.create({ data: { email: `${name}@hook-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
      invalidateAccess();
      return `Bearer ${signAccessToken({ sub: u.id, email: u.email, role: "STAFF" } as never)}`;
    };
    const { endpoint } = await made();
    const reader = await member("reader", ["connections:read"]);
    const builder = await member("builder", ["functions:read", "functions:write", "pages:read", "pages:write"]);
    expect((await request(app).get(base).set("Authorization", reader).expect(200)).body.endpoints).toHaveLength(1);
    await request(app).get(`${base}/${endpoint.id}/deliveries`).set("Authorization", reader).expect(200);
    expect((await request(app).post(base).set("Authorization", reader).send({ name: "x", url: "https://x.example.test/", events: ["row.added"] }).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["connections:write"] });
    await request(app).post(`${base}/${endpoint.id}/secret`).set("Authorization", reader).expect(403);
    await request(app).post(`${base}/${endpoint.id}/test`).set("Authorization", reader).expect(403);
    await request(app).delete(`${base}/${endpoint.id}`).set("Authorization", reader).expect(403);
    // Who builds functions and tables can't open a way out of the store.
    await request(app).get(base).set("Authorization", builder).expect(403);
  });
});

describe("A row's event", () => {
  test("is delivered, signed, to the endpoints that asked for it and for its table", async () => {
    const a = await made({ events: ["row.added", "row.changed", "row.deleted"], tables: [notes] });
    const all = await made({ name: `${PREFIX}all`, url: "https://all.example.test/hook", events: ["row.added"] });
    const off = await made({ name: `${PREFIX}off`, url: "https://off.example.test/hook", events: ["row.added"] });
    await request(app).patch(`${base}/${off.endpoint.id}`).send({ enabled: false }).expect(200);

    const row = (await addRow(notes, "first", { title: "Hello", points: 3 })).body;
    await settled();
    expect(calls.map((c) => c.url).sort()).toEqual(["https://all.example.test/hook", "https://hooks.example.test/in"]);
    const call = calls.find((c) => c.url === "https://hooks.example.test/in")!;
    const sent = JSON.parse(call.body);
    expect(sent).toMatchObject({ event: "row.added", data: { table: { id: notes, slug: `${PREFIX}notes` }, row: { id: row.id, slug: "first", status: "DRAFT", values: { title: { en: "Hello" }, points: 3 } } } });
    expect(sent.id).toMatch(/^evt_[A-Za-z0-9_-]{16}$/);
    expect(Number.isNaN(Date.parse(sent.at))).toBe(false);
    expect(sent.data.before).toBeUndefined();
    // Signed with its own secret, over the body as it was sent; the other endpoint's secret doesn't open it.
    expect(call.headers).toMatchObject({ "content-type": "application/json", "user-agent": "store-webhooks/1", "content-length": String(Buffer.byteLength(call.body)) });
    expect([signedBy(a.secret, call), signedBy(all.secret, call)]).toEqual([true, false]);
    // The same event for both endpoints: one event id, a delivery id each.
    const twin = calls.find((c) => c.url === "https://all.example.test/hook")!;
    expect([JSON.parse(twin.body).id === sent.id, twin.headers["webhook-id"] === call.headers["webhook-id"], signedBy(all.secret, twin)]).toEqual([true, false, true]);
    // The log: sent at the first try.
    const [d] = await log(a.endpoint.id);
    expect(d).toMatchObject({ id: call.headers["webhook-id"], event: "row.added", eventId: sent.id, status: "sent", attempts: 1, code: 200, error: null, nextAt: null });
    expect(d.finishedAt).not.toBeNull();
    expect((await one(a.endpoint.id)).lastOkAt).not.toBeNull();
    expect((await request(app).get(`${base}/${a.endpoint.id}/deliveries/${d.id}`).expect(200)).body.body).toBe(call.body);

    // Another table's row: only the endpoint that takes every table.
    calls.length = 0;
    await addRow(other, "elsewhere", { title: "There" });
    await settled();
    expect(calls.map((c) => c.url)).toEqual(["https://all.example.test/hook"]);

    // A change says how it was before; a row sent to the trash is "deleted".
    calls.length = 0;
    await request(app).patch(`/v1/admin/collections/${notes}/rows/${row.id}`).send({ lang: "en", values: { points: 9 } }).expect(200);
    await settled();
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0].body)).toMatchObject({ event: "row.changed", data: { row: { id: row.id, values: { points: 9 } }, before: { title: { en: "Hello" }, points: 3 } } });
    calls.length = 0;
    await request(app).post(`/v1/admin/collections/${notes}/rows/bulk`).send({ ids: [row.id], op: "trash" }).expect(200);
    await settled();
    expect(calls.map((c) => JSON.parse(c.body).event)).toEqual(["row.deleted"]);
    expect(JSON.parse(calls[0].body).data.row).toMatchObject({ id: row.id, slug: "first" });
    expect((await log(a.endpoint.id)).map((x) => x.event)).toEqual(["row.deleted", "row.changed", "row.added"]);
    expect(await log(off.endpoint.id)).toEqual([]);
    // Each try is in the run log, as the queue's own.
    await flushRuns();
    await flushRuns();
    expect(await prisma.run.count({ where: { kind: "task", name: WEBHOOK_TASK, ok: true } })).toBeGreaterThanOrEqual(4);
  });
});

describe("A delivery that isn't taken", () => {
  test("is tried again later, signed anew, with the same id; then it goes through", async () => {
    const { endpoint, secret } = await made();
    answer = () => ({ status: 500, text: "boom\n  try later" });
    const t0 = Date.now();
    await addRow(notes, "retry", { title: "Again" });
    await settled();
    expect(calls).toHaveLength(1);
    let [d] = await log(endpoint.id);
    expect(d).toMatchObject({ status: "waiting", attempts: 1, code: 500, error: "It answered 500: boom try later", finishedAt: null });
    // It waits half a minute for its second try (the queue's own wait).
    expect(new Date(d.nextAt!).getTime() - t0).toBeGreaterThanOrEqual(retryDelayMs(1) - 1000);
    expect(new Date(d.nextAt!).getTime() - t0).toBeLessThan(retryDelayMs(1) + 10_000);
    expect(await one(endpoint.id)).toMatchObject({ waiting: 1, failures: 0, lastError: "It answered 500: boom try later" });
    expect(await log(endpoint.id, { status: "waiting" })).toHaveLength(1);
    expect(await log(endpoint.id, { status: "sent" })).toEqual([]);
    // Its time comes; the receiver is back.
    answer = () => ({ status: 204 });
    await later();
    expect(calls).toHaveLength(2);
    expect(calls[1].headers["webhook-id"]).toBe(calls[0].headers["webhook-id"]);
    expect(calls[1].body).toBe(calls[0].body);
    expect(signedBy(secret, calls[1])).toBe(true);
    [d] = await log(endpoint.id);
    expect(d).toMatchObject({ status: "sent", attempts: 2, code: 204, error: null, nextAt: null });
    expect(await one(endpoint.id)).toMatchObject({ waiting: 0, failures: 0 });
  });

  test("a site that doesn't answer is said as it is; after the last try the delivery has failed", async () => {
    const { endpoint } = await made();
    answer = () => Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    await addRow(notes, "lost", { title: "Lost" });
    await settled();
    expect((await log(endpoint.id))[0]).toMatchObject({ status: "waiting", attempts: 1, code: null, error: '"hooks.example.test" didn\'t answer in time' });
    // Every try but the last was made: the next one is the last.
    await prisma.task.updateMany({ where: { kind: WEBHOOK_TASK }, data: { attempts: WEBHOOK_LIMITS.tries - 1 } });
    answer = () => ({ status: 410 });
    await later();
    const [d] = await log(endpoint.id);
    expect(d).toMatchObject({ status: "failed", code: 410, error: "It answered 410", nextAt: null });
    expect(d.finishedAt).not.toBeNull();
    expect(await one(endpoint.id)).toMatchObject({ failures: 1, enabled: true, waiting: 0 });
    expect(await prisma.task.count({ where: { kind: WEBHOOK_TASK, status: "failed" } })).toBe(1);
    // Sent again from the log: a new round of tries, the same delivery.
    answer = () => ({ status: 200 });
    const before = calls.length;
    await request(app).post(`${base}/${endpoint.id}/deliveries/${d.id}/resend`).expect(200);
    await settled();
    expect(calls.length).toBe(before + 1);
    expect(calls.at(-1)!.headers["webhook-id"]).toBe(d.id);
    expect((await log(endpoint.id))[0]).toMatchObject({ id: d.id, status: "sent", code: 200 });
    // One that went through clears the count.
    expect((await one(endpoint.id)).failures).toBe(0);
    await request(app).post(`${base}/${endpoint.id}/deliveries/no-such/resend`).expect(404);
  });

  test("an endpoint whose deliveries keep failing for good is paused, and the owner told; switched on again it starts clean", async () => {
    const { endpoint } = await made();
    await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { failures: WEBHOOK_LIMITS.pauseAfter - 1 } });
    answer = () => ({ status: 503 });
    await addRow(notes, "last-straw", { title: "x" });
    await settled();
    await prisma.task.updateMany({ where: { kind: WEBHOOK_TASK }, data: { attempts: WEBHOOK_LIMITS.tries - 1 } });
    await later();
    const paused = await one(endpoint.id);
    expect(paused).toMatchObject({ enabled: false, failures: WEBHOOK_LIMITS.pauseAfter });
    expect(paused.pausedAt).not.toBeNull();
    expect(await prisma.adminNotification.count({ where: { link: "/admin/webhooks" } })).toBe(1);
    // Paused: new events aren't made into deliveries for it.
    calls.length = 0;
    await addRow(notes, "while-paused", { title: "y" });
    await settled();
    expect(calls).toEqual([]);
    expect(await log(endpoint.id)).toHaveLength(1);
    // The failed one can't be sent again while it is off.
    const [d] = await log(endpoint.id);
    expect((await request(app).post(`${base}/${endpoint.id}/deliveries/${d.id}/resend`).expect(409)).body.error).toBe("ENDPOINT_OFF");
    // On again: a clean count, and events flow.
    answer = () => ({ status: 200 });
    expect((await request(app).patch(`${base}/${endpoint.id}`).send({ enabled: true }).expect(200)).body.endpoint).toMatchObject({ enabled: true, failures: 0, pausedAt: null });
    await addRow(notes, "back", { title: "z" });
    await settled();
    expect(calls).toHaveLength(1);
  });

  test("one queued for an endpoint that is then switched off isn't sent; an endpoint far behind isn't piled on", async () => {
    const { endpoint } = await made();
    // The delivery is written and its task waits; the endpoint goes off before a worker takes it.
    await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { enabled: true } });
    const d = await prisma.webhookDelivery.create({ data: { endpointId: endpoint.id, event: "row.added", eventId: "evt_test", body: "{}" } });
    await request(app).patch(`${base}/${endpoint.id}`).send({ enabled: false }).expect(200);
    await prisma.task.create({ data: { kind: WEBHOOK_TASK, payload: { delivery: d.id }, maxAttempts: WEBHOOK_LIMITS.tries } });
    await settled();
    expect(calls).toEqual([]);
    expect((await log(endpoint.id))[0]).toMatchObject({ status: "failed", attempts: 0, error: "The endpoint was switched off before this was sent" });
    // Far behind: so many already wait that a new event isn't queued for it, and it says so.
    await request(app).patch(`${base}/${endpoint.id}`).send({ enabled: true }).expect(200);
    await prisma.webhookDelivery.createMany({ data: Array.from({ length: WEBHOOK_LIMITS.waiting }, (_, i) => ({ endpointId: endpoint.id, event: "row.added", eventId: `evt_${i}`, body: "{}" })) });
    expect(await emitWebhooks("row.added", () => ({ n: 1 }), { table: notes })).toBe(0);
    expect((await one(endpoint.id)).lastError).toContain("deliveries are waiting");
    expect(await prisma.task.count({ where: { kind: WEBHOOK_TASK, status: "waiting" } })).toBe(0);
  });
});

describe("The store's own events, a try, and the log", () => {
  test("a store event goes to the endpoints that asked for it, with what it was about", async () => {
    const { endpoint, secret } = await made({ events: ["order.created"] });
    startAutomations();
    emitAutomation("order.created", { orderId: "ORD-7", total: 240, customerName: "Sara" }, "order:7");
    // Another event isn't this endpoint's.
    emitAutomation("stock.low", { product: "Shawl" }, "variant:1");
    await settled();
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0].body)).toMatchObject({ event: "order.created", data: { orderId: "ORD-7", total: 240, customerName: "Sara", subject: "order:7" } });
    expect(signedBy(secret, calls[0])).toBe(true);
    expect((await log(endpoint.id)).map((d) => [d.event, d.status])).toEqual([["order.created", "sent"]]);
    // Nothing to say, or nobody asking: nothing is written.
    expect(await emitWebhooks("order.created", () => null)).toBe(0);
    expect(await emitWebhooks("video.ready", () => ({ video: "x" }))).toBe(0);
    expect(await log(endpoint.id)).toHaveLength(1);
  });

  test("a try from the page: one ping now, kept in the log; a failing one doesn't count toward pausing", async () => {
    const { endpoint, secret } = await made();
    const ok = (await request(app).post(`${base}/${endpoint.id}/test`).expect(200)).body;
    expect(ok).toMatchObject({ ok: true, code: 200, error: null });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0].body)).toMatchObject({ event: PING, data: { message: expect.any(String) } });
    expect(signedBy(secret, calls[0])).toBe(true);
    expect((await log(endpoint.id))[0]).toMatchObject({ id: ok.delivery, event: PING, status: "sent", attempts: 1 });
    answer = () => ({ status: 401, text: "bad signature" });
    const bad = (await request(app).post(`${base}/${endpoint.id}/test`).expect(200)).body;
    expect(bad).toMatchObject({ ok: false, code: 401, error: "It answered 401: bad signature" });
    expect((await log(endpoint.id))[0]).toMatchObject({ event: PING, status: "failed", attempts: 1, nextAt: null });
    expect(await one(endpoint.id)).toMatchObject({ failures: 0, enabled: true, lastError: "It answered 401: bad signature" });
    // It was sent at once, not through the queue.
    expect(await prisma.task.count({ where: { kind: WEBHOOK_TASK } })).toBe(0);
    // A secret renewed: the next ping is signed with the new one.
    const renewed = (await request(app).post(`${base}/${endpoint.id}/secret`).expect(200)).body.secret as string;
    answer = () => ({ status: 200 });
    await request(app).post(`${base}/${endpoint.id}/test`).expect(200);
    expect([signedBy(renewed, calls.at(-1)!), signedBy(secret, calls.at(-1)!)]).toEqual([true, false]);
  });

  test("the log is kept two weeks, the newest first, a page at a time; deleting an endpoint takes its deliveries", async () => {
    const { endpoint } = await made();
    const day = 24 * 60 * 60_000;
    await prisma.webhookDelivery.createMany({ data: Array.from({ length: 55 }, (_, i) => ({ endpointId: endpoint.id, event: "row.added", eventId: `evt_${i}`, body: "{}", status: "sent", createdAt: new Date(Date.now() - i * 60_000) })) });
    await prisma.webhookDelivery.create({ data: { endpointId: endpoint.id, event: "row.added", eventId: "evt_old", body: "{}", status: "sent", createdAt: new Date(Date.now() - (WEBHOOK_LIMITS.keepDays + 1) * day) } });
    const first = (await request(app).get(`${base}/${endpoint.id}/deliveries`).expect(200)).body as { deliveries: Delivery[]; next: string | null };
    expect([first.deliveries.length, first.deliveries[0].eventId, first.next !== null]).toEqual([50, "evt_0", true]);
    const second = (await request(app).get(`${base}/${endpoint.id}/deliveries`).query({ before: first.next! }).expect(200)).body as { deliveries: Delivery[]; next: string | null };
    expect([second.deliveries.length, second.deliveries.at(-1)!.eventId, second.next]).toEqual([6, "evt_old", null]);
    expect(await cleanDeliveries()).toEqual({ removed: 1 });
    expect(await prisma.webhookDelivery.count({ where: { endpointId: endpoint.id } })).toBe(55);
    await request(app).get(`${base}/${endpoint.id}/deliveries/no-such`).expect(404);
    await request(app).delete(`${base}/${endpoint.id}`).expect(200);
    expect(await prisma.webhookDelivery.count()).toBe(0);
  });
});
