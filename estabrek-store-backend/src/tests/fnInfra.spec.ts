import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { type FnDef } from "../lib/fnDef.js";
import { forgetConnections, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { READY_KEY, kindOf, kindsOut } from "../lib/fnKinds.js";
import { INFRA_ACTIONS, INFRA_KEY, LOOK_LIMITS, RAILWAY_QUERIES, linkOf, pagesProject, railwayProjects, vercelProject } from "../lib/fnKindsInfra.js";
import { forgetReady } from "../lib/fnReady.js";
import { resetRunsForTests } from "../lib/runs.js";

// Where the store itself is hosted, as ready connections: Neon, Railway, Vercel and Cloudflare,
// each connected with a token and READ (projects, branches, services, deploys), never changed.
// With the database; the network is stood in for here, and every key is made up. Requests to
// /v1/admin without a token run as the test owner.

const PREFIX = "fninfra-spec-";
const admin = "/v1/admin";
const at = `${admin}/functions`;
const conn = `${admin}/connections`;
// Made up, and not in the shape of any real service's key.
const KEYS = { neon: "made-up-neon-key-for-a-test", railway: "made-up-railway-token-test", vercel: "made-up-vercel-token-test", cloudflare: "made-up-cloudflare-token-for-a-test" } as const;
const ACCOUNT = "0123456789abcdef0123456789abcdef";
// What a service answers that must never come out: an environment's values, a password.
const LEAK = "do-not-show-this-value";

type Sent = { method: string; url: string; headers: Record<string, string>; body?: string };
let sent: Sent[] = [];
let answer: (req: Sent) => { status?: number; type?: string; text: string } = () => ({ text: "{}" });
const network: Transport = async ({ method, url, headers, body }) => {
  const req = { method, url: url.toString(), headers, body };
  sent.push(req);
  const a = answer(req);
  return { status: a.status ?? 200, type: a.type ?? "application/json", text: a.text, cut: false };
};
const json = (v: unknown) => ({ text: JSON.stringify(v) });
const gqlOf = (req: Sent) => JSON.parse(req.body ?? "{}") as { query: string; variables?: Record<string, unknown> };

type Ready = { id: string; name: string; kind: string; settings: Record<string, string> };
const addReady = (body: Record<string, unknown>) => request(app).post(`${conn}/ready`).send(body);
const connect = async (kind: keyof typeof KEYS, settings: Record<string, string> = {}, name = kind) => ((await addReady({ kind, name, key: KEYS[kind], settings }).expect(201)).body.ready as Ready[]).find((c) => c.name === name)!;
const look = async (id: string) => (await request(app).post(`${conn}/ready/${id}/look`).send({}).expect(200)).body;
const tryIt = async (id: string) => (await request(app).post(`${conn}/ready/${id}/test`).send({}).expect(200)).body;
const make = async (name: string, def: Partial<FnDef>) => {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  expect(saved.problems).toEqual([]);
  await request(app).post(`${at}/${made.id}/publish`).expect(200);
  return made.id as string;
};
const run = async (id: string, input: Record<string, unknown> = {}) => (await request(app).post(`${at}/${id}/run`).send({ input, dry: false, which: "live" }).expect(200)).body as { ok: boolean; value: any; error: string | null };

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnConnection.deleteMany({});
  await prisma.fnSite.deleteMany({});
  forgetConnections();
  forgetReady();
  sent = [];
  answer = () => json({});
}
beforeAll(() => setTransportForTests(network));
beforeEach(clean);
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("The four kinds, by themselves", () => {
  test("each has its one site, reads (a look, nothing that sends), and its key is the connection's own name for it", () => {
    expect(INFRA_KEY).toBe(`{{secret.${READY_KEY}}}`);
    const out = kindsOut().filter((k) => ["neon", "railway", "vercel", "cloudflare"].includes(k.kind));
    expect(out.map((k) => [k.kind, k.host, k.look, k.test.sends])).toEqual([
      ["neon", "console.neon.tech", true, false],
      ["railway", "backboard.railway.com", true, false],
      ["vercel", "api.vercel.com", true, false],
      ["cloudflare", "api.cloudflare.com", true, false],
    ]);
    // The others show nothing.
    expect(kindsOut().filter((k) => k.look).map((k) => k.kind)).toEqual(["neon", "railway", "vercel", "cloudflare"]);
  });

  test("every call reads: a GET, or (Railway) one of this file's own queries; none asks for a password, a variable or a token's display", () => {
    const settings = { org: "org-a", project: "p", token: "account", workspace: "w", team: "t", account: ACCOUNT };
    const give = { project: "p", service: "s", environment: "e", account: ACCOUNT, target: "production", workspace: "w" };
    const queries = Object.values(RAILWAY_QUERIES) as string[];
    for (const [kind, a] of INFRA_ACTIONS) {
      for (const token of ["account", "workspace", "project"]) {
        const call = a.call({ ...settings, token }, give);
        if (kind === "railway") {
          expect(call).toMatchObject({ method: "POST", url: "https://backboard.railway.com/graphql/v2" });
          expect(queries).toContain((call.body as { query: string }).query);
        } else expect(call.method).toBe("GET");
        expect(call.url.startsWith(`https://${kindOf(kind)!.host}/`)).toBe(true);
      }
    }
    for (const q of queries) {
      expect(q.startsWith("query")).toBe(true);
      // "{{" or "}}" in a call is a run's name to fill; a query never has one.
      expect(q).not.toMatch(/\{\{|\}\}/);
      expect(q).not.toMatch(/mutation|displayToken|variables|password|connection/i);
    }
  });

  test("its key and settings as they are kept", () => {
    const neon = kindOf("neon")!;
    const cf = kindOf("cloudflare")!;
    expect([neon.key(` Bearer ${KEYS.neon} `), neon.key("short"), neon.key("two\nlines"), neon.key("{{secret.X}}x".repeat(3))]).toEqual([KEYS.neon, null, null, null]);
    expect([cf.key(KEYS.cloudflare), cf.key("made-up-but-too-short")]).toEqual([KEYS.cloudflare, null]);
    const tidy = (kind: string, id: string, v: string) => kindOf(kind)!.settings.find((s) => s.id === id)!.tidy!(v);
    expect([tidy("neon", "org", "org-quiet-lake-12345678"), tidy("neon", "org", "my org")]).toEqual(["org-quiet-lake-12345678", null]);
    expect([tidy("cloudflare", "account", ACCOUNT.toUpperCase()), tidy("cloudflare", "account", "123")]).toEqual([ACCOUNT, null]);
    expect(kindOf("railway")!.settings.map((s) => [s.id, s.choices ?? null, s.shownWhen ?? null])).toEqual([
      ["token", ["account", "workspace", "project"], null],
      ["workspace", null, ["token", "workspace"]],
    ]);
  });

  test("what is read is picked field by field: an environment's values never come out", () => {
    const p = vercelProject({ id: "prj_1", name: "shop", framework: "nextjs", env: [{ key: "DATABASE_URL", value: LEAK }], latestDeployments: [{ uid: "dpl_1", url: "shop-1.vercel.app", state: "READY", target: "production", meta: { githubCommitRef: "main", githubCommitSha: "abcdef0123", githubCommitMessage: "fix: cart" } }] });
    expect(p).toEqual({ id: "prj_1", name: "shop", framework: "nextjs", updated: null, latest: expect.objectContaining({ id: "dpl_1", url: "https://shop-1.vercel.app/", state: "READY", branch: "main", commit: "abcdef0", message: "fix: cart" }) });
    const pages = pagesProject({ name: "admin", subdomain: "admin.pages.dev", domains: ["admin.pages.dev"], deployment_configs: { production: { env_vars: { TOKEN: { type: "plain_text", value: LEAK } } } }, latest_deployment: { id: "d1", url: "https://d1.admin.pages.dev", env_vars: { X: { value: LEAK } }, latest_stage: { name: "deploy", status: "success" } } });
    expect(JSON.stringify([p, pages])).not.toContain(LEAK);
    expect(pages.latest).toMatchObject({ id: "d1", stage: "deploy", status: "success" });
    // A link is https and a site by its name, or none.
    expect([linkOf("x.vercel.app"), linkOf("http://x.test"), linkOf("javascript:alert(1)"), linkOf("https://u:p@x.test"), linkOf("localhost")]).toEqual(["https://x.vercel.app/", undefined, undefined, undefined, undefined]);
    // Railway: the projects, whichever query was answered, once each.
    expect(railwayProjects({ data: { me: { workspaces: [{ name: "Team", projects: { edges: [{ node: { id: "a", name: "api" } }] } }] }, projects: { edges: [{ node: { id: "a", name: "api" } }, { node: { id: "b", name: "old" } }] } } }).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("Neon", () => {
  test("tried and looked at: the projects, each one's branches and whether its compute is awake; never a host or a password", async () => {
    const c = await connect("neon", { project: "fancy-sky-222" });
    answer = (req) => {
      const u = new URL(req.url);
      if (u.pathname === "/api/v2/projects") return json({ projects: [{ id: "quiet-lake-111", name: "estabrek-old", region_id: "aws-eu-central-1", pg_version: 16 }, { id: "fancy-sky-222", name: "estabrek", region_id: "aws-eu-central-1", pg_version: 17, updated_at: "2026-11-19T10:00:00Z" }] });
      if (u.pathname === "/api/v2/users/me/organizations") return json({ organizations: [{ id: "org-a", name: "Estabrek" }] });
      if (u.pathname.endsWith("/branches")) return json({ branches: [{ id: "br-dev", name: "dev", current_state: "ready", parent_id: "br-main" }, { id: "br-main", name: "main", current_state: "ready", default: true, protected: true }] });
      if (u.pathname.endsWith("/endpoints")) return json({ endpoints: [{ id: "ep-1", branch_id: "br-main", type: "read_write", current_state: "active", host: "ep-1.eu-central-1.aws.neon.tech", autoscaling_limit_min_cu: 0.25, autoscaling_limit_max_cu: 2, password: LEAK }] });
      return { status: 404, text: '{"message":"not found"}' };
    };
    expect(await tryIt(c.id)).toEqual({ ok: true, status: 200, said: "estabrek-old, estabrek", why: null, sends: false });
    expect(sent[0]).toMatchObject({ method: "GET", url: "https://console.neon.tech/api/v2/projects?limit=5", headers: { authorization: `Bearer ${KEYS.neon}` } });
    sent = [];
    const seen = await look(c.id);
    expect(seen).toMatchObject({ ok: true, who: "Estabrek", missed: 0 });
    const [usual, other] = seen.groups[0].items;
    // The usual project first, its default branch first, and its compute's state as the branch's.
    expect(usual).toMatchObject({ name: "estabrek", id: "fancy-sky-222", link: "https://console.neon.tech/app/projects/fancy-sky-222", facts: [["region", "aws-eu-central-1"], ["postgres", "17"]] });
    expect(usual.items[0]).toMatchObject({ name: "main", state: "active", tone: "good", facts: [["default", "yes"], ["protected", "yes"], ["compute", "0.25–2 CU"]] });
    expect(usual.items[1]).toMatchObject({ name: "dev", state: "ready", tone: "good" });
    expect(other.name).toBe("estabrek-old");
    expect(JSON.stringify(seen)).not.toMatch(new RegExp(`${LEAK}|neon\\.tech"|ep-1\\.eu`));
    expect(sent.every((s) => s.method === "GET" && new URL(s.url).hostname === "console.neon.tech")).toBe(true);
  });

  test("a personal key with no projects of its own: its organisations' projects; a look is bounded however many there are", async () => {
    const c = await connect("neon");
    answer = (req) => {
      const u = new URL(req.url);
      if (u.pathname === "/api/v2/projects") return json({ projects: u.searchParams.get("org_id") === "org-a" ? Array.from({ length: 40 }, (_, i) => ({ id: `p-${i}`, name: `project ${i}` })) : [] });
      if (u.pathname === "/api/v2/users/me/organizations") return json({ organizations: [{ id: "org-a", name: "Estabrek" }] });
      return json({ branches: [], endpoints: [] });
    };
    const seen = await look(c.id);
    expect(seen.groups[0].items).toHaveLength(LOOK_LIMITS.items);
    expect(seen.groups[0].more).toBe(40 - LOOK_LIMITS.items);
    // Only the first few are opened: the list, the organisations, theirs, and two calls a project opened.
    expect(sent).toHaveLength(3 + 2 * LOOK_LIMITS.detailed);
    expect(sent.length).toBeLessThanOrEqual(LOOK_LIMITS.calls);
  });

  test("a key it doesn't know: the look says why, in Neon's words", async () => {
    const c = await connect("neon");
    answer = () => ({ status: 401, text: '{"message":"authorization failed"}' });
    expect(await look(c.id)).toEqual({ ok: false, status: 401, why: "authorization failed", who: null, groups: [], missed: 2 });
  });
});

describe("Railway", () => {
  test("an account's token: its projects, each one's services and how their last deploy went", async () => {
    const c = await connect("railway", { token: "account" });
    answer = (req) => {
      const q = gqlOf(req);
      if (q.query === RAILWAY_QUERIES.me) return json({ data: { me: { name: "Ibrahim", email: "owner@example.test" } } });
      if (q.query === RAILWAY_QUERIES.account) return json({ data: { me: { name: "Ibrahim", workspaces: [{ id: "w1", name: "Estabrek", projects: { edges: [{ node: { id: "prj-1", name: "estabrek-store", updatedAt: "2026-11-20T03:14:00Z" } }] } }] }, projects: { edges: [] } } });
      if (q.query === RAILWAY_QUERIES.project)
        return json({
          data: {
            project: {
              id: q.variables?.id,
              name: "estabrek-store",
              environments: {
                edges: [
                  { node: { id: "env-pr", name: "pr-12", isEphemeral: true, serviceInstances: { edges: [{ node: { serviceId: "svc-1", serviceName: "api", latestDeployment: { id: "d-pr", status: "CRASHED" } } }] } } },
                  { node: { id: "env-prod", name: "production", isEphemeral: false, serviceInstances: { edges: [{ node: { serviceId: "svc-1", serviceName: "api", region: "europe-west4", latestDeployment: { id: "d-1", status: "SUCCESS", createdAt: "2026-11-20T03:14:51Z", staticUrl: "estabrek-store-production.up.railway.app" } } }] } } },
                ],
              },
            },
          },
        });
      return json({ errors: [{ message: "Problem processing request" }], data: null });
    };
    expect(await tryIt(c.id)).toMatchObject({ ok: true, said: "Ibrahim" });
    expect(sent[0].headers.authorization).toBe(`Bearer ${KEYS.railway}`);
    sent = [];
    const seen = await look(c.id);
    expect(seen).toMatchObject({ ok: true, who: "Ibrahim", missed: 0 });
    const project = seen.groups[0].items[0];
    expect(project).toMatchObject({ name: "estabrek-store", id: "prj-1", link: "https://railway.com/project/prj-1", facts: [["workspace", "Estabrek"]] });
    // Its own environment first, the pull request's after; each says where it runs.
    expect(project.items.map((s: { name: string; state: string; tone: string; facts: Array<[string, string]> }) => [s.name, s.state, s.tone, s.facts[0]])).toEqual([
      ["api", "SUCCESS", "good", ["environment", "production"]],
      ["api", "CRASHED", "bad", ["environment", "pr-12"]],
    ]);
    expect(project.items[0].link).toBe("https://estabrek-store-production.up.railway.app/");
    expect(sent.map((s) => gqlOf(s).query)).toEqual([RAILWAY_QUERIES.account, RAILWAY_QUERIES.project]);
    expect(sent[1].body).toContain('"variables":{"id":"prj-1"}');
  });

  test("a project's token goes in its own header; a no inside a yes is a no", async () => {
    const c = await connect("railway", { token: "project" });
    answer = (req) => (gqlOf(req).query === RAILWAY_QUERIES.token ? json({ data: { projectToken: { projectId: "prj-1", project: { id: "prj-1", name: "estabrek-store" }, environment: { id: "e", name: "production" } } } }) : json({ data: null }));
    expect(await tryIt(c.id)).toMatchObject({ ok: true, said: "estabrek-store · production" });
    expect(sent[0].headers).toMatchObject({ "project-access-token": KEYS.railway });
    expect(sent[0].headers.authorization).toBeUndefined();
    // GraphQL's "no" comes in a 200.
    answer = () => json({ errors: [{ message: "Not Authorized" }], data: null });
    expect(await tryIt(c.id)).toEqual({ ok: false, status: 200, said: null, why: "Not Authorized", sends: false });
    expect(await look(c.id)).toMatchObject({ ok: false, why: "Not Authorized" });
  });

  test("a function reads a project's status: its services, how many are failing; a run stops on a no", async () => {
    const c = await connect("railway", { token: "account" });
    answer = (req) => {
      const q = gqlOf(req);
      if (q.query === RAILWAY_QUERIES.project) return json({ data: { project: { id: "prj-1", name: "estabrek-store", environments: { edges: [{ node: { name: "production", serviceInstances: { edges: [{ node: { serviceId: "a", serviceName: "api", latestDeployment: { status: "FAILED" } } }, { node: { serviceId: "w", serviceName: "worker", latestDeployment: { status: "SUCCESS" } } }] } } }] } } } });
      if (q.query === RAILWAY_QUERIES.deployments) return json({ data: { deployments: { edges: [{ node: { id: "d-1", status: "SUCCESS", serviceId: "a" } }] } } });
      return json({ errors: [{ message: "Not Authorized" }], data: null });
    };
    const id = await make("status", {
      inputs: [{ name: "project", type: "text" }],
      do: [
        { act: "ready", via: c.id, what: "status", give: { project: "{{input.project}}" }, as: "st" },
        { act: "ready", via: c.id, what: "deployments", give: { service: "a" }, as: "ds" },
        { act: "return", value: { failing: "{{st.body.failing}}", services: "{{st.body.count}}", last: "{{ds.body.deployments.0.status}}" } },
      ],
    });
    expect(await run(id, { project: "prj-1" })).toMatchObject({ ok: true, value: { failing: 1, services: 2, last: "SUCCESS" } });
    expect(gqlOf(sent[0]).variables).toEqual({ id: "prj-1" });
    // The ids a step left empty aren't asked for.
    expect(gqlOf(sent[1]).variables).toEqual({ input: { serviceId: "a" }, first: 10 });
    const bad = await make("bad", { do: [{ act: "ready", via: c.id, what: "projects", give: {}, as: "p" }] });
    expect((await run(bad)).error).toBe('Railway "railway" said no: Not Authorized');
  });
});

describe("Vercel and Cloudflare", () => {
  test("Vercel: whose token, each project with its live deploy and the newest ones; a team goes with every call", async () => {
    const c = await connect("vercel", { team: "team_abc123" });
    answer = (req) => {
      const u = new URL(req.url);
      if (u.pathname === "/v2/user") return json({ user: { username: "ibrahim", email: "owner@example.test" } });
      if (u.pathname === "/v7/deployments")
        return json({
          deployments: [
            { uid: "dpl_3", name: "estabrek-store", projectId: "prj_s", url: "estabrek-store-git-feat.vercel.app", state: "ERROR", target: null, created: 1763608000000, meta: { githubCommitRef: "feat/x", githubCommitMessage: "feat: x" }, errorMessage: "Build failed" },
            { uid: "dpl_2", name: "estabrek-store", projectId: "prj_s", url: "estabrek-store.vercel.app", state: "READY", target: "production", created: 1763600000000, meta: { githubCommitRef: "main", githubCommitSha: "869b524ad9", githubCommitMessage: "Merge pull request #189" } },
          ],
        });
      return { status: 404, text: '{"error":{"message":"Not found"}}' };
    };
    expect(await tryIt(c.id)).toMatchObject({ ok: true, said: "@ibrahim" });
    sent = [];
    const seen = await look(c.id);
    expect(seen).toMatchObject({ ok: true, who: "@ibrahim · team_abc123" });
    const shop = seen.groups[0].items[0];
    // The project as its live site stands (the production deploy that went well), with the newest ones under it.
    expect(shop).toMatchObject({ name: "estabrek-store", state: "READY", tone: "good", link: "https://estabrek-store.vercel.app/", facts: [["branch", "main"]] });
    expect(shop.items.map((d: { name: string; tone: string }) => [d.name, d.tone])).toEqual([
      ["feat: x", "bad"],
      ["Merge pull request #189", "good"],
    ]);
    expect(sent.find((s) => s.url.includes("/v7/deployments"))!.url).toContain("teamId=team_abc123");
    // A function reads them too; only what was asked for goes in the address.
    const id = await make("deploys", { do: [{ act: "ready", via: c.id, what: "deployments", give: { target: "production" }, as: "d" }, { act: "return", value: { failing: "{{d.body.failing}}", count: "{{d.body.count}}" } }] });
    sent = [];
    expect(await run(id)).toMatchObject({ ok: true, value: { failing: 1, count: 2 } });
    expect(sent[0].url).toBe("https://api.vercel.com/v7/deployments?limit=20&target=production&teamId=team_abc123");
  });

  test("Cloudflare: the account's Pages projects, its Workers and its names (zones); env_vars never come out", async () => {
    const c = await connect("cloudflare", { account: ACCOUNT });
    answer = (req) => {
      const u = new URL(req.url);
      if (u.pathname === "/client/v4/accounts") return json({ success: true, result: [{ id: ACCOUNT, name: "Estabrek" }] });
      if (u.pathname.endsWith("/pages/projects"))
        return json({ success: true, result: [{ name: "estabrek-store", subdomain: "estabrek-store.pages.dev", domains: ["estabrek-store.pages.dev", "admin.example.test"], deployment_configs: { production: { env_vars: { KEY: { type: "plain_text", value: LEAK } } } }, latest_deployment: { id: "d1", url: "https://d1.estabrek-store.pages.dev", environment: "production", created_on: "2026-11-20T03:15:00Z", latest_stage: { name: "deploy", status: "success" }, deployment_trigger: { metadata: { branch: "main", commit_hash: "869b524ad9", commit_message: "Merge pull request #189" } } } }] });
      if (u.pathname.endsWith("/workers/scripts")) return json({ success: true, result: [{ id: "estabrek-store", modified_on: "2026-11-20T03:15:00Z" }] });
      if (u.pathname === "/client/v4/zones") return json({ success: true, result: [{ id: "z1", name: "example.test", status: "active", plan: { name: "Free Website" } }] });
      return { status: 403, text: '{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}' };
    };
    expect(await tryIt(c.id)).toMatchObject({ ok: true, said: "Estabrek" });
    const seen = await look(c.id);
    expect(seen).toMatchObject({ ok: true, who: "Estabrek", missed: 0 });
    expect(seen.groups.map((g: { id: string }) => g.id)).toEqual(["pages", "workers", "zones"]);
    expect(seen.groups[0].items[0]).toMatchObject({ name: "estabrek-store", state: "success", tone: "good", link: "https://estabrek-store.pages.dev/", facts: [["environment", "production"], ["branch", "main"], ["commit", "869b524"], ["domains", "admin.example.test"]] });
    expect(seen.groups[2].items[0]).toMatchObject({ name: "example.test", state: "active", tone: "good", facts: [["plan", "Free Website"]] });
    expect(JSON.stringify(seen)).not.toContain(LEAK);
    // A token that may read some things and not others: what it may read is shown, and the rest counted.
    answer = (req) => (new URL(req.url).pathname === "/client/v4/zones" ? json({ success: true, result: [{ id: "z1", name: "example.test", status: "pending" }] }) : { status: 403, text: '{"success":false,"errors":[{"message":"Authentication error"}]}' });
    const part = await look(c.id);
    expect(part).toMatchObject({ ok: true, missed: 3, groups: [{ id: "zones", items: [{ name: "example.test", tone: "busy" }] }] });
  });

  test("a kind with nothing to show isn't looked at; a look needs to change connections, as trying does", async () => {
    const t = ((await addReady({ kind: "telegram", name: "Bot", key: "123456789:AAH-made-up-token-for-a-test-xyz12" }).expect(201)).body.ready as Ready[])[0];
    expect((await request(app).post(`${conn}/ready/${t.id}/look`).send({}).expect(400)).body.error).toBe("NOTHING_TO_LOOK");
    await request(app).post(`${conn}/ready/nope/look`).send({}).expect(404);
    expect(sent).toEqual([]);
  });
});
