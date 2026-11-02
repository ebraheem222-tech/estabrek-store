import { expect, test } from "@playwright/test";
import { contrast } from "../src/storeThemes/colour";
import * as A from "../src/storeThemes/dna/axes";
import { MIN_APART, ROSE, nearest, problems } from "../src/storeThemes/dna/distance";
import { KINDS } from "../src/storeThemes/dna/kinds";
import { VARIANT_KEYS, variantsOf } from "../src/storeThemes/dna/variants";
import { DESIGN_THEMES } from "../src/storeThemes/dna/theme";
import { KIND_WORDS } from "../src/storeThemes/dna/words";
import { STORE_THEMES } from "../src/storeThemes/registry";

// The kinds of store and their designs (phase 11): about a hundred, each its own, every
// variant of each far from every variant of the others and from the rose design (Estabrek's).

const LISTS: Record<string, readonly string[]> = {
  archetype: A.ARCHETYPES, type: A.TYPES, colours: A.COLOURS, shape: A.SHAPES, surface: A.SURFACES, imagery: A.IMAGERY, icons: A.ICONS,
  motion: A.MOTIONS, motif: A.MOTIFS, card: A.CARDS, header: A.HEADERS, footer: A.FOOTERS, voice: A.VOICES,
};

test.describe("store designs", () => {
  test("about a hundred kinds of store, every sector, named in three languages, every value a real one", () => {
    expect(KINDS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(KINDS.map((k) => k.sector))).toEqual(new Set(A.SECTORS));
    for (const k of KINDS) {
      for (const [axis, list] of Object.entries(LISTS)) expect(list, `${k.id} ${axis}`).toContain((k.dna as Record<string, unknown>)[axis]);
      expect(A.ARCHETYPES, `${k.id} other layout`).toContain(k.alt.archetype);
      expect(A.IMAGERY, `${k.id} other pictures`).toContain(k.alt.imagery);
      for (const c of Object.values(k.dna.seed).slice(1)) expect(c, k.id).toMatch(/^#[0-9a-f]{6}$/i);
      for (const words of [k.name, k.signature.name]) for (const l of ["ar", "en", "he"] as const) expect(words[l].trim().length, `${k.id} ${l}`).toBeGreaterThan(1);
    }
  });

  test("no two designs alike, none near the rose design, every signature its own", () => {
    expect(problems(KINDS)).toEqual([]);
    expect(Math.min(...nearest(KINDS).map((x) => x.apart))).toBeGreaterThanOrEqual(MIN_APART);
    // Every value of an axis is used somewhere, so the designs spread over all of them.
    for (const axis of ["archetype", "type", "shape", "surface", "imagery", "icons", "motion", "card", "header", "footer", "voice"] as const)
      expect(new Set(KINDS.map((k) => k.dna[axis])).size, axis).toBe(LISTS[axis].length);
    expect(ROSE.shape).toBe("arch");
  });

  test("every design is four themes a store can pick, with its words, none named like a classic theme", () => {
    expect(DESIGN_THEMES.length).toBe(KINDS.length * 4);
    for (const k of KINDS) expect(KIND_WORDS[k.id], `${k.id}: words`).toBeTruthy();
    const classic = new Set(STORE_THEMES.filter((t) => t.classic).map((t) => t.id));
    for (const t of DESIGN_THEMES) {
      expect(classic.has(t.id), t.id).toBe(false);
      expect(t.design?.kind, t.id).toBeTruthy();
      expect(t.copy.title.ar.length, t.id).toBeGreaterThan(2);
    }
    // A design's variant themes share its type and drawings, and differ in colours or layout.
    const [first, soft, bold, layout] = DESIGN_THEMES.filter((t) => t.design?.kind === "mobile-phones");
    expect([first.id, soft.id, bold.id, layout.id]).toEqual(["mobile-phones", "mobile-phones-soft", "mobile-phones-bold", "mobile-phones-layout"]);
    expect(new Set([first, soft, bold, layout].map((t) => t.fonts.display.join()))).toHaveProperty("size", 1);
    expect(soft.palettes.light!.bg).not.toBe(first.palettes.light!.bg);
    expect(layout.hero).not.toBe(first.hero);
    expect(Object.keys(first.palettes)).toEqual(expect.arrayContaining(["light", "dark"]));
  });

  test("every design has its variants, each readable", () => {
    const ids = new Set<string>();
    for (const k of KINDS) {
      const vs = variantsOf(k);
      expect(vs.map((v) => v.key)).toEqual([...VARIANT_KEYS]);
      for (const v of vs) {
        expect(ids.has(v.id), v.id).toBe(false);
        ids.add(v.id);
        // Words on the page and on what stands out read (the theme pushes them further when it's built).
        expect(contrast(v.dna.seed.ink, v.dna.seed.bg), `${v.id} words`).toBeGreaterThanOrEqual(4.5);
      }
      // The other mode is the other mode; the other layout keeps the colours.
      expect(vs[1].dna.seed.mode).not.toBe(k.dna.seed.mode);
      expect(vs[4].dna.seed).toEqual(k.dna.seed);
      expect([vs[4].dna.archetype, vs[4].dna.imagery]).toEqual([k.alt.archetype, k.alt.imagery]);
    }
    expect(ids.size).toBe(KINDS.length * VARIANT_KEYS.length);
  });
});
