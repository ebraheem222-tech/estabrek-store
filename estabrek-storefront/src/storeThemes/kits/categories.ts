/**
 * The template gallery's categories (phase 11.3): what a store owner picks first, then sees
 * that category's templates. Each lists the store kinds (dna/kinds.ts) it serves.
 */
import type { Words } from "../types";
import { t } from "./tree";

export type Category = { id: string; name: Words; kinds: string[] };
export const CATEGORIES: Category[] = [
  { id: "shoes", name: t("أحذية|Shoes|נעליים"), kinds: ["shoes-sneakers", "sportswear"] },
];
