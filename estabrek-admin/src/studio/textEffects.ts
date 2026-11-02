/**
 * Ready effects for words: each one a set of the word keys the page already has (outline,
 * gradient paint, shadows, glow, a line under), so the shop draws them with no new CSS.
 * Picking one replaces the words' paint; `look` ones (capitals, weight, spacing) can't be
 * a state's (a state never changes size or letters).
 */
import { tr } from "../lib/words";

type Obj = Record<string, unknown>;
/** The keys an effect paints with; picking one clears the others. */
export const PAINT_KEYS = ["stroke", "fill", "shadows", "glow", "decoration"] as const;
const shade = (x: number, y: number, blur: number, color: string) => ({ x, y, blur, color });

export type TextEffect = { key: string; name: () => string; paint: Obj; look?: Obj };
export const TEXT_EFFECTS: TextEffect[] = [
  { key: "outline", name: () => tr("مفرّغ", "Outline"), paint: { stroke: { width: 1.5, color: "accent" }, fill: { color: "transparent", to: "transparent" } } },
  { key: "outline-shadow", name: () => tr("مفرّغ بظل", "Outline with shadow"), paint: { stroke: { width: 1.5, color: "text" }, fill: { color: "transparent", to: "transparent" }, shadows: [shade(4, 4, 0, "accent")] } },
  { key: "gradient", name: () => tr("تدرّج المتجر", "Store gradient"), paint: { fill: { color: "accent", to: "#f59e0b", angle: 90 } } },
  { key: "sunset", name: () => tr("غروب", "Sunset"), paint: { fill: { color: "#f43f5e", via: "#f97316", to: "#facc15", angle: 90 } } },
  { key: "ocean", name: () => tr("بحر", "Ocean"), paint: { fill: { color: "#06b6d4", via: "#3b82f6", to: "#8b5cf6", angle: 90 } } },
  { key: "chrome", name: () => tr("كروم", "Chrome"), paint: { fill: { color: "#f3f4f6", via: "#6b7280", to: "#f9fafb", angle: 180 }, shadows: [shade(0, 1, 0, "#00000033")] } },
  { key: "gold", name: () => tr("ذهبي", "Gold"), paint: { fill: { color: "#fde68a", via: "#b45309", to: "#fcd34d", angle: 180 }, shadows: [shade(0, 1, 1, "#78350f55")] } },
  { key: "neon", name: () => tr("نيون", "Neon"), paint: { shadows: [shade(0, 0, 2, "#ffffff"), shade(0, 0, 8, "accent"), shade(0, 0, 20, "accent")], glow: { color: "accent", size: 16 } } },
  { key: "glow", name: () => tr("توهّج ناعم", "Soft glow"), paint: { glow: { color: "accent-soft", size: 24 } } },
  { key: "raised", name: () => tr("بارز 3D", "Raised 3D"), paint: { shadows: [1, 2, 3, 4].map((i) => shade(i, i, 0, `#000000${["55", "44", "33", "22"][i - 1]}`)) } },
  { key: "long", name: () => tr("ظل طويل", "Long shadow"), paint: { shadows: [shade(3, 3, 0, "accent-soft"), shade(6, 6, 0, "accent-soft"), shade(9, 9, 0, "#00000014"), shade(12, 12, 0, "#0000000d")] } },
  { key: "emboss", name: () => tr("محفور", "Pressed in"), paint: { shadows: [shade(0, 1, 0, "#ffffffcc"), shade(0, -1, 0, "#00000040")] } },
  { key: "fire", name: () => tr("نار", "Fire"), paint: { shadows: [shade(0, -2, 4, "#facc15"), shade(0, -4, 10, "#f97316"), shade(0, -8, 20, "#ef4444")] } },
  { key: "ice", name: () => tr("ثلج", "Ice"), paint: { shadows: [shade(0, 0, 6, "#a5f3fc"), shade(0, 0, 14, "#38bdf8")] } },
  { key: "split", name: () => tr("ألوان مزاحة", "Split colours"), paint: { shadows: [shade(-2, 0, 0, "#ff0050"), shade(2, 0, 0, "#00e5ff")] } },
  { key: "marker", name: () => tr("قلم تظليل", "Highlighter"), paint: { decoration: { line: "underline", style: "solid", color: "accent-soft", width: 12, offset: -8 } } },
  { key: "wavy", name: () => tr("خط متموّج", "Wavy line"), paint: { decoration: { line: "underline", style: "wavy", color: "accent", width: 2, offset: 6 } } },
  { key: "double", name: () => tr("خطين تحت", "Double line"), paint: { decoration: { line: "underline", style: "double", color: "accent", width: 3, offset: 6 } } },
  { key: "comic", name: () => tr("كوميك", "Comic"), paint: { stroke: { width: 2, color: "black" }, shadows: [shade(3, 3, 0, "black")] }, look: { weight: 900, caps: "upper" } },
  { key: "spaced", name: () => tr("أحرف متباعدة", "Spaced capitals"), paint: {}, look: { caps: "upper", letterSpacing: 4 } },
];

/** What picking an effect changes: its paint (the others cleared) and, outside a state, its look. */
export function effectPatch(e: TextEffect, inState: boolean): Obj {
  const patch: Obj = Object.fromEntries(PAINT_KEYS.map((k) => [k, e.paint[k] ?? null]));
  return inState ? patch : { ...patch, ...e.look };
}
/** The effect the words carry now, if their paint is exactly one. */
export function effectOf(look: (k: string) => unknown): string | undefined {
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  return TEXT_EFFECTS.find((e) => PAINT_KEYS.every((k) => same(look(k), e.paint[k])) && Object.keys(e.paint).length)?.key;
}

// How the theme's colours look in the editor's previews (the rose design's).
const SHOWN: Record<string, string> = { text: "#3b2530", muted: "#8d7380", accent: "#c86b98", "accent-soft": "#f6d6e4", "accent-contrast": "#ffffff", bg: "#fff8f4", surface: "#ffffff", border: "#e7d6dd", white: "#ffffff", black: "#000000", transparent: "transparent" };
const c = (v: unknown) => SHOWN[String(v)] ?? String(v);
/** An effect as inline CSS for its button in the editor. */
export function effectPreview(e: TextEffect): Record<string, string> {
  const p = e.paint as Record<string, Obj & Obj[]>;
  const css: Record<string, string> = {};
  if (p.stroke) css.WebkitTextStroke = `${p.stroke.width}px ${c(p.stroke.color)}`;
  if (p.fill) {
    css.backgroundImage = `linear-gradient(${p.fill.angle ?? 90}deg,${[p.fill.color, p.fill.via, p.fill.to].filter(Boolean).map(c).join(",")})`;
    css.WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.WebkitTextFillColor = "transparent";
  }
  const shadows = [...((p.shadows as unknown as Obj[]) ?? []).map((s) => `${s.x}px ${s.y}px ${s.blur}px ${c(s.color)}`), ...(p.glow ? [`0 0 ${p.glow.size}px ${c(p.glow.color)}`] : [])];
  if (shadows.length) css.textShadow = shadows.join(",");
  if (p.decoration) {
    css.textDecoration = `underline ${p.decoration.style} ${c(p.decoration.color)} ${p.decoration.width}px`;
    css.textUnderlineOffset = `${p.decoration.offset}px`;
  }
  if (e.look?.weight) css.fontWeight = String(e.look.weight);
  if (e.look?.caps === "upper") css.textTransform = "uppercase";
  if (e.look?.letterSpacing) css.letterSpacing = `${e.look.letterSpacing}px`;
  return css;
}
