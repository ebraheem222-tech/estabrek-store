import { describe, expect, it } from "vitest";
import { askText, wantLine } from "./requestsText";

describe("special requests text", () => {
  it("says what she wants in one line", () => {
    expect(wantLine({ kind: "SIZE", wantedSize: "XL", wantedColor: null, details: null, product: { title: "عباية كريب" } })).toBe("مقاس XL · عباية كريب");
    expect(wantLine({ kind: "NEW_PIECE", wantedSize: null, wantedColor: "زيتي", details: "حجاب شيفون", product: null })).toBe("حجاب شيفون · زيتي");
    expect(wantLine({ kind: "COLOR", wantedSize: null, wantedColor: null, details: null, product: null })).toBe("لون مش موجود");
  });
  it("greets her by her first name", () => {
    expect(askText("سارة أحمد", "CALLBACK")).toContain("مرحباً سارة 🌸");
  });
});
