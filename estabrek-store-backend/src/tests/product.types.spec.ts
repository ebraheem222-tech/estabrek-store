import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { attrFiltersFrom, cleanAttributes, fieldsOf, specsOf, type FieldDef } from "../modules/productTypes/productTypes.js";

const CLOTHES = "ptype_clothes";

const FIELDS: FieldDef[] = [
  { key: "fabric", label: "القماش", kind: "select", options: ["كريب", "شيفون"], filterable: true },
  { key: "length", label: "الطول", kind: "number", unit: "سم" },
  { key: "occasion", label: "المناسبة", kind: "multiselect", options: ["يومي", "سهرة", "عرس"], filterable: true },
  { key: "care", label: "الغسيل", kind: "longtext", showOnPage: false },
  { key: "lined", label: "مبطّن", kind: "boolean" },
  { key: "date", label: "التاريخ", kind: "date", required: true },
  { key: "link", label: "الرابط", kind: "url" },
];

async function ensureClothesType() {
  // The migration seeds it; tests may run on a database that predates it.
  await prisma.productType.upsert({
    where: { id: CLOTHES },
    create: {
      id: CLOTHES,
      name: "ملابس",
      slug: "clothes",
      position: 0,
      fields: [
        { key: "fabric", label: "القماش", kind: "select", options: ["كريب", "شيفون", "جيرسي"], filterable: true, showOnPage: true },
        { key: "length", label: "الطول", kind: "number", unit: "سم", showOnPage: true },
        { key: "care", label: "تعليمات الغسيل", kind: "longtext", showOnPage: true },
        { key: "occasion", label: "المناسبة", kind: "multiselect", options: ["يومي", "سهرة", "عرس"], filterable: true, showOnPage: true },
      ] as any,
    },
    update: {},
  });
}

beforeEach(async () => {
  await resetDb();
  await seedCatalog();
  await prisma.productType.deleteMany({ where: { id: { not: CLOTHES } } });
  await ensureClothesType();
  await prisma.category.create({ data: { id: "cdresses01", name: "فساتين", slug: "dresses" } });
});
afterAll(async () => {
  await prisma.productType.deleteMany({ where: { id: { not: CLOTHES } } });
});

describe("Fields and values", () => {
  test("values are checked and tidied for every kind of field", () => {
    const { values, errors } = cleanAttributes(FIELDS, {
      fabric: "شيفون",
      length: "140,5",
      occasion: ["سهرة", "عرس", "سهرة"],
      care: "  يدوي  ",
      lined: "true",
      date: "2026-12-01",
      link: "https://example.com/x",
      junk: "dropped",
    });
    expect(errors).toEqual({});
    expect(values).toEqual({ fabric: "شيفون", length: 140.5, occasion: ["سهرة", "عرس"], care: "يدوي", lined: true, date: "2026-12-01", link: "https://example.com/x" });
    const bad = cleanAttributes(FIELDS, { fabric: "جلد", length: "طويل", occasion: ["رياضة"], date: "", link: "not a link" });
    expect(Object.keys(bad.errors).sort()).toEqual(["date", "fabric", "length", "link", "occasion"]);
  });

  test("the product page rows skip hidden and empty fields", () => {
    expect(specsOf(FIELDS, { fabric: "كريب", length: 140, occasion: ["يومي", "سهرة"], care: "يدوي", lined: false })).toEqual([
      { key: "fabric", label: "القماش", value: "كريب", kind: "select" },
      { key: "length", label: "الطول", value: "140 سم", kind: "number" },
      { key: "occasion", label: "المناسبة", value: "يومي، سهرة", kind: "multiselect" },
      { key: "lined", label: "مبطّن", value: "لا", kind: "boolean" },
    ]);
  });

  test("shop filters come from attr_<field> in the address", () => {
    expect(attrFiltersFrom({ attr_fabric: "شيفون,كريب", attr_occasion: ["عرس"], other: "x", "attr_Bad-Key": "y", attr_empty: "" })).toEqual({ fabric: ["شيفون", "كريب"], occasion: ["عرس"] });
  });
});

describe("Types in the admin", () => {
  test("make a type with its fields, change it, and it can't be deleted while products use it", async () => {
    const created = await request(app)
      .post("/v1/admin/catalog/product-types")
      .send({
        name: "تذكرة سفر",
        sizeLabel: "الدرجة",
        showColor: false,
        fields: [
          { key: "from_city", label: "من", kind: "text", required: true },
          { key: "to_city", label: "إلى", kind: "text", required: true },
          { key: "flight_date", label: "تاريخ الرحلة", kind: "date", required: true },
        ],
      })
      .expect(201);
    expect(created.body).toMatchObject({ name: "تذكرة سفر", sizeLabel: "الدرجة", showColor: false, products: 0 });
    expect(created.body.slug).toMatch(/^type-[0-9a-f]{6}$/);
    await request(app).post("/v1/admin/catalog/product-types").send({ name: "x", fields: [{ key: "a", label: "A", kind: "select" }] }).expect(400);
    await request(app)
      .post("/v1/admin/catalog/product-types")
      .send({ name: "x", fields: [{ key: "a", label: "A", kind: "text" }, { key: "a", label: "B", kind: "text" }] })
      .expect(400);

    const list = await request(app).get("/v1/admin/catalog/product-types").expect(200);
    expect(list.body.types.map((t: any) => t.slug)).toEqual(["clothes", created.body.slug]);

    const patched = await request(app).patch(`/v1/admin/catalog/product-types/${created.body.id}`).send({ name: "تذكرة", slug: "ticket" }).expect(200);
    expect(patched.body).toMatchObject({ name: "تذكرة", slug: "ticket" });

    await request(app)
      .post("/v1/admin/catalog/products")
      .send({ title: "تذكرة عمّان", slug: "amman-ticket", categoryId: "cdresses01", typeId: created.body.id, attributes: { from_city: "حيفا", to_city: "عمّان", flight_date: "2026-11-20" } })
      .expect(201);
    expect((await request(app).delete(`/v1/admin/catalog/product-types/${created.body.id}`).expect(409)).body.error).toBe("TYPE_IN_USE");
    const moved = await request(app).delete(`/v1/admin/catalog/product-types/${created.body.id}?moveTo=${CLOTHES}`).expect(200);
    expect(moved.body).toMatchObject({ ok: true, moved: 1 });
    expect((await prisma.product.findUnique({ where: { slug: "amman-ticket" } }))!.typeId).toBe(CLOTHES);
  });
});

describe("Products with a type", () => {
  test("new products get the first type; values are checked on create and on save", async () => {
    const plain = await request(app).post("/v1/admin/catalog/products").send({ title: "فستان", slug: "plain-dress", categoryId: "cdresses01" }).expect(201);
    expect(plain.body.typeId).toBe(CLOTHES);

    const bad = await request(app)
      .post("/v1/admin/catalog/products")
      .send({ title: "فستان", slug: "bad-dress", categoryId: "cdresses01", typeId: CLOTHES, attributes: { fabric: "جلد" } })
      .expect(400);
    expect(bad.body.error).toBe("ATTRIBUTES_INVALID");
    expect(bad.body.details.errors).toEqual({ fabric: "اختيار مش من القائمة" });

    const ok = await request(app)
      .post("/v1/admin/catalog/products")
      .send({ title: "فستان سهرة", slug: "night-dress", categoryId: "cdresses01", typeId: CLOTHES, attributes: { fabric: "شيفون", length: "140", occasion: ["سهرة", "عرس"], junk: 1 } })
      .expect(201);
    expect(ok.body.attributes).toEqual({ fabric: "شيفون", length: 140, occasion: ["سهرة", "عرس"] });

    // The composer's full save.
    await request(app).put(`/v1/admin/catalog/products/${ok.body.id}/full`).send({ product: { attributes: { fabric: "كريب", care: "غسيل يدوي" } } }).expect(200);
    expect((await prisma.product.findUnique({ where: { id: ok.body.id } }))!.attributes).toEqual({ fabric: "كريب", care: "غسيل يدوي" });
    await request(app).put(`/v1/admin/catalog/products/${ok.body.id}/full`).send({ product: { typeId: "nope" } }).expect(400);
    // Saving without touching the details keeps them.
    await request(app).put(`/v1/admin/catalog/products/${ok.body.id}/full`).send({ product: { title: "فستان سهرة طويل" } }).expect(200);
    expect((await prisma.product.findUnique({ where: { id: ok.body.id } }))!.attributes).toEqual({ fabric: "كريب", care: "غسيل يدوي" });
  });

  test("the storefront gets the type's labels and the details rows, and can filter by fields", async () => {
    const mk = (slug: string, attributes: Record<string, unknown>) =>
      prisma.product.create({ data: { title: slug, slug, categoryId: "cdresses01", typeId: CLOTHES, isActive: true, attributes: attributes as any } });
    await mk("a-chiffon-night", { fabric: "شيفون", occasion: ["سهرة", "عرس"], length: 140 });
    await mk("b-crepe-daily", { fabric: "كريب", occasion: ["يومي"] });
    await mk("c-chiffon-daily", { fabric: "شيفون", occasion: ["يومي"] });

    const p = await request(app).get("/v1/catalog/products/slug/a-chiffon-night").expect(200);
    expect(p.body.type).toMatchObject({ slug: "clothes", colorLabel: "اللون", sizeLabel: "المقاس", showColor: true });
    expect(p.body.specs.map((s: any) => [s.label, s.value])).toEqual([
      ["القماش", "شيفون"],
      ["الطول", "140 سم"],
      ["المناسبة", "سهرة، عرس"],
    ]);

    const slugs = async (qs: string) => (await request(app).get(`/v1/catalog/products?${qs}`).expect(200)).body.items.map((x: any) => x.slug).sort();
    expect(await slugs(`attr_fabric=${encodeURIComponent("شيفون")}`)).toEqual(["a-chiffon-night", "c-chiffon-daily"]);
    expect(await slugs(`attr_occasion=${encodeURIComponent("يومي")}`)).toEqual(["b-crepe-daily", "c-chiffon-daily"]);
    expect(await slugs(`attr_fabric=${encodeURIComponent("شيفون")}&attr_occasion=${encodeURIComponent("يومي")}`)).toEqual(["c-chiffon-daily"]);
    expect(await slugs(`attr_fabric=${encodeURIComponent("كريب,شيفون")}&type=clothes`)).toEqual(["a-chiffon-night", "b-crepe-daily", "c-chiffon-daily"]);
    expect(await slugs("type=nothing")).toEqual([]);

    const facets = await request(app).get("/v1/catalog/attribute-facets?category=dresses").expect(200);
    expect(facets.body.fields).toEqual([
      { key: "fabric", label: "القماش", kind: "select", options: [{ value: "كريب", count: 1 }, { value: "شيفون", count: 2 }] },
      { key: "occasion", label: "المناسبة", kind: "multiselect", options: [{ value: "يومي", count: 2 }, { value: "سهرة", count: 1 }, { value: "عرس", count: 1 }] },
    ]);
    const types = await request(app).get("/v1/catalog/product-types").expect(200);
    expect(fieldsOf(types.body.types[0].fields).length).toBeGreaterThan(0);
  });
});
