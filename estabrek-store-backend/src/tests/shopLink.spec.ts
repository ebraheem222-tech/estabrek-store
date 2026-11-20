import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { env } from "../config/env.js";
import { signAccessToken } from "../config/security.js";
import { setTransportForTests, type Transport } from "../lib/fnHttp.js";
import { forgetShopLinkForTests, loadShopLink } from "../lib/shopLink.js";

// The store's own shop made from its setup (إعداد المتجر → متجرك): a store with a server and an admin
// and no shop of its own gets one on Vercel with its owner's token (used for these calls alone), told
// this server's and this admin's addresses, and the server takes it as its shop at once. Vercel is
// stood in for here and the token is made up. Requests to /v1/admin without a token run as the test owner.

const at = "/v1/admin/settings/shop";
const TOKEN = "made-up-vercel-token-for-a-test";
const ADMIN = "https://rose-admin.pages.dev";

type Sent = { method: string; host: string; path: string; body: any; auth?: string };
let sent: Sent[] = [];
let world = fresh();
function fresh() {
  return { project: null as null | { id: string; name: string; createdAt: number }, env: [] as any[], deployments: [] as any[], failDeploy: null as string | null, addressTaken: false };
}
const json = (v: unknown, status = 200) => ({ status, type: "application/json", text: JSON.stringify(v), cut: false });
const network: Transport = async ({ method, url, headers, body }) => {
  const u = new URL(url.toString());
  const parsed = body ? JSON.parse(body) : undefined;
  sent.push({ method, host: u.hostname, path: `${u.pathname}${u.search}`, body: parsed, auth: headers.authorization });
  if (u.hostname === "rose-shop.vercel.app") return world.addressTaken ? { status: 200, type: "text/html", text: "someone's", cut: false } : { status: 404, type: "text/plain", text: "DEPLOYMENT_NOT_FOUND", cut: false };
  if (u.hostname !== "api.vercel.com") return json({ message: "not here" }, 404);
  if (method === "GET" && u.pathname === "/v9/projects/rose-shop") return world.project ? json(world.project) : json({ error: { code: "not_found", message: "Project not found" } }, 404);
  if (method === "POST" && u.pathname === "/v11/projects") {
    world.project = { id: "prj_1", name: parsed.name, createdAt: Date.now() };
    return json(world.project);
  }
  if (method === "GET" && u.pathname === "/v9/projects/prj_1/domains") return json({ domains: [{ name: "rose-shop.vercel.app" }] });
  if (method === "POST" && u.pathname === "/v10/projects/prj_1/env") {
    world.env = parsed;
    return json({ created: [] }, 201);
  }
  if (method === "POST" && u.pathname === "/v13/deployments") {
    if (world.failDeploy) {
      const message = world.failDeploy;
      world.failDeploy = null;
      return json({ error: { code: "forbidden", message } }, 403);
    }
    world.deployments.push(parsed);
    return json({ id: "dpl_1" });
  }
  return json({ error: { message: "not here" } }, 404);
};

const make = (body: Record<string, unknown> = {}, status = 201, origin: string | null = ADMIN) => {
  const r = request(app).post(`${at}/make`);
  if (origin) r.set("Origin", origin);
  return r.send({ token: TOKEN, team: "acme", site: "Rose Shop", ...body }).expect(status);
};

async function clean() {
  const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
  if (row) {
    const data = { ...(row.data as Record<string, unknown>) };
    delete data.shop;
    await prisma.performanceSettings.update({ where: { id: "default" }, data: { data: data as object } });
  }
  forgetShopLinkForTests();
  sent = [];
  world = fresh();
}
beforeAll(() => setTransportForTests(network));
beforeEach(async () => {
  await clean();
  process.env.RAILWAY_GIT_REPO_OWNER = "acme";
  process.env.RAILWAY_GIT_REPO_NAME = "store";
  process.env.RAILWAY_PUBLIC_DOMAIN = "rose-api.up.railway.app";
});
afterEach(() => {
  delete process.env.RAILWAY_GIT_REPO_OWNER;
  delete process.env.RAILWAY_GIT_REPO_NAME;
  delete process.env.RAILWAY_PUBLIC_DOMAIN;
});
afterAll(async () => {
  await clean();
  setTransportForTests(null);
});

describe("The store's own shop, made from its setup", () => {
  test("none yet: said so, with what a shop would be built from", async () => {
    expect((await request(app).get(at).expect(200)).body).toEqual({ url: env.STOREFRONT_URL ?? null, source: env.STOREFRONT_URL ? "server" : "none", making: null, repo: "acme/store", branch: "main" });
  });

  test("made with the owner's token, told this server's and this admin's addresses, and taken as the store's shop at once; the token kept nowhere", async () => {
    const out = (await make()).body;
    expect(out).toMatchObject({ url: "https://rose-shop.vercel.app", source: "made", making: null, project: "prj_1" });
    // Each call to Vercel alone, with the owner's token, in the team asked for.
    expect(sent.filter((s) => s.host === "api.vercel.com").every((s) => s.auth === `Bearer ${TOKEN}`)).toBe(true);
    expect(sent.filter((s) => s.method !== "GET").map((s) => `${s.host} ${s.path}`)).toEqual(["api.vercel.com /v11/projects?slug=acme", "api.vercel.com /v10/projects/prj_1/env?slug=acme&upsert=true", "api.vercel.com /v13/deployments?slug=acme"]);
    expect(sent.find((s) => s.path.startsWith("/v11/projects"))!.body).toEqual({ name: "rose-shop", framework: "nextjs", rootDirectory: "estabrek-storefront", gitRepository: { type: "github", repo: "acme/store" } });
    const vars = Object.fromEntries(world.env.map((e: { key: string; value: string; type: string }) => [e.key, e]));
    expect(vars.API_BASE_URL.value).toBe("https://rose-api.up.railway.app/v1");
    expect(vars.NEXT_PUBLIC_API_BASE_URL.value).toBe("https://rose-api.up.railway.app/v1");
    expect(vars.NEXT_PUBLIC_SITE_URL.value).toBe("https://rose-shop.vercel.app");
    expect(vars.ADMIN_ORIGIN.value).toBe(ADMIN);
    expect(vars.REVALIDATE_SECRET).toMatchObject({ type: "sensitive" });
    expect(world.deployments).toEqual([{ name: "rose-shop", project: "prj_1", target: "production", gitSource: { type: "github", org: "acme", repo: "store", ref: "main" } }]);

    // The server's links and page refreshes go to it, with the secret the shop was given.
    expect(env.STOREFRONT_URL).toBe("https://rose-shop.vercel.app");
    expect(env.STOREFRONT_REVALIDATE_URL).toBe("https://rose-shop.vercel.app/api/revalidate");
    expect(env.STOREFRONT_REVALIDATE_SECRET).toBe(vars.REVALIDATE_SECRET.value);
    expect((await request(app).get(at).expect(200)).body).toMatchObject({ url: "https://rose-shop.vercel.app", source: "made" });

    // Kept for the next start (the secret sealed), and the token nowhere.
    const row = await prisma.performanceSettings.findUniqueOrThrow({ where: { id: "default" } });
    const kept = JSON.stringify((row.data as Record<string, unknown>).shop);
    expect(kept).toContain("rose-shop.vercel.app");
    expect(kept).not.toContain(TOKEN);
    expect(kept).not.toContain(vars.REVALIDATE_SECRET.value);
    expect(await prisma.fnConnection.count()).toBe(0);
    forgetShopLinkForTests();
    expect(env.STOREFRONT_URL).not.toBe("https://rose-shop.vercel.app");
    await loadShopLink();
    expect(env.STOREFRONT_URL).toBe("https://rose-shop.vercel.app");
  });

  test("Vercel saying no stops it in its words; tried again, it goes on with what was made", async () => {
    world.failDeploy = "You don't have permission to create a deployment";
    expect((await make({}, 409)).body).toMatchObject({ error: "VERCEL_REFUSED", message: "You don't have permission to create a deployment" });
    expect((await request(app).get(at).expect(200)).body).toMatchObject({ making: "rose-shop" });
    expect(env.STOREFRONT_URL).not.toBe("https://rose-shop.vercel.app");
    const secret = world.env.find((e: { key: string }) => e.key === "REVALIDATE_SECRET").value;
    sent = [];
    expect((await make()).body).toMatchObject({ url: "https://rose-shop.vercel.app", source: "made", making: null });
    // The project made by the first try, found and kept; its secret the same.
    expect(sent.some((s) => s.path.startsWith("/v11/projects"))).toBe(false);
    expect(world.env.find((e: { key: string }) => e.key === "REVALIDATE_SECRET").value).toBe(secret);
    expect(env.STOREFRONT_REVALIDATE_SECRET).toBe(secret);
  });

  test("refused before anything is made: an address that's someone else's, no admin address, a name that can't be one", async () => {
    world.addressTaken = true;
    expect((await make({}, 409)).body).toMatchObject({ error: "NAME_TAKEN", message: "rose-shop.vercel.app is someone else's" });
    world.addressTaken = false;
    expect((await make({}, 400, null)).body.error).toBe("NO_ADMIN_ADDRESS");
    expect((await make({ site: "9x" }, 400)).body.error).toBe("NAME_INVALID");
    expect((await make({ token: "short" }, 400)).body.error).toBeDefined();
    expect(sent.filter((s) => s.host === "api.vercel.com")).toEqual([]);
  });

  test("is the owner's to make", async () => {
    const role = await prisma.staffRole.create({ data: { name: "shop-link-spec", permissions: ["settings:read", "settings:write"] } });
    const member = await prisma.adminUser.create({ data: { email: "member@shop-link-spec.test", name: "member", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    try {
      const token = `Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`;
      await request(app).get(at).set("Authorization", token).expect(200);
      expect((await request(app).post(`${at}/make`).set("Authorization", token).set("Origin", ADMIN).send({ token: TOKEN, site: "rose-shop" }).expect(403)).body.error).toBe("OWNER_ONLY");
    } finally {
      await prisma.adminUser.delete({ where: { id: member.id } });
      await prisma.staffRole.delete({ where: { id: role.id } });
    }
  });
});
