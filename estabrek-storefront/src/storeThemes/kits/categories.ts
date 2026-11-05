/**
 * The template gallery's categories (phase 11.3): what a store owner picks first, then sees
 * that category's templates. Each lists the store kinds (dna/kinds.ts) it serves.
 */
import type { Words } from "../types";
import { t } from "./tree";
import type { ThemeFamily } from "../types";
import { INDUSTRIES } from "./templates/industries";

export type Category = { id: string; name: Words; kinds: string[]; family: ThemeFamily };
export const CATEGORIES: Category[] = [
  { id: "shoes", name: t("أحذية|Shoes|נעליים"), kinds: ["shoes-sneakers", "sportswear"], family: "shoes" },
  ...INDUSTRIES.map((d) => ({ id: d.id, name: d.label, kinds: d.kinds, family: d.family })),
];
