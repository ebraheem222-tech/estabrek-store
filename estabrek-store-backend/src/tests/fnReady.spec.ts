import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { FnDefSchema, problemsOf, type FnDef, type Step } from "../lib/fnDef.js";
import { HTTP_LIMITS, forgetConnections, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { READY_KEY, READY_LIMITS, kindOf, kindsOut, missingIn, settingsOf } from "../lib/fnKinds.js";
import { forgetReady } from "../lib/fnReady.js";
import { resetRunsForTests } from "../lib/runs.js";

// Ready connections (F5), with the database: a service connected once (Telegram, Slack), its key
// kept as a secret is, and the "ready" step that uses one with no address or key written in it.
// The network is stood in for here; requests to /v1/admin without a token run as the test owner.

const PREFIX = "fnready-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
const conn = `${admin}/connections`;
const TOKEN = "123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw";
const HOOK = "T0123ABCD/B0456EFGH/abcdefghijklmnopqrstuvwx";
type Sent = { method: string; url: string; headers: Record<string, string>; body?: string };
type Out = { ok: boolean; dry: boolean; value: any; error: string | null; failedAt: string | null; trace: Array<{ at: string; act: string; ok: boolean; note?: string; say?: unknown[]; error?: string }> };

let sent: Sent[] = [];
let answer: (req: Sent) => { status?: number; type?: string; text: string };
const network: Transport = async ({ method, url, headers, body }) => {
  const req = { method, url: url.toString(), headers, body };
  sent.push(req);
  const a = answer(req);
  return { status: a.status ?? 200, type: a.type ?? "application/json", text: a.text, cut: false };
};

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
const addReady = (body: Record<string, unknown>) => request(app).post(`${conn}/ready`).send(body);
/** A Telegram connection that usually writes to one chat; its id. */
const telegram = async (name = "Store alerts", settings: Record<string, string> = { chat: "-100123" }) => ((await addReady({ kind: "telegram", name, key: TOKEN, settings }).expect(201)).body.ready as Array<{ id: string; name: string }>).find((c) => c.name === name)!.id;

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnConnection.deleteMany({});
  await prisma.fnSecret.deleteMany({});
  await prisma.fnSite.deleteMany({});
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@fnready-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  invalidateAccess();
  forgetConnections();
  forgetReady();
  sent = [];
  answer = () => ({ text: '{"ok":true,"result":{"message_id":7}}' });
}
beforeAll(() => setTransportForTests(network));
beforeEach(clean);
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("The kinds, by themselves", () => {
  test("what a page is told about a kind: what to ask for, never how the call is made", () => {
    const out = kindsOut();
    expect(out.map((k) => k.kind)).toEqual(["telegram", "slack"]);
    expect(out[0]).toEqual({
      kind: "telegram",
      label: "Telegram",
      host: "api.telegram.org",
      settings: [{ id: "chat", max: 100 }],
      actions: [{ id: "message", fields: [{ id: "chat", required: true, long: false, or: "chat" }, { id: "text", required: true, long: true }] }],
      test: { sends: false },
    });
    expect(out[1]).toMatchObject({ kind: "slack", host: "hooks.slack.com", settings: [], actions: [{ id: "message", fields: [{ id: "text", required: true, long: true }] }], test: { sends: true } });
    expect(JSON.stringify(out)).not.toContain("secret");
    expect(kindOf("telegram")?.label).toBe("Telegram");
    expect(kindOf("constructor")).toBeNull();
    expect(kindOf("")).toBeNull();
  });

  test("a key as it is kept: a Telegram bot's token, the end of a Slack webhook's address", () => {
    const t = kindOf("telegram")!;
    expect(t.key(` ${TOKEN} `)).toBe(TOKEN);
    // Pasted with the address's "bot" in front of it.
    expect(t.key(`bot${TOKEN}`)).toBe(TOKEN);
    for (const bad of ["", "123456789", "123456789:short", `https://api.telegram.org/bot${TOKEN}/getMe`, `${TOKEN} extra`, "abc:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"]) expect([bad, t.key(bad)]).toEqual([bad, null]);
    const s = kindOf("slack")!;
    expect(s.key(` https://hooks.slack.com/services/${HOOK} `)).toBe(HOOK);
    expect(s.key(`https://hooks.slack.com/services/${HOOK}/`)).toBe(HOOK);
    for (const bad of ["", HOOK, `http://hooks.slack.com/services/${HOOK}`, `https://hooks.slack.com.evil.com/services/${HOOK}`, `https://evil.com/services/${HOOK}`, `https://hooks.slack.com/services/${HOOK}/more`, `https://hooks.slack.com/services/${HOOK}?x=1`, "https://hooks.slack.com/services/T/B/x"]) expect([bad, s.key(bad)]).toEqual([bad, null]);
  });

  test("a connection's settings are the kind's own plain values; what a step still lacks", () => {
    const t = kindOf("telegram")!;
    expect(settingsOf(t, undefined)).toEqual({});
    expect(settingsOf(t, { chat: " @my_channel " })).toEqual({ chat: "@my_channel" });
    expect(settingsOf(t, { chat: "" })).toEqual({});
    // Not this kind's, not a line, too long, or naming something: refused.
    for (const bad of [{ other: "x" }, { chat: 5 }, { chat: "x".repeat(101) }, { chat: "{{input.chat}}" }, { chat: `{{secret.${READY_KEY}}}` }, "chat", ["chat"]]) expect(settingsOf(t, bad)).toBeNull();
    expect(settingsOf(kindOf("slack")!, { chat: "x" })).toBeNull();
    const message = t.actions[0];
    expect(missingIn(message, {}, () => false)).toEqual(["The chat is empty", "The text is empty"]);
    expect(missingIn(message, { text: "  " }, () => true)).toEqual(["The text is empty"]);
    expect(missingIn(message, { text: "hi" }, (setting) => setting === "chat")).toEqual([]);
    expect(missingIn(message, { chat: "5", text: "hi" }, () => false)).toEqual([]);
  });

  test("a kind's call is written as an http step is: its own site, the key by its one name", () => {
    const t = kindOf("telegram")!;
    expect(t.actions[0].call({ chat: "-100123" }, { text: "Order {{input.id}}" })).toEqual({ method: "POST", url: `https://api.telegram.org/bot{{secret.${READY_KEY}}}/sendMessage`, body: { chat_id: "-100123", text: "Order {{input.id}}", disable_web_page_preview: true } });
    // The step's own chat comes before the usual one.
    expect((t.actions[0].call({ chat: "-100123" }, { chat: " {{input.chat}} ", text: "x" }).body as { chat_id: string }).chat_id).toBe("{{input.chat}}");
    expect(t.test.call({}, "")).toEqual({ method: "GET", url: `https://api.telegram.org/bot{{secret.${READY_KEY}}}/getMe` });
    expect(t.test.said({ ok: true, result: { username: "shop_bot" } })).toBe("@shop_bot");
    expect(t.test.said({ ok: true })).toBeNull();
    expect(t.why({ ok: false, description: "Bad Request: chat not found" })).toBe("Bad Request: chat not found");
    expect(t.why("<html>")).toBeNull();
    const s = kindOf("slack")!;
    expect(s.actions[0].call({}, { text: "hi" })).toEqual({ method: "POST", url: `https://hooks.slack.com/services/{{secret.${READY_KEY}}}`, body: { text: "hi" } });
    expect(s.test.call({}, "It works")).toEqual({ method: "POST", url: `https://hooks.slack.com/services/{{secret.${READY_KEY}}}`, body: { text: "It works" } });
    expect(s.why("no_service")).toBe("no_service");
  });

  test("the step's shape, and what stands in the way of publishing it", () => {
    const def = (steps: Step[], more: Partial<FnDef> = {}): FnDef => ({ inputs: [{ name: "name", type: "text" }], do: steps, ...more });
    const send: Step = { act: "ready", via: "c1", what: "message", give: { text: "New order from {{input.name}}" }, as: "sent" };
    expect(FnDefSchema.safeParse(def([send])).success).toBe(true);
    expect(FnDefSchema.safeParse(def([{ ...send, give: { text: 5 } } as never])).success).toBe(false);
    expect(FnDefSchema.safeParse(def([{ ...send, as: "secret" }])).success).toBe(false);
    // After a failure a function may tell someone through a connection.
    expect(FnDefSchema.safeParse(def([], { fail: [{ ...send, give: { text: "{{error}}" } }] })).success).toBe(true);
    const known = { tables: [], fns: [], ready: [{ id: "c1", name: "Store alerts", kind: "telegram", set: ["chat"] }, { id: "c2", name: "No chat", kind: "telegram", set: [] }, { id: "c3", name: "Old", kind: "pigeon", set: [] }] };
    expect(problemsOf(def([send, { act: "return", value: "{{sent.ok}}" }]), known)).toEqual([]);
    expect(problemsOf(def([{ ...send, via: "" }]), known)).toEqual([{ at: "do.0", message: "Pick a connection" }]);
    expect(problemsOf(def([{ ...send, via: "gone" }]), known)).toEqual([{ at: "do.0", message: "This connection isn't there any more" }]);
    expect(problemsOf(def([{ ...send, what: "dance" }]), known)).toEqual([{ at: "do.0", message: '"Store alerts" can\'t do this' }]);
    expect(problemsOf(def([{ ...send, via: "c3" }]), known)).toEqual([{ at: "do.0", message: '"Old" can\'t do this' }]);
    expect(problemsOf(def([{ ...send, give: {} }]), known)).toEqual([{ at: "do.0", message: "The text is empty" }]);
    // No usual chat on the connection: the step says which.
    expect(problemsOf(def([{ ...send, via: "c2" }]), known)).toEqual([{ at: "do.0", message: "The chat is empty" }]);
    expect(problemsOf(def([{ ...send, via: "c2", give: { chat: "{{input.name}}", text: "hi" } }]), known)).toEqual([]);
    // What it is given are the run's names like anywhere else, and never a secret: the key is the connection's.
    expect(problemsOf(def([{ ...send, give: { text: "{{nothing.here}}" } }]), known)).toEqual([{ at: "do.0", message: 'Nothing is kept under "nothing" before this step' }]);
    expect(problemsOf(def([{ ...send, give: { text: `{{secret.${READY_KEY}}}` } }]), known)).toEqual([{ at: "do.0", message: "A secret is only named in a step that calls a site" }]);
  });
});

describe("The page's connections", () => {
  test("a service is connected with its key, which is never answered back; its name is one of a kind", async () => {
    expect((await request(app).get(conn).expect(200)).body).toMatchObject({ ready: [], kinds: [{ kind: "telegram" }, { kind: "slack" }], limits: { ready: READY_LIMITS.connections } });
    // Not a token; not this kind's setting; a setting that names something.
    expect((await addReady({ kind: "telegram", name: "Bot", key: "hello" }).expect(400)).body).toMatchObject({ error: "KEY_INVALID", message: expect.stringContaining("@BotFather"), details: { at: "key" } });
    expect((await addReady({ kind: "telegram", name: "Bot", key: TOKEN, settings: { channel: "x" } }).expect(400)).body).toMatchObject({ error: "SETTING_INVALID" });
    expect((await addReady({ kind: "telegram", name: "Bot", key: TOKEN, settings: { chat: "{{input.chat}}" } }).expect(400)).body).toMatchObject({ error: "SETTING_INVALID" });
    await addReady({ kind: "pigeon", name: "Bird", key: "x" }).expect(400);
    await addReady({ kind: "telegram", name: " ", key: TOKEN }).expect(400);

    const made = (await addReady({ kind: "telegram", name: " Store alerts ", key: `bot${TOKEN}`, settings: { chat: " -100123 " } }).expect(201)).body;
    expect(made.ready).toEqual([{ id: expect.any(String), kind: "telegram", name: "Store alerts", settings: { chat: "-100123" }, updatedAt: expect.any(String), lastUsedAt: null, usedBy: [] }]);
    const slack = (await addReady({ kind: "slack", name: "Team", key: `https://hooks.slack.com/services/${HOOK}` }).expect(201)).body;
    expect(slack.ready.map((c: { kind: string; name: string }) => [c.kind, c.name])).toEqual([["telegram", "Store alerts"], ["slack", "Team"]]);
    expect((await addReady({ kind: "slack", name: "Store alerts", key: `https://hooks.slack.com/services/${HOOK}` }).expect(409)).body).toMatchObject({ error: "CONNECTION_TAKEN" });
    // Nowhere in any answer, and not as it was written in the database either.
    const everything = JSON.stringify([made, slack, (await request(app).get(conn)).body, (await request(app).get(at)).body]);
    for (const piece of [TOKEN, TOKEN.split(":")[1], HOOK, HOOK.split("/")[2]]) expect(everything).not.toContain(piece);
    for (const row of await prisma.fnConnection.findMany()) {
      expect(row.sealed).toMatch(/^v1\./);
      expect(JSON.stringify(row)).not.toContain(TOKEN.split(":")[1]);
      expect(JSON.stringify(row)).not.toContain(HOOK.split("/")[2]);
    }
    // The builder is told which there are, their kind, and which settings they hold: not a setting's value.
    const outside = (await request(app).get(at).expect(200)).body.outside;
    expect(outside.ready).toEqual([{ id: made.ready[0].id, name: "Store alerts", kind: "telegram", set: ["chat"] }, { id: expect.any(String), name: "Team", kind: "slack", set: [] }]);
    expect(outside.kinds.map((k: { kind: string }) => k.kind)).toEqual(["telegram", "slack"]);
    expect(JSON.stringify(outside)).not.toContain("-100123");
  });

  test("its name, key and settings are changed; one a function uses isn't deleted; so many and no more", async () => {
    const id = await telegram();
    const changed = (await request(app).put(`${conn}/ready/${id}`).send({ name: "Orders", settings: {} }).expect(200)).body;
    expect(changed.ready[0]).toMatchObject({ id, name: "Orders", settings: {} });
    expect((await request(app).put(`${conn}/ready/${id}`).send({ key: "nope" }).expect(400)).body).toMatchObject({ error: "KEY_INVALID" });
    const before = (await prisma.fnConnection.findUniqueOrThrow({ where: { id } })).sealed;
    await request(app).put(`${conn}/ready/${id}`).send({ key: TOKEN.replace("AAH", "BBH"), settings: { chat: "@orders" } }).expect(200);
    const after = await prisma.fnConnection.findUniqueOrThrow({ where: { id } });
    expect(after.sealed).not.toBe(before);
    expect(after.settings).toEqual({ chat: "@orders" });
    await request(app).put(`${conn}/ready/nope`).send({ name: "x" }).expect(404);

    const fn = await make("uses", { do: [{ act: "ready", via: id, what: "message", give: { text: "hi" } }] });
    expect((await request(app).get(conn).expect(200)).body.ready[0].usedBy).toEqual([`${PREFIX}uses`]);
    expect((await request(app).delete(`${conn}/ready/${id}`).expect(409)).body).toMatchObject({ error: "CONNECTION_USED", details: { functions: [`${PREFIX}uses`] } });
    await request(app).delete(`${at}/${fn.id}`).expect(200);
    expect((await request(app).delete(`${conn}/ready/${id}`).expect(200)).body.ready).toEqual([]);
    await request(app).delete(`${conn}/ready/${id}`).expect(404);

    await prisma.fnConnection.createMany({ data: Array.from({ length: READY_LIMITS.connections }, (_, k) => ({ kind: "slack", name: `Full ${k}`, sealed: "v1.x" })) });
    expect((await addReady({ kind: "telegram", name: "One more", key: TOKEN }).expect(400)).body).toMatchObject({ error: "TOO_MANY_CONNECTIONS" });
  });

  test("the key is tried for real: Telegram is asked who the bot is, Slack gets a line", async () => {
    const id = await telegram();
    answer = () => ({ text: '{"ok":true,"result":{"id":1,"is_bot":true,"username":"shop_bot"}}' });
    expect((await request(app).post(`${conn}/ready/${id}/test`).send({}).expect(200)).body).toEqual({ ok: true, status: 200, said: "@shop_bot", why: null, sends: false });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: "GET", url: `https://api.telegram.org/bot${TOKEN}/getMe` });
    expect(sent[0].body).toBeUndefined();
    // A key Telegram doesn't know: its own words, and not the key.
    answer = () => ({ status: 401, text: '{"ok":false,"error_code":401,"description":"Unauthorized"}' });
    const no = (await request(app).post(`${conn}/ready/${id}/test`).send({}).expect(200)).body;
    expect(no).toEqual({ ok: false, status: 401, said: null, why: "Unauthorized", sends: false });
    // A site that doesn't answer is an answer too, not an error of the page's.
    answer = () => {
      throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    };
    expect((await request(app).post(`${conn}/ready/${id}/test`).send({}).expect(200)).body).toEqual({ ok: false, status: 0, said: null, why: '"api.telegram.org" didn\'t answer in time', sends: false });

    const team = ((await addReady({ kind: "slack", name: "Team", key: `https://hooks.slack.com/services/${HOOK}` }).expect(201)).body.ready as Array<{ id: string; name: string }>).find((c) => c.name === "Team")!.id;
    sent = [];
    answer = () => ({ type: "text/html", text: "ok" });
    expect((await request(app).post(`${conn}/ready/${team}/test`).send({ line: "المتجر صار موصول" }).expect(200)).body).toEqual({ ok: true, status: 200, said: null, why: null, sends: true });
    expect(sent[0]).toMatchObject({ method: "POST", url: `https://hooks.slack.com/services/${HOOK}` });
    expect(JSON.parse(sent[0].body!)).toEqual({ text: "المتجر صار موصول" });
    answer = () => ({ status: 404, type: "text/html", text: "no_service" });
    expect((await request(app).post(`${conn}/ready/${team}/test`).send({}).expect(200)).body).toMatchObject({ ok: false, status: 404, why: "no_service" });
    await request(app).post(`${conn}/ready/nope/test`).send({}).expect(404);
  });

  test("building functions isn't connecting a service: that needs its own permission", async () => {
    const id = await telegram();
    const builder = await prisma.staffRole.create({ data: { name: `${PREFIX}builder`, permissions: ["functions:read", "functions:write"] } });
    const looker = await prisma.staffRole.create({ data: { name: `${PREFIX}looker`, permissions: ["connections:read"] } });
    const member = async (email: string, roleId: string) => {
      const u = await prisma.adminUser.create({ data: { email, name: email.split("@")[0], passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: roleId } });
      return `Bearer ${signAccessToken({ sub: u.id, email: u.email, role: "STAFF" } as never)}`;
    };
    const build = await member("builder@fnready-spec.test", builder.id);
    const look = await member("looker@fnready-spec.test", looker.id);
    // The builder may pick the connection in a step, and can't open the page, add one or try one.
    expect((await request(app).get(at).set("Authorization", build).expect(200)).body.outside.ready).toEqual([{ id, name: "Store alerts", kind: "telegram", set: ["chat"] }]);
    await request(app).get(conn).set("Authorization", build).expect(403);
    await addReady({ kind: "slack", name: "Mine", key: `https://hooks.slack.com/services/${HOOK}` }).set("Authorization", build).expect(403);
    await request(app).post(`${conn}/ready/${id}/test`).set("Authorization", build).send({}).expect(403);
    // Looking isn't changing, nor trying (a try may post a line).
    expect((await request(app).get(conn).set("Authorization", look).expect(200)).body.ready[0].name).toBe("Store alerts");
    await request(app).put(`${conn}/ready/${id}`).set("Authorization", look).send({ name: "Theirs" }).expect(403);
    await request(app).post(`${conn}/ready/${id}/test`).set("Authorization", look).send({}).expect(403);
    await request(app).delete(`${conn}/ready/${id}`).set("Authorization", look).expect(403);
    expect(sent).toEqual([]);
  });
});

describe("A function's step through a connection", () => {
  test("the message as it leaves: the kind's own address with the connection's key, the usual chat, the run's values in the text", async () => {
    const id = await telegram();
    const fn = await make("send", { inputs: [{ name: "name", type: "text" }, { name: "total", type: "number" }], do: [{ act: "ready", via: id, what: "message", give: { text: "New order from {{input.name}}: {{input.total}}" }, as: "sent" }, { act: "return", value: { ok: "{{sent.ok}}", status: "{{sent.status}}", id: "{{sent.body.result.message_id}}" } }] });
    const out = await run(fn.id, { name: "Sara", total: 120 });
    expect(out).toMatchObject({ ok: true, value: { ok: true, status: 200, id: 7 } });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: "POST", url: `https://api.telegram.org/bot${TOKEN}/sendMessage` });
    expect(sent[0].headers).toMatchObject({ "content-type": "application/json" });
    expect(JSON.parse(sent[0].body!)).toEqual({ chat_id: "-100123", text: "New order from Sara: 120", disable_web_page_preview: true });
    // What the run says about it names the connection, never the key.
    const line = out.trace.find((l) => l.act === "ready")!;
    expect(line).toMatchObject({ at: "do.0", ok: true, say: ["used", 'Telegram "Store alerts"'], note: 'Sent through Telegram "Store alerts"' });
    expect(JSON.stringify(out)).not.toContain(TOKEN.split(":")[1]);
    await new Promise((r) => setTimeout(r, 50));
    expect((await request(app).get(conn).expect(200)).body.ready[0].lastUsedAt).not.toBeNull();
  });

  test("the step's own chat comes before the usual one, and stays the thing it is; Slack gets its line", async () => {
    const id = await telegram("No chat", {});
    const fn = await make("chat", { inputs: [{ name: "chat", type: "any" }], do: [{ act: "ready", via: id, what: "message", give: { chat: "{{input.chat}}", text: "hi" } }] });
    expect((await run(fn.id, { chat: 5501 })).ok).toBe(true);
    expect(JSON.parse(sent[0].body!).chat_id).toBe(5501);
    // Left empty with no usual chat: it doesn't publish, and a try says the same.
    const none = await make("nochat", { do: [{ act: "ready", via: id, what: "message", give: { text: "hi" } }] }, false);
    expect(none.problems).toEqual([{ at: "do.0", message: "The chat is empty" }]);
    expect((await request(app).post(`${at}/${none.id}/publish`).expect(409)).body.error).toBe("FN_HAS_PROBLEMS");
    expect(await run(none.id, {}, { dry: true, which: "draft" })).toMatchObject({ ok: false, error: "The chat is empty", failedAt: "do.0" });

    const team = ((await addReady({ kind: "slack", name: "Team", key: `https://hooks.slack.com/services/${HOOK}` }).expect(201)).body.ready as Array<{ id: string; name: string }>).find((c) => c.name === "Team")!.id;
    sent = [];
    answer = () => ({ type: "text/html", text: "ok" });
    const slack = await make("slack", { inputs: [{ name: "name", type: "text" }], do: [{ act: "ready", via: team, what: "message", give: { text: "{{input.name}} joined" }, as: "posted" }, { act: "return", value: "{{posted.body}}" }] });
    expect(await run(slack.id, { name: "Noor" })).toMatchObject({ ok: true, value: "ok" });
    expect(sent[0]).toMatchObject({ method: "POST", url: `https://hooks.slack.com/services/${HOOK}` });
    expect(JSON.parse(sent[0].body!)).toEqual({ text: "Noor joined" });
  });

  test("the key is the connection's alone: no step names it, nothing a caller sends asks for it, and an echo comes back without it", async () => {
    const id = await telegram();
    // A step that names it: said before publishing, and refused at the run too.
    const named = await make("named", { do: [{ act: "ready", via: id, what: "message", give: { text: `my key is {{secret.${READY_KEY}}}` } }] }, false);
    expect(named.problems).toEqual([{ at: "do.0", message: "A secret is only named in a step that calls a site" }]);
    expect(await run(named.id, {}, { dry: true, which: "draft" })).toMatchObject({ ok: false, error: "A secret is only named in a step that calls a site" });
    // An "http" step can't borrow it, nor reach the kind's site through the connection.
    const borrow = await make("borrow", { do: [{ act: "http", method: "GET", url: `https://api.telegram.org/bot{{secret.${READY_KEY}}}/getMe` }] }, false);
    expect(borrow.problems).toEqual([{ at: "do.0", message: '"api.telegram.org" isn\'t among the allowed sites' }, { at: "do.0", message: `No secret called "${READY_KEY}"` }]);
    expect(await run(borrow.id, {}, { dry: true, which: "draft" })).toMatchObject({ ok: false, error: '"api.telegram.org" isn\'t among the allowed sites' });
    await request(app).post(`${conn}/sites`).send({ host: "api.telegram.org" }).expect(201);
    const still = (await request(app).put(`${at}/${borrow.id}`).send({ draft: { lang: "en", inputs: [], do: [{ act: "http", method: "GET", url: `https://api.telegram.org/bot{{secret.${READY_KEY}}}/getMe` }] } }).expect(200)).body;
    expect(still.problems).toEqual([{ at: "do.0", message: `No secret called "${READY_KEY}"` }]);
    expect(await run(borrow.id, {}, { dry: true, which: "draft" })).toMatchObject({ ok: false, error: `No secret called "${READY_KEY}"` });
    expect(sent).toEqual([]);

    // What a caller sends is put in as it is: a name in it is only letters.
    answer = (req) => ({ text: JSON.stringify({ ok: true, echo: req.url, got: JSON.parse(req.body!) }) });
    const fn = await make("echo", { inputs: [{ name: "name", type: "text" }], do: [{ act: "ready", via: id, what: "message", give: { text: "hi {{input.name}}" }, as: "sent" }, { act: "return", value: "{{sent.body}}" }] });
    const out = await run(fn.id, { name: `{{secret.${READY_KEY}}} {{input.name}}` });
    expect(JSON.parse(sent[0].body!).text).toBe(`hi {{secret.${READY_KEY}}} {{input.name}}`);
    // The service echoed the address it was called at, the key in it: the run gets it with the key taken out.
    expect(out.ok).toBe(true);
    expect(out.value.echo).toBe("https://api.telegram.org/bot•••/sendMessage");
    expect(JSON.stringify(out)).not.toContain(TOKEN);
    const rows = await prisma.run.findMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
    expect(JSON.stringify(rows)).not.toContain(TOKEN);
  });

  test("the service's \"no\" stops the run with its own words, and what follows a failure may tell someone through a connection", async () => {
    const id = await telegram();
    const team = ((await addReady({ kind: "slack", name: "Team", key: `https://hooks.slack.com/services/${HOOK}` }).expect(201)).body.ready as Array<{ id: string; name: string }>).find((c) => c.name === "Team")!.id;
    answer = (req) => (req.url.includes("telegram") ? { status: 400, text: '{"ok":false,"error_code":400,"description":"Bad Request: chat not found"}' } : { type: "text/html", text: "ok" });
    const fn = await make("no", { do: [{ act: "ready", via: id, what: "message", give: { text: "hi" } }, { act: "return", value: "sent" }], fail: [{ act: "ready", via: team, what: "message", give: { text: "It failed: {{error}}" } }] });
    expect(await run(fn.id)).toMatchObject({ ok: false, error: 'Telegram "Store alerts" answered 400: Bad Request: chat not found', failedAt: "do.0" });
    expect(sent.map((s) => new URL(s.url).host)).toEqual(["api.telegram.org", "hooks.slack.com"]);
    expect(JSON.parse(sent[1].body!)).toEqual({ text: 'It failed: Telegram "Store alerts" answered 400: Bad Request: chat not found' });
    // A "no" with nothing to read in it; and a service that doesn't answer.
    answer = () => ({ status: 502, type: "text/html", text: "" });
    const slack = await make("slackno", { do: [{ act: "ready", via: team, what: "message", give: { text: "hi" } }] });
    expect(await run(slack.id)).toMatchObject({ ok: false, error: 'Slack "Team" answered 502' });
    answer = () => {
      throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    };
    expect(await run(slack.id)).toMatchObject({ ok: false, error: '"hooks.slack.com" didn\'t answer in time' });
  });

  test("a try-out checks the step and sends nothing; a run sends so many and no more; a connection taken away is said plainly", async () => {
    const id = await telegram();
    const fn = await make("dry", { do: [{ act: "ready", via: id, what: "message", give: { text: "hi" }, as: "sent" }, { act: "return", value: "{{sent}}" }] });
    const dry = await run(fn.id, {}, { dry: true });
    expect(dry).toMatchObject({ ok: true, dry: true, value: { status: 0, ok: true, body: null, dry: true } });
    expect(dry.trace[0]).toMatchObject({ act: "ready", say: ["wouldUse", 'Telegram "Store alerts"'], note: 'Would send through Telegram "Store alerts"' });
    expect(sent).toEqual([]);
    // Through a connection or straight to a site, it is the same count.
    const many = await make("many", { inputs: [{ name: "list", type: "list" }], do: [{ act: "each", list: "{{input.list}}", do: [{ act: "ready", via: id, what: "message", give: { text: "n {{item}}" } }] }] });
    const over = await run(many.id, { list: Array.from({ length: HTTP_LIMITS.calls + 2 }, (_, k) => k) });
    expect(over).toMatchObject({ ok: false, error: `A run calls sites up to ${HTTP_LIMITS.calls} times` });
    expect(sent).toHaveLength(HTTP_LIMITS.calls);
    // Taken away from under a published function (only the database can: the page refuses).
    await prisma.fnConnection.delete({ where: { id } });
    forgetReady();
    sent = [];
    expect(await run(fn.id)).toMatchObject({ ok: false, error: "This connection isn't there any more", failedAt: "do.0" });
    expect(sent).toEqual([]);
    expect((await request(app).get(`${at}/${fn.id}`).expect(200)).body.problems).toEqual([{ at: "do.0", message: "This connection isn't there any more" }]);
  });
});
