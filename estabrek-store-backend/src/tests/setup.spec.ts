import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";

// Setting up a new store (admin → إعداد المتجر, /v1/admin/setup): the wizard opens for an
// empty store only, and its starter content becomes ordinary rows the owner edits later.
// Requests without a token run as the test owner.
const hero = (title: string) => ({ title, subtitle: "", primaryButton: { label: "Shop", href: "/shop" } });
const body = (patch: Record<string, unknown> = {}) => ({
  industry: "phones",
  audience: "everyone",
  name: { ar: "متجر الموبايل", en: "Mobile Shop" },
  theme: { id: "phone-hub", mode: "dark" },
  categories: [{ slug: "setup-phones", name: { ar: "موبايلات", en: "Phones", he: "טלפונים" }, children: [{ slug: "setup-chargers", name: { ar: "شواحن", en: "Chargers" } }] }],
  types: [{ slug: "setup-phone", name: "موبايل", names: { ar: "موبايل", en: "Phone" }, fields: [], showSize: false }],
  pages: [
    { slug: "/", name: { ar: "الرئيسية", en: "Home" }, sections: [{ type: "HERO", data: { ar: hero("أحدث الموبايلات"), en: hero("The latest phones") } }] },
    { slug: "/setup-about", name: { ar: "من نحن", en: "About" }, seoTitle: { ar: "من نحن", en: "About us" }, sections: [{ type: "RICH_TEXT", data: { ar: { title: "من نحن", html: "<p>متجر</p>" }, en: { title: "About", html: "<p>A shop</p>" } } }] },
  ],
  menu: [{ label: { ar: "موبايلات", en: "Phones" }, href: "/c/setup-phones" }],
  ...patch,
});

async function clean() {
  await resetDb();
  await prisma.page.deleteMany({ where: { slug: { in: ["/", "/setup-about"] } } });
  await prisma.productType.deleteMany({ where: { slug: { startsWith: "setup-" } } });
  const s = await prisma.siteSettings.findFirst();
  if (s) await prisma.siteSettings.update({ where: { id: s.id }, data: { header: {}, primaryNavId: null } });
  await prisma.navigationMenu.deleteMany({ where: { name: { contains: "·" } } });
}

beforeEach(clean);

describe("Setting up a new store", () => {
  test("the wizard opens for an empty store only, and not again once set up", async () => {
    expect((await request(app).get("/v1/admin/setup/status").expect(200)).body).toMatchObject({ needed: true, setup: null, owner: true, mainLanguage: "ar" });
    await request(app).post("/v1/admin/setup/apply").send(body()).expect(200);
    const after = (await request(app).get("/v1/admin/setup/status").expect(200)).body;
    expect(after.needed).toBe(false);
    expect(after.setup).toMatchObject({ done: true, industry: "phones" });
    // A store that already has a catalog never gets it on its own either.
    await clean();
    await prisma.category.create({ data: { name: "Old", slug: "old" } });
    expect((await request(app).get("/v1/admin/setup/status").expect(200)).body.needed).toBe(false);
  });

  test("the starter content becomes ordinary rows: categories, a type, published pages in three languages, the menu, the theme", async () => {
    const res = (await request(app).post("/v1/admin/setup/apply").send(body()).expect(200)).body;
    expect(res.made).toEqual({ categories: 2, types: 1, pages: 2, menuItems: 1 });

    const phones = await prisma.category.findUnique({ where: { slug: "setup-phones" }, include: { children: true } });
    expect(phones).toMatchObject({ name: "موبايلات", translations: { en: { name: "Phones" }, he: { name: "טלפונים" } } });
    expect(phones?.children.map((c) => c.slug)).toEqual(["setup-chargers"]);
    expect(await prisma.productType.findUnique({ where: { slug: "setup-phone" } })).toMatchObject({ name: "موبايل", showSize: false, translations: { en: { name: "Phone" } } });

    const home = await prisma.page.findUnique({ where: { slug: "/" }, include: { sections: { include: { translations: true } } } });
    expect(home).toMatchObject({ status: "PUBLISHED", name: "الرئيسية" });
    expect((home!.sections[0].data as any).title).toBe("أحدث الموبايلات");
    expect(home!.sections[0].translations.map((t) => [t.locale, (t.data as any).title])).toEqual([["en", "The latest phones"]]);
    expect(await prisma.pageTranslation.findFirst({ where: { page: { slug: "/setup-about" }, locale: "en" } })).toMatchObject({ seoTitle: "About us" });

    const s = await prisma.siteSettings.findFirst({ include: { primaryNav: { include: { items: true } } } });
    expect(s!.primaryNav!.items.map((i) => [i.label, i.href])).toEqual([["موبايلات", "/c/setup-phones"]]);
    expect(s!.siteName).toBe("متجر الموبايل");
    const header = s!.header as any;
    expect(header.storeTheme).toEqual({ id: "phone-hub", mode: "dark" });
    expect(header.identity).toMatchObject({ industry: "phones", audience: "everyone", name: { ar: "متجر الموبايل", en: "Mobile Shop" } });
    // The settings before the setup are kept, to go back to.
    expect(await prisma.settingsRevision.count({ where: { note: "Store setup" } })).toBeGreaterThan(0);

    // The shop sees the home page in English too.
    const en = (await request(app).get("/v1/storefront/page?slug=%2F&locale=en").expect(200)).body;
    expect(en.page?.sections?.[0]?.translations?.[0]?.data?.title ?? en.sections?.[0]?.translations?.[0]?.data?.title).toBe("The latest phones");
  });

  test("running it again keeps what's there; the home page is replaced only when asked, after a revision", async () => {
    await request(app).post("/v1/admin/setup/apply").send(body()).expect(200);
    const again = (await request(app).post("/v1/admin/setup/apply").send(body()).expect(200)).body;
    expect(again.kept).toEqual({ categories: 2, types: 1, pages: 2 });
    expect(await prisma.category.count({ where: { slug: { startsWith: "setup-" } } })).toBe(2);

    const replaced = body({ pages: [{ slug: "/", name: { ar: "الرئيسية" }, sections: [{ type: "HERO", data: { ar: hero("عنوان جديد") } }] }], replaceHome: true });
    await request(app).post("/v1/admin/setup/apply").send(replaced).expect(200);
    const home = await prisma.page.findUnique({ where: { slug: "/" }, include: { sections: true, revisions: true } });
    expect(home!.sections.map((x) => (x.data as any).title)).toEqual(["عنوان جديد"]);
    expect(home!.revisions.some((r) => r.reason === "Before store setup")).toBe(true);
  });

  test("a section that couldn't be published stops everything before a row is written", async () => {
    const bad = body({ pages: [{ slug: "/", name: { ar: "الرئيسية" }, sections: [{ type: "HERO", data: { ar: { title: "" } } }] }] });
    const res = (await request(app).post("/v1/admin/setup/apply").send(bad).expect(400)).body;
    expect(res.error).toBe("VALIDATION_ERROR");
    expect(await prisma.category.count({ where: { slug: { startsWith: "setup-" } } })).toBe(0);
    expect(((await prisma.siteSettings.findFirst())!.header as any)?.setup).toBeUndefined();
  });

  test("the rose design (no theme) clears a theme chosen before", async () => {
    await request(app).post("/v1/admin/setup/apply").send(body()).expect(200);
    await request(app).post("/v1/admin/setup/apply").send(body({ industry: "fashion", audience: "women", theme: { id: null } })).expect(200);
    const header = (await prisma.siteSettings.findFirst())!.header as any;
    expect(header.storeTheme).toBeUndefined();
    expect(header.identity).toMatchObject({ industry: "fashion", audience: "women" });
  });
});
