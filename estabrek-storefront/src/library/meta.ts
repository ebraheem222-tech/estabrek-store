/**
 * The owner's theme library's items as the shop carries them (made by scripts/library/convert.mjs): each with its
 * kind, its names, its made-up brand, the words it shows and the colours it uses. Server and client alike; the
 * admin's editor reads manifest.gen.ts by path too (no React, no "@/" imports there).
 */
import { LIB_MANIFEST, type LibItemMeta } from "./manifest.gen";

export type { LibItemMeta };
export const LIB_ITEMS: readonly LibItemMeta[] = LIB_MANIFEST;
export const libItem = (id: unknown): LibItemMeta | null => (typeof id === "string" ? LIB_ITEMS.find((i) => i.id === id) ?? null : null);
