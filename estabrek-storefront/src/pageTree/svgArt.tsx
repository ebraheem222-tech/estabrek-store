/**
 * A page tree's drawing (svg) as the shop draws it: plain data checked again here
 * with the backend's rules (estabrek-store-backend src/lib/svgArt.ts) — a shape or a
 * setting that isn't on the lists, or a value that isn't safe, simply drops out —
 * then turned into SVG elements. Ids get the element's own id in front, so two
 * drawings on a page never share a gradient; theme colours go through the CSS
 * variables. No "@/" imports, so the tests can load this file directly.
 */
import { createElement, type ReactNode } from "react";

export const ART_LIMITS = { nodes: 600, depth: 10, path: 20000 } as const;
export type ArtNode = { t: string; a: Record<string, string>; c?: ArtNode[] };
export type Art = { viewBox: string; nodes: ArtNode[]; morph?: string };

const TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask"]);
const TOKENS: Record<string, string> = {
  text: "var(--text)", muted: "var(--muted)", accent: "var(--accent)", "accent-soft": "var(--accent-soft)", "accent-contrast": "var(--accent-contrast,#fff)",
  bg: "var(--bg)", surface: "var(--surface)", border: "var(--border)", white: "#fff", black: "#000", transparent: "transparent",
};
const NUM = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?(%|px)?$/i;
const PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+-]*$/;
const POINTS = /^[0-9eE\s,.+-]*$/;
const TRANSFORM = /^(\s*(matrix|translate|scale|rotate|skewX|skewY)\(\s*[-+0-9eE.,\s]*\)\s*,?)*\s*$/;
const ID = /^[A-Za-z][\w-]{0,40}$/;
const REF = /^url\(#([A-Za-z][\w-]{0,40})\)$/;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const VIEWBOX = /^-?\d+(\.\d+)?([ ,]+-?\d+(\.\d+)?){3}$/;

const num = (v: string) => v.length <= 24 && NUM.test(v.trim());
const oneOf = (...list: string[]) => (v: string) => list.includes(v);
const paint = (v: string) => v === "none" || v === "currentColor" || HEX.test(v) || v in TOKENS || REF.test(v);
const colour = (v: string) => v === "currentColor" || HEX.test(v) || v in TOKENS;
const transform = (v: string) => v.length <= 300 && TRANSFORM.test(v);
const ATTRS: Record<string, (v: string) => boolean> = {
  d: (v) => v.length <= ART_LIMITS.path && PATH.test(v),
  points: (v) => v.length <= ART_LIMITS.path && POINTS.test(v),
  cx: num, cy: num, r: num, rx: num, ry: num, x: num, y: num, x1: num, y1: num, x2: num, y2: num,
  width: num, height: num, fx: num, fy: num, offset: num,
  fill: paint, stroke: paint, "stop-color": colour,
  "stroke-width": num, "stroke-dashoffset": num, "stroke-miterlimit": num,
  "stroke-dasharray": (v) => v.length <= 200 && /^[\d.\s,%]*$/.test(v),
  "stroke-linecap": oneOf("butt", "round", "square"),
  "stroke-linejoin": oneOf("miter", "round", "bevel"),
  opacity: num, "fill-opacity": num, "stroke-opacity": num, "stop-opacity": num,
  "fill-rule": oneOf("nonzero", "evenodd"), "clip-rule": oneOf("nonzero", "evenodd"),
  transform, gradientTransform: transform,
  gradientUnits: oneOf("userSpaceOnUse", "objectBoundingBox"),
  id: (v) => ID.test(v),
  "clip-path": (v) => REF.test(v), mask: (v) => REF.test(v),
  "vector-effect": oneOf("non-scaling-stroke"),
};
/** React's names for the SVG settings written with a dash. */
const REACT_NAME: Record<string, string> = {
  "stroke-width": "strokeWidth", "stroke-dashoffset": "strokeDashoffset", "stroke-miterlimit": "strokeMiterlimit", "stroke-dasharray": "strokeDasharray",
  "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin", "fill-opacity": "fillOpacity", "stroke-opacity": "strokeOpacity",
  "stop-opacity": "stopOpacity", "stop-color": "stopColor", "fill-rule": "fillRule", "clip-rule": "clipRule", "clip-path": "clipPath", "vector-effect": "vectorEffect",
};

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** A saved drawing the shop may draw: what isn't allowed drops out; null when nothing is left. */
export function safeArt(raw: unknown): Art | null {
  if (!isObject(raw) || typeof raw.viewBox !== "string" || !VIEWBOX.test(raw.viewBox.trim())) return null;
  let count = 0;
  const walk = (list: unknown, depth: number): ArtNode[] => {
    if (!Array.isArray(list) || depth > ART_LIMITS.depth) return [];
    const out: ArtNode[] = [];
    for (const n of list) {
      if (count >= ART_LIMITS.nodes || !isObject(n) || typeof n.t !== "string" || !TAGS.has(n.t)) continue;
      count++;
      const a: Record<string, string> = {};
      if (isObject(n.a)) for (const [k, v] of Object.entries(n.a)) if (ATTRS[k] && typeof v === "string" && ATTRS[k](v)) a[k] = v;
      const c = n.c === undefined ? undefined : walk(n.c, depth + 1);
      out.push(c ? { t: n.t, a, c } : { t: n.t, a });
    }
    return out;
  };
  const nodes = walk(raw.nodes, 1);
  if (!nodes.length) return null;
  const morph = typeof raw.morph === "string" && raw.morph.length <= ART_LIMITS.path && PATH.test(raw.morph) ? raw.morph : undefined;
  return morph ? { viewBox: raw.viewBox.trim(), nodes, morph } : { viewBox: raw.viewBox.trim(), nodes };
}

/** Whether a drawing has lines (it can be drawn line by line, its lines can run). */
export function artHasLines(art: Art): boolean {
  const walk = (list: ArtNode[]): boolean => list.some((n) => (n.a.stroke && n.a.stroke !== "none") || (n.c ? walk(n.c) : false));
  return walk(art.nodes);
}

/** The shapes a drawing's parts are (definitions, gradients and masks aren't): the editor picks them one by one. */
const DRAWN = new Set(["g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);

/**
 * The drawing as SVG elements; `prefix` (the element's id) goes in front of every id. Each shape carries its place
 * in the drawing (data-art-part="0.2.1", as the editor's focus mode names its parts, and its morphs find them).
 */
export function ArtView({ art, prefix, className, stretch }: { art: Art; prefix: string; className?: string; stretch?: boolean }): ReactNode {
  let morphed = false;
  const draw = (n: ArtNode, i: number, at: string): ReactNode => {
    const place = at ? `${at}.${i}` : String(i);
    const props: Record<string, unknown> = { key: i };
    if (DRAWN.has(n.t)) props["data-art-part"] = place;
    const style: Record<string, string> = {};
    for (const [k, v] of Object.entries(n.a)) {
      const name = REACT_NAME[k] ?? k;
      if (k === "id") props.id = `${prefix}-${v}`;
      else if (REF.test(v)) props[name] = v.replace(REF, (_m, id: string) => `url(#${prefix}-${id})`);
      // A theme colour can't be an SVG setting: it goes in the style, through the CSS variable.
      else if ((k === "fill" || k === "stroke" || k === "stop-color") && v in TOKENS) style[name] = TOKENS[v];
      else props[name] = v;
    }
    if (Object.keys(style).length) props.style = style;
    if (n.t === "path" && art.morph && !morphed) {
      morphed = true;
      props["data-pt-morph"] = art.morph;
    }
    return createElement(n.t, props, ...(n.c ?? []).map((c, j) => draw(c, j, place)));
  };
  return (
    <svg className={className} viewBox={art.viewBox} xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true" {...(stretch ? { preserveAspectRatio: "none" } : {})}>
      {art.nodes.map((n, i) => draw(n, i, ""))}
    </svg>
  );
}

/** A drawing's shapes turning into others (the backend's svg props `morph`): when, how long, on what curve. */
export type ArtMorphData = { on: "hover" | "click" | "loop" | "scroll" | "view"; duration?: number; ease?: string; stagger?: number; pairs: Array<{ part: string; to: string }> };
const MORPH_ON = new Set(["hover", "click", "loop", "scroll", "view"]);

/** A saved morph the shop may play (checked again as the backend did; the curve is read when it plays), or null. */
export function safeMorph(raw: unknown): ArtMorphData | null {
  if (!isObject(raw) || typeof raw.on !== "string" || !MORPH_ON.has(raw.on) || !Array.isArray(raw.pairs)) return null;
  const pairs = raw.pairs
    .filter((p): p is { part: string; to: string } => isObject(p) && typeof p.part === "string" && /^\d{1,3}(\.\d{1,3}){0,9}$/.test(p.part) && typeof p.to === "string" && p.to.length > 0 && p.to.length <= ART_LIMITS.path && PATH.test(p.to))
    .slice(0, 20)
    .map((p) => ({ part: p.part, to: p.to }));
  if (!pairs.length) return null;
  const n = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
  const out: ArtMorphData = { on: raw.on as ArtMorphData["on"], pairs };
  const duration = n(raw.duration, 0.1, 10), stagger = n(raw.stagger, 0, 2);
  if (duration !== undefined) out.duration = duration;
  if (stagger !== undefined) out.stagger = stagger;
  if (typeof raw.ease === "string" && raw.ease.length <= 60) out.ease = raw.ease;
  return out;
}
