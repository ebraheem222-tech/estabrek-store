/**
 * The design kits (phase 11.3): a design's whole site as editor pages. The admin shows a
 * kit in its design gallery (app/[lang]/design-frame) and puts its pages in the editor
 * (GET /api/design-kits/<kind>); every design of a kind (its variants too) shares them.
 */
import type { StoreTheme } from "../types";
import { coffeeHome } from "./coffee";
import { footer, header } from "./chrome";
import { withStyle } from "./lib";
import { photosOf } from "./photos";
import { SHOE_TEMPLATES } from "./templates/shoes";
import { BUSINESS_TEMPLATES } from "./templates/business";
import { EXPERIMENTAL_TEMPLATES } from "./templates/experimental";
import { REFERENCE_TEMPLATES_A } from "./templates/referenceTemplatesA";
import { REFERENCE_TEMPLATES_B } from "./templates/referenceTemplatesB";
import { REFERENCE_TEMPLATES_C } from "./templates/referenceTemplatesC";
import { REFERENCE_TEMPLATES_D } from "./templates/referenceTemplatesD";
import { REFERENCE_EDITION_RECIPES } from "./templates/referenceEditionRecipes";
import { referenceEdition } from "./templates/referenceEditionLayouts";
import type { Template } from "./templates/types";
import { kitCtx, type K, type Node } from "./tree";

export type { Template } from "./templates/types";
export { CATEGORIES, type Category } from "./categories";

export type { Node as KitNode } from "./tree";
export const KIT_PAGES = ["home"] as const;
export type KitPage = (typeof KIT_PAGES)[number];

const KITS: Record<string, Record<KitPage, (k: K) => Node[]>> = {
  coffee: { home: coffeeHome },
};
export const KIT_KINDS = Object.keys(KITS);

/** A kit's page as the editor's sections (`demo`: as the gallery shows it); null when the kind has no kit yet. */
export function kitPage(kind: string, page: KitPage = "home", demo = false): Node[] | null {
  const build = KITS[kind]?.[page];
  return build ? build(kitCtx(photosOf(kind), demo)) : null;
}
/** The kit a theme's design comes with, if it has one. */
export const kitOfTheme = (theme: StoreTheme | null | undefined): string | null => (theme?.design && KITS[theme.design.kind] ? theme.design.kind : null);

/* ------------------------------------------------------------- templates */

/** Every ready template, by category (the gallery's order). */
const references = [...REFERENCE_TEMPLATES_D, ...REFERENCE_TEMPLATES_A, ...REFERENCE_TEMPLATES_B, ...REFERENCE_TEMPLATES_C];
const sourceById = new Map(references.map(source => [source.id, source]));
export const TEMPLATES: Template[] = [...references, ...EXPERIMENTAL_TEMPLATES, ...SHOE_TEMPLATES, ...BUSINESS_TEMPLATES,
  ...REFERENCE_EDITION_RECIPES.map(recipe => {
    const source = sourceById.get(recipe.source);
    if (!source) throw new Error(`Missing reference for composition ${recipe.id}`);
    return referenceEdition(source, recipe);
  }),
];
const BY_ID = new Map(TEMPLATES.map((x) => [x.id, x]));
export const templateById = (id: string): Template | null => BY_ID.get(id) ?? null;
/** The theme a template wears (kits/themes.ts makes it from its style). */
export const templateThemeId = (id: string) => `tpl-${id}`;

/**
 * A template's page as the editor's sections; null for an unknown one. `demo`: as the gallery
 * shows it, with its own header and footer (a store keeps its own, in the template's theme).
 */
export function templatePage(id: string, page: KitPage = "home", demo = false): Node[] | null {
  const tpl = BY_ID.get(id);
  if (!tpl || page !== "home") return null;
  const k = withStyle(kitCtx(photosOf(tpl.category), demo), tpl.style);
  const main = tpl.home(k);
  return demo ? [tpl.regions ? tpl.regions.header(k, tpl.brand) : header(k, tpl.header.kind, tpl.brand, tpl.header.tone, tpl.navigation), ...main, tpl.regions ? tpl.regions.footer(k, tpl.brand) : footer(k, tpl.footer.kind, tpl.brand, tpl.footer.line, tpl.footer.tone)] : main;
}
