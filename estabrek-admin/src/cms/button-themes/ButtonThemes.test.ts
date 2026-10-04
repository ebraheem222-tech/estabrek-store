import { describe, expect, it } from "vitest";
import { buttonThemes, DEFAULT_BUTTON_THEME_ID, getButtonTheme, buttonThemeCategories } from "./ButtonThemes";

describe("button themes catalog", () => {
  it("contains 100 themes with unique ids", () => {
    expect(buttonThemes).toHaveLength(100);
    const ids = new Set(buttonThemes.map((theme) => theme.id));
    expect(ids.size).toBe(100);
  });

  it("keeps the default theme available", () => {
    const theme = getButtonTheme(DEFAULT_BUTTON_THEME_ID);
    expect(theme).toBeDefined();
    expect(theme?.tokens.solidBg).toBeTruthy();
    expect(theme?.tokens.accentFrom).toBeTruthy();
  });

  it("exposes all style categories", () => {
    expect(buttonThemeCategories).toHaveLength(10);
    expect(buttonThemeCategories).toContain("classic");
    expect(buttonThemeCategories).toContain("midnight");
  });
});

