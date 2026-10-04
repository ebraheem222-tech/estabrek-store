import { describe, expect, it } from "vitest";
import type { ProductDeep } from "../../../api/catalog.api";
import { buildItems, checklist, draftFromProduct, emptyDraft, stockKey, validateDraft } from "./composerModel";

const sizes = [{ id: "cs1aaaaaaaa", name: "S" }, { id: "cs2aaaaaaaa", name: "M" }, { id: "cs3aaaaaaaa", name: "مقاس واحد" }];

function filled() {
  return emptyDraft({
    title: "فستان الورد",
    categoryId: "ccat0000001",
    price: "189",
    sizeIds: ["cs1aaaaaaaa", "cs2aaaaaaaa"],
    defaultStock: "3",
    groups: [
      { key: "g1", name: "كحلي", hex: "#1f2a44", photoKeys: ["p1", "p2"] },
      { key: "g2", name: "بيج", hex: "#d9c3a5", photoKeys: ["p3"] },
    ],
    photos: {
      p1: { key: "p1", url: "https://cdn/x1.jpg", preview: "", status: "done" },
      p2: { key: "p2", url: "https://cdn/x2.jpg", preview: "", status: "done" },
      p3: { key: "p3", url: "https://cdn/x3.jpg", preview: "", status: "done" },
    },
    stock: { [stockKey("g2", "cs2aaaaaaaa")]: "0" },
  });
}

describe("composer payload", () => {
  it("builds one colour per group with every size, price and stock", () => {
    const items = buildItems(filled(), sizes);
    expect(items).toHaveLength(2);
    expect(items[0].skuBase).toBe("FSTAN-ALWRD-NAVY");
    expect(items[0].images?.map((i) => [i.url, i.isPrimary, i.position])).toEqual([["https://cdn/x1.jpg", true, 0], ["https://cdn/x2.jpg", false, 1]]);
    expect(items[0].variants?.map((v) => [v.sku, v.price, v.stock])).toEqual([["FSTAN-ALWRD-NAVY-S", 189, 3], ["FSTAN-ALWRD-NAVY-M", 189, 3]]);
    expect(items[1].variants?.[1].stock).toBe(0);
  });

  it("keeps SKUs unique when two colours share a code and adds the sale price", () => {
    const d = filled();
    d.groups[1].name = "كحلي";
    d.groups[1].key = "g2";
    d.onSale = true;
    d.compareAt = "250";
    const items = buildItems(d, sizes);
    expect(new Set(items.map((i) => i.skuBase)).size).toBe(2);
    expect(items[0].variants?.[0].compareAt).toBe(250);
  });

  it("uses a per-size price when given", () => {
    const d = filled();
    d.priceBySize = { cs2aaaaaaaa: "199" };
    expect(buildItems(d, sizes)[0].variants?.map((v) => v.price)).toEqual([189, 199]);
  });
});

describe("checks", () => {
  it("lists what is missing in Arabic", () => {
    const e = validateDraft(emptyDraft(), { publish: true });
    expect(e.title).toBeTruthy();
    expect(e.category).toBeTruthy();
    expect(e.price).toBeTruthy();
    expect(e.sizes).toBeTruthy();
    expect(e.colors).toBeTruthy();
  });
  it("accepts a complete product and a draft without photos", () => {
    expect(validateDraft(filled(), { publish: true })).toEqual({});
    const noPhotos = { ...filled(), photos: {}, groups: [{ key: "g1", name: "أسود", hex: null, photoKeys: [] }] };
    expect(validateDraft(noPhotos, { publish: false })).toEqual({});
    expect(validateDraft(noPhotos, { publish: true }).photos).toBeTruthy();
  });
  it("rejects a sale price that is not higher", () => {
    expect(validateDraft({ ...filled(), onSale: true, compareAt: "100" }, { publish: true }).compareAt).toBeTruthy();
  });
  it("marks the checklist as done", () => {
    expect(checklist(filled()).every((c) => c.done)).toBe(true);
  });
});

describe("copy from a product", () => {
  it("keeps colours, photos, sizes, stock and price", () => {
    const d = draftFromProduct({
      id: "cp1", title: "حجاب", slug: "hjab", isActive: true, categoryId: "ccat1", description: "ناعم",
      items: [{ id: "i1", productId: "cp1", colorName: "وردي", colorHex: "#e58fae", skuBase: "HJAB-PINK", isActive: true,
        images: [{ id: "im2", productItemId: "i1", url: "https://cdn/b.jpg", position: 1, isPrimary: false }, { id: "im1", productItemId: "i1", url: "https://cdn/a.jpg", position: 0, isPrimary: true }],
        variants: [{ id: "v1", productItemId: "i1", sizeId: "cs3", sku: "HJAB-PINK-OS", price: "45", compareAt: "60", stock: 7 }] }],
    } as unknown as ProductDeep, { keepPhotos: true, titleSuffix: " (نسخة)" });
    expect(d.title).toBe("حجاب (نسخة)");
    expect(d.price).toBe("45");
    expect(d.onSale).toBe(true);
    expect(d.compareAt).toBe("60");
    expect(d.sizeIds).toEqual(["cs3"]);
    expect(d.groups[0].name).toBe("وردي");
    expect(d.groups[0].photoKeys.map((k) => d.photos[k].url)).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg"]);
    expect(d.stock[stockKey(d.groups[0].key, "cs3")]).toBe("7");
  });
});
