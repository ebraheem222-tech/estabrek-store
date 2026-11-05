/**
 * Offline authoring: deterministic recipes, rejecting duplicate/overlapping real trees.
 * From storefront: ../estabrek-store-backend/node_modules/.bin/tsx scripts/expand-template-catalog.ts
 * Runtime imports only the emitted manifest, never this search or a random generator.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { withStyle } from "../src/storeThemes/kits/lib";
import { kitCtx, type Node } from "../src/storeThemes/kits/tree";
import { photosOf } from "../src/storeThemes/kits/photos";
import { CATALOG_COMPOSITIONS, type Composition } from "../src/storeThemes/kits/templates/catalogStyles";
import { BASE_CATALOG_RECIPES } from "../src/storeThemes/kits/templates/catalogRecipes";
import { SECTION_COUNTS, catalogOpening, catalogSection, type SectionFamily, type SectionRecipe } from "../src/storeThemes/kits/templates/catalogSections";
import { INDUSTRIES, industry, type Industry } from "../src/storeThemes/kits/templates/industries";
import { SHOE_CATALOG_CONTENT, SHOE_EDITIONS } from "../src/storeThemes/kits/templates/catalogContent";
import { SHOE_TEMPLATES } from "../src/storeThemes/kits/templates/shoes";
import { structuralShape } from "../tests/catalog-structure";

type View = { detailed: number[]; coarse: number[] };
type Home = [View, View];
const structures = new Map<string, number>();
const intern = (shape: string) => {
  const known = structures.get(shape);
  if (known !== undefined) return known;
  const id = structures.size;
  structures.set(shape, id);
  return id;
};
const view = (nodes: Node[]): View => ({ detailed: nodes.map((n) => intern(structuralShape(n))), coarse: nodes.map((n) => intern(structuralShape(n, true))) });
const signature = (parts: number[]) => [...parts].sort((a, b) => a - b).join(",");
const whole = [new Set<string>(), new Set<string>()];
const skeletons = [new Set<string>(), new Set<string>()];
const accepted: Home[] = [];
const overlap = (a: number[], b: number[]) => {
  const remaining = [...b];
  let shared = 0;
  for (const part of a) {
    const at = remaining.indexOf(part);
    if (at >= 0) { shared++; remaining.splice(at, 1); }
  }
  return 2 * shared / (a.length + b.length);
};
function admissible(home: Home) {
  return home.every((candidate, mode) => new Set(candidate.detailed).size === candidate.detailed.length && !whole[mode].has(signature(candidate.detailed)) && !skeletons[mode].has(signature(candidate.coarse)) && accepted.every((prior) => overlap(candidate.detailed, prior[mode].detailed) <= 2 / 3));
}
function accept(home: Home) {
  home.forEach((candidate, mode) => { whole[mode].add(signature(candidate.detailed)); skeletons[mode].add(signature(candidate.coarse)); });
  accepted.push(home);
}

const entries: Array<{ id: string; profile: Industry; composition: Composition }> = INDUSTRIES.flatMap((profile) => CATALOG_COMPOSITIONS.map((composition) => ({ id: `${profile.id}-${composition.id}`, profile, composition })));
for (const [i, composition] of CATALOG_COMPOSITIONS.slice(10).entries()) entries.push({ id: `shoes-${composition.id}`, profile: industry({ ...SHOE_CATALOG_CONTENT, ...(SHOE_EDITIONS[i] ?? {}) }), composition });
const build = (entry: typeof entries[number], recipe: SectionRecipe[]): Home => [true, false].map((demo) => {
  const k = withStyle(kitCtx(photosOf(entry.profile.id), demo), { ...entry.composition.style, id: entry.id });
  return view([catalogOpening(k, entry.profile, entry.composition.id), ...recipe.map((section) => catalogSection(k, entry.profile, section))]);
}) as Home;

// Seed rejection with every legacy home. The authoring command never rewrites them.
for (const template of SHOE_TEMPLATES) accept([true, false].map((demo) => view(template.home(withStyle(kitCtx(photosOf("shoes"), demo), template.style)))) as Home);
for (const entry of entries) if (BASE_CATALOG_RECIPES[entry.id]) accept(build(entry, BASE_CATALOG_RECIPES[entry.id]));
if (accepted.length !== 300) throw new Error(`Expected 300 preserved homes, got ${accepted.length}`);

function randomFor(key: string) {
  let state = 2166136261;
  for (const char of key) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
const generated: Record<string, SectionRecipe[]> = {};
let attempts = 0;
for (const entry of entries.filter((e) => !BASE_CATALOG_RECIPES[e.id])) {
  const random = randomFor(entry.id);
  const pick = (family: SectionFamily): SectionRecipe => `${family}:${Math.floor(random() * SECTION_COUNTS[family])}`;
  let saved = false;
  for (let attempt = 0; attempt < 10000; attempt++) {
    attempts++;
    const body: SectionRecipe[] = [pick("collections"), pick("merchandise"), pick("story"), pick("guide")];
    if (random() < 0.8) body.push(pick("gallery"));
    if (random() < 0.55) body.push(pick(random() < 0.5 ? "merchandise" : "gallery"));
    // Distinct editorial journeys, with help and subscription consistently at the end.
    for (let at = body.length - 1; at > 0; at--) { const swap = Math.floor(random() * (at + 1)); [body[at], body[swap]] = [body[swap], body[at]]; }
    body.push(pick("help"), pick("letter"));
    if (new Set(body).size !== body.length) continue;
    const home = build(entry, body);
    if (!admissible(home)) continue;
    generated[entry.id] = body;
    accept(home);
    saved = true;
    break;
  }
  if (!saved) throw new Error(`No admissible composition for ${entry.id}`);
}
if (accepted.length !== 1000 || Object.keys(generated).length !== 700) throw new Error("Catalog totals do not match the requested expansion");
const output = `import type { SectionRecipe } from "./catalogSections";\n\n/** 700 inspectable recipes authored by scripts/expand-template-catalog.ts; original 300 stay unchanged. */\nexport const EXPANDED_CATALOG_RECIPES: Record<string, SectionRecipe[]> = {\n${Object.entries(generated).map(([id, recipe]) => `  ${JSON.stringify(id)}: ${JSON.stringify(recipe)},`).join("\n")}\n};\n`;
const target = fileURLToPath(new URL("../src/storeThemes/kits/templates/catalogRecipesExpanded.ts", import.meta.url));
const check = process.argv.includes("--check");
if (check) {
  if (readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== output) throw new Error("Catalog manifest differs from deterministic generation");
} else writeFileSync(target, output);
console.log(JSON.stringify({ mode: check ? "check" : "write", preserved: 300, added: Object.keys(generated).length, total: accepted.length, attempts, distinctSectionShapes: structures.size }));
