import { describe, expect, it } from "vitest";
import { emptyDraft } from "./composerModel";
import { productRows } from "./translationRows";
import type { ProductType } from "../../../api/productTypes.api";

const type = {
  id: "t1",
  name: "ملابس",
  fields: [
    { key: "fabric", label: "القماش", kind: "select", options: ["شيفون"] },
    { key: "care", label: "الغسيل", kind: "longtext" },
    { key: "length", label: "الطول", kind: "number" },
  ],
} as unknown as ProductType;

describe("a product's texts to translate", () => {
  it("name, description, Google texts, written fields and colour names — not choices or numbers", () => {
    const d = emptyDraft({
      title: "فستان الورد",
      description: "ناعم",
      attributes: { fabric: "شيفون", care: "غسيل يدوي", length: 140 },
      groups: [
        { key: "g1", name: "توتي", hex: null, photoKeys: [] },
        { key: "g2", name: "لون واحد", hex: null, photoKeys: [] },
      ] as never,
    });
    const rows = productRows(d, type);
    expect(rows.map((r) => r.path.join("."))).toEqual(["title", "description", "seoTitle", "seoDescription", "attributes.care", "colors.توتي"]);
    expect(rows.find((r) => r.path[0] === "attributes")).toMatchObject({ base: "غسيل يدوي", multiline: true });
  });
});
