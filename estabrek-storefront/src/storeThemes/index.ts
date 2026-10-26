import { applyCustom, cleanCustom } from "./custom";
import { themeById } from "./registry";
import type { StoreTheme, StoreThemeChoice } from "./types";

export { STORE_THEMES, themeById } from "./registry";
export { themeCss, themePalette } from "./css";
export type { StoreTheme, StoreThemeChoice } from "./types";
export { applyCustom, cleanCustom, customFromParam, customToParam, type ThemeCustom } from "./custom";

/**
 * What each kind of store wears when it hasn't picked a theme. The rose design (its hijab film,
 * seasons and guide) belongs to modest fashion stores alone: every other store gets its kind's theme.
 */
export const DEFAULT_THEME: Record<string, string> = {
  fashion: "runway-3d",
  shoes: "sneaker-lab",
  electronics: "circuit",
  phones: "phone-hub",
  gaming: "neon-arcade",
  books: "ink-library",
  beauty: "perfume-oud",
  jewelry: "gold-souq",
  home: "nordic-nest",
  kids: "toy-blocks",
  food: "coffee-roast",
  digital: "laptop-lab",
  marketplace: "mega-market",
  general: "mega-market",
  computers: "laptop-lab",
  sports: "stadium-pro",
  art: "white-gallery",
  pets: "paw-park",
  flowers: "florist-rose",
  music: "vinyl-store",
};

/**
 * The store's theme from its settings (header.storeTheme), with the store's own changes; with
 * none, its kind's theme (DEFAULT_THEME). null = the rose design, for modest fashion stores only.
 */
export function storeThemeOf(header: unknown): { theme: StoreTheme; mode: "light" | "dark" | null } | null {
  const h = header as { storeTheme?: StoreThemeChoice; identity?: { industry?: unknown; audience?: unknown } } | null | undefined;
  const choice = h?.storeTheme;
  const theme = themeById(choice?.id ?? null);
  if (!theme) {
    const industry = typeof h?.identity?.industry === "string" ? h.identity.industry : "general";
    const modest = industry === "fashion" && (h?.identity?.audience ?? "everyone") === "women";
    const fallback = modest ? null : themeById(DEFAULT_THEME[industry] ?? DEFAULT_THEME.general);
    return fallback ? { theme: fallback, mode: null } : null;
  }
  const mode = choice?.mode === "light" || choice?.mode === "dark" ? choice.mode : null;
  return { theme: applyCustom(theme, cleanCustom(choice?.custom)), mode };
}
