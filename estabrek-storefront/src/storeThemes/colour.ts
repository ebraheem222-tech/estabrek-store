/**
 * Colour maths for store themes, in OKLab (perceptual: equal steps look equal).
 * remapRose() repaints the rose design's own colours (every one the stylesheet uses,
 * see roseColours.gen.ts) with a theme's palette, keeping each colour's contrast
 * with the page: what was near the page stays near it, what stood out still does,
 * so a dark theme turns dark text light and white cards dark without a rule per colour.
 */
export type Lab = [number, number, number];

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToLab(hex: string): Lab {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(full.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function labToHex([L, A, B]: Lab): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb.map((c) => Math.round(Math.max(0, Math.min(1, gam(Math.max(0, c)))) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export const chroma = ([, a, b]: Lab) => Math.hypot(a, b);
/** Hue in degrees, 0–360. */
export const hue = ([, a, b]: Lab) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
const mixLab = (x: Lab, y: Lab, t: number): Lab => [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t];
export const mix = (a: string, b: string, t: number) => labToHex(mixLab(hexToLab(a), hexToLab(b), Math.max(0, Math.min(1, t))));
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A theme's colours, from the one that sits on the page to the one that stands out most. */
export type Palette = {
  /** The page. */
  bg: string;
  /** Cards and panels on it (white in a light theme). */
  surface: string;
  /** A tint of the accent near the page (chips, soft fills). */
  soft: string;
  /** Lines and borders. */
  line: string;
  /** A brighter tint of the accent for decoration. */
  glow: string;
  /** Quiet text. */
  muted: string;
  /** The brand colour. */
  accent: string;
  /** The accent where it must stand out (buttons, links, headings in colour). */
  strong: string;
  /** Text. */
  ink: string;
  /** What reads on the strong accent (button labels). */
  onStrong: string;
};

// The rose design's own palette at the same places (cinematic.css).
const ROSE = { surface: "#ffffff", bg: "#fff8f4", soft: "#f7dbe6", line: "#efdde5", glow: "#e8b4ce", muted: "#8b6d7b", accent: "#a43b64", strong: "#7d2448", ink: "#462c3b", deep: "#28121e" };
const ROSE_HUE = hue(hexToLab(ROSE.accent));

type Stop = [number, Lab];
const ramp = (stops: Array<[string, string]>): Stop[] =>
  stops.map(([from, to]) => [hexToLab(from)[0], hexToLab(to)] as Stop).sort((a, b) => a[0] - b[0]);
function along(stops: Stop[], L: number): Lab {
  if (L <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (L <= stops[i][0]) {
      const [l0, c0] = stops[i - 1];
      const [l1, c1] = stops[i];
      return mixLab(c0, c1, l1 === l0 ? 0 : (L - l0) / (l1 - l0));
    }
  }
  return stops[stops.length - 1][1];
}

/** The rose design's colours in a theme's palette: { "7d2448": "#…" }. */
export function remapRose(colours: readonly string[], p: Palette): Record<string, string> {
  const dark = hexToLab(p.bg)[0] < 0.5;
  const deepest = mix(p.ink, dark ? "#ffffff" : "#000000", 0.45);
  const neutral = ramp([
    ["#000000", deepest],
    [ROSE.deep, mix(p.ink, deepest, 0.5)],
    [ROSE.ink, p.ink],
    [ROSE.muted, p.muted],
    [ROSE.line, p.line],
    [ROSE.bg, p.bg],
    [ROSE.surface, p.surface],
  ]);
  const brand = ramp([
    ["#000000", deepest],
    ["#4a1c30", mix(p.strong, p.ink, 0.45)],
    [ROSE.strong, p.strong],
    [ROSE.accent, p.accent],
    [ROSE.glow, p.glow],
    [ROSE.soft, p.soft],
    ["#fff0f7", mix(p.soft, p.bg, 0.55)],
    [ROSE.surface, p.surface],
  ]);
  const out: Record<string, string> = {};
  for (const raw of colours) {
    const lab = hexToLab(raw);
    const c = chroma(lab);
    const near = Math.abs(((hue(lab) - ROSE_HUE + 540) % 360) - 180);
    // Rose hues become the accent; greys the neutrals; between, a blend by how colourful.
    const w = smooth(0.02, 0.08, c) * (1 - smooth(45, 75, near));
    let to = mixLab(along(neutral, lab[0]), along(brand, lab[0]), w);
    // Other hues (success green, info blue, gold) keep their colour at the theme's lightness.
    if (c > 0.05 && near >= 75) {
      const L = along(neutral, lab[0])[0];
      const lift = dark ? Math.max(L, 0.62) : Math.min(L, 0.62);
      to = [lift, lab[1], lab[2]];
    }
    out[raw] = labToHex(to);
  }
  return out;
}

/** WCAG contrast of two colours (1–21). */
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const h = hex.replace("#", "");
    const [r, g, bl] = [0, 2, 4].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
