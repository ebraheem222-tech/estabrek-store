/**
 * The section DNA's looks: each one a whole visual language a section can wear (its letters, its buttons, how its
 * pictures are cut and framed, its cards, what decorates its ground, how much air it has, how it moves). A layout
 * (dna/heroes.ts and the kinds after it) says where things go; a look says how they look. One layout in many
 * looks, and one look across many layouts, so a page put together from one look reads as one design.
 *
 * Colours stay the theme's (tokens), so every look suits every store and every skin.
 */
import { w, type W } from "../words";

export const MOODS = ["calm", "bold", "luxe", "playful", "tech", "classic"] as const;
export type Mood = (typeof MOODS)[number];
export const MOOD_NAMES: Record<Mood, W> = {
  calm: w("هادي", "Calm", "רגוע"),
  bold: w("جريء", "Bold", "נועז"),
  luxe: w("فخم", "Luxurious", "יוקרתי"),
  playful: w("مرح", "Playful", "שובב"),
  tech: w("تقني", "Tech", "טכנולוגי"),
  classic: w("كلاسيكي", "Classic", "קלאסי"),
};

export type Skin = "plain" | "soft" | "surface" | "bold" | "dark";

export type Look = {
  key: string;
  name: W;
  mood: Mood;
  /** The skins it is offered in, best first. */
  skins: Skin[];
  head: {
    font?: "heading" | "serif" | "sans" | "mono";
    weight: number;
    /** Heading sizes × this. */
    scale: number;
    lineHeight?: number;
    italic?: boolean;
    caps?: boolean;
    /** How the big heading's letters are painted. */
    paint?: "gradient" | "outline" | "underline" | "glow" | "shade";
  };
  eyebrow: "text" | "pill" | "solid" | "line" | "none";
  textSize: number;
  btn: { radius: number; second: "outline" | "link" | "none"; caps?: boolean; shade?: boolean; glow?: boolean };
  pic: {
    radius: number;
    shape?: string;
    frame?: "border" | "mat" | "shade" | "tilt" | "lifted";
    tone?: "gray" | "duo" | "warm" | "night";
  };
  card: "line" | "shadow" | "flat" | "glass" | "pop" | "plain";
  deco?: {
    pattern?: [kind: string, size: number, opacity: number];
    mesh?: "soft" | "glow";
    edge?: "wave" | "slant" | "arc" | "zigzag";
    particles?: string;
    rule?: boolean;
  };
  /** The section's space top and bottom (px on a computer). */
  pad: number;
  /** How its pieces come in with rich motion. */
  enter: { head: "letters" | "lines" | "up" | "blur" | "words"; pic: "wipe-up" | "zoom-in" | "fade" | "circle" | "wipe-start" | "flip-y" };
  /** Its own hover on cards and pictures (the pack's wins when it has one). */
  hover?: "lift" | "tilt" | "zoom" | "glow" | "grow" | "spotlight";
};

const L = (l: Look) => l;

export const LOOKS: Look[] = [
  L({ key: "airy", name: w("هوا", "Airy", "אוורירי"), mood: "calm", skins: ["plain", "soft", "surface"],
    head: { weight: 500, scale: 1, lineHeight: 1.15 }, eyebrow: "text", textSize: 18,
    btn: { radius: 999, second: "link" }, pic: { radius: 28 }, card: "line", pad: 128, enter: { head: "up", pic: "fade" }, hover: "lift" }),
  L({ key: "editorial", name: w("مجلة", "Editorial", "מגזין"), mood: "classic", skins: ["plain", "surface", "dark"],
    head: { font: "serif", weight: 500, scale: 1.12, lineHeight: 1.08 }, eyebrow: "line", textSize: 18,
    btn: { radius: 0, second: "link" }, pic: { radius: 0 }, card: "plain", deco: { rule: true }, pad: 104, enter: { head: "lines", pic: "wipe-up" } }),
  L({ key: "heavy", name: w("خط ثقيل", "Heavy type", "גופן כבד"), mood: "bold", skins: ["plain", "bold", "dark"],
    head: { weight: 900, scale: 1.3, lineHeight: 1 }, eyebrow: "pill", textSize: 18,
    btn: { radius: 12, second: "outline" }, pic: { radius: 16 }, card: "flat", pad: 96, enter: { head: "letters", pic: "zoom-in" }, hover: "grow" }),
  L({ key: "luxe", name: w("فخامة", "Luxe", "יוקרה"), mood: "luxe", skins: ["plain", "dark", "surface"],
    head: { font: "serif", weight: 400, scale: 1.08, lineHeight: 1.12 }, eyebrow: "text", textSize: 17,
    btn: { radius: 0, second: "outline", caps: true }, pic: { radius: 0, shape: "arch" }, card: "line", pad: 136, enter: { head: "blur", pic: "fade" } }),
  L({ key: "brutal", name: w("خطوط عريضة", "Brutal", "ברוטלי"), mood: "bold", skins: ["plain", "soft", "bold"],
    head: { font: "sans", weight: 800, scale: 1.15, lineHeight: 1.02, caps: true }, eyebrow: "solid", textSize: 18,
    btn: { radius: 0, second: "outline", shade: true }, pic: { radius: 0, frame: "shade" }, card: "pop", pad: 88, enter: { head: "up", pic: "wipe-start" }, hover: "lift" }),
  L({ key: "pillow", name: w("ناعم", "Pillow", "רך"), mood: "calm", skins: ["soft", "plain"],
    head: { weight: 700, scale: 1, lineHeight: 1.15 }, eyebrow: "pill", textSize: 18,
    btn: { radius: 999, second: "outline" }, pic: { radius: 40, frame: "lifted" }, card: "shadow", deco: { mesh: "soft" }, pad: 112, enter: { head: "up", pic: "zoom-in" }, hover: "lift" }),
  L({ key: "glass", name: w("زجاج", "Glass", "זכוכית"), mood: "tech", skins: ["dark", "soft"],
    head: { weight: 700, scale: 1.05, lineHeight: 1.1 }, eyebrow: "pill", textSize: 18,
    btn: { radius: 14, second: "outline" }, pic: { radius: 24 }, card: "glass", deco: { mesh: "glow" }, pad: 112, enter: { head: "blur", pic: "fade" }, hover: "spotlight" }),
  L({ key: "ink", name: w("حبر ملوّن", "Gradient ink", "דיו מדורג"), mood: "bold", skins: ["plain", "dark"],
    head: { weight: 800, scale: 1.22, lineHeight: 1.02, paint: "gradient" }, eyebrow: "text", textSize: 19,
    btn: { radius: 999, second: "link" }, pic: { radius: 24 }, card: "shadow", deco: { mesh: "glow" }, pad: 104, enter: { head: "letters", pic: "circle" }, hover: "glow" }),
  L({ key: "carved", name: w("محفور", "Outline", "קווי מתאר"), mood: "bold", skins: ["plain", "dark"],
    head: { weight: 900, scale: 1.35, lineHeight: 0.98, paint: "outline" }, eyebrow: "line", textSize: 18,
    btn: { radius: 6, second: "outline" }, pic: { radius: 6 }, card: "line", deco: { pattern: ["grid", 40, 0.08] }, pad: 96, enter: { head: "lines", pic: "wipe-up" } }),
  L({ key: "marker", name: w("خط تحت", "Underlined", "קו תחתון"), mood: "classic", skins: ["plain", "soft"],
    head: { weight: 700, scale: 1.05, lineHeight: 1.15, paint: "underline" }, eyebrow: "text", textSize: 18,
    btn: { radius: 8, second: "link" }, pic: { radius: 12, frame: "border" }, card: "line", pad: 104, enter: { head: "words", pic: "fade" } }),
  L({ key: "gallery", name: w("برواز", "Framed", "ממוסגר"), mood: "classic", skins: ["surface", "plain"],
    head: { font: "serif", weight: 600, scale: 1, lineHeight: 1.15 }, eyebrow: "line", textSize: 17,
    btn: { radius: 4, second: "outline" }, pic: { radius: 2, frame: "mat" }, card: "line", pad: 112, enter: { head: "up", pic: "fade" } }),
  L({ key: "tilted", name: w("مايل", "Tilted", "מוטה"), mood: "playful", skins: ["soft", "plain", "bold"],
    head: { weight: 800, scale: 1.12, lineHeight: 1.05 }, eyebrow: "solid", textSize: 18,
    btn: { radius: 999, second: "outline" }, pic: { radius: 20, frame: "tilt" }, card: "shadow", deco: { pattern: ["dots", 22, 0.16] }, pad: 104, enter: { head: "letters", pic: "flip-y" }, hover: "tilt" }),
  L({ key: "arches", name: w("أقواس", "Arches", "קשתות"), mood: "luxe", skins: ["plain", "soft", "dark"],
    head: { font: "serif", weight: 500, scale: 1.1, lineHeight: 1.1 }, eyebrow: "text", textSize: 17,
    btn: { radius: 999, second: "outline" }, pic: { radius: 0, shape: "arch" }, card: "line", deco: { edge: "arc" }, pad: 120, enter: { head: "lines", pic: "wipe-up" } }),
  L({ key: "blobs", name: w("بقع", "Blobs", "כתמים"), mood: "playful", skins: ["soft", "plain"],
    head: { weight: 800, scale: 1.1, lineHeight: 1.05 }, eyebrow: "pill", textSize: 18,
    btn: { radius: 999, second: "link" }, pic: { radius: 0, shape: "blob" }, card: "flat", deco: { edge: "wave" }, pad: 112, enter: { head: "up", pic: "zoom-in" }, hover: "grow" }),
  L({ key: "mono", name: w("مونو", "Mono", "מונו"), mood: "tech", skins: ["plain", "dark"],
    head: { font: "sans", weight: 700, scale: 1.05, lineHeight: 1.08 }, eyebrow: "line", textSize: 17,
    btn: { radius: 4, second: "outline" }, pic: { radius: 4, tone: "gray" }, card: "line", deco: { pattern: ["lines", 28, 0.07] }, pad: 96, enter: { head: "lines", pic: "wipe-start" } }),
  L({ key: "duotone", name: w("لونين", "Duotone", "דו־גוני"), mood: "bold", skins: ["plain", "bold"],
    head: { weight: 800, scale: 1.18, lineHeight: 1.02 }, eyebrow: "solid", textSize: 18,
    btn: { radius: 999, second: "outline" }, pic: { radius: 18, tone: "duo" }, card: "flat", pad: 100, enter: { head: "up", pic: "circle" }, hover: "zoom" }),
  L({ key: "noir", name: w("ليل", "Noir", "נואר"), mood: "luxe", skins: ["dark"],
    head: { font: "serif", weight: 400, scale: 1.15, lineHeight: 1.08 }, eyebrow: "line", textSize: 17,
    btn: { radius: 0, second: "outline", caps: true }, pic: { radius: 0, tone: "night" }, card: "line", pad: 136, enter: { head: "blur", pic: "fade" } }),
  L({ key: "neon", name: w("نيون", "Neon", "ניאון"), mood: "tech", skins: ["dark"],
    head: { weight: 800, scale: 1.15, lineHeight: 1.04, paint: "glow" }, eyebrow: "pill", textSize: 18,
    btn: { radius: 999, second: "outline", glow: true }, pic: { radius: 22 }, card: "line", deco: { pattern: ["grid", 44, 0.1], particles: "neon-lines" }, pad: 108, enter: { head: "letters", pic: "zoom-in" }, hover: "glow" }),
  L({ key: "retro", name: w("ريترو", "Retro", "רטרו"), mood: "playful", skins: ["soft", "plain", "bold"],
    head: { weight: 900, scale: 1.15, lineHeight: 1.02, italic: true, paint: "shade" }, eyebrow: "solid", textSize: 18,
    btn: { radius: 18, second: "outline", shade: true }, pic: { radius: 18, frame: "shade" }, card: "pop", deco: { pattern: ["stripes", 36, 0.07] }, pad: 100, enter: { head: "up", pic: "flip-y" }, hover: "lift" }),
  L({ key: "paper", name: w("ورق", "Paper", "נייר"), mood: "calm", skins: ["surface", "plain"],
    head: { font: "serif", weight: 600, scale: 1.02, lineHeight: 1.15 }, eyebrow: "text", textSize: 18,
    btn: { radius: 6, second: "link" }, pic: { radius: 4, frame: "mat" }, card: "line", deco: { pattern: ["lines", 32, 0.05] }, pad: 112, enter: { head: "words", pic: "fade" } }),
  L({ key: "sport", name: w("رياضي", "Sporty", "ספורטיבי"), mood: "bold", skins: ["plain", "bold", "dark"],
    head: { weight: 900, scale: 1.25, lineHeight: 0.98, italic: true, caps: true }, eyebrow: "solid", textSize: 18,
    btn: { radius: 0, second: "outline", caps: true }, pic: { radius: 0, shape: "slant" }, card: "flat", deco: { edge: "slant" }, pad: 96, enter: { head: "up", pic: "wipe-start" }, hover: "grow" }),
  L({ key: "candy", name: w("حلوى", "Candy", "ממתק"), mood: "playful", skins: ["soft", "bold"],
    head: { weight: 800, scale: 1.1, lineHeight: 1.05 }, eyebrow: "pill", textSize: 18,
    btn: { radius: 999, second: "outline", shade: true }, pic: { radius: 0, shape: "squircle" }, card: "shadow", deco: { particles: "bubbles", edge: "zigzag" }, pad: 108, enter: { head: "letters", pic: "zoom-in" }, hover: "tilt" }),
  L({ key: "organic", name: w("طبيعي", "Organic", "טבעי"), mood: "calm", skins: ["soft", "plain"],
    head: { font: "serif", weight: 600, scale: 1.05, lineHeight: 1.12 }, eyebrow: "text", textSize: 18,
    btn: { radius: 999, second: "link" }, pic: { radius: 0, shape: "leaf", tone: "warm" }, card: "flat", deco: { mesh: "soft", edge: "wave" }, pad: 120, enter: { head: "up", pic: "fade" } }),
  L({ key: "minimal", name: w("بسيط", "Minimal", "מינימלי"), mood: "calm", skins: ["plain", "surface"],
    head: { weight: 600, scale: 0.92, lineHeight: 1.15 }, eyebrow: "none", textSize: 17,
    btn: { radius: 0, second: "none" }, pic: { radius: 0 }, card: "plain", pad: 88, enter: { head: "up", pic: "fade" } }),
];

export const LOOK_BY_KEY = new Map(LOOKS.map((l) => [l.key, l]));
