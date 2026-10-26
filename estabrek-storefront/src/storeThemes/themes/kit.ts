/** Shorthands for writing themes (themes/*.ts). */
import type { Palette } from "../colour";
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
