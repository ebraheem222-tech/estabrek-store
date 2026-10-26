import type { Palette } from "./colour";
import type { ModelKind } from "./three/kinds";

export type Words = { ar: string; en: string; he: string };

/** What kind of store a theme is made for (the admin's gallery groups by it). */
export type ThemeFamily = "fashion" | "shoes" | "electronics" | "gaming" | "beauty" | "books" | "home" | "food" | "kids" | "general";

/** The home page's opening, each a different composition (storeThemes/home/heroes). */
export type HeroStyle = "editorial" | "spotlight" | "glitch" | "bloom" | "playful" | "stage";
/** How everything moves (storeThemes/motion/presets.ts). */
export type MotionStyle = "editorial" | "precise" | "arcade" | "soft" | "bouncy";
/** The drawings: backdrops, dividers between sections, ornaments (storeThemes/svg). */
export type SvgKit = "deco" | "circuit" | "neon" | "organic" | "candy" | "pixel" | "arena" | "synth" | "fantasy" | "space" | "glitch" | "zen" | "frost" | "ember";
/** Product cards. */
export type CardStyle = "portrait" | "spec" | "angled" | "arch" | "sticker" | "pixel";

/** A gaming theme's 3D stage (storeThemes/three): the models the store starts with and how they stand. */
export type StageSpec = {
  layout: "orbit" | "hero" | "podium" | "shelf";
  floor: "grid" | "stage" | "none";
  finish: "neon" | "metal" | "toy" | "voxel";
  models: ModelKind[];
  /** Games (or genres) the shopper can pick until the store names its own. */
  games: Array<{ name: Words; color: string; model: ModelKind; search: string }>;
};

export type StoreTheme = {
  id: string;
  name: Words;
  family: ThemeFamily;
  /** One line for the gallery. */
  blurb: Words;
  palettes: { light?: Palette; dark?: Palette };
  mode: "light" | "dark";
  /** Font stacks, first match wins per letter: each family covers some scripts (fonts.gen.ts). */
  fonts: { display: string[]; text: string[] };
  /** Corners: 0 square … 1 as the rose design … 2 very round; the pill for buttons. */
  round: number;
  pill: string;
  shadow: "flat" | "soft" | "deep" | "glow";
  hero: HeroStyle;
  motion: MotionStyle;
  svg: SvgKit;
  card: CardStyle;
  /** Gaming themes: the 3D stage of the opening. */
  stage?: StageSpec;
  /** Words the home uses where the store hasn't written its own. */
  copy: ThemeCopy;
};

export type ThemeCopy = {
  eyebrow: Words;
  title: Words;
  subtitle: Words;
  cta: Words;
  productsTitle: Words;
  collectionsTitle: Words;
  /** The running strip under the opening. */
  marquee: Words[];
};

/** The store's choice (Settings: header.storeTheme). No id = the rose design. */
export type StoreThemeChoice = { id?: string | null; mode?: "light" | "dark" | null };
