/**
 * Columns in the new editor (track B, phase 3): the ready-made splits, a new element
 * of each kind, which element may go where (the backend's lib/pageTree.ts checks the
 * same), and the changes that switch a columns' split or drag the line between two
 * cells. Shares are whole parts ([1, 2] = a third and two thirds); dragging works in
 * twelfths.
 */
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";
import type { TreeIndex } from "./treeIndex";
import { SHAPES, defaultsOf } from "./svgShapes";

export const MAX_CELLS = 4;
/** Columns › cell › columns, and no deeper. */
export const MAX_COLUMNS_DEPTH = 2;

export const PRESETS: Array<{ widths: number[]; label: () => string }> = [
  { widths: [1, 1], label: () => tr("نصّين", "Two halves") },
  { widths: [1, 2], label: () => tr("ثلث وثلثين", "A third and two thirds") },
  { widths: [2, 1], label: () => tr("ثلثين وثلث", "Two thirds and a third") },
  { widths: [1, 1, 1], label: () => tr("تلاتة متساوية", "Three equal") },
  { widths: [1, 2, 1], label: () => tr("ربع ونص وربع", "A quarter, a half, a quarter") },
  { widths: [1, 1, 1, 1], label: () => tr("أربعة متساوية", "Four equal") },
];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** [4, 8] → [1, 2]. */
export const reduceWidths = (w: number[]) => {
  const g = w.reduce(gcd, 0);
  return g > 1 ? w.map((x) => x / g) : w.slice();
};
export const sameWidths = (a: number[] | undefined, b: number[] | undefined) => {
  if (!a || !b || a.length !== b.length) return false;
  const [x, y] = [reduceWidths(a), reduceWidths(b)];
  return x.every((v, i) => v === y[i]);
};

/** Shares as twelfths that add up to 12 ([1, 2] → [4, 8]); measured widths work too. */
export function twelfths(shares: number[]): number[] {
  const sum = shares.reduce((a, b) => a + b, 0);
  const out = shares.map((x) => Math.max(1, Math.round(sum > 0 ? (x / sum) * 12 : 12 / shares.length)));
  let diff = 12 - out.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const i = diff > 0 ? out.indexOf(Math.min(...out)) : out.indexOf(Math.max(...out));
    out[i] += Math.sign(diff);
    diff -= Math.sign(diff);
  }
  return out;
}

/** The line after cell `i` dragged to `share` (0–1 of the two cells together), in twelfths; each cell keeps at least one. */
export function dragLine(w12: number[], i: number, share: number): number[] {
  const pair = w12[i] + w12[i + 1];
  const a = Math.max(1, Math.min(pair - 1, Math.round(share * pair)));
  const out = w12.slice();
  out[i] = a;
  out[i + 1] = pair - a;
  return out;
}

/* ------------------------------------------------------------ new elements */

/** A maker of fresh ids, none used on the page or earlier in the same change. */
export function idMaker(taken: (id: string) => boolean) {
  const mine = new Set<string>();
  return (prefix: string) => {
    for (;;) {
      const id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
      if (!taken(id) && !mine.has(id)) {
        mine.add(id);
        return id;
      }
    }
  };
}
type Ids = (prefix: string) => string;

export const ADDABLE = ["heading", "text", "button", "image", "video", "slider", "svg", "product360", "icon", "spacer", "divider", "categories", "form", "columns"] as const;
export type NewKind = (typeof ADDABLE)[number];

/** A new element's first words (the shop's words, in the language being edited). */
const FIRST_WORDS: Record<"heading" | "text" | "button", Record<Lang, string>> = {
  heading: { ar: "عنوان جديد", en: "A new heading", he: "כותרת חדשה" },
  text: { ar: "نص جديد، اكتبه هون.", en: "New text, write it here.", he: "טקסט חדש, כתבו אותו כאן." },
  button: { ar: "المزيد", en: "More", he: "עוד" },
};

export const newCell = (id: Ids): PageTreeNode => ({ id: id("cell"), type: "cell", props: {}, children: [] });
export const newColumns = (widths: number[], id: Ids): PageTreeNode => ({
  id: id("cols"),
  type: "columns",
  props: {},
  style: { base: { widths: reduceWidths(widths) } },
  children: widths.map(() => newCell(id)),
});
/** A section of the page's width with columns in it. */
export const newSection = (widths: number[], id: Ids): PageTreeNode => ({ id: id("sec"), type: "section", props: { contained: true }, children: [newColumns(widths, id)] });

/** `src` is the picture or clip for those two, and a slider's first picture. */
export function newElement(kind: NewKind, lang: Lang, id: Ids, src?: string): PageTreeNode {
  switch (kind) {
    case "heading":
      return { id: id("h"), type: "heading", props: { level: 3, text: { [lang]: FIRST_WORDS.heading[lang] } } };
    case "text":
      return { id: id("t"), type: "text", props: { text: { [lang]: FIRST_WORDS.text[lang] } } };
    case "button":
      return { id: id("b"), type: "button", props: { label: { [lang]: FIRST_WORDS.button[lang] }, href: "/shop", variant: "solid" } };
    case "image":
      return { id: id("img"), type: "image", props: { src } };
    case "video":
      return { id: id("v"), type: "video", props: { src, controls: true } };
    case "product360":
      // Its product is chosen in its panel.
      return { id: id("p360"), type: "product360", props: {} };
    case "svg": {
      // A drawing starts as a blob from the library.
      const blob = SHAPES[0];
      return { id: id("svg"), type: "svg", props: { shape: blob.key, knobs: defaultsOf(blob), art: blob.make(defaultsOf(blob)) } };
    }
    case "slider":
      return { id: id("sl"), type: "slider", props: { slides: src ? [{ src, kind: "image" }] : [], loop: true, arrows: true, dots: true } };
    case "icon":
      return { id: id("i"), type: "icon", props: { name: "heart" } };
    case "spacer":
      return { id: id("sp"), type: "spacer", props: { size: 32 } };
    case "divider":
      return { id: id("d"), type: "divider", props: {} };
    case "categories":
      return { id: id("cat"), type: "categories", props: { limit: 6 } };
    case "form":
      return { id: id("f"), type: "form", props: { kind: "newsletter" } };
    case "columns":
      return newColumns([1, 1], id);
  }
}

/** A copy with new ids all the way down. */
export function copyOf(node: PageTreeNode, id: Ids): PageTreeNode {
  return { ...structuredClone(node), id: id(node.type.slice(0, 4)), children: node.children?.map((c) => copyOf(c, id)) };
}

/* ------------------------------------------------------------------ slider */

/** A slider's slides (the backend keeps 12 at most); words are in the three languages. */
export const MAX_SLIDES = 12;
export type Slide = { src: string; kind: "image" | "video"; alt?: Record<string, string>; caption?: Record<string, string>; href?: string };
export const slidesOf = (n: PageTreeNode): Slide[] => (Array.isArray(n.props?.slides) ? (n.props.slides as Slide[]) : []);

/** Pictures or clips added at the end, as many as still fit. */
export const addSlides = (slides: Slide[], srcs: string[], kind: Slide["kind"]): Slide[] => [...slides, ...srcs.slice(0, Math.max(0, MAX_SLIDES - slides.length)).map((src) => ({ src, kind }))];

/** Slide `i` moved `delta` places (it stops at the ends). */
export function moveSlide(slides: Slide[], i: number, delta: number): Slide[] {
  const to = Math.max(0, Math.min(slides.length - 1, i + delta));
  if (!slides[i] || to === i) return slides;
  const out = slides.slice();
  const [s] = out.splice(i, 1);
  out.splice(to, 0, s);
  return out;
}

/** Slide `i` with some things changed; an empty word list or link drops out. */
export function changeSlide(slides: Slide[], i: number, patch: Partial<Slide>): Slide[] {
  return slides.map((s, j) => {
    if (j !== i) return s;
    const next: Record<string, unknown> = { ...s, ...patch };
    for (const [k, v] of Object.entries(next)) if (v === undefined || v === "" || (v && typeof v === "object" && !Object.keys(v).length)) delete next[k];
    return next as Slide;
  });
}

/* -------------------------------------------------------------- what goes where */

const CONTENT = new Set(["heading", "text", "image", "button", "video", "slider", "svg", "product360", "spacer", "divider", "icon", "products", "categories", "form"]);
const HOLDERS = new Set(["section", "grid", "stack", "cell"]);
/** The tree's elements the editor may move, change or delete (the page, old sections and rose scenes have their own ways). */
export const isFree = (type: string | undefined) => Boolean(type) && !["page", "legacy", "roseBlock"].includes(type!);

/** Whether a `child` may go straight inside `parent`. */
export function accepts(parent: string, child: string): boolean {
  if (parent === "page") return child === "section";
  if (parent === "columns") return child === "cell";
  if (!HOLDERS.has(parent)) return false;
  return CONTENT.has(child) || child === "columns" || child === "grid" || child === "stack";
}

/** How many columns there are from the page down to this element, itself included. */
export function columnsAround(index: TreeIndex, id: string | null): number {
  let n = 0;
  for (let at = id; at; at = index.nodes.get(at)?.parentId ?? null) if (index.nodes.get(at)?.node.type === "columns") n++;
  return n;
}
const columnsInside = (n: PageTreeNode): number => (n.type === "columns" ? 1 : 0) + Math.max(0, ...(n.children ?? []).map(columnsInside));

/** Can `node` go inside `parentId`? Not into itself, and columns nest two deep at most. */
export function canHold(index: TreeIndex, parentId: string, node: PageTreeNode): boolean {
  const parent = index.nodes.get(parentId)?.node;
  if (!parent || !accepts(parent.type, node.type)) return false;
  for (let at: string | null = parentId; at; at = index.nodes.get(at)?.parentId ?? null) if (at === node.id) return false;
  return columnsAround(index, parentId) + columnsInside(node) <= MAX_COLUMNS_DEPTH;
}

/* ---------------------------------------------------------------- changes */

type Styles = Partial<Record<TreeScreen, Record<string, unknown>>>;

/** One screen's look with some keys changed; undefined or null drops a key. */
export function styleOp(node: PageTreeNode, screen: TreeScreen, patch: Record<string, unknown>): PageDraftOp {
  const next: Record<string, unknown> = { ...(((node.style ?? {}) as Styles)[screen] ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null) delete next[k];
    else next[k] = v;
  }
  return { op: "setStyle", nodeId: node.id, screen, style: Object.keys(next).length ? next : null };
}

/**
 * Switches columns to `widths`, one cell per share: new cells come empty at the end;
 * a cell that goes hands what it held to the last cell that stays, so nothing is
 * lost. A tablet's or phone's own shares go when they no longer fit.
 */
export function layoutOps(cols: PageTreeNode, widths: number[], id: Ids): PageDraftOp[] {
  const cells = cols.children ?? [];
  const want = Math.max(1, Math.min(MAX_CELLS, widths.length));
  const ops: PageDraftOp[] = [];
  for (let i = cells.length; i < want; i++) ops.push({ op: "insert", parentId: cols.id, index: i, node: newCell(id) });
  if (cells.length > want) {
    const keep = cells[want - 1];
    let at = keep.children?.length ?? 0;
    for (const gone of cells.slice(want)) {
      for (const c of gone.children ?? []) ops.push({ op: "move", nodeId: c.id, parentId: keep.id, index: at++ });
      ops.push({ op: "remove", nodeId: gone.id });
    }
  }
  ops.push(styleOp(cols, "base", { widths: reduceWidths(widths.slice(0, want)) }));
  for (const screen of ["tablet", "mobile"] as const) {
    const own = ((cols.style ?? {}) as Styles)[screen]?.widths;
    if (Array.isArray(own) && own.length !== want) ops.push(styleOp(cols, screen, { widths: null }));
  }
  return ops;
}

/** The split a screen shows: its own shares, else the computer's, else equal. */
export function shownWidths(cols: PageTreeNode, screen: TreeScreen): number[] {
  const s = (cols.style ?? {}) as Styles;
  const own = (k: TreeScreen) => (Array.isArray(s[k]?.widths) ? (s[k]!.widths as number[]) : undefined);
  return own(screen) ?? own("base") ?? (cols.children ?? []).map(() => 1);
}

/** Takes cell `i` out: what it held goes to the cell before it (the next one, for the first), and its share goes too. */
export function dropCellOps(cols: PageTreeNode, i: number): PageDraftOp[] {
  const cells = cols.children ?? [];
  if (cells.length < 2 || !cells[i]) return [];
  const to = cells[i === 0 ? 1 : i - 1];
  let at = i === 0 ? 0 : to.children?.length ?? 0;
  const ops: PageDraftOp[] = (cells[i].children ?? []).map((c) => ({ op: "move" as const, nodeId: c.id, parentId: to.id, index: at++ }));
  ops.push({ op: "remove", nodeId: cells[i].id });
  ops.push(styleOp(cols, "base", { widths: reduceWidths(shownWidths(cols, "base").filter((_, j) => j !== i)) }));
  for (const screen of ["tablet", "mobile"] as const) {
    const own = ((cols.style ?? {}) as Styles)[screen]?.widths;
    if (Array.isArray(own)) ops.push(styleOp(cols, screen, { widths: own.length === cells.length ? reduceWidths((own as number[]).filter((_, j) => j !== i)) : null }));
  }
  return ops;
}
