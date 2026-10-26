/**
 * Drawings (svg) in the new editor: the data the page keeps (never markup), the rules it
 * must pass (the backend's lib/svgArt.ts checks the same on save, the shop again when
 * it draws), turning an SVG file into that data — what isn't allowed is dropped and
 * named — and changing a drawing's colours and line width.
 */
export type ArtNode = { t: string; a: Record<string, string>; c?: ArtNode[] };
export type Art = { viewBox: string; nodes: ArtNode[]; morph?: string };
export const ART_LIMITS = { nodes: 600, depth: 10, path: 20000, file: 400_000 } as const;

export const ART_TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask"]);
export const ART_TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black", "transparent"];
const NUM = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?(%|px)?$/i;
const PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,.+-]*$/;
const POINTS = /^[0-9eE\s,.+-]*$/;
const TRANSFORM = /^(\s*(matrix|translate|scale|rotate|skewX|skewY)\(\s*[-+0-9eE.,\s]*\)\s*,?)*\s*$/;
const ID = /^[A-Za-z][\w-]{0,40}$/;
const REF = /^url\(#[A-Za-z][\w-]{0,40}\)$/;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const VIEWBOX = /^-?\d+(\.\d+)?([ ,]+-?\d+(\.\d+)?){3}$/;
const num = (v: string) => v.length <= 24 && NUM.test(v.trim());
const oneOf = (...list: string[]) => (v: string) => list.includes(v);
const paint = (v: string) => v === "none" || v === "currentColor" || HEX.test(v) || ART_TOKENS.includes(v) || REF.test(v);
const colour = (v: string) => v === "currentColor" || HEX.test(v) || ART_TOKENS.includes(v);
const transform = (v: string) => v.length <= 300 && TRANSFORM.test(v);
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

/** Whether a drawing passes the page's rules as it is. */
export function artIsSafe(art: Art): boolean {
  if (!VIEWBOX.test(art.viewBox) || !art.nodes.length || (art.morph !== undefined && !ART_ATTRS.d(art.morph))) return false;
  let count = 0;
  const walk = (list: ArtNode[], depth: number): boolean =>
    depth <= ART_LIMITS.depth &&
    list.every((n) => ++count <= ART_LIMITS.nodes && ART_TAGS.has(n.t) && Object.entries(n.a).every(([k, v]) => ART_ATTRS[k]?.(v)) && (!n.c || walk(n.c, depth + 1)));
  return walk(art.nodes, 1);
}

/* ----------------------------------------------------------------- colours */

const NAMED: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080",
  pink: "#ffc0cb", gray: "#808080", grey: "#808080", silver: "#c0c0c0", maroon: "#800000", navy: "#000080", teal: "#008080", olive: "#808000",
  lime: "#00ff00", aqua: "#00ffff", fuchsia: "#ff00ff", gold: "#ffd700", brown: "#a52a2a", transparent: "transparent",
};
const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
/** A colour written any common way (#abc, rgb(), rgba(), a name) as the page keeps it, or null. */
export function normColour(v: string): string | null {
  const s = v.trim().toLowerCase();
  if (s === "none" || s === "currentcolor") return s === "none" ? "none" : "currentColor";
  if (HEX.test(s)) return s;
  if (NAMED[s]) return NAMED[s];
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (m) {
    const alpha = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return `#${hex2(+m[1])}${hex2(+m[2])}${hex2(+m[3])}${alpha < 1 ? hex2(alpha * 255) : ""}`;
  }
  return null;
}

const each = (art: Art, fn: (n: ArtNode) => void) => {
  const walk = (list: ArtNode[]) => list.forEach((n) => {
    fn(n);
    if (n.c) walk(n.c);
  });
  walk(art.nodes);
};
const PAINTS = ["fill", "stroke", "stop-color"];
/** The colours a drawing uses, each once (no "none", no gradients by reference). */
export function paletteOf(art: Art): string[] {
  const out: string[] = [];
  each(art, (n) => PAINTS.forEach((k) => {
    const v = n.a[k];
    if (v && v !== "none" && !v.startsWith("url(") && !out.includes(v)) out.push(v);
  }));
  return out;
}
/** The drawing with one of its colours changed everywhere. */
export function recolor(art: Art, from: string, to: string): Art {
  const copy: Art = structuredClone(art);
  each(copy, (n) => PAINTS.forEach((k) => {
    if (n.a[k] === from) n.a[k] = to;
  }));
  return copy;
}
const lined = (n: ArtNode) => Boolean(n.a.stroke && n.a.stroke !== "none");
export function hasLines(art: Art): boolean {
  let yes = false;
  each(art, (n) => {
    if (lined(n)) yes = true;
  });
  return yes;
}
/** The width of a drawing's lines (the first one's), or null when it has none. */
export function lineWidthOf(art: Art): number | null {
  let w: number | null = null;
  each(art, (n) => {
    if (w === null && lined(n)) w = parseFloat(n.a["stroke-width"] ?? "1") || 1;
  });
  return w;
}
/** Every line of the drawing at one width. */
export function setLineWidth(art: Art, width: number): Art {
  const copy: Art = structuredClone(art);
  each(copy, (n) => {
    if (lined(n)) n.a["stroke-width"] = String(Math.round(width * 10) / 10);
  });
  return copy;
}

/* ------------------------------------------------------------------ import */

/** What an SVG file may carry that's quietly left out (it changes nothing seen). */
const QUIET_TAGS = new Set(["title", "desc", "metadata", "style", "sodipodi:namedview", "namedview"]);
const QUIET_ATTRS = /^(class|style|version|xmlns(:\w+)?|xml:space|data-[\w-]+|enable-background|overflow|baseProfile|inkscape:[\w-]+|sodipodi:[\w-]+|serif:[\w-]+|aria-[\w-]+|role|focusable)$/;
const PAINT_KEYS = new Set(["fill", "stroke", "stop-color"]);
const STYLE_KEYS = new Set(Object.keys(ART_ATTRS).filter((k) => !["d", "points", "id", "transform", "gradientTransform", "gradientUnits", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "offset", "fx", "fy"].includes(k)));

const declsOf = (css: string) => {
  const out: Record<string, string> = {};
  for (const part of css.split(";")) {
    const i = part.indexOf(":");
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim().replace(/\s*!important$/, "");
  }
  return out;
};

export type ImportResult = { art: Art | null; dropped: string[]; problem?: "big" | "notSvg" | "empty" };

/**
 * An SVG file as a drawing the page can keep: allowed shapes and settings only (from
 * attributes, the file's class rules and inline styles, in CSS's order), colours
 * written as hex, everything else dropped and listed by name.
 */
export function importSvg(text: string): ImportResult {
  if (text.length > ART_LIMITS.file) return { art: null, dropped: [], problem: "big" };
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.localName !== "svg" || doc.getElementsByTagName("parsererror").length) return { art: null, dropped: [], problem: "notSvg" };
  const dropped = new Set<string>();
  // Class rules from <style> (".a{fill:#f00}", ".a,.b{…}"); anything fancier is left out.
  const classes: Record<string, Record<string, string>> = {};
  for (const st of Array.from(root.getElementsByTagName("style"))) {
    for (const m of (st.textContent ?? "").matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      for (const sel of m[1].split(",").map((s) => s.trim())) {
        if (/^\.[\w-]+$/.test(sel)) classes[sel.slice(1)] = { ...classes[sel.slice(1)], ...declsOf(m[2]) };
        else if (sel) dropped.add("style rule");
      }
    }
  }
  const vb = root.getAttribute("viewBox")?.trim();
  const w = parseFloat(root.getAttribute("width") ?? "");
  const h = parseFloat(root.getAttribute("height") ?? "");
  const viewBox = vb && VIEWBOX.test(vb) ? vb.replace(/[ ,]+/g, " ") : w > 0 && h > 0 ? `0 0 ${w} ${h}` : "";
  if (!viewBox) return { art: null, dropped: [], problem: "notSvg" };
  let count = 0;
  const take = (k: string, raw: string, into: Record<string, string>) => {
    const v = PAINT_KEYS.has(k) && !raw.startsWith("url(") ? normColour(raw) : raw.trim().replace(/^url\(\s*['"]?#([\w-]+)['"]?\s*\)$/, "url(#$1)");
    if (v !== null && ART_ATTRS[k]?.(v)) into[k] = v;
    else if (!QUIET_ATTRS.test(k)) dropped.add(k);
  };
  const walk = (el: Element, depth: number): ArtNode[] => {
    const out: ArtNode[] = [];
    for (const child of Array.from(el.children)) {
      const tag = child.localName;
      if (QUIET_TAGS.has(tag) || QUIET_TAGS.has(child.nodeName)) continue;
      if (!ART_TAGS.has(tag) || depth > ART_LIMITS.depth) {
        dropped.add(tag);
        continue;
      }
      if (++count > ART_LIMITS.nodes) {
        dropped.add(`> ${ART_LIMITS.nodes}`);
        break;
      }
      const a: Record<string, string> = {};
      for (const at of Array.from(child.attributes)) if (at.name !== "class" && at.name !== "style") take(at.name, at.value, a);
      for (const c of (child.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)) for (const [k, v] of Object.entries(classes[c] ?? {})) if (STYLE_KEYS.has(k)) take(k, v, a);
      for (const [k, v] of Object.entries(declsOf(child.getAttribute("style") ?? ""))) if (STYLE_KEYS.has(k)) take(k, v, a);
      const kids = walk(child, depth + 1);
      out.push(kids.length ? { t: tag, a, c: kids } : { t: tag, a });
    }
    return out;
  };
  const nodes = walk(root, 1);
  if (!nodes.length) return { art: null, dropped: [...dropped], problem: "empty" };
  return { art: { viewBox, nodes }, dropped: [...dropped] };
}
