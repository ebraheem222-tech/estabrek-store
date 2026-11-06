/** Offline deterministic authoring. Run with backend's tsx; --check verifies the saved recipes. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SHOE_TEMPLATES } from "../src/storeThemes/kits/templates/shoes";
import { BUSINESS_TEMPLATES } from "../src/storeThemes/kits/templates/business";
import { EXPERIMENTAL_TEMPLATES } from "../src/storeThemes/kits/templates/experimental";
import { REFERENCE_TEMPLATES_A } from "../src/storeThemes/kits/templates/referenceTemplatesA";
import { REFERENCE_TEMPLATES_B } from "../src/storeThemes/kits/templates/referenceTemplatesB";
import { REFERENCE_TEMPLATES_C } from "../src/storeThemes/kits/templates/referenceTemplatesC";
import { REFERENCE_TEMPLATES_D } from "../src/storeThemes/kits/templates/referenceTemplatesD";
import { CATALOG_COMPOSITIONS } from "../src/storeThemes/kits/templates/catalogStyles";
import { SECTION_COUNTS, type SectionRecipe, type SectionFamily } from "../src/storeThemes/kits/templates/catalogSections";
import { referenceEditionHome, type ReferenceEditionRecipe } from "../src/storeThemes/kits/templates/referenceEditionLayouts";
import { withStyle } from "../src/storeThemes/kits/lib";
import { kitCtx, type Node } from "../src/storeThemes/kits/tree";
import { photosOf } from "../src/storeThemes/kits/photos";
import { structuralShape } from "../tests/catalog-structure";
import type { Template } from "../src/storeThemes/kits/templates/types";

const sources = [...REFERENCE_TEMPLATES_D, ...REFERENCE_TEMPLATES_A, ...REFERENCE_TEMPLATES_B, ...REFERENCE_TEMPLATES_C];
const originals = [...sources, ...EXPERIMENTAL_TEMPLATES, ...SHOE_TEMPLATES, ...BUSINESS_TEMPLATES];
if (sources.length !== 34 || originals.length !== 1037) throw new Error("Reference/original counts changed; review the explicit expansion target");
type View = { detailed: number[]; coarse: string };
type Views = [View, View];
const interned = new Map<string, number>();
const intern = (shape: string) => { if (!interned.has(shape)) interned.set(shape, interned.size); return interned.get(shape)!; };
const view = (nodes: Node[]): View => ({ detailed: nodes.map(node => intern(structuralShape(node))), coarse: nodes.map(node => structuralShape(node, true)).sort().join("\n") });
const builds = (source: Template, recipe?: ReferenceEditionRecipe): Views => [true, false].map(demo => {
  const k = withStyle(kitCtx(photosOf(source.category), demo), source.style);
  return view(recipe ? referenceEditionHome(source, recipe, k) : source.home(k));
}) as Views;
const accepted: Views[] = [];
const detailed = [new Set<string>(), new Set<string>()], coarse = [new Set<string>(), new Set<string>()];
const signature = (parts: number[]) => [...parts].sort((a, b) => a - b).join(",");
const overlap = (a: number[], b: number[]) => {
  const remaining = [...b]; let count = 0;
  for (const part of a) { const at = remaining.indexOf(part); if (at >= 0) { count++; remaining.splice(at, 1); } }
  return 2 * count / (a.length + b.length);
};
const admissible = (home: Views) => home.every((v, mode) => new Set(v.detailed).size === v.detailed.length && !detailed[mode].has(signature(v.detailed)) && !coarse[mode].has(v.coarse) && accepted.every(prior => overlap(v.detailed, prior[mode].detailed) <= 2 / 3));
const accept = (home: Views) => { home.forEach((v, mode) => { detailed[mode].add(signature(v.detailed)); coarse[mode].add(v.coarse); }); accepted.push(home); };
for (const template of originals) accept(builds(template));
function randomFor(key: string) {
  let state = 2166136261;
  for (const c of key) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
const recipes: ReferenceEditionRecipe[] = [];
let attempts = 0;
for (const [sourceIndex, source] of sources.entries()) {
  // 34 × 28 + 11 = 963 editions, spread across all reference identities.
  for (let index = 0; index < 28 + (sourceIndex < 11 ? 1 : 0); index++) {
    const id = `edition-${source.source!.number}-${String(index + 1).padStart(2, "0")}`;
    const random = randomFor(id);
    const pick = (family: SectionFamily): SectionRecipe => `${family}:${Math.floor(random() * SECTION_COUNTS[family])}`;
    let saved = false;
    for (let attempt = 0; attempt < 20000; attempt++) {
      attempts++;
      const sections: SectionRecipe[] = [pick("collections"), pick("merchandise"), pick("story"), pick("guide")];
      if (random() < .7) sections.push(pick("gallery"));
      if (random() < .35) sections.push(pick("merchandise"));
      for (let at = sections.length - 1; at > 0; at--) { const swap = Math.floor(random() * (at + 1)); [sections[at], sections[swap]] = [sections[swap], sections[at]]; }
      sections.push(pick("help"), pick("letter"));
      if (new Set(sections).size !== sections.length) continue;
      const recipe: ReferenceEditionRecipe = { id, source: source.id, opening: CATALOG_COMPOSITIONS[Math.floor(random() * CATALOG_COMPOSITIONS.length)].id, spotlight: Math.floor(random() * 20), sections };
      const home = builds(source, recipe);
      if (!admissible(home)) continue;
      recipes.push(recipe); accept(home); saved = true; break;
    }
    if (!saved) throw new Error(`Could not author a distinct composition for ${id}`);
  }
}
if (recipes.length !== 963 || accepted.length !== 2000) throw new Error("Expansion totals do not match");
const output = `import type { ReferenceEditionRecipe } from "./referenceEditionLayouts";\n\n/** 963 deterministic structural editions; authored by scripts/expand-reference-catalog.ts. */\nexport const REFERENCE_EDITION_RECIPES: ReferenceEditionRecipe[] = ${JSON.stringify(recipes, null, 2)};\n`;
const target = fileURLToPath(new URL("../src/storeThemes/kits/templates/referenceEditionRecipes.ts", import.meta.url));
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== output) throw new Error("Saved editions differ from deterministic authoring");
} else writeFileSync(target, output);
console.log(JSON.stringify({ preserved: 1022, newReferences: 15, editions: recipes.length, total: accepted.length, attempts, distinctSectionShapes: interned.size }));
