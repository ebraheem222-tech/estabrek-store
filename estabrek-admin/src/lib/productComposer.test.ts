import { describe, expect, it } from "vitest";
import { colorCode, colorDistance, dominantGarmentColor, makeSlug, nearestFashionColor, parsePrice, presetForCategory, sizePresets, skuPart } from "./productComposer";

describe("Arabic-friendly slugs and SKUs", () => {
  it("turns Arabic titles into latin slugs", () => {
    expect(makeSlug("فستان الورد")).toBe("fstan-alwrd");
    expect(makeSlug("حجاب لؤلؤي ٢٠٢٦")).toBe("hjab-lwlwy-2026");
    expect(makeSlug("Rose Dress!")).toBe("rose-dress");
    expect(makeSlug("   ")).toMatch(/^product-/);
  });
  it("builds SKU parts from Arabic size names", () => {
    expect(skuPart("مقاس واحد")).toBe("MQAS-WAHD");
    expect(skuPart("One Size")).toBe("ONE-SIZE");
    expect(colorCode("بيج")).toBe("BEIGE");
    expect(colorCode("لون خاص")).toBe("LWN-KHAS");
  });
  it("reads prices typed with Arabic digits and commas", () => {
    expect(parsePrice("١٢٠")).toBe(120);
    expect(parsePrice("89,90")).toBe(89.9);
    expect(parsePrice("₪ 150")).toBe(150);
    expect(parsePrice("")).toBeNull();
  });
});

describe("colours", () => {
  it("names colours with the shop's Arabic palette", () => {
    expect(nearestFashionColor("#1e2943").name).toBe("كحلي");
    expect(nearestFashionColor("#dcc5a6").name).toBe("بيج");
    expect(nearestFashionColor("#6a1e32").name).toBe("خمري");
  });
  it("ignores a white backdrop and finds the garment", () => {
    const w = 40, h = 50, data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const inGarment = x > 12 && x < 28 && y > 8 && y < 44; // ~35% of the photo
      const [r, g, b] = inGarment ? [31, 42, 68] : [248, 248, 246];
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
    const hex = dominantGarmentColor(data, w, h)!;
    expect(colorDistance(hex, "#1f2a44")).toBeLessThan(5);
  });
  it("still answers for a photo that is one flat colour", () => {
    const data = new Uint8ClampedArray(10 * 10 * 4).map((_, i) => (i % 4 === 3 ? 255 : i % 4 === 0 ? 200 : 40));
    expect(dominantGarmentColor(data, 10, 10)).toBe("#c82828");
  });
});

describe("size presets", () => {
  const sizes = ["S", "M", "L", "XL", "One Size", "38", "40", "2", "4", "6"].map((name, i) => ({ id: `s${i}`, name }));
  it("groups the store's sizes into ready sets", () => {
    const p = sizePresets(sizes);
    expect(p.find((x) => x.key === "letters")?.sizeIds).toEqual(["s0", "s1", "s2", "s3"]);
    expect(p.find((x) => x.key === "one")?.sizeIds).toEqual(["s4"]);
    expect(p.find((x) => x.key === "numbers")?.sizeIds).toEqual(["s5", "s6"]);
    expect(p.find((x) => x.key === "kids")?.sizeIds).toEqual(["s7", "s8", "s9"]);
  });
  it("picks a set from the category name", () => {
    const p = sizePresets(sizes);
    expect(presetForCategory("حجاب", p)?.key).toBe("one");
    expect(presetForCategory("مباخر", p)?.key).toBe("one");
    expect(presetForCategory("أطفال/ جيل محير", p)?.key).toBe("kids");
    expect(presetForCategory("فساتين", p)?.key).toBe("letters");
  });
});
