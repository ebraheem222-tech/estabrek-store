/**
 * Mixing the shopper's colours: the colours she tapped on the shop's cards (the last three), or the colours of the
 * pieces in her bag, blended into one colour for the store's theme and drawn as a gradient mesh (a few soft
 * pools of colour) for the header and the small bag.
 *
 * The blend is made in OKLab, where mixing looks right to the eye: rose and lilac make mauve, not grey; the
 * colourfulness is kept (the plain average of two different hues goes dull), and the newest colour weighs most.
 * The mesh's pools are brought to the blend's lightness, so text that reads on the blend reads on all of them.
 */
type Lab = { L: number; a: number; b: number };

const HEX = /^#?[0-9a-f]{6}$/i;
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);
const norm = (hex: string) => `#${hex.replace("#", "").toLowerCase()}`;

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklab(hex: string): Lab {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = toLinear(((n >> 16) & 255) / 255), g = toLinear(((n >> 8) & 255) / 255), b = toLinear((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabToHex({ L, a, b }: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return "#" + rgb.map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, "0")).join("");
}

const chromaOf = (c: Lab) => Math.hypot(c.a, c.b);

/** The weights for colours oldest → newest: the newest counts most (2: 40/60; 3: 20/30/50). */
export function recencyWeights(count: number): number[] {
  if (count <= 1) return [1];
  if (count === 2) return [0.4, 0.6];
  const raw = Array.from({ length: count }, (_, i) => (i === count - 1 ? 0.5 : i === count - 2 ? 0.3 : 0.2 / (count - 2)));
  const sum = raw.reduce((x, y) => x + y, 0);
  return raw.map((w) => w / sum);
}

/**
 * One colour from several (oldest → newest), weighted (by default the newest most). Lightness and colourfulness
 * are the weighted averages; the hue comes from the weighted direction of the colours, or the heaviest colour's
 * when they pull opposite ways (red and green would cancel out to grey).
 */
export function blendColours(hexes: string[], weights?: number[]): string {
  const list = hexes.filter(isHex).map(norm);
  if (!list.length) return "#000000";
  if (list.length === 1) return list[0];
  const w = weights && weights.length === list.length ? weights : recencyWeights(list.length);
  const total = w.reduce((x, y) => x + y, 0) || 1;
  const labs = list.map(hexToOklab);
  let L = 0, a = 0, b = 0, chroma = 0;
  labs.forEach((c, i) => {
    const k = w[i] / total;
    L += c.L * k; a += c.a * k; b += c.b * k; chroma += chromaOf(c) * k;
  });
  let dir = Math.hypot(a, b);
  if (dir < chroma * 0.25) {
    // Opposite hues: the heaviest colour leads.
    const lead = labs[w.indexOf(Math.max(...w))];
    a = lead.a; b = lead.b; dir = chromaOf(lead);
  }
  const scale = dir > 1e-6 ? chroma / dir : 0;
  return oklabToHex({ L, a: a * scale, b: b * scale });
}

/** Each colour brought to a lightness (keeping its hue and colourfulness), so one ink reads on all of them. */
export function atLightness(hex: string, L: number, spread = 0.05): string {
  const c = hexToOklab(hex);
  return oklabToHex({ ...c, L: Math.min(L + spread, Math.max(L - spread, c.L)) });
}

/** Where the pools sit (x% y%), by how many colours there are. */
const SPOTS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [[12, 30], [88, 70]],
  3: [[10, 20], [90, 30], [50, 100]],
  4: [[8, 15], [92, 20], [20, 100], [80, 95]],
};

/**
 * A gradient mesh from the colours: soft radial pools over the blend, each pool at the blend's lightness.
 * `light` lifts all of it towards white (a pastel mesh under dark text: the small bag's head).
 */
export function meshBackground(hexes: string[], { light = 0 }: { light?: number } = {}): string {
  const list = [...new Set(hexes.filter(isHex).map(norm))].slice(-4);
  if (!list.length) return "none";
  const base = blendColours(list);
  const baseLab = hexToOklab(base);
  const target = light ? baseLab.L + (0.95 - baseLab.L) * light : baseLab.L;
  const lift = (hex: string) => {
    const c = hexToOklab(atLightness(hex, target));
    // A lighter mesh keeps less colour, as pastels do.
    return oklabToHex({ L: c.L, a: c.a * (1 - light * 0.55), b: c.b * (1 - light * 0.55) });
  };
  const spots = SPOTS[list.length];
  const pools = list.map((hex, i) => `radial-gradient(circle at ${spots[i][0]}% ${spots[i][1]}%, ${lift(hex)} 0%, transparent 62%)`);
  return `${pools.join(", ")}, linear-gradient(${lift(base)}, ${lift(base)})`;
}

/** Soft pools of light, one per colour (the small bag's glass is lit by the colours of what's in it). */
export function glowPools(hexes: string[]): string {
  const list = [...new Set(hexes.filter(isHex).map(norm))].slice(-4);
  if (!list.length) return "none";
  const spots = SPOTS[list.length];
  return list.map((hex, i) => `radial-gradient(42% 36% at ${spots[i][0]}% ${spots[i][1]}%, color-mix(in srgb, ${hex} 55%, transparent), transparent 75%)`).join(", ");
}

/** Three colours for a dye (the scarf, the films): the mix, the last one repeated when there are fewer. */
export function dyeStops(hexes: string[]): [string, string, string] | null {
  const list = [...new Set(hexes.filter(isHex).map(norm))].slice(-3);
  if (!list.length) return null;
  while (list.length < 3) list.push(list[list.length - 1]);
  return [list[0], list[1], list[2]];
}

/**
 * Colours flowing into each other across a box (2–4 of them, in their order), as a CSS paint: the buttons,
 * headings and dyes of a mix. "none" when fewer than two different colours are left.
 */
export function flowPaint(hexes: string[], angle = 115): string {
  const list = [...new Set(hexes.filter(isHex).map(norm))].slice(-4);
  if (list.length < 2) return "none";
  const from = list.length === 2 ? 15 : 8;
  const at = (i: number) => Math.round(from + ((100 - 2 * from) * i) / (list.length - 1));
  return `linear-gradient(${angle}deg, ${list.map((c, i) => `${c} ${at(i)}%`).join(", ")})`;
}

/** The dye as a CSS paint: the colours flowing across (for the photo and film tints over pictures). */
export function dyePaint(hexes: string[]): string {
  return flowPaint([...new Set(hexes.filter(isHex).map(norm))].slice(-3));
}

/**
 * How much a picture dyed in a colour is also deepened (0–0.6): the "color" blend alone keeps the fabric's own
 * brightness, so navy came out pale lavender and wine pink. A dark colour adds a multiply layer, a light one none.
 */
export function dyeDepth(hex: string): string {
  const n = parseInt(norm(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => toLinear(c / 255));
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return Math.max(0, Math.min(0.6, ((0.55 - l) / 0.55) * 0.6)).toFixed(2);
}

/**
 * A colour deep enough for text on the page's light surfaces (no lighter than `L` in OKLab, about 6:1 on
 * them), its colourfulness capped so a bright pick reads calm: pink → deep raspberry, sky → deep blue,
 * black and navy stay themselves.
 */
export function deepInk(hex: string, L = 0.4, maxChroma = 0.13): string {
  const c = hexToOklab(norm(hex));
  const chroma = chromaOf(c);
  const k = chroma > maxChroma ? maxChroma / chroma : 1;
  return oklabToHex({ L: Math.min(c.L, L), a: c.a * k, b: c.b * k });
}

/** The colours the store wears now (the mix, or the one colour), from the page (RoseThemeProvider writes them). */
export function currentColours(): string[] {
  if (typeof document === "undefined") return [];
  const d = document.documentElement.dataset;
  const mix = (d.colourMix ?? "").split(" ").filter(isHex);
  if (mix.length > 1) return mix;
  return isHex(d.storefrontColor) ? [d.storefrontColor] : [];
}

/** Sent on window with the colours the store wears after each pick ({ colours }): the dyes follow it. */
export const COLOURS_EVENT = "storefront-colours";

/* ---------------- Her mix of card colours (this device) ---------------- */

const MIX_KEY = "estabrek_theme_mix";
export const MIX_MAX = 3;

export function readMix(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MIX_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter(isHex).map(norm).slice(-MIX_MAX) : [];
  } catch {
    return [];
  }
}

export function saveMix(mix: string[]) {
  try {
    if (mix.length > 1) localStorage.setItem(MIX_KEY, JSON.stringify(mix));
    else localStorage.removeItem(MIX_KEY);
  } catch {
    /* storage blocked: the mix lasts this page */
  }
}

/** The mix with a newly tapped colour: it moves to the newest place (once), the oldest drops past three. */
export function addToMix(mix: string[], hex: string): string[] {
  const c = norm(hex);
  return [...mix.filter((x) => x !== c), c].slice(-MIX_MAX);
}
