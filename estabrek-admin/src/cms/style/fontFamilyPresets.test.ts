import { describe, expect, it } from "vitest";
import {
  FONT_FAMILY_LIBRARY,
  FONT_FAMILY_LIBRARY_COUNT,
  getFontFamilyPresetById,
  getGoogleFontFamilyByPresetId,
  parsePrimaryFontFamilyName,
  toGoogleFontFamilyName,
} from "./fontFamilyPresets";
import { tokensToClassName, tokensToInlineStyle } from "./tokensToTw";

describe("fontFamilyPresets", () => {
  it("ships with 130+ font family presets", () => {
    expect(FONT_FAMILY_LIBRARY_COUNT).toBeGreaterThanOrEqual(130);
    expect(FONT_FAMILY_LIBRARY.length).toBe(FONT_FAMILY_LIBRARY_COUNT);
  });

  it("uses unique ids", () => {
    const ids = FONT_FAMILY_LIBRARY.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves preset id to inline font family", () => {
    const preset = FONT_FAMILY_LIBRARY[0];
    const style = tokensToInlineStyle({
      typography: {
        familyPresetId: preset.id,
      },
    } as any);
    expect(style?.fontFamily).toBe(preset.family);
  });

  it("prefers manual custom family over preset", () => {
    const preset = FONT_FAMILY_LIBRARY[0];
    const style = tokensToInlineStyle({
      typography: {
        familyPresetId: preset.id,
        familyCustom: "\"Custom UI\", sans-serif",
      },
    } as any);
    expect(style?.fontFamily).toBe("\"Custom UI\", sans-serif");
  });

  it("marks family override class when custom family is set", () => {
    const className = tokensToClassName({
      typography: {
        familyCustom: "\"Custom UI\", sans-serif",
      },
    } as any);
    expect(className).toContain("cms-typography-family-override");
    expect(className).toContain("cms-typography-override");
  });

  it("can read a preset by id", () => {
    const preset = FONT_FAMILY_LIBRARY[FONT_FAMILY_LIBRARY.length - 1];
    expect(getFontFamilyPresetById(preset.id)?.id).toBe(preset.id);
  });

  it("parses primary family name from stack", () => {
    expect(parsePrimaryFontFamilyName("\"Poppins\", \"Segoe UI\", sans-serif")).toBe("Poppins");
  });

  it("resolves google font family from preset id", () => {
    const poppins = FONT_FAMILY_LIBRARY.find((item) => item.label === "Poppins");
    expect(getGoogleFontFamilyByPresetId(poppins?.id)).toBe("Poppins");
  });

  it("ignores common system family in google font resolver", () => {
    expect(toGoogleFontFamilyName("\"Segoe UI\", Tahoma, sans-serif")).toBeUndefined();
  });
});
