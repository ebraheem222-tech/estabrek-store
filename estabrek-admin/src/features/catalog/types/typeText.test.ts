import { describe, expect, it } from "vitest";
import { fieldProblems, missingRequired, newFieldKey, parseOptions, tidyAttributes } from "./typeText";
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
    expect(fieldProblems([{ key: "a", label: "", kind: "text" }, { key: "b", label: "B", kind: "select", options: [] }])).toEqual({ a: "اكتبي اسم الحقل", b: "أضيفي اختيار واحد على الأقل" });
  });
});
