import { describe, expect, it } from "vitest";
import { deliveryLine, fieldProblems, missingRequired, newFieldKey, parseOptions, tidyAttributes } from "./typeText";
import type { TypeField } from "../../../api/productTypes.api";

const F: TypeField[] = [
  { key: "fabric", label: "القماش", kind: "select", options: ["كريب"] },
  { key: "length", label: "الطول", kind: "number", unit: "سم", required: true },
  { key: "lined", label: "مبطّن", kind: "boolean" },
  { key: "occ", label: "المناسبة", kind: "multiselect", options: ["سهرة"] },
];

describe("product type helpers", () => {
  it("field keys are new and well-formed", () => {
    const k = newFieldKey(["fabric"]);
    expect(k).toMatch(/^f[a-z0-9]{5}$/);
    let n = 0;
    const seq = [0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5];
    expect(newFieldKey(["faaaaa"], () => seq[n++ % seq.length])).not.toBe("faaaaa");
  });

  it("choices from lines or commas", () => {
    expect(parseOptions("كريب\nشيفون، جيرسي , كريب\n\n")).toEqual(["كريب", "شيفون", "جيرسي"]);
  });

  it("values to send and what's missing", () => {
    expect(tidyAttributes(F, { fabric: " كريب ", length: "140,5", lined: true, occ: [], junk: "x" })).toEqual({ fabric: "كريب", length: 140.5, lined: true });
    expect(missingRequired(F, { fabric: "كريب" })).toEqual(["length"]);
    expect(fieldProblems([{ key: "a", label: "", kind: "text" }, { key: "b", label: "B", kind: "select", options: [] }])).toEqual({ a: "لازم يكون للحقل اسم", b: "لازم يكون في اختيار واحد على الأقل" });
  });
});

describe("deliveryLine", () => {
  it("the product's own days and place, else the type's", () => {
    const type = { shipsFrom: "رام الله", minDays: 2, maxDays: 4 };
    expect(deliveryLine({}, type)).toBe("بيوصل خلال 2–4 أيام · بينشحن من رام الله");
    expect(deliveryLine({ shipsFrom: "الصين", minDays: 10, maxDays: 20 }, type)).toBe("بيوصل خلال 10–20 يوم · بينشحن من الصين");
    expect(deliveryLine({ minDays: 1 }, type)).toBe("بيوصل خلال يوم · بينشحن من رام الله");
    expect(deliveryLine({ minDays: 5, maxDays: 2 }, null)).toBe("بيوصل خلال 2–5 أيام");
    expect(deliveryLine({ minDays: 0, maxDays: 0 })).toBe("بيوصل بنفس اليوم");
    expect(deliveryLine({ maxDays: 2 })).toBe("بيوصل خلال يومين");
    expect(deliveryLine({ shipsFrom: "  " }, { shipsFrom: "" })).toBeNull();
  });
});
