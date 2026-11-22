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

// «خلّيه الرئيسية» (sites wave 0.2, modules/admin/siteHome.ts), with the database: an installed site's first
// page shown at the store's own address and the store's menus made of its published pages; the store's own
// page at "/" waits behind it, and comes back with the menus that were in place when the site is undone,
// switched off or removed. One site at a time: making another one the home puts the first one's back.
// Requests without a token run as the test owner.

const at = "/v1/admin/my-features";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
type Link = { page: string; label: Record<"ar" | "en" | "he", string> };
type Sites = { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj; siteByKey: (key: string) => Obj; shellOf: (bp: Obj) => { header: Link[]; footer: Link[] } };
let sites: Sites;
const made: string[] = [];
let before: { header: unknown; primaryNavId: string | null; footerNavId: string | null };
let ownHome: { id: string; made: boolean } | null = null;

const settings = () => getOrCreateSiteRow();
const shop = (slug: string) => request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}`);
const install = async (key: string) => {
  const res = await request(app).post(`${at}/templates/install`).send({ template: sites.siteFile(key, { lang: "ar" }), lang: "ar" });
  if (res.status !== 201) throw new Error(`${key}: ${res.status} ${JSON.stringify(res.body).slice(0, 400)}`);
  made.push(res.body.id);
  return res.body as Obj;
};
const menusOf = (key: string) => sites.shellOf(sites.siteByKey(key));
/** The site's pages by their keys in its file. */
const pagesOf = async (featureId: string): Promise<Record<string, { id: string; slug: string; name: string }>> => {
  const f: Obj = (await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } }))!.template!;
  const rows = await prisma.page.findMany({ where: { id: { in: Object.values(f.ids.page) as string[] } }, select: { id: true, slug: true, name: true } });
  return Object.fromEntries(Object.entries(f.ids.page as Record<string, string>).map(([key, id]) => [key, rows.find((r) => r.id === id)!]));
};
const publish = (ids: string[]) => prisma.page.updateMany({ where: { id: { in: ids } }, data: { status: "PUBLISHED" } });
const items = async (menuId: string | null) => (menuId ? (await prisma.navigationItem.findMany({ where: { menuId }, orderBy: { order: "asc" }, select: { label: true, href: true } })) : []);

async function clean() {
  await request(app).delete(`${at}/site-home`);
  for (const id of made) await request(app).post(`${at}/${id}/remove`).send({ rows: "delete" });
  made.length = 0;
  forgetFeatureGate();
  forgetTriggers();
}
beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as Sites;
  await clean();
  const s = await settings();
  before = { header: s.header, primaryNavId: s.primaryNavId, footerNavId: s.footerNavId };
  // A CMS menu that is on, to see it switched off while a site is the home and on again after.
  const header = { ...((s.header as Obj | null) ?? {}), cmsNav: { enabled: true, items: [{ label: "Old", href: "/old" }] } };
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header } });
  // The store's own page at "/" (one of this spec's, when the database has none).
  const home = await prisma.page.findUnique({ where: { slug: "/" }, select: { id: true, status: true } });
  if (home) ownHome = { id: home.id, made: false };
  else ownHome = { id: (await prisma.page.create({ data: { name: "Store home (siteHome spec)", slug: "/", status: "PUBLISHED", kind: "page" }, select: { id: true } })).id, made: true };
  await cacheDel("settings:public");
});
afterAll(async () => {
  await clean();
  const s = await settings();
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: before.header as never, primaryNavId: before.primaryNavId, footerNavId: before.footerNavId } });
  if (ownHome?.made) await prisma.page.delete({ where: { id: ownHome.id } });
  await cacheDel("settings:public");
});

describe("A whole site as the store's home", () => {
  test("waits for the site to be on and its first page published; then shows at \"/\" with menus of its published pages, and goes back", async () => {
    const restaurant = await install("site-restaurant");
    const pages = await pagesOf(restaurant.id);
    expect(restaurant.siteHome).toEqual({ homeId: pages.home.id, on: false, other: null });
    expect(restaurant.pages.find((p: Obj) => p.id === pages.offers.id).key).toBe("offers");

    const menus = menusOf("site-restaurant");
    let res = await request(app).post(`${at}/${restaurant.id}/site-home`).send(menus);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("SITE_OFF");
    await request(app).put(`${at}/${restaurant.id}`).send({ enabled: true });
    res = await request(app).post(`${at}/${restaurant.id}/site-home`).send(menus);
    expect(res.body.error).toBe("SITE_HOME_DRAFT");

    // Its first page and its menu published; the rest stays drafts, out of the menus.
    await publish([pages.home.id, pages.offers.id]);
    res = await request(app).post(`${at}/${restaurant.id}/site-home`).send(menus);
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
    expect(res.body.menus).toEqual({ header: 2, footer: 2 });
    expect(res.body.left).toContain(pages.story.name);
    expect(res.body.feature.siteHome).toEqual({ homeId: pages.home.id, on: true, other: null });

    const s = await settings();
    expect((s.header as Obj).siteHome).toMatchObject({ featureId: restaurant.id, pageId: pages.home.id, before: { primaryNavId: before.primaryNavId, footerNavId: before.footerNavId, cmsNav: true } });
    expect((s.header as Obj).cmsNav.enabled).toBe(false);
    // The menus in the store's main language, the first page at "/", the others at their own addresses.
    expect(await items(s.primaryNavId)).toEqual([{ label: "الرئيسية", href: "/" }, { label: menus.header[1].label.ar, href: pages.offers.slug }]);
    expect(await items(s.footerNavId)).toEqual(await items(s.primaryNavId));
    // The shop: "/" is the site's first page; the site's page keeps its own address too.
    expect((await shop("/")).body.id).toBe(pages.home.id);
    expect((await shop(pages.home.slug)).body.id).toBe(pages.home.id);
    // Asked again: nothing new.
    res = await request(app).post(`${at}/${restaurant.id}/site-home`).send(menus);
    expect(res.body.already).toBe(true);
    expect(await prisma.navigationMenu.count({ where: { name: { startsWith: restaurant.name } } })).toBe(2);

    // Back: the store's own home, its menus and its CMS menu.
    res = await request(app).delete(`${at}/site-home`);
    expect(res.body).toEqual({ ok: true, was: restaurant.id });
    const back = await settings();
    expect((back.header as Obj).siteHome).toBeUndefined();
    expect((back.header as Obj).cmsNav.enabled).toBe(true);
    expect([back.primaryNavId, back.footerNavId]).toEqual([before.primaryNavId, before.footerNavId]);
    expect(await prisma.navigationMenu.count({ where: { name: { startsWith: restaurant.name } } })).toBe(0);
    expect((await shop("/")).body.id).toBe(ownHome!.id);
    expect((await request(app).delete(`${at}/site-home`)).body).toEqual({ ok: true, was: null });
  });

  test("one site at a time; switching it off or removing it puts the store's own home back", async () => {
    const [restaurant, bakery] = [await install("site-restaurant"), await install("site-bakery-cafe")];
    for (const f of [restaurant, bakery]) {
      await request(app).put(`${at}/${f.id}`).send({ enabled: true });
      await publish([(await pagesOf(f.id)).home.id]);
    }
    const r = await pagesOf(restaurant.id);
    const b = await pagesOf(bakery.id);
    expect((await request(app).post(`${at}/${restaurant.id}/site-home`).send(menusOf("site-restaurant"))).status).toBe(200);

    // The bakery takes its place: the restaurant's menus go first.
    const res = await request(app).post(`${at}/${bakery.id}/site-home`).send(menusOf("site-bakery-cafe"));
    expect(res.status).toBe(200);
    expect((await shop("/")).body.id).toBe(b.home.id);
    expect(await prisma.navigationMenu.count({ where: { name: { startsWith: restaurant.name } } })).toBe(0);
    expect((await request(app).get(`${at}/${restaurant.id}`)).body.siteHome).toEqual({ homeId: r.home.id, on: false, other: { id: bakery.id, name: bakery.name } });
    // Its CMS menu stays off, and comes back on once the store's own home does.
    expect(((await settings()).header as Obj).siteHome.before.cmsNav).toBe(true);

    // The bakery switched off: its page would hide, so the store's own home comes back.
    await request(app).put(`${at}/${bakery.id}`).send({ enabled: false });
    let s = await settings();
    expect((s.header as Obj).siteHome).toBeUndefined();
    expect((s.header as Obj).cmsNav.enabled).toBe(true);
    expect([s.primaryNavId, s.footerNavId]).toEqual([before.primaryNavId, before.footerNavId]);
    expect((await shop("/")).body.id).toBe(ownHome!.id);

    // The restaurant made the home, then removed with everything in it: the home is the store's again.
    expect((await request(app).post(`${at}/${restaurant.id}/site-home`).send(menusOf("site-restaurant"))).status).toBe(200);
    await request(app).post(`${at}/${restaurant.id}/remove`).send({ rows: "delete" });
    made.splice(made.indexOf(restaurant.id), 1);
    s = await settings();
    expect((s.header as Obj).siteHome).toBeUndefined();
    expect([s.primaryNavId, s.footerNavId]).toEqual([before.primaryNavId, before.footerNavId]);
    expect((await shop("/")).body.id).toBe(ownHome!.id);
  });

  test("only a whole site has a first page to make the home; the menus are checked", async () => {
    const plain = await request(app).post(at).send({ name: "Not a site (siteHome spec)" });
    made.push(plain.body.id);
    expect(plain.body.siteHome).toEqual({ homeId: null, on: false, other: null });
    const res = await request(app).post(`${at}/${plain.body.id}/site-home`).send({ header: [], footer: [] });
    expect(res.body.error).toBe("NOT_A_SITE");
    const bad = await request(app).post(`${at}/${plain.body.id}/site-home`).send({ header: [{ page: "../x", label: { ar: "x" } }], footer: [] });
    expect(bad.status).toBe(400);
  });
});
