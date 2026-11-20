import { afterEach, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { getOrCreateSiteRow, SITE_ROW_ORDER } from "../lib/siteRow.js";
import { cacheDel } from "../lib/cache.js";

// A client's new store had two settings rows (its first requests came in together). Reads took
// whichever row Postgres met first, and that changes after an update: the setup saved the name,
// logo, theme and assistant into one row, and the shop and the admin then read the other, empty
// one ("My Store", no logo, no assistant, the default theme). lib/siteRow.ts.
let first: string;
const SHOP_NAME = "متجر الصف الواحد";
const LOGO = "https://res.cloudinary.com/demo/image/upload/one-row-logo.png";

const setupBody = () => ({
  industry: "general",
  audience: "everyone",
  name: { ar: SHOP_NAME, en: "One Row Shop" },
  logoUrl: LOGO,
  theme: { id: "mega-market", mode: "light" },
  categories: [],
  types: [],
  pages: [{ slug: "/", name: { ar: "الرئيسية", en: "Home" }, seoTitle: { ar: SHOP_NAME }, sections: [{ type: "HERO", data: { ar: { title: SHOP_NAME, subtitle: "", primaryButton: { label: "تسوّق", href: "/shop" } } } }] }],
  menu: [],
  assistant: { enabled: true, persona: "layla" },
});

const shop = async () => {
  const r = await request(app).get("/v1/settings").expect(200);
  return r.body.site ?? r.body;
};
const admin = async () => (await request(app).get("/v1/admin/settings").expect(200)).body;

beforeEach(async () => {
  await resetDb();
  await prisma.page.deleteMany({ where: { slug: "/" } });
  const s = await getOrCreateSiteRow();
  first = s.id;
  await prisma.siteSettings.update({ where: { id: s.id }, data: { header: { storeDesign: { version: 1, mode: "cms" } }, siteName: "My Store", logoUrl: null, primaryNavId: null } });
});

/**
 * The empty row put first on disk, as an update can leave it (a row's new version is written after
 * the others): a read with no order then meets the empty row first, as the client's shop did.
 */
async function emptyRowFirstOnDisk() {
  await prisma.$executeRaw`DROP TABLE IF EXISTS "zz_site_order"`;
  await prisma.$executeRaw`CREATE TABLE "zz_site_order" AS SELECT * FROM "SiteSettings"`;
  await prisma.$executeRaw`TRUNCATE "SiteSettings"`;
  await prisma.$executeRaw`INSERT INTO "SiteSettings" SELECT * FROM "zz_site_order" ORDER BY COALESCE("siteName" = ${SHOP_NAME}, false) ASC`;
  await prisma.$executeRaw`DROP TABLE "zz_site_order"`;
  await cacheDel("settings:public");
}

afterEach(async () => {
  await prisma.siteSettings.deleteMany({ where: { id: { not: first } } });
});

describe("the store's settings are one row", () => {
  test("a second row: what the setup saved is what the shop and the admin read, and stays so after more saves", async () => {
    // The second row of a new store: made at the same moment, never written.
    await prisma.siteSettings.create({ data: { header: { storeDesign: { version: 1, mode: "cms" } } } });
    expect(await prisma.siteSettings.count()).toBe(2);

    await request(app).post("/v1/admin/setup/apply").send(setupBody()).expect(200);
    for (const round of [1, 2, 3]) {
      await emptyRowFirstOnDisk();
      const site = await shop();
      expect(site.siteName, `round ${round}`).toBe(SHOP_NAME);
      expect(site.logoUrl, `round ${round}`).toBe(LOGO);
      expect(site.header?.storefront, `round ${round}`).toMatchObject({ chatbotEnabled: true, assistantPersona: "layla" });
      expect(site.header?.setup?.done, `round ${round}`).toBe(true);
      expect((await admin()).siteName, `round ${round}`).toBe(SHOP_NAME);
      // Another save (the owner changing a word in Settings) lands in the same row and keeps the rest.
      await request(app).patch("/v1/admin/settings").send({ contactEmail: `round${round}@one-row.test` }).expect(200);
      await emptyRowFirstOnDisk();
      expect((await shop()).contactEmail).toBe(`round${round}@one-row.test`);
    }
    // Every write went to one row; the other is still the empty one it was.
    const rows = await prisma.siteSettings.findMany({ orderBy: SITE_ROW_ORDER, select: { siteName: true, contactEmail: true } });
    expect(rows[0]).toEqual({ siteName: SHOP_NAME, contactEmail: "round3@one-row.test" });
    expect(rows[1].siteName).not.toBe(SHOP_NAME);
  });

  test("a store with no settings yet, asked six times at once, makes one row", async () => {
    // The rows set aside (the other specs' store) and put back after.
    await prisma.$executeRaw`DROP TABLE IF EXISTS "zz_site_rows"`;
    await prisma.$executeRaw`CREATE TABLE "zz_site_rows" AS SELECT * FROM "SiteSettings"`;
    try {
      await prisma.siteSettings.deleteMany();
      await cacheDel("settings:public");
      const made = await Promise.all([
        ...Array.from({ length: 4 }, () => getOrCreateSiteRow()),
        request(app).get("/v1/settings").then((r) => ({ id: (r.body.site ?? r.body).id as string })),
        request(app).get("/v1/admin/settings").then(() => ({ id: "" })),
      ]);
      expect(await prisma.siteSettings.count()).toBe(1);
      const only = await prisma.siteSettings.findFirstOrThrow();
      for (const m of made.slice(0, 5)) expect(m.id).toBe(only.id);
      expect(only.header).toEqual({ storeDesign: { version: 1, mode: "cms" } });
    } finally {
      await prisma.siteSettings.deleteMany();
      await prisma.$executeRaw`INSERT INTO "SiteSettings" SELECT * FROM "zz_site_rows"`;
      await prisma.$executeRaw`DROP TABLE "zz_site_rows"`;
      await cacheDel("settings:public");
    }
  });
});
