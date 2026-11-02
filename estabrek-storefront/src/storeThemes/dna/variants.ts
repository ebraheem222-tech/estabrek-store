/**
 * A design's variants (phase 11): the design as first made and four more that keep what makes
 * it itself (its type, shapes, motifs, cards, header and signature): the other mode (night for
 * a light design, day for a dark one), soft (its page tinted with its colour), bold (its colour
 * as the page) and another layout (its second opening and way of showing pictures). Designs are
 * shared: any number of stores can pick any variant and change it further (custom.ts).
 */
import { contrast, mix } from "../colour";
import type { DNA, Seed, StoreKind, Words } from "./axes";

export const VARIANT_KEYS = ["first", "turned", "soft", "bold", "layout"] as const;
export type VariantKey = (typeof VARIANT_KEYS)[number];
export type Variant = { id: string; kind: string; key: VariantKey; name: Words; dna: DNA };

const w = (ar: string, en: string, he: string): Words => ({ ar, en, he });
const NAMES: Record<Exclude<VariantKey, "turned">, Words> & { night: Words; day: Words } = {
  first: w("الأصلي", "Original", "מקורי"),
  night: w("ليلي", "Night", "לילה"),
  day: w("نهاري", "Day", "יום"),
  soft: w("ناعم", "Soft", "רך"),
  bold: w("جريء", "Bold", "נועז"),
  layout: w("ترتيب تاني", "Another layout", "פריסה אחרת"),
};

/** A colour moved toward `toward` until it reads at `target` against `on`. */
export function reach(c: string, on: string, target: number, toward: string): string {
  for (let i = 0; i < 30 && contrast(c, on) < target; i++) c = mix(c, toward, 0.08);
  return c;
}
/** The design in the other mode: a deep page from its words' colour by night, a light one by day; what stands out still reads on it. */
export function turned(s: Seed): Seed {
  const dark = s.mode === "light";
  const bg = dark ? mix(s.ink, "#000000", 0.55) : mix(s.ink, "#ffffff", 0.7);
  const far = dark ? "#ffffff" : "#000000";
  const accent = reach(mix(s.accent, far, dark ? 0.22 : 0.25), bg, 3, far);
  const strong = reach(mix(s.strong, far, 0.35), bg, 4.6, far);
  return { mode: dark ? "dark" : "light", bg, accent, strong, ink: mix(s.bg, dark ? "#ffffff" : "#000000", dark ? 0.6 : 0.25) };
}
/** Its page tinted with its colour. */
export const soft = (s: Seed): Seed => ({ ...s, bg: mix(s.bg, s.accent, s.mode === "dark" ? 0.14 : 0.12) });
/** Its colour as the page (deepened until light or dark words read on it as body text should, 7 to 1), the words whichever reads better. */
export function bold(s: Seed): Seed {
  let bg = s.strong;
  for (let i = 0; i < 30 && contrast(bg, "#fbfaf7") < 7.6 && contrast(bg, "#141414") < 7.6; i++) bg = mix(bg, "#000000", 0.06);
  const dark = contrast(bg, "#fbfaf7") >= contrast(bg, "#141414");
  const ink = dark ? "#fbfaf7" : "#141414";
  return { mode: dark ? "dark" : "light", bg, accent: mix(s.accent, ink, 0.35), strong: ink, ink };
}

/** Every variant of a kind's design, the first as it was made. */
export function variantsOf(k: StoreKind): Variant[] {
  const d = k.dna;
  const v = (key: VariantKey, suffix: string, name: Words, dna: DNA): Variant => ({ id: suffix ? `${k.id}-${suffix}` : k.id, kind: k.id, key, name, dna });
  const night = d.seed.mode === "light";
  return [
    v("first", "", NAMES.first, d),
    v("turned", night ? "night" : "day", night ? NAMES.night : NAMES.day, { ...d, seed: turned(d.seed) }),
    v("soft", "soft", NAMES.soft, { ...d, seed: soft(d.seed) }),
    v("bold", "bold", NAMES.bold, { ...d, seed: bold(d.seed) }),
    v("layout", "layout", NAMES.layout, { ...d, archetype: k.alt.archetype, imagery: k.alt.imagery }),
  ];
}
