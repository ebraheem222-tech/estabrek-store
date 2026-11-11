/**
 * The store's colour engine settings (Admin → الإعدادات → الثيم والألوان), read by the palette and by the scenes:
 * - which scenes dress the page in their colour while they hold the screen (the header and the page around them),
 *   and whether a product page takes its piece's colour;
 * - how strongly a colour tints the page's surfaces (soft, normal, strong).
 * Readability needs no setting: every colour goes through storefrontPalette, which keeps text, lines and buttons
 * readable on the surfaces it makes, and the opening film's line colours are kept readable too (readableOnLight).
 *
 * Set once from the store's settings (StorefrontFeaturesProvider) before any palette is made.
 */
export type SceneColourKey = "particles" | "seasons" | "collections" | "stories" | "world" | "rooms" | "product";
export type ColourStrength = "soft" | "normal" | "strong";

export const SCENE_COLOUR_KEYS: readonly SceneColourKey[] = ["particles", "seasons", "collections", "stories", "world", "rooms", "product"];
export const COLOUR_STRENGTHS: readonly ColourStrength[] = ["soft", "normal", "strong"];
/** How far the surfaces lean to the colour, against the normal. */
export const STRENGTH_SCALE: Record<ColourStrength, number> = { soft: 0.55, normal: 1, strong: 1.6 };

let scenes: Partial<Record<SceneColourKey, boolean>> = {};
let strength: ColourStrength = "normal";
let blend = true;

export function setColourEngine(next: { scenes?: Partial<Record<SceneColourKey, boolean>>; strength?: ColourStrength; blend?: boolean }) {
  if (next.scenes) scenes = next.scenes;
  if (next.strength) strength = next.strength;
  if (typeof next.blend === "boolean") blend = next.blend;
}

/** Colours tapped on the shop's cards blend into one (lib/colourMix.ts), unless the owner switched it off. */
export function colourBlendOn() {
  return blend;
}

/** True unless the owner switched this scene's colour off. */
export function sceneColoursOn(key: SceneColourKey | string) {
  return scenes[key as SceneColourKey] !== false;
}

export function colourStrength(): ColourStrength {
  return strength;
}

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}

/**
 * A text colour chosen in the admin, kept readable on the store's light page: darkened step by step until it has
 * at least `ratio` contrast with `page` (3:1 for large titles). Colours that already read well are left as they are.
 */
export function readableOnLight(hex: string, page = "#fff8f4", ratio = 3) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const mix = (a: string, b: string, t: number) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");
  const contrast = (a: string) => { const x = luminance(a), y = luminance(page); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  let out = hex;
  for (let t = 0.05; contrast(out) < ratio && t <= 1; t += 0.05) out = mix(hex, "#15131b", t);
  return out;
}
