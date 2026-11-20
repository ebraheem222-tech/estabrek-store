import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { forgetConnections, setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { forgetReady } from "../lib/fnReady.js";
import { PRESS_QUERIES } from "../lib/pressCheck.js";

// نسخ الزباين: planning a client's copy of the store. Each service is asked, through the owner's
// own connection, whether what the copy needs is there; nothing is made. With the database; the
// network is stood in for here, and every key is made up. Requests to /v1/admin without a token
// run as the test owner.

const at = "/v1/admin/system/copies";
const conn = "/v1/admin/connections";
const ACCOUNT = "0123456789abcdef0123456789abcdef";
const KEYS = { neon: "made-up-neon-key-for-a-test", railway: "made-up-railway-token-test", vercel: "made-up-vercel-token-test", cloudflare: "made-up-cloudflare-token-for-a-test" } as const;

type Sent = { method: string; url: string; headers: Record<string, string>; body?: string };
let sent: Sent[] = [];
const taken = { vercel: false, pages: false, domain: false, repo: true };
const network: Transport = async ({ method, url, headers, body }) => {
  sent.push({ method, url: url.toString(), headers, body });
  const u = new URL(url.toString());
  const json = (v: unknown, status = 200) => ({ status, type: "application/json", text: JSON.stringify(v), cut: false });
  if (u.hostname === "console.neon.tech") return json({ projects: [] });
  if (u.hostname === "backboard.railway.com") {
    const q = JSON.parse(body ?? "{}") as { query: string; variables: Record<string, string> };
    if (q.query === PRESS_QUERIES.repo) return json({ data: { gitHubRepoAccessAvailable: { hasAccess: taken.repo, isPublic: false } } });
    if (q.query === PRESS_QUERIES.domain) return json({ data: { serviceDomainAvailable: taken.domain ? { available: false, message: "Domain is not available" } : { available: true, message: "" } } });
  }
  if (u.hostname === "api.vercel.com") return taken.vercel ? json({ id: "prj_1", name: "rose" }) : json({ error: { code: "not_found", message: "Project not found" } }, 404);
  // The address itself, asked from outside: no project holds it.
  if (u.hostname === "rose.vercel.app") return { status: 404, type: "text/plain", text: "The deployment could not be found on Vercel. DEPLOYMENT_NOT_FOUND", cut: false };
  if (u.hostname === "api.cloudflare.com") return taken.pages ? json({ success: true, result: { name: "rose-admin" } }) : json({ success: false, errors: [{ code: 8000007, message: "Project not found" }] }, 404);
  return json({ message: "not here" }, 404);
};

type Ready = { id: string; name: string; kind: string };
const connect = async (kind: keyof typeof KEYS, settings: Record<string, string> = {}, name: string = kind) => ((await request(app).post(`${conn}/ready`).send({ kind, name, key: KEYS[kind], settings }).expect(201)).body.ready as Ready[]).find((c) => c.name === name)!;
const plan = (body: Record<string, unknown>, status = 200) => request(app).post(`${at}/plan`).send({ label: "Rose", server: "rose-api", site: "rose", repo: "acme/store", ...body }).expect(status);

async function clean() {
  await prisma.fnConnection.deleteMany({});
  forgetConnections();
  forgetReady();
  sent = [];
  Object.assign(taken, { vercel: false, pages: false, domain: false, repo: true });
}
beforeAll(() => setTransportForTests(network));
beforeEach(clean);
afterEach(() => {
  delete process.env.RAILWAY_GIT_REPO_OWNER;
  delete process.env.RAILWAY_GIT_REPO_NAME;
});
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("Planning a client's copy", () => {
  test("the connections to pick from and the store's own repository: what a copy is built from", async () => {
    await connect("neon");
    await connect("railway", { token: "account" });
    let seen = (await request(app).get(at).expect(200)).body;
    expect(seen.connections).toMatchObject({ neon: [{ name: "neon" }], railway: [{ name: "railway" }], vercel: [], cloudflare: [] });
    expect(JSON.stringify(seen)).not.toContain("made-up-");
    expect(seen.repo).toBeNull();
    process.env.RAILWAY_GIT_REPO_OWNER = "acme";
    process.env.RAILWAY_GIT_REPO_NAME = "store";
    seen = (await request(app).get(at).expect(200)).body;
    expect(seen.repo).toEqual({ repo: "acme/store", branch: "main" });
    // A plan with no repository named takes the store's own.
    expect((await plan({ repo: undefined }).expect(200)).body.input).toMatchObject({ repo: "acme/store", branch: "main" });
  });

  test("everything there: each service says yes, the plan and the addresses, no secret's value in it", async () => {
    await connect("neon");
    await connect("railway", { token: "account" });
    await connect("vercel", { team: "team_abc123" });
    await connect("cloudflare", { account: ACCOUNT });
    const out = (await plan({ server: " Rose API ", site: "Rose" })).body;
    expect(out.input).toEqual({ label: "Rose", server: "rose-api", site: "rose", repo: "acme/store", branch: "main", region: "aws-eu-central-1" });
    expect(out.urls).toEqual({ api: "https://rose-api.up.railway.app", shop: "https://rose.vercel.app", admin: "https://rose-admin.pages.dev" });
    expect(out.checks.map((c: { id: string; ok: boolean }) => [c.id, c.ok])).toEqual([
      ["neon.reach", true],
      ["railway.repo", true],
      ["railway.domain", true],
      ["vercel.name", true],
      ["vercel.address", true],
      ["cloudflare.name", true],
    ]);
    expect(out.ready).toBe(true);
    expect(out.steps.map((s: { id: string }) => s.id)).toEqual(["neon", "railway", "vercel", "cloudflare", "owner"]);
    expect(out.steps[1].variables.find((v: { name: string }) => v.name === "JWT_SECRET")).toEqual({ name: "JWT_SECRET", from: "made" });
    // Each question read, at its own service, with its own key; the names went as values.
    expect(sent.every((s) => s.method === "GET" || (s.method === "POST" && !/mutation/.test(s.body ?? "")))).toBe(true);
    const of = (host: string) => sent.filter((s) => new URL(s.url).hostname === host);
    expect(of("rose.vercel.app")[0]).toMatchObject({ method: "GET", url: "https://rose.vercel.app/" });
    expect(of("rose.vercel.app")[0].headers.authorization).toBeUndefined();
    expect(of("api.vercel.com")[0]).toMatchObject({ url: "https://api.vercel.com/v9/projects/rose?teamId=team_abc123", headers: { authorization: `Bearer ${KEYS.vercel}` } });
    expect(of("api.cloudflare.com")[0].url).toBe(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/rose-admin`);
    expect(of("backboard.railway.com").map((s) => JSON.parse(s.body!).variables)).toEqual([{ r: "acme/store" }, { d: "rose-api.up.railway.app" }]);
    expect(of("backboard.railway.com")[0].headers.authorization).toBe(`Bearer ${KEYS.railway}`);
  });

  test("what isn't there is said, each in its own words; the plan still shows", async () => {
    await connect("neon");
    await connect("railway", { token: "account" });
    await connect("vercel");
    await connect("cloudflare", { account: ACCOUNT });
    Object.assign(taken, { vercel: true, pages: true, domain: true, repo: false });
    const out = (await plan({})).body;
    expect(out.ready).toBe(false);
    expect(Object.fromEntries(out.checks.map((c: { id: string; why: string }) => [c.id, c.why]))).toEqual({
      "neon.reach": null,
      "railway.repo": "Railway can't reach acme/store on GitHub",
      "railway.domain": "Domain is not available",
      "vercel.name": '"rose" is taken by a project of yours',
      "vercel.address": null,
      "cloudflare.name": '"rose-admin" is taken by a project of yours',
    });
    expect(out.steps).toHaveLength(5);
  });

  test("a connection missing or unfit for making: no connection, a project's token, no Account ID; two of a kind are picked from", async () => {
    await connect("railway", { token: "project" });
    await connect("cloudflare");
    await connect("vercel", {}, "Vercel A");
    const b = await connect("vercel", {}, "Vercel B");
    let checks = (await plan({})).body.checks.map((c: { id: string }) => c.id);
    expect(checks).toEqual(["neon.connection", "railway.token", "vercel.connection", "cloudflare.account"]);
    checks = (await plan({ via: { vercel: b.id } })).body.checks.map((c: { id: string }) => c.id);
    expect(checks).toContain("vercel.name");
    expect((await plan({ via: { vercel: "nope" } }, 400)).body).toMatchObject({ error: "CONNECTION_NOT_FOUND", details: { at: "via.vercel" } });
  });

  test("names and the repository that can't be one are refused before anything is asked", async () => {
    expect((await plan({ server: "1x" }, 400)).body).toMatchObject({ error: "NAME_INVALID", message: "A name is at least 3 letters", details: { at: "server", name: "1x" } });
    expect((await plan({ site: "9shop" }, 400)).body).toMatchObject({ error: "NAME_INVALID", message: "A name starts with a letter", details: { at: "site" } });
    expect((await plan({ repo: "not a repo" }, 400)).body).toMatchObject({ error: "REPO_INVALID" });
    expect((await plan({ region: "mars-1" }, 400)).body.error).toBeDefined();
    expect(sent).toEqual([]);
  });

  test("is the owner's alone", async () => {
    const role = await prisma.staffRole.create({ data: { name: "press-spec-system", permissions: ["system:read", "system:write"] } });
    const member = await prisma.adminUser.create({ data: { email: "member@press-spec.test", name: "member", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    try {
      const token = `Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`;
      expect((await request(app).get(at).set("Authorization", token).expect(403)).body).toMatchObject({ error: "OWNER_ONLY" });
      await request(app).post(`${at}/plan`).set("Authorization", token).send({ label: "x", server: "abc", site: "abc" }).expect(403);
    } finally {
      await prisma.adminUser.delete({ where: { id: member.id } });
      await prisma.staffRole.delete({ where: { id: role.id } });
    }
  });
});
