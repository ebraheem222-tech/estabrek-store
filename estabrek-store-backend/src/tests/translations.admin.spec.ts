import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { AI_DEFAULTS } from "../modules/ai/ai.settings.js";
import { setAiProvider, type AiPrompt } from "../modules/ai/ai.client.js";

// The shop's content in Arabic, English and Hebrew: the owner saves it, the shop reads it,
// and the AI drafts it for the owner to check (src/lib/translations.ts).
const seen: AiPrompt[] = [];
let answer: (p: AiPrompt) => unknown = () => ({});
const fake = {
  json: async <T,>(p: AiPrompt) => {
    seen.push(p);
    return { ok: true as const, data: answer(p) as T };
  },
  editImage: async () => ({ ok: false as const, error: "not here" }),
};
const setAi = (patch: Record<string, unknown>) => request(app).put("/v1/admin/ai").send({ ...AI_DEFAULTS, ...patch });

beforeEach(async () => {
  seen.length = 0;
  answer = () => ({});
  setAiProvider(null);
  await prisma.aiCache.deleteMany();
  await setAi({}).expect(200);
  await resetDb();
  await seedCatalog();
});
afterAll(() => setAiProvider(null));

describe("Content in other languages", () => {
  test("a product's other languages are kept tidy, reach the shop, and find the piece in a search", async () => {
    await request(app)
      .patch("/v1/admin/catalog/products/p1")
      .send({ translations: { ar: { title: "قميص أزرق" }, he: { title: "חולצה כחולה", description: "", colors: { Blue: "כחול" } } } })
      .expect(200);
    const saved = await prisma.product.findUnique({ where: { id: "p1" }, select: { translations: true, title: true } });
    expect(saved).toEqual({ title: "Blue Shirt", translations: { ar: { title: "قميص أزرق" }, he: { title: "חולצה כחולה", colors: { Blue: "כחול" } } } });

    const page = (await request(app).get("/v1/catalog/products/slug/blue-shirt").expect(200)).body;
    expect(page.title).toBe("Blue Shirt");
    expect(page.translations.he).toEqual({ title: "חולצה כחולה", colors: { Blue: "כחול" } });
    const found = async (q: string) => (await request(app).get(`/v1/catalog/products?q=${encodeURIComponent(q)}`).expect(200)).body.items.map((x: any) => x.slug);
    expect(await found("חולצה")).toEqual(["blue-shirt"]);
    expect(await found("قميص")).toEqual(["blue-shirt"]);

    // The editor's full save replaces them as a whole.
    await request(app).put("/v1/admin/catalog/products/p1/full").send({ product: { translations: { en: { seoTitle: "Blue cotton shirt" } } } }).expect(200);
    expect((await prisma.product.findUnique({ where: { id: "p1" } }))?.translations).toEqual({ en: { seoTitle: "Blue cotton shirt" } });
    // Too long, or not an object: refused.
    await request(app).patch("/v1/admin/catalog/products/p1").send({ translations: { en: { title: "x".repeat(200) } } }).expect(400);
    await request(app).patch("/v1/admin/catalog/products/p1").send({ translations: "Blue" }).expect(400);
  });

  test("categories and product types: names, labels, choices — and the shop's filters say them too", async () => {
    await request(app).patch("/v1/admin/catalog/categories/c2").send({ translations: { he: { name: "חולצות" }, en: { name: "" } } }).expect(200);
    const tree = (await request(app).get("/v1/catalog/categories/tree").expect(200)).body;
    expect(tree[0].children[0]).toMatchObject({ id: "c2", name: "Shirts", translations: { he: { name: "חולצות" } } });

    const type = (
      await request(app)
        .post("/v1/admin/catalog/product-types")
        .send({
          name: "ملابس",
          fields: [{ key: "fabric", label: "القماش", kind: "select", options: ["شيفون", "كريب"], filterable: true }],
          translations: { he: { name: "ביגוד", colorLabel: "צבע", fields: { fabric: { label: "בד", options: { "شيفون": "שיפון" } } } } },
        })
        .expect(201)
    ).body;
    expect(type.translations).toEqual({ he: { name: "ביגוד", colorLabel: "צבע", fields: { fabric: { label: "בד", options: { "شيفون": "שיפון" } } } } });
    await request(app).put("/v1/admin/catalog/products/p1/full").send({ product: { typeId: type.id, attributes: { fabric: "شيفون" } } }).expect(200);

    const page = (await request(app).get("/v1/catalog/products/slug/blue-shirt").expect(200)).body;
    expect(page.type.translations.he.fields.fabric.label).toBe("בד");
    expect(page.specs).toEqual([{ key: "fabric", label: "القماش", value: "شيفون", kind: "select", raw: "شيفون" }]);
    const facets = (await request(app).get("/v1/catalog/attribute-facets?category=shirts").expect(200)).body;
    expect(facets.fields).toEqual([
      { key: "fabric", label: "القماش", kind: "select", options: [{ value: "شيفون", count: 1 }], translations: { he: { label: "בד", options: { "شيفون": "שיפון" } } } },
    ]);
    // A later edit of the type keeps or replaces them.
    const patched = (await request(app).patch(`/v1/admin/catalog/product-types/${type.id}`).send({ translations: { en: { name: "Clothes" } } }).expect(200)).body;
    expect(patched.translations).toEqual({ en: { name: "Clothes" } });
  });

  test("the AI drafts a translation: off until switched on, same keys back, nothing saved", async () => {
    const body = { to: "he", texts: { title: "قميص أزرق", note: "أهلاً في {store}" } };
    expect((await request(app).post("/v1/admin/ai-catalog/translate").send(body).expect(404)).body.error).toBe("FEATURE_OFF");

    setAiProvider(fake);
    await setAi({ translate: true }).expect(200);
    expect((await request(app).get("/v1/admin/ai-catalog/status").expect(200)).body.translate).toBe(true);
    answer = () => ({ texts: { title: "חולצה כחולה", note: "ברוכים הבאים לחנות", extra: "x" } });
    const out = (await request(app).post("/v1/admin/ai-catalog/translate").send(body).expect(200)).body;
    // The note lost {store}: left for the owner. Keys the shop didn't send: dropped.
    expect(out).toEqual({ texts: { title: "חולצה כחולה" } });
    expect(seen).toHaveLength(1);
    expect(seen[0].system).toContain("into natural, warm Hebrew");
    expect(seen[0].user).toContain("قميص أزرق");
    // The same texts again come from the saved answer (not paid twice); the main language needs none.
    await request(app).post("/v1/admin/ai-catalog/translate").send(body).expect(200);
    expect((await request(app).post("/v1/admin/ai-catalog/translate").send({ to: "ar", texts: { title: "قميص" } }).expect(200)).body).toEqual({ texts: {} });
    expect(seen).toHaveLength(1);
    expect((await prisma.product.findUnique({ where: { id: "p1" } }))?.translations).toEqual({});
    await request(app).post("/v1/admin/ai-catalog/translate").send({ to: "fr", texts: { title: "x" } }).expect(400);
  });
});
