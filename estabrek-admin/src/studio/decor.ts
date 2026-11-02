/**
 * The ready decorations (decorLibrary.ts) as drawings: the file's own look (its fill, line…)
 * goes on a group around its shapes so nothing changes when it's read as data, and the
 * words' colour becomes the theme's so its colours can change.
 */
import { tr } from "../lib/words";
import { DECOR, type DecorGroup } from "./decorLibrary";
import { importSvg, type Art, type ArtNode } from "./svgArt";

const ROOT_LOOK = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity"];

/** A decoration's SVG as a drawing (null if nothing in it may be kept); `own` keeps the words' colour. */
export function decorArt(svg: string, own = false): Art | null {
  const open = /<svg\b([^>]*)>/i.exec(svg);
  if (!open) return null;
  const look = ROOT_LOOK.map((k) => new RegExp(`\\s${k}="([^"]*)"`).exec(open[1])).map((m, i) => (m ? ` ${ROOT_LOOK[i]}="${m[1]}"` : "")).join("");
  const inner = svg.slice(open.index + open[0].length).replace(/<\/svg>\s*$/i, "");
  const wrapped = `<svg${open[1]}><g${look}>${inner}</g></svg>`;
  const art = importSvg(wrapped).art;
  if (!art || own) return art;
  const paint = (n: ArtNode): ArtNode => {
    const a = { ...n.a };
    for (const k of ["fill", "stroke", "stop-color"]) if (a[k] === "currentColor") a[k] = "accent";
    return n.c ? { ...n, a, c: n.c.map(paint) } : { ...n, a };
  };
  return { ...art, nodes: art.nodes.map(paint) };
}

export const DECOR_GROUPS: Array<[DecorGroup, () => string]> = [
  ["waves", () => tr("موجات", "Waves")],
  ["triangles", () => tr("مثلثات وزوايا", "Triangles & angles")],
  ["curves", () => tr("منحنيات وأقواس", "Curves & arcs")],
  ["geometric", () => tr("هندسية", "Geometric")],
  ["blobs", () => tr("فقاعات وغيوم", "Blobs & clouds")],
  ["decorative", () => tr("زخارف", "Ornaments")],
  ["abstract", () => tr("تجريدية", "Abstract")],
  ["masks", () => tr("أقنعة", "Masks")],
  ["frames", () => tr("إطارات", "Frames")],
];
/** `art` in the theme's colour (a drawing), `plain` in the words' colour (an edge takes its colour from the section). */
export type Decor = { group: DecorGroup; key: string; name: () => string; art: Art; plain: Art };
/** A decoration that can be a section's edge: a band at least four times wider than it's high. */
export const isEdge = (d: Decor) => {
  const [, , w, h] = d.art.viewBox.split(/[ ,]+/).map(Number);
  return w / h >= 4;
};
let all: Decor[] | null = null;
/** Every decoration as a drawing (read once). */
export function decorations(): Decor[] {
  if (!all) {
    all = [];
    for (const [group, key, ar, en, svg] of DECOR) {
      const [art, plain] = [decorArt(svg), decorArt(svg, true)];
      if (art && plain) all.push({ group, key, name: () => tr(ar, en), art, plain });
    }
  }
  return all;
}
