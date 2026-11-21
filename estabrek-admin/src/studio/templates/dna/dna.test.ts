import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../../../api/pages.api";
import { SECTION_TEMPLATES, buildTemplate } from "../catalog";
import { RECIPES } from "../sections";
import { FAMILIES } from "../words";
import { DNA_RECIPES, LOOKS, MOODS, MOOD_NAMES } from ".";
import { HERO_LAYOUTS, HERO_PICKS } from "./heroes";

// The section DNA (studio/templates/dna): looks × layouts, picked by hand. The catalog's own tests
// (templates.test.ts) and the backend's tree check (templates.unit.spec.ts) take its designs like any other;
// the shop's tests/section-dna.spec.ts draws them on a store and checks they read and fit.

const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${n++}`;
};
const walk = (nodes: PageTreeNode[], f: (n: PageTreeNode) => void) => nodes.forEach((n) => (f(n), n.children && walk(n.children, f)));
const full = (w: { ar: string; en: string; he: string }) => Boolean(w.ar.trim() && w.en.trim() && w.he.trim());

describe("the section DNA", () => {
  it("has its looks, each whole, named in three languages, every mood with several", () => {
    expect(LOOKS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(LOOKS.map((l) => l.key)).size).toBe(LOOKS.length);
    for (const lang of ["ar", "en", "he"] as const) expect(new Set(LOOKS.map((l) => l.name[lang])).size, lang).toBe(LOOKS.length);
    for (const l of LOOKS) {
      expect(full(l.name), l.key).toBe(true);
      expect(MOODS, l.key).toContain(l.mood);
      expect(l.skins.length, l.key).toBeGreaterThan(0);
    }
    for (const m of MOODS) {
      expect(full(MOOD_NAMES[m])).toBe(true);
      expect(LOOKS.filter((l) => l.mood === m).length, m).toBeGreaterThanOrEqual(3);
    }
  });

  it("picks over a hundred openings: every layout in five looks or more, every look in two layouts or more", () => {
    const heroes = DNA_RECIPES.filter((r) => r.cat === "hero");
    expect(heroes.length).toBeGreaterThanOrEqual(100);
    for (const l of HERO_LAYOUTS) expect(HERO_PICKS[l.key]?.length ?? 0, l.key).toBeGreaterThanOrEqual(5);
    for (const l of LOOKS) expect(heroes.filter((r) => r.dna?.look === l.key).length, l.key).toBeGreaterThanOrEqual(2);
    // No layout picked twice in the same look, and every pick names a real look.
    for (const [layout, looks] of Object.entries(HERO_PICKS)) {
      expect(new Set(looks).size, layout).toBe(looks.length);
      for (const k of looks) expect(LOOKS.some((l) => l.key === k), `${layout}: ${k}`).toBe(true);
    }
  });

  it("joins the library with its own keys and names, and the gallery knows each one's look", () => {
    const keys = RECIPES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const lang of ["ar", "en", "he"] as const) expect(new Set(DNA_RECIPES.map((r) => r.name[lang])).size, lang).toBe(DNA_RECIPES.length);
    const dna = SECTION_TEMPLATES.filter((t) => t.look);
    expect(new Set(dna.map((t) => t.id.split(":")[1])).size).toBe(DNA_RECIPES.length);
    for (const t of dna) expect(t.mood && t.layout, t.id).toBeTruthy();
  });

  it("builds every design for every kind of store; each has its big heading, and no two come out the same", () => {
    const seen = new Map<string, string>();
    for (const r of DNA_RECIPES) {
      for (const [i, fam] of FAMILIES.entries()) {
        const built = buildTemplate(`s:${r.key}:${r.skins[0]}`, { ids: ids(), fam, lang: (["ar", "en", "he"] as const)[i % 3], motion: i % 2 ? "rich" : "calm" });
        expect(built?.length, `${r.key} ${fam}`).toBe(1);
      }
      const built = buildTemplate(`s:${r.key}:${r.skins[0]}`, { ids: ids(), fam: "fashion", lang: "en" })!;
      let h1 = 0;
      walk(built, (n) => { if (n.type === "heading" && (n.props as { level?: number }).level === 1) h1++; });
      expect(h1, r.key).toBe(1);
      const print = JSON.stringify(built);
      expect(seen.get(print), `${r.key} looks like ${seen.get(print)}`).toBeUndefined();
      seen.set(print, r.key);
    }
  });

  it("a look changes how a layout looks, not what it says", () => {
    const title = (key: string) => {
      let t = "";
      walk(buildTemplate(`s:${key}:${DNA_RECIPES.find((r) => r.key === key)!.skins[0]}`, { ids: ids(), fam: "books", lang: "en" })!, (n) => {
        if (n.type === "heading" && (n.props as { level?: number }).level === 1) t = (n.props as { text: { en: string } }).text.en;
      });
      return t;
    };
    const titles = HERO_PICKS.split.map((look) => title(`dna-hero-split-${look}`));
    expect(new Set(titles).size).toBe(1);
    expect(titles[0].length).toBeGreaterThan(3);
  });
});
