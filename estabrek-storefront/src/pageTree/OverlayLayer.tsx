/**
 * Objects the editor placed freely over an old section or a rose scene (a legacy or
 * roseBlock node's children): drawn on a layer over the whole section, whose inner part
 * stays in sight while a tall scene scrolls by (sticky, one screen high at most). Each
 * object sits where its look puts it (layer x/y, pageTree/css.ts); the layer itself lets
 * clicks through to the section.
 */
import type { TreeNode } from "./tree";
import { TreeNodeView, type TreeCtx } from "./TreeNodeView";

export type SectionOverlay = { nodes: TreeNode[]; ctx: TreeCtx };

export function OverlayLayer({ over }: { over?: SectionOverlay | null }) {
  if (!over?.nodes?.length) return null;
  return (
    <div className="pt-over" data-pt-over="">
      <div className="pt-over-in">
        {over.nodes.map((n) => (
          <TreeNodeView key={n.id} node={n} ctx={over.ctx} />
        ))}
      </div>
    </div>
  );
}
