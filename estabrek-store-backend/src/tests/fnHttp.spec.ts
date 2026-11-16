import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { FnDefSchema, problemsOf, type FnDef, type Step } from "../lib/fnDef.js";
import { HTTP_LIMITS, forgetConnections, safeLookup, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { hostIn, publicAddress, secretsIn, siteAllowed, siteOf, withoutSecrets } from "../lib/fnSites.js";
import { resetRunsForTests } from "../lib/runs.js";

// What a function reaches outside (F5), with the database: the sites the owner allowed, the secrets
// kept for them (written, never read back), and the "http" step that calls a site. The network is
// stood in for here (the guard on addresses is tested by itself); requests to /v1/admin without a
// token run as the test owner.

const PREFIX = "fnhttp-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
const conn = `${admin}/connections`;
const TOKEN = "123456:AAH-secret-token-value";
type Sent = { method: string; url: string; headers: Record<string, string>; body?: string };
type Out = { ok: boolean; dry: boolean; value: any; error: string | null; failedAt: string | null; trace: Array<{ at: string; act: string; ok: boolean; note?: string; error?: string }> };

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
const addSite = (host: string) => request(app).post(`${conn}/sites`).send({ host });
const addSecret = (name: string, value: string, sites: string[]) => request(app).post(`${conn}/secrets`).send({ name, value, sites });

async function clean() {
  await resetRunsForTests();
  // Its runs too: the run log's "what is failing" list is the store's, not this spec's.
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnSecret.deleteMany({});
  await prisma.fnSite.deleteMany({});
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: PREFIX } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@fnhttp-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  invalidateAccess();
  forgetConnections();
  sent = [];
  answer = () => ({ text: '{"ok":true}' });
}
beforeAll(() => setTransportForTests(network));
beforeEach(clean);
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("The rules, by themselves", () => {
  test("a site is a name: itself, or every name under one; never numbers", () => {
    expect(siteOf(" API.Telegram.org. ")).toBe("api.telegram.org");
    expect(siteOf("*.example.com")).toBe("*.example.com");
    for (const bad of ["localhost", "10.0.0.1", "https://api.x.com", "api.x.com/path", "api.x.com:8443", "*.com", "a..b.com", "-a.com", "api_x.com", "", "*"]) expect(siteOf(bad)).toBeNull();
    expect(siteAllowed("api.telegram.org", ["api.telegram.org"])).toBe(true);
    expect(siteAllowed("API.Telegram.org", ["api.telegram.org"])).toBe(true);
    expect(siteAllowed("evil.api.telegram.org", ["api.telegram.org"])).toBe(false);
    expect(siteAllowed("api.telegram.org.evil.com", ["api.telegram.org"])).toBe(false);
    expect(siteAllowed("hooks.example.com", ["*.example.com"])).toBe(true);
    expect(siteAllowed("a.b.example.com", ["*.example.com"])).toBe(true);
    // Every name under it, not the name itself, and not a name that only ends like it.
    expect(siteAllowed("example.com", ["*.example.com"])).toBe(false);
    expect(siteAllowed("notexample.com", ["*.example.com"])).toBe(false);
    expect(hostIn("https://api.x.com/a/{{id}}?b=1")).toBe("api.x.com");
    expect(hostIn("https://{{input.host}}/a")).toBeNull();
    expect(hostIn("http://api.x.com")).toBeNull();
  });

  test("the secrets a step names, and what a site echoes back with them taken out", () => {
    expect(secretsIn(["https://x.com/bot{{secret.A_TOKEN}}/send", { authorization: "Bearer {{ secret.B_KEY }}" }, { text: "{{secret.A_TOKEN}} {{order.id}}" }])).toEqual(["A_TOKEN", "B_KEY"]);
    expect(secretsIn("{{secrets.A}} {{secret}} {{input.secret}}")).toEqual([]);
    expect(withoutSecrets('{"echo":"Bearer abcdef123456","other":"abc"}', ["abcdef123456", "abc"])).toBe('{"echo":"Bearer •••","other":"abc"}');
  });

  test("an address in numbers: only the ones out on the internet", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "149.154.167.220", "2606:4700:4700::1111", "2001:4860:4860::8888"]) expect([ip, publicAddress(ip)]).toEqual([ip, true]);
    const inside = [
      "127.0.0.1", "127.255.255.254", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "192.0.2.1", "198.18.0.1", "198.51.100.7", "203.0.113.9",
      "::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "2001:db8::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:7f00:1", "64:ff9b::a00:1", "::127.0.0.1",
      "not an address", "999.1.1.1", "1.2.3", "",
    ];
    for (const ip of inside) expect([ip, publicAddress(ip)]).toEqual([ip, false]);
    // Just outside the private ranges.
    for (const ip of ["172.15.255.255", "172.32.0.1", "100.63.255.255", "100.128.0.1", "11.0.0.1", "::ffff:8.8.8.8", "64:ff9b::808:808"]) expect([ip, publicAddress(ip)]).toEqual([ip, true]);
  });

  test("a name that points at this machine is refused before anything is sent to it", async () => {
    const found = await new Promise<{ code?: string; address?: unknown }>((done) => safeLookup("localhost", {}, (err, address) => done({ code: (err as { code?: string } | null)?.code, address })));
    expect(found.code).toBe("PRIVATE_ADDRESS");
    expect(found.address).toBe("");
  });

  test("the step's shape, and what stands in the way of publishing it", () => {
    const def = (steps: Step[], more: Partial<FnDef> = {}): FnDef => ({ inputs: [{ name: "chat", type: "text" }], do: steps, ...more });
    const call: Step = { act: "http", method: "POST", url: "https://api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage", headers: { "x-key": "{{secret.OTHER_KEY}}" }, body: { chat_id: "{{input.chat}}", text: "hi" }, as: "sent" };
    expect(FnDefSchema.safeParse(def([call])).success).toBe(true);
    expect(FnDefSchema.safeParse(def([{ ...call, method: "TRACE" } as never])).success).toBe(false);
    expect(FnDefSchema.safeParse(def([{ ...call, as: "secret" }])).success).toBe(false);
    // After a failure a function may tell someone outside too.
    expect(FnDefSchema.safeParse(def([], { fail: [call] })).success).toBe(true);
    const known = { tables: [], fns: [], sites: ["api.telegram.org"], secrets: ["TELEGRAM_TOKEN"] };
    expect(problemsOf(def([call]), known)).toEqual([{ at: "do.0", message: 'No secret called "OTHER_KEY"' }]);
    expect(problemsOf(def([{ ...call, headers: undefined, url: "" }]), known)).toEqual([{ at: "do.0", message: "The address is empty" }]);
    expect(problemsOf(def([{ ...call, headers: undefined, url: "http://api.telegram.org/x" }]), known)).toEqual([{ at: "do.0", message: "The address starts with https://" }]);
    expect(problemsOf(def([{ ...call, headers: undefined, url: "https://evil.example.com/x?t={{secret.TELEGRAM_TOKEN}}" }]), known)).toEqual([{ at: "do.0", message: '"evil.example.com" isn\'t among the allowed sites' }]);
    expect(problemsOf(def([{ ...call, headers: undefined, body: "{{nothing.here}}" }]), known)).toEqual([{ at: "do.0", message: 'Nothing is kept under "nothing" before this step' }]);
    // A secret written for another site is said here, before anything is published (the run refuses it too).
    const two = { ...known, sites: ["api.telegram.org", "*.example.com"], secrets: ["TELEGRAM_TOKEN", "HOOK_KEY"], secretSites: { TELEGRAM_TOKEN: ["api.telegram.org"], HOOK_KEY: ["*.example.com"] } };
    expect(problemsOf(def([{ ...call, headers: { "x-key": "{{secret.HOOK_KEY}}" } }]), two)).toEqual([{ at: "do.0", message: 'The secret "HOOK_KEY" isn\'t for "api.telegram.org"' }]);
    expect(problemsOf(def([{ ...call, url: "https://hooks.example.com/in", headers: undefined, body: { key: "{{secret.HOOK_KEY}}", twice: "{{secret.HOOK_KEY}}" } }]), two)).toEqual([]);
    expect(problemsOf(def([{ ...call, headers: undefined }]), two)).toEqual([]);
    // What it keeps is known to the steps after it; a secret is named nowhere else.
    expect(problemsOf(def([{ ...call, headers: undefined }, { act: "return", value: "{{sent.body}}" }]), known)).toEqual([]);
    expect(problemsOf(def([{ act: "return", value: "{{secret.TELEGRAM_TOKEN}}" }]), known)).toEqual([{ at: "do.0", message: "A secret is only named in a step that calls a site" }]);
    expect(problemsOf(def([{ act: "notify", title: "key: {{secret.TELEGRAM_TOKEN}}" }]), known)).toEqual([{ at: "do.0", message: "A secret is only named in a step that calls a site" }]);
    expect(problemsOf(def([{ ...call, headers: { a: "{{secret.lower}}" } }]), known)).toEqual([{ at: "do.0", message: '"{{secret.lower}}" isn\'t a secret\'s name' }]);
  });
});

describe("The sites and the secrets", () => {
  test("a site is allowed by its name; a secret is written with the sites it is for, and never answered back", async () => {
    expect((await request(app).get(conn).expect(200)).body).toMatchObject({ sites: [], secrets: [], limits: { sites: HTTP_LIMITS.sites, secrets: HTTP_LIMITS.secrets } });
    expect((await addSite(" API.Telegram.org ").expect(201)).body.sites.map((s: { host: string }) => s.host)).toEqual(["api.telegram.org"]);
    // Allowed already: nothing to do. Not a name: refused.
    await addSite("api.telegram.org").expect(201);
    expect((await addSite("http://10.0.0.1/admin").expect(400)).body).toMatchObject({ error: "SITE_INVALID" });
    expect((await addSite("localhost").expect(400)).body).toMatchObject({ error: "SITE_INVALID" });

    const made = (await addSecret("TELEGRAM_TOKEN", TOKEN, ["api.telegram.org"]).expect(201)).body;
    expect(made.secrets).toEqual([{ id: expect.any(String), name: "TELEGRAM_TOKEN", sites: ["api.telegram.org"], note: null, updatedAt: expect.any(String), lastUsedAt: null, usedBy: [] }]);
    // Nowhere in any answer, and not as it was written in the database either.
    const everything = JSON.stringify([made, (await request(app).get(conn)).body, (await request(app).get(at)).body]);
    expect(everything).not.toContain(TOKEN);
    expect(everything).not.toContain("secret-token");
    const row = await prisma.fnSecret.findFirstOrThrow({ where: { name: "TELEGRAM_TOKEN" } });
    expect(row.sealed).toMatch(/^v1\./);
    expect(row.sealed).not.toContain(TOKEN);
    // Its name is capitals; it is one of a kind; it says where it goes.
    expect((await addSecret("telegram", "x", ["api.telegram.org"]).expect(400)).body.error).toBeTruthy();
    expect((await addSecret("TELEGRAM_TOKEN", "other", ["api.telegram.org"]).expect(409)).body).toMatchObject({ error: "SECRET_TAKEN" });
    await addSecret("NO_SITES", "x", []).expect(400);
    expect((await addSecret("BAD_SITE", "x", ["10.0.0.1"]).expect(400)).body).toMatchObject({ error: "SITE_INVALID" });
    // A new value replaces the old (the name stays); the sites it is for can change.
    const id = made.secrets[0].id as string;
    const changed = (await request(app).put(`${conn}/secrets/${id}`).send({ value: "new-value-987654", sites: ["api.telegram.org", "*.example.com"], note: "The shop's bot" }).expect(200)).body;
    expect(changed.secrets[0]).toMatchObject({ name: "TELEGRAM_TOKEN", sites: ["api.telegram.org", "*.example.com"], note: "The shop's bot" });
    expect(JSON.stringify(changed)).not.toContain("new-value");
    // The builder is told the names: the sites, and each secret with where it goes.
    expect((await request(app).get(at).expect(200)).body.outside).toEqual({ sites: ["api.telegram.org"], secrets: [{ name: "TELEGRAM_TOKEN", sites: ["api.telegram.org", "*.example.com"] }] });
  });

  test("a secret a function names isn't deleted from under it; a site taken away is no longer called", async () => {
    await addSite("api.telegram.org").expect(201);
    const secret = (await addSecret("TELEGRAM_TOKEN", TOKEN, ["api.telegram.org"]).expect(201)).body.secrets[0];
    const fn = await make("uses", { do: [{ act: "http", method: "GET", url: "https://api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/getMe", as: "me" }, { act: "return", value: "{{me.body}}" }] });
    expect((await request(app).get(conn).expect(200)).body.secrets[0].usedBy).toEqual([`${PREFIX}uses`]);
    expect((await request(app).delete(`${conn}/secrets/${secret.id}`).expect(409)).body).toMatchObject({ error: "SECRET_USED", details: { functions: [`${PREFIX}uses`] } });
    expect((await run(fn.id)).ok).toBe(true);
    // The site taken away: the published function stops there, saying why; nothing was sent.
    await request(app).delete(`${conn}/sites/api.telegram.org`).expect(200);
    sent = [];
    expect(await run(fn.id)).toMatchObject({ ok: false, error: '"api.telegram.org" isn\'t among the allowed sites', failedAt: "do.0" });
    expect(sent).toEqual([]);
    await request(app).delete(`${conn}/sites/api.telegram.org`).expect(404);
    // The function gone, the secret goes.
    await request(app).delete(`${at}/${fn.id}`).expect(200);
    expect((await request(app).delete(`${conn}/secrets/${secret.id}`).expect(200)).body.secrets).toEqual([]);
  });

  test("building functions isn't opening a way out: sites and secrets need their own permission", async () => {
    const builder = await prisma.staffRole.create({ data: { name: `${PREFIX}builder`, permissions: ["functions:read", "functions:write"] } });
    const looker = await prisma.staffRole.create({ data: { name: `${PREFIX}looker`, permissions: ["connections:read"] } });
    const member = async (email: string, roleId: string) => {
      const u = await prisma.adminUser.create({ data: { email, name: email.split("@")[0], passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: roleId } });
      return `Bearer ${signAccessToken({ sub: u.id, email: u.email, role: "STAFF" } as never)}`;
    };
    const build = await member("builder@fnhttp-spec.test", builder.id);
    const look = await member("looker@fnhttp-spec.test", looker.id);
    await addSite("api.telegram.org").expect(201);
    await addSecret("TELEGRAM_TOKEN", TOKEN, ["api.telegram.org"]).expect(201);
    // The builder sees the names in the builder, and can't open the page or add a site.
    expect((await request(app).get(at).set("Authorization", build).expect(200)).body.outside.sites).toEqual(["api.telegram.org"]);
    await request(app).get(conn).set("Authorization", build).expect(403);
    await request(app).post(`${conn}/sites`).set("Authorization", build).send({ host: "evil.example.com" }).expect(403);
    // Looking isn't changing.
    expect((await request(app).get(conn).set("Authorization", look).expect(200)).body.secrets[0].name).toBe("TELEGRAM_TOKEN");
    await request(app).post(`${conn}/secrets`).set("Authorization", look).send({ name: "X_KEY", value: "v", sites: ["api.telegram.org"] }).expect(403);
  });
});

describe("A function's call to a site", () => {
  const TELEGRAM: Step = { act: "http", method: "POST", url: "https://api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage", headers: { "X-Shop": "estabrek {{input.chat}}", Authorization: "Bearer {{secret.TELEGRAM_TOKEN}}" }, body: { chat_id: "{{input.chat}}", text: "Order {{input.order}} is ready", extra: "{{input.more}}" }, as: "sent" };
  /** The same call with only the chat handed in. */
  const SIMPLE: Step = { act: "http", method: "POST", url: "https://api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage", body: { chat_id: "{{input.chat}}", text: "hi" }, as: "sent" };
  beforeEach(async () => {
    await addSite("api.telegram.org").expect(201);
    await addSecret("TELEGRAM_TOKEN", TOKEN, ["api.telegram.org"]).expect(201);
  });

  test("the request as it leaves: the secret where the owner named it, the run's values in their places; the answer kept under a name", async () => {
    answer = () => ({ text: JSON.stringify({ ok: true, result: { message_id: 77 } }) });
    const fn = await make("send", { inputs: [{ name: "chat", type: "text" }, { name: "order", type: "text" }, { name: "more", type: "any" }], do: [TELEGRAM, { act: "return", value: { id: "{{sent.body.result.message_id}}", status: "{{sent.status}}", ok: "{{sent.ok}}" } }] });
    const out = await run(fn.id, { chat: "5501", order: "A-12", more: { tags: ["vip"] } });
    expect(out).toMatchObject({ ok: true, value: { id: 77, status: 200, ok: true } });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: "POST", url: `https://api.telegram.org/bot${TOKEN}/sendMessage` });
    expect(sent[0].headers).toMatchObject({ "x-shop": "estabrek 5501", authorization: `Bearer ${TOKEN}`, "content-type": "application/json" });
    expect(JSON.parse(sent[0].body!)).toEqual({ chat_id: "5501", text: "Order A-12 is ready", extra: { tags: ["vip"] } });
    // What the run says about it never has the secret: the step's line names it.
    const line = out.trace.find((l) => l.act === "http")!;
    expect(line.note).toBe("POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage answered 200");
    expect(JSON.stringify(out)).not.toContain(TOKEN);
    // The secret was used: it says when.
    await new Promise((r) => setTimeout(r, 50));
    expect((await request(app).get(conn).expect(200)).body.secrets[0].lastUsedAt).not.toBeNull();
  });

  test("a secret is never one of the run's things: nothing a caller sends asks for it, and what a site echoes comes back without it", async () => {
    // The site echoes everything it was sent, the key too.
    answer = (req) => ({ text: JSON.stringify({ youSent: req.body ? JSON.parse(req.body) : null, auth: req.headers.authorization, url: req.url }) });
    const fn = await make("echo", { inputs: [{ name: "chat", type: "text" }, { name: "order", type: "text" }, { name: "more", type: "any" }], do: [TELEGRAM, { act: "set", name: "peek", value: "[{{secret.TELEGRAM_TOKEN}}]" }, { act: "return", value: { echoed: "{{sent.body}}", peek: "{{peek}}" } }] }, false);
    // Named in a step that calls no site: said before publishing.
    expect(fn.problems).toEqual([{ at: "do.1", message: "A secret is only named in a step that calls a site" }]);
    // A caller who writes the secret's name into what they send gets their own words sent on, not the secret.
    const out = await run(fn.id, { chat: "{{secret.TELEGRAM_TOKEN}}", order: "{{ secret.TELEGRAM_TOKEN }}", more: { text: "{{secret.TELEGRAM_TOKEN}}" } }, { dry: false, which: "draft" }).catch(() => null);
    expect(out).toBeNull();
    const tried = (await request(app).post(`${at}/${fn.id}/run`).send({ input: { chat: "x" }, dry: false, which: "draft" }).expect(400)).body;
    expect(tried.error).toBe("FN_DRAFT_IS_DRY");
    // Published without the step that peeks, and run for real.
    await request(app).put(`${at}/${fn.id}`).send({ draft: { lang: "en", inputs: [{ name: "chat", type: "text" }, { name: "order", type: "text" }, { name: "more", type: "any" }], do: [TELEGRAM, { act: "return", value: "{{sent.body}}" }] } }).expect(200);
    await request(app).post(`${at}/${fn.id}/publish`).expect(200);
    const real = await run(fn.id, { chat: "{{secret.TELEGRAM_TOKEN}}", order: "{{ secret.TELEGRAM_TOKEN }}", more: { text: "{{secret.TELEGRAM_TOKEN}}" } });
    expect(real.ok).toBe(true);
    const body = JSON.parse(sent[0].body!);
    expect(body).toEqual({ chat_id: "{{secret.TELEGRAM_TOKEN}}", text: "Order {{ secret.TELEGRAM_TOKEN }} is ready", extra: { text: "{{secret.TELEGRAM_TOKEN}}" } });
    expect(sent[0].headers["x-shop"]).toBe("estabrek {{secret.TELEGRAM_TOKEN}}");
    // What came back: the key the site echoed is taken out, wherever it sat.
    expect(JSON.stringify(real)).not.toContain(TOKEN);
    expect(real.value).toMatchObject({ auth: "Bearer •••", url: "https://api.telegram.org/bot•••/sendMessage" });
  });

  test("a value put into an address is one piece of it: it can't add a path, a question or another site", async () => {
    await addSite("api.example.com").expect(201);
    const fn = await make("address", { inputs: [{ name: "id", type: "text" }], do: [{ act: "http", method: "GET", url: "https://api.example.com/orders/{{input.id}}?full=1", as: "got" }, { act: "return", value: "{{got.status}}" }] });
    await run(fn.id, { id: "12/../../admin?x=1&y=2#z" });
    expect(sent[0].url).toBe("https://api.example.com/orders/12%2F..%2F..%2Fadmin%3Fx%3D1%26y%3D2%23z?full=1");
    // The site itself named by a value: still only an allowed one.
    const any = await make("anywhere", { inputs: [{ name: "host", type: "text" }], do: [{ act: "http", method: "GET", url: "https://{{input.host}}/x" }] });
    expect(await run(any.id, { host: "evil.example.org" })).toMatchObject({ ok: false, error: '"evil.example.org" isn\'t among the allowed sites' });
    expect(await run(any.id, { host: "api.example.com@evil.example.org" })).toMatchObject({ ok: false });
    expect(await run(any.id, { host: "127.0.0.1" })).toMatchObject({ ok: false });
    expect(sent).toHaveLength(1);
    expect((await run(any.id, { host: "api.example.com" })).ok).toBe(true);
  });

  test("a secret goes only to the sites it is for: said before publishing, and refused at the run too; so is an address in numbers", async () => {
    await addSite("hooks.example.com").expect(201);
    const leak: Partial<FnDef> = { do: [{ act: "http", method: "POST", url: "https://hooks.example.com/in", body: { key: "{{secret.TELEGRAM_TOKEN}}" } }] };
    // Written for another site: it stands in the way of publishing, and a try of the draft is refused as well.
    const early = await make("early", leak, false);
    expect(early.problems).toEqual([{ at: "do.0", message: 'The secret "TELEGRAM_TOKEN" isn\'t for "hooks.example.com"' }]);
    expect((await request(app).post(`${at}/${early.id}/publish`).expect(409)).body.error).toBe("FN_HAS_PROBLEMS");
    expect(await run(early.id, {}, { dry: true, which: "draft" })).toMatchObject({ ok: false, error: 'The secret "TELEGRAM_TOKEN" isn\'t for "hooks.example.com"', failedAt: "do.0" });
    // Allowed for it now: it publishes, and it goes.
    const id = (await request(app).get(conn)).body.secrets[0].id;
    await request(app).put(`${conn}/secrets/${id}`).send({ sites: ["api.telegram.org", "hooks.example.com"] }).expect(200);
    const fn = await make("leak", leak);
    expect((await run(fn.id)).ok).toBe(true);
    expect(JSON.parse(sent[0].body!)).toEqual({ key: TOKEN });
    // Its sites narrowed after the function was published: the very next run doesn't send it.
    await request(app).put(`${conn}/secrets/${id}`).send({ sites: ["api.telegram.org"] }).expect(200);
    expect(await run(fn.id)).toMatchObject({ ok: false, error: 'The secret "TELEGRAM_TOKEN" isn\'t for "hooks.example.com"', failedAt: "do.0" });
    expect(sent).toHaveLength(1);
    for (const [url, why] of [
      ["https://10.0.0.5/admin", "A site is called by its name"],
      ["https://[::1]/x", "A site is called by its name"],
      ["https://hooks.example.com:8443/x", "Only the standard https port is called"],
      ["https://user:pass@hooks.example.com/x", "An address doesn't carry a name and password"],
    ] as const) {
      const made = (await request(app).post(at).send({ name: `${PREFIX}bad ${url.length}${why.length}` }).expect(201)).body;
      await request(app).put(`${at}/${made.id}`).send({ draft: { inputs: [], do: [{ act: "http", method: "GET", url }] } }).expect(200);
      expect(await run(made.id, {}, { dry: true, which: "draft" })).toMatchObject({ ok: false, error: why });
    }
  });

  test("a site's \"no\" stops the run unless the step says it decides; a site that doesn't answer is said plainly", async () => {
    answer = () => ({ status: 404, text: '{"ok":false,"description":"chat not found"}' });
    const strict = await make("strict", { inputs: [{ name: "chat", type: "text" }], do: [SIMPLE, { act: "return", value: "sent" }], fail: [{ act: "notify", title: `${PREFIX}failed: {{error}}` }] });
    const out = await run(strict.id, { chat: "1" });
    expect(out).toMatchObject({ ok: false, failedAt: "do.0", error: "POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage answered 404" });
    expect((await prisma.adminNotification.findFirstOrThrow({ where: { title: { startsWith: PREFIX } } })).title).toBe(`${PREFIX}failed: POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage answered 404`);
    // The steps decide: the answer is kept, with its status.
    const lenient = await make("lenient", { inputs: [{ name: "chat", type: "text" }], do: [{ ...SIMPLE, anyStatus: true }, { act: "return", value: { status: "{{sent.status}}", ok: "{{sent.ok}}", why: "{{sent.body.description}}" } }] });
    expect(await run(lenient.id, { chat: "1" })).toMatchObject({ ok: true, value: { status: 404, ok: false, why: "chat not found" } });
    // No answer: why, by the site's name, never by its address in full.
    setTransportForTests(async () => {
      throw Object.assign(new Error("connect ETIMEDOUT 149.154.167.220:443"), { code: "ETIMEDOUT" });
    });
    try {
      expect(await run(lenient.id, { chat: "1" })).toMatchObject({ ok: false, error: '"api.telegram.org" didn\'t answer in time' });
    } finally {
      setTransportForTests(network);
    }
    // Words that aren't JSON come back as words.
    answer = () => ({ type: "text/plain; charset=utf-8", text: "pong" });
    const plain = await make("plain", { do: [{ act: "http", method: "GET", url: "https://api.telegram.org/ping", as: "got" }, { act: "return", value: "{{got.body}}" }] });
    expect((await run(plain.id)).value).toBe("pong");
  });

  test("a try-out checks the call and doesn't make it; a run makes so many calls and no more", async () => {
    const fn = await make("dry", { inputs: [{ name: "chat", type: "text" }], do: [SIMPLE, { act: "return", value: "{{sent}}" }] });
    const dry = await run(fn.id, { chat: "9" }, { dry: true });
    expect(dry).toMatchObject({ ok: true, dry: true, value: { status: 0, ok: true, body: null, dry: true } });
    expect(dry.trace[0].note).toBe("Would call POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage");
    expect(sent).toEqual([]);
    // A try-out of a call that could never be made says so.
    await request(app).delete(`${conn}/sites/api.telegram.org`).expect(200);
    expect(await run(fn.id, { chat: "9" }, { dry: true })).toMatchObject({ ok: false, error: '"api.telegram.org" isn\'t among the allowed sites' });
    await addSite("api.telegram.org").expect(201);
    // Ten calls a run.
    const many = await make("many", { do: [{ act: "set", name: "list", value: Array.from({ length: HTTP_LIMITS.calls + 2 }, (_, k) => k) }, { act: "each", list: "{{list}}", do: [{ act: "http", method: "GET", url: "https://api.telegram.org/n/{{item}}" }] }] });
    const out = await run(many.id);
    expect(out).toMatchObject({ ok: false, error: `A run calls sites up to ${HTTP_LIMITS.calls} times` });
    expect(sent).toHaveLength(HTTP_LIMITS.calls);
  });
});
