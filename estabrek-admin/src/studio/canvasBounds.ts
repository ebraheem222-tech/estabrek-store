/**
 * The boundaries of the page's parts, drawn over the canvas: every container (a section, a stack, a grid, columns
 * and their cells, a popup, a presentation, a scroll scene) as a thin dashed box with its name, so it is clear
 * where each part begins and ends and what an element can be dragged into. Shown when asked (the Dragging menu),
 * and by itself while something is being dragged.
 */
import { visiblePart, type Box, type Shape } from "./geometry";
import type { TreeIndex } from "./treeIndex";

/** The kinds that hold other elements. */
export const BOUND_KINDS: ReadonlySet<string> = new Set(["section", "stack", "grid", "columns", "cell", "popup", "deck", "scrollScene"]);
export type Bound = {
  id: string;
  /** What shows of it inside the frame (screen pixels, like the shapes). */
  box: Box;
  /** How deep it sits in the page (a section is 1). */
  depth: number;
  section: boolean;
  /** Big enough on screen to carry its name. */
  named: boolean;
  /** Rows its name sits below its corner: parts that begin at the same corner don't cover each other's names. */
  row: number;
};
/** A name's height on screen. */
export const BOUND_TAG = 16;

/**
 * The parts to outline: containers that show in the frame, the outer ones first (so the inner ones are drawn over
 * them), at most `limit` of them. The page itself is not one.
 */
export function partBounds(index: TreeIndex, shapes: Shape[], frameBox: Box, limit = 160): Bound[] {
  const out: Bound[] = [];
  for (const s of shapes) {
    if (s.id === index.root) continue;
    const own = index.nodes.get(s.id);
    if (!own || !BOUND_KINDS.has(own.node.type)) continue;
    const seen = visiblePart(s.box, frameBox);
    if (!seen || seen.box.w < 2 || seen.box.h < 2) continue;
    out.push({ id: s.id, box: seen.box, depth: own.depth, section: own.node.type === "section", named: seen.box.w >= 90 && seen.box.h >= 28, row: 0 });
  }
  const kept = out.sort((a, b) => a.depth - b.depth).slice(0, limit);
  // Names at the same corner go one under the other, the outer part's first; one with no room left goes without.
  const corners = new Map<string, number>();
  for (const b of kept) {
    if (!b.named) continue;
    const corner = `${Math.round(b.box.x / 8)}:${Math.round(b.box.y / 8)}`;
    const row = corners.get(corner) ?? 0;
    if ((row + 1) * BOUND_TAG > b.box.h) { b.named = false; continue; }
    b.row = row;
    corners.set(corner, row + 1);
  }
  return kept;
}
