/**
 * Where something new goes (the Add panel, a click or a drop): inside the selection, or
 * before or after it, as draft changes.
 *
 * - The tree's own places take what they hold (columns.ts canHold), else it goes beside.
 * - The page's own level takes sections only: anything else added there comes in a new
 *   section of its own, before or after the page item around the selection.
 * - An old section or a rose scene takes objects placed freely over it ("inside": at the
 *   pointer, or its middle). A scene shown in its usual spot gets that spot as its place
 *   first, so what's added lands where it was meant to.
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { canHold, isFree, newColumns, newElement, OVER_TYPES, type NewKind } from "./columns";
import type { Extra, TreeIndex } from "./treeIndex";

export type Where = "before" | "after" | "inside";
/** A point inside a section or scene, in % of it (x from the line's start, y from its top). */
export type Spot = { x: number; y: number };
type Ids = (prefix: string) => string;

/** The scenes that can have a place of their own (the fabric study follows the first products). */
export const PLACEABLE_SCENES = ["seasons", "stories", "instagram"] as const;

export type InsertCtx = {
  index: TreeIndex;
  /** The measured parent of what isn't a tree node (fields, pieces, scenes without a place). */
  up: ReadonlyMap<string, string | null>;
  extras: ReadonlyMap<string, Extra>;
  /** Where a page item sits among the page's own items (a scene without a place: where it shows). */
  pageIndex: (id: string) => number;
  ids: Ids;
};

const parentOf = (c: InsertCtx, id: string) => (c.index.nodes.has(id) ? c.index.nodes.get(id)!.parentId : c.up.get(id) ?? null);

/** The page item around an element (itself when it's one): an old section, a scene or a section. */
export function pageItemOf(c: InsertCtx, id: string | null): string | null {
  for (let at = id, n = 0; at && n < 64; n++) {
    const p = parentOf(c, at);
    if (p === c.index.root) return at;
    at = p;
  }
  return null;
}

/** A rose scene's name, placed or not. */
export function sceneOf(c: InsertCtx, id: string): string | null {
  const x = c.extras.get(id);
  if (x?.kind === "block") return x.block;
  const n = c.index.nodes.get(id)?.node;
  return n?.type === "roseBlock" ? String(n.props.block) : null;
}

/** What's added at the page's own level comes in a section of its own (a section goes as it is). */
export const forPage = (node: PageTreeNode, ids: Ids): PageTreeNode => (node.type === "section" ? node : { id: ids("sec"), type: "section", props: { contained: true }, children: [node] });

const round = (v: number) => Math.round(Math.max(0, Math.min(100, v)));
/** The node placed freely at a spot of what holds it. */
const placedAt = (node: PageTreeNode, spot: Spot): PageTreeNode => {
  const style = (node.style ?? {}) as Record<string, Record<string, unknown> | undefined>;
  return { ...node, style: { ...style, base: { ...(style.base ?? {}), layer: { x: round(spot.x), y: round(spot.y), anchor: "center" } } } };
};
const layerOf = (n: PageTreeNode | undefined): Spot | null => {
  const l = ((n?.style ?? {}) as Record<string, Record<string, unknown> | undefined>).base?.layer as Spot | undefined;
  return l && typeof l.x === "number" && typeof l.y === "number" ? l : null;
};

export type Insert = { ops: PageDraftOp[]; select: string };

/** The changes that add `node` before, after or inside the selection; null where it can't go. */
export function insertOps(c: InsertCtx, selected: string | null, node: PageTreeNode, where: Where, spot?: Spot): Insert | null {
  const { index } = c;
  const root = index.root;
  const pageKids = index.nodes.get(root)?.children ?? [];
  const done = (ops: PageDraftOp[]): Insert => ({ ops, select: node.id });
  if (!selected || selected === root) return where === "inside" || where === "after" ? done([{ op: "insert", parentId: root, index: pageKids.length, node: forPage(node, c.ids) }]) : null;

  const at = index.nodes.get(selected);
  if (at && isFree(at.node.type)) {
    if (where === "inside") return canHold(index, selected, node) ? done([{ op: "insert", parentId: selected, index: at.children.length, node }]) : null;
    // Beside it, or beside the nearest place around it that takes it (below the page's own level).
    for (let el: string | null = selected; el && el !== root; el = index.nodes.get(el)?.parentId ?? null) {
      const p = index.nodes.get(el)!.parentId;
      if (!p || p === root) break;
      const holder = index.nodes.get(p)!;
      if (!canHold(index, p, node)) continue;
      const i = holder.children.indexOf(el) + (where === "after" ? 1 : 0);
      // Over an old section or a scene: near the one it's added beside.
      const near = OVER_TYPES.has(node.type) && (holder.node.type === "legacy" || holder.node.type === "roseBlock") ? layerOf(index.nodes.get(el)?.node) : null;
      return done([{ op: "insert", parentId: p, index: i, node: near ? placedAt(node, { x: near.x, y: near.y + (where === "after" ? 10 : -10) }) : node }]);
    }
  }

  // The page's own level: the page item around the selection.
  const item = pageItemOf(c, selected);
  if (!item) return null;
  const scene = sceneOf(c, item);
  const placeable = scene !== null && (PLACEABLE_SCENES as readonly string[]).includes(scene);
  if (scene !== null && !placeable) {
    // The fabric study keeps its spot right after the first products: what's added goes after it.
    if (where !== "after") return null;
    return done([{ op: "insert", parentId: root, index: c.pageIndex(item), node: forPage(node, c.ids) }]);
  }
  const ops: PageDraftOp[] = [];
  let host = item;
  let i = pageKids.indexOf(item);
  if (scene && !index.nodes.has(`rb-${scene}`)) {
    i = c.pageIndex(item);
    ops.push({ op: "placeBlock", block: scene as (typeof PLACEABLE_SCENES)[number], index: i });
    host = `rb-${scene}`;
  }
  if (where === "inside") {
    const type = index.nodes.get(host)?.node.type ?? (scene ? "roseBlock" : "");
    if (!OVER_TYPES.has(node.type) || (type !== "legacy" && type !== "roseBlock")) return null;
    ops.push({ op: "insert", parentId: host, index: index.nodes.get(host)?.children.length ?? 0, node: placedAt(node, spot ?? { x: 50, y: 50 }) });
    return done(ops);
  }
  if (i < 0) return null;
  ops.push({ op: "insert", parentId: root, index: where === "before" ? i : i + 1, node: forPage(node, c.ids) });
  return done(ops);
}

/* ------------------------------------------------------------- ready blocks */

/** Ready-made blocks: a few elements already put together. */
export const READY = ["ready-intro", "ready-split", "ready-video", "ready-gallery"] as const;
export type ReadyKind = (typeof READY)[number];
export type AddKind = NewKind | ReadyKind | "section";
/** What needs a picture or a clip chosen before it's added. */
export const NEEDS: Partial<Record<AddKind, "image" | "video">> = { image: "image", slider: "image", "ready-split": "image", "ready-gallery": "image", video: "video", "ready-video": "video" };

/** A new element, ready block or empty section, in the language being edited. */
export function makeNode(kind: AddKind, lang: Lang, ids: Ids, src?: string): PageTreeNode {
  const el = (k: NewKind, s?: string) => newElement(k, lang, ids, s);
  const centred = { base: { textAlign: "center", align: "center" } };
  switch (kind) {
    case "section":
      return { id: ids("sec"), type: "section", props: { contained: true }, children: [] };
    case "ready-intro":
      return { id: ids("sec"), type: "section", props: { contained: true }, style: centred, children: [{ ...el("heading"), props: { ...el("heading").props, level: 2 } }, el("text"), el("button")] };
    case "ready-split": {
      const cols = newColumns([1, 1], ids);
      cols.children![0].children = [el("image", src)];
      cols.children![1].children = [{ ...el("heading"), props: { ...el("heading").props, level: 2 } }, el("text"), el("button")];
      cols.children![1].style = { base: { justify: "center" } };
      return { id: ids("sec"), type: "section", props: { contained: true }, children: [cols] };
    }
    case "ready-video": {
      // A clip across the section with words and a button over it.
      const video = { ...el("video", src), props: { src, autoplay: true, loop: true, controls: false }, style: { base: { width: "100%", height: "70vh", fit: "cover" } } };
      const words = placedAt({ ...el("heading"), props: { ...el("heading").props, level: 2 }, style: { base: { color: "white" } } }, { x: 50, y: 42 });
      const go = placedAt(el("button"), { x: 50, y: 62 });
      return { id: ids("sec"), type: "section", props: {}, style: { base: { pad: [0, 0, 0, 0] } }, children: [video, words, go] };
    }
    case "ready-gallery":
      return { id: ids("sec"), type: "section", props: { contained: true }, children: [el("slider", src)] };
    default:
      return el(kind, src);
  }
}
