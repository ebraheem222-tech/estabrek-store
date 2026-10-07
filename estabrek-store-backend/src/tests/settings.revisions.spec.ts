import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";

async function seed() {
  await resetDb();
  await prisma.settingsRevision.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.siteSettings.create({
    data: {
      siteName: "استبرق",
      header: { storefront: { scrollAnimationsEnabled: true }, delivery: { defaultFee: 30 } },
      stripeSecretKey: "sk_live_secret",
    },
  });
}

beforeEach(seed);

describe("Settings history", () => {
  test("each save keeps the settings as they were (never the payment secrets)", async () => {
    await request(app).patch("/v1/admin/settings").send({
      header: { storefront: { scrollAnimationsEnabled: true }, delivery: { defaultFee: 30 }, marketing: { ga4Id: "G-ABC1234567" } },
    }).expect(200);
    const list = await request(app).get("/v1/admin/settings/revisions").expect(200);
    expect(list.body.rows).toHaveLength(1);
    expect(list.body.rows[0].changed).toEqual(["header.marketing"]);
    const rev = await request(app).get(`/v1/admin/settings/revisions/${list.body.rows[0].id}`).expect(200);
    expect(rev.body.data.siteName).toBe("استبرق");
    expect(rev.body.data.header.marketing).toBeUndefined();
    expect(rev.body.data).not.toHaveProperty("stripeSecretKey");
  });

  test("a save that changes nothing adds no version", async () => {
    await request(app).patch("/v1/admin/settings").send({ siteName: "استبرق" }).expect(200);
    const list = await request(app).get("/v1/admin/settings/revisions").expect(200);
    expect(list.body.rows).toHaveLength(0);
  });

  test("restoring goes back to that version, keeps the current one first, and leaves secrets alone", async () => {
    await request(app).patch("/v1/admin/settings").send({ siteName: "متجر جديد", stripeSecretKey: "sk_live_new" }).expect(200);
    const [first] = (await request(app).get("/v1/admin/settings/revisions").expect(200)).body.rows;
    const out = await request(app).post(`/v1/admin/settings/revisions/${first.id}/restore`).expect(200);
    expect(out.body.settings.siteName).toBe("استبرق");
    expect(out.body.changed).toContain("siteName");
    const s = await prisma.siteSettings.findFirst();
    expect(s?.stripeSecretKey).toBe("sk_live_new");
    const list = await request(app).get("/v1/admin/settings/revisions").expect(200);
    expect(list.body.rows).toHaveLength(2);
    expect(list.body.rows[0].note).toBe("قبل الاسترجاع");
    // …so the restore itself can be undone.
    await request(app).post(`/v1/admin/settings/revisions/${list.body.rows[0].id}/restore`).expect(200);
    expect((await prisma.siteSettings.findFirst())?.siteName).toBe("متجر جديد");
  });

  test("an unknown version answers 404", async () => {
    await request(app).post("/v1/admin/settings/revisions/cnotthere00/restore").expect(404);
  });

  test("only the latest 60 versions are kept", async () => {
    for (let i = 0; i < 63; i++) await request(app).patch("/v1/admin/settings").send({ siteName: `اسم ${i}` }).expect(200);
    expect(await prisma.settingsRevision.count()).toBe(60);
  });
});

describe("Product search-engine fields", () => {
  test("saved from the admin, empty means the product's own title, and the product page gets them", async () => {
    await prisma.category.create({ data: { id: "cseocat001", name: "Hijab", slug: "hijab" } });
    const created = await request(app).post("/v1/admin/catalog/products").send({
      title: "حجاب شيفون", slug: "chiffon-hijab", categoryId: "cseocat001", isActive: true,
      seoTitle: "حجاب شيفون ناعم | استبرق", seoDescription: "شيفون خفيف بألوان هادئة.",
    }).expect(201);
    expect(created.body.seoTitle ?? (await prisma.product.findUnique({ where: { id: created.body.id ?? created.body.product?.id } }))?.seoTitle).toBe("حجاب شيفون ناعم | استبرق");
    const id = created.body.id ?? created.body.product?.id;
    await request(app).patch(`/v1/admin/catalog/products/${id}`).send({ seoTitle: "" }).expect(200);
    expect((await prisma.product.findUnique({ where: { id } }))?.seoTitle).toBeNull();
    await request(app).patch(`/v1/admin/catalog/products/${id}`).send({ seoTitle: "x".repeat(121) }).expect(400);
    const page = await request(app).get("/v1/catalog/products/slug/chiffon-hijab").expect(200);
    expect(page.body.seoDescription).toBe("شيفون خفيف بألوان هادئة.");
  });
});
