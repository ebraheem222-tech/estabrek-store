/**
 * Colour and scale maths for the store's design variables, shared by the editor and its tests:
 *  - a colour as OKLCH (lightness, colourfulness, hue: a space where equal steps look equal) and back, kept inside
 *    what a screen can show by calming its colourfulness, never by bending its hue;
 *  - how well two colours read on each other (the WCAG 2 contrast ratio, 1 to 21) and the grade that earns;
 *  - a tonal scale from one colour: the same hue from nearly white to nearly black, with the colour itself in it;
 *  - the colours that go with one (its complement, its neighbours, a triad, a split complement);
 *  - a modular scale (base × ratio^n) for spaces and sizes.
 * Plain TypeScript: no React, no "@/" imports (the admin imports it by path).
 */

export type Lch = { L: number; C: number; h: number };
type Rgb = [number, number, number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const isHexColour = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

/** A hex colour's red, green and blue (0–1, as written: gamma-encoded); its transparency is left out. */
function rgbOf(hex: string): Rgb | null {
  if (!isHexColour(hex)) return null;
  const h = hex.length === 4 ? hex.slice(1).split("").map((c) => c + c).join("") : hex.slice(1, 7);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
}
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hex2 = (c: number) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0");
const turn = (h: number) => ((h % 360) + 360) % 360;

/** OKLCH of a hex colour (L 0–1, C from 0 to about 0.37, h in degrees), or null when it isn't one. */
export function hexToLch(hex: string): Lch | null {
  const rgb = rgbOf(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  return { L, C, h: C < 1e-4 ? 0 : turn((Math.atan2(B, A) * 180) / Math.PI) };
}

/** Linear red, green and blue of an OKLCH colour: outside 0–1 when a screen can't show it. */
function linearOf({ L, C, h }: Lch): Rgb {
  const A = C * Math.cos((h * Math.PI) / 180), B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const shows = (rgb: Rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/**
 * The most colourful colour a screen can show at this lightness and hue, no more colourful than asked: the
 * colourfulness is halved in on (a bisection), so the hue and the lightness stay what they were.
 */
export function inGamut(lch: Lch): Lch {
  const L = Math.max(0, Math.min(1, lch.L));
  const at = { L, C: Math.max(0, lch.C), h: turn(lch.h) };
  if (shows(linearOf(at))) return at;
  let lo = 0, hi = at.C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (shows(linearOf({ ...at, C: mid }))) lo = mid; else hi = mid;
  }
  return { ...at, C: lo };
}

/** An OKLCH colour as hex, brought inside what a screen can show first. */
export function lchToHex(lch: Lch): string {
  return `#${linearOf(inGamut(lch)).map((c) => hex2(toGamma(Math.max(0, Math.min(1, c))))).join("")}`;
}

/** How bright a colour is to the eye (WCAG 2's relative luminance, 0 black to 1 white); null when it isn't one. */
export function luminance(hex: string): number | null {
  const rgb = rgbOf(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** How well two colours read on each other: 1 (the same) to 21 (black on white); null when one isn't a colour. */
export function contrast(a: string, b: string): number | null {
  const x = luminance(a), y = luminance(b);
  if (x === null || y === null) return null;
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export type ContrastGrade = "AAA" | "AA" | "large" | "fail";
/** What a contrast earns: AAA from 7, AA from 4.5 (any text), "large" from 3 (big text, icons, edges), else it fails. */
export const contrastGrade = (ratio: number): ContrastGrade => (ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "large" : "fail");

/** Which of two inks reads better on a background (white and near-black unless told). */
export function readableOn(bg: string, light = "#ffffff", dark = "#111111"): string {
  return (contrast(bg, light) ?? 0) >= (contrast(bg, dark) ?? 0) ? light : dark;
}

/** The steps of a tonal scale and the lightness each one aims at. */
export const TONES: ReadonlyArray<readonly [number, number]> = [[50, 0.97], [100, 0.93], [200, 0.87], [300, 0.79], [400, 0.7], [500, 0.61], [600, 0.52], [700, 0.43], [800, 0.34], [900, 0.25]];
export type Tone = { step: number; value: string; own: boolean };

/**
 * A tonal scale from one colour: its hue from nearly white (50) to nearly black (900). The colour itself takes the
 * step nearest its own lightness (`own`), untouched; the others keep its colourfulness in the middle and calm it
 * towards both ends (a sine over the lightness), then come inside what a screen shows. A grey gives greys.
 */
export function tonalScale(hex: string): Tone[] {
  const base = hexToLch(hex);
  if (!base) return [];
  const nearest = TONES.reduce((best, t) => (Math.abs(t[1] - base.L) < Math.abs(best[1] - base.L) ? t : best), TONES[0]);
  return TONES.map(([step, L]) => {
    if (step === nearest[0]) return { step, value: hex.length === 4 ? lchToHex(base) : hex.slice(0, 7).toLowerCase(), own: true };
    const calm = Math.min(1, 1.6 * Math.sin(Math.PI * L));
    return { step, value: lchToHex({ L, C: base.C * calm, h: base.h }), own: false };
  });
}

export const HARMONIES = ["complement", "neighbours", "triad", "split"] as const;
export type Harmony = (typeof HARMONIES)[number];
const TURNS: Record<Harmony, number[]> = { complement: [180], neighbours: [-30, 30], triad: [120, 240], split: [150, 210] };

/**
 * The colours that go with one: its hue turned round the wheel, the same lightness and colourfulness. A colour with
 * no hue to turn (black, white, a grey) has none.
 */
export function harmony(hex: string, kind: Harmony): string[] {
  const base = hexToLch(hex);
  if (!base || base.C < 0.02) return [];
  return TURNS[kind].map((by) => lchToHex({ ...base, h: base.h + by }));
}

/** The ratios a scale can grow by, from music and the golden section. */
export const SCALE_RATIOS: ReadonlyArray<{ id: string; ratio: number }> = [
  { id: "major-second", ratio: 1.125 }, { id: "minor-third", ratio: 1.2 }, { id: "major-third", ratio: 1.25 }, { id: "fourth", ratio: 4 / 3 },
  { id: "fifth", ratio: 1.5 }, { id: "golden", ratio: (1 + Math.sqrt(5)) / 2 }, { id: "octave", ratio: 2 },
];

/**
 * A modular scale: `count` values, each `ratio` times the one before it, starting at `base`; rounded to whole
 * pixels (or to `round`), never two the same, and kept between 0 and `max`.
 */
export function modularScale(base: number, ratio: number, count: number, { round = 1, max = 400 }: { round?: number; max?: number } = {}): number[] {
  if (!(base > 0) || !(ratio > 1) || !(count > 0)) return [];
  const out: number[] = [];
  for (let i = 0; i < Math.min(count, 24); i++) {
    const raw = Math.round((base * ratio ** i) / round) * round;
    const value = Math.min(max, Math.max(out.length ? out[out.length - 1] + round : round, raw));
    if (out.length && value <= out[out.length - 1]) break;
    out.push(Math.round(value * 100) / 100);
  }
  return out;
}
