import { describe, expect, it } from "vitest";
import { FONT_FAMILY_LIBRARY } from "./fontFamilyPresets";
import {
  buildGoogleFontsHref,
  collectGoogleFontsFromValue,
  ensureGoogleFontsLoaded,
} from "./googleFontsLoader";

describe("googleFontsLoader", () => {
  it("builds a deterministic google fonts href with variants", () => {
    const href = buildGoogleFontsHref([
      "Poppins:wght@400;700",
      "Amiri:ital,wght@0,400;1,400",
      "Poppins:wght@400;700",
    ]);
    expect(href).toContain("family=Amiri:ital,wght@0,400;1,400");
    expect(href).toContain("family=Poppins:wght@400;700");
    expect(href).toContain("display=swap");
  });

  it("collects google font families with used weights/styles from nested tokens", () => {
    const poppins = FONT_FAMILY_LIBRARY.find((item) => item.label === "Poppins");
    const amiri = FONT_FAMILY_LIBRARY.find((item) => item.label === "Amiri");

    const families = collectGoogleFontsFromValue({
      sections: [
        { data: { twTokens: { typography: { familyPresetId: poppins?.id, weight: "bold" } } } },
        { data: { nested: [{ typography: { familyPresetId: poppins?.id, weight: "normal" } }] } },
        { data: { nested: [{ typography: { familyPresetId: amiri?.id, weight: "light", style: "italic" } }] } },
        { data: { twTokens: { typography: { familyCustom: "\"Segoe UI\", sans-serif" } } } },
      ],
    });

    expect(families).toContain("Poppins:wght@400;700");
    expect(families).toContain("Amiri:ital,wght@1,300");
    expect(families.some((family) => family.includes("Segoe UI"))).toBe(false);
  });

  it("detects style/weight variants from typography metadata", () => {
    const poppins = FONT_FAMILY_LIBRARY.find((item) => item.label === "Poppins");
    const families = collectGoogleFontsFromValue({
      typography: {
        familyPresetId: poppins?.id,
        weight: 550,
      },
      className: "rounded-xl italic",
    });
    expect(families).toContain("Poppins:ital,wght@1,600");
  });

  it("creates and updates the dynamic google fonts link", () => {
    ensureGoogleFontsLoaded(["Poppins:wght@400;700"]);
    const link = document.getElementById("cms-google-fonts-dynamic") as HTMLLinkElement | null;
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toContain("family=Poppins:wght@400;700");

    ensureGoogleFontsLoaded([]);
    const removed = document.getElementById("cms-google-fonts-dynamic");
    expect(removed).toBeNull();
  });
});
