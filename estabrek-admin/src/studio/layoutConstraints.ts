import type { Box } from "./geometry";

export type SizeConstraints = { minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number; aspectRatio?: number };

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const inRange = (n: unknown, min: number, max: number): n is number => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

/**
 * The closest local CSS size, in Euclidean width/height distance. CMS sizes stay
 * within 8–9999px. All supplied bounds and the ratio are required: infeasible or
 * malformed requirements return null, without changing their priority.
 *
 * A box projects independently on each axis. With w=r*h the feasible region is
 * one closed line segment; project onto its line, then clamp its h parameter.
 * This solves this bounded 2D case exactly, without a general constraint solver.
 */
export function constrainSize(w: number, h: number, spec: SizeConstraints): { w: number; h: number } | null {
  if (!Number.isFinite(w) || !Number.isFinite(h) || !spec || typeof spec !== "object" || Array.isArray(spec)) return null;
  for (const key of ["minWidth", "maxWidth", "minHeight", "maxHeight"] as const) {
    if (spec[key] !== undefined && !inRange(spec[key], 8, 9999)) return null;
  }
  if (spec.aspectRatio !== undefined && !inRange(spec.aspectRatio, .01, 100)) return null;
  const minW = spec.minWidth ?? 8, maxW = spec.maxWidth ?? 9999;
  const minH = spec.minHeight ?? 8, maxH = spec.maxHeight ?? 9999;
  if (minW > maxW || minH > maxH) return null;
  const ratio = spec.aspectRatio;
  if (ratio === undefined) return { w: clamp(w, minW, maxW), h: clamp(h, minH, maxH) };
  const low = Math.max(minH, minW / ratio), high = Math.min(maxH, maxW / ratio);
  if (low > high) return null;
  const denominator = 1 + ratio * ratio;
  const height = clamp(w * (ratio / denominator) + h / denominator, low, high);
  return { w: ratio * height, h: height };
}

const validBox = (box: Box) => box && [box.x, box.y, box.w, box.h, box.x + box.w, box.y + box.h].every(Number.isFinite) && box.w > 0 && box.h > 0;

/**
 * Order by the selected coordinate (stable input ties), fix every gap, and keep
 * dimensions. The chain's start minimizes total squared movement, clamped to
 * the holder when supplied. Cross-axis positions stay as close as possible.
 * Results follow input order; inputs are untouched. A chain that cannot fit
 * returns null instead of overlapping boxes or reducing its gap.
 */
export function spaceBoxes(boxes: Box[], axis: "x" | "y", gap: number, holder?: Box): Box[] | null {
  if ((axis !== "x" && axis !== "y") || !Number.isFinite(gap) || gap < 0 || !boxes.every(validBox) || (holder && !validBox(holder))) return null;
  if (!boxes.length) return [];
  const cross = axis === "x" ? "y" : "x";
  const size = axis === "x" ? "w" : "h", crossSize = axis === "x" ? "h" : "w";
  const ordered = boxes.map((box, index) => ({ box, index, offset: 0 })).sort((a, b) => a.box[axis] - b.box[axis] || a.index - b.index);
  let total = 0, preferred = 0;
  for (const item of ordered) {
    item.offset = total;
    preferred += (item.box[axis] - total) / boxes.length;
    total += item.box[size] + gap;
  }
  total -= gap;
  if (!Number.isFinite(total) || !Number.isFinite(preferred)) return null;
  if (holder && (total > holder[size] || boxes.some(box => box[crossSize] > holder[crossSize]))) return null;
  const start = holder ? clamp(preferred, holder[axis], holder[axis] + holder[size] - total) : preferred;
  const result = boxes.map(box => ({ ...box }));
  for (const { box, index, offset } of ordered) {
    result[index][axis] = start + offset;
    if (holder) result[index][cross] = clamp(box[cross], holder[cross], holder[cross] + holder[crossSize] - box[crossSize]);
    if (!validBox(result[index])) return null;
  }
  return result;
}
