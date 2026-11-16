import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { resetCodeForTests } from "../lib/fnCode.js";
import type { FnDef } from "../lib/fnDef.js";
import { TEST_LIMITS, TestsSchema, alike, testsOf, verdict, type FnTest } from "../lib/fnTests.js";
import { resetRunsForTests } from "../lib/runs.js";

// A function's own tests (F4), with the database: what it is handed and what must come of it, kept
// beside the function. They run the draft as try-outs (nothing is written or sent) when asked and
// before every publish; one that doesn't pass stops the publish. Requests to /v1/admin without a
// token run as the test owner.

const PREFIX = "fntest-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
type Result = { id: string; name: string; pass: boolean; why: string | null; ok: boolean; value: unknown; error: string | null; failedAt: string | null; ms: number };
type Ran = { results: Result[]; passed: number; failed: number; ms: number };

const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const rowsOf = (id: string) => prisma.collectionItem.findMany({ where: { collectionId: id, deletedAt: null }, orderBy: { slug: "asc" } });
const make = async (name: string, def: Partial<FnDef>, tests?: FnTest[]) => {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def }, ...(tests ? { tests } : {}) }).expect(200)).body;
  expect(saved.problems).toEqual([]);
  return made.id as string;
};
const runTests = async (id: string) => (await request(app).post(`${at}/${id}/tests/run`).expect(200)).body as Ran;
const lines = (ran: Ran) => ran.results.map((r) => `${r.id}: ${r.pass ? "pass" : r.why}`);

let members = "";
async function clean(tables = false) {
  await resetRunsForTests();
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.outboxMessage.deleteMany({ where: { to: { endsWith: "@fntest-spec.test" } } });
  if (members) await prisma.collectionItem.deleteMany({ where: { collectionId: members } });
  if (!tables) return;
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
}
beforeAll(async () => {
  await clean(true);
  members = await mk(`${PREFIX}members`, [
    { id: "name", type: "text", required: true },
    { id: "email", type: "email", unique: true },
    { id: "age", type: "number" },
  ]);
});
beforeEach(() => clean());
afterAll(async () => {
  await clean(true);
  resetCodeForTests();
});

/** Joins a member: it needs an email, an age of 18 or more, and it greets them. */
const JOIN: Partial<FnDef> = {
  inputs: [{ name: "name", type: "text", required: true }, { name: "email", type: "text" }, { name: "age", type: "number" }],
  do: [
    { act: "if", if: [{ left: "{{input.email}}", cmp: "empty" }], do: [{ act: "stop", message: "An email is needed" }] },
    { act: "if", if: [{ left: "{{input.age}}", cmp: "lt", right: 18 }], do: [{ act: "stop", message: "Members are 18 or older" }] },
    { act: "add", table: "", values: { name: "{{input.name}}", email: "{{input.email}}", age: "{{input.age}}" }, status: "PUBLISHED", as: "made" },
    { act: "email", to: "{{input.email}}", subject: "Welcome", text: "Hello {{input.name}}" },
    { act: "return", value: { joined: true, name: "{{input.name}}", by: "{{caller.email}}" } },
  ],
};
const join = (): Partial<FnDef> => ({ ...JOIN, do: JOIN.do!.map((s) => (s.act === "add" ? { ...s, table: members } : s)) });
const T: Record<string, FnTest> = {
  ok: { id: "ok01", name: "A grown-up joins", input: { name: "Sara", email: "sara@fntest-spec.test", age: 30 }, expect: { ok: true } },
  answer: { id: "ans1", name: "It says who joined", input: { name: "Lina", email: "lina@fntest-spec.test", age: 22 }, caller: { email: "Desk@Shop.test" }, expect: { ok: true, value: { by: "desk@shop.test", name: "Lina", joined: true } } },
  noEmail: { id: "noem", name: "No email: refused", input: { name: "Maya", age: 40 }, expect: { ok: false, error: "an EMAIL is needed" } },
  young: { id: "yng1", name: "Too young: refused", input: { name: "Nour", email: "nour@fntest-spec.test", age: 12 }, expect: { ok: false } },
};

describe("A function's own tests", () => {
  test("the rule itself: a test's shape, the same answer, and what an outcome means for a test", () => {
    expect(TestsSchema.safeParse(Object.values(T)).success).toBe(true);
    expect(TestsSchema.safeParse([T.ok, { ...T.young, id: "ok01" }]).success).toBe(false);
    expect(TestsSchema.safeParse([{ ...T.ok, id: "Not An Id" }]).success).toBe(false);
    expect(TestsSchema.safeParse([{ ...T.ok, name: " " }]).success).toBe(false);
    expect(TestsSchema.safeParse([{ ...T.ok, input: { big: "x".repeat(TEST_LIMITS.input) } }]).success).toBe(false);
    expect(TestsSchema.safeParse([{ ...T.ok, expect: { ok: true, extra: 1 } }]).success).toBe(false);
    expect(TestsSchema.safeParse(Array.from({ length: TEST_LIMITS.tests + 1 }, (_, k) => ({ ...T.ok, id: `t${1000 + k}` }))).success).toBe(false);
    // What isn't a list of tests is none (a function saved before there were tests).
    expect(testsOf(null)).toEqual([]);
    expect(testsOf([{ nonsense: true }])).toEqual([]);
    expect(testsOf([T.ok])).toEqual([T.ok]);

    // The same answer: numbers by their worth, things whatever order their fields were written in, lists in theirs.
    expect(alike({ a: 1, b: [1, "x", null] }, { b: [1, "x", null], a: "1" })).toBe(true);
    expect(alike(5, "5")).toBe(true);
    expect(alike(null, undefined)).toBe(true);
    expect(alike([1, 2], [2, 1])).toBe(false);
    expect(alike({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(alike("5", "5.0")).toBe(false);
    expect(alike(true, "true")).toBe(false);
    expect(alike(0, null)).toBe(false);

    const out = (ok: boolean, value: unknown = null, error: string | null = null) => ({ ok, value, error });
    expect(verdict({ expect: { ok: true } }, out(true, 7))).toBeNull();
    expect(verdict({ expect: { ok: true } }, out(false, null, "No stock"))).toBe("stopped");
    expect(verdict({ expect: { ok: true, value: 7 } }, out(true, 7))).toBeNull();
    expect(verdict({ expect: { ok: true, value: 7 } }, out(true, 8))).toBe("value");
    // Expecting nothing in particular is not expecting nothing.
    expect(verdict({ expect: { ok: true, value: null } }, out(true, 8))).toBe("value");
    expect(verdict({ expect: { ok: false } }, out(false, null, "anything"))).toBeNull();
    expect(verdict({ expect: { ok: false } }, out(true, 1))).toBe("wentThrough");
    expect(verdict({ expect: { ok: false, error: "no STOCK" } }, out(false, null, "Sorry: No stock left"))).toBeNull();
    expect(verdict({ expect: { ok: false, error: "no stock" } }, out(false, null, "An email is needed"))).toBe("reason");
  });

  test("are kept beside the function: saved with it, checked for their shape, and no change to what is published", async () => {
    const id = await make("kept", join(), [T.ok, T.noEmail]);
    expect((await request(app).get(`${at}/${id}`).expect(200)).body.tests).toEqual([T.ok, T.noEmail]);
    await request(app).post(`${at}/${id}/publish`).expect(200);
    // A test added after publishing: the function is still as published.
    const saved = (await request(app).put(`${at}/${id}`).send({ tests: [T.ok, T.noEmail, T.young] }).expect(200)).body;
    expect(saved).toMatchObject({ published: true, changed: false });
    expect(saved.tests.map((t: FnTest) => t.id)).toEqual(["ok01", "noem", "yng1"]);
    // Saving the steps alone leaves the tests as they were.
    expect((await request(app).put(`${at}/${id}`).send({ name: `${PREFIX}kept renamed` }).expect(200)).body.tests).toHaveLength(3);
    // A list that isn't tests is refused, with where.
    const bad = await request(app).put(`${at}/${id}`).send({ tests: [{ ...T.ok, expect: { ok: "yes" } }] }).expect(400);
    expect(bad.body).toMatchObject({ error: "FN_TESTS_INVALID", details: { issues: [{ at: "0.expect.ok" }] } });
    expect((await request(app).get(`${at}/${id}`).expect(200)).body.tests).toHaveLength(3);
    // The builder is told how many a function keeps.
    expect((await request(app).get(at).expect(200)).body.limits.tests).toBe(TEST_LIMITS.tests);
  });

  test("run against the draft as try-outs: how each went, and nothing is written or sent", async () => {
    const id = await make("run", join(), [T.ok, T.answer, T.noEmail, T.young]);
    const ran = await runTests(id);
    expect(lines(ran)).toEqual(["ok01: pass", "ans1: pass", "noem: pass", "yng1: pass"]);
    expect(ran).toMatchObject({ passed: 4, failed: 0 });
    // What each run came to is said beside it.
    expect(ran.results[1]).toMatchObject({ ok: true, value: { joined: true, name: "Lina", by: "desk@shop.test" }, error: null });
    expect(ran.results[2]).toMatchObject({ ok: false, error: "An email is needed", failedAt: "do.0.do.0" });
    // Try-outs: no member was added, no email queued.
    expect(await rowsOf(members)).toEqual([]);
    expect(await prisma.outboxMessage.count({ where: { to: { endsWith: "@fntest-spec.test" } } })).toBe(0);
    // No tests: nothing to run.
    const bare = await make("bare", join());
    expect(await runTests(bare)).toMatchObject({ results: [], passed: 0, failed: 0 });
  });

  test("a test that doesn't pass says why: it stopped, it went through, another answer, another reason", async () => {
    const id = await make("why", join(), [
      { ...T.ok, id: "w001", input: { name: "Sara", age: 30 } },
      { ...T.young, id: "w002", input: { name: "Nour", email: "nour@fntest-spec.test", age: 20 } },
      { ...T.answer, id: "w003", expect: { ok: true, value: { joined: false } } },
      { ...T.noEmail, id: "w004", expect: { ok: false, error: "too young" } },
      T.ok,
    ]);
    const ran = await runTests(id);
    expect(lines(ran)).toEqual(["w001: stopped", "w002: wentThrough", "w003: value", "w004: reason", "ok01: pass"]);
    expect(ran).toMatchObject({ passed: 1, failed: 4 });
    expect(ran.results[0]).toMatchObject({ pass: false, ok: false, error: "An email is needed" });
    expect(ran.results[2]).toMatchObject({ pass: false, ok: true, value: { joined: true, name: "Lina" } });
    expect(ran.results[3]).toMatchObject({ pass: false, ok: false, error: "An email is needed" });
  });

  test("before every publish: a test that doesn't pass stops it; mended, it publishes", async () => {
    // The steps forgot the age: the test that expects a child to be refused catches it.
    const broken = { ...join(), do: join().do!.filter((_, k) => k !== 1) };
    const id = await make("gate", broken, [T.ok, T.young]);
    const refused = await request(app).post(`${at}/${id}/publish`).expect(409);
    expect(refused.body).toMatchObject({ error: "FN_TESTS_FAILED", details: { passed: 1, failed: 1 } });
    expect(refused.body.details.results.map((r: Result) => `${r.id}: ${r.pass ? "pass" : r.why}`)).toEqual(["ok01: pass", "yng1: wentThrough"]);
    expect((await request(app).get(`${at}/${id}`).expect(200)).body).toMatchObject({ published: false });
    // Nothing was written by the tests the publish ran.
    expect(await rowsOf(members)).toEqual([]);
    // The steps mended: published.
    await request(app).put(`${at}/${id}`).send({ draft: { lang: "en", inputs: [], do: [], ...join() } }).expect(200);
    expect((await request(app).post(`${at}/${id}/publish`).expect(200)).body).toMatchObject({ published: true, changed: false });
    // What is published keeps running whatever a later draft's tests say: only the publish is stopped.
    await request(app).put(`${at}/${id}`).send({ draft: { lang: "en", inputs: [], do: [], ...broken } }).expect(200);
    await request(app).post(`${at}/${id}/publish`).expect(409);
    const live = (await request(app).post(`${at}/${id}/run`).send({ input: { name: "Nour", email: "nour@fntest-spec.test", age: 12 }, dry: true, which: "live" }).expect(200)).body;
    expect(live).toMatchObject({ ok: false, error: "Members are 18 or older" });
    // A function without tests publishes as it always did; so does one whose tests were all taken out.
    await request(app).put(`${at}/${id}`).send({ tests: [] }).expect(200);
    await request(app).post(`${at}/${id}/publish`).expect(200);
  });

  test("a test has its own few seconds, and all of them together a limit: one that never got its turn didn't pass", async () => {
    // Code that never ends: the cage stops it, and the test that expected it to go through says it stopped.
    const spin = await make("spin", { do: [{ act: "code", code: "while (true) {}" }] }, [{ id: "spin", name: "Spins", input: {}, expect: { ok: true } }]);
    const one = await runTests(spin);
    expect(one.results[0]).toMatchObject({ pass: false, why: "stopped", error: "The code ran longer than 2 seconds" });
    // The whole list's time used up: the ones after it are told so, without being run.
    const id = await make("late", join(), [T.ok, T.noEmail, T.young]);
    const limits = TEST_LIMITS as { total: number };
    const was = limits.total;
    limits.total = 1;
    try {
      const ran = await runTests(id);
      expect(ran.results[0].why).not.toBe("time");
      expect(ran.results.slice(1).map((r) => [r.pass, r.why, r.ms])).toEqual([[false, "time", 0], [false, "time", 0]]);
    } finally {
      limits.total = was;
    }
  });
});
