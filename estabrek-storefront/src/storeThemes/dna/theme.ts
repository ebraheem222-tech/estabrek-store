/**
 * The designs as store themes (phase 11): every kind's design becomes four themes a store can
 * pick (its original, soft, bold and another layout), each in both modes where it has them
 * (night or day is the theme's other mode). Its DNA turns into the theme's own parts: colours
 * (themes/kit.ts tones, read as the theme tests ask), fonts, corners, shadows, the home's
 * opening, motion, drawings, product cards, a 3D stage where it has models, its words, and
 * its kit (icons, boxes, buttons, the shape of its drawings).
 */
import type { PackKit } from "../packs";
import type { ModelKind } from "../three/kinds";
import { MODEL_INFO } from "../three/kinds";
import { FONTS, font, pick, tones } from "../themes/kit";
import type { CardStyle, DesignInfo, HeroStyle, StageSpec, StoreTheme, ThemeFamily } from "../types";
import type { DNA, Seed, StoreKind, Words } from "./axes";
import { KINDS } from "./kinds";
import { ARCHETYPE_NAMES, COLOUR_NAMES } from "./labels";
import { bold, reach, soft, turned, type VariantKey } from "./variants";
import { KIND_WORDS, SECTOR_WORDS } from "./words";

/** The home's opening for each page skeleton (a 3D showroom only where the kind has models). */
const HERO: Record<DNA["archetype"], HeroStyle> = {
  cinema: "spotlight", bento: "playful", magazine: "editorial", catalog: "mono", story: "bloom", rail: "split", spec: "spotlight", menu: "bloom",
  booking: "split", lookbook: "gallery", countdown: "glitch", collage: "playful", gallery: "gallery", split: "split", map: "mono", showroom: "stage",
  minimal: "mono", playground: "playful", market: "editorial", recipe: "bloom",
};
/** Corners (0 square … 2 very round) and a button's. */
const CORNERS: Record<Exclude<DNA["shape"], "arch">, [number, string]> = {
  sharp: [0, "2px"], soft: [0.6, "12px"], round: [1.1, "999px"], pill: [1.4, "999px"], organic: [1.3, "999px"], cut: [0.15, "4px"], ticket: [0.4, "6px"], circle: [1.6, "999px"],
};
const SHADOW: Record<DNA["surface"], StoreTheme["shadow"]> = { flat: "flat", paper: "soft", glass: "soft", layered: "deep", outline: "flat", gradient: "glow", grain: "flat", neumorph: "soft" };
const ICONS: Record<DNA["icons"], PackKit["icons"]> = { line: "lucide", filled: "ph-fill", duotone: "ph-duotone", hand: "ph-light", pixel: "ph-bold", sticker: "tabler-filled" };
const BOX: Record<DNA["surface"], PackKit["box"]["look"]> = { flat: "flat", paper: "soft", glass: "glass", layered: "shadow", outline: "line", gradient: "soft", grain: "flat", neumorph: "soft" };
const BUTTON: Record<DNA["surface"], PackKit["button"]["look"]> = { flat: "solid", paper: "soft", glass: "glow", layered: "shadow", outline: "outline", gradient: "glow", grain: "solid", neumorph: "soft" };
const DECOR: Record<Exclude<DNA["shape"], "arch">, PackKit["decor"]["shape"]> = { sharp: "rect", soft: "rounded", round: "squircle", pill: "pill", organic: "blob", cut: "octagon", ticket: "ticket", circle: "circle" };

/** The kind of store a design's templates speak for (the admin's templates know these). */
const FAMILY: Record<string, ThemeFamily> = {
  "shoes-sneakers": "shoes", "gold-jewelry": "jewelry", "silver-handmade": "jewelry", watches: "jewelry", gaming: "gaming", "game-keys": "gaming", "wall-art": "art",
  "kids-books": "books", books: "books", "music-instruments": "music", "vinyl-records": "music", "art-supplies": "art", "art-gallery": "art", calligraphy: "art", crafts: "art",
  collectibles: "art", photography: "art", "beauty-salon": "beauty", flowers: "flowers", "wedding-planning": "flowers", "wedding-supplies": "flowers", "online-courses": "books",
};
const BY_SECTOR: Record<StoreKind["sector"], ThemeFamily> = {
  fashion: "fashion", beauty: "beauty", tech: "electronics", home: "home", food: "food", health: "general", kids: "kids", culture: "general", outdoors: "sports",
  auto: "general", pets: "pets", services: "general", gifts: "general", general: "general",
};
export const familyOf = (k: StoreKind): ThemeFamily => FAMILY[k.id] ?? BY_SECTOR[k.sector];

/** The models a kind's 3D showroom brings forward (others open on a spotlight instead). */
const MODELS: Record<string, ModelKind[]> = {
  "shoes-sneakers": ["sneaker", "ball", "racket"], gaming: ["controller", "headset", "keyboard", "mouse"], toys: ["teddy", "blocks", "rocket", "ball"],
  "music-instruments": ["guitar", "vinyl", "speaker"], "mobile-phones": ["phone", "tablet", "watch"], audio: ["headset", "speaker", "vinyl"], collectibles: ["trophy", "gem", "coin", "sword"],
  "gym-equipment": ["dumbbell", "ball"], sportswear: ["sneaker", "dumbbell", "ball"], "print-on-demand": ["mug", "hanger"], laptops: ["laptop", "keyboard", "mouse"],
  "gadgets-drones": ["rocket", "camera", "vr"], "car-accessories": ["helmet", "speaker"], motorcycles: ["helmet"], "learning-games": ["blocks", "dice", "rocket"], "board-games": ["dice", "trophy", "blocks"],
  cameras: ["camera", "frame"], "oud-perfume": ["perfume"], "gold-jewelry": ["ring", "gem"], "home-decor": ["vase", "lamp", "plant"], lighting: ["lamp"], coffee: ["mug"],
};
const FINISH = (k: StoreKind): StageSpec["finish"] =>
  k.id === "gaming" || k.dna.motif === "synth" || k.dna.motif === "neon" ? "neon" : k.sector === "kids" ? "toy" : k.id === "gold-jewelry" ? "gold" : k.sector === "beauty" ? "glass" : k.sector === "tech" || k.sector === "auto" || k.dna.motion === "sporty" ? "metal" : "matte";
function stageOf(k: StoreKind, seed: Seed): StageSpec | undefined {
  const models = MODELS[k.id];
  if (!models?.length) return undefined;
  const layout: StageSpec["layout"] = k.dna.motion === "arcade" || k.dna.motion === "sporty" ? "orbit" : k.sector === "kids" ? "shelf" : k.dna.motion === "luxe" || k.dna.motion === "editorial" ? "podium" : "hero";
  const floor: StageSpec["floor"] = ["pixel", "synth", "circuit", "glitch"].includes(k.dna.motif) ? "grid" : k.dna.archetype === "minimal" ? "none" : "stage";
  const colours = [seed.accent, seed.strong, seed.ink];
  return {
    layout, floor, finish: FINISH(k), models,
    games: models.slice(0, 3).map((m, i) => pick(MODEL_INFO[m].label, colours[i % colours.length], m, MODEL_INFO[m].label.en.toLowerCase())),
  };
}

const both = (a: Words, b: Words, sep = "، "): Words => ({ ar: `${a.ar}${sep}${b.ar}`, en: `${a.en}${sep === "، " ? ", " : sep}${b.en}`, he: `${a.he}${sep === "، " ? ", " : sep}${b.he}` });
const cap = (x: Words): Words => ({ ar: x.ar, en: x.en.charAt(0).toUpperCase() + x.en.slice(1), he: x.he });
const VARIANT_NAMES: Record<Exclude<VariantKey, "first" | "turned">, Words> = {
  soft: { ar: "ناعم", en: "Soft", he: "רך" },
  bold: { ar: "جريء", en: "Bold", he: "נועז" },
  layout: { ar: "ترتيب تاني", en: "Another layout", he: "פריסה אחרת" },
};

/** A mode's colours: what stands out reads on the page as links must (4.5 to 1), the brand colour as decoration (3 to 1). */
const palette = (x: Seed) => {
  const far = x.mode === "dark" ? "#ffffff" : "#000000";
  return tones(x.mode, x.bg, reach(x.accent, x.bg, 3, far), reach(x.strong, x.bg, 4.6, far), x.ink);
};
export const palettesOf = (a: Seed, b: Seed | null): StoreTheme["palettes"] => {
  const out: StoreTheme["palettes"] = { [a.mode]: palette(a) };
  if (b && b.mode !== a.mode) out[b.mode] = palette(b);
  return out;
};

/** One kind's design as its four themes. */
export function themesOf(k: StoreKind): StoreTheme[] {
  const d = k.dna;
  const words = KIND_WORDS[k.id];
  const sector = SECTOR_WORDS[k.sector];
  const [display, text] = d.type.split("/") as [keyof typeof FONTS, keyof typeof FONTS];
  const [round, pill] = CORNERS[d.shape as Exclude<DNA["shape"], "arch">];
  const blurb = cap(both(both(COLOUR_NAMES[d.colours], ARCHETYPE_NAMES[d.archetype]), k.signature.name));
  const make = (variant: DesignInfo["variant"], seed: Seed, other: Seed | null, archetype: DNA["archetype"], imagery: DNA["imagery"]): StoreTheme => {
    const hero = HERO[archetype] === "stage" && !MODELS[k.id] ? "spotlight" : HERO[archetype];
    const stage = hero === "stage" ? stageOf(k, seed) : undefined;
    return {
      id: variant === "first" ? k.id : `${k.id}-${variant}`,
      name: variant === "first" ? k.name : both(k.name, VARIANT_NAMES[variant], " · "),
      family: familyOf(k),
      blurb,
      mode: seed.mode,
      palettes: palettesOf(seed, other),
      fonts: font(display, text),
      round,
      pill,
      shadow: SHADOW[d.surface],
      hero,
      motion: d.motion,
      svg: d.motif,
      card: d.card as CardStyle,
      ...(stage ? { stage } : {}),
      copy: { ...words, productsTitle: sector.productsTitle, collectionsTitle: sector.collectionsTitle, marquee: sector.marquee },
      kit: { icons: ICONS[d.icons], box: { look: BOX[d.surface] }, button: { look: BUTTON[d.surface] }, decor: { shape: DECOR[d.shape as Exclude<DNA["shape"], "arch">] } },
      design: { kind: k.id, sector: k.sector, variant, signature: k.signature.name, header: d.header, footer: d.footer, imagery, voice: d.voice, archetype, shape: d.shape },
    };
  };
  const first = d.seed;
  const other = turned(first);
  return [
    make("first", first, other, d.archetype, d.imagery),
    make("soft", soft(first), soft(other), d.archetype, d.imagery),
    make("bold", bold(first), null, d.archetype, d.imagery),
    make("layout", first, other, k.alt.archetype, k.alt.imagery),
  ];
}

/** Every design's themes, in the kinds' order. */
export const DESIGN_THEMES: StoreTheme[] = KINDS.flatMap(themesOf);
