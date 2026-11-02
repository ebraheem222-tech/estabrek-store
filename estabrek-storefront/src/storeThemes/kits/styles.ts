/**
 * The templates' visual languages (phase 11.3): how a template's words, pictures, corners,
 * spacing and motion look, whatever it sells. Each template wears one; two templates of the
 * same category never wear the same one. Fonts are the editor's library by name, one per
 * script (Latin, Arabic, Hebrew), so every language has a face drawn for it.
 */
import type { Seed } from "../dna/axes";
import type { CardStyle, HeroStyle, MotionStyle, StoreTheme, SvgKit, Words } from "../types";

export type Style = {
  id: string;
  name: Words;
  /** The page's colours (the theme is made from them), and a second colour some parts use. */
  seed: Seed;
  pop: string;
  /** Words on the second colour. */
  popInk: string;
  /** [Latin, Arabic, Hebrew] families from the editor's library. */
  fonts: { display: [string, string, string]; text: [string, string, string] };
  /** Headings: how big against the base, their weight, capitals for Latin, line height. */
  head: { scale: number; weight: number; caps: boolean; line: number };
  /** Pictures: corners, a frame (none, a hairline, a hard offset shadow, a glow), a look. */
  img: { radius: number; frame: "none" | "line" | "offset" | "glow"; filters?: Record<string, number> };
  button: { radius: number; variant: "solid" | "outline"; caps: boolean };
  /** Space around parts, hairlines between them, how things come in. */
  density: "airy" | "normal" | "dense";
  rules: boolean;
  motion: "calm" | "snappy" | "cinematic" | "bouncy";
  /** What the store's own parts (header, cards, footer) take from it. */
  theme: { round: number; pill: string; shadow: StoreTheme["shadow"]; card: CardStyle; svg: SvgKit; motion: MotionStyle; hero: HeroStyle };
};

const w = (s: string): Words => {
  const [ar, en, he] = s.split("|");
  return { ar, en, he };
};

export const STYLES: Record<string, Style> = {
  street: {
    id: "street", name: w("صوت الشارع|Street Loud|קול הרחוב"),
    seed: { mode: "light", bg: "#f2f2ee", accent: "#9fc21a", strong: "#111111", ink: "#0a0a0a" }, pop: "#c8f031", popInk: "#0a0a0a",
    fonts: { display: ["anton", "lalezar", "secular-one"], text: ["inter", "tajawal", "heebo"] },
    head: { scale: 1.55, weight: 400, caps: true, line: 0.92 },
    img: { radius: 0, frame: "none", filters: { contrast: 1.1, saturate: 0.9 } },
    button: { radius: 0, variant: "solid", caps: true },
    density: "dense", rules: false, motion: "snappy",
    theme: { round: 0, pill: "0px", shadow: "flat", card: "tile", svg: "arena", motion: "sporty", hero: "mono" },
  },
  runner: {
    id: "runner", name: w("يوم السباق|Race Day|יום המרוץ"),
    seed: { mode: "light", bg: "#ffffff", accent: "#1f4bff", strong: "#1435c4", ink: "#0b1020" }, pop: "#ff5b2e", popInk: "#1a0a05",
    fonts: { display: ["barlow-condensed", "changa", "heebo"], text: ["barlow", "cairo", "heebo"] },
    head: { scale: 1.35, weight: 800, caps: true, line: 0.95 },
    img: { radius: 14, frame: "none" },
    button: { radius: 999, variant: "solid", caps: true },
    density: "normal", rules: false, motion: "snappy",
    theme: { round: 1.1, pill: "999px", shadow: "soft", card: "angled", svg: "track", motion: "sporty", hero: "split" },
  },
  atelier: {
    id: "atelier", name: w("أتيليه|Atelier|אטלייה"),
    seed: { mode: "light", bg: "#f3eee6", accent: "#8a4b24", strong: "#6b3417", ink: "#1a1714" }, pop: "#c9a77a", popInk: "#1a1714",
    fonts: { display: ["cormorant-garamond", "amiri", "frank-ruhl-libre"], text: ["jost", "readex-pro", "assistant"] },
    head: { scale: 1.2, weight: 500, caps: false, line: 1.05 },
    img: { radius: 0, frame: "line" },
    button: { radius: 0, variant: "outline", caps: true },
    density: "airy", rules: true, motion: "cinematic",
    theme: { round: 0, pill: "0px", shadow: "flat", card: "minimal", svg: "silk", motion: "luxe", hero: "editorial" },
  },
  playground: {
    id: "playground", name: w("ساحة لعب|Playground|מגרש משחקים"),
    seed: { mode: "light", bg: "#fff6dc", accent: "#7b4dff", strong: "#5a2fe0", ink: "#24194a" }, pop: "#ff6b9a", popInk: "#24194a",
    fonts: { display: ["fredoka", "baloo-bhaijaan-2", "varela-round"], text: ["nunito", "baloo-bhaijaan-2", "varela-round"] },
    head: { scale: 1.25, weight: 700, caps: false, line: 1.05 },
    img: { radius: 28, frame: "none" },
    button: { radius: 999, variant: "solid", caps: false },
    density: "normal", rules: false, motion: "bouncy",
    theme: { round: 2, pill: "999px", shadow: "soft", card: "round", svg: "candy", motion: "bouncy", hero: "playful" },
  },
  quiet: {
    id: "quiet", name: w("هدوء|Quiet|שקט"),
    seed: { mode: "light", bg: "#f5f5f2", accent: "#6b7f6a", strong: "#4d5f4c", ink: "#222420" }, pop: "#d9d6cc", popInk: "#222420",
    fonts: { display: ["dm-sans", "readex-pro", "assistant"], text: ["dm-sans", "readex-pro", "assistant"] },
    head: { scale: 0.95, weight: 500, caps: false, line: 1.15 },
    img: { radius: 4, frame: "none", filters: { saturate: 0.85 } },
    button: { radius: 4, variant: "solid", caps: false },
    density: "airy", rules: true, motion: "calm",
    theme: { round: 0.3, pill: "4px", shadow: "flat", card: "minimal", svg: "zen", motion: "soft", hero: "mono" },
  },
  retro: {
    id: "retro", name: w("بوستر ريترو|Retro Poster|פוסטר רטרו"),
    seed: { mode: "light", bg: "#f2e8d5", accent: "#e2483d", strong: "#b8302a", ink: "#1d1a16" }, pop: "#0f7173", popInk: "#f2e8d5",
    fonts: { display: ["bowlby-one", "rakkas", "suez-one"], text: ["work-sans", "tajawal", "rubik"] },
    head: { scale: 1.3, weight: 400, caps: true, line: 1 },
    img: { radius: 10, frame: "offset" },
    button: { radius: 10, variant: "solid", caps: true },
    density: "normal", rules: false, motion: "bouncy",
    theme: { round: 0.7, pill: "10px", shadow: "deep", card: "sticker", svg: "wave", motion: "arcade", hero: "playful" },
  },
  night: {
    id: "night", name: w("إصدار الليل|Night Drop|השקת לילה"),
    seed: { mode: "dark", bg: "#0b0b10", accent: "#ff2e88", strong: "#ff5aa5", ink: "#f3f3f7" }, pop: "#7cf7ff", popInk: "#0b0b10",
    fonts: { display: ["unbounded", "reem-kufi", "rubik"], text: ["inter", "ibm-plex-sans-arabic", "rubik"] },
    head: { scale: 1.2, weight: 800, caps: true, line: 1 },
    img: { radius: 18, frame: "glow" },
    button: { radius: 999, variant: "solid", caps: true },
    density: "normal", rules: false, motion: "cinematic",
    theme: { round: 1.2, pill: "999px", shadow: "glow", card: "overlay", svg: "neon", motion: "precise", hero: "glitch" },
  },
  edit: {
    id: "edit", name: w("المجلة|The Edit|המגזין"),
    seed: { mode: "light", bg: "#ffffff", accent: "#d7261e", strong: "#b01d17", ink: "#111111" }, pop: "#f4f1ec", popInk: "#111111",
    fonts: { display: ["playfair-display", "el-messiri", "frank-ruhl-libre"], text: ["libre-franklin", "noto-naskh-arabic", "assistant"] },
    head: { scale: 1.45, weight: 700, caps: false, line: 1 },
    img: { radius: 0, frame: "none", filters: { gray: 0.15 } },
    button: { radius: 0, variant: "outline", caps: true },
    density: "normal", rules: true, motion: "calm",
    theme: { round: 0, pill: "0px", shadow: "flat", card: "frame", svg: "ink", motion: "editorial", hero: "editorial" },
  },
  trail: {
    id: "trail", name: w("بداية الدرب|Trailhead|תחילת השביל"),
    seed: { mode: "light", bg: "#e9e4d8", accent: "#d9682b", strong: "#a8461a", ink: "#1f2a1f" }, pop: "#2f5d3a", popInk: "#e9e4d8",
    fonts: { display: ["oswald", "cairo", "heebo"], text: ["karla", "cairo", "heebo"] },
    head: { scale: 1.3, weight: 700, caps: true, line: 1 },
    img: { radius: 6, frame: "none", filters: { contrast: 1.05 } },
    button: { radius: 6, variant: "solid", caps: true },
    density: "normal", rules: false, motion: "snappy",
    theme: { round: 0.4, pill: "6px", shadow: "soft", card: "portrait", svg: "botanic", motion: "sporty", hero: "split" },
  },
  lab: {
    id: "lab", name: w("مختبر|Lab Spec|מעבדה"),
    seed: { mode: "light", bg: "#eef0f3", accent: "#ff5a1f", strong: "#d9420c", ink: "#0e1116" }, pop: "#c9ced6", popInk: "#0e1116",
    fonts: { display: ["space-grotesk", "ibm-plex-sans-arabic", "ibm-plex-sans-hebrew"], text: ["inter", "ibm-plex-sans-arabic", "ibm-plex-sans-hebrew"] },
    head: { scale: 1.15, weight: 600, caps: false, line: 1.05 },
    img: { radius: 8, frame: "line" },
    button: { radius: 8, variant: "solid", caps: false },
    density: "dense", rules: true, motion: "snappy",
    theme: { round: 0.5, pill: "8px", shadow: "flat", card: "spec", svg: "circuit", motion: "precise", hero: "spotlight" },
  },
};
