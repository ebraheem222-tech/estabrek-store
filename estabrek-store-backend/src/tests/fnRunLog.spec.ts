import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import type { FnDef } from "../lib/fnDef.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { forgetHits } from "../lib/hitLimit.js";
import { RUN_STEPS_KEEP_DAYS, cleanRuns, flushRuns, resetRunsForTests } from "../lib/runs.js";
import { LOG_STEPS, stepsForLog, type TraceLine } from "../modules/functions/functions.service.js";

// What the run log keeps of a function's run, with the database: its own line under an id that
// is said to who asked for the run, the version that ran, and what each step did. Requests to
// /v1/admin without a token run as the test owner.

const PREFIX = "fnlog-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
type Step = { at: string; act: string; ok: boolean; ms: number; say?: Array<string | number>; error?: string };

async function made(name: string, def: Partial<FnDef>) {
  const id = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body.id as string;
  const saved = (await request(app).put(`${at}/${id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  expect(saved.problems).toEqual([]);
  await request(app).post(`${at}/${id}/publish`).expect(200);
  return id;
}
const run = async (id: string, input: Record<string, unknown> = {}, dry = false) => (await request(app).post(`${at}/${id}/run`).send({ input, dry, which: "live" }).expect(200)).body;
const logged = async () => {
  await flushRuns();
  await flushRuns();
  return prisma.run.findMany({ where: { kind: "function", name: { startsWith: PREFIX } }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] });
};
const detailOf = (row: { detail: unknown }) => row.detail as { v?: number; steps?: Array<Step | { cut: number }> };

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
  await prisma.outboxMessage.deleteMany({ where: { to: { endsWith: "@fnlog-spec.test" } } });
  forgetTriggers();
  forgetHits();
}
beforeEach(clean);
afterAll(clean);

describe("What is kept of a run's steps", () => {
  const line = (k: number, more: Partial<TraceLine> = {}): TraceLine => ({ at: `do.${k}`, act: "set", ok: true, ms: 1, say: ["set", "n", String(k)], note: `n = ${k}`, ...more });

  test("each step: where, what it did, how long; who a message went to isn't kept whole", () => {
    expect(stepsForLog([line(0), { at: "do.1", act: "email", ok: true, ms: 3, say: ["queued", "email", "sara.k@example.com"], note: "Queued an email to sara.k@example.com", log: ["a code step's own words"] }])).toEqual([
      { at: "do.0", act: "set", ok: true, ms: 1, say: ["set", "n", "0"] },
      { at: "do.1", act: "email", ok: true, ms: 3, say: ["queued", "email", "s•••@example.com"] },
    ]);
    // A phone number keeps its last two digits; a date, a price and an order's number stay as they are.
    const said = (text: string) => (stepsForLog([line(0, { say: ["set", "x", text] })])[0] as Step).say![2];
    expect(said("+972 59-123 4567")).toBe("•••67");
    expect(said("call 0591234567 now")).toBe("call •••67 now");
    expect(said("2026-11-16T19:41:03.000Z · 12000.50 · #100234")).toBe("2026-11-16T19:41:03.000Z · 12000.50 · #100234");
    // What is said is cut; a number stays a number; a failure keeps why.
    expect(String(said("x".repeat(500))).length).toBe(LOG_STEPS.text);
    expect(stepsForLog([{ at: "do.0", act: "find", ok: true, ms: 2, say: ["found", 3, 20] }])).toEqual([{ at: "do.0", act: "find", ok: true, ms: 2, say: ["found", 3, 20] }]);
    expect(stepsForLog([{ at: "do.2", act: "stop", ok: false, ms: 0, error: `No customer with ${"y".repeat(400)} noor@example.com` }])[0]).toMatchObject({ at: "do.2", ok: false, error: expect.stringMatching(/^No customer with y{283}$/) });
  });

  test("a long run keeps how it began and how it ended, and says how many lines aren't kept", () => {
    const short = stepsForLog(Array.from({ length: LOG_STEPS.lines }, (_, k) => line(k)));
    expect(short).toHaveLength(LOG_STEPS.lines);
    const long = stepsForLog(Array.from({ length: 100 }, (_, k) => line(k)));
    expect(long).toHaveLength(LOG_STEPS.lines + 1);
    expect((long[0] as Step).at).toBe("do.0");
    expect(long[LOG_STEPS.lines - 10]).toEqual({ cut: 100 - LOG_STEPS.lines });
    expect((long.at(-1) as Step).at).toBe("do.99");
  });
});

describe("A function's run in the log", () => {
  test("its line is under the id the run was answered with, and says the version and each step", async () => {
    const id = await made("steps", {
      inputs: [{ name: "name", type: "text" }, { name: "email", type: "text" }],
      do: [
        { act: "set", name: "greeting", value: "Hello {{input.name}}" },
        { act: "notify", title: `${PREFIX}{{greeting}}` },
        { act: "email", to: "{{input.email}}", subject: "Hi", text: "{{greeting}}" },
        { act: "return", value: "{{greeting}}" },
      ],
    });
    const out = await run(id, { name: "Sara", email: "sara@fnlog-spec.test" });
    expect(out).toMatchObject({ ok: true, value: "Hello Sara", version: 1, runId: expect.stringMatching(/^r[0-9a-f]{24}$/) });
    const rows = await logged();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: out.runId, ok: true, trigger: "admin", error: null });
    const detail = detailOf(rows[0]);
    expect(detail.v).toBe(1);
    expect((detail.steps as Step[]).map((s) => [s.at, s.act, s.ok, s.say])).toEqual([
      ["do.0", "set", true, ["set", "greeting", "Hello Sara"]],
      ["do.1", "notify", true, ["rang", `${PREFIX}Hello Sara`]],
      ["do.2", "email", true, ["queued", "email", "s•••@fnlog-spec.test"]],
      ["do.3", "return", true, ["returned"]],
    ]);
    // The page that lists the log hands it out with the run.
    const listed = (await request(app).get(`${admin}/system/runs`).query({ kind: "function", name: `${PREFIX}steps`, limit: 5 }).expect(200)).body.runs;
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: out.runId, detail: { v: 1, steps: expect.any(Array) } });
    // A try leaves nothing in the log, and has no id.
    const dry = await run(id, { name: "Noor", email: "noor@fnlog-spec.test" }, true);
    expect(dry.runId).toBeUndefined();
    expect(await logged()).toHaveLength(1);
  });

  test("a run that failed keeps the step it stopped at, with why, and what was done about it", async () => {
    const id = await made("fails", {
      inputs: [{ name: "age", type: "number" }],
      do: [{ act: "if", if: [{ left: "{{input.age}}", cmp: "lt", right: 18 }], do: [{ act: "stop", message: "Members are 18 and over" }] }, { act: "return", value: "in" }],
      fail: [{ act: "notify", title: `${PREFIX}refused: {{error}}` }],
    });
    const out = await run(id, { age: 12 });
    expect(out).toMatchObject({ ok: false, error: "Members are 18 and over", failedAt: "do.0.do.0" });
    const [row] = await logged();
    expect(row).toMatchObject({ id: out.runId, ok: false, error: "Members are 18 and over" });
    const steps = detailOf(row).steps as Step[];
    expect(steps.find((s) => !s.ok)).toMatchObject({ at: "do.0.do.0", act: "stop", error: "Members are 18 and over" });
    expect(steps.at(-1)).toMatchObject({ at: "fail.0", act: "notify", ok: true, say: ["rang", `${PREFIX}refused: Members are 18 and over`] });
  });

  test("a call to its address is answered with the run's id, whether it went through or stopped", async () => {
    const id = await made("called", { inputs: [{ name: "word", type: "text" }], do: [{ act: "if", if: [{ left: "{{input.word}}", cmp: "eq", right: "no" }], do: [{ act: "stop", message: "Not like this" }] }, { act: "return", value: "ok" }] });
    const address = `${PREFIX}called`;
    await request(app).post(`${at}/${id}/triggers`).send({ kind: "call", config: { who: "public" }, slug: address }).expect(201);
    const fine = await request(app).post(`/v1/fn/${address}`).send({ input: { word: "yes" } }).expect(200);
    const stopped = await request(app).post(`/v1/fn/${address}`).send({ input: { word: "no" } }).expect(422);
    expect(fine.headers["x-run-id"]).toMatch(/^r[0-9a-f]{24}$/);
    expect(stopped.headers["x-run-id"]).toMatch(/^r[0-9a-f]{24}$/);
    expect(stopped.headers["x-run-id"]).not.toBe(fine.headers["x-run-id"]);
    // What is answered itself is as before: the run's steps are the owner's to see, not the caller's.
    expect(fine.body).toEqual({ ok: true, value: "ok" });
    expect(stopped.body).toEqual({ ok: false, error: "Not like this" });
    expect((await logged()).map((r) => [r.id, r.trigger, r.ok])).toEqual([[fine.headers["x-run-id"], "call", true], [stopped.headers["x-run-id"], "call", false]]);
  });

  test("a fine run's steps go after their days; its line stays, and a failed run keeps its steps", async () => {
    const id = await made("old", { inputs: [{ name: "ok", type: "bool" }], do: [{ act: "if", if: [{ left: "{{input.ok}}", cmp: "eq", right: false }], do: [{ act: "stop", message: "no" }] }, { act: "return", value: "yes" }] });
    const fine = await run(id, { ok: true });
    const failed = await run(id, { ok: false });
    const fresh = await run(id, { ok: true });
    await logged();
    const longAgo = new Date(Date.now() - (RUN_STEPS_KEEP_DAYS + 1) * 86_400_000);
    await prisma.run.updateMany({ where: { id: { in: [fine.runId, failed.runId] } }, data: { startedAt: longAgo } });
    await cleanRuns();
    const byId = new Map((await logged()).map((r) => [r.id, detailOf(r)]));
    expect(byId.get(fine.runId)).toEqual({ v: 1 });
    expect(byId.get(failed.runId)?.steps?.length).toBeGreaterThan(0);
    expect(byId.get(fresh.runId)?.steps?.length).toBeGreaterThan(0);
  });
});
