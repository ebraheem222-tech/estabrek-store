/**
 * A store design's DNA (phase 11): what makes one design itself, on axes that are each
 * independent of the others, so two designs can be told apart by more than their colours.
 * Every kind of store gets one (kinds.ts); designs are built from it, and checked to stay
 * far from each other and from the rose design, which is Estabrek's own (distance.ts).
 */

/** The home page's skeleton: what leads and how the page is laid out. */
export const ARCHETYPES = [
  "cinema", "bento", "magazine", "catalog", "story", "rail", "spec", "menu", "booking", "lookbook",
  "countdown", "collage", "gallery", "split", "map", "showroom", "minimal", "playground", "market", "recipe",
] as const;
/** Display / text pairs from the theme fonts (themes/kit.ts FONTS): Arabic and Latin, then Hebrew. */
export const TYPES = [
  "amiri/tajawal", "messiri/cairo", "kufi/readex", "lalezar/cairo", "changa/rubik", "marhey/rubik", "ruqaa/tajawal",
  "alexandria/alexandria", "readex/readex", "cairo/cairo", "tajawal/tajawal", "rubik/rubik", "kufi/tajawal",
  "messiri/messiri", "amiri/amiri", "changa/cairo", "lalezar/tajawal", "alexandria/readex", "marhey/tajawal", "ruqaa/readex",
] as const;
/** Corners and outlines ("arch" is the rose design's and no one else's). */
export const SHAPES = ["sharp", "soft", "round", "pill", "organic", "cut", "ticket", "circle"] as const;
/** What surfaces are made of. */
export const SURFACES = ["flat", "paper", "glass", "layered", "outline", "gradient", "grain", "neumorph"] as const;
/** How pictures are shown. */
export const IMAGERY = ["bleed", "cutout", "framed", "circle", "duotone", "polaroid", "block", "mosaic"] as const;
export const ICONS = ["line", "filled", "duotone", "hand", "pixel", "sticker"] as const;
/** How things move (types.ts MotionStyle). */
export const MOTIONS = ["editorial", "precise", "arcade", "soft", "bouncy", "luxe", "sporty"] as const;
/** The drawings: backdrops, dividers, ornaments (types.ts SvgKit). */
export const MOTIFS = [
  "deco", "circuit", "neon", "organic", "candy", "pixel", "arena", "synth", "fantasy", "space", "glitch", "zen", "frost", "ember",
  "brush", "ink", "silk", "facet", "wave", "botanic", "steam", "paw", "track", "vinyl", "arabesque", "cloud", "mono",
] as const;
/** Product cards (the first nine exist as types.ts CardStyle; "arch" is the rose design's). */
export const CARDS = ["portrait", "spec", "angled", "sticker", "pixel", "frame", "book", "minimal", "tile", "overlay", "list", "polaroid", "round"] as const;
export const HEADERS = ["classic", "centered", "split", "mega", "minimal", "sidebar", "floating", "twotier"] as const;
export const FOOTERS = ["columns", "bigcta", "minimal", "newsletter", "map", "block"] as const;
/** How the words sound. */
export const VOICES = ["luxury", "friendly", "expert", "playful", "calm", "bold", "warm", "technical"] as const;
/** The colour system, as a word for people (the palette's own colours are what's compared). */
export const COLOURS = ["mono", "earth", "pastel", "neon", "jewel", "citrus", "nordic", "desert", "ocean", "candy", "blackgold", "clinic", "forest", "sunset", "steel", "royal", "gold"] as const;

export type Words = { ar: string; en: string; he: string };
/** The colours a design starts from (themes/kit.ts tones builds the rest): its mode, the page, the brand, what stands out, the words. */
export type Seed = { mode: "light" | "dark"; bg: string; accent: string; strong: string; ink: string };
export type DNA = {
  archetype: (typeof ARCHETYPES)[number];
  type: (typeof TYPES)[number];
  colours: (typeof COLOURS)[number];
  seed: Seed;
  shape: (typeof SHAPES)[number] | "arch";
  surface: (typeof SURFACES)[number];
  imagery: (typeof IMAGERY)[number];
  icons: (typeof ICONS)[number];
  motion: (typeof MOTIONS)[number];
  motif: (typeof MOTIFS)[number];
  card: (typeof CARDS)[number] | "arch";
  header: (typeof HEADERS)[number];
  footer: (typeof FOOTERS)[number];
  voice: (typeof VOICES)[number];
};
/** The axes compared one by one (the colours are compared by the palette itself). */
export const AXES = ["archetype", "type", "seed", "shape", "surface", "imagery", "icons", "motion", "motif", "card", "header", "footer", "voice"] as const;
export type Axis = (typeof AXES)[number];

export const SECTORS = ["fashion", "beauty", "tech", "home", "food", "health", "kids", "culture", "outdoors", "auto", "pets", "services", "gifts", "general"] as const;
export type Sector = (typeof SECTORS)[number];
/**
 * A kind of store and its design: who it's for, its DNA, the section only it has, and the
 * second layout its "another layout" variant takes (variants.ts).
 */
export type StoreKind = { id: string; sector: Sector; name: Words; dna: DNA; signature: { id: string; name: Words }; alt: { archetype: DNA["archetype"]; imagery: DNA["imagery"] } };
