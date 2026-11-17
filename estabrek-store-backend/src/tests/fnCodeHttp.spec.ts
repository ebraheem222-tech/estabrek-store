import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { CODE_LIMITS, resetCodeForTests, runCode } from "../lib/fnCode.js";
import type { FnDef } from "../lib/fnDef.js";
import { HTTP_LIMITS, forgetConnections, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { codeSecrets } from "../lib/fnSites.js";
import { resetRunsForTests } from "../lib/runs.js";

// A code step that calls sites (F2 + F5): http() and secret() inside the cage (lib/fnCode.ts). The
// server makes each call under a "call a site" step's walls; a secret goes in as the call leaves,
// only to its site, and never reaches the code; the code waits without its own time running; and a
// slow site keeps one machine, not all. With the database; the network is stood in for here;
// requests to /v1/admin without a token run as the test owner.

const PREFIX = "fncodehttp-spec-";
const at = "/v1/admin/functions";
const conn = "/v1/admin/connections";
const KEY = "sk-made-up-value-for-a-test";
type Sent = { method: string; url: string; headers: Record<string, string>; body?: string };
type Out = { ok: boolean; dry: boolean; value: any; error: string | null; failedAt: string | null; trace: Array<{ at: string; act: string; ok: boolean; log?: string[]; error?: string }> };

let sent: Sent[] = [];
let answer: (req: Sent) => { status?: number; type?: string; text: string; wait?: number };
const network: Transport = async ({ method, url, headers, body }) => {
  const req = { method, url: url.toString(), headers, body };
  sent.push(req);
  const a = answer(req);
  if (a.wait) await new Promise((r) => setTimeout(r, a.wait));
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
/** One code step, handed the input's total, its answer kept as "out". */
const code = (text: string): Partial<FnDef> => ({ inputs: [{ name: "total", type: "number" }], do: [{ act: "code", code: text, give: { total: "{{input.total}}" }, as: "out" }] });
const returning = (text: string): Partial<FnDef> => {
  const def = code(text);
  return { ...def, do: [...(def.do ?? []), { act: "return", value: "{{out}}" }] };
};
const run = async (id: string, input: Record<string, unknown> = {}, dry = false) => (await request(app).post(`${at}/${id}/run`).send({ input, dry, which: "live" }).expect(200)).body as Out;
const codeLine = (out: Out) => out.trace.find((t) => t.act === "code");

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnSecret.deleteMany({});
  await prisma.fnSite.deleteMany({});
  forgetConnections();
  sent = [];
  answer = () => ({ text: '{"ok":true}' });
}
beforeAll(async () => {
  setTransportForTests(network);
});
beforeEach(async () => {
  await clean();
  await request(app).post(`${conn}/sites`).send({ host: "api.example.com" }).expect(201);
  await request(app).post(`${conn}/sites`).send({ host: "slow.example.com" }).expect(201);
  await request(app).post(`${conn}/sites`).send({ host: "other.example.com" }).expect(201);
  await request(app).post(`${conn}/secrets`).send({ name: "SHOP_KEY", value: KEY, sites: ["api.example.com"] }).expect(201);
  await request(app).post(`${conn}/secrets`).send({ name: "OTHER", value: "other-made-up-value", sites: ["other.example.com"] }).expect(201);
});
afterAll(async () => {
  await clean();
  setTransportForTests(null);
  resetCodeForTests();
});

describe("A code step that calls a site", () => {
  test("it gets the site's answer; a secret goes in as the call leaves, to its own site, and never reaches the code", async () => {
    answer = (req) => ({ text: JSON.stringify({ echo: req.headers.authorization, id: 7 }) });
    const { id } = await make(
      "post",
      returning(
        [
          'const r = http.post("https://api.example.com/orders?x=1", { total: input.total, note: "{{not a name}}" }, { headers: { Authorization: "Bearer " + secret("SHOP_KEY") } });',
          'log("sent with", secret("SHOP_KEY"));',
          'return { status: r.status, ok: r.ok, got: r.body, mark: secret("SHOP_KEY") };',
        ].join("\n"),
      ),
    );
    const out = await run(id, { total: 5 });
    expect(out.ok).toBe(true);
    // What left: the secret in it, the code's other {{…}} as written.
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ method: "POST", url: "https://api.example.com/orders?x=1" });
    expect(sent[0].headers.authorization).toBe(`Bearer ${KEY}`);
    expect(sent[0].headers["content-type"]).toBe("application/json");
    expect(JSON.parse(sent[0].body!)).toEqual({ total: 5, note: "{{not a name}}" });
    // What the code got: the answer without the secret, and the secret only as its mark.
    expect(out.value).toEqual({ status: 200, ok: true, got: { echo: "Bearer •••", id: 7 }, mark: "{{secret.SHOP_KEY}}" });
    expect(JSON.stringify(out)).not.toContain(KEY);
    // The step's lines: the call, then what the code logged.
    expect(codeLine(out)?.log).toEqual(["↗ POST api.example.com/orders → 200", "sent with {{secret.SHOP_KEY}}"]);
  });

  test("what can't be called throws in the code, for it to catch; uncaught, the step stops with its words and line", async () => {
    const caught = await make("caught", returning('try { http.get("https://evil.example.org/x"); } catch (e) { return "caught: " + e.message; }'));
    expect((await run(caught.id)).value).toBe('caught: "evil.example.org" isn\'t among the allowed sites');
    const loose = await make("loose", code('const a = 1;\nhttp.get("https://evil.example.org/x");\nreturn a;'));
    const out = await run(loose.id);
    expect([out.ok, out.error, out.failedAt]).toEqual([false, '"evil.example.org" isn\'t among the allowed sites (line 2)', "do.0"]);
    expect(codeLine(out)?.log).toEqual(['↗ GET ✕ "evil.example.org" isn\'t among the allowed sites']);
    // A secret for another site; a method that isn't one; a secret's name that isn't one.
    const said = async (name: string, text: string) => (await run((await make(name, returning(`try { ${text} } catch (e) { return e.message; }`))).id)).value;
    expect(await said("other", 'http.get("https://api.example.com/", { headers: { k: secret("OTHER") } });')).toBe('The secret "OTHER" isn\'t for "api.example.com"');
    expect(await said("fetch", 'http("FETCH", "https://api.example.com/");')).toBe("http(method, …): GET, POST, PUT, PATCH or DELETE");
    expect(await said("nameless", 'secret("a b");')).toBe("secret(\"NAME\") takes a secret's name: letters, digits and _");
    expect(await said("plain", 'http.get("http://api.example.com/");')).toBe("The address starts with https://");
    expect(sent).toHaveLength(0);
    // The site's "no" isn't thrown: the code reads it.
    answer = () => ({ status: 404, text: '{"error":"no such order"}' });
    const no = await make("no", returning('const r = http.get("https://api.example.com/orders/9"); return [r.status, r.ok, r.body.error];'));
    expect((await run(no.id)).value).toEqual([404, false, "no such order"]);
  });

  test("its calls count with the run's; a dry run calls nothing", async () => {
    // A code step's own five, then the sixth.
    const six = await make("six", returning('const got = []; for (let i = 0; i < 6; i++) { try { got.push(http.get("https://api.example.com/" + i).status); } catch (e) { got.push(e.message); } } return got;'));
    expect((await run(six.id)).value).toEqual([200, 200, 200, 200, 200, `A code step calls sites up to ${CODE_LIMITS.calls} times`]);
    // The run's ten, across an "http" step and two code steps.
    sent = [];
    const five = 'let n = 0; for (let i = 0; i < 5; i++) { try { http.get("https://api.example.com/" + i); n++; } catch (e) { return [n, e.message]; } } return [n];';
    const run10 = await make("ten", {
      do: [
        { act: "http", method: "GET", url: "https://api.example.com/first" },
        { act: "code", code: five, as: "a" },
        { act: "code", code: five, as: "b" },
        { act: "return", value: { a: "{{a}}", b: "{{b}}" } },
      ],
    });
    expect((await run(run10.id)).value).toEqual({ a: [5], b: [4, `A run calls sites up to ${HTTP_LIMITS.calls} times`] });
    expect(sent).toHaveLength(10);
    // Dry: checked, not made.
    sent = [];
    const dry = await make("dry", returning('return http.post("https://api.example.com/orders", { a: 1 });'));
    const out = await run(dry.id, {}, true);
    expect([out.ok, out.value, sent.length]).toEqual([true, { status: 0, ok: true, body: null, dry: true }, 0]);
    expect(codeLine(out)?.log).toEqual(["↗ POST api.example.com/orders (dry)"]);
  });

  test("waiting for a site isn't the code's own time; a slow site holds one machine, not the others", async () => {
    answer = (req) => (req.url.includes("slow.example.com") ? { wait: 2600, text: '{"late":true}' } : { text: '{"ok":true}' });
    const slow = await make("slow", returning('return http.get("https://slow.example.com/report").body;'));
    const quick = await make("quick", returning("return input.total * 2;"));
    const done: string[] = [];
    const [late, soon] = await Promise.all([
      run(slow.id).then((out) => (done.push("slow"), out)),
      new Promise((r) => setTimeout(r, 300)).then(() => run(quick.id, { total: 21 })).then((out) => (done.push("quick"), out)),
    ]);
    expect([late.ok, late.value, soon.value]).toEqual([true, { late: true }, 42]);
    expect(done).toEqual(["quick", "slow"]);
    // Its own time still counts: code that spins after the call is stopped at the two seconds.
    const spin = await make("spin", code('http.get("https://slow.example.com/report");\nwhile (true) {}'));
    const out = await run(spin.id);
    expect([out.ok, out.error]).toEqual([false, `The code ran longer than ${CODE_LIMITS.ms / 1000} seconds`]);
    // The cage still runs code afterwards.
    expect((await run(quick.id, { total: 2 })).value).toBe(4);
  }, 30_000);

  test("a secret the code names that isn't kept is said before publishing; with no tools, http() says so", async () => {
    const { problems } = await make("unknown", code('http.get("https://api.example.com/", { headers: { k: secret("NOPE") } }); return secret(\'SHOP_KEY\');'), false);
    expect(problems).toEqual([{ at: "do.0", message: 'No secret called "NOPE"' }]);
    expect(codeSecrets('secret("A") + secret(`B_2`) + secret(\'A\') + secret(name) + secret("no way")')).toEqual(["A", "B_2"]);
    // The cage by itself (a test of the code alone, say): nothing is called.
    expect(await runCode('try { http.get("https://api.example.com/"); } catch (e) { return e.message; }', null)).toMatchObject({ ok: true, value: "Calling a site isn't open here" });
    expect(await runCode('return [typeof http, typeof http.post, typeof secret, typeof __http, secret("X")];', null)).toMatchObject({ ok: true, value: ["function", "function", "function", "undefined", "{{secret.X}}"] });
  });
});
