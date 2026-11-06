import type { PageTreeNode } from "../api/pages.api";
import { canHold } from "./columns";
import { pickAt, shapeContains, type Pt, type Shape } from "./geometry";
import type { TreeIndex } from "./treeIndex";

const CONTAINERS = new Set(["section", "cell", "stack", "grid", "popup", "legacy"]);
const MAX_TREE_DEPTH = 12;
const subtreeDepth = (node: PageTreeNode): number => Math.max(0, ...(node.children ?? []).map((child) => 1 + subtreeDepth(child)));

/**
 * The eligible measured container under the pointer, ignoring the moving subtree
 * and inherited locks. The current parent stops a reparent search while the
 * pointer is inside it, so ordinary free movement stays in its existing holder.
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
  const seen = new Set<string>();
  for (let at: string | null = hit?.inside ? hit.id : null; at && at !== index.root && !seen.has(at); at = parentOf(at)) {
    seen.add(at);
    const own = index.nodes.get(at);
    const shape = measured.get(at);
    if (!own || !shape || !shapeContains(shape, point)) continue;
    if (at === fromParent) return null;
    if (CONTAINERS.has(own.node.type) && own.depth + 1 + deepest <= MAX_TREE_DEPTH && nodes.every((node) => canHold(index, at!, node))) return at;
  }
  return null;
}
