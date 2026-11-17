/**
 * The relations diagram (./RelationsDiagramPage.tsx), the pure parts (tested): the tables as
 * cards and the relations as lines between them, where each card stands to begin with, and the
 * line a relation draws.
 *
 * A card is one of the owner's tables (its fields, a relation among them marked) or one of the
 * store's (products, orders…: its name only; it holds no relation of its own). A line goes from
 * the relation's own row in its table to the table it links, with how many rows stand on each
 * side (∞ / 1). Everything is worked out from the tables' fields: nothing is measured on screen.
 */
import type { Collection, CollectionField, Local, OnDelete } from "../../api/collections.api";
import { linkKind, type LinkKind } from "../collections/fieldRules";
import { KIND_NAME, type Lang } from "./kinds";
import { LINK_MARKS } from "./relationField";
import { STORE, STORE_LINKS, STORE_LINK_NAME, storeTarget } from "./storeLinks";

/** A card's measures, in the canvas's own units (pixels at 100%). */
export const CARD = { width: 250, head: 46, row: 26, foot: 10, shown: 12, gapX: 110, gapY: 30, margin: 40 } as const;

const AT: Record<Lang, number> = { ar: 0, en: 1, he: 2 };
const pick = (words: string, lang: Lang) => words.split("|")[AT[lang]] ?? words;
const local = (v: Local | undefined | null, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";

export type DiagramRow = {
  id: string;
  name: string;
  /** What kind of field it is, in words. */
  kind: string;
  /** A relation: the card it links (null: a table that isn't there any more) and the marks on its two sides. */
  to?: string | null;
  marks?: [string, string];
};
export type DiagramNode = {
  /** One of the owner's tables by its id, one of the store's as "store:products". */
  id: string;
  store: boolean;
  /** Its address (the store's: its short name), for links and test ids. */
  slug: string;
  name: string;
  /** How many rows it holds, where that is known. */
  items?: number;
  /** The fields shown (the first few), and how many more there are. */
  rows: DiagramRow[];
  more: number;
  w: number;
  h: number;
};
export type DiagramEdge = {
  /** "<table id>.<field id>". */
  id: string;
  from: string;
  field: string;
  fieldName: string;
  to: string;
  kind: LinkKind;
  onDelete: OnDelete;
  /** The relation's row in its card (−1: it is among the ones not shown). */
  row: number;
};
export type Diagram = { nodes: DiagramNode[]; edges: DiagramEdge[] };

const height = (rows: number, more: number) => CARD.head + rows * CARD.row + (more ? CARD.row : 0) + (rows || more ? CARD.foot : 0);

/**
 * The tables and their relations as cards and lines. The store's tables that some relation links
 * are shown (all of them with `allStore`), after the owner's, in the grid's own order.
 * `counts`: how many rows a store table holds, by its short name, where the member may see it.
 */
export function diagramOf(tables: Collection[], lang: Lang, opts: { allStore?: boolean; counts?: Record<string, number> } = {}): Diagram {
  const ids = new Set(tables.map((c) => c.id));
  const linkable = (to: string | undefined) => (to !== undefined && (ids.has(to) || storeTarget(to) !== null) ? to : null);
  const nodes: DiagramNode[] = tables.map((c) => {
    const rows = c.fields.slice(0, CARD.shown).map((f): DiagramRow => ({ id: f.id, name: local(f.name, lang) || f.id, kind: pick(KIND_NAME[f.type] ?? f.type, lang), ...(f.type === "relation" ? { to: linkable(f.to), marks: LINK_MARKS[linkKind(f)] } : {}) }));
    const more = Math.max(0, c.fields.length - CARD.shown);
    return { id: c.id, store: false, slug: c.slug, name: local(c.name, lang) || c.slug, items: c.items, rows, more, w: CARD.width, h: height(rows.length, more) };
  });
  const edges: DiagramEdge[] = tables.flatMap((c) =>
    c.fields.flatMap((f: CollectionField, i) => {
      const to = f.type === "relation" ? linkable(f.to) : null;
      return to ? [{ id: `${c.id}.${f.id}`, from: c.id, field: f.id, fieldName: local(f.name, lang) || f.id, to, kind: linkKind(f), onDelete: f.onDelete ?? "unlink", row: i < CARD.shown ? i : -1 }] : [];
    }),
  );
  const linked = new Set(edges.map((e) => e.to));
  for (const s of STORE_LINKS) {
    const id = `${STORE}${s}`;
    if (!opts.allStore && !linked.has(id)) continue;
    nodes.push({ id, store: true, slug: s, name: pick(STORE_LINK_NAME[s], lang), ...(opts.counts?.[s] !== undefined ? { items: opts.counts[s] } : {}), rows: [], more: 0, w: CARD.width, h: height(0, 0) });
  }
  return { nodes, edges };
}

export type Pos = { x: number; y: number };

/**
 * Where each card stands to begin with: the tables that link others stand before the ones they
 * link (a line then runs forward, column to column), the store's tables in the last columns.
 * In a right-to-left page the first column is on the right, so a line reads the way the page does.
 */
export function autoLayout(d: Diagram, opts: { rtl?: boolean } = {}): Record<string, Pos> {
  const own = d.nodes.filter((n) => !n.store);
  const theirs = d.nodes.filter((n) => n.store);
  const ownIds = new Set(own.map((n) => n.id));
  // How far along a table stands: one step past the furthest table that links it. Tables that link each other in a
  // ring have no first: the line that closes the ring is left out of the count (it then runs backward).
  const depth = new Map<string, number>();
  const walk = (id: string, open: Set<string>): number | null => {
    if (depth.has(id)) return depth.get(id)!;
    if (open.has(id)) return null;
    open.add(id);
    const from = d.edges.filter((e) => e.to === id && e.from !== id && ownIds.has(e.from)).flatMap((e) => walk(e.from, open) ?? []);
    open.delete(id);
    const at = Math.min(3, from.length ? Math.max(...from) + 1 : 0);
    depth.set(id, at);
    return at;
  };
  for (const n of own) walk(n.id, new Set());
  const columns: DiagramNode[][] = [];
  for (const n of own) (columns[depth.get(n.id) ?? 0] ??= []).push(n);
  const filled = columns.filter((c) => c?.length);
  // The store's: a column of at most eight cards (they are short), then another.
  for (let i = 0; i < theirs.length; i += 8) filled.push(theirs.slice(i, i + 8));
  const out: Record<string, Pos> = {};
  filled.forEach((column, k) => {
    let y: number = CARD.margin;
    for (const n of column) {
      out[n.id] = { x: CARD.margin + k * (CARD.width + CARD.gapX), y };
      y += n.h + CARD.gapY;
    }
  });
  if (opts.rtl) {
    const right = CARD.margin + filled.length * (CARD.width + CARD.gapX) - CARD.gapX;
    for (const id of Object.keys(out)) out[id] = { x: right - out[id].x - CARD.width + CARD.margin, y: out[id].y };
  }
  return out;
}

/** How large the canvas is: past the furthest card, with room to drag one further. */
export function extent(nodes: DiagramNode[], pos: Record<string, Pos>): { w: number; h: number } {
  let w = 0;
  let h = 0;
  for (const n of nodes) {
    const p = pos[n.id];
    if (!p) continue;
    w = Math.max(w, p.x + n.w);
    h = Math.max(h, p.y + n.h);
  }
  return { w: w + CARD.margin + 160, h: h + CARD.margin + 160 };
}

export type EdgeLine = { d: string; start: Pos; end: Pos; /** Where each side's mark (∞ / 1) is written. */ markA: Pos; markB: Pos; /** The middle of the line, for its name. */ mid: Pos };

/**
 * The line of one relation: from its row's edge in its own card (the card's head when the row isn't
 * shown) to the head of the card it links, leaving each card on the side that faces the other.
 * `nth` of `of`: which of the lines that end at the same card this one is (they are spread a little).
 * A relation to its own table loops out of the card's side and back to its head.
 */
export function edgeLine(e: Pick<DiagramEdge, "row" | "from" | "to">, a: DiagramNode, pa: Pos, b: DiagramNode, pb: Pos, nth = 0, of = 1): EdgeLine {
  const ay = pa.y + (e.row >= 0 ? CARD.head + e.row * CARD.row + CARD.row / 2 : a.rows.length ? CARD.head + a.rows.length * CARD.row + CARD.row / 2 : CARD.head / 2);
  const spread = Math.max(-(CARD.head / 2 - 8), Math.min(CARD.head / 2 - 8, (nth - (of - 1) / 2) * 9));
  const by = pb.y + CARD.head / 2 + spread;
  const r = (v: number) => Math.round(v * 10) / 10;
  if (e.from === e.to) {
    const x = pa.x + a.w;
    const out = x + 54;
    return { d: `M ${r(x)} ${r(ay)} C ${r(out)} ${r(ay)}, ${r(out)} ${r(by)}, ${r(x)} ${r(by)}`, start: { x, y: ay }, end: { x, y: by }, markA: { x: x + 10, y: ay - 6 }, markB: { x: x + 10, y: by - 6 }, mid: { x: out - 10, y: (ay + by) / 2 } };
  }
  const forward = pb.x + b.w / 2 >= pa.x + a.w / 2;
  // Cards one above the other (their sides overlap): the line leaves and arrives on the same side.
  const stacked = pa.x < pb.x + b.w && pb.x < pa.x + a.w;
  const sx = forward || stacked ? pa.x + a.w : pa.x;
  const ex = stacked ? pb.x + b.w : forward ? pb.x : pb.x + b.w;
  const sd = forward || stacked ? 1 : -1;
  const ed = stacked ? 1 : forward ? -1 : 1;
  const reach = stacked ? 70 : Math.max(46, Math.abs(ex - sx) / 2);
  const c1 = sx + sd * reach;
  const c2 = ex + ed * reach;
  // A cubic's middle: an eighth of each end and three eighths of each handle.
  const mid = { x: (sx + 3 * c1 + 3 * c2 + ex) / 8, y: (ay + by) / 2 };
  return { d: `M ${r(sx)} ${r(ay)} C ${r(c1)} ${r(ay)}, ${r(c2)} ${r(by)}, ${r(ex)} ${r(by)}`, start: { x: sx, y: ay }, end: { x: ex, y: by }, markA: { x: sx + sd * 12, y: ay - 6 }, markB: { x: ex + ed * 12, y: by - 6 }, mid };
}

/** The cards' places as they were left (a stored text), read back: only places of real numbers are kept. */
export function readPlaces(text: string | null): { pos: Record<string, Pos>; allStore: boolean } {
  try {
    const v = JSON.parse(text ?? "") as { pos?: unknown; allStore?: unknown };
    const pos: Record<string, Pos> = {};
    if (v.pos && typeof v.pos === "object") for (const [id, p] of Object.entries(v.pos as Record<string, { x?: unknown; y?: unknown }>)) if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) pos[id] = { x: Math.max(0, Number(p.x)), y: Math.max(0, Number(p.y)) };
    return { pos, allStore: v.allStore === true };
  } catch {
    return { pos: {}, allStore: false };
  }
}
