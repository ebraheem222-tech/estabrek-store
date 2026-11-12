/**
 * A page tree's styles as one CSS block: each node gets `.pt-<id>`, with its
 * tablet and phone values in media queries. Every value is checked again here
 * (numbers in range, lengths, theme colours or hex) and anything else is dropped,
 * so a bad saved value can't become CSS. Sides follow the text direction
 * (padding-inline-start…), so the same tree is right in Arabic, Hebrew and English.
 */
import { STATES, TREE_TRANSFORM, TREE_TRANSFORM_REST, framed, lookNode, lookSelector, looksOf, motionOf, type PageTree, type Screen, type ScreenStyle, type SiteStyle, type SizeConstraints, type TreeNode } from "./tree";
import { fontFaceCss, fontStack } from "./fonts";
import { tokenVar } from "./designTokens";
import { SLIDER_EFFECT_CSS } from "./sliderEffectCss";
import { SLIDER_LOOK_CSS } from "./sliderLookCss";
import { layersOf, type PieceLayerSpec } from "./pieces";

export const TABLET_MAX = 1023.98;
export const PHONE_MAX = 639.98;

const TOKENS: Record<string, string> = {
  text: "var(--text)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  "accent-soft": "var(--accent-soft)",
  "accent-contrast": "var(--accent-contrast,#fff)",
  bg: "var(--bg)",
  surface: "var(--surface)",
  border: "var(--border)",
  white: "#fff",
  black: "#000",
  transparent: "transparent",
};
const SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,.08)",
  md: "0 8px 24px rgba(0,0,0,.10)",
  lg: "0 20px 48px rgba(0,0,0,.14)",
};
const JUSTIFY: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around" };
const ALIGN: Record<string, string> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
/** A shape clips what's inside it (a picture or clip takes it too). */
const SHAPES: Record<string, string[]> = {
  rect: ["border-radius:0"],
  rounded: ["border-radius:24px", "overflow:hidden"],
  pill: ["border-radius:999px", "overflow:hidden"],
  arch: ["border-radius:999px 999px 0 0", "overflow:hidden"],
  circle: ["border-radius:50%", "aspect-ratio:1/1", "overflow:hidden"],
};
/**
 * The other shapes cut it with a mask: an outline on a 100×100 square stretched to the
 * element's box (the editor's studio/cutShapes.ts draws the same outlines for its buttons).
 */
export const MASKS: Record<string, string> = {
  hexagon: "M25 3L75 3L100 50L75 97L25 97L0 50Z",
  octagon: "M30 0H70L100 30V70L70 100H30L0 70V30Z",
  diamond: "M50 0L100 50L50 100L0 50Z",
  triangle: "M50 0L100 100H0Z",
  pentagon: "M50 0L100 38L81 100H19L0 38Z",
  star: "M50 0L61.8 35.4H98.1L68.7 57.3L79.9 92.7L50 70.8L20.1 92.7L31.3 57.3L1.9 35.4H38.2Z",
  heart: "M50 92C20 70 0 52 0 30C0 13 13 2 27 2C38 2 46 8 50 17C54 8 62 2 73 2C87 2 100 13 100 30C100 52 80 70 50 92Z",
  blob: "M50 4C62.4 3.5 82.3 9.6 89.1 18.8C95.9 28 94 46.9 90.9 59.3C87.9 71.8 81 88.6 71 93.7C61 98.7 42.5 95.1 30.9 89.6C19.3 84.2 3.9 72.4 1.3 61.1C-1.4 49.8 6.7 31.5 14.8 21.9C22.9 12.4 37.6 4.5 50 4Z",
  blob2: "M50 0C61.4 -0.1 77.8 17.7 84.6 30C91.5 42.3 96.9 63.3 91.1 73.8C85.4 84.3 64.1 92.8 50 93C35.9 93.2 12.3 85.4 6.7 75C1.1 64.6 9 43 16.2 30.5C23.4 18 38.6 0.1 50 0Z",
  flower: "M50 0C55.1 0 59.4 10.6 65.3 13C71.2 15.5 81.7 11 85.4 14.6C89 18.3 84.5 28.8 87 34.7C89.4 40.6 100 44.9 100 50C100 55.1 89.4 59.4 87 65.3C84.5 71.2 89 81.7 85.4 85.4C81.7 89 71.2 84.5 65.3 87C59.4 89.4 55.1 100 50 100C44.9 100 40.6 89.4 34.7 87C28.8 84.5 18.3 89 14.6 85.4C11 81.7 15.5 71.2 13 65.3C10.6 59.4 0 55.1 0 50C0 44.9 10.6 40.6 13 34.7C15.5 28.8 11 18.3 14.6 14.6C18.3 11 28.8 15.5 34.7 13C40.6 10.6 44.9 0 50 0Z",
  leaf: "M0 100C0 40 40 0 100 0C100 60 60 100 0 100Z",
  drop: "M50 0C70 30 95 48 95 66A45 34 0 0 1 5 66C5 48 30 30 50 0Z",
  shield: "M50 0L95 14V50C95 75 75 92 50 100C25 92 5 75 5 50V14Z",
  squircle: "M50 0C90 0 100 10 100 50C100 90 90 100 50 100C10 100 0 90 0 50C0 10 10 0 50 0Z",
  ticket: "M0 0H100V40A10 10 0 0 0 100 60V100H0V60A10 10 0 0 0 0 40Z",
  bubble: "M10 0H90A10 10 0 0 1 100 10V70A10 10 0 0 1 90 80H35L15 100V80H10A10 10 0 0 1 0 70V10A10 10 0 0 1 10 0Z",
  plus: "M35 0H65V35H100V65H65V100H35V65H0V35H35Z",
  slant: "M20 0H100L80 100H0Z",
  wave: "M0 0H100V86C83 100 67 72 50 86C33 100 17 72 0 86Z",
  tilt: "M0 0H100V84L0 100Z",
};
const SHAPE_NAMES = [...Object.keys(SHAPES), ...Object.keys(MASKS)];
const maskUrl = (d: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;

/**
 * A pattern over the background in one colour (its strength from `opacity`), drawn with
 * gradients so a theme colour works: [layers, their sizes, their places].
 */
export const PATTERNS = ["dots", "polka", "grid", "lines", "columns", "diagonal", "stripes", "checks", "hatch", "zigzag", "rings", "triangles"] as const;
function patternOf(p: unknown): [string, string, string] | undefined {
  const o = obj(p);
  const kind = pick(o?.kind, PATTERNS);
  const c0 = color(o?.color);
  const s = num(o?.size, 4, 200);
  if (!o || !kind || !c0 || s === undefined) return undefined;
  const op = num(o.opacity, 0, 1);
  const c = op === undefined || op === 1 ? c0 : `color-mix(in srgb,${c0} ${Math.round(op * 100)}%,transparent)`;
  const t = "transparent";
  const r = +(s * 0.12).toFixed(1);
  const w = Math.max(1, +(s * 0.06).toFixed(1));
  const at = (x: string, n: number) => Array(n).fill(x).join(",");
  switch (kind) {
    case "dots":
      return [`radial-gradient(${c} ${r}px,${t} ${r + 0.6}px)`, `${s}px ${s}px`, "0 0"];
    case "polka":
      return [at(`radial-gradient(${c} ${r}px,${t} ${r + 0.6}px)`, 2), at(`${s}px ${s}px`, 2), `0 0,${s / 2}px ${s / 2}px`];
    case "grid":
      return [`linear-gradient(${c} ${w}px,${t} ${w}px),linear-gradient(90deg,${c} ${w}px,${t} ${w}px)`, at(`${s}px ${s}px`, 2), "0 0,0 0"];
    case "lines":
      return [`linear-gradient(${c} ${w}px,${t} ${w}px)`, `100% ${s}px`, "0 0"];
    case "columns":
      return [`linear-gradient(90deg,${c} ${w}px,${t} ${w}px)`, `${s}px 100%`, "0 0"];
    case "diagonal":
      return [`repeating-linear-gradient(45deg,${c} 0 ${w}px,${t} ${w}px ${s}px)`, "auto", "0 0"];
    case "stripes":
      return [`repeating-linear-gradient(-45deg,${c} 0 ${s / 2}px,${t} ${s / 2}px ${s}px)`, "auto", "0 0"];
    case "checks":
      return [`conic-gradient(${c} 25%,${t} 0 50%,${c} 0 75%,${t} 0)`, `${s}px ${s}px`, "0 0"];
    case "hatch":
      return [`repeating-linear-gradient(45deg,${c} 0 ${w}px,${t} ${w}px ${s}px),repeating-linear-gradient(-45deg,${c} 0 ${w}px,${t} ${w}px ${s}px)`, "auto,auto", "0 0,0 0"];
    case "zigzag":
      return [
        `linear-gradient(135deg,${c} 25%,${t} 25%),linear-gradient(225deg,${c} 25%,${t} 25%),linear-gradient(315deg,${c} 25%,${t} 25%),linear-gradient(45deg,${c} 25%,${t} 25%)`,
        at(`${s}px ${s}px`, 4),
        `${-s / 2}px 0,${-s / 2}px 0,0 0,0 0`,
      ];
    case "rings":
      return [`radial-gradient(${t} ${(s * 0.28).toFixed(1)}px,${c} ${(s * 0.28).toFixed(1)}px ${(s * 0.28 + w).toFixed(1)}px,${t} ${(s * 0.28 + w + 0.6).toFixed(1)}px)`, `${s}px ${s}px`, "0 0"];
    case "triangles":
      return [`linear-gradient(45deg,${c} 50%,${t} 50%)`, `${s}px ${s}px`, "0 0"];
  }
}

const BLENDS = ["normal", "multiply", "screen", "overlay", "soft-light", "color", "luminosity"] as const;
const ANCHORS: Record<string, [number, number]> = {
  "top-start": [0, 0], top: [50, 0], "top-end": [100, 0],
  start: [0, 50], center: [50, 50], end: [100, 50],
  "bottom-start": [0, 100], bottom: [50, 100], "bottom-end": [100, 100],
};
const ORIGINS: Record<string, string> = { center: "50% 50%", top: "50% 0%", bottom: "50% 100%" };
/** The fonts a text can take: the theme's two, or a family of its own. */
const FONTS: Record<string, string> = {
  heading: "var(--pt-font-heading)",
  body: "inherit",
  serif: "\"Noto Naskh Arabic\",\"Frank Ruhl Libre\",Georgia,\"Times New Roman\",serif",
  sans: "system-ui,-apple-system,\"Segoe UI\",Tahoma,Arial,sans-serif",
  mono: "ui-monospace,Consolas,\"Courier New\",monospace",
};
/** Its glow is a light around the letters, not around the box. */
const TEXTISH = new Set(["heading", "text", "icon"]);
/** Words that can be cut to a number of lines or set in columns (a box that is only text). */
const WORDS = new Set(["heading", "text"]);
const CAPS: Record<string, string> = { none: "text-transform:none", upper: "text-transform:uppercase", lower: "text-transform:lowercase", title: "text-transform:capitalize", small: "font-variant-caps:small-caps" };
const LINES: Record<string, string> = { none: "none", underline: "underline", overline: "overline", through: "line-through" };
/** How a state change speeds up and slows down (the motion's names, as CSS). */
export const EASE_CSS: Record<string, string> = {
  smooth: "cubic-bezier(.2,.7,.2,1)",
  soft: "cubic-bezier(.45,0,.55,1)",
  strong: "cubic-bezier(.7,0,.2,1)",
  back: "cubic-bezier(.34,1.56,.64,1)",
  elastic: "cubic-bezier(.68,-.6,.32,1.6)",
  bounce: "cubic-bezier(.5,1.8,.5,.8)",
  linear: "linear",
};
/** What a state may change (the backend's StateStyle): never the size or place, so nothing around it jumps. */
export const STATE_KEYS = new Set([
  "bg", "gradient", "backdrop", "color", "radius", "border", "shadow", "opacity", "weight", "letterSpacing", "wordSpacing", "decoration",
  "stroke", "fill", "shadows", "filters", "rotateX", "rotateY", "rotateZ", "scale", "moveX", "moveY", "overlay", "shade", "glow",
]);
/** The CSS properties a state's keys change, for the element's transition (only those, so a motion's own fade isn't slowed). */
const STATE_PROPS: Record<string, string[]> = {
  bg: ["background-color"],
  color: ["color", "-webkit-text-fill-color"],
  radius: ["border-radius"],
  border: ["border-color", "border-width"],
  shadow: ["box-shadow"],
  shade: ["box-shadow", "filter"],
  glow: ["box-shadow", "text-shadow"],
  shadows: ["text-shadow"],
  opacity: ["opacity"],
  weight: ["font-weight"],
  letterSpacing: ["letter-spacing"],
  wordSpacing: ["word-spacing"],
  decoration: ["text-decoration-color"],
  stroke: ["-webkit-text-stroke-color", "-webkit-text-stroke-width"],
  filters: ["filter"],
  backdrop: ["backdrop-filter"],
  rotateX: ["--pt-rx"],
  rotateY: ["--pt-ry"],
  rotateZ: ["--pt-rz"],
  scale: ["--pt-s"],
  moveX: ["--pt-x"],
  moveY: ["--pt-y"],
};
/** The look's own turn and move as typed values, so a state can glide to them (each element sets its own: they don't inherit). */
const TURN_PROPERTIES =
  '@property --pt-x{syntax:"<length>";inherits:false;initial-value:0px}@property --pt-y{syntax:"<length>";inherits:false;initial-value:0px}' +
  '@property --pt-rx{syntax:"<angle>";inherits:false;initial-value:0deg}@property --pt-ry{syntax:"<angle>";inherits:false;initial-value:0deg}' +
  '@property --pt-rz{syntax:"<angle>";inherits:false;initial-value:0deg}@property --pt-s{syntax:"<number>";inherits:false;initial-value:1}';
/** A colour layer goes over these (a picture, a clip, slides) and under the words of anything else. */
const MEDIA = new Set(["image", "video", "slider"]);

const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
/** A theme colour or a hex one, as CSS (anything else: undefined). */
export const color = (v: unknown) =>
  typeof v === "string" ? (TOKENS[v] ?? (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ? v : tokenVar(v, "colors"))) : undefined;
const length = (v: unknown) => (typeof v === "string" && /^(auto|\d{1,4}(\.\d{1,6})?(px|%|rem|vw|vh))$/.test(v) ? v : undefined);
const place = (v: unknown) => (typeof v === "string" && /^(span \d{1,2}|-?\d{1,2} \/ (-?\d{1,2}|span \d{1,2}))$/.test(v) ? v : undefined);
const pick = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const obj = (v: unknown): Record<string, any> | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : undefined);

/** Validate each field before merging, so malformed overrides cannot erase a valid bound. */
function checkedConstraints(raw: unknown): SizeConstraints {
  const source = obj(raw), clean: SizeConstraints = {};
  if (!source) return clean;
  for (const key of ["minWidth", "maxWidth", "minHeight", "maxHeight", "aspectRatio"] as const) {
    const value = num(source[key], key === "aspectRatio" ? .01 : 8, key === "aspectRatio" ? 100 : 9999);
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

/** Reassert inherited hard dimensions after a screen's ordinary size controls. */
function screenDeclarations(style: Partial<Record<Screen, ScreenStyle>> | undefined, screen: Screen, type: string): string[] {
  const constraints: SizeConstraints = {};
  for (const current of ["base", "tablet", "mobile"] as const) {
    Object.assign(constraints, checkedConstraints(style?.[current]?.constraints));
    if (current === screen) break;
  }
  const own = style?.[screen];
  return declarations(Object.keys(constraints).length ? { ...own, constraints } : own, type);
}
/** Two or three colours along an angle ("linear-gradient(90deg,a,b,c)"), or from the middle out. */
function gradientOf(g: unknown, radial = false): string | undefined {
  const o = obj(g);
  if (!o) return undefined;
  const [a, via, b] = [color(o.color), o.via === undefined ? undefined : color(o.via), color(o.to)];
  if (!a || !b || (o.via !== undefined && !via)) return undefined;
  const stops = [a, via, b].filter(Boolean).join(",");
  return radial ? `radial-gradient(circle at 50% 50%,${stops})` : `linear-gradient(${Math.round(num(o.angle, 0, 360) ?? 180)}deg,${stops})`;
}
/** Where a mesh's colours sit: two in opposite corners, three around, four in the corners. */
const MESH_AT: Record<number, string[]> = { 2: ["0% 0%", "100% 100%"], 3: ["0% 0%", "100% 0%", "50% 100%"], 4: ["0% 0%", "100% 0%", "100% 100%", "0% 100%"] };
/** A soft mesh of two to four colours, each fading out from its own corner (`soft` % of the way), over the background. */
function meshOf(m: unknown): { layers: string[]; move?: number } | undefined {
  const o = obj(m);
  if (!o || !Array.isArray(o.colors)) return undefined;
  const cs = o.colors.slice(0, 4).map((c) => color(c));
  if (cs.length < 2 || cs.some((c) => !c)) return undefined;
  const soft = num(o.soft, 20, 100) ?? 60;
  const layers = cs.map((c, i) => `radial-gradient(at ${MESH_AT[cs.length][i]},${c} 0,transparent ${soft}%)`);
  return { layers, move: o.move === true ? Math.round(18 / (num(o.speed, 0.2, 3) ?? 1)) : undefined };
}
/** Words growing from `min` on a phone (375px wide) to `max` on a computer (1280px). */
export function fluidSize(min: number, max: number): string {
  const slope = (max - min) / (1280 - 375);
  const at0 = min - slope * 375;
  return `clamp(${min}px,${+at0.toFixed(2)}px + ${+(slope * 100).toFixed(3)}vw,${max}px)`;
}
const four = (v: unknown, min: number) =>
  Array.isArray(v) && v.length === 4 && v.every((x) => num(x, min, 400) !== undefined) ? (v as [number, number, number, number]) : undefined;
/** Columns' shares as grid tracks ("minmax(0,1fr) minmax(0,2fr)"). */
export const widthsTemplate = (v: unknown) =>
  Array.isArray(v) && v.length >= 1 && v.length <= 4 && v.every((x) => Number.isInteger(x) && x >= 1 && x <= 12)
    ? (v as number[]).map((x) => `minmax(0,${x}fr)`).join(" ")
    : undefined;

/** A slider's frame ("16 / 9" → "16/9"), whole numbers 1–99 only. */
export const sliderAspect = (v: unknown) => (typeof v === "string" && /^[1-9]\d?\s*\/\s*[1-9]\d?$/.test(v.trim()) ? v.replace(/\s+/g, "") : undefined);

/** One screen's declarations for a node ("padding-block:8px 8px;…"). */
export function declarations(s: ScreenStyle | undefined, type: string): string[] {
  if (!s || typeof s !== "object") return [];
  const d: string[] = [];
  if (s.inlineBox === true) d.push("display:inline-block");
  const push = (prop: string, v: string | number | undefined, unit = "") => {
    if (v !== undefined) d.push(`${prop}:${v}${unit}`);
  };
  const pad = four(s.pad, 0);
  if (pad) d.push(`padding-block:${pad[0]}px ${pad[2]}px`, `padding-inline:${pad[3]}px ${pad[1]}px`);
  else { const space = tokenVar(s.space, "spaces"); if (space) d.push(`padding:${space}`); }
  const margin = four(s.margin, -400);
  if (margin) d.push(`margin-block:${margin[0]}px ${margin[2]}px`, `margin-inline:${margin[3]}px ${margin[1]}px`);
  push("width", length(s.width));
  push("max-width", length(s.maxWidth));
  push("height", length(s.height));
  push("min-height", length(s.minHeight));
  if (s.sticky === false && !s.layer) { d.push("position:relative", "top:auto", "align-self:auto"); }
  else if (s.sticky && typeof s.sticky === "object" && !s.layer) {
    const top = num(s.sticky.top, 0, 240);
    if (top !== undefined) d.push("position:sticky", `top:${top}px`, "align-self:start");
  }
  const cols = num(s.columns, 1, 12);
  if (cols !== undefined && Number.isInteger(cols)) d.push(`grid-template-columns:repeat(${cols},minmax(0,1fr))`);
  const widths = widthsTemplate(s.widths);
  if (widths) d.push(`grid-template-columns:${widths}`);
  push("gap", tokenVar(s.gap, "spaces") ?? (num(s.gap, 0, 200) !== undefined ? `${s.gap}px` : undefined));
  push("row-gap", tokenVar(s.rowGap, "spaces") ?? (num(s.rowGap, 0, 200) !== undefined ? `${s.rowGap}px` : undefined));
  const dir = pick(s.direction, ["row", "column"] as const);
  if (dir) d.push(`flex-direction:${dir}`);
  if (typeof s.wrap === "boolean") d.push(`flex-wrap:${s.wrap ? "wrap" : "nowrap"}`);
  const j = pick(s.justify, ["start", "center", "end", "between", "around"] as const);
  if (j) d.push(`justify-content:${JUSTIFY[j]}`);
  const a = pick(s.align, ["start", "center", "end", "stretch"] as const);
  if (a) d.push(`align-items:${ALIGN[a]}`);
  const self = pick(s.self, ["start", "center", "end", "stretch"] as const);
  if (self) d.push(`align-self:${ALIGN[self]}`);
  push("grid-column", place(s.col));
  push("grid-row", place(s.row));
  const order = num(s.order, -50, 50);
  if (order !== undefined && Number.isInteger(order)) d.push(`order:${order}`);
  push("background", color(s.bg));
  const bgGrad = gradientOf(s.gradient, obj(s.gradient)?.radial === true);
  const pattern = patternOf(s.pattern);
  const mesh = meshOf(s.mesh);
  if (pattern || mesh) {
    // The pattern over the mesh over the gradient, those it has. A moving mesh is twice the box and drifts across it (an aurora).
    const n = mesh?.layers.length ?? 0;
    const meshSize = mesh?.move ? "200% 200%" : "auto";
    d.push(
      `background-image:${[pattern?.[0], ...(mesh?.layers ?? []), bgGrad].filter(Boolean).join(",")}`,
      `background-size:${[pattern?.[1], ...Array(n).fill(meshSize), bgGrad && "auto"].filter(Boolean).join(",")}`,
      `background-position:${[pattern?.[2], ...Array(n).fill("0% 0%"), bgGrad && "0 0"].filter(Boolean).join(",")}`,
    );
    if (mesh?.move) d.push(`--pt-mesh:pt-mesh ${mesh.move}s ease-in-out infinite alternate`, "animation:var(--pt-mesh)");
  } else if (bgGrad) d.push(`background-image:${bgGrad}`);
  const glass = obj(s.backdrop);
  if (glass) {
    const [blur, sat] = [num(glass.blur, 0, 40), num(glass.saturate, 0, 3)];
    if (blur !== undefined) {
      const f = `blur(${blur}px)${sat !== undefined ? ` saturate(${sat})` : ""}`;
      d.push(`-webkit-backdrop-filter:${f}`, `backdrop-filter:${f}`);
    }
  }
  push("color", color(s.color));
  push("border-radius", tokenVar(s.radius, "radii") ?? (num(s.radius, 0, 999) !== undefined ? `${s.radius}px` : undefined));
  if (s.border && typeof s.border === "object") {
    const w = num(s.border.width, 0, 20);
    const c = color(s.border.color);
    const st = pick(s.border.style, ["solid", "dashed", "dotted"] as const) ?? "solid";
    if (w !== undefined && c) d.push(`border:${w}px ${st} ${c}`);
  }
  push("opacity", num(s.opacity, 0, 1));
  const font = pick(s.font, Object.keys(FONTS));
  const family = fontStack(s.family) ?? tokenVar(s.family, "fonts");
  if (family) d.push(`font-family:${family}`);
  else if (font) d.push(`font-family:${FONTS[font]}`);
  if (typeof s.italic === "boolean") d.push(`font-style:${s.italic ? "italic" : "normal"}`);
  const size = num(s.size, 8, 200);
  const sizeMin = num(s.sizeMin, 8, 200);
  if (size !== undefined && sizeMin !== undefined && sizeMin < size) d.push(`font-size:${fluidSize(sizeMin, size)}`);
  else push("font-size", size, "px");
  push("--pt-isz", num(s.iconSize, 8, 400), "px");
  const w = num(s.weight, 100, 900);
  if (w !== undefined && w % 100 === 0) d.push(`font-weight:${w}`);
  push("line-height", num(s.lineHeight, 0.8, 3));
  push("letter-spacing", num(s.letterSpacing, -5, 20), "px");
  push("word-spacing", num(s.wordSpacing, -10, 40), "px");
  const ta = pick(s.textAlign, ["start", "center", "end"] as const);
  if (ta) d.push(`text-align:${ta}`);
  const caps = pick(s.caps, Object.keys(CAPS));
  if (caps) d.push(CAPS[caps]);
  const deco = obj(s.decoration);
  const line = pick(deco?.line, Object.keys(LINES));
  if (deco && line) {
    const st = pick(deco.style, ["solid", "wavy", "dotted", "dashed", "double"] as const);
    const [dc, dw, off] = [deco.color === undefined ? undefined : color(deco.color), num(deco.width, 1, 12), num(deco.offset, -10, 30)];
    d.push(`text-decoration:${[LINES[line], st, dc, dw !== undefined ? `${dw}px` : undefined].filter(Boolean).join(" ")}`);
    if (off !== undefined) d.push(`text-underline-offset:${off}px`);
  }
  const stroke = obj(s.stroke);
  if (stroke) {
    const [sw, sc] = [num(stroke.width, 0, 10), color(stroke.color)];
    if (sw !== undefined && sc) d.push(`-webkit-text-stroke:${sw}px ${sc}`, "paint-order:stroke fill");
  }
  const paint = gradientOf(s.fill);
  if (paint) d.push(`background-image:${paint}`, "-webkit-background-clip:text", "background-clip:text", "-webkit-text-fill-color:transparent");
  const lines = num(s.lines, 1, 12);
  if (lines !== undefined && Number.isInteger(lines) && WORDS.has(type)) d.push("display:-webkit-box", "-webkit-box-orient:vertical", `-webkit-line-clamp:${lines}`, `line-clamp:${lines}`, "overflow:hidden");
  const balance = pick(s.balance, ["balance", "pretty"] as const);
  if (balance) d.push(`text-wrap:${balance}`);
  const tcols = num(s.textColumns, 1, 4);
  if (tcols !== undefined && Number.isInteger(tcols) && WORDS.has(type)) d.push(`columns:${tcols}`, "column-gap:32px");
  const fit = pick(s.fit, ["cover", "contain"] as const);
  if (fit) d.push(...(type === "image" || type === "video" ? [`object-fit:${fit}`, `--pt-fit:${fit}`] : [`--pt-fit:${fit}`]));
  if (s.focus && typeof s.focus === "object") {
    const [fx, fy] = [num(s.focus.x, 0, 100), num(s.focus.y, 0, 100)];
    if (fx !== undefined && fy !== undefined) d.push(...(type === "image" || type === "video" ? [`object-position:${fx}% ${fy}%`] : []), `--pt-focus:${fx}% ${fy}%`);
  }
  if (typeof s.aspect === "string" && /^\d{1,2}\s*\/\s*\d{1,2}$/.test(s.aspect)) d.push(`aspect-ratio:${s.aspect.replace(/\s+/g, "")}`);
  const shape = pick(s.shape, SHAPE_NAMES);
  if (shape && SHAPES[shape]) d.push(...SHAPES[shape]);
  else if (shape) {
    const m = maskUrl(MASKS[shape]);
    d.push(`-webkit-mask:${m} center/100% 100% no-repeat`, `mask:${m} center/100% 100% no-repeat`);
  }
  // Turned and moved: variables that the element's transform (TREE_TRANSFORM) reads.
  const turn = (k: string, v: unknown, lim: number) => push(`--pt-${k}`, num(v, -lim, lim), "deg");
  turn("rx", s.rotateX, 180);
  turn("ry", s.rotateY, 180);
  turn("rz", s.rotateZ, 360);
  push("--pt-p", num(s.perspective, 200, 4000), "px");
  push("--pt-s", num(s.scale, 0.1, 4));
  push("--pt-x", num(s.moveX, -1000, 1000), "px");
  push("--pt-y", num(s.moveY, -1000, 1000), "px");
  const origin = pick(s.origin, ["center", "top", "bottom"] as const);
  if (origin) d.push(`transform-origin:${ORIGINS[origin]}`);
  // A colour or gradient over it (drawn by the ::before/::after treeCss adds).
  const ov = s.overlay;
  if (ov && typeof ov === "object") {
    const c = color(ov.color);
    const op = num(ov.opacity, 0, 1);
    const c2 = color(ov.to);
    if (c && op !== undefined) d.push(`--pt-ov:${c2 ? `linear-gradient(${Math.round(num(ov.angle, 0, 360) ?? 180)}deg,${c},${c2})` : c}`, `--pt-ovo:${op}`, `--pt-ovb:${pick(ov.blend, BLENDS) ?? "normal"}`);
  }
  // Shadows: the ready ones and its own around the box; around the shape (`follow`) as a filter; a glow on words lights the letters.
  const boxes: string[] = [];
  const drops: string[] = [];
  const glows: string[] = [];
  const sh = pick(s.shadow, ["none", "sm", "md", "lg"] as const);
  if (sh && sh !== "none") boxes.push(SHADOWS[sh]);
  else if (!sh) { const own = tokenVar(s.shadow, "shadows"); if (own) boxes.push(own); }
  const sd = s.shade;
  if (sd && typeof sd === "object") {
    const [x, y, b, c] = [num(sd.x, -100, 100), num(sd.y, -100, 100), num(sd.blur, 0, 200), color(sd.color)];
    if (x !== undefined && y !== undefined && b !== undefined && c) (sd.follow ? drops : boxes).push(`${x}px ${y}px ${b}px ${c}`);
  }
  const gl = s.glow;
  if (gl && typeof gl === "object") {
    const [c, size] = [color(gl.color), num(gl.size, 0, 120)];
    if (c && size !== undefined) (TEXTISH.has(type) ? glows : boxes).push(`0 0 ${size}px ${c}`);
  }
  const words: string[] = [];
  if (Array.isArray(s.shadows)) {
    for (const t of s.shadows.slice(0, 4)) {
      const o = obj(t);
      const [x, y, b, c] = [num(o?.x, -100, 100), num(o?.y, -100, 100), num(o?.blur, 0, 200), color(o?.color)];
      if (x !== undefined && y !== undefined && b !== undefined && c) words.push(`${x}px ${y}px ${b}px ${c}`);
    }
  }
  // Picture filters (black and white, brighter…), then the shadow around its shape.
  const filters: string[] = [];
  const fl = obj(s.filters);
  if (fl) {
    const f = (name: string, v: number | undefined, unit = "") => {
      if (v !== undefined) filters.push(`${name}(${v}${unit})`);
    };
    f("blur", num(fl.blur, 0, 40), "px");
    f("brightness", num(fl.bright, 0, 3));
    f("contrast", num(fl.contrast, 0, 3));
    f("saturate", num(fl.saturate, 0, 3));
    f("grayscale", num(fl.gray, 0, 1));
    const hue = num(fl.hue, -180, 180);
    f("hue-rotate", hue === undefined ? undefined : Math.round(hue), "deg");
  }
  filters.push(...drops.map((x) => `drop-shadow(${x})`));
  if (boxes.length) d.push(`box-shadow:${boxes.join(",")}`);
  else if (sh === "none") d.push("box-shadow:none");
  if (filters.length) d.push(`filter:${filters.join(" ")}`);
  if (words.length || glows.length) d.push(`text-shadow:${[...words, ...glows].join(",")}`);
  // Placed freely over its container, or back in the flow on this screen.
  if (s.layer === false) d.push("position:relative", "inset:auto", "--pt-ax:0%", "--pt-ay:0%");
  else if (s.layer && typeof s.layer === "object") {
    const [x, y] = [num(s.layer.x, 0, 100), num(s.layer.y, 0, 100)];
    const [ax, ay] = ANCHORS[pick(s.layer.anchor, Object.keys(ANCHORS)) ?? "center"];
    if (x !== undefined && y !== undefined) d.push("position:absolute", `inset-inline-start:${x}%`, `top:${y}%`, "margin:0", `--pt-ax:calc(var(--pt-flip,1) * ${-ax}%)`, `--pt-ay:${-ay}%`);
  }
  const zi = num(s.z, -10, 50);
  if (zi !== undefined && Number.isInteger(zi)) d.push(`z-index:${zi}`);
  // What sticks out: shown, cut, cut without a scroll box (a sticky element inside still sticks), or scrolled.
  const OVERFLOWS = ["visible", "hidden", "clip", "scroll", "auto"] as const;
  const cut = pick(s.overflow, OVERFLOWS);
  if (cut) d.push(`overflow:${cut}`);
  const ovx = pick(s.overflowX, OVERFLOWS);
  if (ovx) d.push(`overflow-x:${ovx}`);
  const ovy = pick(s.overflowY, OVERFLOWS);
  if (ovy) d.push(`overflow-y:${ovy}`);
  // Required dimension settings win only for their own properties; other size,
  // shape and appearance declarations retain their existing behavior.
  const constraints = checkedConstraints(s.constraints);
  for (const [key, property] of [["minWidth", "min-width"], ["maxWidth", "max-width"], ["minHeight", "min-height"], ["maxHeight", "max-height"], ["aspectRatio", "aspect-ratio"]] as const) {
    push(property, constraints[key], key === "aspectRatio" ? "" : "px");
  }
  if(constraints.aspectRatio!==undefined){
    const r=constraints.aspectRatio,minW=Math.max(constraints.minWidth??0,(constraints.minHeight??0)*r),maxW=Math.min(constraints.maxWidth??Infinity,(constraints.maxHeight??Infinity)*r);
    // A required ratio takes precedence over a definite height or cross-axis
    // stretching. Height bounds also bound width, so the ratio stays feasible.
    d.push("height:auto","align-self:start");
    if(constraints.minHeight===undefined)d.push("min-height:0");
    if(minW>0)push("min-width",minW,"px");
    if(Number.isFinite(maxW))push("max-width",maxW,"px");
  }
  return d;
}

/**
 * A screen's looks for the mouse over it (devices with a mouse only, so a tap doesn't
 * leave it stuck), the keyboard's focus on it or inside it, and pressed, as rules for
 * `sel` (an element's class or a part's selectors). Only what a state may change is used.
 * Each also answers [data-pt-state], which only the editor's frame sets (StudioBridge).
 */
export function stateRules(sel: string, s: ScreenStyle | undefined, type: string): string[] {
  if (!s || typeof s !== "object") return [];
  const out: string[] = [];
  for (const st of STATES) {
    const raw = obj(s[st]);
    if (!raw) continue;
    const d = declarations(Object.fromEntries(Object.entries(raw).filter(([k]) => STATE_KEYS.has(k))) as ScreenStyle, type);
    if (!d.length) continue;
    const body = `{${d.join(";")}}`;
    if (st === "hover") out.push(`@media (hover:hover){:is(${sel}):hover${body}}`);
    else if (st === "focused") out.push(`:is(${sel}):is(:focus-visible,:has(:focus-visible))${body}`);
    else out.push(`:is(${sel}):active${body}`);
    // The editor shows a state on the element being edited (its mouse never reaches the page).
    out.push(`:is(${sel})[data-pt-state="${st}"]${body}`);
  }
  return out;
}

/** The keys an element's states change on any screen. */
const stateKeysOf = (style: Partial<Record<Screen, ScreenStyle>> | undefined) =>
  new Set([style?.base, style?.tablet, style?.mobile].flatMap((sc) => STATES.flatMap((st) => Object.keys(obj(sc?.[st]) ?? {}).filter((k) => STATE_KEYS.has(k)))));

/**
 * How fast an element changes to its states and back (0.3 s, smooth, unless it says),
 * for the properties its states change only. A tablet or phone may have its own pace.
 */
function transitionDecls(style: Partial<Record<Screen, ScreenStyle>> | undefined, screen: Screen, keys: Set<string>): string[] {
  const props = [...new Set([...keys].flatMap((k) => STATE_PROPS[k] ?? []))];
  if (!props.length) return [];
  const t = obj(style?.[screen]?.transition);
  if (screen !== "base" && !t) return [];
  const dur = num(t?.duration, 0, 3) ?? 0.3;
  const ease = EASE_CSS[pick(t?.ease, Object.keys(EASE_CSS)) ?? "smooth"];
  const delay = num(t?.delay, 0, 3);
  return [
    ...(screen === "base" ? [`transition-property:${props.join(",")}`] : []),
    `transition-duration:${dur}s`,
    `transition-timing-function:${ease}`,
    ...(delay ? [`transition-delay:${delay}s`] : []),
  ];
}

/** Whether a screen's look or one of its states turns or moves the element. */
const turnsOn = (sc: ScreenStyle | undefined) =>
  Boolean(sc && (TURNS.some((k) => sc[k] !== undefined) || (sc.layer && typeof sc.layer === "object") || STATES.some((st) => TURNS.some((k) => obj(sc[st])?.[k] !== undefined))));
/** Whether a state of it turns or moves (then the turn's values are typed, so it glides). */
const glidesOn = (sc: ScreenStyle | undefined) => Boolean(sc && STATES.some((st) => TURNS.some((k) => obj(sc[st])?.[k] !== undefined)));
const coveredOn = (sc: ScreenStyle | undefined) => Boolean(sc && (sc.overlay || STATES.some((st) => obj(sc[st])?.overlay)));

/**
 * Hidden on each screen size: a screen's own choice, else the bigger screen's (so "hidden"
 * on the computer hides it everywhere unless a smaller screen shows it again). Each as the
 * width range it covers, so a smaller screen can show what a bigger one hides.
 */
const RANGES: Record<Screen, string> = {
  base: `(min-width:${TABLET_MAX + 0.02}px)`,
  tablet: `(min-width:${PHONE_MAX + 0.02}px) and (max-width:${TABLET_MAX}px)`,
  mobile: `(max-width:${PHONE_MAX}px)`,
};
export function hiddenRules(sel: string, style: Partial<Record<Screen, ScreenStyle>> | undefined): string[] {
  const b = style?.base?.hidden === true;
  const t = typeof style?.tablet?.hidden === "boolean" ? style.tablet.hidden : b;
  const m = typeof style?.mobile?.hidden === "boolean" ? style.mobile.hidden : t;
  if (b && t && m) return [`${sel}{display:none}`];
  return ([["base", b], ["tablet", t], ["mobile", m]] as const).filter(([, h]) => h).map(([k]) => `@media ${RANGES[k]}{${sel}{display:none}}`);
}

/** What a look's kind draws as (for the type-aware declarations). */
const LOOK_TYPE: Record<string, string> = { text: "text", button: "button", image: "image", video: "video", box: "section" };

const TURNS = ["rotateX", "rotateY", "rotateZ", "perspective", "scale", "moveX", "moveY"] as const;

const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * Grids get fewer columns on smaller screens by themselves (at most 2 on a
 * tablet, 1 on a phone) and their children drop their cells there, unless the
 * node says what it wants on that screen. Columns do the same (3 or 4 cells become
 * 2 on a tablet, the odd last one across), and on a phone their cells go one under
 * the other, the last first ("reverse"), or stay side by side ("keep").
 */
function screenFallbacks(n: TreeNode, parent: TreeNode | null) {
  const base = n.style?.base ?? {};
  const tablet: string[] = [];
  const phone: string[] = [];
  const rules: { tablet: string[]; phone: string[] } = { tablet: [], phone: [] };
  if (n.type === "columns") {
    const count = n.children?.length ?? 0;
    const own = widthsTemplate(base.widths) ?? `repeat(${Math.max(1, Math.min(4, count))},minmax(0,1fr))`;
    const tabletSet = widthsTemplate(n.style?.tablet?.widths);
    const across = !tabletSet && count > 2 && count % 2 === 1 && SAFE_ID.test(n.id);
    if (!tabletSet && count > 2) tablet.push("grid-template-columns:repeat(2,minmax(0,1fr))");
    if (across) rules.tablet.push(`.pt-${n.id}>.pt-cell:last-child{grid-column:1 / -1}`);
    if (!widthsTemplate(n.style?.mobile?.widths)) {
      const how = n.props?.phone;
      if (how === "keep") phone.push(`grid-template-columns:${tabletSet ?? own}`);
      else if (how === "reverse") phone.push("display:flex", "flex-direction:column-reverse");
      else phone.push("grid-template-columns:minmax(0,1fr)");
    }
    if (across) rules.phone.push(`.pt-${n.id}>.pt-cell:last-child{grid-column:auto}`);
  }
  const cols = num(base.columns, 1, 12);
  if (n.type === "grid" && cols && cols > 1) {
    if (n.style?.tablet?.columns === undefined && cols > 2) tablet.push("grid-template-columns:repeat(2,minmax(0,1fr))");
    if (n.style?.mobile?.columns === undefined) phone.push("grid-template-columns:minmax(0,1fr)");
  }
  if (parent?.type === "grid") {
    if (base.col && n.style?.mobile?.col === undefined) phone.push("grid-column:auto");
    if (base.row && n.style?.mobile?.row === undefined) phone.push("grid-row:auto");
  }
  if (n.type === "stack" && base.direction === "row" && n.style?.mobile?.direction === undefined && base.wrap !== true) phone.push("flex-wrap:wrap");
  return { tablet, phone, rules };
}

/** The elements each shared style that's taken by itself goes on (the others: .ps-<id>, named by the element). */
const AUTO_SELECTOR: Record<string, [SiteStyle["kind"], string, string]> = {
  h1: ["text", ":where(h1).pt-heading", "heading"],
  h2: ["text", ":where(h2).pt-heading", "heading"],
  h3: ["text", ":where(h3).pt-heading", "heading"],
  h4: ["text", ":where(h4).pt-heading", "heading"],
  h5: ["text", ":where(h5).pt-heading", "heading"],
  h6: ["text", ":where(h6).pt-heading", "heading"],
  body: ["text", ".pt-text", "text"],
  solid: ["button", ".pt-btn-solid", "button"],
  outline: ["button", ".pt-btn-outline", "button"],
  link: ["button", ".pt-btn-link", "button"],
};
const KIND_TYPE: Record<SiteStyle["kind"], string> = { text: "text", button: "button", box: "section" };
/** Where a shared style goes and what it draws as. */
export function siteTarget(s: SiteStyle): { sel: string; type: string } {
  const auto = AUTO_SELECTOR[s.id];
  return auto && auto[0] === s.kind ? { sel: auto[1], type: auto[2] } : { sel: `.ps-${s.id}`, type: KIND_TYPE[s.kind] };
}

/** The font families a page's elements, its old sections' parts and the shared styles use. */
export function treeFamilies(tree: PageTree, site: SiteStyle[] = []): Set<string> {
  const out = new Set<string>();
  const add = (style: Partial<Record<Screen, ScreenStyle>> | undefined) => {
    for (const sc of [style?.base, style?.tablet, style?.mobile]) if (typeof sc?.family === "string" && !sc.family.startsWith("$")) out.add(sc.family);
  };
  const walk = (n: TreeNode) => {
    if (SAFE_ID.test(n.id ?? "")) add(n.style);
    n.children?.forEach(walk);
  };
  walk(tree.root);
  for (const [, look] of looksOf(tree)) add(look.style);
  for (const s of site) add(s.style);
  return out;
}

/**
 * One element's own rules alone, under the class `pt-<as>` (the editor's frame shows a ready
 * look on an element before it's picked: StudioBridge's "previewStyle").
 */
export function nodeCss(n: TreeNode, as: string): string {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(as)) return "";
  const all = treeCss({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ ...n, id: as, children: [] }] } });
  return all.split(BASE_CSS).join("");
}

/** Where keyframes turn and grow an element from (start and end follow the reading direction through --pt-flip). */
const KEY_ORIGIN_CSS: Record<string, string> = {
  center: "50% 50%", top: "50% 0%", bottom: "50% 100%",
  start: "calc(50% - 50% * var(--pt-flip,1)) 50%", end: "calc(50% + 50% * var(--pt-flip,1)) 50%",
  "top-start": "calc(50% - 50% * var(--pt-flip,1)) 0%", "top-end": "calc(50% + 50% * var(--pt-flip,1)) 0%",
  "bottom-start": "calc(50% - 50% * var(--pt-flip,1)) 100%", "bottom-end": "calc(50% + 50% * var(--pt-flip,1)) 100%",
};

/** A layer piece's own look (inset follows the reading direction: top, end, bottom, start). */
export function pieceDeclarations(l: PieceLayerSpec | undefined): string[] {
  if (!l) return [];
  const d: string[] = [];
  const a = color(l.bg);
  const b = color(l.to);
  if (a && b) d.push(`background:${l.radial ? `radial-gradient(circle at 50% 50%,${a},${b})` : `linear-gradient(${l.angle ?? 90}deg,${a},${b})`}`);
  else if (a) d.push(`background:${a}`);
  const [it, ie, ib, is] = l.inset ?? [0, 0, 0, 0];
  const w = l.w !== undefined ? `${l.w}px` : "auto";
  const h = l.h !== undefined ? `${l.h}px` : "auto";
  switch (l.at) {
    // A band along one side: its own thickness, the other sides as set.
    case "top": d.push(`inset-block:${it}px auto`, `inset-inline:${is}px ${ie}px`, `height:${l.h ?? 4}px`); break;
    case "bottom": d.push(`inset-block:auto ${ib}px`, `inset-inline:${is}px ${ie}px`, `height:${l.h ?? 4}px`); break;
    case "start": d.push(`inset-block:${it}px ${ib}px`, `inset-inline:${is}px auto`, `width:${l.w ?? 4}px`); break;
    case "end": d.push(`inset-block:${it}px ${ib}px`, `inset-inline:auto ${ie}px`, `width:${l.w ?? 4}px`); break;
    // A box in its middle (inset 0 and auto margins centre it without a transform the motion would undo).
    case "center": d.push(`inset-block:${it}px ${ib}px`, `inset-inline:${is}px ${ie}px`, `margin:auto`, `width:${l.w !== undefined ? w : "100%"}`, `height:${l.h !== undefined ? h : "100%"}`); break;
    default: if (l.inset) d.push(`inset-block:${it}px ${ib}px`, `inset-inline:${is}px ${ie}px`);
  }
  if (l.radius !== undefined) d.push(`border-radius:${l.radius}px`);
  if (l.opacity !== undefined) d.push(`opacity:${l.opacity}`);
  if (l.blend) d.push(`mix-blend-mode:${l.blend}`);
  if (l.blur) d.push(`filter:blur(${l.blur}px)`);
  if (l.border) d.push(`border:${l.border.width}px ${l.border.style ?? "solid"} ${color(l.border.color)}`);
  return d;
}

/**
 * The whole page's CSS ("" for a page that is only old sections). `site`: the store's shared
 * styles, drawn after the base CSS and before each element's own look, so its own look wins.
 */
export function treeCss(tree: PageTree, site: SiteStyle[] = [], previewPart = false): string {
  const base: string[] = [];
  const tablet: string[] = [];
  const phone: string[] = [];
  // Elements that turn or move, that carry a colour layer, that hold a layer at all, and the fx colours.
  const turned: string[] = [];
  const over: string[] = [];
  const under: string[] = [];
  const holders: string[] = [];
  const fx: string[] = [];
  const staggered = new Set<string>();
  const hidden: string[] = [];
  // Whether a state glides a turn (typed turn values).
  let glides = false;
  let drawn = 0;
  const walk = (n: TreeNode, parent: TreeNode | null) => {
    if (n.type !== "page" && n.type !== "legacy") drawn++;
    if (SAFE_ID.test(n.id ?? "")) {
      const sel = `.pt-${n.id}`;
      const screens = [n.style?.base, n.style?.tablet, n.style?.mobile];
      const motion = motionOf(n);
      if (motion?.enter?.stagger) staggered.add(n.id);
      if (screens.some(glidesOn)) glides = true;
      const turns = screens.some(turnsOn);
      if (motion || turns || (parent && staggered.has(parent.id))) turned.push(sel);
      const layered = screens.some(coveredOn);
      if (layered) ((MEDIA.has(n.type) && (n.type === "slider" || framed(n, motion))) ? over : under).push(sel);
      if (layered || motion?.fx) holders.push(sel);
      const hv = motion?.hover;
      if (hv && (hv.kind === "spotlight" || hv.kind === "ripple")) {
        const c = color(hv.color);
        const r = num(hv.amount, 0.1, 3);
        const vars = [c && `${hv.kind === "ripple" ? "--pt-rpc" : "--pt-spc"}:${c}`, hv.kind === "spotlight" && r !== undefined && `--pt-spr:${Math.round(220 * r)}px`].filter(Boolean);
        if (vars.length) fx.push(`${sel}{${vars.join(";")}}`);
      }
      if (motion?.fx) {
        const [c, c2, sp] = [color(motion.fx.color), color(motion.fx.to), num(motion.fx.speed, 0.2, 5)];
        fx.push(`${sel}>.pt-fx{${[c && `--pt-fxc:${c}`, c2 && `--pt-fxc2:${c2}`, `--pt-fxs:${(3 / (sp ?? 1)).toFixed(2)}s`].filter(Boolean).join(";")}}`);
      }
      // Its two extra layers (before/after), each with its own look; it holds them like a colour layer.
      const layers = layersOf(n.props?.layers);
      const keyed = motion?.keys?.parts;
      if (layers || keyed?.before || keyed?.after) {
        if (!holders.includes(sel)) holders.push(sel);
        for (const part of ["before", "after"] as const) {
          const d = pieceDeclarations(layers?.[part]);
          if (d.length) fx.push(`${sel}>.pt-pc-${part},${sel}>.pt-inner>.pt-pc-${part},${sel}>.pt-ss-stage>.pt-ss-layer>.pt-pc-${part}{${d.join(";")}}`);
        }
      }
      const origin = motion?.keys?.origin;
      if (origin) fx.push(`${sel}{transform-origin:${KEY_ORIGIN_CSS[origin] ?? "50% 50%"}}`);
      const b = screenDeclarations(n.style, "base", n.type);
      // Columns always say how many tracks they have (their cells' count when no shares are set).
      if (n.type === "columns" && !widthsTemplate(n.style?.base?.widths)) b.unshift(`grid-template-columns:repeat(${Math.max(1, Math.min(4, n.children?.length ?? 1))},minmax(0,1fr))`);
      // A slider's frame from its settings; a screen's own `aspect` still wins.
      const frame = n.type === "slider" ? sliderAspect(n.props?.aspect) : undefined;
      if (frame) b.unshift(`aspect-ratio:${frame}`);
      if (n.type === "spacer") {
        const size = num(n.props?.size, 0, 400);
        if (size !== undefined) b.push(`height:${size}px`);
      }
      const extra = screenFallbacks(n, parent);
      const keys = stateKeysOf(n.style);
      b.push(...transitionDecls(n.style, "base", keys));
      const t = [...extra.tablet, ...screenDeclarations(n.style, "tablet", n.type), ...transitionDecls(n.style, "tablet", keys)];
      const p = [...extra.phone, ...screenDeclarations(n.style, "mobile", n.type), ...transitionDecls(n.style, "mobile", keys)];
      if (b.length) base.push(`${sel}{${b.join(";")}}`);
      if (t.length) tablet.push(`${sel}{${t.join(";")}}`);
      if (p.length) phone.push(`${sel}{${p.join(";")}}`);
      base.push(...stateRules(sel, n.style?.base, n.type));
      tablet.push(...stateRules(sel, n.style?.tablet, n.type));
      phone.push(...stateRules(sel, n.style?.mobile, n.type));
      hidden.push(...hiddenRules(sel, n.style));
      tablet.push(...extra.rules.tablet);
      phone.push(...extra.rules.phone);
    }
    n.children?.forEach((c) => walk(c, n));
  };
  walk(tree.root, null);
  // Parts of old sections and scenes (the editor's looks): their own look, per screen.
  for (const [target, look] of looksOf(tree)) {
    const sel = `:is(${lookSelector(target)!}):where(${previewPart ? "[data-pt-part-preview]" : ":not([data-pt-part-preview])"})`;
    const type = LOOK_TYPE[look.kind];
    drawn++;
    const node = lookNode(target, look);
    const screens = [look.style?.base, look.style?.tablet, look.style?.mobile];
    if (motionOf(node) || screens.some(turnsOn)) turned.push(sel);
    if (screens.some(glidesOn)) glides = true;
    const media = look.kind === "image" || look.kind === "video";
    const keys = stateKeysOf(look.style);
    // A picture's fit and focus go on the picture itself (the field is often its frame).
    const inner = `:is(${sel}) :is(img,video),:is(${sel}):is(img,video)`;
    const put = (list: string[], s: ScreenStyle | undefined, screen: Screen) => {
      const d = [...screenDeclarations(look.style, screen, type), ...transitionDecls(look.style, screen, keys)];
      if (media && (typeof s?.radius === "number" || typeof s?.radius === "string")) d.push("overflow:hidden");
      if (d.length) list.push(`${sel}{${d.join(";")}}`);
      const pic = media ? d.filter((x) => x.startsWith("object-")) : [];
      if (pic.length) list.push(`${inner}{${pic.join(";")}}`);
      list.push(...stateRules(sel, s, type));
    };
    put(base, look.style?.base, "base");
    put(tablet, look.style?.tablet, "tablet");
    put(phone, look.style?.mobile, "mobile");
    hidden.push(...hiddenRules(sel, look.style));
  }
  if (!drawn) return "";
  // The shared styles, each screen's own in its own range, with their states and pace.
  const shared: string[] = [];
  const sharedTablet: string[] = [];
  const sharedPhone: string[] = [];
  for (const s of site) {
    const { sel, type } = siteTarget(s);
    const screens = [s.style.base, s.style.tablet, s.style.mobile];
    if (screens.some(turnsOn)) turned.push(sel);
    if (screens.some(glidesOn)) glides = true;
    if (screens.some(coveredOn)) {
      holders.push(sel);
      under.push(sel);
    }
    const keys = stateKeysOf(s.style);
    const put = (list: string[], screen: Screen) => {
      const d = [...screenDeclarations(s.style, screen, type), ...transitionDecls(s.style, screen, keys)];
      if (d.length) list.push(`${sel}{${d.join(";")}}`);
      list.push(...stateRules(sel, s.style[screen], type));
    };
    put(shared, "base");
    put(sharedTablet, "tablet");
    put(sharedPhone, "mobile");
  }
  const layer = "content:\"\";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:var(--pt-ov);opacity:var(--pt-ovo);mix-blend-mode:var(--pt-ovb)";
  return [
    fontFaceCss(treeFamilies(tree, site)),
    glides ? TURN_PROPERTIES : "",
    BASE_CSS,
    // Before each element's own rule, so its own values win.
    turned.length ? `${turned.join(",")}{${TREE_TRANSFORM_REST};transform:${TREE_TRANSFORM}}` : "",
    holders.length ? `${holders.join(",")}{position:relative;isolation:isolate}` : "",
    over.length || under.length ? `${[...over, ...under].join(",")}{--pt-ov:none;--pt-ovo:1;--pt-ovb:normal}` : "",
    over.length ? `${over.map((s) => `${s}::after`).join(",")}{${layer};z-index:1}` : "",
    under.length ? `${under.map((s) => `${s}::before`).join(",")}{${layer};z-index:-1}` : "",
    shared.join(""),
    sharedTablet.length ? `@media (max-width:${TABLET_MAX}px){${sharedTablet.join("")}}` : "",
    sharedPhone.length ? `@media (max-width:${PHONE_MAX}px){${sharedPhone.join("")}}` : "",
    base.join(""),
    fx.join(""),
    tablet.length ? `@media (max-width:${TABLET_MAX}px){${tablet.join("")}}` : "",
    phone.length ? `@media (max-width:${PHONE_MAX}px){${phone.join("")}}` : "",
    hidden.join(""),
  ].join("");
}

/** What every tree element starts from (theme colours, the direction-aware sides). */
export const BASE_CSS = [
  // Headings take the store theme's display font when there is one.
  ":root{--pt-font-heading:var(--st-font-display,\"Rose Arabic\",\"Rose Hebrew\",Georgia,serif);--pt-flip:1}",
  "[dir=rtl]{--pt-flip:-1}",
  // Until the motion engine is ready (at most 2.5 s), what comes in waits unseen.
  "html.pt-pending [data-pt-enter]{opacity:0}",
  ".pt{box-sizing:border-box;min-width:0}",
  ".pt-section{position:relative;width:100%;padding-block:56px}",
  // Objects placed over an old section or a scene: a layer over it, in sight through a tall scene.
  "[data-cms-section]:has(>.pt-over),[data-rose-block]:has(>.pt-over){position:relative}",
  ".pt-over{position:absolute;inset:0;z-index:6;pointer-events:none}",
  ".pt-over-in{position:sticky;top:0;height:min(100%,100vh);pointer-events:none}",
  ".pt-over-in>*{pointer-events:auto}",
  ".pt-inner{max-width:1200px;margin-inline:auto;padding-inline:16px}",
  // An element's two extra layers (before behind its content, after too unless in front) and its words as a piece.
  ".pt-pc{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit}.pt-pc-front{z-index:2}",
  ".pt-pc-in{display:inline-block;position:relative;will-change:transform}:is(h1,h2,h3,h4,h5,h6,p)>.pt-pc-in{display:block}",
  // A scroll scene: its stage holds on the screen while the page scrolls past it (pin: `length` screens;
  // flow: what it holds scrolls over it). Its picture or clip fills the stage; blur, dim and zoom follow
  // the scroll through variables TreeScenes writes. clip (not hidden) keeps sticky working inside.
  ".pt-scrollScene{position:relative;width:100%;--pt-ss-blur:0px;--pt-ss-dim:0;--pt-ss-zoom:1;--pt-ss-p:0}",
  ".pt-ss-pin{height:calc(var(--pt-ss-len,4) * 100vh)}",
  ".pt-product-detail-empty{display:grid;place-items:center;min-height:360px;padding:24px;border:2px dashed var(--border);border-radius:16px;color:var(--muted);text-align:center}",
  ".pt-ss-stage{position:sticky;top:0;height:100vh;width:100%;overflow:clip;isolation:isolate}",
  ".pt-ss-frame{position:absolute;inset:0;z-index:-2;overflow:clip}",
  ".pt-ss-media{display:block;width:100%;height:100%;object-fit:cover;object-position:var(--pt-ss-focus,50% 50%);transform:scale(var(--pt-ss-zoom));filter:blur(var(--pt-ss-blur));will-change:transform,filter}",
  ".pt-ss-contain .pt-ss-media{object-fit:contain}",
  // The picture through a window that opens with the scroll (--pt-ss-win 0 → 1, TreeScenes): a circle, an arch,
  // a rounded frame or a diamond, small in the middle at first, the whole screen at the end.
  ".pt-ss-win{--pt-ss-win:0}.pt-ss-win .pt-ss-frame,.pt-ss-win .pt-ss-dim{will-change:clip-path}",
  ".pt-ss-win-circle :is(.pt-ss-frame,.pt-ss-dim){clip-path:circle(calc(9% + var(--pt-ss-win) * 63%) at 50% 50%)}",
  ".pt-ss-win-arch :is(.pt-ss-frame,.pt-ss-dim){clip-path:inset(calc((1 - var(--pt-ss-win)) * 22%) calc((1 - var(--pt-ss-win)) * 36%) calc((1 - var(--pt-ss-win)) * 12%) round calc((1 - var(--pt-ss-win)) * 50vw) calc((1 - var(--pt-ss-win)) * 50vw) 0 0)}",
  ".pt-ss-win-rounded :is(.pt-ss-frame,.pt-ss-dim){clip-path:inset(calc((1 - var(--pt-ss-win)) * 28%) calc((1 - var(--pt-ss-win)) * 30%) round calc((1 - var(--pt-ss-win)) * 48px))}",
  ".pt-ss-win-diamond :is(.pt-ss-frame,.pt-ss-dim){clip-path:polygon(50% calc(30% - var(--pt-ss-win) * 80%),calc(70% + var(--pt-ss-win) * 80%) 50%,50% calc(70% + var(--pt-ss-win) * 80%),calc(30% - var(--pt-ss-win) * 80%) 50%)}",
  ".pt-ss-still.pt-ss-win :is(.pt-ss-frame,.pt-ss-dim){clip-path:none}",
  ".pt-ss-dim{position:absolute;inset:0;z-index:-1;pointer-events:none;background:var(--pt-ss-dimc,#000);opacity:var(--pt-ss-dim)}",
  ".pt-ss-layer{position:absolute;inset:0;display:grid;place-items:center;padding:6vh 16px}.pt-ss-layer>*{grid-area:1/1;max-width:min(100%,1100px)}",
  "[data-pt-cue-wait]{visibility:hidden}",
  ".pt-ss-flow{position:relative;margin-top:-100vh;display:flex;flex-direction:column;align-items:center;gap:40vh;padding:60vh 16px 50vh}.pt-ss-flow>*{max-width:min(100%,1100px)}",
  ".pt-ss-progress{position:absolute;z-index:3;pointer-events:none}",
  ".pt-ss-progress-bar{inset-inline:0;top:0;height:3px;background:rgb(255 255 255/.2)}.pt-ss-progress-bar>i{display:block;height:100%;width:calc(var(--pt-ss-p) * 100%);background:var(--accent)}",
  ".pt-ss-progress-line{inset-inline-end:18px;top:20vh;width:3px;height:60vh;border-radius:3px;background:rgb(255 255 255/.25)}.pt-ss-progress-line>i{display:block;width:100%;height:calc(var(--pt-ss-p) * 100%);border-radius:inherit;background:var(--accent)}",
  ".pt-ss-progress-dots{inset-inline-end:18px;top:50%;translate:0 -50%;display:flex;flex-direction:column;gap:8px}.pt-ss-progress-dots>i{width:8px;height:8px;border-radius:50%;background:rgb(255 255 255/.35);transition:transform .3s,background .3s}.pt-ss-progress-dots>i[data-on]{background:var(--accent);transform:scale(1.4)}",
  // Still for whoever asked for less motion (TreeScenes adds pt-ss-still): everything shown, one after another.
  ".pt-ss-still{height:auto!important}.pt-ss-still .pt-ss-stage{position:relative;height:auto;min-height:100vh}.pt-ss-still .pt-ss-layer{position:relative;display:flex;flex-direction:column;align-items:center;gap:32px;padding:18vh 16px}.pt-ss-still [data-pt-cue-wait]{visibility:visible}.pt-ss-still .pt-ss-progress{display:none}",
  // A section held on the screen, then covered by the next one sliding up over it (pieces.ts coverOf).
  // It sticks in its own box (TreeCovers sets --pt-cv-top for one taller than the screen: it sticks once
  // its end is in sight); the room under it is the scroll it's held for (hold screens) plus the way the
  // next one comes over it (--pt-cv-d), which TreeCovers pulls the next one up by. Before the script
  // it's only held, then moves on; where it shares its box with other things it stays put.
  ".pt-section.pt-cover{--pt-cv-p:0}.pt-section.pt-cover:not([data-pt-cover-off]):has(+.pt-cover-room){position:sticky;top:var(--pt-cv-top,0px)}",
  ".pt-cover-room{display:block;height:calc(var(--pt-cv-hold,0) * 100vh + var(--pt-cv-d,0px));pointer-events:none}.pt-cover[data-pt-cover-off]+.pt-cover-room{display:none}",
  // What covers it goes over it, never see-through: the page's colour under its own background.
  ".pt-cover-next{position:relative;z-index:1}:where(.pt-cover-next){background-color:var(--bg,#fff)}",
  // Its edge while it comes over: an arch that flattens, or a slant that levels (--pt-cv-q: 0 → 1).
  ".pt-cover-next[data-pt-cv-entering][data-pt-cv-enter=arch]{clip-path:inset(0 round 50% 50% 0 0 / calc((1 - var(--pt-cv-q,0)) * 28vh) calc((1 - var(--pt-cv-q,0)) * 28vh) 0 0)}",
  ".pt-cover-next[data-pt-cv-entering][data-pt-cv-enter=tilt]{clip-path:polygon(0 calc((1 - var(--pt-cv-q,0)) * 18vh),100% 0,100% 100%,0 100%)}",
  "[dir=rtl] .pt-cover-next[data-pt-cv-entering][data-pt-cv-enter=tilt]{clip-path:polygon(0 0,100% calc((1 - var(--pt-cv-q,0)) * 18vh),100% 100%,0 100%)}",
  ".pt-cover-shade{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0}",
  ".pt-cover-dim>.pt-cover-shade{background:#000;opacity:calc(var(--pt-cv-p) * .65)}",
  ".pt-cover-fade>.pt-cover-shade{background:var(--bg,#fff);opacity:calc(var(--pt-cv-p) * .9)}",
  ".pt-cover-blur>.pt-cover-shade{opacity:1;-webkit-backdrop-filter:blur(calc(var(--pt-cv-p) * 12px));backdrop-filter:blur(calc(var(--pt-cv-p) * 12px))}",
  ".pt-cover-shrink{scale:calc(1 - var(--pt-cv-p) * .12);transform-origin:50% 35%}.pt-cover-shrink[data-pt-covering]{clip-path:inset(0 round calc(var(--pt-cv-p) * 36px))}",
  ".pt-cover-slow{translate:0 calc(var(--pt-cv-p) * var(--pt-cv-d,100vh) * -.3)}",
  `@media (max-width:${PHONE_MAX}px){.pt-section.pt-cover.pt-cover-desk:not([data-pt-cover-off]):has(+.pt-cover-room){position:relative;top:auto}.pt-cover-desk+.pt-cover-room{display:none}}`,
  "@media (prefers-reduced-motion:reduce){.pt-cover-shade{display:none}.pt-cover-shrink,.pt-cover-slow{scale:none;translate:none;clip-path:none!important}}",
  // What travels around a circle, an arc or a wave with the scroll (motion.scroll "orbit"): each thing from the
  // box's middle, where TreeMotion puts it; the box is as tall as their way needs.
  "[data-pt-orbit]{position:relative!important;display:block!important}[data-pt-orbit]>[data-tree-node],[data-pt-orbit]>.pt-inner>[data-tree-node]{position:absolute!important;left:50%;top:50%;margin:0!important;translate:-50% -50%;will-change:translate,scale}[data-pt-orbit]>.pt-inner{position:absolute;inset:0;max-width:none}",
  // The page's colour from the section in the middle of the screen (section paint, TreePaint): the page and the
  // boxes that draw its background glide to it, and back.
  "html[data-pt-paints] body,html[data-pt-paints] :is([data-gallery-theme-active],[data-page-tree-root],.rose-page-frame,.cinematic-shell,[data-cms-sections]){transition:background-color .8s ease}",
  "html[data-pt-painting],html[data-pt-painting] body,html[data-pt-painting] :is([data-gallery-theme-active],[data-page-tree-root],.rose-page-frame,.cinematic-shell,[data-cms-sections]){background-color:var(--pt-paint)!important}",
  "@media (prefers-reduced-motion:reduce){html[data-pt-paints] body,html[data-pt-paints] :is([data-gallery-theme-active],[data-page-tree-root],.rose-page-frame,.cinematic-shell,[data-cms-sections]){transition:none}}",
  // The page's cursor (TreeCursor): a dot, a ring, or one that turns what's under it around; bigger over a
  // link, and bigger still with words in it over an element that has them.
  ".pt-cursor{--pt-cur-c:var(--accent,#7d2448);--pt-cur-s:14px;position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;opacity:0;transition:opacity .25s}.pt-cursor.pt-cursor-in{opacity:1}",
  ".pt-cursor>i{display:grid;place-items:center;width:var(--pt-cur-s);height:var(--pt-cur-s);translate:-50% -50%;border-radius:50%;font:600 12px/1.1 system-ui,sans-serif;font-style:normal;text-align:center;overflow:hidden;transition:width .3s cubic-bezier(.2,.7,.2,1),height .3s cubic-bezier(.2,.7,.2,1),background-color .3s,border-color .3s}",
  ".pt-cursor>i>span{opacity:0;padding:0 6px;transition:opacity .2s;color:#fff}",
  ".pt-cursor-dot>i{background:var(--pt-cur-c)}.pt-cursor-ring>i{border:1.5px solid var(--pt-cur-c);background:transparent}.pt-cursor-blend{mix-blend-mode:difference}.pt-cursor-blend>i{background:#fff}",
  ".pt-cursor-link>i{width:calc(var(--pt-cur-s) * 2.6);height:calc(var(--pt-cur-s) * 2.6)}",
  ".pt-cursor-label>i{width:84px;height:84px;background:var(--pt-cur-c);border-color:transparent}.pt-cursor-label>i>span{opacity:1}.pt-cursor-blend.pt-cursor-label{mix-blend-mode:normal}",
  // What slides sideways with the scroll (motion.scroll "sideways") keeps its row on one line.
  "[data-pt-sideways]{flex-wrap:nowrap!important;overflow:clip}[data-pt-sideways]>*{flex-shrink:0;translate:var(--pt-sw,0px) 0}",
  // A section's inner box fills it down to its padding (a taller section than its words), so what's placed
  // freely in it is placed by the section that's seen. Weightless, so a section's own layout still wins.
  ":where(.pt-section:has(>.pt-inner)){display:flex;flex-direction:column}:where(.pt-section)>.pt-inner{flex:1 1 auto;width:100%}",
  ".pt-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:24px}",
  ".pt-stack{display:flex;flex-direction:column;gap:16px}",
  ".pt-columns{display:grid;grid-template-columns:minmax(0,1fr);gap:24px}",
  // Places that hold things (an element placed freely over one sits by it).
  ".pt-inner,.pt-grid,.pt-stack,.pt-columns,.pt-cell{position:relative}",
  // A cell is a small container: its things one under the other, at the start; text and wide things take the whole width.
  ".pt-cell{display:flex;flex-direction:column;align-items:flex-start;gap:16px;min-width:0}",
  // (:where, so an element's own "where it sits" wins.)
  ".pt-cell>:where(.pt-heading,.pt-text,.pt-video,.pt-slider,.pt-showcase,.pt-product360,.pt-products,.pt-categories,.pt-form,.pt-columns,.pt-grid,.pt-stack,.pt-divider,.pt-spacer){align-self:stretch}",
  ":where(.pt-cell>.pt-image,.pt-cell>.pt-image-link){max-width:100%}",
  ".pt-heading{margin:0;font-family:var(--pt-font-heading);line-height:1.2;white-space:pre-line}",
  ".pt-text{margin:0;line-height:1.75;white-space:pre-line}",
  // Formatted words (pageTree/rich.ts).
  ".pt-mark{background:var(--accent-soft);color:inherit;padding:0 .15em;border-radius:.2em}",
  ".pt-inline-link{color:var(--accent);text-decoration:underline;text-underline-offset:3px}",
  ".pt-image{display:block;max-width:100%;height:auto}",
  ".pt-image-link{display:block}",
  ".pt-video{display:block;width:100%;height:auto}",
  // A picture or clip in a frame: the frame carries the look, the layers and the zoom.
  ".pt-frame{position:relative;display:block;max-width:100%;overflow:hidden}",
  // A framed picture keeps its own size by default; a width it was given wins.
  ":where(.pt-frame.pt-image){width:fit-content}",
  ".pt-frame-media{display:block;width:100%;height:100%;max-width:100%;object-fit:var(--pt-fit,cover);object-position:var(--pt-focus,50% 50%)}",
  ".pt-hv-glow{transition:filter .35s ease}",
  ".pt-hv-glow:hover{filter:drop-shadow(0 0 18px var(--accent))}",
  ".pt-hv-zoom>.pt-frame-media{transition:transform .7s cubic-bezier(.2,.7,.2,1)}",
  ".pt-hv-zoom:hover>.pt-frame-media{transform:scale(1.08)}",
  // A picture's sparkling stars (sparkles.tsx): each twinkles at its own moment; size, turn and see-through only.
  ".pt-sparkles{position:absolute;inset:0;z-index:2;pointer-events:none}",
  ".pt-spark{position:absolute;width:calc(var(--sp-size,16px)*var(--s,1));height:calc(var(--sp-size,16px)*var(--s,1));translate:-50% -50%;color:var(--sp-color,#fff);opacity:0;will-change:transform,opacity;animation:pt-twinkle var(--sp-speed,1.8s) ease-in-out var(--d,0s) infinite both}",
  ".pt-sparkles[data-glow] .pt-spark{filter:drop-shadow(0 0 3px currentColor)}",
  "@keyframes pt-twinkle{0%,100%{opacity:0;transform:scale(.15) rotate(0deg)}45%{opacity:1;transform:scale(1) rotate(30deg)}60%{opacity:.85;transform:scale(.8) rotate(40deg)}}",
  // While the pointer is on the picture only: no animation till then (the page's rest drives play states itself).
  ".pt-sparkles[data-when=hover] .pt-spark{animation:none}",
  ".pt-frame:hover>.pt-sparkles[data-when=hover] .pt-spark,.pt-frame:focus-within>.pt-sparkles[data-when=hover] .pt-spark{animation:pt-twinkle var(--sp-speed,1.8s) ease-in-out var(--d,0s) infinite both}",
  ".pt-sparkles[data-when=few] .pt-spark{animation-iteration-count:3}",
  // Words along a curve (curvedWords.tsx): the element's own font, weight and colour.
  ".pt-curve{display:block;width:100%;height:auto;overflow:visible}",
  ".pt-curve text{font-family:inherit;font-weight:inherit;font-style:inherit}",
  // A 3D model's labelled points (Model3dCanvas): a dot, its words beside it on hover or focus.
  ".pt-3d-spot{display:flex;align-items:center;gap:6px;border:0;background:none;padding:0;cursor:pointer;color:var(--text);font:600 12px/1.2 inherit;text-decoration:none}",
  ".pt-3d-spot>span{width:14px;height:14px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 30%,transparent)}",
  ".pt-3d-spot>b{opacity:0;translate:-4px 0;transition:opacity .2s,translate .2s;background:var(--surface,#fff);padding:3px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 14px rgb(0 0 0/.12)}",
  ".pt-3d-spot:hover>b,.pt-3d-spot:focus-visible>b{opacity:1;translate:0 0}",
  // A light that follows the mouse (under the words), and a ripple where it's pressed.
  ".pt-hv-spot,.pt-hv-ripple{position:relative;isolation:isolate}.pt-hv-ripple{overflow:hidden}",
  ".pt-spot{position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s ease;background:radial-gradient(circle var(--pt-spr,220px) at var(--pt-sx,50%) var(--pt-sy,50%),var(--pt-spc,color-mix(in srgb,var(--accent) 30%,transparent)),transparent)}",
  "@media (hover:hover){.pt-hv-spot:hover>.pt-spot{opacity:1}}",
  ".pt-rpl{position:absolute;z-index:-1;border-radius:50%;pointer-events:none;background:var(--pt-rpc,currentColor);opacity:.28;transform:translate(-50%,-50%) scale(0);animation:pt-ripple .65s ease-out forwards}",
  "@keyframes pt-ripple{to{transform:translate(-50%,-50%) scale(1);opacity:0}}",
  // Animations on a canvas (TreeMedia), square unless the element says; particles behind a section.
  ".pt-lottie,.pt-rive{display:block;width:100%;aspect-ratio:1/1}",
  // Content blocks (blocks.tsx): questions, testimonials, plans, a team, logos, a notice, running words.
  ".pt-acc{display:flex;flex-direction:column;gap:8px}.pt-acc-item{border-bottom:1px solid var(--border)}",
  ".pt-acc-cards .pt-acc-item{border:1px solid var(--border);border-radius:14px;background:var(--surface);padding:0 16px}",
  ".pt-acc-q{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;font-weight:600}.pt-acc-q::-webkit-details-marker{display:none}",
  ".pt-acc-q::after{content:\"\";flex:none;width:8px;height:8px;border-inline-end:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .25s ease}",
  ".pt-acc-item[open]>.pt-acc-q::after{transform:rotate(225deg)}",
  ".pt-acc-plus .pt-acc-q::after{content:\"+\";border:0;width:auto;height:auto;transform:none;font-size:20px;line-height:1}.pt-acc-plus .pt-acc-item[open]>.pt-acc-q::after{content:\"\\2212\";transform:none}",
  ".pt-acc-a{padding:0 0 16px;color:var(--muted);white-space:pre-line;line-height:1.7}",
  ".pt-tst{display:grid;gap:20px;grid-template-columns:repeat(var(--pt-cols,3),minmax(0,1fr))}",
  ".pt-tst-row{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}.pt-tst-row>.pt-tst-card{flex:0 0 min(340px,85%);scroll-snap-align:start}",
  ".pt-tst-single{grid-template-columns:1fr;max-width:720px;margin-inline:auto;text-align:center}.pt-tst-single .pt-tst-who{justify-content:center}",
  ".pt-tst-card{margin:0;padding:24px;border-radius:18px;background:var(--surface);border:1px solid var(--border);display:flex;flex-direction:column;gap:12px}",
  ".pt-tst-card blockquote{margin:0;font-size:1.05em;line-height:1.7}.pt-stars{color:#f5b301;letter-spacing:2px}",
  ".pt-tst-who{display:flex;align-items:center;gap:12px}.pt-tst-who img{width:44px;height:44px;border-radius:50%;object-fit:cover}.pt-tst-role{display:block;color:var(--muted);font-size:.85em}",
  ".pt-plans{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));align-items:stretch}",
  ".pt-plan{position:relative;display:flex;flex-direction:column;gap:12px;padding:28px 22px;border-radius:20px;background:var(--surface);border:1px solid var(--border)}",
  ".pt-plan-featured{border:2px solid var(--accent);box-shadow:0 20px 48px rgba(0,0,0,.12)}",
  ".pt-plan-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);padding:3px 12px;border-radius:999px;background:var(--accent);color:var(--accent-contrast,#fff);font-size:.8em;font-weight:700;white-space:nowrap}",
  ".pt-plan-name{font-weight:700}.pt-plan-price{font-size:2.2em;font-weight:800;line-height:1.1}.pt-plan-period{color:var(--muted);font-size:.9em}",
  ".pt-plan ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;flex:1}.pt-plan li::before{content:\"\\2713\";color:var(--accent);font-weight:700;margin-inline-end:8px}",
  ".pt-team{display:grid;gap:24px;grid-template-columns:repeat(var(--pt-cols,4),minmax(0,1fr));text-align:center}",
  ".pt-member{display:block;color:inherit;text-decoration:none}.pt-member img{display:block;width:100%;max-width:160px;aspect-ratio:1/1;object-fit:cover;border-radius:50%;margin:0 auto 10px}",
  ".pt-member-name{font-weight:700}.pt-member-role{color:var(--muted);font-size:.9em}",
  ".pt-logos{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:28px 44px}.pt-logos img{display:block;height:40px;width:auto;max-width:160px;object-fit:contain}",
  ".pt-logos-gray img{filter:grayscale(1);opacity:.65;transition:filter .3s ease,opacity .3s ease}.pt-logos-gray :is(a,span):hover img{filter:none;opacity:1}",
  ".pt-alert{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:14px;border:1px solid}.pt-alert[hidden]{display:none}",
  ".pt-alert-icon{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;border:1.5px solid currentColor;font-size:12px;font-weight:700}",
  ".pt-alert-title{display:block;margin-bottom:2px}.pt-alert-close{margin-inline-start:auto;flex:none;border:0;background:none;color:inherit;font-size:20px;line-height:1;cursor:pointer;padding:0 4px}",
  ".pt-alert-info{background:#eff6ff;border-color:#bfdbfe;color:#1e3a8a}.pt-alert-success{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}",
  ".pt-alert-warning{background:#fffbeb;border-color:#fde68a;color:#92400e}.pt-alert-danger{background:#fef2f2;border-color:#fecaca;color:#991b1b}",
  ".pt-alert-promo{background:var(--accent);border-color:var(--accent);color:var(--accent-contrast,#fff)}",
  ".pt-mq{overflow:hidden;width:100%;--pt-mq-dir:-1}[dir=rtl] .pt-mq{--pt-mq-dir:1}",
  ".pt-mq-track{display:flex;align-items:center;width:max-content;animation:pt-mq var(--pt-mqs,30s) linear infinite}",
  ".pt-mq-rev .pt-mq-track{animation-direction:reverse}.pt-mq-pause:hover .pt-mq-track{animation-play-state:paused}",
  ".pt-mq-item{display:inline-flex;align-items:center;gap:20px;padding-inline-end:20px;white-space:nowrap}.pt-mq-sep{opacity:.5}",
  ".pt-logos.pt-mq{flex-wrap:nowrap;justify-content:flex-start}.pt-logos.pt-mq .pt-mq-item{padding-inline-end:44px}",
  "@keyframes pt-mq{from{transform:translateX(0)}to{transform:translateX(calc(50% * var(--pt-mq-dir)))}}",
  `@media (max-width:${PHONE_MAX}px){.pt-tst:not(.pt-tst-row){grid-template-columns:1fr}.pt-team{grid-template-columns:repeat(2,minmax(0,1fr))}}`,
  "@media (prefers-reduced-motion:reduce){.pt-mq-track{animation:none;flex-wrap:wrap;width:auto}.pt-mq-item[aria-hidden]{display:none}}",
  // Interactive elements (Interactive.tsx): tabs, a countdown, before and after, hotspots, a map, a popup.
  ".pt-tabs-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}.pt-tab{border:0;background:none;color:inherit;font:inherit;cursor:pointer;padding:8px 14px}",
  ".pt-tabs-underline .pt-tabs-list{border-bottom:1px solid var(--border);gap:0}.pt-tabs-underline .pt-tab{border-bottom:2px solid transparent;margin-bottom:-1px}.pt-tabs-underline .pt-tab[aria-selected=true]{border-color:var(--accent);color:var(--accent);font-weight:600}",
  ".pt-tabs-pills .pt-tab{border-radius:999px;background:var(--surface);border:1px solid var(--border)}.pt-tabs-pills .pt-tab[aria-selected=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-contrast,#fff)}",
  ".pt-tabs-boxed .pt-tabs-list{gap:0;margin-bottom:0}.pt-tabs-boxed .pt-tab{border:1px solid var(--border);border-bottom:0;border-radius:12px 12px 0 0;background:var(--bg)}.pt-tabs-boxed .pt-tab[aria-selected=true]{background:var(--surface);font-weight:600}.pt-tabs-boxed .pt-tab-panel{border:1px solid var(--border);border-radius:0 12px 12px 12px;padding:18px;background:var(--surface)}",
  ".pt-tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.pt-tab-panel{display:flex;gap:20px;align-items:flex-start}.pt-tab-panel[hidden]{display:none}.pt-tab-panel img{width:40%;max-width:320px;border-radius:14px;object-fit:cover}.pt-tab-text{white-space:pre-line;line-height:1.7}",
  ".pt-count{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}.pt-count-part{display:flex;flex-direction:column;align-items:center;min-width:64px}",
  ".pt-count-boxes .pt-count-part{padding:12px 10px;border-radius:14px;background:var(--surface);color:var(--text);border:1px solid var(--border)}.pt-count-n{font-size:2em;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}.pt-count-l{color:var(--muted);font-size:.8em}",
  ".pt-count-plain .pt-count-n{font-size:1.6em}.pt-count-done{text-align:center;font-weight:700}",
  ".pt-ba{position:relative;overflow:hidden;border-radius:inherit;--pt-ba:50%;touch-action:pan-y;user-select:none}.pt-ba img{display:block;width:100%;height:100%;object-fit:cover}",
  ".pt-ba-before{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--pt-ba)) 0 0)}[dir=rtl] .pt-ba-before{clip-path:inset(0 0 0 calc(100% - var(--pt-ba)))}",
  ".pt-ba-line{position:absolute;top:0;bottom:0;inset-inline-start:var(--pt-ba);width:3px;margin-inline-start:-1.5px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.15);pointer-events:none}",
  ".pt-ba-line::after{content:\"\\2194\";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.2)}",
  ".pt-ba-range{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:ew-resize}.pt-ba-range:focus-visible+*{outline:none}",
  ".pt-ba-tag{position:absolute;top:12px;padding:3px 10px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font-size:.8em;pointer-events:none}.pt-ba-tag-before{inset-inline-start:12px}.pt-ba-tag-after{inset-inline-end:12px}",
  ".pt-hot{position:relative}.pt-hot>img{display:block;width:100%;height:auto;border-radius:inherit}",
  ".pt-hot-spot{position:absolute;transform:translate(-50%,-50%);z-index:1}.pt-hot-spot[open]{z-index:3}",
  ".pt-hot-spot>summary{list-style:none;cursor:pointer;width:28px;height:28px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,.35),0 6px 16px rgba(0,0,0,.25);display:grid;place-items:center}.pt-hot-spot>summary::-webkit-details-marker{display:none}",
  ".pt-hot-spot>summary>span{width:10px;height:10px;border-radius:50%;background:var(--accent);animation:pt-hot 1.8s ease-in-out infinite}@keyframes pt-hot{50%{transform:scale(1.5)}}",
  ".pt-hot-card{position:absolute;top:36px;left:-12px;width:min(240px,70vw);padding:12px 14px;border-radius:14px;background:var(--surface,#fff);color:var(--text);box-shadow:0 14px 34px rgba(0,0,0,.2)}.pt-hot-end .pt-hot-card{left:auto;right:-12px}",
  ".pt-hot-card p{margin:6px 0 0;color:var(--muted);font-size:.9em}.pt-hot-card a{display:inline-block;margin-top:8px;color:var(--accent);font-weight:600}",
  ".pt-map{aspect-ratio:16/9;border-radius:inherit;overflow:hidden}.pt-map iframe{display:block;width:100%;height:100%;border:0}",
  ".pt-popup{border:0;border-radius:20px;padding:28px 24px 24px;width:min(92vw,var(--pt-pw,520px));max-height:88vh;overflow:auto;background:var(--surface,#fff);color:var(--text);box-shadow:0 30px 80px rgba(0,0,0,.3)}",
  ".pt-popup-s{--pt-pw:360px}.pt-popup-l{--pt-pw:760px}.pt-popup::backdrop{background:rgba(0,0,0,.45)}",
  ".pt-popup-bottom,.pt-popup-corner{position:fixed;bottom:16px;margin:0 auto;z-index:60}.pt-popup-corner{inset-inline-end:16px;inset-inline-start:auto;margin:0}",
  ".pt-popup-close{position:absolute;top:10px;inset-inline-end:12px;border:0;background:none;color:inherit;font-size:22px;line-height:1;cursor:pointer}",
  ".pt-popup-studio{border:2px dashed var(--accent);border-radius:20px;padding:20px;margin:16px auto;max-width:760px;background:var(--surface,#fff)}",
  `@media (max-width:${PHONE_MAX}px){.pt-tab-panel{flex-direction:column}.pt-tab-panel img{width:100%;max-width:none}}`,
  "@media (prefers-reduced-motion:reduce){.pt-hot-spot>summary>span{animation:none}}",
  // Store pieces: a search box, a menu of links, product card frames and category looks.
  ".pt-search{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 14px;padding-inline:14px 6px;background:var(--surface,#fff);border:1px solid var(--border);border-radius:14px;max-width:560px}",
  ".pt-search input{flex:1;min-width:0;border:0;background:none;color:inherit;font:inherit;padding:8px 0;outline:none}.pt-search-icon{width:18px;height:18px;flex:none;color:var(--muted)}",
  ".pt-search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 20%,transparent)}",
  ".pt-search-go{border:0;width:36px;height:36px;border-radius:50%;background:var(--accent);color:var(--accent-contrast,#fff);cursor:pointer;font-size:16px}[dir=rtl] .pt-search-go{transform:scaleX(-1)}",
  ".pt-search-pill{border-radius:999px}.pt-search-underline{border:0;border-bottom:2px solid var(--text);border-radius:0;background:none;padding-inline:0}",
  ".pt-search-boxed{border-radius:4px;border-width:2px}.pt-search-glass{background:color-mix(in srgb,var(--surface,#fff) 55%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}",
  ".pt-search .pt-btn{min-height:38px;padding:6px 18px}",
  ".pt-menu-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 18px}.pt-menu-column .pt-menu-list{flex-direction:column;gap:8px}",
  ".pt-menu a{color:inherit;text-decoration:none;display:inline-block;padding:6px 2px}.pt-menu a:hover{color:var(--accent)}",
  ".pt-menu-pills .pt-menu-list{gap:6px}.pt-menu-pills a{padding:6px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--border)}",
  ".pt-menu-underline a{border-bottom:2px solid transparent}.pt-menu-underline a:hover{border-color:var(--accent)}",
  ".pt-menu-buttons .pt-menu-list{gap:8px}.pt-menu-buttons a{padding:8px 16px;border-radius:10px;background:var(--accent);color:var(--accent-contrast,#fff)}.pt-menu-buttons a:hover{color:var(--accent-contrast,#fff);filter:brightness(1.08)}",
  ".pt-menu-fold{display:none}.pt-menu-fold>summary{cursor:pointer;list-style:none;font-weight:600;padding:6px 0}.pt-menu-fold>summary::-webkit-details-marker{display:none}.pt-menu-fold .pt-menu-list{flex-direction:column;gap:6px;padding-top:6px}",
  `@media (max-width:${PHONE_MAX}px){.pt-menu-folds>.pt-menu-list{display:none}.pt-menu-folds>.pt-menu-fold{display:block}}`,
  ".pt-products-grid[style*=--pt-cols]{grid-template-columns:repeat(var(--pt-cols),minmax(0,1fr))}",
  ".pt-card-bordered{border:1px solid var(--border);border-radius:18px;padding:10px}.pt-card-shadow{border-radius:18px;padding:10px;background:var(--surface);box-shadow:0 10px 30px rgba(0,0,0,.08)}",
  ".pt-card-soft{border-radius:18px;padding:10px;background:var(--accent-soft)}.pt-card-lift{transition:transform .3s ease,box-shadow .3s ease;border-radius:18px}",
  "@media (hover:hover){.pt-card-lift:hover{transform:translateY(-6px);box-shadow:0 18px 40px rgba(0,0,0,.12)}}",
  ".pt-tiles[style*=--pt-cols]{grid-template-columns:repeat(var(--pt-cols),minmax(0,1fr))}",
  ".pt-tiles-square .pt-tile img,.pt-tiles-square .pt-tile-blank{aspect-ratio:1/1}.pt-tiles-banner .pt-tile img,.pt-tiles-banner .pt-tile-blank{aspect-ratio:16/9}",
  ".pt-tiles-circle .pt-tile{align-items:center;text-align:center}.pt-tiles-circle .pt-tile img,.pt-tiles-circle .pt-tile-blank{aspect-ratio:1/1;border-radius:50%}",
  ".pt-tiles-overlay .pt-tile{position:relative;overflow:hidden;border-radius:18px}.pt-tiles-overlay .pt-tile span{position:absolute;inset-inline:0;bottom:0;padding:24px 16px 14px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.6))}",
  ".pt-tiles-pill{display:flex;flex-wrap:wrap;gap:10px}.pt-tiles-pill .pt-tile{flex-direction:row;align-items:center;gap:8px;padding:6px 14px 6px 6px;padding-inline:6px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--border)}",
  ".pt-tiles-pill .pt-tile img,.pt-tiles-pill .pt-tile-blank{width:32px;height:32px;aspect-ratio:auto;border-radius:50%}",
  `@media (max-width:${PHONE_MAX}px){.pt-products-grid[style*=--pt-cols],.pt-tiles[style*=--pt-cols]:not(.pt-tiles-pill){grid-template-columns:repeat(2,minmax(0,1fr))}}`,
  // A 3D model: square unless the element says; its link covers it.
  ".pt-model3d{display:block;width:100%;aspect-ratio:1/1;position:relative}",
  ".pt-model3d-stage{position:absolute;inset:0;border-radius:inherit;overflow:hidden}.pt-model3d-stage canvas{display:block;touch-action:pan-y}",
  ".pt-model3d-poster{position:absolute;inset:0;z-index:1;width:100%;height:100%;object-fit:contain;pointer-events:none}.pt-model3d-fallback{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;color:var(--muted);pointer-events:none}",
  ".pt-model3d-link{position:absolute;inset:0;z-index:1}",
  ".pt-anim-canvas{display:block;width:100%;height:100%}",
  ".pt-particles{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;color:var(--accent)}",
  ".pt-particles canvas{display:block;width:100%!important;height:100%!important}",
  // Smooth scrolling (Lenis) takes over the page's scroll.
  "html.lenis,html.lenis body{height:auto}.lenis.lenis-smooth{scroll-behavior:auto!important}.lenis.lenis-smooth [data-lenis-prevent]{overscroll-behavior:contain}.lenis.lenis-stopped{overflow:hidden}",
  // Words being typed: a blinking caret after them.
  ".pt-typing::after{content:\"\";display:inline-block;width:2px;height:1em;margin-inline-start:3px;background:currentColor;vertical-align:-.12em;animation:pt-caret .8s steps(1) infinite}",
  "@keyframes pt-caret{50%{opacity:0}}",
  // A moving mesh drifts across (still for whoever asked for less motion).
  "@keyframes pt-mesh{from{background-position:0% 0%}to{background-position:100% 100%}}",
  "@media (prefers-reduced-motion:reduce){[class]{--pt-mesh:none!important}}",
  // Animated layers.
  ".pt-fx{position:absolute;inset:0;z-index:1;overflow:hidden;border-radius:inherit;pointer-events:none}",
  ".pt-fx-shine::before{content:\"\";position:absolute;top:-25%;bottom:-25%;left:0;width:40%;background:linear-gradient(90deg,transparent,var(--pt-fxc,rgba(255,255,255,.55)),transparent);transform:translateX(-150%) skewX(-18deg);animation:pt-shine var(--pt-fxs,3s) ease-in-out infinite}",
  "@keyframes pt-shine{0%{transform:translateX(-150%) skewX(-18deg)}55%,100%{transform:translateX(300%) skewX(-18deg)}}",
  ".pt-fx-gradient{background:linear-gradient(115deg,var(--pt-fxc,#ff9ec7),var(--pt-fxc2,#9ee7ff),var(--pt-fxc,#ff9ec7));background-size:300% 100%;mix-blend-mode:soft-light;opacity:.75;animation:pt-flow calc(var(--pt-fxs,3s) * 2) linear infinite}",
  "@keyframes pt-flow{to{background-position:300% 0}}",
  `.pt-fx-grain{opacity:.22;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");animation:pt-grain .9s steps(3) infinite}`,
  "@keyframes pt-grain{0%{background-position:0 0}33%{background-position:-40px 25px}66%{background-position:30px -35px}100%{background-position:0 0}}",
  // A slider: one slide across, a row that snaps (it swipes without scripts); the buttons sit on top.
  ".pt-slider{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:var(--accent-soft)}",
  ".pt-slides{display:flex;width:100%;height:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}",
  ".pt-slider[data-ready] .pt-slides{scrollbar-width:none}",
  ".pt-slider[data-ready] .pt-slides::-webkit-scrollbar{display:none}",
  ".pt-slides:focus-visible{outline:2px solid var(--accent);outline-offset:-4px}",
  ".pt-slide{position:relative;flex:0 0 100%;width:100%;height:100%;scroll-snap-align:start;scroll-snap-stop:always}",
  ".pt-slide-link{display:block;width:100%;height:100%;color:inherit;text-decoration:none}",
  ".pt-slide-media{display:block;width:100%;height:100%;object-fit:var(--pt-fit,cover);-webkit-user-drag:none}",
  ".pt-slide-caption{position:absolute;inset-inline:0;bottom:0;display:block;padding:40px 20px 40px;color:#fff;font-weight:600;line-height:1.5;text-align:start;background:linear-gradient(to top,rgba(0,0,0,.55),transparent)}",
  ".pt-slider-ui{display:contents}",
  ".pt-slider-arrow,.pt-slider-pause{position:absolute;z-index:2;display:grid;place-items:center;border:0;border-radius:999px;background:rgba(255,255,255,.9);color:#111;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.18)}",
  ".pt-slider-arrow{top:50%;width:44px;height:44px;transform:translateY(-50%);transition:opacity .2s ease}",
  ".pt-slider-arrow svg{width:20px;height:20px}",
  ".pt-slider-prev{inset-inline-start:12px}",
  ".pt-slider-prev svg{transform:scaleX(-1)}",
  ".pt-slider-next{inset-inline-end:12px}",
  "[dir=rtl] .pt-slider-arrow svg{transform:scaleX(-1)}",
  "[dir=rtl] .pt-slider-prev svg{transform:none}",
  ".pt-slider-arrow:disabled{opacity:0;pointer-events:none}",
  ".pt-slider-pause{bottom:8px;inset-inline-end:12px;width:32px;height:32px}",
  ".pt-slider-pause svg{width:14px;height:14px}",
  ".pt-slider-dots{position:absolute;z-index:2;bottom:8px;inset-inline:56px;display:flex;flex-wrap:wrap;justify-content:center;gap:2px}",
  ".pt-slider-dot{display:grid;place-items:center;width:20px;height:24px;padding:0;border:0;background:none;cursor:pointer}",
  ".pt-slider-dot::before{content:\"\";width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.6);box-shadow:0 0 0 1px rgba(0,0,0,.12);transition:width .25s ease,background-color .25s ease}",
  ".pt-slider-dot[aria-current=true]{width:30px}",
  ".pt-slider-dot[aria-current=true]::before{width:22px;background:#fff}",
  ".pt-slider-arrow:focus-visible,.pt-slider-pause:focus-visible,.pt-slider-dot:focus-visible{outline:2px solid var(--accent);outline-offset:2px}",
  SLIDER_EFFECT_CSS,
  SLIDER_LOOK_CSS,
  // Natural content-box ratio until the editor supplies a height; authored padding and borders stay outside it.
  ".pt-svg{display:block;width:100%;max-width:100%;color:var(--accent)}",
  ".pt-product360{display:block;width:100%;max-width:100%}",
  ".pt-svg>svg{display:block;width:100%;height:100%;aspect-ratio:var(--pt-svg-aspect,1/1);overflow:visible}",
  ".pt-divider{border:0;border-top:1px solid var(--border);margin:0;width:100%}",
  ".pt-icon{display:inline-flex;align-items:center;gap:8px;color:var(--accent)}",
  // A section's edges: a band along its top or bottom, under its content (or over it, `front`).
  ".pt-has-edges{position:relative;isolation:isolate}",
  ".pt-edge{position:absolute;inset-inline:0;height:var(--pt-eh);line-height:0;pointer-events:none;z-index:-1}",
  ".pt-edge svg{display:block;width:100%;height:100%}",
  ".pt-edge-top{top:-1px;transform:scaleY(-1)}.pt-edge-bottom{bottom:-1px}",
  ".pt-edge-top.pt-edge-flip{transform:scale(-1,-1)}.pt-edge-bottom.pt-edge-flip{transform:scaleX(-1)}",
  ".pt-edge-front{z-index:2}",
  `@media (max-width:${PHONE_MAX}px){.pt-edge{height:var(--pt-ehp,var(--pt-eh))}}`,
  ".pt-icon>svg{width:var(--pt-isz,24px);height:var(--pt-isz,24px);flex:none}",
  ".pt-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 22px;border-radius:999px;font-weight:600;text-decoration:none;cursor:pointer;transition:filter .2s ease,background-color .2s ease}",
  ".pt-btn-solid{background:var(--accent);color:var(--accent-contrast,#fff)}",
  ".pt-btn-outline{border:1px solid currentColor;color:var(--accent)}",
  ".pt-btn-link{min-height:0;padding:0;color:var(--accent);text-decoration:underline;text-underline-offset:4px}",
  ".pt-btn:hover{filter:brightness(1.06)}",
  ".pt-btn:focus-visible,.pt-tile:focus-visible{outline:2px solid var(--accent);outline-offset:3px}",
  ".pt-block-title{margin:0 0 20px;font-family:var(--pt-font-heading);font-size:28px;line-height:1.2}",
  ".pt-products-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}",
  ".pt-products-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,1fr);gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}",
  ".pt-products-row>*{scroll-snap-align:start}",
  ".pt-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}",
  ".pt-tile{display:flex;flex-direction:column;gap:10px;text-decoration:none;color:inherit}",
  ".pt-tile img,.pt-tile-blank{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:18px;background:var(--accent-soft)}",
  ".pt-tile span{font-weight:600}",
  `@media (max-width:${TABLET_MAX}px){.pt-products-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.pt-section{padding-block:44px}}`,
  `@media (max-width:${PHONE_MAX}px){.pt-products-grid,.pt-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.pt-section{padding-block:32px}.pt-block-title{font-size:22px}}`,
  "@media (prefers-reduced-motion:reduce){.pt-btn,.pt-slider-arrow,.pt-slider-dot::before,.pt-hv-glow,.pt-hv-zoom>.pt-frame-media{transition:none}.pt-slides{scroll-behavior:auto}.pt-fx,.pt-fx::before{animation:none}.pt-fx-shine,.pt-spot{display:none}.pt-spark{animation:none!important;opacity:.85;transform:scale(.7)}}",
].join("");
