import { describe, expect, it } from "vitest";
import type { ProductDeep } from "../../../api/catalog.api";
import { autoSkus, buildItems, checklist, draftForEdit, draftFromProduct, draftSignature, duplicateSkus, emptyDraft, finalSkus, priceOf, removedIds, stockKey, validateDraft } from "./composerModel";

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

/* ------------------------------------------------ SKU rows and editing */

const saved: ProductDeep = {
  id: "cprod000001",
  title: "عباية الورد",
  slug: "rose-abaya",
  isActive: true,
  categoryId: "ccat0000001",
  description: null,
  items: [
    {
      id: "citem000001", productId: "cprod000001", colorName: "أسود", colorHex: "#111111", skuBase: "ABAYA-BLK", isActive: true,
      images: [{ id: "cimg0000001", productItemId: "citem000001", url: "https://cdn/b.jpg", position: 0, isPrimary: true }],
      variants: [
        { id: "cvar0000001", productItemId: "citem000001", sizeId: "cs1aaaaaaaa", sku: "ABAYA-BLK-S", price: "250", stock: 4, lowStockThreshold: 2, size: { id: "cs1aaaaaaaa", name: "S", order: 1 } },
        { id: "cvar0000002", productItemId: "citem000001", sizeId: "cs2aaaaaaaa", sku: "ABAYA-BLK-M", price: "270", stock: 0, lowStockThreshold: 2, size: { id: "cs2aaaaaaaa", name: "M", order: 2 } },
      ],
    },
    {
      id: "citem000002", productId: "cprod000001", colorName: "وردي", colorHex: "#f5c0d0", skuBase: "ABAYA-PNK", isActive: true,
      images: [],
      variants: [{ id: "cvar0000003", productItemId: "citem000002", sizeId: "cs1aaaaaaaa", sku: "ABAYA-PNK-S", price: "250", stock: 7, lowStockThreshold: 2, size: { id: "cs1aaaaaaaa", name: "S", order: 1 } }],
    },
  ] as ProductDeep["items"],
};

describe("SKU rows", () => {
  it("an empty SKU cell takes the automatic code; a typed one is tidied and used", () => {
    const d = filled();
    const auto = autoSkus(d, sizes);
    d.skus[stockKey("g1", "cs1aaaaaaaa")] = " navy small 01 ";
    const skus = finalSkus(d, sizes);
    expect(skus[stockKey("g1", "cs1aaaaaaaa")]).toBe("NAVY-SMALL-01");
    expect(skus[stockKey("g1", "cs2aaaaaaaa")]).toBe(auto[stockKey("g1", "cs2aaaaaaaa")]);
    const items = buildItems(d, sizes);
    expect(items[0].variants?.[0].sku).toBe("NAVY-SMALL-01");
  });

  it("finds a code typed twice", () => {
    const d = filled();
    d.skus[stockKey("g1", "cs1aaaaaaaa")] = "X-1";
    d.skus[stockKey("g2", "cs2aaaaaaaa")] = "x-1";
    expect(duplicateSkus(d, sizes)).toEqual(["X-1"]);
    expect(validateDraft(d, { publish: false, sizes }).skus).toContain("X-1");
  });

  it("a colour × size can have its own price and alert", () => {
    const d = filled();
    d.priceBy[stockKey("g2", "cs2aaaaaaaa")] = "205";
    d.lowBy[stockKey("g2", "cs2aaaaaaaa")] = "5";
    expect(priceOf(d, "g2", "cs2aaaaaaaa")).toBe(205);
    expect(priceOf(d, "g1", "cs2aaaaaaaa")).toBe(189);
    const v = buildItems(d, sizes)[1].variants?.[1];
    expect(v).toMatchObject({ price: 205, lowStockThreshold: 5 });
  });
});

describe("editing a saved product", () => {
  it("loads ids, SKUs, quantities and per-size prices", () => {
    const d = draftForEdit(saved);
    expect(d.edit?.productId).toBe("cprod000001");
    expect(d.price).toBe("250");
    expect(d.sizeIds).toEqual(["cs1aaaaaaaa", "cs2aaaaaaaa"]);
    const black = d.groups[0];
    expect(d.skus[stockKey(black.key, "cs2aaaaaaaa")]).toBe("ABAYA-BLK-M");
    expect(d.priceBy[stockKey(black.key, "cs2aaaaaaaa")]).toBe("270");
    // pink has no M yet: it starts at 0
    expect(d.stock[stockKey(d.groups[1].key, "cs2aaaaaaaa")]).toBe("0");
  });

  it("saves in place: ids kept, unchanged stock left out, a new size added with its base", () => {
    const d = draftForEdit(saved);
    const [black, pink] = d.groups;
    d.stock[stockKey(black.key, "cs1aaaaaaaa")] = "9";
    const items = buildItems(d, sizes, { keepUnchangedStock: true });
    expect(items[0]).toMatchObject({ id: "citem000001", skuBase: "ABAYA-BLK" });
    expect(items[0].images?.[0]).toMatchObject({ id: "cimg0000001" });
    expect(items[0].variants?.[0]).toMatchObject({ id: "cvar0000001", sku: "ABAYA-BLK-S", stock: 9 });
    expect(items[0].variants?.[1]).toMatchObject({ id: "cvar0000002", price: 270 });
    expect(items[0].variants?.[1]).not.toHaveProperty("stock");
    const newM = items[1].variants?.find((v) => v.sizeId === "cs2aaaaaaaa");
    expect(newM).toMatchObject({ sku: "ABAYA-PNK-M", stock: 0 });
    expect(newM).not.toHaveProperty("id");
    expect(pink.itemId).toBe("citem000002");
  });

  it("removing a size, a colour or a photo lists them for deletion", () => {
    const d = draftForEdit(saved);
    d.sizeIds = ["cs1aaaaaaaa"];
    const black = d.groups[0];
    d.photos = {};
    d.groups = [{ ...black, photoKeys: [] }];
    expect(removedIds(d)).toEqual({ deleteItemIds: ["citem000002"], deleteImageIds: ["cimg0000001"], deleteVariantIds: ["cvar0000002", "cvar0000003"] });
  });

  it("a photo moved to another colour is added there anew", () => {
    const d = draftForEdit(saved);
    const [black, pink] = d.groups;
    const pk = black.photoKeys[0];
    d.groups = [{ ...black, photoKeys: [] }, { ...pink, photoKeys: [pk] }];
    const items = buildItems(d, sizes);
    expect(items[1].images?.[0]).not.toHaveProperty("id");
    expect(removedIds(d).deleteImageIds).toEqual(["cimg0000001"]);
  });

  it("knows when nothing changed", () => {
    const d = draftForEdit(saved);
    const sig = draftSignature(d);
    expect(draftSignature({ ...d })).toBe(sig);
    expect(draftSignature({ ...d, title: "x" })).not.toBe(sig);
  });
});
