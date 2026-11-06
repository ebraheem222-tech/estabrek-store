import type { Box } from "./geometry";
import type { Guide } from "./handles";

export type SnapTarget = { id: string; box: Box };
export type SnapIdentity = { targetId: string; targetAnchor: number; sourceAnchor: number };
export type SnapMemory = { x?: SnapIdentity; y?: SnapIdentity };

type Candidate = SnapIdentity & { shift: number; at: number };
const anchors = (b: Box, axis: "x" | "y") => axis === "x" ? [b.x, b.x + b.w / 2, b.x + b.w] : [b.y, b.y + b.h / 2, b.y + b.h];

/**
 * Screen-pixel edge/middle snaps owned by one gesture. Acquire within 6 px and
 * retain the same source/target anchors until they separate by more than 10 px.
 * Target ids, rather than array positions, keep identity when measurements reorder.
 */
export function stableSnapBox(box: Box, targets: SnapTarget[], memory: SnapMemory, opts: { bypass?: boolean } = {}): { box: Box; guides: Guide[] } {
  if (opts.bypass) {
    delete memory.x;
    delete memory.y;
    return { box, guides: [] };
  }
  const along = (axis: "x" | "y"): Candidate | null => {
    const source = anchors(box, axis);
    const old = memory[axis];
    if (old) {
      const target = targets.find((t) => t.id === old.targetId);
      if (target) {
        const at = anchors(target.box, axis)[old.targetAnchor];
        const shift = at - source[old.sourceAnchor];
        if (Math.abs(shift) <= 10) return { ...old, shift, at };
      }
      delete memory[axis];
    }
    const candidates: Candidate[] = [];
    for (const target of targets) anchors(target.box, axis).forEach((at, targetAnchor) => source.forEach((value, sourceAnchor) => {
      const shift = at - value;
      if (Math.abs(shift) <= 6) candidates.push({ targetId: target.id, targetAnchor, sourceAnchor, shift, at });
    }));
    candidates.sort((a, b) => Math.abs(a.shift) - Math.abs(b.shift) || a.targetId.localeCompare(b.targetId) || a.targetAnchor - b.targetAnchor || a.sourceAnchor - b.sourceAnchor);
    const best = candidates[0];
    if (!best) return null;
    memory[axis] = { targetId: best.targetId, targetAnchor: best.targetAnchor, sourceAnchor: best.sourceAnchor };
    return best;
  };
  const x = along("x");
  const y = along("y");
  const out = { ...box, x: box.x + (x?.shift ?? 0), y: box.y + (y?.shift ?? 0) };
  const all = [out, ...targets.map((target) => target.box)];
  const guides: Guide[] = [];
  if (x) guides.push({ x1: x.at, y1: Math.min(...all.map((b) => b.y)), x2: x.at, y2: Math.max(...all.map((b) => b.y + b.h)) });
  if (y) guides.push({ x1: Math.min(...all.map((b) => b.x)), y1: y.at, x2: Math.max(...all.map((b) => b.x + b.w)), y2: y.at });
  return { box: out, guides };
}
