import { describe, test, expect, beforeAll } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkTree } from "../lib/pageTree.js";
import { commercePageIssues } from "../lib/commercePage.js";

// The page editor's templates (estabrek-admin src/studio/templates): every section and
// page, built for every kind of store, in each language and both motion levels, must
// pass the same check a page's tree passes before it's saved. The admin builds them in
// the browser; this reads the same files.

type N = { id: string; type: string; children?: N[] };
type Template = { id: string; kind: "section" | "page"; group?: string; popup?: boolean };
type Catalog = {
  SECTION_TEMPLATES: Template[];
  PAGE_TEMPLATES: Template[];
  buildTemplate: (id: string, o: Record<string, unknown>) => N[] | null;
};

const CATALOG = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/catalog.ts");
const FAMILIES = ["fashion", "shoes", "electronics", "gaming", "beauty", "jewelry", "books", "art", "home", "food", "kids", "sports", "pets", "flowers", "music", "general"];
const LANGS = ["ar", "en", "he"] as const;

let cat: Catalog;
beforeAll(async () => {
  cat = (await import(pathToFileURL(CATALOG).href)) as Catalog;
});

const idMaker = () => {
  let n = 0;
  return (prefix: string) => `${prefix}-${(n++).toString(36)}`;
};
/** The first problem of a build, or null. */
function problem(id: string, o: Record<string, unknown>): string | null {
  const built = cat.buildTemplate(id, { ids: idMaker(), ...o });
  if (!built?.length) return `${id}: nothing built`;
  const r = checkTree({ version: 1, root: { id: "page", type: "page", props: {}, children: built } });
  return r.ok ? null : `${id} ${JSON.stringify(o)}: ${r.issues.slice(0, 3).map((i) => `${i.path} ${i.message}`).join("; ")}`;
}

describe("the editor's templates", () => {
  test("shop and cart templates hold their store parts once each, ready for /shop and /cart", () => {
    const shops = cat.PAGE_TEMPLATES.filter((t) => t.group === "shop"), carts = cat.PAGE_TEMPLATES.filter((t) => t.group === "cart");
    expect(shops.length).toBeGreaterThanOrEqual(11);
    expect(carts.length).toBeGreaterThanOrEqual(8);
    for (const [list, slug] of [[shops, "/shop"], [carts, "/cart"]] as const) for (const t of list) for (const lang of LANGS) {
      const built = cat.buildTemplate(t.id, { ids: idMaker(), fam: "fashion", lang })!;
      const root = { id: "page", type: "page", props: {}, children: built };
      expect(checkTree({ version: 1, root }).ok, t.id).toBe(true);
      expect(commercePageIssues(slug, { root } as never), `${t.id} ${lang}`).toEqual([]);
    }
  });

  test("there are over seven hundred sections and over two hundred pages", () => {
    expect(cat.SECTION_TEMPLATES.length).toBeGreaterThanOrEqual(700);
    expect(cat.PAGE_TEMPLATES.length).toBeGreaterThanOrEqual(200);
    expect(new Set([...cat.SECTION_TEMPLATES, ...cat.PAGE_TEMPLATES].map((t) => t.id)).size).toBe(cat.SECTION_TEMPLATES.length + cat.PAGE_TEMPLATES.length);
  });

  test("every section passes for every kind of store, in each language, calm and rich", () => {
    const bad: string[] = [];
    for (const t of cat.SECTION_TEMPLATES) {
      FAMILIES.forEach((fam, i) => {
        const p = problem(t.id, { fam, lang: LANGS[i % 3], motion: i % 2 ? "rich" : "calm" });
        if (p) bad.push(p);
      });
      const all = problem(t.id, { fam: "general", lang: "he", all: true, motion: "rich", pics: ["https://res.cloudinary.com/demo/image/upload/a.jpg"] });
      if (all) bad.push(all);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  }, 120_000);

  test("every page passes for every kind of store, in each language, calm and rich", () => {
    const bad: string[] = [];
    for (const t of cat.PAGE_TEMPLATES) {
      for (const [i, fam] of FAMILIES.entries()) {
        const p = problem(t.id, { fam, lang: LANGS[(i + 1) % 3], motion: i % 2 ? "calm" : "rich" });
        if (p) bad.push(p);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  }, 120_000);

  test("built with a store's pack (its edges, patterns, shapes, cards, 3D and hovers), every one still passes", () => {
    // The shop's kit choices (estabrek-storefront src/storeThemes/packs.ts KIT_OPTIONS).
    const shapes = ["rounded", "rect", "pill", "arch", "circle", "squircle", "blob", "blob2", "hexagon", "octagon", "diamond", "leaf", "drop", "flower", "star", "shield", "ticket", "bubble", "slant", "wave"];
    const patterns = ["none", "dots", "polka", "grid", "lines", "columns", "diagonal", "stripes", "checks", "hatch", "zigzag", "rings", "triangles"];
    const edges = ["none", "wave", "slant", "arc", "zigzag"];
    const finishes = ["neon", "metal", "toy", "voxel", "matte", "glass", "gold"];
    const lights = ["studio", "soft", "sunset", "neon", "night", "warm"];
    const floors = ["none", "shadow", "grid", "disc"];
    const buttonHovers = ["none", "lift", "grow", "glow", "magnetic", "pop", "pulse", "jelly", "shake"];
    const imageHovers = ["none", "zoom", "tilt", "glow", "lift"];
    const boxes = ["flat", "line", "shadow", "soft", "glass", "pop"];
    const kitAt = (i: number) => ({
      shape: shapes[i % shapes.length], pattern: patterns[i % patterns.length], edge: edges[i % edges.length], finish: finishes[i % finishes.length], lights: lights[i % lights.length],
      floor: floors[i % floors.length], buttonHover: buttonHovers[i % buttonHovers.length], imageHover: imageHovers[i % imageHovers.length], box: boxes[i % boxes.length],
    });
    const bad: string[] = [];
    [...cat.SECTION_TEMPLATES, ...cat.PAGE_TEMPLATES].forEach((t, i) => {
      for (const k of [i, i + 7]) {
        const p = problem(t.id, { fam: FAMILIES[k % FAMILIES.length], lang: LANGS[k % 3], motion: "rich", kit: kitAt(k) });
        if (p) bad.push(p);
      }
    });
    expect(bad.slice(0, 10)).toEqual([]);
  }, 120_000);

  test("a page's sections stay within a page's limits, and a popup goes over the page", () => {
    for (const t of cat.PAGE_TEMPLATES) {
      const built = cat.buildTemplate(t.id, { ids: idMaker(), fam: "fashion", lang: "ar", all: true, motion: "rich" })!;
      expect(built.length).toBeLessThanOrEqual(20);
      expect(built.every((n) => n.type === "section")).toBe(true);
    }
    for (const t of cat.SECTION_TEMPLATES) {
      const [node] = cat.buildTemplate(t.id, { ids: idMaker(), fam: "kids", lang: "en" })!;
      expect(node.type).toBe(t.popup ? "popup" : "section");
    }
  });
});
