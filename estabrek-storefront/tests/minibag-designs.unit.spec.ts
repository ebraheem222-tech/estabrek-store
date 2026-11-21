import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MINI_BAG_DESIGNS, MINI_BAG_EXTRAS, MINI_BAG_FAMILIES, MINI_BAG_FAMILY_NAMES, MINI_BAG_FONTS, MINI_BAG_FOOTS, MINI_BAG_HEADS,
  MINI_BAG_LINES, MINI_BAG_LINES_NAMES, MINI_BAG_MOODS, MINI_BAG_MOOD_NAMES, MINI_BAG_MOTIONS, MINI_BAG_PHOTOS, MINI_BAG_PLACES,
  MINI_BAG_PLACE_NAMES, MINI_BAG_ROUNDS, MINI_BAG_TONES, MINI_BAG_TONE_NAMES, familyOf, miniBagAttrs, miniBagById, miniBagsFor,
} from "../src/lib/miniBagDesigns";
import { INDUSTRIES } from "../src/lib/storeIdentity";
import { normalizeStorefrontSettings } from "../src/lib/storefrontSettings";
import { toneAr } from "../src/lib/words";

// The small bag's designs (lib/miniBagDesigns.ts, app/minibag-designs.css).
const css = readFileSync(path.resolve(process.cwd(), "src/app/minibag-designs.css"), "utf8");

test("a hundred designs, each its own, named in three languages", () => {
  expect(MINI_BAG_DESIGNS).toHaveLength(100);
  expect(new Set(MINI_BAG_DESIGNS.map((x) => x.id)).size).toBe(100);
  for (const lang of ["ar", "en", "he"] as const) {
    const names = MINI_BAG_DESIGNS.map((x) => x.name[lang].trim());
    expect(names.every(Boolean), lang).toBe(true);
    expect(new Set(names).size, `${lang} names repeat`).toBe(100);
  }
  // No two designs are the same set of choices.
  const looks = MINI_BAG_DESIGNS.map((x) => [x.place, x.lines, x.photo, x.head, x.foot, x.tone, x.motion, x.font, x.round].join(" "));
  expect(new Set(looks).size).toBe(100);
  for (const x of MINI_BAG_DESIGNS) expect(x.id).toMatch(/^[a-z][a-z-]*$/);
});

test("every choice is a known one, and every family and mood has its share", () => {
  for (const x of MINI_BAG_DESIGNS) {
    expect(MINI_BAG_PLACES, x.id).toContain(x.place);
    expect(MINI_BAG_LINES, x.id).toContain(x.lines);
    expect(MINI_BAG_PHOTOS, x.id).toContain(x.photo);
    expect(MINI_BAG_HEADS, x.id).toContain(x.head);
    expect(MINI_BAG_FOOTS, x.id).toContain(x.foot);
    expect(MINI_BAG_TONES, x.id).toContain(x.tone);
    expect(MINI_BAG_MOTIONS, x.id).toContain(x.motion);
    expect(MINI_BAG_FONTS, x.id).toContain(x.font);
    expect(MINI_BAG_ROUNDS, x.id).toContain(x.round);
    expect(MINI_BAG_MOODS, x.id).toContain(x.mood);
    expect(x.family, x.id).toBe(familyOf(x.place));
    for (const e of x.extras) expect(MINI_BAG_EXTRAS, x.id).toContain(e);
    expect(new Set(x.extras).size, x.id).toBe(x.extras.length);
    expect(x.fits.length, x.id).toBeGreaterThan(0);
    for (const f of x.fits) expect(INDUSTRIES as readonly string[], `${x.id}: ${f}`).toContain(f);
  }
  for (const f of MINI_BAG_FAMILIES) expect(MINI_BAG_DESIGNS.filter((x) => x.family === f).length, f).toBeGreaterThanOrEqual(10);
  for (const m of MINI_BAG_MOODS) expect(MINI_BAG_DESIGNS.filter((x) => x.mood === m).length, m).toBeGreaterThanOrEqual(10);
  // Every kind of store gets some designs made for it.
  for (const industry of INDUSTRIES) expect(MINI_BAG_DESIGNS.some((x) => x.fits.includes(industry)), industry).toBe(true);
  // Every value is used by some design, and every value has its words for the admin.
  const used = (key: keyof (typeof MINI_BAG_DESIGNS)[number], all: readonly unknown[]) => all.every((v) => MINI_BAG_DESIGNS.some((x) => x[key] === v));
  expect(used("place", MINI_BAG_PLACES)).toBe(true);
  expect(used("lines", MINI_BAG_LINES)).toBe(true);
  expect(used("photo", MINI_BAG_PHOTOS)).toBe(true);
  expect(used("head", MINI_BAG_HEADS)).toBe(true);
  expect(used("foot", MINI_BAG_FOOTS)).toBe(true);
  expect(used("tone", MINI_BAG_TONES)).toBe(true);
  expect(used("motion", MINI_BAG_MOTIONS)).toBe(true);
  expect(used("font", MINI_BAG_FONTS)).toBe(true);
  expect(used("round", MINI_BAG_ROUNDS)).toBe(true);
  for (const table of [MINI_BAG_FAMILY_NAMES, MINI_BAG_MOOD_NAMES, MINI_BAG_TONE_NAMES, MINI_BAG_PLACE_NAMES, MINI_BAG_LINES_NAMES]) {
    for (const w of Object.values(table)) expect(Boolean(w.ar && w.en && w.he)).toBe(true);
  }
  expect(Object.keys(MINI_BAG_TONE_NAMES).sort()).toEqual([...MINI_BAG_TONES].sort());
  expect(Object.keys(MINI_BAG_PLACE_NAMES).sort()).toEqual([...MINI_BAG_PLACES].sort());
});

test("the stylesheet draws every choice (the plain ones are the bag's own look)", () => {
  const plain: Record<string, string[]> = { lines: ["rows"], head: ["tick"], foot: ["stack"], tone: ["theme"], font: ["theme"] };
  const dims: Array<[string, readonly (string | number)[]]> = [
    ["place", MINI_BAG_PLACES], ["lines", MINI_BAG_LINES], ["photo", MINI_BAG_PHOTOS], ["head", MINI_BAG_HEADS], ["foot", MINI_BAG_FOOTS],
    ["tone", MINI_BAG_TONES], ["motion", MINI_BAG_MOTIONS], ["font", MINI_BAG_FONTS], ["round", MINI_BAG_ROUNDS],
  ];
  for (const [dim, values] of dims) {
    for (const v of values) {
      if (plain[dim]?.includes(String(v))) continue;
      expect(css.includes(`[data-mb-${dim}="${v}"]`), `${dim}=${v}`).toBe(true);
    }
  }
  for (const e of ["stagger", "remove", "secure"]) expect(css.includes(`[data-mb-extras~="${e}"]`), e).toBe(true);
  // The phone's layout follows the bag's own size, so the admin's pictures of a phone show it too.
  expect(css).toMatch(/@container mb \(max-width: 760px\)/);
  expect(css).toMatch(/prefers-reduced-motion: reduce/);
});

test("the attributes the stylesheet reads, and the setting's checks", () => {
  const x = miniBagById("pearl")!;
  expect(miniBagAttrs(x)).toMatchObject({ "data-mb": "pearl", "data-mb-place": "float", "data-mb-tone": "glass", "data-mb-round": "32", "data-mb-extras": "colours" });
  expect(miniBagById("")).toBeNull();
  expect(miniBagById("nope")).toBeNull();
  expect(miniBagById(42)).toBeNull();
  // A store's kind first, then the rest, none lost.
  const forBooks = miniBagsFor("books");
  expect(forBooks).toHaveLength(100);
  expect(forBooks[0].fits).toContain("books");
  expect(miniBagsFor(null)).toBe(MINI_BAG_DESIGNS);
  // The saved setting: a known design is kept, anything else is the bag as it always was.
  expect(normalizeStorefrontSettings({ miniBagDesign: "receipt", miniBagOnIcon: true })).toMatchObject({ miniBagDesign: "receipt", miniBagOnIcon: true });
  expect(normalizeStorefrontSettings({ miniBagDesign: "<script>" }).miniBagDesign).toBe("");
  expect(normalizeStorefrontSettings({}).miniBagDesign).toBe("");
  expect(normalizeStorefrontSettings({}).miniBagOnIcon).toBe(false);
});

test("its new words to her, to him and to everyone", () => {
  expect(toneAr("ضيفي ٤٠ ₪ كمان والتوصيل علينا", "men")).toBe("ضيف ٤٠ ₪ كمان والتوصيل علينا");
  expect(toneAr("ضيفي ٤٠ ₪ كمان والتوصيل علينا", "everyone")).toBe("ضيفوا ٤٠ ₪ كمان والتوصيل علينا");
  expect(toneAr("تسوّقي من المتجر", "men")).toBe("تسوّق من المتجر");
  expect(toneAr("تسوّقي من المتجر", "everyone")).toBe("تسوّقوا من المتجر");
});
