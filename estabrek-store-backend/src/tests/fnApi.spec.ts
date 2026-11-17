import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { type FnDef } from "../lib/fnDef.js";
import { forgetConnections, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { API_AUTH, READY_KEY, apiBody, baseOf, headerName, kindOf, kindsOut, missingIn, pathOf, settingsCheck, settingsOf } from "../lib/fnKinds.js";
import { forgetReady } from "../lib/fnReady.js";
import { resetRunsForTests } from "../lib/runs.js";

// A generic API as a ready connection (F5): any other system (an ERP, a warehouse, a shipping
// company) connected once with its base address and its key; a step writes only the path after
// the base and what it sends. With the database; the network is stood in for here. Requests to
// /v1/admin without a token run as the test owner.

const PREFIX = "fnapi-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
const conn = `${admin}/connections`;
const BASE = "https://erp.example.test/api/v2";
// Made up, and not in the shape of any real service's key.
const KEY = "made-up-erp-key-for-a-test";

type Sent = { method: string; url: string; headers: Record<string, string>; body?: string };
type Out = { ok: boolean; dry: boolean; value: any; error: string | null };
let sent: Sent[] = [];
let answer: (req: Sent) => { status?: number; type?: string; text: string } = () => ({ text: '{"id":"SO-1042","state":"draft"}' });
const network: Transport = async ({ method, url, headers, body }) => {
  const req = { method, url: url.toString(), headers, body };
  sent.push(req);
  const a = answer(req);
  return { status: a.status ?? 200, type: a.type ?? "application/json", text: a.text, cut: false };
};

type Ready = { id: string; name: string; kind: string; settings: Record<string, string> };
const addReady = (body: Record<string, unknown>) => request(app).post(`${conn}/ready`).send(body);
const connect = async (settings: Record<string, string> = { base: `${BASE}/` }, key = KEY, name = "ERP") => ((await addReady({ kind: "api", name, key, settings }).expect(201)).body.ready as Ready[]).find((c) => c.name === name)!;
const make = async (name: string, def: Partial<FnDef>, publish = true) => {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  if (publish) {
    expect(saved.problems).toEqual([]);
    await request(app).post(`${at}/${made.id}/publish`).expect(200);
  }
  return { id: made.id as string, problems: saved.problems as Array<{ at: string; message: string }> };
};
const run = async (id: string, input: Record<string, unknown> = {}, opts: { dry?: boolean; which?: "draft" | "live" } = {}) => (await request(app).post(`${at}/${id}/run`).send({ input, dry: false, which: "live", ...opts }).expect(200)).body as Out;

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnConnection.deleteMany({});
  await prisma.fnSite.deleteMany({});
  forgetConnections();
  forgetReady();
  sent = [];
  answer = () => ({ text: '{"id":"SO-1042","state":"draft"}' });
}
beforeAll(() => setTransportForTests(network));
beforeEach(clean);
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("The kind, by itself", () => {
  test("what a page is told: its settings (one needed, one a choice, one asked only for a header), a path for every way of asking", () => {
    expect(kindsOut().map((k) => k.kind)).toEqual(["telegram", "slack", "google", "api"]);
    const api = kindsOut().find((k) => k.kind === "api")!;
    expect(api).toMatchObject({
      kind: "api",
      label: "API",
      host: "",
      settings: [
        { id: "base", max: 300, required: true },
        { id: "auth", max: 10, choices: ["bearer", "header", "basic"] },
        { id: "header", max: 60, shownWhen: ["auth", "header"] },
        { id: "check", max: 200 },
      ],
      test: { sends: false },
    });
    expect(api.actions.map((a) => [a.id, a.fields.map((f) => `${f.id}${f.required ? "*" : ""}${f.long ? " (long)" : ""}`)])).toEqual([
      ["get", ["path*"]],
      ["post", ["path*", "body (long)"]],
      ["put", ["path*", "body (long)"]],
      ["patch", ["path*", "body (long)"]],
      ["delete", ["path*"]],
    ]);
    expect(API_AUTH).toEqual(["bearer", "header", "basic"]);
    // The others don't change.
    expect(kindsOut()[0].settings).toEqual([{ id: "chat", max: 100 }]);
  });

  test("a base address: https, a site by its name, the standard port, nothing after it but a path", () => {
    expect(baseOf(`${BASE}/`)).toBe(BASE);
    expect(baseOf("  https://ERP.Example.test  ")).toBe("https://erp.example.test");
    expect(baseOf("https://erp.example.test:443/x")).toBe("https://erp.example.test/x");
    for (const bad of ["http://erp.example.test", "https://10.0.0.5/api", "https://localhost/api", "https://[::1]/", "https://erp.example.test:8069", "https://me:pw@erp.example.test", "https://erp.example.test/api?key=1", "https://erp.example.test/#x", "erp.example.test", ""]) expect([bad, baseOf(bad)]).toEqual([bad, null]);
    expect([headerName(" X-API-Key "), headerName("Authorization"), headerName("Host"), headerName("content-type"), headerName("x key"), headerName("")]).toEqual(["x-api-key", "authorization", null, null, null, null]);
    expect([pathOf("/me"), pathOf("me"), pathOf(""), pathOf("https://x.test/me"), pathOf("//x.test/me"), pathOf("/a b"), pathOf("/a#b"), pathOf("/a\\b")]).toEqual(["/me", "/me", "", null, null, null, null, null]);
  });

  test("its settings: the base is needed; each one is said by its name when it isn't right", () => {
    const api = kindOf("api")!;
    expect(settingsOf(api, { base: `${BASE}/`, auth: "header", header: "X-API-Key", check: "me" })).toEqual({ base: BASE, auth: "header", header: "x-api-key", check: "/me" });
    expect(settingsCheck(api, {})).toEqual({ id: "base", message: "The base address is needed" });
    expect(settingsCheck(api, undefined)).toEqual({ id: "base", message: "The base address is needed" });
    expect(settingsCheck(api, { base: "http://erp.example.test" })).toEqual({ id: "base", message: expect.stringContaining("https://") });
    expect(settingsCheck(api, { base: BASE, auth: "oauth" })).toEqual({ id: "auth", message: "The key is sent as bearer, header or basic" });
    expect(settingsCheck(api, { base: BASE, header: "Host" })).toEqual({ id: "header", message: expect.stringContaining("X-API-Key") });
    expect(settingsCheck(api, { base: BASE, check: "https://x.test" })).toEqual({ id: "check", message: expect.stringContaining("/me") });
    expect(settingsCheck(api, { base: BASE, other: "x" })).toEqual({ id: "other", message: "A setting is a short plain value" });
    // The others as they were: a kind with nothing needed takes nothing.
    expect(settingsOf(kindOf("telegram")!, undefined)).toEqual({});
  });

  test("what a step sends: JSON, or one line a field (a dot going deeper); a number, yes/no and nothing are themselves", () => {
    expect(apiBody("")).toBeNull();
    expect(apiBody('{"total": "{{input.total}}", "items": [1, 2]}')).toEqual({ body: { total: "{{input.total}}", items: [1, 2] } });
    expect(apiBody("[1, 2]")).toEqual({ body: [1, 2] });
    expect(apiBody('{"total": {{input.total}}}')).toEqual({ problem: expect.stringContaining('"{{input.total}}"') });
    expect(apiBody("customer.name: {{input.name}}\ncustomer.phone: 0599000001\ntotal: 240\npaid: false\nnote:\nurl: https://x.test/a\ncode: 00123\n\n")).toEqual({
      body: { customer: { name: "{{input.name}}", phone: "0599000001" }, total: 240, paid: false, note: "", url: "https://x.test/a", code: "00123" },
    });
    expect(apiBody("just words")).toEqual({ problem: "Each line of what is sent is name: value" });
    expect(apiBody("__proto__.x: 1")).toEqual({ problem: "Each line of what is sent is name: value" });
  });

  test("its calls: the path after the base, the key as the connection sends it; what is wrong with a step is said", () => {
    const api = kindOf("api")!;
    const post = api.actions.find((a) => a.id === "post")!;
    const get = api.actions.find((a) => a.id === "get")!;
    expect(post.call({ base: BASE }, { path: "orders", body: "customer: {{input.name}}\ntotal: {{input.total}}" })).toEqual({
      method: "POST",
      url: `${BASE}/orders`,
      headers: { authorization: `Bearer {{secret.${READY_KEY}}}` },
      body: { customer: "{{input.name}}", total: "{{input.total}}" },
    });
    expect(get.call({ base: BASE, auth: "header", header: "x-api-key" }, { path: "/orders/{{input.id}}?full=1" })).toEqual({ method: "GET", url: `${BASE}/orders/{{input.id}}?full=1`, headers: { "x-api-key": `{{secret.${READY_KEY}}}` } });
    expect(get.call({ base: BASE, auth: "basic" }, { path: "/me" }).headers).toEqual({ authorization: `Basic {{secret.${READY_KEY}}}` });
    // A path that is a whole address, or a body that isn't one: said before it is published.
    expect(missingIn(get, { path: "https://evil.test/x" }, () => false)).toEqual(["The path comes after the base address: /orders, not a whole address"]);
    expect(missingIn(get, { path: "{{input.path}}" }, () => false)).toEqual([]);
    expect(missingIn(get, {}, () => false)).toEqual(["The path is empty"]);
    expect(missingIn(post, { path: "/x", body: "words" }, () => false)).toEqual(["Each line of what is sent is name: value"]);
    // The key: as kept, or (Basic) as a name and password in base64.
    expect(api.useKey!("me:secret", { auth: "basic" })).toBe(Buffer.from("me:secret").toString("base64"));
    expect(api.useKey!(KEY, { auth: "bearer" })).toBe(KEY);
    expect(api.hostOf!({ base: BASE })).toBe("erp.example.test");
    expect(api.hostOf!({})).toBeNull();
    expect([api.key(`  ${KEY} `), api.key("two\nlines"), api.key(""), api.key("{{secret.X}}")]).toEqual([KEY, null, null, null]);
    expect(api.test.call({ base: BASE, check: "/me" }, "")).toEqual({ method: "GET", url: `${BASE}/me`, headers: { authorization: `Bearer {{secret.${READY_KEY}}}` } });
    expect([api.test.said({ name: "Estabrek ERP" }), api.test.said({ ok: true }), api.test.said("text")]).toEqual(["Estabrek ERP", null, null]);
    expect([api.why({ message: "Not found" }), api.why({ error: { message: "Bad token" } }), api.why({ error: "invalid_key" }), api.why({ detail: "Nope" }), api.why("<html><body><h1>Forbidden</h1></body></html>")]).toEqual(["Not found", "Bad token", "invalid_key", "Nope", "Forbidden"]);
  });
});

describe("A system connected", () => {
  test("its base is needed and kept tidy; its key is never answered; each setting is said by name when it isn't right", async () => {
    const c = await connect({ base: `${BASE}/`, auth: "header", header: "X-API-Key", check: "me" });
    expect(c.settings).toEqual({ base: BASE, auth: "header", header: "x-api-key", check: "/me" });
    expect(JSON.stringify((await request(app).get(conn).expect(200)).body)).not.toContain(KEY);
    expect((await addReady({ kind: "api", name: "No base", key: KEY }).expect(400)).body).toMatchObject({ error: "SETTING_INVALID", message: "The base address is needed", details: { at: "settings.base" } });
    expect((await addReady({ kind: "api", name: "Port", key: KEY, settings: { base: "https://erp.example.test:8069" } }).expect(400)).body.details).toEqual({ at: "settings.base" });
    expect((await addReady({ kind: "api", name: "Two lines", key: "a\nb", settings: { base: BASE } }).expect(400)).body.error).toBe("KEY_INVALID");
    // Changed: a new base, the way the key is sent.
    const changed = ((await request(app).put(`${conn}/ready/${c.id}`).send({ settings: { base: "https://erp2.example.test", auth: "bearer" } }).expect(200)).body.ready as Ready[])[0];
    expect(changed.settings).toEqual({ base: "https://erp2.example.test", auth: "bearer" });
    await request(app).put(`${conn}/ready/${c.id}`).send({ settings: { auth: "bearer" } }).expect(400);
  });

  test("tried: its path to try, with the key as it is sent; its own words when it says no", async () => {
    const c = await connect({ base: BASE, check: "/me" });
    answer = () => ({ text: '{"name":"Estabrek ERP","version":"16"}' });
    expect((await request(app).post(`${conn}/ready/${c.id}/test`).send({}).expect(200)).body).toEqual({ ok: true, status: 200, said: "Estabrek ERP", why: null, sends: false });
    expect(sent[0]).toMatchObject({ method: "GET", url: `${BASE}/me`, headers: { authorization: `Bearer ${KEY}` } });
    answer = () => ({ status: 401, text: '{"message":"Invalid API key"}' });
    expect((await request(app).post(`${conn}/ready/${c.id}/test`).send({}).expect(200)).body).toEqual({ ok: false, status: 401, said: null, why: "Invalid API key", sends: false });
    // Basic: a name and password as Basic asks for them.
    const basic = await connect({ base: BASE, auth: "basic" }, "store:pass-for-a-test", "Basic ERP");
    sent = [];
    answer = () => ({ text: "{}" });
    await request(app).post(`${conn}/ready/${basic.id}/test`).send({}).expect(200);
    expect(sent[0]).toMatchObject({ url: BASE, headers: { authorization: `Basic ${Buffer.from("store:pass-for-a-test").toString("base64")}` } });
  });

  test("a function sends an order: the path after the base, a line a field, numbers stay numbers; it reads the answer", async () => {
    const c = await connect({ base: BASE, auth: "header", header: "X-API-Key" });
    const { id } = await make("send", {
      inputs: [{ name: "name", type: "text" }, { name: "total", type: "number" }, { name: "items", type: "any" }],
      do: [
        { act: "ready", via: c.id, what: "post", give: { path: "/orders?source=store", body: "customer.name: {{input.name}}\ntotal: {{input.total}}\nitems: {{input.items}}\nchannel: online\nnote: Order of {{input.name}}" }, as: "made" },
        { act: "ready", via: c.id, what: "get", give: { path: "/orders/{{made.body.id}}" }, as: "order" },
        { act: "return", value: { id: "{{made.body.id}}", state: "{{order.body.state}}" } },
      ],
    });
    const out = await run(id, { name: "Sara Khalil", total: 240, items: [{ sku: "SHAWL-M", qty: 2 }] });
    expect(out).toMatchObject({ ok: true, value: { id: "SO-1042", state: "draft" } });
    const [post, get] = sent;
    expect(post).toMatchObject({ method: "POST", url: `${BASE}/orders?source=store`, headers: { "x-api-key": KEY, "content-type": "application/json" } });
    expect(JSON.parse(post.body!)).toEqual({ customer: { name: "Sara Khalil" }, total: 240, items: [{ sku: "SHAWL-M", qty: 2 }], channel: "online", note: "Order of Sara Khalil" });
    // A name filled into the path is one piece of it: it can't add a way in, nor go elsewhere.
    expect(get).toMatchObject({ method: "GET", url: `${BASE}/orders/SO-1042` });
    expect(get.headers.authorization).toBeUndefined();
    // A try (dry) sends nothing.
    sent = [];
    expect((await run(id, { name: "x", total: 1, items: [] }, { dry: true, which: "draft" })).ok).toBe(true);
    expect(sent).toEqual([]);
  });

  test("its key goes to its own site only: a name can't move a call elsewhere, another step can't borrow it, a refusal stops the run", async () => {
    const c = await connect({ base: BASE });
    answer = (req) => ({ text: JSON.stringify({ echo: req.headers.authorization }) });
    const { id } = await make("echo", {
      inputs: [{ name: "p", type: "text" }],
      do: [
        { act: "ready", via: c.id, what: "get", give: { path: "/x/{{input.p}}" }, as: "got" },
        { act: "return", value: "{{got.body}}" },
      ],
    });
    // A value that looks like another site stays a piece of this one's path.
    const out = await run(id, { p: "@evil.test/steal" });
    expect(sent[0].url).toBe(`${BASE}/x/%40evil.test%2Fsteal`);
    // The key that came back in the answer is cut out before the run sees it.
    expect(JSON.stringify(out.value)).not.toContain(KEY);
    // A system that says no stops the run, in its words.
    answer = () => ({ status: 404, text: '{"message":"Order not found"}' });
    expect((await run(id, { p: "1" })).error).toBe('API "ERP" answered 404: Order not found');
    answer = () => ({ status: 502, type: "text/html", text: "<html><body><h1>Bad gateway</h1></body></html>" });
    expect((await run(id, { p: "1" })).error).toBe('API "ERP" answered 502: Bad gateway');
    // A step that calls sites can't reach it (it isn't an allowed site), nor name its key.
    const { problems } = await make("borrow", { do: [{ act: "http", method: "GET", url: `${BASE}/x`, headers: { authorization: `Bearer {{secret.${READY_KEY}}}` } }] }, false);
    expect(problems.map((x) => x.message).join(" | ")).toMatch(/erp\.example\.test|CONNECTION_KEY|secret/);
    // A step that writes a whole address: said before it is published.
    const bad = await make("whole", { do: [{ act: "ready", via: c.id, what: "get", give: { path: "https://evil.test/x" } }] }, false);
    expect(bad.problems.map((x) => x.message)).toEqual(["The path comes after the base address: /orders, not a whole address"]);
  });
});
