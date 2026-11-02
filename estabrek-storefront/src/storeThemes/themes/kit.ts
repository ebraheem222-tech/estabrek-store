/** Shorthands for writing themes (themes/*.ts). */
import { contrast, mix, type Palette } from "../colour";
import type { ModelKind } from "../three/kinds";
import type { StageSpec, ThemeCopy, Words } from "../types";

export const w = (ar: string, en: string, he: string): Words => ({ ar, en, he });

/** bg, surface, soft, line, glow, muted, accent, strong, ink, onStrong. */
export const pal = (bg: string, surface: string, soft: string, line: string, glow: string, muted: string, accent: string, strong: string, ink: string, onStrong: string): Palette => ({
  bg,
  surface,
  soft,
  line,
  glow,
  muted,
  accent,
  strong,
  ink,
  onStrong,
});

export const copy = (eyebrow: Words, title: Words, subtitle: Words, cta: Words, productsTitle: Words, collectionsTitle: Words, marquee: Words[]): ThemeCopy => ({
  eyebrow,
  title,
  subtitle,
  cta,
  productsTitle,
  collectionsTitle,
  marquee,
});

/** One collection the shopper can pick on a 3D opening: it tints the stage and brings its model forward. */
export const pick = (name: Words, color: string, model: ModelKind, search: string): StageSpec["games"][number] => ({ name, color, model, search });

/** Font stacks: Arabic and Latin first, then Hebrew, then the generic family. */
export const FONTS = {
  amiri: ["th-amiri", "th-frank-ruhl-libre", "serif"],
  ruqaa: ["th-aref-ruqaa", "th-frank-ruhl-libre", "serif"],
  messiri: ["th-el-messiri", "th-frank-ruhl-libre", "serif"],
  kufi: ["th-reem-kufi", "th-assistant", "sans-serif"],
  cairo: ["th-cairo", "th-heebo", "sans-serif"],
  alexandria: ["th-alexandria", "th-assistant", "sans-serif"],
  readex: ["th-readex-pro", "th-rubik", "sans-serif"],
  changa: ["th-changa", "th-secular-one", "sans-serif"],
  lalezar: ["th-lalezar", "th-secular-one", "sans-serif"],
  marhey: ["th-marhey", "th-secular-one", "sans-serif"],
  tajawal: ["th-tajawal", "th-heebo", "sans-serif"],
  rubik: ["th-rubik", "sans-serif"],
} as const;
export const font = (display: keyof typeof FONTS, text: keyof typeof FONTS) => ({ display: [...FONTS[display]], text: [...FONTS[text]] });

/** A colour pushed toward `toward` until it reads at `target` against `on`. */
function reach(c: string, on: string, target: number, toward: string): string {
  for (let t = 0; t <= 1.001 && contrast(c, on) < target; t += 0.04) c = mix(c, toward, 0.04 / Math.max(0.04, 1 - t));
  return c;
}

/**
 * One mode's colours from four: the page, the brand colour, what must stand out (buttons,
 * links) and the text. The rest follows them; the text, the quiet text and the buttons' words
 * are pushed until they read (7, 4.5 and 4.5, as tests/store-themes.spec.ts checks).
 */
export function tones(mode: "light" | "dark", bg: string, accent: string, strong: string, ink: string): Palette {
  const dark = mode === "dark";
  const far = dark ? "#ffffff" : "#000000";
  const text = reach(ink, bg, 7.4, far);
  const quiet = reach(mix(text, bg, 0.38), bg, 4.8, far);
  const words = [bg, text, "#ffffff", "#111111"].find((c) => contrast(c, strong) >= 4.7);
  const stand = words ? strong : reach(strong, "#ffffff", 4.8, "#000000");
  return {
    bg,
    surface: dark ? mix(bg, "#ffffff", 0.05) : mix(bg, "#ffffff", 0.75),
    soft: mix(bg, accent, dark ? 0.2 : 0.14),
    line: mix(bg, text, dark ? 0.18 : 0.13),
    glow: mix(accent, bg, dark ? 0.45 : 0.4),
    muted: quiet,
    accent,
    strong: stand,
    ink: text,
    onStrong: words ?? "#ffffff",
  };
}
