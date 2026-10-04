import { DARK_THEMES } from "./templates/dark";
import { LIGHT_THEMES } from "./templates/light";
import { LUXURY_THEMES } from "./templates/luxury";
import { GRADIENT_THEMES } from "./templates/gradient";
import { MODERN_THEMES } from "./templates/modern";
import { GALLERY_EXTRA_THEMES } from "./templates/galleryExtra";
import type { WebsiteTheme, WebsiteThemeCategory } from "./types";

export type { WebsiteTheme, WebsiteThemeCategory };

export {
  DARK_THEMES,
  LIGHT_THEMES,
  LUXURY_THEMES,
  GRADIENT_THEMES,
  MODERN_THEMES,
  GALLERY_EXTRA_THEMES,
};

export const ALL_WEBSITE_THEMES: WebsiteTheme[] = [
  ...DARK_THEMES,
  ...LIGHT_THEMES,
  ...LUXURY_THEMES,
  ...GRADIENT_THEMES,
  ...MODERN_THEMES,
  ...GALLERY_EXTRA_THEMES,
];

export function getWebsiteThemeById(id: string | null | undefined): WebsiteTheme | undefined {
  if (!id || id === "default") return undefined;
  return ALL_WEBSITE_THEMES.find((t) => t.id === id);
}

export function getWebsiteThemesByCategory(category: string): WebsiteTheme[] {
  return ALL_WEBSITE_THEMES.filter((t) => t.category === category);
}

export function getAllThemeCategories(): WebsiteThemeCategory[] {
  return [...new Set(ALL_WEBSITE_THEMES.map((t) => t.category))] as WebsiteThemeCategory[];
}

export const WEBSITE_THEME_CATEGORY_LABELS_AR: Record<string, string> = {
  dark: "داكن",
  light: "فاتح",
  luxury: "فاخر",
  gradient: "متدرج",
  modern: "حديث",
};

export function generateWebsiteThemeCssVars(theme: WebsiteTheme): Record<string, string> {
  const c = theme.colors;
  const surface2 = c.background;

  return {
    "--bg": c.background,
    "--surface": c.surface,
    "--surface-2": surface2,
    "--border": c.border,
    "--text": c.text,
    "--muted": c.textMuted,
    "--accent": c.primary,
    "--accent-soft": c.secondary,
    "--accent-hover": c.accent,

    "--color-bg": c.background,
    "--color-bg-alt": surface2,
    "--color-surface": c.surface,
    "--color-surface-hover": surface2,
    "--color-text": c.text,
    "--color-text-muted": c.textMuted,
    "--color-border": c.border,
    "--color-accent": c.primary,
    "--color-accent-soft": c.secondary,
    "--color-accent-hover": c.accent,
    "--color-success": c.success,
    "--color-warning": c.warning,
    "--color-error": c.error,
    "--color-info": c.accent,
  };
}
