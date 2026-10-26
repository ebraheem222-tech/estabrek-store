import { themeById } from "./registry";
import type { StoreTheme, StoreThemeChoice } from "./types";

export { STORE_THEMES, themeById } from "./registry";
export { themeCss, themePalette } from "./css";
export type { StoreTheme, StoreThemeChoice } from "./types";

/** The store's theme from its settings (header.storeTheme); null = the rose design. */
export function storeThemeOf(header: unknown): { theme: StoreTheme; mode: "light" | "dark" | null } | null {
  const choice = (header as { storeTheme?: StoreThemeChoice } | null | undefined)?.storeTheme;
  const theme = themeById(choice?.id ?? null);
  if (!theme) return null;
  const mode = choice?.mode === "light" || choice?.mode === "dark" ? choice.mode : null;
  return { theme, mode };
}
