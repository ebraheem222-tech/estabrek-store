import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTebex } from "../lib/tebex.js";

// A game server's packages from its owner's Tebex webstore (wave G4 of docs/sites-300-plan.ar.md), with the database:
// the FiveM site installed from the admin's own files, its «الباقات» page served with the webstore's packages read by
// its public token (Tebex's Headless API, played here: nothing reaches Tebex), and its panel saying whether the
// webstore answers. A token changed in the settings is read again at once. Requests without a token run as the owner.

const at = "/v1/admin";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
let featureId = "";
const TOKEN = "spec-7cd928b1e9399ce6";
const asked: string[] = [];

const all = (n: Obj): Obj[] => [n, ...(n.children ?? []).flatMap(all)];
const served = async () => all((await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent("/packages")}&locale=ar`).expect(200)).body.tree.root).find((n) => n.type === "tebexPackages")!;
const panel = async () => (await request(app).get(`${at}/site-panels/${featureId}/today?lang=en`).expect(200)).body.parts.find((p: Obj) => p.kind === "tebex");
const settings = (values: Obj) => request(app).put(`${at}/my-features/${featureId}/settings`).send({ values }).expect(200);

beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (!u.startsWith("https://headless.tebex.io/")) return real(url, init);
    asked.push(u);
    if (!u.includes(`/accounts/${TOKEN}`)) return new Response(JSON.stringify({ error_code: 404 }), { status: 404 });
    if (u.endsWith("/categories?includePackages=1")) return Response.json({ data: [{ id: 1, name: "VIP", order: 1, packages: [{ id: 42, name: "VIP Gold", order: 1, total_price: 15, base_price: 20, currency: "EUR", image: null, description: "<p>A gold tag.</p>" }] }] });
    return Response.json({ data: { id: 9, name: "Dew City", currency: "EUR", webstore_url: "https://dewcity.tebex.io" } });
  });
  forgetTebex();
  const res = await request(app).post(`${at}/my-features/templates/install`).send({ template: sites.siteFile("site-fivem-rp", { lang: "ar" }), lang: "ar" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  featureId = res.body.id;
  const ids: Obj = (await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } }))!.template!.ids;
  await prisma.page.updateMany({ where: { id: { in: Object.values(ids.page) as string[] } }, data: { status: "PUBLISHED" } });
  await request(app).put(`${at}/my-features/${featureId}`).send({ enabled: true }).expect(200);
});
afterAll(async () => {
  vi.unstubAllGlobals();
  if (featureId) await request(app).post(`${at}/my-features/${featureId}/remove`).send({ rows: "delete" });
  forgetFeatureGate();
  forgetTebex();
});

describe("A game server's Tebex packages", () => {
  test("no token: the page says the store is coming and the panel asks for it; Tebex isn't asked", async () => {
    expect((await served()).props.store).toBeNull();
    expect(await panel()).toMatchObject({ token: false, store: null });
    expect(asked).toEqual([]);
  });

  test("its token set: the page served with the webstore's packages, the panel connected; asked again only after 5 minutes", async () => {
    await settings({ tebexToken: TOKEN });
    const el = await served();
    expect(el.props.store).toEqual({ name: "Dew City", currency: "EUR", url: "https://dewcity.tebex.io", categories: [{ id: 1, name: "VIP", packages: [{ id: 42, name: "VIP Gold", price: 15, base: 20, currency: "EUR", image: null, text: "A gold tag.", href: "https://dewcity.tebex.io/package/42" }] }] });
    // The shop gets the packages, never the token.
    expect(JSON.stringify(el)).not.toContain(TOKEN);
    expect(await panel()).toMatchObject({ token: true, store: { name: "Dew City", currency: "EUR", categories: [{ name: "VIP", packages: 1 }] } });
    const n = asked.length;
    await served();
    expect(asked.length).toBe(n);
  });

  test("a token Tebex doesn't know: the page shows the owner's words, the panel says it didn't answer", async () => {
    await settings({ tebexToken: "spec-unknown-token" });
    expect((await served()).props.store).toBeNull();
    expect(await panel()).toMatchObject({ token: true, store: null });
  });
});
