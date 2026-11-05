import type { TK } from "../lib";
import type { Template } from "./types";
import { INDUSTRIES, industry, type Industry } from "./industries";
import { CATALOG_COMPOSITIONS } from "./catalogStyles";
import { CATALOG_RECIPES } from "./catalogRecipes";
import { catalogOpening, catalogSection } from "./catalogSections";
import { SHOE_CATALOG_CONTENT, SHOE_EDITIONS } from "./catalogContent";

function templatesFor(d: Industry, shoeEditions = false): Template[] {
  return CATALOG_COMPOSITIONS.filter((_, i) => !shoeEditions || i >= 10).map((c, i) => {
    const profile = shoeEditions ? industry({ ...SHOE_CATALOG_CONTENT, ...(SHOE_EDITIONS[i] ?? {}) }) : d;
    const id = `${d.id}-${c.id}`;
    const recipe = CATALOG_RECIPES[id];
    if (!recipe) throw new Error(`Missing home composition: ${id}`);
    return {
      id, category: d.id,
      name: { ar: `${d.label.ar} · ${c.name.ar}`, en: `${d.label.en} · ${c.name.en}`, he: `${d.label.he} · ${c.name.he}` },
      blurb: { ar: `${profile.intro.ar} ${c.name.ar}.`, en: `${profile.intro.en} ${c.name.en}.`, he: `${profile.intro.he} ${c.name.he}.` },
      style: { ...c.style, id }, tags: [...c.tags, d.id], brand: profile.brand,
      header: { kind: c.header }, footer: { kind: c.footer, line: profile.intro },
      home: (k: TK) => [catalogOpening(k, profile, c.id), ...recipe.map((section) => catalogSection(k, profile, section))],
      navigation: { menu: profile.collections, highlights: profile.details },
    };
  });
}

/** Nineteen industries × fifty homes, plus forty shoe homes; original shoes stay intact. */
export const BUSINESS_TEMPLATES: Template[] = [
  ...INDUSTRIES.flatMap((d) => templatesFor(d)),
  ...templatesFor(industry(SHOE_CATALOG_CONTENT), true),
];
