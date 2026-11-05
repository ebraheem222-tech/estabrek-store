import { withMotionProfile, type MotionProfile } from "../../../shared/motionProfiles";
import type { LookEntry, PageDraftOp, PageTreeNode } from "../api/pages.api";

export type { MotionEngine, MotionPreset, MotionProfile } from "../../../shared/motionProfiles";

/** The same optional query parameters are used by the live preview and import. */
export function motionProfileQuery(options?: MotionProfile): string {
  const params = new URLSearchParams();
  if (options?.engine) params.set("motionEngine", options.engine);
  if (options?.preset) params.set("motionPreset", options.preset);
  return params.toString();
}

/** Only motion differences become ordinary draft changes, so one undo restores the page. */
export function pageMotionOps(root: PageTreeNode, options: MotionProfile): PageDraftOp[] {
  const changed = withMotionProfile([root], options)[0];
  const ops: PageDraftOp[] = [];
  const walk = (before: PageTreeNode, after: PageTreeNode) => {
    if (JSON.stringify(before.motion) !== JSON.stringify(after.motion)) {
      ops.push({ op: "setMotion", nodeId: before.id, motion: after.motion ?? null });
    }
    before.children?.forEach((child, i) => walk(child, after.children![i]));
  };
  walk(root, changed);
  const beforeLooks = (root.props.looks ?? {}) as Record<string, LookEntry>;
  const afterLooks = (changed.props.looks ?? {}) as Record<string, LookEntry>;
  for (const target of new Set([...Object.keys(beforeLooks), ...Object.keys(afterLooks)])) {
    const before = beforeLooks[target];
    const after = afterLooks[target];
    if (JSON.stringify(before?.motion) !== JSON.stringify(after?.motion)) {
      ops.push({ op: "setLookMotion", target, kind: (after ?? before).kind, motion: after?.motion ?? null });
    }
  }
  return ops;
}
