/**
 * The owner's theme library's pieces as the shop carries them (made by scripts/library/convert.mjs): each with its
 * kind, category, name, made-up brand and height. Read on the server (the page tree hands a piece what it needs);
 * the admin reads index.gen.ts by path too (no React, no "@/" imports there).
 */
import { LIB_CSS_VERSION, LIB_INDEX, type LibItem } from "./index.gen";

export type { LibItem };
export { LIB_CSS_VERSION };
const BY_ID = new Map(LIB_INDEX.map((i) => [i.id, i]));
export const libItem = (id: unknown): LibItem | null => (typeof id === "string" ? BY_ID.get(id) ?? null : null);
