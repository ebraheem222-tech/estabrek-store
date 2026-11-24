import { applyCustom, cleanCustom } from "./custom";
import { themeById } from "./registry";
import type { StoreTheme, StoreThemeChoice } from "./types";
import { independentDesign, readThemeSnapshot } from "./snapshot";

export { STORE_THEMES, themeById } from "./registry";
export { themeCss, themePalette } from "./css";
export type { StoreTheme, StoreThemeChoice } from "./types";
export { applyCustom, cleanCustom, customFromParam, customToParam, type ThemeCustom } from "./custom";

/**
 * The rose design (its hijab film, seasons, fabric story and the guide Razan) is one store's own
 * theme: it shows only where that store picked it (header.storeTheme.id = "rose"), and only stores
 * that own it (header.privateThemes) see it in the admin's gallery. Nothing falls back to it.
 */
export const ROSE_THEME_ID = "rose";

/** The store wears the rose design: it picked it, and its pages aren't its own design (cms). */
export const roseDesignOn = (header: unknown): boolean =>
  !independentDesign(header) && (header as { storeTheme?: { id?: unknown } } | null | undefined)?.storeTheme?.id === ROSE_THEME_ID;

/** The rose design is this store's own: it wears it, or owns it while on another theme (only it may preview it). */
export const roseOwned = (header: unknown): boolean => {
  const h = header as { storeTheme?: { id?: unknown }; privateThemes?: unknown } | null | undefined;
  return h?.storeTheme?.id === ROSE_THEME_ID || (Array.isArray(h?.privateThemes) && h.privateThemes.includes(ROSE_THEME_ID));
};

/** What each kind of store wears when it hasn't picked a theme: its kind's theme, never the rose design. */
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
 * none, its kind's theme (DEFAULT_THEME). null = the rose design, only for a store that picked it.
 */
export function storeThemeOf(header: unknown): { theme: StoreTheme; mode: "light" | "dark" | null } | null {
  const h = header as { storeTheme?: StoreThemeChoice; identity?: { industry?: unknown } } | null | undefined;
  const choice = h?.storeTheme;
  if (choice?.id === ROSE_THEME_ID && !choice.snapshot) return null;
  const theme = readThemeSnapshot(choice?.snapshot) ?? themeById(choice?.id ?? null);
  if (!theme) {
    const industry = typeof h?.identity?.industry === "string" ? h.identity.industry : "general";
    const fallback = themeById(DEFAULT_THEME[industry] ?? DEFAULT_THEME.general);
    return fallback ? { theme: fallback, mode: null } : null;
  }
  const mode = choice?.mode === "light" || choice?.mode === "dark" ? choice.mode : null;
  return { theme: applyCustom(theme, cleanCustom(choice?.custom)), mode };
}
