/**
 * The rose design (its hijab film, seasons, fabric story and the guide Razan) is one store's own
 * theme: it shows only where that store picked it (header.storeTheme.id = "rose"), and only stores
 * that own it (header.privateThemes) see it in the admin's gallery. Nothing falls back to it.
 * No imports: the words (lib/words.ts) and the API client use it too.
 */
export const ROSE_THEME_ID = "rose";

type RoseHeader = { storeTheme?: { id?: unknown }; privateThemes?: unknown; storeDesign?: { mode?: unknown } } | null | undefined;

/** The store wears the rose design: it picked it, and its pages aren't its own design (cms). */
export const roseDesignOn = (header: unknown): boolean => {
  const h = header as RoseHeader;
  return h?.storeDesign?.mode !== "cms" && h?.storeTheme?.id === ROSE_THEME_ID;
};

/** The rose design is this store's own: it wears it, or owns it while on another theme (only it may preview it). */
export const roseOwned = (header: unknown): boolean => {
  const h = header as RoseHeader;
  return h?.storeTheme?.id === ROSE_THEME_ID || (Array.isArray(h?.privateThemes) && h.privateThemes.includes(ROSE_THEME_ID));
};
