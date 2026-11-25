import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../../../api/pages.api";
import { PAGE_TEMPLATES, PREMIUM_THEMES, SECTION_TEMPLATES, buildTemplate, themeKitOf } from "../catalog";
import { RECIPES } from "../sections";
import { FAMILIES } from "../words";
import { DNA_KINDS, DNA_RECIPES, LOOKS, MOODS, MOOD_NAMES } from ".";
import { HERO_LAYOUTS, HERO_PICKS } from "./heroes";
import { THEMES, THEME_PARTS, slotOf } from "./themes";

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

  it("makes every kind in several layouts, each layout in three looks or more, nothing picked twice", () => {
    for (const [, kind, layouts, picks] of DNA_KINDS) {
      expect(layouts.length, kind).toBeGreaterThanOrEqual(4);
      expect(new Set(layouts.map((l) => l.key)).size, kind).toBe(layouts.length);
      for (const l of layouts) {
        expect(full(l.name), `${kind} ${l.key}`).toBe(true);
        expect(picks[l.key]?.length ?? 0, `${kind} ${l.key}`).toBeGreaterThanOrEqual(3);
        expect(new Set(picks[l.key]).size, `${kind} ${l.key}`).toBe(picks[l.key].length);
      }
      // No pick for a layout that isn't there.
      for (const k of Object.keys(picks)) expect(layouts.some((l) => l.key === k), `${kind} ${k}`).toBe(true);
      expect(DNA_RECIPES.filter((r) => r.key.startsWith(`dna-${kind}-`)).length, kind).toBeGreaterThanOrEqual(16);
    }
  });

  it("joins the library with its own keys and names, and the gallery knows each one's look", () => {
    const keys = RECIPES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    // Within a kind no two designs share a name (the gallery lists a kind at a time).
    for (const [cat] of DNA_KINDS) for (const lang of ["ar", "en", "he"] as const) {
      const names = DNA_RECIPES.filter((r) => r.cat === cat).map((r) => r.name[lang]);
      expect(new Set(names).size, `${cat} ${lang}`).toBe(names.length);
    }
    const dna = SECTION_TEMPLATES.filter((t) => t.look);
    expect(new Set(dna.map((t) => t.id.split(":")[1])).size).toBe(DNA_RECIPES.length);
    for (const t of dna) expect(t.mood && t.layout, t.id).toBeTruthy();
  });

  it("builds every design for every kind of store; only openings hold the big heading, and no two come out the same", () => {
    const seen = new Map<string, string>();
    for (const r of DNA_RECIPES) {
      for (const [i, fam] of FAMILIES.entries()) {
        const built = buildTemplate(`s:${r.key}:${r.skins[0]}`, { ids: ids(), fam, lang: (["ar", "en", "he"] as const)[i % 3], motion: i % 2 ? "rich" : "calm" });
        expect(built?.length, `${r.key} ${fam}`).toBe(1);
      }
      const built = buildTemplate(`s:${r.key}:${r.skins[0]}`, { ids: ids(), fam: "fashion", lang: "en" })!;
      // An opening holds the page's one big heading; the other kinds only headings under it.
      let h1 = 0, headings = 0;
      walk(built, (n) => { if (n.type === "heading") { headings++; if ((n.props as { level?: number }).level === 1) h1++; } });
      // The openings hold the page's one big heading: the DNA's and the premium ones (dna/wow.ts).
      expect(h1, r.key).toBe(r.cat === "hero" || r.cat === "wowopen" ? 1 : 0);
      expect(headings, r.key).toBeGreaterThan(0);
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

describe("the whole premium themes (plan 3.9b)", () => {
  it("are one for each look, each named and told in three languages", () => {
    expect(THEMES.length).toBe(LOOKS.length);
    expect(new Set(THEMES.map((t) => t.look)).size).toBe(LOOKS.length);
    expect(new Set(THEMES.map((t) => t.key)).size).toBe(THEMES.length);
    for (const lang of ["ar", "en", "he"] as const) expect(new Set(THEMES.map((t) => t.name[lang])).size, lang).toBe(THEMES.length);
    for (const t of THEMES) {
      expect(full(t.name) && full(t.line), t.key).toBe(true);
      // Nothing in a theme's words names the platform or a store: they are the store's own.
      expect(JSON.stringify([t.name, t.line]), t.key).not.toMatch(/estabrek|استبرق/i);
    }
  });

  it("build every page from layouts worn in the theme's look, each in one of the look's colours", () => {
    for (const t of THEMES) for (const part of THEME_PARTS) {
      const slots = t.pages[part];
      expect(slots.length, `${t.key} ${part}`).toBeGreaterThanOrEqual(part === "home" ? 7 : 4);
      // No section twice on a page.
      expect(new Set(slots.map((s) => s.split("@")[0])).size, `${t.key} ${part}`).toBe(slots.length);
      for (const s of slots) expect(slotOf(t, s).problem, `${t.key} ${part}: ${s}`).toBeUndefined();
      // A home opens with an opening (the big heading); about and contact with their own title.
      const first = slotOf(t, slots[0]);
      expect(part === "home" ? ["wowopen", "hero"].includes(first.kind) : first.top, `${t.key} ${part}`).toBe(true);
      // Every home has something premium past its opening: a story that moves and a piece that sells in 3D or as a game.
      if (part === "home") for (const kind of ["wowstory", "wowsell"]) expect(slots.some((s) => s.startsWith(`${kind} `)), `${t.key}: ${kind}`).toBe(true);
    }
  });

  it("has a header and a footer that are the look's own designs in the gallery", () => {
    for (const kit of PREMIUM_THEMES) {
      expect(kit.parts.map((p) => p.part)).toEqual(["home", "about", "contact", "header", "footer"]);
      for (const p of kit.parts) {
        const tpl = [...PAGE_TEMPLATES, ...SECTION_TEMPLATES].find((x) => x.id === p.id);
        expect(tpl, `${kit.theme.key} ${p.part}: ${p.id}`).toBeTruthy();
        expect(tpl!.look, p.id).toBe(kit.theme.look);
        expect(themeKitOf(p.id)?.theme.key, p.id).toBe(kit.theme.key);
      }
    }
  });

  it("builds every page for every kind of store, with one big heading and nothing the same twice", () => {
    const seen = new Map<string, string>();
    for (const kit of PREMIUM_THEMES) for (const p of kit.parts.slice(0, 3)) {
      for (const [i, fam] of FAMILIES.entries()) {
        const built = buildTemplate(p.id, { ids: ids(), fam, lang: (["ar", "en", "he"] as const)[i % 3], motion: i % 2 ? "rich" : "calm" });
        expect(built?.length, `${p.id} ${fam}`).toBe(kit.theme.pages[p.part as "home"].length);
      }
      const built = buildTemplate(p.id, { ids: ids(), fam: "fashion", lang: "en" })!;
      // Each section spreads its ground over the whole screen on the store (the page drops its side margins).
      for (const sec of built) expect((sec.props as { bleed?: boolean }).bleed, `${p.id} ${sec.name}`).toBe(true);
      let h1 = 0;
      walk(built, (n) => { if (n.type === "heading" && (n.props as { level?: number }).level === 1) h1++; });
      expect(h1, p.id).toBe(1);
      const ids_ = new Set<string>();
      walk(built, (n) => { expect(ids_.has(n.id), `${p.id}: ${n.id}`).toBe(false); ids_.add(n.id); });
      const print = JSON.stringify(built);
      expect(seen.get(print), `${p.id} looks like ${seen.get(print)}`).toBeUndefined();
      seen.set(print, p.id);
    }
  });

  it("doesn't say twice what the footer already holds: no sign-up over a footer with one, no promises over a footer of promises", () => {
    for (const t of THEMES) for (const part of THEME_PARTS) {
      const kinds = t.pages[part].map((s) => s.split(" ")[0]);
      if (t.footer === "news") expect(kinds.includes("news") || t.pages[part].includes("drops countdown"), `${t.key} ${part}`).toBe(false);
      if (t.footer === "perks") expect(kinds.includes("perks"), `${t.key} ${part}`).toBe(false);
      // At most one sign-up on a page.
      expect(t.pages[part].filter((s) => s.startsWith("news ") || s === "drops countdown").length, `${t.key} ${part}`).toBeLessThanOrEqual(1);
    }
  });

  it("opens no two themes' homes the same way", () => {
    const openings = THEMES.map((t) => `${t.pages.home[0].split("@")[0]} ${t.look}`);
    expect(new Set(openings).size).toBe(THEMES.length);
    // And no two themes are the same homes in another look: their sections differ.
    const homes = THEMES.map((t) => t.pages.home.map((s) => s.split("@")[0]).join("|"));
    expect(new Set(homes).size).toBe(THEMES.length);
  });
});
