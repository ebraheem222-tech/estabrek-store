import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import type { FnDef } from "../lib/fnDef.js";
import { CALL_KEY, askedPrint, cleanCallKeys } from "../lib/fnCallKeys.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { forgetHits } from "../lib/hitLimit.js";
import { flushRuns, resetRunsForTests } from "../lib/runs.js";
import { resetTasksForTests, runTasks } from "../lib/tasks.js";
import { forgetShoppers } from "../middleware/apiCaller.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// A call that isn't run twice, with the database: a request that names itself (Idempotency-Key)
// runs once; the same key again is answered with the first answer. Requests to /v1/admin without
// a token run as the test owner.

const PREFIX = "fnkey-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
let sara = "";
let noor = "";

/** A function that rings the bell and gives back what it was told; called at `address` by `who`. */
async function made(name: string, who: "public" | "customer" = "public", def?: Partial<FnDef>) {
  const id = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body.id as string;
  const steps: Partial<FnDef> = def ?? {
    inputs: [{ name: "word", type: "text" }],
    do: [{ act: "notify", title: `${PREFIX}{{input.word}}` }, { act: "if", if: [{ left: "{{input.word}}", cmp: "eq", right: "no" }], do: [{ act: "stop", message: "Not like this" }] }, { act: "return", value: { said: "{{input.word}}", at: "{{now}}" } }],
  };
  await request(app).put(`${at}/${id}`).send({ draft: { lang: "en", inputs: [], do: [], ...steps } }).expect(200);
  await request(app).post(`${at}/${id}/publish`).expect(200);
  const address = `${PREFIX}${name}`;
  await request(app).post(`${at}/${id}/triggers`).send({ kind: "call", config: { who }, slug: address }).expect(201);
  return { id, address };
}
const call = (address: string, input: Record<string, unknown>, key?: string) => {
  const req = request(app).post(`/v1/fn/${address}`);
  return (key === undefined ? req : req.set("Idempotency-Key", key)).send({ input });
};
const rang = async () => (await prisma.adminNotification.findMany({ where: { title: { startsWith: PREFIX } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })).map((n) => n.title.slice(PREFIX.length));
const logged = async () => {
  await flushRuns();
  await flushRuns();
  return prisma.run.findMany({ where: { kind: "function", name: { startsWith: PREFIX } }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] });
};
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
  await prisma.run.deleteMany({ where: { OR: [{ kind: "function", name: { startsWith: PREFIX } }, { kind: "task", name: "function" }] } });
  await prisma.fnCallKey.deleteMany({});
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
  forgetTriggers();
  forgetHits();
  forgetShoppers();
}
beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@fnkey-spec.test" } } });
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: true } });
  forgetFeatures();
  sara = signCustomerToken((await prisma.user.create({ data: { email: "sara@fnkey-spec.test", name: "Sara" } })).id);
  noor = signCustomerToken((await prisma.user.create({ data: { email: "noor@fnkey-spec.test", name: "Noor" } })).id);
  await resetTasksForTests();
  startFunctions();
});
beforeEach(clean);
afterAll(async () => {
  await clean();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@fnkey-spec.test" } } });
});

describe("The rules, by themselves", () => {
  test("what a key looks like; the same things asked print the same", () => {
    for (const ok of ["a", "order-123", "9f1c2e0a-7b1d-4c55-9d2a-1f2e3d4c5b6a", "pay_2026.11.16:1", "x".repeat(100)]) expect([ok, CALL_KEY.pattern.test(ok)]).toEqual([ok, true]);
    for (const bad of ["", "has space", "x".repeat(101), "ключ", "a/b", "a\nb", "{{secret}}"]) expect([bad, CALL_KEY.pattern.test(bad)]).toEqual([bad, false]);
    expect(askedPrint({ a: 1, b: { c: [1, 2], d: "x" } })).toBe(askedPrint({ b: { d: "x", c: [1, 2] }, a: 1 }));
    expect(askedPrint({ a: 1 })).not.toBe(askedPrint({ a: 2 }));
    expect(askedPrint({ list: [1, 2] })).not.toBe(askedPrint({ list: [2, 1] }));
    expect(askedPrint(undefined)).toBe(askedPrint(null));
  });
});

describe("A call that names its request", () => {
  test("runs once: the same key again is answered with the first answer, and nothing runs", async () => {
    const { address } = await made("once");
    const first = await call(address, { word: "hello" }, "order-1").expect(200);
    expect(first.body).toMatchObject({ ok: true, value: { said: "hello" } });
    expect(first.headers["idempotent-replayed"]).toBeUndefined();
    const again = await call(address, { word: "hello" }, "order-1").expect(200);
    // The very same answer (the moment in it is the first run's), and the first run's line in the log.
    expect(again.body).toEqual(first.body);
    expect(again.headers["idempotent-replayed"]).toBe("true");
    expect(again.headers["x-run-id"]).toBe(first.headers["x-run-id"]);
    expect(await rang()).toEqual(["hello"]);
    expect(await logged()).toHaveLength(1);
    // Another key is another request; with no key every call runs, as before.
    await call(address, { word: "hello" }, "order-2").expect(200);
    await call(address, { word: "hello" }).expect(200);
    await call(address, { word: "hello" }).expect(200);
    expect(await rang()).toEqual(["hello", "hello", "hello", "hello"]);
  });

  test("a call that stopped is kept too: asked again, it stops the same way without running", async () => {
    const { address } = await made("stops");
    const first = await call(address, { word: "no" }, "k1").expect(422);
    expect(first.body).toEqual({ ok: false, error: "Not like this" });
    const again = await call(address, { word: "no" }, "k1").expect(422);
    expect(again.body).toEqual(first.body);
    expect(again.headers["idempotent-replayed"]).toBe("true");
    expect(await rang()).toEqual(["no"]);
  });

  test("a key names one request: something else asked under it is refused, and so is a key that isn't one", async () => {
    const { address } = await made("other");
    await call(address, { word: "one" }, "k1").expect(200);
    expect((await call(address, { word: "two" }, "k1").expect(409)).body.error).toBe("IDEMPOTENCY_KEY_REUSED");
    expect((await call(address, { word: "one" }, "not a key").expect(400)).body.error).toBe("IDEMPOTENCY_KEY_INVALID");
    expect((await call(address, { word: "one" }, "x".repeat(101)).expect(400)).body.error).toBe("IDEMPOTENCY_KEY_INVALID");
    expect(await rang()).toEqual(["one"]);
  });

  test("a key is its caller's own, at its own address", async () => {
    const mine = await made("mine", "customer");
    const theirs = await made("theirs", "customer");
    const as = (token: string, address: string, word: string, key: string) => call(address, { word }, key).set("Authorization", `Bearer ${token}`);
    await as(sara, mine.address, "sara", "same-key").expect(200);
    // Another shopper with the same key, and the same shopper at another address: each is its own request.
    expect((await as(noor, mine.address, "noor", "same-key").expect(200)).headers["idempotent-replayed"]).toBeUndefined();
    expect((await as(sara, theirs.address, "elsewhere", "same-key").expect(200)).headers["idempotent-replayed"]).toBeUndefined();
    expect((await as(sara, mine.address, "sara", "same-key").expect(200)).headers["idempotent-replayed"]).toBe("true");
    expect(await rang()).toEqual(["sara", "noor", "elsewhere"]);
    expect((await prisma.fnCallKey.findMany({ orderBy: { createdAt: "asc" } })).map((k) => [k.who.split(":")[0], k.state, k.status])).toEqual([["customer", "done", 200], ["customer", "done", 200], ["customer", "done", 200]]);
  });

  test("while the first call is still running the second is told so; one that never finished holds its key", async () => {
    const { id, address } = await made("slow");
    const trigger = (await prisma.fnTrigger.findFirstOrThrow({ where: { fnId: id, kind: "call" } })).id;
    // How this test's own address is written here (anyone may call, so the caller is its address).
    await call(address, { word: "probe" }, "probe").expect(200);
    const who = (await prisma.fnCallKey.findFirstOrThrow({ where: { key: "probe" } })).who;
    expect(who).toMatch(/^ip:/);
    await prisma.fnCallKey.deleteMany({});
    await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
    // As it is while the first call runs: the key taken, no answer yet.
    await prisma.fnCallKey.create({ data: { triggerId: trigger, who, key: "k1", asked: askedPrint({ word: "hi" }) } });
    const second = await call(address, { word: "hi" }, "k1").expect(409);
    expect(second.body.error).toBe("IN_PROGRESS");
    expect(second.headers["retry-after"]).toBe("2");
    // Long after, still unanswered: the server stopped mid-run. Nobody knows how far it got, so it isn't run again under this key.
    await prisma.fnCallKey.updateMany({ data: { createdAt: new Date(Date.now() - 10 * 60_000) } });
    const stuck = await call(address, { word: "hi" }, "k1").expect(409);
    expect(stuck.body).toMatchObject({ error: "FIRST_CALL_UNFINISHED" });
    expect(stuck.headers["retry-after"]).toBeUndefined();
    expect(await rang()).toEqual([]);
  });

  test("a call that never ran frees its key; a key is forgotten after its day", async () => {
    const { id, address } = await made("gone");
    // Switched off between the look at the address and the run: the address isn't one, and the key isn't spent.
    await prisma.fn.update({ where: { id }, data: { enabled: false } });
    await call(address, { word: "hi" }, "k1").expect(404);
    expect(await prisma.fnCallKey.count()).toBe(0);
    await prisma.fn.update({ where: { id }, data: { enabled: true } });
    forgetTriggers();
    await call(address, { word: "hi" }, "k1").expect(200);
    expect(await rang()).toEqual(["hi"]);
    // A day later the key is forgotten: the same key is a new request.
    expect((await cleanCallKeys()).removed).toBe(0);
    await prisma.fnCallKey.updateMany({ data: { createdAt: new Date(Date.now() - CALL_KEY.keepMs - 60_000) } });
    expect((await cleanCallKeys()).removed).toBe(1);
    expect((await call(address, { word: "hi" }, "k1").expect(200)).headers["idempotent-replayed"]).toBeUndefined();
    expect(await rang()).toEqual(["hi", "hi"]);
  });

  test("an answer too big to keep is said to be so when asked again, and still isn't run twice", async () => {
    const { address } = await made("big", "public", { inputs: [{ name: "n", type: "number" }], do: [{ act: "notify", title: `${PREFIX}big` }, { act: "code", code: "return 'x'.repeat(input.n);", give: { n: "{{input.n}}" }, as: "text" }, { act: "return", value: ["{{text}}", "{{text}}"] }] });
    const first = await call(address, { n: 200_000 }, "k1").expect(200);
    expect(JSON.stringify(first.body).length).toBeGreaterThan(CALL_KEY.answer);
    const again = await call(address, { n: 200_000 }, "k1").expect(409);
    expect(again.body).toMatchObject({ ok: false, error: "ANSWER_NOT_KEPT" });
    expect(again.headers["x-run-id"]).toBe(first.headers["x-run-id"]);
    expect(await rang()).toEqual(["big"]);
  });
});

describe("A webhook delivery that names itself", () => {
  test("is taken in once: the sender's retry isn't a second run", async () => {
    const id = (await request(app).post(at).send({ name: `${PREFIX}hook` }).expect(201)).body.id as string;
    await request(app).put(`${at}/${id}`).send({ draft: { lang: "en", inputs: [{ name: "body", type: "any" }], do: [{ act: "notify", title: `${PREFIX}{{input.body.event}}` }] } }).expect(200);
    await request(app).post(`${at}/${id}/publish`).expect(200);
    const hook = ((await request(app).post(`${at}/${id}/triggers`).send({ kind: "webhook" }).expect(201)).body.triggers as Array<{ address: string }>).at(-1)!.address;
    await request(app).post(hook).set("Idempotency-Key", "evt_1").send({ event: "paid" }).expect(202);
    await request(app).post(hook).set("Idempotency-Key", "evt_1").send({ event: "paid" }).expect(202);
    await request(app).post(hook).set("Idempotency-Key", "evt_2").send({ event: "shipped" }).expect(202);
    await settled();
    expect(await rang()).toEqual(["paid", "shipped"]);
    // A delivery with no name is taken every time, as before; a name that isn't one is refused.
    await request(app).post(hook).send({ event: "again" }).expect(202);
    await request(app).post(hook).send({ event: "again" }).expect(202);
    await settled();
    expect(await rang()).toEqual(["paid", "shipped", "again", "again"]);
    expect((await request(app).post(hook).set("Idempotency-Key", "not a key").send({}).expect(400)).body.error).toBe("IDEMPOTENCY_KEY_INVALID");
  });
});
