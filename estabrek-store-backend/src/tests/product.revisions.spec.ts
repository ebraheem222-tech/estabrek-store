import { describe, test, expect } from "vitest";
import { deepInputFromSnapshot } from "../modules/admin/productRevisions.js";

// Product versions (السجل): a kept product turned back into the editor's save. No database.

const snap = {
  id: "p1",
  title: "فستان الورد",
  slug: "rose-dress",
  description: null,
  seoTitle: null,
  seoDescription: null,
  isActive: true,
  categoryId: "c1",
  typeId: null,
  attributes: null,
  eventStartsAt: null,
  eventEndsAt: null,
  eventLocation: null,
  items: [
    {
      id: "i1",
      colorName: "وردي",
      boxLabel: "",
      colorHex: "#e8a0b4",
      suggestedColors: null,
      skuBase: "RD-PNK",
      isActive: true,
      images: [{ id: "img1", url: "https://x/1.jpg", alt: null, position: 0, isPrimary: true }],
      variants: [
        { id: "v1", sizeId: "s-m", sku: "RD-PNK-M", price: "240.00", compareAt: null, originalPrice: "240.00", salePrice: "199.00", saleStartsAt: "2026-10-01T00:00:00.000Z", saleEndsAt: null, stock: 4, lowStockThreshold: 2, weightGrams: null },
        { id: "v2", sizeId: "s-l", sku: "RD-PNK-L", price: "240.00", compareAt: null, originalPrice: null, salePrice: null, saleStartsAt: null, saleEndsAt: null, stock: 7, lowStockThreshold: 0, weightGrams: 300 },
      ],
    },
  ],
};

describe("A kept product, saved back", () => {
  test("what still exists is updated by id, without touching its stock", () => {
    const now = { items: [{ id: "i1", images: [{ id: "img1" }], variants: [{ id: "v1" }, { id: "v2" }] }] };
    const input = deepInputFromSnapshot(structuredClone(snap), now);
    expect(input.product).toMatchObject({ title: "فستان الورد", slug: "rose-dress", isActive: true, categoryId: "c1" });
    const [m, l] = input.items[0].variants;
    expect(m).toMatchObject({ id: "v1", sku: "RD-PNK-M", price: 240, salePrice: 199, originalPrice: 240 });
    expect(m.saleStartsAt).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    expect(m).not.toHaveProperty("stock");
    expect(l).not.toHaveProperty("stock");
    expect(input.items[0]).toMatchObject({ id: "i1", colorName: "وردي" });
    expect(input.deleteItemIds).toEqual([]);
    expect(input.deleteVariantIds).toEqual([]);
  });

  test("a size removed since comes back with its stock; what came after goes", () => {
    const now = { items: [{ id: "i1", images: [{ id: "img1" }, { id: "img9" }], variants: [{ id: "v1" }, { id: "v9" }] }, { id: "i9", images: [], variants: [{ id: "v8" }] }] };
    const input = deepInputFromSnapshot(structuredClone(snap), now);
    const l = input.items[0].variants[1];
    expect(l).not.toHaveProperty("id");
    expect(l).toMatchObject({ sku: "RD-PNK-L", stock: 7 });
    expect(input.deleteVariantIds.sort()).toEqual(["v8", "v9"]);
    expect(input.deleteItemIds).toEqual(["i9"]);
    expect(input.deleteImageIds).toEqual(["img9"]);
  });

  test("a deleted product comes back whole (nothing exists now)", () => {
    const input = deepInputFromSnapshot(structuredClone(snap), { items: [] });
    expect(input.items[0]).not.toHaveProperty("id");
    expect(input.items[0].images[0]).not.toHaveProperty("id");
    expect(input.items[0].variants.map((v) => (v as { stock?: number }).stock)).toEqual([4, 7]);
  });

  test("its translations come back with it; a version kept before translations leaves today's", () => {
    const tr = { en: { title: "Rose dress" }, he: { title: "שמלת ורד" } };
    expect(deepInputFromSnapshot({ ...structuredClone(snap), translations: tr }, { items: [] }).product.translations).toEqual(tr);
    expect(deepInputFromSnapshot(structuredClone(snap), { items: [] }).product).not.toHaveProperty("translations");
  });
});
