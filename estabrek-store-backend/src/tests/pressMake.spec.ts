import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { forgetConnections, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { forgetReady } from "../lib/fnReady.js";
import { PRESS_QUERIES } from "../lib/pressCheck.js";
import { MAKE_QUERIES, MAKE_STEPS, setOwnerWaitForTests } from "../lib/pressMake.js";
import { open, seal } from "../lib/secretBox.js";

// نسخ الزباين: a client's copy made, in the owner's own Neon, Railway, Vercel and Cloudflare accounts,
// through their ready connections. The four services are stood in for here (each one remembers what
// it was asked to make), and every key and password is made up. Requests to /v1/admin without a
// token run as the test owner.

const at = "/v1/admin/system/copies";
const conn = "/v1/admin/connections";
const ACCOUNT = "0123456789abcdef0123456789abcdef";
const KEYS = { neon: "made-up-neon-key-for-a-test", railway: "made-up-railway-token-test", vercel: "made-up-vercel-token-test", cloudflare: "made-up-cloudflare-token-for-a-test" } as const;
const PASSWORD = "made-up-db-password-xyz";
const DATABASE = `postgresql://neondb_owner:${PASSWORD}@ep-calm-1-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`;
const OWNER = { name: "Rana", email: "Rana@Rose.Example", password: "made-up-owner-password-1" };

type Sent = { method: string; host: string; path: string; body: unknown; auth?: string };
let sent: Sent[] = [];
/** What each service holds, as it would. */
let world = fresh();
function fresh() {
  return {
    neon: [] as Array<{ id: string; name: string; created_at: string; region_id: string }>,
    railway: { projects: [] as Array<{ id: string; name: string; createdAt: string }>, services: [] as Array<{ id: string; name: string; projectId: string }>, domains: [] as Array<{ id: string; domain: string }>, variables: null as Record<string, string> | null, connected: null as unknown, deployed: 0, instance: null as unknown },
    vercel: null as null | { id: string; name: string; createdAt: number; env: unknown[]; deployments: unknown[] },
    pages: null as null | { name: string; subdomain: string; created_on: string; body: unknown; deployments: number },
    /** The owner's own Pages project, put up by hand long ago, that asks for the rest (lib/siteAsk.ts). */
    adopted: { name: "paint", subdomain: "paint.pages.dev", created_on: "2026-01-01T00:00:00Z", patched: null as unknown, deployments: 0 },
    /** Says no, once each: a step's name → the words. */
    fail: {} as Record<string, string>,
    /** Made, but its answer lost on the way back. */
    lose: {} as Record<string, boolean>,
    /** The copy's parts answering from outside. */
    live: false,
    taken: { domain: false, address: false, pages: false },
    /** The new server: up once deployed, unless its first build is still going. */
    api: { slow: false, owner: null as null | Record<string, string> },
    /** The address Vercel gives the shop. */
    shopDomain: "rose.vercel.app",
  };
}
const once = (name: string) => {
  const why = world.fail[name];
  delete world.fail[name];
  return why;
};
const lost = (name: string) => {
  const was = world.lose[name];
  delete world.lose[name];
  if (was) throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
};

const json = (v: unknown, status = 200) => ({ status, type: "application/json", text: JSON.stringify(v), cut: false });
const network: Transport = async ({ method, url, headers, body }) => {
  const u = new URL(url.toString());
  const parsed = body ? JSON.parse(body) : undefined;
  sent.push({ method, host: u.hostname, path: `${u.pathname}${u.search}`, body: parsed, auth: headers.authorization });
  const now = new Date().toISOString();

  if (u.hostname === "console.neon.tech") {
    if (method === "GET" && u.pathname === "/api/v2/projects") return json({ projects: world.neon.filter((p) => p.name === u.searchParams.get("search")) });
    if (method === "POST" && u.pathname === "/api/v2/projects") {
      const p = { id: `calm-${world.neon.length + 1}`, name: parsed.project.name, created_at: now, region_id: parsed.project.region_id };
      world.neon.push(p);
      lost("neon.create");
      return json({ project: p, connection_uris: [{ connection_uri: DATABASE }] }, 201);
    }
    const m = /^\/api\/v2\/projects\/([^/]+)\/connection_uri$/.exec(u.pathname);
    if (m && world.neon.some((p) => p.id === m[1])) return json({ uri: DATABASE });
    return json({ message: "not found" }, 404);
  }

  if (u.hostname === "backboard.railway.com") {
    const q = parsed as { query: string; variables: Record<string, any> };
    const r = world.railway;
    const no = (message: string) => json({ errors: [{ message }], data: null });
    if (q.query === PRESS_QUERIES.repo) return json({ data: { gitHubRepoAccessAvailable: { hasAccess: true, isPublic: false } } });
    if (q.query === PRESS_QUERIES.domain) return json({ data: { serviceDomainAvailable: world.taken.domain ? { available: false, message: "Domain is not available" } : { available: true, message: "" } } });
    if (q.query === MAKE_QUERIES.myWorkspaces) return json({ data: { me: { workspaces: [{ id: "ws-1", name: "Mine" }] } } });
    if (q.query === MAKE_QUERIES.workspaceProjects) return json({ data: { workspace: { projects: { edges: r.projects.map((node) => ({ node })) } } } });
    if (q.query === MAKE_QUERIES.projectCreate) {
      const p = { id: `rp-${r.projects.length + 1}`, name: q.variables.i.name, createdAt: now };
      r.projects.push(p);
      return json({ data: { projectCreate: { id: p.id } } });
    }
    if (q.query === MAKE_QUERIES.project)
      return json({ data: { project: { id: q.variables.id, environments: { edges: [{ node: { id: "env-1", name: "production" } }] }, services: { edges: r.services.filter((s) => s.projectId === q.variables.id).map((node) => ({ node })) } } } });
    if (q.query === MAKE_QUERIES.serviceCreate) {
      const s = { id: `svc-${r.services.length + 1}`, name: q.variables.i.name, projectId: q.variables.i.projectId };
      r.services.push(s);
      return json({ data: { serviceCreate: { id: s.id } } });
    }
    if (q.query === MAKE_QUERIES.instance) {
      r.instance = q.variables;
      return json({ data: { serviceInstanceUpdate: true } });
    }
    if (q.query === MAKE_QUERIES.domains) return json({ data: { domains: { serviceDomains: r.domains } } });
    if (q.query === MAKE_QUERIES.domainCreate) {
      const d = { id: `dom-${r.domains.length + 1}`, domain: "api-production-7f3a.up.railway.app" };
      r.domains.push(d);
      return json({ data: { serviceDomainCreate: d } });
    }
    if (q.query === MAKE_QUERIES.domainUpdate) {
      const why = once("railway.domain");
      if (why) return no(why);
      r.domains.find((d) => d.id === q.variables.i.serviceDomainId)!.domain = q.variables.i.domain;
      return json({ data: { serviceDomainUpdate: true } });
    }
    if (q.query === MAKE_QUERIES.variables) {
      r.variables = q.variables.i.variables;
      return json({ data: { variableCollectionUpsert: true } });
    }
    if (q.query === MAKE_QUERIES.connect) {
      r.connected = q.variables;
      return json({ data: { serviceConnect: { id: q.variables.id } } });
    }
    if (q.query === MAKE_QUERIES.deployments) return json({ data: { deployments: { edges: [] } } });
    if (q.query === MAKE_QUERIES.deploy) {
      r.deployed++;
      return json({ data: { serviceInstanceDeploy: true } });
    }
    return no(`Unknown query: ${q.query.slice(0, 40)}`);
  }

  if (u.hostname === "api.vercel.com") {
    const v = world.vercel;
    if (method === "GET" && u.pathname === "/v9/projects/rose") return v ? json(v) : json({ error: { code: "not_found", message: "Project not found" } }, 404);
    if (method === "POST" && u.pathname === "/v11/projects") {
      world.vercel = { id: "prj_1", name: parsed.name, createdAt: Date.now(), env: [], deployments: [] };
      return json({ id: "prj_1", name: parsed.name, ...parsed });
    }
    if (method === "GET" && u.pathname === "/v9/projects/prj_1/domains") return json({ domains: [{ name: world.shopDomain, verified: true }] });
    if (method === "POST" && u.pathname === "/v10/projects/prj_1/env") {
      v!.env = parsed;
      return json({ created: parsed.map((e: { key: string }) => ({ key: e.key })) }, 201);
    }
    if (method === "POST" && u.pathname === "/v13/deployments") {
      v!.deployments.push(parsed);
      return json({ id: "dpl_1", url: "rose-abc.vercel.app" });
    }
    return json({ error: { message: "not here" } }, 404);
  }

  if (u.hostname === "api.cloudflare.com") {
    const base = `/client/v4/accounts/${ACCOUNT}/pages/projects`;
    if (method === "GET" && u.pathname === `${base}/rose-admin`) return world.pages ? json({ success: true, result: world.pages }) : json({ success: false, errors: [{ code: 8000007, message: "Project not found" }] }, 404);
    if (method === "POST" && u.pathname === base) {
      world.pages = { name: parsed.name, subdomain: "rose-admin.pages.dev", created_on: now, body: parsed, deployments: 0 };
      return json({ success: true, result: world.pages });
    }
    if (u.pathname === `${base}/paint` && method === "GET") return json({ success: true, result: world.adopted });
    if (u.pathname === `${base}/paint` && method === "PATCH") {
      world.adopted.patched = parsed;
      return json({ success: true, result: world.adopted });
    }
    if (method === "POST" && u.pathname === `${base}/paint/deployments`) {
      world.adopted.deployments++;
      return json({ success: true, result: { id: "cfd-2" } });
    }
    if (method === "POST" && u.pathname === `${base}/rose-admin/deployments`) {
      world.pages!.deployments++;
      return json({ success: true, result: { id: "cfd-1" } });
    }
    return json({ success: false, errors: [{ message: "not here" }] }, 404);
  }

  // The copy's own addresses, asked from outside.
  if (u.hostname === "rose.vercel.app") return world.live && !world.taken.address ? { status: 200, type: "text/html", text: "<html></html>", cut: false } : { status: world.taken.address ? 200 : 404, type: "text/plain", text: world.taken.address ? "someone's shop" : "DEPLOYMENT_NOT_FOUND", cut: false };
  if (u.hostname === "rose-api.up.railway.app") {
    const up = world.railway.deployed > 0 && !world.api.slow;
    if (!up) return json({ status: "error", message: "Application not found" }, 404);
    if (u.pathname === "/health") return json({ ok: true });
    if (u.pathname === "/v1/auth/first-run" && method === "GET") return json({ needed: !world.api.owner, codeFrom: "link" });
    if (u.pathname === "/v1/auth/first-run" && method === "POST") {
      if (world.api.owner) return json({ error: "FIRST_RUN_DONE", message: "This store already has its owner" }, 409);
      if (parsed.code !== world.railway.variables?.SETUP_CODE) return json({ error: "SETUP_CODE_WRONG", message: "The setup code isn't right" }, 403);
      world.api.owner = parsed;
      return json({ accessToken: "made-up-access-token", refreshToken: "made-up-refresh-token", admin: { email: parsed.email } }, 201);
    }
  }
  // An address no Pages project holds isn't found by its name.
  if (u.hostname === "rose-admin.pages.dev") {
    if (world.taken.pages || world.live) return { status: 200, type: "text/html", text: "<html></html>", cut: false };
    throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
  }
  return json({ message: "not here" }, 404);
};

type Ready = { id: string; name: string; kind: string };
const connect = async (kind: keyof typeof KEYS, settings: Record<string, string> = {}) => ((await request(app).post(`${conn}/ready`).send({ kind, name: kind, key: KEYS[kind], settings }).expect(201)).body.ready as Ready[]).find((c) => c.name === kind)!;
const connectAll = async () => {
  await connect("neon");
  await connect("railway", { token: "account" });
  await connect("vercel", { team: "acme" });
  await connect("cloudflare", { account: ACCOUNT });
};
const make = (body: Record<string, unknown> = {}, status = 202) => request(app).post(`${at}/make`).send({ label: "Rose", server: "rose-api", site: "rose", repo: "acme/store", owner: OWNER, agree: true, ...body }).expect(status);
type View = { id: string; state: string; steps: Array<{ id: string; state: string; why: string | null }>; addresses: Record<string, string>; links: Record<string, string>; owner: { name: string; email: string; made: boolean } | null; welcome: string | null };
/** The copy as its page sees it, once it stopped being made. */
async function settled(id: string): Promise<View> {
  for (let i = 0; i < 250; i++) {
    const v = (await request(app).get(`${at}/made/${id}`).expect(200)).body as View;
    if (v.state !== "making") return v;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("the copy is still being made");
}
const mutations = () => sent.filter((s) => s.method !== "GET" && !(s.host === "backboard.railway.com" && !/^mutation/.test((s.body as { query: string }).query)));

async function clean() {
  await prisma.siteAsk.deleteMany({});
  await prisma.clientCopy.deleteMany({});
  await prisma.fnConnection.deleteMany({});
  forgetConnections();
  forgetReady();
  sent = [];
  world = fresh();
}
beforeAll(() => {
  setTransportForTests(network);
  setOwnerWaitForTests({ every: 10, until: 1500 });
});
beforeEach(clean);
afterAll(async () => {
  await clean();
  setTransportForTests(null);
  setOwnerWaitForTests(null);
});

// Each test makes a whole copy (a few seconds of waiting on its own), and this is the suite's first
// file to use the database: a runner that stalls on it (7 s once on CI) would pass the 5 s default,
// and a test cut off by its time keeps running, making connections under the tests after it.
describe("Making a client's copy", { timeout: 30_000 }, () => {
  test("made in the owner's order: the database, the server, its owner's account on it, then the shop and the admin; its secrets go to its parts and nowhere else", async () => {
    await connectAll();
    // Said yes to in so many words: it costs money every month.
    await request(app).post(`${at}/make`).send({ label: "Rose", server: "rose-api", site: "rose", repo: "acme/store", owner: OWNER }).expect(400);
    // An owner's password is as long as the store's own setup asks for.
    await request(app).post(`${at}/make`).send({ label: "Rose", server: "rose-api", site: "rose", repo: "acme/store", owner: { ...OWNER, password: "short" }, agree: true }).expect(400);
    expect(sent).toEqual([]);

    const begun = (await make()).body as View;
    expect(begun.steps.map((s) => s.id)).toEqual(MAKE_STEPS.map(([id]) => id));
    const v = await settled(begun.id);
    expect(v.state).toBe("made");
    expect(v.steps.every((s) => s.state === "done")).toBe(true);
    expect(v.addresses).toEqual({ api: "https://rose-api.up.railway.app", shop: "https://rose.vercel.app", admin: "https://rose-admin.pages.dev" });
    expect(v.links).toEqual({ neon: "https://console.neon.tech/app/projects/calm-1", railway: "https://railway.com/project/rp-1", vercel: "https://vercel.com/acme/prj_1", cloudflare: `https://dash.cloudflare.com/${ACCOUNT}/pages/view/rose-admin` });

    // In this order, each once, each at its own service with its own key.
    expect(mutations().map((s) => (s.host === "backboard.railway.com" ? /^mutation \w+\(\$\w+: \w+!?[^)]*\) \{ (\w+)/.exec((s.body as { query: string }).query)![1] : `${s.host} ${s.path}`))).toEqual([
      "console.neon.tech /api/v2/projects",
      "projectCreate",
      "serviceCreate",
      "serviceInstanceUpdate",
      "serviceDomainCreate",
      "serviceDomainUpdate",
      "variableCollectionUpsert",
      "serviceConnect",
      "serviceInstanceDeploy",
      "rose-api.up.railway.app /v1/auth/first-run",
      "api.vercel.com /v11/projects?slug=acme",
      `api.cloudflare.com /client/v4/accounts/${ACCOUNT}/pages/projects`,
      "api.vercel.com /v10/projects/prj_1/env?slug=acme&upsert=true",
      "api.vercel.com /v13/deployments?slug=acme",
      `api.cloudflare.com /client/v4/accounts/${ACCOUNT}/pages/projects/rose-admin/deployments`,
    ]);
    // Its owner, made on its own server with its own code, as its first setup would; the press keeps no sign-in of theirs.
    expect(world.api.owner).toEqual({ code: world.railway.variables!.SETUP_CODE, name: "Rana", email: "rana@rose.example", password: OWNER.password });
    expect(v.owner).toEqual({ name: "Rana", email: "rana@rose.example", made: true });
    const keyOf = { "console.neon.tech": KEYS.neon, "backboard.railway.com": KEYS.railway, "api.vercel.com": KEYS.vercel, "api.cloudflare.com": KEYS.cloudflare } as Record<string, string>;
    expect(sent.filter((s) => keyOf[s.host]).every((s) => s.auth === `Bearer ${keyOf[s.host]}`)).toBe(true);

    // The database: Postgres 17 in the region asked for, with the names the server's address names.
    expect(sent.find((s) => s.method === "POST" && s.host === "console.neon.tech")!.body).toEqual({ project: { name: "Rose", region_id: "aws-eu-central-1", pg_version: 17, branch: { database_name: "neondb", role_name: "neondb_owner" } } });
    // The server: in the owner's workspace, its folder and its migration set before its repository is linked.
    const r = world.railway;
    expect(r.projects).toEqual([expect.objectContaining({ id: "rp-1", name: "Rose" })]);
    expect(sent.find((s) => s.host === "backboard.railway.com" && (s.body as { query: string }).query === MAKE_QUERIES.projectCreate)!.body).toMatchObject({ variables: { i: { name: "Rose", defaultEnvironmentName: "production", workspaceId: "ws-1" } } });
    expect(r.instance).toEqual({ s: "svc-1", e: "env-1", i: { rootDirectory: "estabrek-store-backend", preDeployCommand: ["node scripts/migrate-deploy.mjs"] } });
    expect(r.domains).toEqual([{ id: "dom-1", domain: "rose-api.up.railway.app" }]);
    expect(r.connected).toEqual({ id: "svc-1", i: { repo: "acme/store", branch: "main" } });
    expect(r.deployed).toBe(1);
    expect(r.variables).toMatchObject({
      NODE_ENV: "production",
      DATABASE_URL: DATABASE,
      CORS_ORIGINS: "https://rose.vercel.app,https://rose-admin.pages.dev",
      STOREFRONT_URL: "https://rose.vercel.app",
      STOREFRONT_REVALIDATE_URL: "https://rose.vercel.app/api/revalidate",
      ADMIN_APP_URL: "https://rose-admin.pages.dev",
    });
    const vars = r.variables!;
    for (const name of ["JWT_SECRET", "WEBHOOK_TOKEN", "CODES_ENCRYPTION_KEY", "BACKUP_ENCRYPTION_KEY", "STOREFRONT_REVALIDATE_SECRET"]) expect(vars[name], name).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Set(["JWT_SECRET", "WEBHOOK_TOKEN", "CODES_ENCRYPTION_KEY", "BACKUP_ENCRYPTION_KEY", "STOREFRONT_REVALIDATE_SECRET"].map((n) => vars[n])).size).toBe(5);
    expect(vars.SETUP_CODE).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
    // No site picked for it: its setup asks.
    expect(vars).not.toHaveProperty("SETUP_SITE");
    // Built from the same repository, set to the server's real address; the shop and the server share one secret.
    const shopEnv = Object.fromEntries((world.vercel!.env as Array<{ key: string; value: string; type: string }>).map((e) => [e.key, e]));
    expect(sent.find((s) => s.path.startsWith("/v11/projects"))!.body).toEqual({ name: "rose", framework: "nextjs", rootDirectory: "estabrek-storefront", gitRepository: { type: "github", repo: "acme/store" } });
    expect(shopEnv.API_BASE_URL).toMatchObject({ value: "https://rose-api.up.railway.app/v1", type: "encrypted", target: ["production", "preview"] });
    expect(shopEnv.ADMIN_ORIGIN.value).toBe("https://rose-admin.pages.dev");
    expect(shopEnv.REVALIDATE_SECRET).toMatchObject({ value: vars.STOREFRONT_REVALIDATE_SECRET, type: "sensitive" });
    expect(world.vercel!.deployments).toEqual([{ name: "rose", project: "prj_1", target: "production", gitSource: { type: "github", org: "acme", repo: "store", ref: "main" } }]);
    expect(world.pages!.body).toMatchObject({
      name: "rose-admin",
      production_branch: "main",
      build_config: { build_command: "npm run build", destination_dir: "dist", root_dir: "estabrek-admin" },
      source: { type: "github", config: { owner: "acme", repo_name: "store", production_branch: "main" } },
      deployment_configs: { production: { env_vars: { VITE_API_BASE_URL: { type: "plain_text", value: "https://rose-api.up.railway.app/v1" }, VITE_STOREFRONT_BASE_URL: { type: "plain_text", value: "https://rose.vercel.app" } } } },
    });
    expect(world.pages!.deployments).toBe(1);

    // Its owner is in: no setup link to hand over; no secret anywhere the page reads, nor kept unsealed, and the password let go.
    expect(v.welcome).toBeNull();
    const listed = (await request(app).get(`${at}/made`).expect(200)).body.copies as View[];
    expect(listed).toHaveLength(1);
    expect(listed[0].welcome).toBeNull();
    const row = await prisma.clientCopy.findUniqueOrThrow({ where: { id: v.id } });
    expect(Object.keys(JSON.parse(open(row.sealed)))).not.toContain("OWNER_PASSWORD");
    for (const said of [JSON.stringify(listed), JSON.stringify(v), JSON.stringify({ ...row, sealed: null })]) {
      expect(said).not.toContain(PASSWORD);
      expect(said).not.toContain("made-up-");
      for (const name of ["JWT_SECRET", "WEBHOOK_TOKEN", "CODES_ENCRYPTION_KEY", "BACKUP_ENCRYPTION_KEY", "STOREFRONT_REVALIDATE_SECRET", "SETUP_CODE"]) expect(said, name).not.toContain(vars[name]);
    }

    // A name is one copy's.
    expect((await make({}, 409)).body).toMatchObject({ error: "COPY_EXISTS", details: { id: v.id } });
    expect((await make({ server: "other-api" }, 409)).body.error).toBe("COPY_EXISTS");
    expect((await request(app).post(`${at}/made/${v.id}/again`).expect(409)).body.error).toBe("COPY_MADE");

    // Whether it answers yet, asked from outside: the server first (its owner in), then the shop and the admin once built.
    expect((await request(app).get(`${at}/made/${v.id}/alive`).expect(200)).body).toEqual({ api: { ok: true, status: 200 }, shop: { ok: false, status: 404 }, admin: { ok: false, status: 0 }, waiting: false });
    world.live = true;
    expect((await request(app).get(`${at}/made/${v.id}/alive`).expect(200)).body).toEqual({ api: { ok: true, status: 200 }, shop: { ok: true, status: 200 }, admin: { ok: true, status: 200 }, waiting: false });
  });

  test("a step that says no stops it there, in the service's words; tried again, it goes on from there and makes nothing twice", async () => {
    await connectAll();
    world.fail["railway.domain"] = "Domain is not available";
    const id = (await make()).body.id as string;
    let v = await settled(id);
    expect(v.state).toBe("stopped");
    expect(v.steps.map((s) => [s.id, s.state])).toEqual([
      ["neon.project", "done"],
      ["railway.project", "done"],
      ["railway.service", "done"],
      ["railway.domain", "failed"],
      ...MAKE_STEPS.slice(4).map(([s]) => [s, "waiting"]),
    ]);
    expect(v.steps[3].why).toBe("Domain is not available");
    expect(v.welcome).toBeNull();
    await request(app).get(`${at}/made/${id}/alive`).expect(409);

    await request(app).post(`${at}/made/${id}/again`).expect(202);
    v = await settled(id);
    expect(v.state).toBe("made");
    expect(world.neon).toHaveLength(1);
    expect(world.railway.projects).toHaveLength(1);
    expect(world.railway.services).toHaveLength(1);
    // The address Railway gave first, renamed, not a second one.
    expect(world.railway.domains).toEqual([{ id: "dom-1", domain: "rose-api.up.railway.app" }]);
    expect(mutations().filter((s) => s.host === "console.neon.tech")).toHaveLength(1);
  });

  test("its owner waits for the server's first build; a build that takes too long stops it there, and it goes on once the server answers", async () => {
    await connectAll();
    world.api.slow = true;
    const id = (await make()).body.id as string;
    let v = await settled(id);
    expect(v.state).toBe("stopped");
    expect(v.steps.find((s) => s.id === "owner.account")).toMatchObject({ state: "failed", why: "The server didn't answer in time: its first deploy may have failed (see it at Railway)" });
    expect(v.owner).toEqual({ name: "Rana", email: "rana@rose.example", made: false });
    // The password is still kept (sealed) for the try after.
    expect(JSON.parse(open((await prisma.clientCopy.findUniqueOrThrow({ where: { id } })).sealed)).OWNER_PASSWORD).toBe(OWNER.password);
    world.api.slow = false;
    await request(app).post(`${at}/made/${id}/again`).expect(202);
    v = await settled(id);
    expect(v.state).toBe("made");
    expect(world.api.owner?.email).toBe("rana@rose.example");
    expect(world.railway.projects).toHaveLength(1);
  });

  test("an owner already in (an earlier try whose answer was lost) is taken as made; the server refusing the account says why", async () => {
    await connectAll();
    world.api.owner = { email: "rana@rose.example" };
    let v = await settled((await make()).body.id);
    expect(v.state).toBe("made");
    expect(v.owner?.made).toBe(true);
    expect(sent.some((s) => s.host === "rose-api.up.railway.app" && s.method === "POST")).toBe(false);

    await clean();
    await connectAll();
    // The server holds another code than the one the press gave it (its variables not taken yet).
    const network2: Transport = async (req) => {
      const out = await network(req);
      if (new URL(req.url.toString()).hostname === "backboard.railway.com" && world.railway.variables) world.railway.variables = { ...world.railway.variables, SETUP_CODE: "AAAA-BBBB-CCCC-DDDD" };
      return out;
    };
    setTransportForTests(network2);
    try {
      v = await settled((await make()).body.id);
    } finally {
      setTransportForTests(network);
    }
    expect(v.state).toBe("stopped");
    expect(v.steps.find((s) => s.id === "owner.account")).toMatchObject({ state: "failed", why: "The setup code isn't right" });
  });

  test("a whole site picked for it: kept with the copy, its server told which, its page saying it", async () => {
    await connectAll();
    const v = await settled((await make({ startSite: "site-dental-clinic" })).body.id);
    expect(v.state).toBe("made");
    expect(world.railway.variables!.SETUP_SITE).toBe("site-dental-clinic");
    expect((v as View & { startSite: string | null }).startSite).toBe("site-dental-clinic");
    expect((await prisma.clientCopy.findUniqueOrThrow({ where: { id: v.id } })).startSite).toBe("site-dental-clinic");
  });

  test("a shop that came out at another address: the server is told it, and starts again with it", async () => {
    await connectAll();
    world.shopDomain = "rose-acme.vercel.app";
    const v = await settled((await make()).body.id);
    expect(v.state).toBe("made");
    expect(v.addresses.shop).toBe("https://rose-acme.vercel.app");
    const upserts = sent.filter((s) => s.host === "backboard.railway.com" && (s.body as { query: string }).query === MAKE_QUERIES.variables).map((s) => (s.body as { variables: { i: Record<string, unknown> } }).variables.i);
    expect(upserts).toHaveLength(2);
    expect(upserts[0]).toMatchObject({ skipDeploys: true, variables: { STOREFRONT_URL: "https://rose.vercel.app" } });
    expect(upserts[1].skipDeploys).toBeUndefined();
    expect(upserts[1].variables).toEqual({
      CORS_ORIGINS: "https://rose-acme.vercel.app,https://rose-admin.pages.dev",
      STOREFRONT_URL: "https://rose-acme.vercel.app",
      STOREFRONT_REVALIDATE_URL: "https://rose-acme.vercel.app/api/revalidate",
      ADMIN_APP_URL: "https://rose-admin.pages.dev",
    });
    // The admin was given the shop's real address.
    expect((world.pages!.body as { deployment_configs: { production: { env_vars: Record<string, { value: string }> } } }).deployment_configs.production.env_vars.VITE_STOREFRONT_BASE_URL.value).toBe("https://rose-acme.vercel.app");
  });

  test("an answer lost on its way back: tried again, the project it made is found by its name and when it was made", async () => {
    await connectAll();
    // An older project of the same name is someone else's business: never taken for this copy's.
    world.neon.push({ id: "old-1", name: "Rose", created_at: "2025-01-01T00:00:00Z", region_id: "aws-us-east-1" });
    world.lose["neon.create"] = true;
    const id = (await make()).body.id as string;
    let v = await settled(id);
    expect(v.steps[0]).toMatchObject({ id: "neon.project", state: "failed", why: '"console.neon.tech" didn\'t answer in time' });
    expect(world.neon).toHaveLength(2);
    await request(app).post(`${at}/made/${id}/again`).expect(202);
    v = await settled(id);
    expect(v.state).toBe("made");
    expect(world.neon).toHaveLength(2);
    expect(v.links.neon).toBe("https://console.neon.tech/app/projects/calm-2");
  });

  test("not made when a service says no now, or a connection is missing: nothing is asked to be made", async () => {
    await connectAll();
    world.taken.domain = true;
    expect((await make({}, 409)).body).toMatchObject({ error: "COPY_NOT_READY", details: { checks: expect.arrayContaining([expect.objectContaining({ id: "railway.domain", ok: false })]) } });
    world.taken.domain = false;
    world.taken.address = true;
    world.taken.pages = true;
    const checks = (await make({}, 409)).body.details.checks as Array<{ id: string; ok: boolean; why: string }>;
    expect(checks.find((c) => c.id === "vercel.address")).toEqual({ id: "vercel.address", kind: "vercel", ok: false, why: "rose.vercel.app is someone else's" });
    expect(checks.find((c) => c.id === "cloudflare.address")).toEqual({ id: "cloudflare.address", kind: "cloudflare", ok: false, why: "rose-admin.pages.dev is someone else's" });
    expect(mutations()).toEqual([]);
    expect(await prisma.clientCopy.count()).toBe(0);
    expect((await make({ label: "{{secret.CONNECTION_KEY}}" }, 400)).body.error).toBeDefined();
  });

  test("a copy the server stopped making shows as stopped, the step it was on as cut short; tried again it goes on", async () => {
    await connectAll();
    const via = Object.fromEntries((await prisma.fnConnection.findMany()).map((c) => [c.kind, c.id]));
    const steps = MAKE_STEPS.map(([id, kind], i) => ({ id, kind, state: i === 0 ? "doing" : "waiting", why: null, at: null }));
    const secrets = { JWT_SECRET: "a".repeat(43), WEBHOOK_TOKEN: "b".repeat(43), CODES_ENCRYPTION_KEY: "c".repeat(43), BACKUP_ENCRYPTION_KEY: "d".repeat(43), REVALIDATE_SECRET: "e".repeat(43), SETUP_CODE: "ABCD-EFGH-JKLM-NPQR" };
    const row = await prisma.clientCopy.create({ data: { label: "Rose", server: "rose-api", site: "rose", repo: "acme/store", branch: "main", region: "aws-eu-central-1", via, state: "making", steps, made: {}, sealed: seal(JSON.stringify(secrets)) } });
    let v = (await request(app).get(`${at}/made/${row.id}`).expect(200)).body as View;
    expect(v.state).toBe("stopped");
    expect(v.steps[0]).toMatchObject({ state: "failed", why: "The server stopped while doing it" });
    await request(app).post(`${at}/made/${row.id}/again`).expect(202);
    v = await settled(row.id);
    expect(v.state).toBe("made");
    expect(world.railway.variables!.SETUP_CODE).toBe("ABCD-EFGH-JKLM-NPQR");
    expect(world.railway.variables!.JWT_SECRET).toBe("a".repeat(43));
  });

  test("is the owner's alone", async () => {
    const role = await prisma.staffRole.create({ data: { name: "press-make-spec-system", permissions: ["system:read", "system:write"] } });
    const member = await prisma.adminUser.create({ data: { email: "member@press-make-spec.test", name: "member", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    try {
      const token = `Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`;
      expect((await request(app).post(`${at}/make`).set("Authorization", token).send({ label: "x", server: "abc", site: "abc", owner: OWNER, agree: true }).expect(403)).body).toMatchObject({ error: "OWNER_ONLY" });
      await request(app).get(`${at}/made`).set("Authorization", token).expect(403);
    } finally {
      await prisma.adminUser.delete({ where: { id: member.id } });
      await prisma.staffRole.delete({ where: { id: role.id } });
    }
  });
});

// A copy's admin the owner put up by hand on their own Pages (paintispassion.pages.dev, 2026-11-24), with nothing
// linked to it: its client can't reach the owner's Cloudflare, and has no Neon or Railway. It asks the press for the
// rest; the owner says yes after matching the six letters; the press makes the database, the server and the shop,
// and sets that same Pages project to them. Only the browser that asked is told the server and the setup code.
describe("A site that asks for the rest", () => {
  const ADMIN = "https://paint.pages.dev";
  const KEY1 = "k1-made-in-the-asking-browser-0123456789";
  const KEY2 = "k2-made-in-another-browser-abcdefghijklmn";
  const ask = (key: string | undefined, origin = ADMIN, code = 200) => request(app).post("/v1/site-ask").set("Origin", origin).send(key === undefined ? {} : { key }).expect(code);
  const status = (key: string, code = 200) => request(app).post("/v1/site-ask/status").set("Origin", ADMIN).send({ key }).expect(code);
  type Ask = { id: string; admin: string; project: string; pair: string; state: string; copy: { id: string; state: string } | null };
  const asks = async () => (await request(app).get(`${at}/asks`).expect(200)).body.asks as Ask[];
  const yes = (id: string, body: Record<string, unknown> = {}, code = 202) => request(app).post(`${at}/asks/${id}/make`).send({ label: "Paint", server: "rose-api", site: "rose", repo: "acme/store", agree: true, ...body }).expect(code);

  test("asked from the site, matched and said yes to by the owner, made in their accounts; the site itself set to it", async () => {
    // Only a Pages project's own address asks (not a preview's, not any site), with a key of its browser.
    expect((await ask(KEY1, "https://evil.example.com", 403)).body.error).toBe("ASK_ADMIN");
    expect((await ask(KEY1, "https://3f2a.paint.pages.dev", 403)).body.error).toBe("ASK_ADMIN");
    expect((await ask(undefined, ADMIN, 400)).body.error).toBe("ASK_KEY");
    const first = (await ask(KEY1)).body as { pair: string; state: string };
    expect(first).toEqual({ pair: expect.stringMatching(/^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{3}$/), state: "waiting" });
    // The same browser asking again (a reload) is the same ask.
    expect((await ask(KEY1)).body).toEqual(first);
    expect((await status(KEY1)).body).toEqual({ state: "waiting", pair: first.pair });
    // Another browser asking starts it over with new letters, and the first one is told nothing any more.
    const second = (await ask(KEY2)).body as { pair: string };
    expect((await status(KEY1, 404)).body.error).toBe("ASK_NOT_FOUND");

    let list = await asks();
    expect(list).toEqual([expect.objectContaining({ admin: ADMIN, project: "paint", pair: second.pair, state: "waiting", copy: null })]);
    // Said no to: the browser told so, and may ask again (new letters).
    await request(app).post(`${at}/asks/${list[0].id}/refuse`).expect(200);
    expect((await status(KEY2)).body.state).toBe("refused");
    const third = (await ask(KEY2)).body as { pair: string; state: string };
    expect(third.state).toBe("waiting");
    expect(sent).toEqual([]);

    // Said yes to, in so many words: made like any copy, with the site that asked as its admin.
    await connectAll();
    list = await asks();
    await request(app).post(`${at}/asks/${list[0].id}/make`).send({ label: "Paint", server: "rose-api", site: "rose", repo: "acme/store" }).expect(400);
    const begun = (await yes(list[0].id)).body as View;
    // A second yes, or another browser asking meanwhile, finds it taken.
    expect((await yes(list[0].id, {}, 409)).body.error).toBe("ASK_NOT_WAITING");
    expect((await ask("k3-a-third-browser-trying-its-luck-012345", ADMIN, 409)).body.error).toBe("ASK_TAKEN");
    const v = await settled(begun.id);
    expect(v.state).toBe("made");
    expect(v.addresses).toEqual({ api: "https://rose-api.up.railway.app", shop: "https://rose.vercel.app", admin: ADMIN });
    expect(v.owner).toBeNull();

    // Nothing new at Cloudflare: the owner's own project given the server's and the shop's addresses, then built again.
    const base = `/client/v4/accounts/${ACCOUNT}/pages/projects`;
    expect(sent.some((s) => s.method === "POST" && s.path === base)).toBe(false);
    expect(world.pages).toBeNull();
    const env = { VITE_API_BASE_URL: { type: "plain_text", value: "https://rose-api.up.railway.app/v1" }, VITE_STOREFRONT_BASE_URL: { type: "plain_text", value: "https://rose.vercel.app" } };
    expect(world.adopted.patched).toEqual({ deployment_configs: { production: { env_vars: env }, preview: { env_vars: env } } });
    expect(world.adopted.deployments).toBe(1);
    // The server knows the site that asked, and its owner's account is left to the client.
    expect(world.railway.variables).toMatchObject({ CORS_ORIGINS: `https://rose.vercel.app,${ADMIN}`, ADMIN_APP_URL: ADMIN });
    expect(world.api.owner).toBeNull();
    expect(sent.some((s) => s.host === "rose-api.up.railway.app" && s.method === "POST")).toBe(false);

    // The asking browser alone is told the server and the code its owner's account is made with.
    const done = (await status(KEY2)).body as { state: string; api: string; code: string; steps: Array<{ id: string; state: string }> };
    expect(done).toMatchObject({ state: "made", pair: third.pair, api: "https://rose-api.up.railway.app/v1", code: world.railway.variables!.SETUP_CODE });
    expect(done.steps.every((s) => s.state === "done")).toBe(true);
    expect((await status(KEY1, 404)).body.error).toBe("ASK_NOT_FOUND");
    expect(await asks()).toEqual([expect.objectContaining({ state: "making", copy: { id: v.id, state: "made" } })]);
  });

  test("not said yes to while its Pages project isn't the one that asked", async () => {
    await connectAll();
    await ask(KEY1);
    world.adopted.subdomain = "paint-9x2.pages.dev";
    const [one] = await asks();
    const refused = (await yes(one.id, {}, 409)).body as { error: string; details: { checks: Array<{ id: string; ok: boolean; why: string | null }> } };
    expect(refused.error).toBe("COPY_NOT_READY");
    expect(refused.details.checks.find((c) => c.id === "cloudflare.adopt")).toEqual({ id: "cloudflare.adopt", kind: "cloudflare", ok: false, why: `The Pages project "paint" isn't at ${ADMIN}` });
    expect(mutations()).toEqual([]);
    expect((await asks())[0].state).toBe("waiting");
  });

  test("its list and its yes are the owner's alone", async () => {
    await ask(KEY1);
    const [one] = await asks();
    const role = await prisma.staffRole.create({ data: { name: "site-ask-spec-system", permissions: ["system:read", "system:write"] } });
    const member = await prisma.adminUser.create({ data: { email: "member@site-ask-spec.test", name: "member", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    try {
      const token = `Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`;
      await request(app).get(`${at}/asks`).set("Authorization", token).expect(403);
      await request(app).post(`${at}/asks/${one.id}/make`).set("Authorization", token).send({ label: "x", server: "abc", site: "abc", agree: true }).expect(403);
      await request(app).post(`${at}/asks/${one.id}/refuse`).set("Authorization", token).expect(403);
    } finally {
      await prisma.adminUser.delete({ where: { id: member.id } });
      await prisma.staffRole.delete({ where: { id: role.id } });
    }
  });
});
