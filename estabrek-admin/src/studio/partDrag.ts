import { inverse3, project3, type Plane, type Point } from "../../../shared/geometry/plane";
/** CSS translation belongs to the parent basis, including nested rotation/scale. */
export function partDragOffset(parent: Plane, from: Point, to: Point, start: Point): Point | null {
  const inverse = inverse3(parent.matrix);
  const a = inverse && project3(inverse, from), b = inverse && project3(inverse, to);
  if (!a || !b) return null;
  const bound = (v: number) => Math.round(Math.max(-1000, Math.min(1000, v)) * 100) / 100;
  return { x: bound(start.x + b.x - a.x), y: bound(start.y + b.y - a.y) };
}
