import type { PageTreeNode } from "../api/pages.api";
import { canHold } from "./columns";
import { pickAt, shapeContains, type Pt, type Shape } from "./geometry";
import type { TreeIndex } from "./treeIndex";

const CONTAINERS = new Set(["section", "cell", "stack", "grid", "popup", "legacy"]);
const MAX_TREE_DEPTH = 12;
/**
 * How far (screen px) the pointer has to be outside the holder an element is in before it goes out into what holds
 * that holder. Closer than this it is still the holder's: the gap between a row's cells, a header's thin padding.
 */
export const OUT_MARGIN = 24;
const subtreeDepth = (node: PageTreeNode): number => Math.max(0, ...(node.children ?? []).map((child) => 1 + subtreeDepth(child)));

/**
 * The eligible measured container under the pointer, ignoring the moving subtree
 * and inherited locks. The current parent stops a reparent search while the
 * pointer is inside it, so ordinary free movement stays in its existing holder.
 * Going out into what holds the current parent needs a clear move out: the pointer
 * in the gap between a row's cells (inside the columns that hold its cell) or within
 * OUT_MARGIN of its holder still means its holder (a header's search dragged a little
 * fell out of its cell into the header, away from its place).
 * `candidates` may be the spatial grid's nearby shapes; all boxes are screen pixels.
 */
export function pickCanvasContainer(
  index: TreeIndex,
  candidates: Shape[],
  point: Pt,
  draggedIds: string[],
  fromParent: string | null,
  locked?: ReadonlySet<string>,
): string | null {
  const dragged = draggedIds.map((id) => index.nodes.get(id)?.node);
  if (!dragged.length || dragged.some((node) => !node)) return null;
  const nodes = dragged as PageTreeNode[];
  const moving = new Set(draggedIds);
  const deepest = Math.max(...nodes.map(subtreeDepth));
  const measured = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const parentOf = (id: string) => index.nodes.has(id) ? index.nodes.get(id)!.parentId : measured.get(id)?.parentId ?? null;
  const blocked = (id: string) => {
    const seen = new Set<string>();
    for (let at: string | null = id; at && !seen.has(at); at = parentOf(at)) {
      if (moving.has(at) || locked?.has(at)) return true;
      seen.add(at);
    }
    return false;
  };
  const hit = pickAt(candidates.filter((candidate) => !blocked(candidate.id)), point, { threshold: 0 });
  // What holds the current holder, up to the page (going out there is going out of the holder).
  const around = new Set<string>();
  for (let at = fromParent ? parentOf(fromParent) : null; at && !around.has(at); at = parentOf(at)) around.add(at);
  const holder = fromParent ? measured.get(fromParent)?.box : undefined;
  const outBy = holder ? Math.max(holder.x - point.x, point.x - holder.x - holder.w, holder.y - point.y, point.y - holder.y - holder.h, 0) : Infinity;
  const seen = new Set<string>();
  for (let at: string | null = hit?.inside ? hit.id : null; at && at !== index.root && !seen.has(at); at = parentOf(at)) {
    seen.add(at);
    const own = index.nodes.get(at);
    const shape = measured.get(at);
    if (!own || !shape || !shapeContains(shape, point)) continue;
    if (at === fromParent) return null;
    if (around.has(at) && (!CONTAINERS.has(own.node.type) || outBy < OUT_MARGIN)) return null;
    if (CONTAINERS.has(own.node.type) && own.depth + 1 + deepest <= MAX_TREE_DEPTH && nodes.every((node) => canHold(index, at!, node))) return at;
  }
  return null;
}
