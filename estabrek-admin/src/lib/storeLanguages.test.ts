import { describe, expect, it } from "vitest";
import { languagesOf } from "./storeLanguages";

describe("languagesOf", () => {
  it("is Arabic and English, Arabic first, until the store chooses", () => {
    expect(languagesOf({})).toEqual({ enabled: ["ar", "en"], default: "ar" });
    expect(languagesOf(null)).toEqual({ enabled: ["ar", "en"], default: "ar" });
  });
  it("keeps the store's choice in a fixed order and drops unknown languages", () => {
    expect(languagesOf({ languages: { enabled: ["he", "fr", "ar"], default: "he" } })).toEqual({ enabled: ["ar", "he"], default: "he" });
  });
  it("the main language is always offered", () => {
    expect(languagesOf({ languages: { enabled: ["en"], default: "he" } })).toEqual({ enabled: ["he", "en"], default: "he" });
    expect(languagesOf({ languages: { enabled: [], default: "en" } })).toEqual({ enabled: ["en"], default: "en" });
  });
});
