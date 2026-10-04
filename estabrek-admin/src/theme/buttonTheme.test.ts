import { beforeEach, describe, expect, it } from "vitest";
import { getButtonTheme, DEFAULT_BUTTON_THEME_ID } from "../cms/button-themes";
import { applyButtonTheme } from "./buttonTheme";

const BUTTON_ATTR = "data-admin-button-theme";

describe("applyButtonTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(BUTTON_ATTR);
    document.documentElement.style.removeProperty("--btn-solid-bg");
  });

  it("applies css variables and attribute for explicit themes", () => {
    const themeId = "btn-violet-neon";
    const theme = getButtonTheme(themeId);
    expect(theme).toBeDefined();

    applyButtonTheme(themeId);

    expect(document.documentElement.getAttribute(BUTTON_ATTR)).toBe(themeId);
    expect(document.documentElement.style.getPropertyValue("--btn-solid-bg")).toBe(theme?.tokens.solidBg);
    expect(document.documentElement.style.getPropertyValue("--btn-accent-from")).toBe(theme?.tokens.accentFrom);
  });

  it("falls back to default tokens and removes attribute for default selection", () => {
    const defaultTheme = getButtonTheme(DEFAULT_BUTTON_THEME_ID);
    expect(defaultTheme).toBeDefined();

    applyButtonTheme("default");

    expect(document.documentElement.getAttribute(BUTTON_ATTR)).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--btn-solid-bg")).toBe(defaultTheme?.tokens.solidBg);
  });
});

