import { describe, expect, it } from "vitest";
import { contrast, customParam, readabilityIssues, tidyCustom, type Palette } from "./customize";

const base: Palette = { bg: "#ffffff", surface: "#ffffff", soft: "#eeeeee", line: "#dddddd", glow: "#cccccc", muted: "#555555", accent: "#2563eb", strong: "#1d4ed8", ink: "#111111", onStrong: "#ffffff" };

describe("theme customizer", () => {
  it("measures contrast like the shop's checks", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrast("#777777", "#ffffff")).toBeGreaterThan(4.4);
  });

  it("says what reads badly", () => {
    expect(readabilityIssues(base)).toEqual([]);
    expect(readabilityIssues({ ...base, ink: "#eeeeee" }).length).toBe(2);
    expect(readabilityIssues({ ...base, onStrong: "#1e40af" }).length).toBe(1);
  });

  it("keeps only real changes", () => {
    const theme = { palettes: { light: base } };
    expect(tidyCustom({ palette: { light: { bg: "#FFFFFF", accent: "#ff0000" } } }, theme)).toEqual({ palette: { light: { accent: "#ff0000" } } });
    expect(tidyCustom({ palette: { light: { bg: "#ffffff" } }, fonts: {} }, theme)).toBeNull();
    expect(tidyCustom({ round: 5, button: "round", fonts: { display: "amiri" } }, theme)).toEqual({ round: 2, button: "round", fonts: { display: "amiri" } });
    expect(tidyCustom({ palette: { light: { bg: "red" as string } } }, theme)).toBeNull();
  });

  it("puts the changes in the preview address", () => {
    expect(customParam(null)).toBe("");
    expect(decodeURIComponent(customParam({ round: 1 }).split("=")[1])).toBe('{"round":1}');
  });
});
