import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma, resetDb } from "./helpers/db.js";
import { searchWords } from "../modules/catalog/catalog.service.js";

// The shop's search finds a piece whatever the Arabic spelling (ة/ه, ى/ي, أ/إ/آ/ا, diacritics), word by word.
beforeAll(async () => {
  await prisma.orderRequestItem.deleteMany();
  await resetDb();
  await prisma.category.createMany({ data: [{ id: "csrchcat01", name: "عبايات", slug: "srch-abayas" }, { id: "csrchcat02", name: "فساتين", slug: "srch-dresses" }] });
  await prisma.size.create({ data: { id: "csrchsizem", name: "M", order: 1 } });
  const mk = (id: string, title: string, categoryId: string, extra: Partial<Prisma.ProductCreateInput> = {}) =>
    prisma.product.create({
      data: {
        id, title, slug: `srch-${id}`, isActive: true, category: { connect: { id: categoryId } }, ...extra,
        items: { create: [{ colorName: "أسود", colorHex: "#111111", skuBase: id, variants: { create: [{ sku: `${id}-m`, price: new Prisma.Decimal(200), stock: 3, size: { connect: { id: "csrchsizem" } } }] } }] },
      },
    });
  await mk("csrchp0001", "عباية كريب سوداء", "csrchcat01");
  await mk("csrchp0002", "فستان سهرة أسود", "csrchcat02", { translations: { he: { title: "שמלת ערב שחורה" } } });
  await mk("csrchp0003", "حجاب شِيفون ناعم", "csrchcat01", { description: "خفيف ومريح للصيف" });
  await mk("csrchp0004", "عباية مخفية", "csrchcat01", { isActive: false });
});

const titles = async (q: string) =>
  ((await request(app).get(`/v1/catalog/products?q=${encodeURIComponent(q)}&page=1&pageSize=20`).expect(200)).body.items as Array<{ title: string }>).map((p) => p.title).sort();

describe("Arabic-tolerant search", () => {
  test("the words a search asks for", () => {
    expect(searchWords("عبايةٌ  سوداءُ")).toEqual(["عبايه", "سوداء"]);
    expect(searchWords("الأسود")).toEqual(["اسود"]);
    expect(searchWords("مصلّى")).toEqual(["مصلي"]);
    expect(searchWords("  ")).toEqual([]);
  });

  test("ة/ه, أ/ا, the article, diacritics: each finds the piece", async () => {
    expect(await titles("عبايه")).toEqual(["عباية كريب سوداء"]);
    expect(await titles("فستان اسود")).toEqual(["فستان سهرة أسود"]);
    expect(await titles("الاسود")).toEqual(["فستان سهرة أسود"]);
    expect(await titles("حجاب شيفون")).toEqual(["حجاب شِيفون ناعم"]);
  });

  test("every word anywhere: the category, the description, a translated title; hidden pieces never", async () => {
    // "عبايات" is the category's name: its pieces (not the hidden one).
    expect(await titles("عبايات")).toEqual(["حجاب شِيفون ناعم", "عباية كريب سوداء"]);
    expect(await titles("حجاب للصيف")).toEqual(["حجاب شِيفون ناعم"]);
    expect(await titles("שחורה")).toEqual(["فستان سهرة أسود"]);
    expect(await titles("عباية حمراء")).toEqual([]);
    expect(await titles("مخفيه")).toEqual([]);
  });

  test("the typeahead finds it too", async () => {
    const out = (await request(app).get(`/v1/storefront/search/suggest?q=${encodeURIComponent("عبايه سودا")}`).expect(200)).body;
    expect(out.products.map((p: { title: string }) => p.title)).toContain("عباية كريب سوداء");
  });
});
