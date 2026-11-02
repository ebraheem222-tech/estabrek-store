/**
 * Working with several elements at once in the page editor: picking the ones inside a
 * dragged box, grouping and ungrouping, lining freely placed ones up and spacing them
 * evenly, and the clipboard (elements and looks, kept in this browser so they paste on
 * another page too). Pure functions; the editor turns their results into draft changes.
 */
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import type { Box, Shape } from "./geometry";
import { canHold, copyOf, isFree, styleOp, type Ids } from "./columns";
import { placeFor, placedOn } from "./look";
import { forPage } from "./insert";
import type { TreeIndex } from "./treeIndex";

/** The elements a box dragged on the page holds whole: the outermost ones (a holder rather than what's in it). */
export function inBox(rect: Box, shapes: Shape[], index: TreeIndex, skip: (id: string) => boolean = () => false): string[] {
  const inside = (b: Box) => b.w > 0 && b.h > 0 && b.x >= rect.x && b.y >= rect.y && b.x + b.w <= rect.x + rect.w && b.y + b.h <= rect.y + rect.h;
  const hit = new Set(shapes.filter((s) => s.id !== index.root && index.nodes.has(s.id) && isFree(index.nodes.get(s.id)!.node.type) && !skip(s.id) && inside(s.box)).map((s) => s.id));
  const covered = (id: string) => {
    for (let at = index.nodes.get(id)?.parentId ?? null; at; at = index.nodes.get(at)?.parentId ?? null) if (hit.has(at)) return true;
    return false;
  };
  return shapes.filter((s) => hit.has(s.id) && !covered(s.id)).map((s) => s.id);
}

/** A box around a dragged rectangle (any corner first). */
export const boxOf = (a: { x: number; y: number }, b: { x: number; y: number }): Box => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

/** Ids in the page's order (the order they're met going down the tree). */
export function inTreeOrder(index: TreeIndex, ids: string[]): string[] {
  const want = new Set(ids);
  const out: string[] = [];
  const walk = (id: string) => {
    if (want.has(id)) out.push(id);
    index.nodes.get(id)?.children.forEach(walk);
  };
  walk(index.root);
  return out;
}

/** The shared parent of the elements, when they all have the same one. */
export function sameParent(index: TreeIndex, ids: string[]): string | null {
  const parents = new Set(ids.map((id) => index.nodes.get(id)?.parentId ?? null));
  return parents.size === 1 ? [...parents][0] : null;
}

/** Wraps elements of one parent in a new stack where the first of them was (null when they can't be). */
export function groupOps(index: TreeIndex, ids: string[], id: Ids): { ops: PageDraftOp[]; group: string } | null {
  const parent = sameParent(index, ids);
  if (!parent || ids.length < 2) return null;
  const order = index.nodes.get(parent)!.children;
  const mine = order.filter((c) => ids.includes(c));
  if (mine.some((c) => !isFree(index.nodes.get(c)!.node.type) || ["section", "cell"].includes(index.nodes.get(c)!.node.type))) return null;
  const stack: PageTreeNode = { id: id("stk"), type: "stack", props: {}, children: [] };
  if (!canHold(index, parent, stack)) return null;
  const at = order.indexOf(mine[0]);
  return { group: stack.id, ops: [{ op: "insert", parentId: parent, index: at, node: stack }, ...mine.map((c, i): PageDraftOp => ({ op: "move", nodeId: c, parentId: stack.id, index: i }))] };
}

/** Puts what a stack or grid holds back in its place, then removes it. */
export function ungroupOps(index: TreeIndex, groupId: string): PageDraftOp[] | null {
  const at = index.nodes.get(groupId);
  if (!at?.parentId || !["stack", "grid"].includes(at.node.type)) return null;
  const parent = index.nodes.get(at.parentId)!;
  const place = parent.children.indexOf(groupId);
  if (at.children.some((c) => !canHold(index, at.parentId!, index.nodes.get(c)!.node))) return null;
  return [...at.children.map((c, i): PageDraftOp => ({ op: "move", nodeId: c, parentId: at.parentId!, index: place + 1 + i })), { op: "remove", nodeId: groupId }];
}

export type AlignHow = "start" | "center" | "end" | "top" | "middle" | "bottom";

/**
 * Lines freely placed elements up with each other on the page (their boxes as drawn), as
 * each one's new place over its own container. `rtl`: start is the right edge.
 */
export function alignOps(items: Array<{ node: PageTreeNode; box: Box; holder: Box }>, how: AlignHow, screen: TreeScreen, rtl: boolean): PageDraftOp[] {
  if (items.length < 2) return [];
  const left = Math.min(...items.map((i) => i.box.x));
  const right = Math.max(...items.map((i) => i.box.x + i.box.w));
  const top = Math.min(...items.map((i) => i.box.y));
  const bottom = Math.max(...items.map((i) => i.box.y + i.box.h));
  const startEdge = rtl ? "end" : "start";
  return items.flatMap(({ node, box, holder }) => {
    const place = placedOn(node, screen);
    if (!place) return [];
    const b = { ...box };
    if (how === "center") b.x = (left + right) / 2 - box.w / 2;
    else if (how === "start" || how === "end") b.x = how === startEdge ? left : right - box.w;
    else if (how === "middle") b.y = (top + bottom) / 2 - box.h / 2;
    else if (how === "top") b.y = top;
    else b.y = bottom - box.h;
    const at = placeFor(b, holder, place.anchor ?? "center", rtl);
    return at.x === place.x && at.y === place.y ? [] : [styleOp(node, screen, { layer: { ...place, ...at } })];
  });
}

/** Spaces three or more freely placed elements evenly, across or down (the first and last stay). */
export function distributeOps(items: Array<{ node: PageTreeNode; box: Box; holder: Box }>, across: boolean, screen: TreeScreen, rtl: boolean): PageDraftOp[] {
  if (items.length < 3) return [];
  const pos = (b: Box) => (across ? b.x : b.y);
  const size = (b: Box) => (across ? b.w : b.h);
  const sorted = [...items].sort((a, b) => pos(a.box) - pos(b.box));
  const first = sorted[0].box;
  const last = sorted[sorted.length - 1].box;
  const free = pos(last) + size(last) - pos(first) - sorted.reduce((s, i) => s + size(i.box), 0);
  const gap = free / (sorted.length - 1);
  let at = pos(first) + size(first) + gap;
  return sorted.slice(1, -1).flatMap(({ node, box, holder }) => {
    const place = placedOn(node, screen);
    const b = across ? { ...box, x: at } : { ...box, y: at };
    at += size(box) + gap;
    if (!place) return [];
    const p = placeFor(b, holder, place.anchor ?? "center", rtl);
    return [styleOp(node, screen, { layer: { ...place, ...p } })];
  });
}

/* -------------------------------------------------------------- clipboard */

const CLIP = "studio.clipboard";
const STYLE_CLIP = "studio.styleClipboard";
type Clip = { v: 1; nodes: PageTreeNode[] };
type StyleClip = { v: 1; style?: PageTreeNode["style"]; motion?: PageTreeNode["motion"]; type: string };

const read = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};

/** Copies elements (with everything inside them) for pasting here or on another page. */
export const copyNodes = (nodes: PageTreeNode[]) => write(CLIP, { v: 1, nodes: structuredClone(nodes) } satisfies Clip);
export const clipboardNodes = (): PageTreeNode[] => {
  const c = read<Clip>(CLIP);
  return c?.v === 1 && Array.isArray(c.nodes) ? c.nodes.filter((n) => n && typeof n.id === "string" && typeof n.type === "string") : [];
};
/** Copies an element's look (every screen and state) and its motion. */
export const copyLook = (node: PageTreeNode) => write(STYLE_CLIP, { v: 1, style: structuredClone(node.style ?? {}), motion: node.motion ? structuredClone(node.motion) : undefined, type: node.type } satisfies StyleClip);
export const clipboardLook = (): StyleClip | null => {
  const c = read<StyleClip>(STYLE_CLIP);
  return c?.v === 1 ? c : null;
};

/** The copied look put on an element: each screen's look replaced, and the motion too when there is one. */
export function pasteLookOps(node: PageTreeNode, look: StyleClip): PageDraftOp[] {
  const style = (look.style ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const ops: PageDraftOp[] = (["base", "tablet", "mobile"] as const).map((screen) => ({ op: "setStyle", nodeId: node.id, screen, style: style[screen] && Object.keys(style[screen]!).length ? style[screen]! : null }));
  if (look.motion) ops.push({ op: "setMotion", nodeId: node.id, motion: look.motion as Record<string, unknown> });
  return ops;
}

/**
 * Copies of the clipboard's elements (new ids) placed after `anchor` in its parent, or
 * inside it when it holds things; null when none of them can go there.
 */
export function pasteOps(index: TreeIndex, anchor: string | null, nodes: PageTreeNode[], id: Ids): { ops: PageDraftOp[]; first: string } | null {
  if (!nodes.length) return null;
  const copies = nodes.map((n) => copyOf(n, id));
  const place = (parentId: string, at: number) => {
    if (!copies.every((c) => canHold(index, parentId, c))) return null;
    return { ops: copies.map((node, i): PageDraftOp => ({ op: "insert", parentId, index: at + i, node })), first: copies[0].id };
  };
  const here = anchor ? index.nodes.get(anchor) : undefined;
  if (here && copies.every((c) => canHold(index, anchor!, c))) return place(anchor!, here.children.length);
  if (here?.parentId) {
    const done = place(here.parentId, index.nodes.get(here.parentId)!.children.indexOf(anchor!) + 1);
    if (done) return done;
  }
  // Up the tree until a place takes them; sections at the end of the page.
  for (let at = here?.parentId ? index.nodes.get(here.parentId)?.parentId ?? null : null; at; at = index.nodes.get(at)?.parentId ?? null) {
    const done = place(at, index.nodes.get(at)!.children.length);
    if (done) return done;
  }
  // At the end of the page, each in a section of its own unless it is one.
  const root = index.nodes.get(index.root)!.children.length;
  const wrapped = copies.map((c) => forPage(c, id));
  return { ops: wrapped.map((node, i): PageDraftOp => ({ op: "insert", parentId: index.root, index: root + i, node })), first: wrapped[0].id };
}

/* ---------------------------------------------------------------- locking */

/** Elements locked in the layers on a page (kept in this browser): clicks on the page pass through them. */
export function lockedOf(pageId: string): Set<string> {
  const ids = read<string[]>(`studio.locked.${pageId}`);
  return new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : []);
}
export const saveLocked = (pageId: string, ids: Set<string>) => write(`studio.locked.${pageId}`, [...ids]);
/** The locked elements and everything inside them. */
export function withInside(index: TreeIndex, ids: Set<string>): Set<string> {
  const out = new Set<string>();
  const add = (id: string) => {
    if (out.has(id)) return;
    out.add(id);
    index.nodes.get(id)?.children.forEach(add);
  };
  ids.forEach((id) => index.nodes.has(id) && add(id));
  return out;
}
