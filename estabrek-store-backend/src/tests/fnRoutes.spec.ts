import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetFeatures } from "../lib/features.js";
import type { FnDef, FnInput } from "../lib/fnDef.js";
import { readInputs } from "../lib/fnInputs.js";
import { ROUTE_BASE, forgetTriggers, routePath, routeSlug } from "../lib/fnTriggers.js";
import { forgetHits } from "../lib/hitLimit.js";
import { flushRuns, resetRunsForTests } from "../lib/runs.js";
import { forgetShoppers } from "../middleware/apiCaller.js";
import { startFunctions } from "../modules/functions/functions.service.js";

// An address of the owner's own (F3): a method and a path under /v1/api, each a function's. The
// path's :names, the query's and the body's fields are the function's inputs, checked by their rules
// before it runs (every problem said, nothing run); its answer is sent as it is. And the inputs'
// rules themselves (lib/fnInputs.ts), which every run reads. With the database; requests to
// /v1/admin without a token run as the test owner.

const PREFIX = "fn-route-";
const at = "/v1/admin/functions";
type TriggerView = { id: string; kind: string; config: any; slug: string | null; address: string | null; hands: string[] };

async function fn(name: string, def: Partial<FnDef>, publish = true) {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  expect(saved.problems).toEqual([]);
  if (publish) await request(app).post(`${at}/${made.id}/publish`).expect(200);
  return made.id as string;
}
const addRoute = (id: string, config: Record<string, unknown>) => request(app).post(`${at}/${id}/triggers`).send({ kind: "route", config });
const route = async (id: string, config: Record<string, unknown>) => ((await addRoute(id, config).expect(201)).body.triggers as TriggerView[]).at(-1)!;
const runs = async () => {
  await flushRuns();
  await flushRuns();
  return prisma.run.count({ where: { kind: "function", name: { startsWith: PREFIX } } });
};

/** The order lines' function: what it was handed, and who called. */
const LINE_INPUTS: FnInput[] = [
  { name: "id", type: "text", required: true },
  { name: "qty", type: "number", required: true, min: 1, max: 10 },
  { name: "size", type: "text", choices: ["S", "M", "L"] },
  { name: "email", type: "text", format: "email" },
  { name: "note", type: "text", max: 20 },
];
const lineDef: Partial<FnDef> = { inputs: LINE_INPUTS, do: [{ act: "return", value: { id: "{{input.id}}", qty: "{{input.qty}}", size: "{{input.size}}", email: "{{input.email}}", caller: "{{caller.kind}}" } }] };

let sara = "";
async function clean() {
  await resetRunsForTests();
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.apiKey.deleteMany({ where: { name: "Route spec" } });
  forgetTriggers();
  forgetKeys();
  forgetHits();
  forgetShoppers();
}
beforeAll(async () => {
  await clean();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@fn-route.test" } } });
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: true } });
  forgetFeatures();
  sara = signCustomerToken((await prisma.user.create({ data: { email: "sara@fn-route.test", name: "Sara" } })).id);
  startFunctions();
});
beforeEach(clean);
afterAll(async () => {
  await clean();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@fn-route.test" } } });
});

describe("An address of the owner's own", () => {
  test("its method and path are checked and kept; two addresses can't share a method and a path", async () => {
    const id = await fn("lines", lineDef);
    const t = await route(id, { method: "POST", path: "/Orders/:id/lines/", who: "public", status: 201 });
    expect(t).toMatchObject({ kind: "route", config: { method: "POST", path: "orders/:id/lines", who: "public", status: 201 }, slug: null, address: `${ROUTE_BASE}/orders/:id/lines`, hands: ["id"] });
    // What isn't a path, a method or a status.
    const refused = async (config: Record<string, unknown>) => (await addRoute(id, { method: "GET", who: "public", ...config }).expect(400)).body as { error: string; message: string; details?: { at?: string } };
    const empty = await refused({ path: "" });
    expect([empty.message, empty.details?.at]).toEqual(["The address needs a path, like orders/:id", "path"]);
    expect((await refused({ path: ":id/lines" })).message).toBe("A path starts with a word, like orders/:id");
    expect((await refused({ path: "orders//lines" })).message).toBe("A path has no empty part (//)");
    expect((await refused({ path: "orders/:id/:id" })).message).toBe('":id" is in the path twice');
    expect((await refused({ path: "orders/$all" })).message).toContain('"$all" isn\'t a part of a path');
    expect((await refused({ path: "a/b/c/d/e/f/g" })).message).toBe("A path has up to 6 parts");
    expect((await addRoute(id, { method: "HEAD", path: "orders", who: "public" }).expect(400)).body.error).toBe("TRIGGER_INVALID");
    expect((await addRoute(id, { method: "GET", path: "orders", who: "public", status: 203 }).expect(400)).body.error).toBe("TRIGGER_INVALID");
    // The same method and path (its :names named otherwise) is taken, by this function or another; another method isn't.
    const other = await fn("other", { do: [{ act: "return", value: "other" }] });
    expect((await addRoute(other, { method: "POST", path: "orders/:code/lines", who: "public" }).expect(409)).body.error).toBe("ROUTE_TAKEN");
    const get = await route(other, { method: "GET", path: "orders/:code/lines", who: "public" });
    expect((await request(app).put(`${at}/${other}/triggers/${get.id}`).send({ config: { method: "POST", path: "orders/:x/lines", who: "public" } }).expect(409)).body.error).toBe("ROUTE_TAKEN");
    await request(app).put(`${at}/${other}/triggers/${get.id}`).send({ config: { method: "GET", path: "orders/:code/lines/all", who: "key" } }).expect(200);
    expect((await prisma.fnTrigger.findUniqueOrThrow({ where: { id: get.id } })).slug).toBe("GET orders/:/lines/all");
  });

  test("a request reaches it by its method and path: the path's :names, the query and the body are its inputs, and its answer is sent as it is", async () => {
    const id = await fn("lines", lineDef);
    await route(id, { method: "POST", path: "orders/:id/lines", who: "public", status: 201 });
    const sent = await request(app).post(`${ROUTE_BASE}/orders/A-17/lines?size=M`).send({ qty: "3", email: "sara@example.test", id: "not-this" }).expect(201);
    expect(sent.body).toEqual({ id: "A-17", qty: 3, size: "M", email: "sara@example.test", caller: "public" });
    expect(sent.headers["x-run-id"]).toBeTruthy();
    expect(sent.headers["cache-control"]).toBe("no-store");
    // A part sent encoded, a word in other letters.
    expect((await request(app).post(`${ROUTE_BASE}/ORDERS/a%20b/lines`).send({ qty: 1 }).expect(201)).body.id).toBe("a b");
    // Another method on the same path: 405, and what it takes. An address that isn't one: 404.
    const wrong = await request(app).get(`${ROUTE_BASE}/orders/A-17/lines`).expect(405);
    expect([wrong.body.error, wrong.headers.allow]).toEqual(["METHOD_NOT_ALLOWED", "POST"]);
    expect((await request(app).post(`${ROUTE_BASE}/orders/A-17`).send({}).expect(404)).body.error).toBe("NOT_FOUND");
    await request(app).post(`${ROUTE_BASE}/orders/A-17/lines/more`).send({}).expect(404);
    await request(app).post(`${ROUTE_BASE}/orders/%E0%A4%A/lines`).send({}).expect(404);
    // A body that isn't an object.
    expect((await request(app).post(`${ROUTE_BASE}/orders/1/lines`).send([1, 2]).expect(400)).body.error).toBe("BODY_INVALID");
    expect(await runs()).toBe(2);
  });

  test("its inputs are checked by their rules before it runs: every problem is said, and nothing is run", async () => {
    const id = await fn("lines", lineDef);
    await route(id, { method: "POST", path: "orders/:id/lines", who: "public" });
    const no = await request(app).post(`${ROUTE_BASE}/orders/7/lines`).send({ qty: 0, size: "XL", email: "nope", note: "x".repeat(25) }).expect(400);
    expect(no.body).toMatchObject({ error: "INPUT_INVALID", message: '"qty" is at least 1' });
    expect(no.body.details.problems).toEqual([
      { input: "qty", message: '"qty" is at least 1' },
      { input: "size", message: '"size" is one of: S, M, L' },
      { input: "email", message: '"email" has to be an email' },
      { input: "note", message: '"note" has at most 20 letters' },
    ]);
    expect((await request(app).post(`${ROUTE_BASE}/orders/7/lines`).send({}).expect(400)).body.details.problems).toEqual([{ input: "qty", message: 'It needs "qty"' }]);
    expect((await request(app).post(`${ROUTE_BASE}/orders/7/lines`).send({ qty: "lots" }).expect(400)).body.message).toBe('"qty" has to be a number');
    expect(await runs()).toBe(0);
    // The same rules on its other doors: a call stops at the first.
    await request(app).post(`${at}/${id}/triggers`).send({ kind: "call", config: { who: "public" }, slug: `${PREFIX}lines` }).expect(201);
    expect((await request(app).post(`/v1/fn/${PREFIX}lines`).send({ input: { id: "7", qty: 11 } }).expect(422)).body).toEqual({ ok: false, error: '"qty" is at most 10' });
  });

  test("a word beats a :name; a good answer's status is the address's own; a run that stops answers 422", async () => {
    const one = await fn("one", { inputs: [{ name: "id", type: "text" }], do: [{ act: "return", value: "one {{input.id}}" }] });
    const fresh = await fn("new", { do: [{ act: "return", value: "new" }] });
    const quiet = await fn("quiet", { do: [{ act: "return", value: "never sent" }] });
    const stops = await fn("stops", { inputs: [{ name: "id", type: "text" }], do: [{ act: "stop", message: "Order {{input.id}} is closed" }] });
    await route(one, { method: "GET", path: "orders/:id", who: "public" });
    await route(fresh, { method: "GET", path: "orders/new", who: "public" });
    await route(quiet, { method: "DELETE", path: "orders/:id", who: "public", status: 204 });
    await route(stops, { method: "PATCH", path: "orders/:id", who: "public" });
    expect((await request(app).get(`${ROUTE_BASE}/orders/new`).expect(200)).body).toBe("new");
    expect((await request(app).get(`${ROUTE_BASE}/orders/5`).expect(200)).body).toBe("one 5");
    const gone = await request(app).delete(`${ROUTE_BASE}/orders/5`).expect(204);
    expect(gone.text).toBe("");
    expect((await request(app).patch(`${ROUTE_BASE}/orders/9`).send({}).expect(422)).body).toEqual({ error: "FAILED", message: "Order 9 is closed" });
    // Four methods on that path: the fifth is told them.
    expect((await request(app).post(`${ROUTE_BASE}/orders/5`).send({}).expect(405)).headers.allow).toBe("GET, PATCH, DELETE");
  });

  test("who may call it, how often, once for a request that names itself, and only while it is published and on", async () => {
    const id = await fn("who", { do: [{ act: "return", value: "{{caller.kind}}" }] });
    const keyed = await route(id, { method: "POST", path: "stock/sync", who: "key", perMinute: 2 });
    expect((await request(app).post(`${ROUTE_BASE}/stock/sync`).send({}).expect(401)).body.error).toBe("KEY_NEEDED");
    const key = (await request(app).post("/v1/admin/api/keys").send({ name: "Route spec", scopes: { tables: "*", acts: ["read"] } }).expect(201)).body.secret as string;
    expect((await request(app).post(`${ROUTE_BASE}/stock/sync`).set("X-Api-Key", key).send({}).expect(200)).body).toBe("key");
    await request(app).post(`${ROUTE_BASE}/stock/sync`).set("X-Api-Key", key).send({}).expect(200);
    const many = await request(app).post(`${ROUTE_BASE}/stock/sync`).set("X-Api-Key", key).send({}).expect(429);
    expect(Number(many.headers["retry-after"])).toBeGreaterThan(0);
    // A signed-in shopper.
    await route(id, { method: "GET", path: "me/points", who: "customer" });
    expect((await request(app).get(`${ROUTE_BASE}/me/points`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    expect((await request(app).get(`${ROUTE_BASE}/me/points`).set("Authorization", `Bearer ${sara}`).expect(200)).body).toBe("customer");
    // Once: the same key again is the first answer, and the function ran once (an empty answer too).
    const nothing = await fn("nothing", { do: [{ act: "set", name: "seen", value: 1 }] });
    await route(nothing, { method: "PUT", path: "carts/:id", who: "public", status: 204 });
    const before = await runs();
    for (let n = 0; n < 2; n++) {
      const r = await request(app).put(`${ROUTE_BASE}/carts/c1`).set("Idempotency-Key", "cart-c1-1").send({ lines: 2 }).expect(204);
      expect(r.headers["idempotent-replayed"]).toBe(n ? "true" : undefined);
    }
    expect(await runs()).toBe(before + 1);
    expect((await request(app).put(`${ROUTE_BASE}/carts/c2`).set("Idempotency-Key", "cart-c1-1").send({ lines: 2 }).expect(409)).body.error).toBe("IDEMPOTENCY_KEY_REUSED");
    // Switched off, its address switched off, or not published: no such address.
    await request(app).put(`${at}/${id}/triggers/${keyed.id}`).send({ enabled: false }).expect(200);
    await request(app).post(`${ROUTE_BASE}/stock/sync`).set("X-Api-Key", key).send({}).expect(404);
    await request(app).put(`${at}/${id}`).send({ enabled: false }).expect(200);
    await request(app).get(`${ROUTE_BASE}/me/points`).set("Authorization", `Bearer ${sara}`).expect(404);
    const draft = await fn("draft", { do: [{ act: "return", value: 1 }] }, false);
    await route(draft, { method: "GET", path: "drafts", who: "public" });
    await request(app).get(`${ROUTE_BASE}/drafts`).expect(404);
  });
});

describe("An input's rules", () => {
  test("what can't hold is said before publishing", async () => {
    const made = (await request(app).post(at).send({ name: `${PREFIX}rules` }).expect(201)).body;
    const problems = async (inputs: unknown[]) => ((await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs, do: [] } }).expect(200)).body.problems as Array<{ at: string; message: string }>).map((p) => `${p.at}: ${p.message}`);
    expect(await problems([{ name: "n", type: "number", min: 5, max: 1 }])).toEqual(['inputs: "n": the least is more than the most']);
    expect(await problems([{ name: "n", type: "number", choices: ["a"] }])).toEqual(['inputs: "n": choices and a format are for words']);
    expect(await problems([{ name: "t", type: "text", choices: ["a", "a"], format: "email" }])).toEqual(['inputs: "t": a choice is there twice', 'inputs: "t": choices or a format, not both']);
    expect(await problems([{ name: "t", type: "text", min: 1.5 }])).toEqual(['inputs: "t": how many is a whole number, 0 or more']);
    expect(await problems([{ name: "b", type: "bool", max: 3 }])).toEqual(['inputs: "b": the least and the most are for a number, words or a list']);
    expect(await problems([{ name: "n", type: "number", min: -5, max: 2.5 }, { name: "t", type: "text", min: 2, max: 40, choices: undefined, format: "phone" }, { name: "l", type: "list", max: 3 }])).toEqual([]);
    // A rule that isn't one at all isn't kept.
    expect((await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [{ name: "t", type: "text", format: "postcode" }], do: [] } }).expect(400)).body.error).toBeTruthy();
  });

  test("the pure part: each rule, and a path as it is kept", () => {
    const read = (input: FnInput, v: unknown) => readInputs([input], { [input.name]: v });
    const ok = (input: FnInput, v: unknown) => read(input, v).problems.length === 0;
    expect(["+970 59-123 4567", "0599123456", "(02) 123-4567"].map((v) => ok({ name: "p", type: "text", format: "phone" }, v))).toEqual([true, true, true]);
    expect(["12345", "phone", "+97059123456789012", "059-12a"].map((v) => ok({ name: "p", type: "text", format: "phone" }, v))).toEqual([false, false, false, false]);
    expect(["https://example.test/a?b=1", "http://x.test"].map((v) => ok({ name: "u", type: "text", format: "url" }, v))).toEqual([true, true]);
    expect(["ftp://x.test", "example.test", "javascript:alert(1)"].map((v) => ok({ name: "u", type: "text", format: "url" }, v))).toEqual([false, false, false]);
    expect(["2026-11-17", "2028-02-29"].map((v) => ok({ name: "d", type: "text", format: "date" }, v))).toEqual([true, true]);
    expect(["2026-02-30", "17/11/2026", "2026-1-5"].map((v) => ok({ name: "d", type: "text", format: "date" }, v))).toEqual([false, false, false]);
    // Letters, not bytes: an emoji is one.
    expect([ok({ name: "t", type: "text", max: 3 }, "👍👍👍"), ok({ name: "t", type: "text", min: 2 }, "a")]).toEqual([true, false]);
    expect(read({ name: "l", type: "list", min: 1, max: 2 }, [1, 2, 3]).problems).toEqual([{ input: "l", message: '"l" has at most 2 things' }]);
    expect(read({ name: "n", type: "number", min: -1 }, "-0.5")).toEqual({ values: { n: -0.5 }, problems: [] });
    // An email kept as it was written, without spaces around it.
    expect(read({ name: "e", type: "text", format: "email" }, "  sara@example.test ").values.e).toBe("sara@example.test");
    // Nothing handed: nothing to check (unless it is needed).
    expect(read({ name: "n", type: "number", min: 1 }, "").problems).toEqual([]);
    const p = routePath("/Orders/:orderId/Lines/");
    expect(p).toEqual({ path: "orders/:orderId/lines", parts: ["orders", ":orderId", "lines"], params: ["orderId"], shape: "orders/:/lines" });
    expect(routeSlug("GET", p)).toBe("GET orders/:/lines");
  });
});
