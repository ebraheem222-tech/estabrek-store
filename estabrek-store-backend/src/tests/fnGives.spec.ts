import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { FnDefSchema, type FnDef } from "../lib/fnDef.js";
import { GIVE_LIMITS, GivesSchema, answerProblem, kindOf, type Gives } from "../lib/fnGives.js";
import { verdict } from "../lib/fnTests.js";
import { flushRuns, resetRunsForTests } from "../lib/runs.js";

// What a function promises to give back, with the database: the kind of its answer and a thing's
// fields. A try-out says when the answer isn't that; one of its own tests that goes through with
// another shape stops the publish; a real run isn't failed over it, its line in the log says so.
// Requests to /v1/admin without a token run as the test owner.

const PREFIX = "fngives-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
const ORDER: Gives = { type: "thing", fields: [{ name: "id", type: "text", required: true }, { name: "total", type: "number", required: true }, { name: "note", type: "text" }, { name: "tags", type: "list" }, { name: "more", type: "any" }] };

const make = async (name: string, def: Partial<FnDef>) => {
  const id = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body.id as string;
  const saved = (await request(app).put(`${at}/${id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  return { id, saved };
};
const run = async (id: string, input: Record<string, unknown>, opts: { dry?: boolean; which?: "draft" | "live" } = {}) => (await request(app).post(`${at}/${id}/run`).send({ input, dry: true, which: "draft", ...opts }).expect(200)).body;
const logged = async () => {
  await flushRuns();
  await flushRuns();
  return prisma.run.findMany({ where: { kind: "function", name: { startsWith: PREFIX } }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] });
};

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
}
beforeEach(clean);
afterAll(clean);

describe("The promise, by itself", () => {
  test("its shape: a kind, and fields for a thing or a list of things", () => {
    for (const ok of [{ type: "any" }, { type: "text" }, { type: "list" }, ORDER, { type: "list", fields: [{ name: "id", type: "text" }] }, { type: "thing", fields: [] }]) expect([ok, GivesSchema.safeParse(ok).success]).toEqual([ok, true]);
    for (const bad of [{}, { type: "date" }, { type: "text", fields: [{ name: "x", type: "text" }] }, { type: "thing", fields: [{ name: "a", type: "text" }, { name: "a", type: "number" }] }, { type: "thing", fields: [{ name: "has space", type: "text" }] }, { type: "thing", fields: [{ name: "x", type: "money" }] }, { type: "thing", extra: 1 }, { type: "thing", fields: Array.from({ length: GIVE_LIMITS.fields + 1 }, (_, k) => ({ name: `f${k}`, type: "any" })) }])
      expect([bad, GivesSchema.safeParse(bad).success]).toEqual([bad, false]);
    // It is part of the function's definition; one without it is as it always was.
    expect(FnDefSchema.safeParse({ inputs: [], do: [], gives: ORDER }).success).toBe(true);
    expect(FnDefSchema.safeParse({ inputs: [], do: [] }).success).toBe(true);
    expect(FnDefSchema.safeParse({ inputs: [], do: [], gives: { type: "money" } }).success).toBe(false);
    expect([null, undefined, "", 0, false, [], {}].map(kindOf)).toEqual(["nothing", "nothing", "text", "number", "bool", "list", "thing"]);
  });

  test("an answer that keeps it, and each way one doesn't", () => {
    expect(answerProblem(undefined, 5)).toBeNull();
    expect(answerProblem({ type: "any" }, null)).toBeNull();
    expect(answerProblem({ type: "text" }, "hi")).toBeNull();
    expect(answerProblem({ type: "text" }, 5)).toBe("It promises text and gave back a number");
    expect(answerProblem({ type: "number" }, "5")).toBe("It promises a number and gave back text");
    expect(answerProblem({ type: "bool" }, null)).toBe("It promises yes/no and gave back nothing");
    expect(answerProblem({ type: "list" }, { a: 1 })).toBe("It promises a list and gave back a thing");
    expect(answerProblem({ type: "thing" }, [1])).toBe("It promises a thing and gave back a list");
    // A thing's fields: the ones that must be there, and the kind of each that is.
    expect(answerProblem(ORDER, { id: "A-1", total: 120 })).toBeNull();
    expect(answerProblem(ORDER, { id: "A-1", total: 120, note: null, tags: ["vip"], more: { anything: true }, extra: "is fine" })).toBeNull();
    expect(answerProblem(ORDER, { total: 120 })).toBe('"id" is promised and isn\'t there');
    expect(answerProblem(ORDER, { id: "A-1", total: null })).toBe('"total" is promised and isn\'t there');
    expect(answerProblem(ORDER, { id: "A-1", total: "120" })).toBe('"total" is promised to be a number and is text');
    expect(answerProblem(ORDER, { id: "A-1", total: 1, tags: "vip" })).toBe('"tags" is promised to be a list and is text');
    // A list of things: each one, by its place; only so many are looked at.
    const rows: Gives = { type: "list", fields: [{ name: "name", type: "text", required: true }] };
    expect(answerProblem(rows, [])).toBeNull();
    expect(answerProblem(rows, [{ name: "a" }, { name: "b" }])).toBeNull();
    expect(answerProblem(rows, [{ name: "a" }, "b"])).toBe("Item 2 of the list is promised to be a thing and is text");
    expect(answerProblem(rows, [{ name: "a" }, { name: 5 }])).toBe('Item 2 of the list: "name" is promised to be text and is a number');
    expect(answerProblem(rows, [{ name: "a" }, {}])).toBe('Item 2 of the list: "name" is promised and isn\'t there');
    expect(answerProblem(rows, [...Array.from({ length: GIVE_LIMITS.items }, () => ({ name: "ok" })), { name: 5 }])).toBeNull();
    expect(answerProblem({ type: "list" }, [1, "two", null])).toBeNull();
  });

  test("a test that goes through with another shape doesn't pass; one that is to stop isn't asked", () => {
    const fine = { ok: true, value: "x", error: null };
    expect(verdict({ expect: { ok: true } }, fine)).toBeNull();
    expect(verdict({ expect: { ok: true } }, { ...fine, shape: "It promises a number and gave back text" })).toBe("shape");
    // Its own expected answer comes first: that is what the test is about.
    expect(verdict({ expect: { ok: true, value: "y" } }, { ...fine, shape: "…" })).toBe("value");
    expect(verdict({ expect: { ok: true, value: "x" } }, { ...fine, shape: "…" })).toBe("shape");
    expect(verdict({ expect: { ok: false } }, { ok: false, value: null, error: "no" })).toBeNull();
  });
});

describe("A function that promises its answer", () => {
  const steps = (total: unknown): Partial<FnDef> => ({ inputs: [{ name: "id", type: "text" }], do: [{ act: "if", if: [{ left: "{{input.id}}", cmp: "empty" }], do: [{ act: "stop", message: "Which order?" }] }, { act: "return", value: { id: "{{input.id}}", total: total as never } }], gives: ORDER });

  test("the promise is kept with its steps: saved, published as a version, and told to a function that calls it", async () => {
    const { id, saved } = await make("kept", steps(120));
    expect(saved.draft.gives).toEqual(ORDER);
    expect(saved.problems).toEqual([]);
    // Not a promise: the draft isn't saved like that.
    await request(app).put(`${at}/${id}`).send({ draft: { inputs: [], do: [], gives: { type: "money" } } }).expect(400);
    const listed = async () => (await request(app).get(at).expect(200)).body.functions.find((f: { id: string }) => f.id === id);
    expect((await listed()).gives).toBeNull();
    await request(app).post(`${at}/${id}/publish`).expect(200);
    expect((await listed()).gives).toEqual(ORDER);
    expect((await request(app).get(`${at}/${id}/versions/1`).expect(200)).body.def.gives).toEqual(ORDER);
  });

  test("a try-out says when the answer isn't what is promised, and still gives it; one that stops isn't asked", async () => {
    const good = await make("good", steps(120));
    expect(await run(good.id, { id: "A-1" })).toMatchObject({ ok: true, value: { id: "A-1", total: 120 } });
    expect((await run(good.id, { id: "A-1" })).shape).toBeUndefined();
    const bad = await make("bad", steps("a lot"));
    expect(await run(bad.id, { id: "A-1" })).toMatchObject({ ok: true, value: { id: "A-1", total: "a lot" }, shape: '"total" is promised to be a number and is text' });
    const stopped = await run(bad.id, {});
    expect(stopped).toMatchObject({ ok: false, error: "Which order?" });
    expect(stopped.shape).toBeUndefined();
    // Going through without giving anything back isn't the promised thing either.
    const silent = await make("silent", { do: [{ act: "set", name: "x", value: 1 }], gives: { type: "text" } });
    expect((await run(silent.id, {})).shape).toBe("It promises text and gave back nothing");
  });

  test("its own tests hold it to the promise before it is published", async () => {
    const { id } = await make("gate", steps("a lot"));
    await request(app).put(`${at}/${id}`).send({ tests: [{ id: "test1", name: "an order comes back", input: { id: "A-1" }, expect: { ok: true } }, { id: "test2", name: "no order stops", input: {}, expect: { ok: false, error: "which" } }] }).expect(200);
    const ran = (await request(app).post(`${at}/${id}/tests/run`).expect(200)).body;
    expect(ran).toMatchObject({ passed: 1, failed: 1 });
    expect(ran.results[0]).toMatchObject({ id: "test1", pass: false, why: "shape", said: '"total" is promised to be a number and is text', ok: true });
    expect(ran.results[1]).toMatchObject({ id: "test2", pass: true, why: null });
    expect(ran.results[1].said).toBeUndefined();
    const refused = (await request(app).post(`${at}/${id}/publish`).expect(409)).body;
    expect(refused).toMatchObject({ error: "FN_TESTS_FAILED", details: { failed: 1 } });
    // Mended: it publishes.
    await request(app).put(`${at}/${id}`).send({ draft: { lang: "en", inputs: [], do: [], ...steps(120) } }).expect(200);
    expect((await request(app).post(`${at}/${id}/tests/run`).expect(200)).body).toMatchObject({ passed: 2, failed: 0 });
    await request(app).post(`${at}/${id}/publish`).expect(200);
  });

  test("a real run isn't failed over it: the answer is given, and the run's line in the log says so", async () => {
    // (No test of its own, so nothing stopped the publish.)
    const { id } = await make("live", steps("a lot"));
    await request(app).post(`${at}/${id}/publish`).expect(200);
    const out = await run(id, { id: "A-1" }, { dry: false, which: "live" });
    expect(out).toMatchObject({ ok: true, value: { id: "A-1", total: "a lot" }, shape: '"total" is promised to be a number and is text' });
    const address = `${PREFIX}live`;
    await request(app).post(`${at}/${id}/triggers`).send({ kind: "call", config: { who: "public" }, slug: address }).expect(201);
    // Who calls its address gets the answer as it is: the promise is the owner's to keep.
    expect((await request(app).post(`/v1/fn/${address}`).send({ input: { id: "A-2" } }).expect(200)).body).toEqual({ ok: true, value: { id: "A-2", total: "a lot" } });
    const rows = await logged();
    expect(rows.map((r) => [r.ok, (r.detail as { answer?: string }).answer])).toEqual([[true, '"total" is promised to be a number and is text'], [true, '"total" is promised to be a number and is text']]);
    // One that keeps its promise has no such line.
    const good = await make("fine", steps(120));
    await request(app).post(`${at}/${good.id}/publish`).expect(200);
    await run(good.id, { id: "A-1" }, { dry: false, which: "live" });
    expect(((await logged()).at(-1)!.detail as { answer?: string }).answer).toBeUndefined();
  });
});
