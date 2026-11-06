import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { CATEGORIES, TEMPLATES, templatePage, templateThemeId } from "../src/storeThemes/kits";
import { CATALOG_RECIPES } from "../src/storeThemes/kits/templates/catalogRecipes";
import { BASE_CATALOG_RECIPES } from "../src/storeThemes/kits/templates/catalogRecipes";
import { EXPANDED_CATALOG_RECIPES } from "../src/storeThemes/kits/templates/catalogRecipesExpanded";
import { CATALOG_EDITIONS } from "../src/storeThemes/kits/templates/catalogEditions";
import { TEMPLATE_THEMES } from "../src/storeThemes/kits/themes";
import { contrast } from "../src/storeThemes/colour";
import { KINDS } from "../src/storeThemes/dna/kinds";
import { flattenCatalog, pageStructure, sharedStructure, structuralShape } from "./catalog-structure";

test("the commercial catalog preserves twenty categories of fifty homes and adds three bespoke designs", () => {
  expect(CATEGORIES).toHaveLength(20);
  expect(TEMPLATES).toHaveLength(2000);
  expect(Object.keys(CATALOG_RECIPES)).toHaveLength(990);
  expect(new Set(TEMPLATES.map((x) => x.id)).size).toBe(2000);
  const extra = ["electronics-foundry", "art-kinetic", "home-lantern"];
  for (const category of CATEGORIES) expect(TEMPLATES.filter((x) => !x.source && !x.edition && x.category === category.id && !extra.includes(x.id)), category.id).toHaveLength(50);
  const supportedKinds = new Set(KINDS.map((x) => x.id));
  for (const category of CATEGORIES) for (const kind of category.kinds) expect(supportedKinds.has(kind), `${category.id}: ${kind}`).toBe(true);
  const originalShoeIds = ["street", "race", "atelier", "kids", "quiet", "retro", "night", "edit", "trail", "lab"];
  const originalCategories = CATEGORIES.filter((x) => x.id !== "shoes").map((x) => x.id);
  const originalCompositions = ["street", "runner", "atelier", "playground", "quiet", "retro", "night", "edit", "trail", "lab", "gallery", "market", "folio", "panorama", "workshop"];
  const ids = new Set(TEMPLATES.map((x) => x.id));
  for (const id of originalShoeIds.map((x) => `shoes-${x}`)) expect(ids.has(id), id).toBe(true);
  for (const category of originalCategories) for (const composition of originalCompositions) expect(ids.has(`${category}-${composition}`)).toBe(true);
  for (const composition of originalCompositions.slice(10)) expect(ids.has(`shoes-${composition}`)).toBe(true);
});

test("the expansion preserves old recipes and gives each new visual edition its own opening", () => {
  expect(Object.keys(BASE_CATALOG_RECIPES)).toHaveLength(290);
  expect(Object.keys(EXPANDED_CATALOG_RECIPES)).toHaveLength(700);
  for (const [id, recipe] of Object.entries(BASE_CATALOG_RECIPES)) {
    expect(EXPANDED_CATALOG_RECIPES).not.toHaveProperty(id);
    expect(CATALOG_RECIPES[id]).toEqual(recipe);
  }
  expect(CATALOG_EDITIONS).toHaveLength(35);
  for (const demo of [true, false]) {
    const openings = CATALOG_EDITIONS.map((edition) => {
      const page = templatePage(`fashion-${edition.id}`, "home", demo)!;
      return structuralShape(page[demo ? 1 : 0]);
    });
    expect(new Set(openings).size).toBe(35);
  }
});

test("new generated homes never repeat a recipe or an identical complete section", () => {
  const repeated: string[] = [];
  for (const [id, recipe] of Object.entries(EXPANDED_CATALOG_RECIPES)) {
    if (new Set(recipe).size !== recipe.length) repeated.push(`${id}: repeated recipe`);
    for (const demo of [true, false]) {
      const page = templatePage(id, "home", demo)!;
      const sections = demo ? page.slice(1, -1) : page;
      const content = sections.map((section) => JSON.stringify(section, (key, value) => key === "id" ? undefined : value));
      if (new Set(content).size !== content.length) repeated.push(`${id}/${demo ? "preview" : "live"}: repeated content`);
    }
  }
  expect(repeated).toEqual([]);
});

for (const demo of [true, false]) {
  test(`all 1003 ${demo ? "preview" : "installed"} homes have globally unique composition, even with sections reordered`, () => {
    const seen = new Map<string, string>();
    const coarseSeen = new Map<string, string>();
    const duplicates: string[] = [];
    const nearDuplicates: string[] = [];
    const pages = TEMPLATES.filter(template => !template.source && !template.edition).map((tpl) => {
      const sections = templatePage(tpl.id, "home", demo)!;
      const home = demo ? sections.slice(1, -1) : sections;
      expect(home.length, tpl.id).toBeGreaterThanOrEqual(6);
      const shape = pageStructure(home);
      const skeleton = pageStructure(home, true);
      if (seen.has(shape)) duplicates.push(`${tpl.id} = ${seen.get(shape)}`);
      if (coarseSeen.has(skeleton)) duplicates.push(`${tpl.id} has the same primitive tree as ${coarseSeen.get(skeleton)}`);
      seen.set(shape, tpl.id);
      coarseSeen.set(skeleton, tpl.id);
      return { id: tpl.id, shapes: home.map((s) => structuralShape(s)) };
    });
    for (let i = 0; i < pages.length; i++) for (let j = i + 1; j < pages.length; j++) {
      const overlap = sharedStructure(pages[i].shapes, pages[j].shapes);
      if (overlap > 2 / 3) nearDuplicates.push(`${pages[i].id} / ${pages[j].id}: ${Math.round(overlap * 100)}% shared sections`);
    }
    expect(duplicates).toEqual([]);
    expect(nearDuplicates).toEqual([]);
    expect(seen.size).toBe(1003);
  });
}

test("layout comparison ignores all editorial decoration and rejects reorder-only variants", () => {
  const page = templatePage("fashion-quiet", "home", false)!;
  const changed = JSON.parse(JSON.stringify(page));
  const alter = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, v] of Object.entries(value)) {
      if (["id", "name", "src", "color", "bg", "ar", "en", "he"].includes(key)) (value as Record<string, unknown>)[key] = "different";
      else alter(v);
    }
  };
  alter(changed);
  expect(pageStructure(changed.reverse())).toBe(pageStructure(page));
  expect(pageStructure(page.slice(1))).not.toBe(pageStructure(page));
});

test("every design carries multilingual copy, legible palettes and valid local artwork", () => {
  const issues: string[] = [];
  const artwork = new Set<string>();
  for (const tpl of TEMPLATES) {
    // Proper brand names can keep their Latin spelling in every locale (e.g. LAB/04).
    expect(Boolean(tpl.brand.ar && tpl.brand.en && tpl.brand.he), tpl.id).toBe(true);
    for (const words of [tpl.name, tpl.blurb]) {
      expect(words.ar, tpl.id).toMatch(/[\u0600-\u06ff]/);
      expect(words.en, tpl.id).toMatch(/[a-z]/i);
      expect(words.he, tpl.id).toMatch(/[\u0590-\u05ff]/);
    }
    const theme = TEMPLATE_THEMES.find((x) => x.id === templateThemeId(tpl.id))!;
    expect(theme.family).toBe(CATEGORIES.find((x) => x.id === tpl.category)!.family);
    for (const palette of Object.values(theme.palettes)) {
      expect(contrast(palette!.ink, palette!.bg), `${tpl.id} text`).toBeGreaterThanOrEqual(7);
      expect(contrast(palette!.strong, palette!.bg), `${tpl.id} link`).toBeGreaterThanOrEqual(4.5);
    }
    const nodes = flattenCatalog(templatePage(tpl.id, "home", true)!);
    for (const node of nodes) {
      const text = node.props.text as { ar?: string; en?: string; he?: string } | undefined;
      if (text && typeof text === "object" && !(text.ar && text.en && text.he)) issues.push(`${tpl.id}/${node.id}: missing translation`);
      for (const src of [node.props.src, node.props.poster]) {
        if (typeof src !== "string" || !src.startsWith("/templates/")) continue;
        artwork.add(src);
      }
    }
  }
  // Artwork is shared by designs; validate every referenced file once at catalog scale.
  for (const src of artwork) {
    const file = path.join(process.cwd(), "public", src);
    if (!existsSync(file)) issues.push(`${src}: missing file`);
    else if (src.endsWith(".svg")) { if (!readFileSync(file, "utf8").includes("<svg")) issues.push(`${src}: invalid SVG`); }
    else {
      const data = readFileSync(file);
      const valid = data.subarray(0, 3).equals(Buffer.from([255, 216, 255])) || data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP" || data.toString("ascii", 4, 8) === "ftyp" && data.toString("ascii", 8, 40).includes("avif");
      if (!valid && !(src.endsWith(".mp4") && data.toString("ascii", 4, 8) === "ftyp")) issues.push(`${src}: invalid image or video signature`);
    }
  }
  expect(artwork.size).toBeGreaterThanOrEqual(160);
  expect(issues).toEqual([]);
});

test("new catalog compositions install live inventory without sample prices or testimonials", () => {
  const issues: string[] = [];
  for (const tpl of TEMPLATES.filter((x) => x.id in CATALOG_RECIPES)) {
    const nodes = flattenCatalog(templatePage(tpl.id, "home", false)!);
    expect(nodes.some((x) => x.type === "products"), tpl.id).toBe(true);
    expect(nodes.some((x) => x.type === "categories"), tpl.id).toBe(true);
    expect(nodes.filter((x) => ["testimonials", "countdown"].includes(x.type)), tpl.id).toEqual([]);
    for (const node of nodes) {
      const text = node.props.text as { en?: string } | undefined;
      if (["120", "180", "240", "95", "160", "210"].includes(text?.en ?? "")) issues.push(`${tpl.id}/${node.id}: sample price`);
      if (node.type === "products" && !["new", "best", "ids", "category"].includes(String(node.props.source))) issues.push(`${tpl.id}/${node.id}: invalid inventory source`);
    }
  }
  expect(issues).toEqual([]);
});
