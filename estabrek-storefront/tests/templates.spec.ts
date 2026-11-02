import { expect, test } from "@playwright/test";
import { contrast } from "../src/storeThemes/colour";
import { CATEGORIES, TEMPLATES, templatePage, templateThemeId } from "../src/storeThemes/kits";
import { TEMPLATE_THEMES } from "../src/storeThemes/kits/themes";
import type { KitNode } from "../src/storeThemes/kits";

// The ready templates (phase 11.3): many per category, none like another. Inside a category
// every template wears its own style and two templates share at most two section layouts
// (a layout = the shape of a section's elements, whatever its words, pictures and colours).

// A picture's frame (its proportions, round or not) and a block's own look are part of the layout.
const shape = (n: KitNode): string => {
  const base = (n.style?.base ?? {}) as Record<string, unknown>;
  const own = n.type === "image" ? `:${String(base.aspect ?? base.height ?? "")}${base.radius === 999 ? "o" : ""}` : ["products", "categories", "tabs", "accordion", "testimonials"].includes(n.type) ? `:${String(n.props.look ?? n.props.layout ?? "")}` : "";
  return `${n.type}${own}(${(n.children ?? []).map(shape).join(",")})`;
};
const words = (n: KitNode, out: unknown[]) => {
  for (const v of Object.values(n.props)) if (v && typeof v === "object" && "ar" in (v as object)) out.push(v);
  n.children?.forEach((c) => words(c, out));
  return out;
};

test.describe("ready templates", () => {
  test("every category has its templates, each named in three languages", () => {
    for (const c of CATEGORIES) expect(TEMPLATES.filter((x) => x.category === c.id).length, c.id).toBeGreaterThanOrEqual(10);
    expect(new Set(TEMPLATES.map((x) => x.id)).size).toBe(TEMPLATES.length);
    for (const x of TEMPLATES) for (const w of [x.name, x.blurb, x.brand]) expect(Boolean(w.ar && w.en && w.he), x.id).toBe(true);
  });

  test("inside a category no two look alike: their own style, at most two section layouts in common", () => {
    for (const c of CATEGORIES) {
      const list = TEMPLATES.filter((x) => x.category === c.id);
      expect(new Set(list.map((x) => x.style.id)).size, `${c.id} styles`).toBe(list.length);
      const bad: string[] = [];
      const layouts = list.map((x) => new Map(templatePage(x.id, "home", true)!.slice(1, -1).map((s) => [shape(s), s.name ?? s.type])));
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const same = [...layouts[i].keys()].filter((s) => layouts[j].has(s));
          if (same.length > 2) bad.push(`${list[i].id} and ${list[j].id}: ${same.map((s) => layouts[i].get(s)).join(", ")}`);
        }
      expect(bad, c.id).toEqual([]);
    }
  });

  test("every page opens big and goes on for a while, its words in three languages", () => {
    for (const x of TEMPLATES) {
      const page = templatePage(x.id, "home", true)!;
      expect(page.length, x.id).toBeGreaterThanOrEqual(8);
      for (const w of page.flatMap((s) => words(s, [])) as Array<{ ar: string; en: string; he: string }>) expect(Boolean(w.ar && w.en && w.he), `${x.id}: ${w.en}`).toBe(true);
    }
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
