import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { forgetHits } from "../lib/hitLimit.js";
import { withCollections } from "../lib/collections.js";
import type { PageTree } from "../lib/pageTree.js";

// Whole sites (stage 4, item 3), with the database: each site the admin builds from the section
// library (estabrek-admin src/studio/templates/sites) installs as a draft beside the others, its
// tables holding their ready rows and its pages' lists filled from them (the featured dishes, a
// menu's starters only); nothing of it is on the shop until the feature is on; then its pages and
// its rows' own pages show, and a visitor's message lands in its messages table. Each leaves again
// with everything it made. Requests without a token run as the test owner.

const at = "/v1/admin/my-features";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
type Sites = { SITES: Array<{ key: string }>; siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj; siteByKey: (key: string) => Obj; buildChosen: (bp: Obj, c: Obj, lang: "ar" | "en" | "he") => Obj };
let sites: Sites;
const made: string[] = [];

async function clean() {
  for (const id of made) await request(app).post(`${at}/${id}/remove`).send({ rows: "delete" });
  made.length = 0;
  forgetFeatureGate();
  forgetTriggers();
  forgetHits();
}
beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as Sites;
  await clean();
});
afterAll(clean);

const install = async (key: string, lang: "ar" | "en" | "he" = "ar") => {
  const res = await request(app).post(`${at}/templates/install`).send({ template: sites.siteFile(key, { lang }), lang });
  if (res.status !== 201) throw new Error(`${key}: ${res.status} ${JSON.stringify(res.body).slice(0, 400)}`);
  made.push(res.body.id);
  return res.body as Obj;
};
/** The lists of a stored tree (with their filters), by id. */
function listsOf(tree: PageTree): Obj[] {
  const out: Obj[] = [];
  const walk = (n: Obj) => {
    if (n.type === "collectionList") out.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(tree.root as Obj);
  return out;
}
function nodeById(tree: Obj, id: string): Obj | null {
  if (tree.id === id) return tree;
  for (const c of tree.children ?? []) {
    const hit = nodeById(c, id);
    if (hit) return hit;
  }
  return null;
}
const shop = (slug: string) => request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}`);

describe("Whole sites", () => {
  test("every site installs as a draft beside the others, with its ready rows and its lists filled from them, and leaves with what it made", async () => {
    const before = { tables: await prisma.collection.count(), fns: await prisma.fn.count(), pages: await prisma.page.count(), rows: await prisma.collectionItem.count() };
    for (const s of sites.SITES) {
      const file = sites.siteFile(s.key, { lang: "ar" });
      const feature = await install(s.key);
      expect(feature.enabled, s.key).toBe(false);
      expect(feature.pages, s.key).toHaveLength(file.pages.length);
      expect(feature.tables, s.key).toHaveLength(file.tables.length);
      const ids: Obj = (await prisma.feature.findUnique({ where: { id: feature.id }, select: { template: true } }))!.template!;
      // Each table holds the file's ready rows, published, in its order.
      for (const t of file.tables) {
        const rows = await prisma.collectionItem.findMany({ where: { collectionId: ids.ids.table[t.key] }, orderBy: { sort: "asc" }, select: { slug: true, status: true } });
        expect(rows.length, `${s.key} ${t.key}`).toBe(t.rows?.length ?? 0);
        if (t.rows?.length) expect(rows.every((r) => r.status === "PUBLISHED")).toBe(true);
        if (t.key === "offers") expect(rows.map((r) => r.slug)).toEqual(t.rows.map((r: Obj) => r.slug));
      }
      const pages = await prisma.page.findMany({ where: { id: { in: Object.values(ids.ids.page) as string[] } }, select: { id: true, status: true, tree: true } });
      expect(pages.every((p) => p.status === "DRAFT"), s.key).toBe(true);
      // The home's chosen ones and the main page's sections, filled from the rows (as the editor sees them).
      const offers = file.tables.find((t: Obj) => t.key === "offers");
      // (A site with no main list, a game server's, has none.)
      for (const key of offers ? ["home", "offers"] : []) {
        const tree = pages.find((p) => p.id === ids.ids.page[key])!.tree as PageTree;
        const lists = listsOf(tree).filter((l) => l.props.collectionId === ids.ids.table.offers);
        expect(lists.length, `${s.key} ${key}`).toBeGreaterThan(0);
        const shown = (await withCollections(tree, { preview: true })) as Obj;
        for (const l of lists) {
          const want = offers.rows.filter((r: Obj) => (l.props.where ?? []).every((w: Obj) => (w.op === "isTrue" ? r.data[w.field] === true : r.data[w.field] === w.value))).length;
          const grid = nodeById(shown.root, l.id)!;
          expect(grid.type).toBe("grid");
          expect(grid.children.length, `${s.key} ${key} ${JSON.stringify(l.props.where)}`).toBe(Math.min(want, l.props.limit));
        }
      }
    }
    await clean();
    expect({ tables: await prisma.collection.count(), fns: await prisma.fn.count(), pages: await prisma.page.count(), rows: await prisma.collectionItem.count() }).toEqual(before);
  }, 60_000);

  test("nothing of a site is on the shop while it is off; switched on, its pages and its rows' pages show, and a visitor's message lands in its table", async () => {
    const feature = await install("site-restaurant", "en");
    const ids: Obj = (await prisma.feature.findUnique({ where: { id: feature.id }, select: { template: true } }))!.template!.ids;
    const dishes = await prisma.collection.findUnique({ where: { id: ids.table.offers }, select: { slug: true } });
    const messages = await prisma.collection.findUnique({ where: { id: ids.table.messages }, select: { slug: true } });
    await prisma.page.update({ where: { id: ids.page.home }, data: { status: "PUBLISHED" } });
    forgetFeatureGate();
    // Off: its page, a dish's own page and its messages table aren't there.
    await shop("/restaurant").expect(404);
    await shop(`/${dishes!.slug}/hummus`).expect(404);
    await request(app).post(`/v1/data/${messages!.slug}`).send({ values: { name: "Rana", phone: "050-123-4567", message: "Hello" }, lang: "en" }).expect(404);

    await request(app).put(`${at}/${feature.id}`).send({ enabled: true }).expect(200);
    forgetFeatureGate();
    const home = (await shop("/restaurant").expect(200)).body;
    const featured = listsOf((await prisma.page.findUnique({ where: { id: ids.page.home }, select: { tree: true } }))!.tree as PageTree)[0];
    const grid = nodeById(home.tree.root, featured.id)!;
    expect(grid.children).toHaveLength(4);
    expect(JSON.stringify(grid)).toContain("Hummus with pine nuts");
    // Asked again it comes from the cache; the owner changes a dish in the table and the next answer has it.
    expect((await shop("/restaurant").expect(200)).headers["x-cache"]).toBe("HIT");
    const hummus = await prisma.collectionItem.findFirst({ where: { collectionId: ids.table.offers, slug: "hummus" }, select: { id: true, data: true } });
    const data = hummus!.data as Obj;
    await request(app).put(`/v1/admin/collections/${ids.table.offers}/items/${hummus!.id}`).send({ data: { ...data, title: { ...data.title, en: "Hummus with lamb" } } }).expect(200);
    const after = JSON.stringify(nodeById((await shop("/restaurant").expect(200)).body.tree.root, featured.id));
    expect(after).toContain("Hummus with lamb");
    expect(after).not.toContain("Hummus with pine nuts");
    // A dish's own page: its template filled with the row.
    const dish = (await shop(`/${dishes!.slug}/hummus`).expect(200)).body;
    expect(dish.collectionItem).toEqual({ collection: dishes!.slug, item: "hummus" });
    expect(JSON.stringify(dish.tree)).toContain("Hummus with lamb");
    // The contact form's message, written into the site's own table (as a draft: only the store reads it).
    const sent = (await request(app).post(`/v1/data/${messages!.slug}`).send({ values: { name: "Rana", phone: "050-123-4567", message: "A table for six on Friday?" }, lang: "en" }).expect(201)).body;
    expect(sent).toMatchObject({ status: "DRAFT", values: { name: { en: "Rana" }, message: { en: "A table for six on Friday?" } } });
    const row = await prisma.collectionItem.findFirst({ where: { collectionId: ids.table.messages }, select: { data: true } });
    expect(row?.data).toMatchObject({ status: "fresh", phone: "050-123-4567" });
    await clean();
  });

  test("a second site beside the first: the addresses they share move, and its forms and links follow them", async () => {
    await install("site-dental-clinic");
    const second = await install("site-beauty-salon");
    const ids: Obj = (await prisma.feature.findUnique({ where: { id: second.id }, select: { template: true } }))!.template!.ids;
    const slugs = await prisma.collection.findMany({ where: { id: { in: [ids.table.messages, ids.table.team, ids.table.posts] } }, select: { slug: true } });
    expect(slugs.map((x) => x.slug).sort()).toEqual(["messages-2", "news-2", "team-2"]);
    const pages = await prisma.page.findMany({ where: { id: { in: Object.values(ids.page) as string[] } }, select: { slug: true, tree: true } });
    expect(pages.map((p) => p.slug).sort()).toEqual(["/book-2", "/news-2", "/our-story-2", "/questions-2", "/reach-us-2", "/salon", "/services"]);
    const contact = JSON.stringify(pages.find((p) => p.slug === "/reach-us-2")!.tree);
    expect(contact).toContain('"to":"table","table":"messages-2"');
    const home = JSON.stringify(pages.find((p) => p.slug === "/salon")!.tree);
    expect(home).toContain('"href":"/our-story-2"');
    expect(home).not.toContain('"href":"/our-story"');
    await clean();
  });
});

describe("A site as its install wizard chose it", () => {
  test("installs with only the modules kept and the owner's details, and the feature keeps the choices for its upgrades", async () => {
    const choices = { biz: { name: { ar: "أبو سمير", en: "Abu Samir", he: "אבו סמיר" }, phone: "050-123-4567" }, modules: ["story", "reviews", "contact", "notify"], look: 2 };
    const file = sites.buildChosen(sites.siteByKey("site-restaurant"), choices, "ar");
    const res = await request(app).post(`${at}/templates/install`).send({ template: file, lang: "ar" });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    made.push(res.body.id);
    expect(res.body.template.site).toEqual(choices);
    expect(res.body.name).toBe("مطعم: أبو سمير");
    expect(res.body.pages.map((p: Obj) => p.key)).toEqual(["home", "story", "contact"]);
    expect(res.body.tables.map((t: Obj) => t.slug).sort()).toEqual(file.tables.map((t: Obj) => t.slug).sort());
    const contact = await prisma.page.findUnique({ where: { id: res.body.pages.find((p: Obj) => p.key === "contact").id }, select: { tree: true } });
    // Its business line says the owner's number (no branches kept: no branch card calling it).
    expect(JSON.stringify(contact!.tree)).toContain("050-123-4567");
    expect(JSON.stringify(contact!.tree)).not.toContain("04-600-1234");
  });
});
