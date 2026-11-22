import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { getOrCreateSiteRow } from "../lib/siteRow.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { cacheDel } from "../lib/cache.js";
import { env } from "../config/env.js";

// The store setup's «شو نوع موقعك؟» → a whole site (sites wave 0.4), with the database: the admin's own calls
// in the wizard's order (estabrek-admin features/setup/siteSetupRun.ts), built by the admin's own code: the
// store's part with nothing to sell, the site installed with the owner's choices, switched on, its pages
// published, then made the store's home. Requests without a token run as the test owner.

const ADMIN = path.resolve(__dirname, "../../../estabrek-admin/src");
type Obj = Record<string, any>;
type Sites = {
  siteByKey: (key: string) => Obj;
  buildChosen: (bp: Obj, c: Obj | null, lang: "ar" | "en" | "he") => Obj;
  withChoices: (bp: Obj, c: Obj | null) => Obj;
  shellOf: (bp: Obj) => { header: Obj[]; footer: Obj[] };
  pagesOf: (bp: Obj) => Array<{ key: string }>;
  choosable: (bp: Obj) => Array<{ key: string }>;
};
type Setup = { siteSetupRequest: (c: { bp: Obj; name: Obj; logoUrl?: string; assistant: { enabled: boolean; persona: string | null } }) => Obj };
let sites: Sites;
let setup: Setup;
let featureId: string | null = null;
let before: { header: unknown; siteName: string | null; logoUrl: string | null; primaryNavId: string | null; footerNavId: string | null };

const at = "/v1/admin/my-features";
const shop = (slug: string) => request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}`);

async function clean() {
  await request(app).delete(`${at}/site-home`);
  if (featureId) await request(app).post(`${at}/${featureId}/remove`).send({ rows: "delete" });
  featureId = null;
  forgetFeatureGate();
  forgetTriggers();
}
beforeAll(async () => {
  sites = (await import(pathToFileURL(path.join(ADMIN, "studio/templates/sites/index.ts")).href)) as Sites;
  setup = (await import(pathToFileURL(path.join(ADMIN, "features/setup/siteSetup.ts")).href)) as Setup;
  await clean();
  const s = await getOrCreateSiteRow();
  before = { header: s.header, siteName: s.siteName, logoUrl: s.logoUrl, primaryNavId: s.primaryNavId, footerNavId: s.footerNavId };
});
afterAll(async () => {
  env.SETUP_SITE = undefined;
  await clean();
  const s = await getOrCreateSiteRow();
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: before.header as never, siteName: before.siteName ?? undefined, logoUrl: before.logoUrl, primaryNavId: before.primaryNavId, footerNavId: before.footerNavId } });
  await cacheDel("settings:public");
});

describe("A new store set up as a whole site", () => {
  test("the store's part, then the site with the owner's choices: on, published and at the store's own address", async () => {
    const bp = sites.siteByKey("site-restaurant");
    const name = { ar: "أبو سمير", en: "Abu Samir's", he: "Abu Samir's" };
    const choices = { biz: { name, phone: "050-123-4567" }, modules: sites.choosable(bp).map((m) => m.key).filter((k) => k !== "reviews"), look: 2, motion: "rich" };

    // A client's copy made with the restaurant picked for it (lib/press.ts): its setup says so until it is done.
    const row = await getOrCreateSiteRow();
    const { setup: _done, ...unset } = (row.header ?? {}) as Obj;
    await prisma.siteSettings.update({ where: { id: row.id }, data: { header: unset as never } });
    env.SETUP_SITE = "site-restaurant";
    expect((await request(app).get("/v1/admin/setup/status")).body.startSite).toBe("site-restaurant");
    env.SETUP_SITE = "not a site";
    expect((await request(app).get("/v1/admin/setup/status")).body.startSite).toBeNull();
    env.SETUP_SITE = "site-restaurant";

    // The store's part: its name and a theme that fits, nothing to sell.
    const res = await request(app).post("/v1/admin/setup/apply").send(setup.siteSetupRequest({ bp, name, assistant: { enabled: true, persona: null } }));
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
    expect(res.body.made).toEqual({ categories: 0, types: 0, pages: 0, menuItems: 0 });
    const status = (await request(app).get("/v1/admin/setup/status")).body;
    expect(status.setup).toMatchObject({ done: true, industry: "food" });
    expect(status.startSite).toBeNull();
    const s = await getOrCreateSiteRow();
    expect((s.header as Obj).storeTheme).toMatchObject({ id: "coffee-roast" });
    expect((s.header as Obj).identity.name).toMatchObject({ ar: "أبو سمير", en: "Abu Samir's" });

    // The site, built with the choices: without the module left out, carrying the choices for its upgrades.
    const installed = await request(app).post(`${at}/templates/install`).send({ template: sites.buildChosen(bp, choices, "ar"), lang: "ar" });
    expect(installed.status, JSON.stringify(installed.body).slice(0, 300)).toBe(201);
    featureId = installed.body.id;
    const feature: Obj = installed.body;
    const chosen = sites.withChoices(bp, choices);
    expect(feature.pages.map((p: Obj) => p.key).sort()).toEqual(sites.pagesOf(chosen).map((p) => p.key).sort());
    expect(feature.template.site).toEqual(choices);

    // Switched on, its pages published one by one (as the owner would), then the home.
    expect((await request(app).put(`${at}/${featureId}`).send({ enabled: true })).body.enabled).toBe(true);
    for (const p of feature.pages) if (p.key) expect((await request(app).patch(`/v1/admin/pages/${p.id}`).send({ status: "PUBLISHED" })).status).toBe(200);
    const home = await request(app).post(`${at}/${featureId}/site-home`).send(sites.shellOf(chosen));
    expect(home.status, JSON.stringify(home.body).slice(0, 300)).toBe(200);
    expect(home.body.left).toEqual([]);
    expect(home.body.menus.header).toBe(sites.shellOf(chosen).header.length);

    // The shop: the site's first page at "/", in the owner's name and number.
    const first = feature.pages.find((p: Obj) => p.id === feature.siteHome.homeId);
    const page = await shop("/");
    expect(page.body.id).toBe(first.id);
    const contact = feature.pages.find((p: Obj) => p.key === "contact");
    const words = JSON.stringify((await shop(contact.slug)).body);
    expect(words).toContain("050-123-4567");
    expect(words).not.toContain(bp.biz.phone);
  });
});
