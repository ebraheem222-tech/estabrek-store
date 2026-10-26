/**
 * Drawings (SVG) in a page tree, kept as plain data and never as markup: a view box
 * and a tree of shapes whose tags and attributes come from short lists, every value
 * checked. Scripts, links, pictures, fonts, foreign content, styles and outside
 * references can't be written this way. The admin turns an uploaded SVG into this
 * (dropping what isn't allowed); the shop draws it as elements and checks it again
 * (estabrek-storefront src/pageTree/svgArt.ts repeats these rules).
 */
export const ART_LIMITS = { nodes: 600, depth: 10, path: 20000 } as const;
export type ArtNode = { t: string; a: Record<string, string>; c?: ArtNode[] };
export type Art = { viewBox: string; nodes: ArtNode[]; morph?: string };

export const ART_TAGS = ["g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask"] as const;
/** Theme colours a drawing may use (the shop maps them to its CSS variables). */
export const ART_TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black", "transparent"] as const;

const NUM = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?(%|px)?$/i;
const PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+-]*$/;
const POINTS = /^[0-9eE\s,.+-]*$/;
const TRANSFORM = /^(\s*(matrix|translate|scale|rotate|skewX|skewY)\(\s*[-+0-9eE.,\s]*\)\s*,?)*\s*$/;
const ID = /^[A-Za-z][\w-]{0,40}$/;
const REF = /^url\(#[A-Za-z][\w-]{0,40}\)$/;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const VIEWBOX = /^-?\d+(\.\d+)?([ ,]+-?\d+(\.\d+)?){3}$/;

const tokens = ART_TOKENS as readonly string[];
const num = (v: string) => v.length <= 24 && NUM.test(v.trim());
const oneOf = (...list: string[]) => (v: string) => list.includes(v);
const paint = (v: string) => v === "none" || v === "currentColor" || HEX.test(v) || tokens.includes(v) || REF.test(v);
const colour = (v: string) => v === "currentColor" || HEX.test(v) || tokens.includes(v);
const transform = (v: string) => v.length <= 300 && TRANSFORM.test(v);

/** Every attribute a drawing may carry, and what its value may be. */
export const ART_ATTRS: Record<string, (v: string) => boolean> = {
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

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** What's wrong with a drawing (the first problem), or null when it's safe as it is. */
export function checkArt(raw: unknown): string | null {
  if (!isObject(raw)) return "A drawing is an object";
  if (typeof raw.viewBox !== "string" || !VIEWBOX.test(raw.viewBox.trim())) return "A drawing needs a view box like “0 0 200 200”";
  if (raw.morph !== undefined && (typeof raw.morph !== "string" || raw.morph.length > ART_LIMITS.path || !PATH.test(raw.morph))) return "The second shape isn't a path";
  if (!Array.isArray(raw.nodes) || !raw.nodes.length) return "A drawing has at least one shape";
  let count = 0;
  const walk = (list: unknown[], depth: number): string | null => {
    if (depth > ART_LIMITS.depth) return `Shapes nested more than ${ART_LIMITS.depth} deep`;
    for (const n of list) {
      if (++count > ART_LIMITS.nodes) return `More than ${ART_LIMITS.nodes} shapes`;
      if (!isObject(n) || typeof n.t !== "string" || !(ART_TAGS as readonly string[]).includes(n.t)) return `Not a shape a drawing may hold: ${isObject(n) ? String(n.t) : "?"}`;
      if (!isObject(n.a)) return "A shape's settings are an object";
      for (const [k, v] of Object.entries(n.a)) {
        const ok = ART_ATTRS[k];
        if (!ok) return `Not a setting a shape may have: ${k}`;
        if (typeof v !== "string" || !ok(v)) return `Not a safe value for ${k}`;
      }
      if (n.c !== undefined) {
        if (!Array.isArray(n.c)) return "A shape's parts are a list";
        const deeper = walk(n.c, depth + 1);
        if (deeper) return deeper;
      }
    }
    return null;
  };
  return walk(raw.nodes, 1);
}
