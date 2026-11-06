import { expect, test } from "@playwright/test";
import { contrast } from "../src/storeThemes/colour";
import { CATEGORIES, TEMPLATES, templatePage, templateThemeId } from "../src/storeThemes/kits";
import { TEMPLATE_THEMES } from "../src/storeThemes/kits/themes";
import type { KitNode } from "../src/storeThemes/kits";
import { pageStructure, sharedStructure, structuralShape } from "./catalog-structure";

// Whole-page uniqueness is global and independent of section order, copy and decoration.
// Shared primitives are expected; high overlap of complete sections is still rejected.
const words = (n: KitNode, out: unknown[]) => {
  for (const v of Object.values(n.props)) if (v && typeof v === "object" && "ar" in (v as object)) out.push(v);
  n.children?.forEach((c) => words(c, out));
  return out;
};

test.describe("ready templates", () => {
  test("installed pages use the merchant catalog in bento, comparisons and category lists", () => {
    const flatten = (nodes: KitNode[]): KitNode[] => nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
    for (const x of TEMPLATES.filter((t) => t.category !== "shoes")) {
      const sections = templatePage(x.id, "home", false)!;
      const nodes = flatten(sections);
      const demoPrice = nodes.filter((n) => n.type === "text" && ["120", "180", "240", "95", "160", "210"].includes(String((n.props.text as { en?: string } | undefined)?.en)));
      expect(demoPrice, x.id).toEqual([]);
      for (const section of sections.filter((n) => n.name === "Compare")) expect(flatten([section]).some((n) => n.type === "products"), x.id).toBe(true);
      if (x.id.endsWith("-quiet")) expect(nodes.some((n) => n.type === "categories"), x.id).toBe(true);
      if (x.id.endsWith("-street")) {
        const bento = sections.find((n) => n.name === "Bento")!;
        const live = flatten([bento]).filter((n) => n.type === "products");
        expect(live).toHaveLength(1);
        expect(live[0].props.limit).toBe(2);
      }
    }
  });

  test("template themes stay available for later customization", async ({ request }) => {
    const response = await request.get("/api/store-themes");
    expect(response.ok()).toBe(true);
    const { themes } = await response.json();
    const ids = new Set(themes.map((t: { id: string }) => t.id));
    for (const x of TEMPLATES) expect(ids.has(templateThemeId(x.id)), x.id).toBe(true);
  });

  test("independent stores can choose fifty full templates for each of twenty industries", () => {
    const categories = ["shoes", "fashion", "beauty", "perfume", "jewelry", "electronics", "gaming", "home", "coffee", "food", "kids", "books", "art", "sports", "pets", "flowers", "music", "stationery", "kitchen", "outdoor"];
    expect(CATEGORIES.map((c) => c.id).sort()).toEqual([...categories].sort());
    expect(TEMPLATES).toHaveLength(2000);
    const extras = ["electronics-foundry", "art-kinetic", "home-lantern"];
    for (const id of categories) expect(TEMPLATES.filter((x) => !x.source && !x.edition && x.category === id && !extras.includes(x.id)), id).toHaveLength(50);
    for (const tpl of TEMPLATES) {
      const family = CATEGORIES.find((c) => c.id === tpl.category)!.family;
      expect(TEMPLATE_THEMES.find((th) => th.id === templateThemeId(tpl.id))?.family, tpl.id).toBe(family);
    }
  });

  test("every category has its templates, each named in three languages", () => {
    for (const c of CATEGORIES) expect(TEMPLATES.filter((x) => x.category === c.id).length, c.id).toBeGreaterThanOrEqual(10);
    expect(new Set(TEMPLATES.map((x) => x.id)).size).toBe(TEMPLATES.length);
    for (const x of TEMPLATES) for (const w of [x.name, x.blurb, x.brand]) expect(Boolean(w.ar && w.en && w.he), x.id).toBe(true);
  });

  test("all templates have distinct compositions globally, with no high-overlap pages", () => {
    for (const c of CATEGORIES) {
      const list = TEMPLATES.filter((x) => x.category === c.id);
      expect(new Set(list.map((x) => x.style.id)).size, `${c.id} styles`).toBe(list.length);
    }
    for (const demo of [true, false]) {
      const homes = TEMPLATES.map((tpl) => {
        const page = templatePage(tpl.id, "home", demo)!;
        return { id: tpl.id, nodes: demo ? page.slice(1, -1) : page };
      });
      expect(new Set(homes.map((x) => pageStructure(x.nodes))).size).toBe(TEMPLATES.length);
      // Even omitting proportions/columns/layout props must leave distinct primitive trees.
      expect(new Set(homes.map((x) => pageStructure(x.nodes, true))).size).toBe(TEMPLATES.length);
      const layouts = homes.map((x) => x.nodes.map((n) => structuralShape(n)));
      const bad: string[] = [];
      for (let i = 0; i < homes.length; i++) for (let j = i + 1; j < homes.length; j++) {
        const overlap = sharedStructure(layouts[i], layouts[j]);
        if (overlap > 2 / 3) bad.push(`${homes[i].id} / ${homes[j].id}: ${Math.round(overlap * 100)}% shared sections`);
      }
      expect(bad).toEqual([]);
    }
  });

  test("every page opens big and goes on for a while, its words in three languages", () => {
    const missing: string[] = [];
    for (const x of TEMPLATES) {
      const page = templatePage(x.id, "home", true)!;
      if (x.source) {
        const flatten = (nodes: KitNode[]): KitNode[] => nodes.flatMap(node => [node, ...flatten(node.children ?? [])]);
        // Folio and Split Index contain entire distinct page layouts inside a native deck.
        expect(flatten(page).length, x.id).toBeGreaterThan(35);
        expect(page.length, x.id).toBeGreaterThanOrEqual(3);
      } else expect(page.length, x.id).toBeGreaterThanOrEqual(8);
      for (const w of page.flatMap((s) => words(s, [])) as Array<{ ar: string; en: string; he: string }>) if (!(w.ar && w.en && w.he)) missing.push(`${x.id}: ${w.en}`);
    }
    expect(missing).toEqual([]);
  });

  test("every template's theme reads in both modes", () => {
    for (const x of TEMPLATES) {
      const theme = TEMPLATE_THEMES.find((th) => th.id === templateThemeId(x.id))!;
      for (const p of Object.values(theme.palettes)) {
        expect(contrast(p!.ink, p!.bg), `${x.id} words`).toBeGreaterThanOrEqual(7);
        expect(contrast(p!.strong, p!.bg), `${x.id} links`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
