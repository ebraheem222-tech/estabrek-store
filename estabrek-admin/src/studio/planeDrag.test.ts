import { describe, expect, it } from "vitest";
import { cmsTransform, multiply3, planeQuad, project3, type Mat3, type Plane } from "../../../shared/geometry/plane";
import { DRAG_DEFAULTS, type DragPrefs } from "./dragPlan";
import { startPlaneDrag, stepPlaneDrag } from "./planeDrag";
import { boxBody, collide, moveBody } from "./space";

const identity: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const translation = (x: number, y: number): Mat3 => [1, 0, x, 0, 1, y, 0, 0, 1];
const rotated: Plane = { w: 300, h: 200, matrix: [0, -3, 400, 2, 0, 100, 0, 0, 1] };
const perspective: Plane = { w: 500, h: 300, matrix: [1.6, 0.2, 100, 0.1, 1.3, 50, 0.001, 0.0007, 1] };
const prefs = (over: Partial<DragPrefs> = {}): DragPrefs => ({ ...DRAG_DEFAULTS, gaps: false, ...over });
const loose = { straight: false, loose: true };
const snapping = { straight: false, loose: false };
const child = (holder: Plane, x = 50, y = 40, w = 20, h = 10, look: Record<string, unknown> = {}, rtl = false): Plane => ({
  w, h, matrix: multiply3(holder.matrix, multiply3(translation(x, y), cmsTransform(look, { w, h }, rtl)!)),
});
const point = (holder: Plane, x: number, y: number) => project3(holder.matrix, { x, y })!;
const screenMove = (holder: Plane, x: number, y: number, dx: number, dy: number) => {
  const a = point(holder, x, y), b = point(holder, x + dx, y + dy);
  return { x: b.x - a.x, y: b.y - a.y };
};
function begin(holder: Plane, frame = child(holder), look: Record<string, unknown> = {}, peers: Parameters<typeof startPlaneDrag>[5] = [], grab = point(holder, 55, 45), rtl = false) {
  const drag = startPlaneDrag(frame, holder, look, rtl, grab, peers);
  expect(drag).not.toBeNull();
  return drag!;
}

describe("dragging in a measured holder plane", () => {
  it("maps a rotated nonuniform holder's allowed axes to local CSS pixels", () => {
    const frame = child(rotated);
    const horizontal = stepPlaneDrag(begin(rotated, frame), { x: -60, y: 40 }, loose, prefs(), "horizontal");
    expect(horizontal?.delta.x).toBeCloseTo(20);
    expect(horizontal?.delta.y).toBe(0);
    const vertical = stepPlaneDrag(begin(rotated, frame), { x: -60, y: 40 }, loose, prefs(), "vertical");
    expect(vertical?.delta.x).toBe(0);
    expect(vertical?.delta.y).toBeCloseTo(20);
    const both = stepPlaneDrag(begin(rotated, frame), { x: -60, y: 40 }, loose, prefs(), "both");
    expect(both?.delta.x).toBeCloseTo(20);
    expect(both?.delta.y).toBeCloseTo(20);
  });

  it("moves through a perspective holder using its start and end points", () => {
    const drag = begin(perspective);
    const step = stepPlaneDrag(drag, screenMove(perspective, 55, 45, 20, 15), loose, prefs(), "both");
    expect(step?.delta.x).toBeCloseTo(20, 7);
    expect(step?.delta.y).toBeCloseTo(15, 7);
    const horizontal = stepPlaneDrag(begin(perspective), screenMove(perspective, 55, 45, 25, 0), loose, prefs(), "horizontal");
    expect(horizontal?.delta.x).toBeCloseTo(25, 7);
    expect(horizontal?.delta.y).toBe(0);
    const vertical = stepPlaneDrag(begin(perspective), screenMove(perspective, 55, 45, 0, 25), loose, prefs(), "vertical");
    expect(vertical?.delta.x).toBe(0);
    expect(vertical?.delta.y).toBeCloseTo(25, 7);
  });

  it("supports a child's authored rotation, scale and perspective without changing the holder axis", () => {
    const look = { rotateX: 15, rotateY: -20, rotateZ: 30, scale: 1.2, moveX: 7, moveY: -3, origin: "bottom", layer: { x: 40, y: 40, anchor: "top-start" } };
    const frame = child(perspective, 80, 60, 60, 40, look, true);
    const drag = begin(perspective, frame, look, [], point(perspective, 90, 70), true);
    const step = stepPlaneDrag(drag, screenMove(perspective, 90, 70, 25, 0), loose, prefs(), "horizontal");
    expect(step?.delta.x).toBeCloseTo(25, 7);
    expect(step?.delta.y).toBe(0);
  });

  it("uses six/ten canvas pixels for snapping under nonuniform scale, and Ctrl clears memory", () => {
    const holder: Plane = { w: 400, h: 300, matrix: [2, 0, 100, 0, 3, 50, 0, 0, 1] };
    const drag = begin(holder);
    const first = stepPlaneDrag(drag, { x: 274, y: 0 }, snapping, prefs(), "horizontal");
    expect(first?.delta).toEqual({ x: 140, y: 0 });
    expect(first?.guides).toEqual([{ x1: 500, y1: 50, x2: 500, y2: 950 }]);
    expect(stepPlaneDrag(drag, { x: 271, y: 0 }, snapping, prefs(), "horizontal")?.delta.x).toBe(140);
    expect(stepPlaneDrag(drag, { x: 271, y: 0 }, loose, prefs(), "horizontal")?.delta.x).toBe(135.5);
    expect(stepPlaneDrag(drag, { x: 271, y: 0 }, snapping, prefs(), "horizontal")?.delta.x).toBe(135.5);
    const fresh = begin(holder);
    stepPlaneDrag(fresh, { x: 274, y: 0 }, snapping, prefs(), "horizontal");
    expect(stepPlaneDrag(fresh, { x: 269, y: 0 }, snapping, prefs(), "horizontal")?.delta.x).toBe(134.5);
  });

  it("projects alignment guides with the holder rather than drawing canvas-axis lines", () => {
    const step = stepPlaneDrag(begin(rotated), { x: 0, y: 174 }, snapping, prefs(), "horizontal");
    expect(step?.delta).toEqual({ x: 90, y: 0 });
    expect(step?.guides).toEqual([{ x1: 400, y1: 400, x2: -200, y2: 400 }]);
  });

  it("never allows snapping on the perpendicular locked axis", () => {
    const peer = { id: "peer", frame: child(rotated, 200, 41.5) };
    const drag = begin(rotated, child(rotated), {}, [peer]);
    const step = stepPlaneDrag(drag, screenMove(rotated, 55, 45, 30, 7), snapping, prefs({ grid: 8, gaps: true }), "horizontal");
    expect(step?.delta.y).toBe(0);
    expect(step?.guides).toEqual([]);
    expect(step?.marks).toEqual([]);
  });

  it("contains both-axis movement even when free movement may leave the holder", () => {
    const horizontal = stepPlaneDrag(begin(rotated), screenMove(rotated, 55, 45, 1000, 0), loose, prefs({ inside: false }), "horizontal");
    expect(horizontal?.delta).toEqual({ x: 230, y: 0 });
    const both = stepPlaneDrag(begin(rotated), screenMove(rotated, 55, 45, 1000, 1000), loose, prefs({ inside: false }), "both");
    expect(both?.delta).toEqual({ x: 230, y: 150 });
    const free = stepPlaneDrag(begin(rotated), screenMove(rotated, 55, 45, 1000, 1000), loose, prefs({ inside: false }), "free");
    expect(free?.delta).toEqual({ x: 1000, y: 1000 });
  });

  it("rejects infeasible containment instead of changing a required coordinate", () => {
    const oversized = begin(rotated, child(rotated, 0, 0, 400, 10));
    expect(stepPlaneDrag(oversized, { x: 0, y: 20 }, loose, prefs(), "horizontal")).toBeNull();
    const outside = begin(rotated, child(rotated, 50, -20));
    expect(stepPlaneDrag(outside, { x: 0, y: 20 }, loose, prefs(), "horizontal")).toBeNull();
  });

  it("blocks a plane at a thin wall on a large move without leaving its locked axis", () => {
    const holder: Plane = { w: 20000, h: 300, matrix: [2, 0, 100, 0, 3, 50, 0, 0, 1] };
    const frame = child(holder, 10, 40, 10, 10);
    const wall = { id: "wall", frame: child(holder, 50, 0, 0.1, 300) };
    const step = stepPlaneDrag(begin(holder, frame, {}, [wall]), { x: 20000, y: 100 }, loose, prefs({ mode: "block" }), "horizontal");
    expect(step?.delta.x).toBeCloseTo(30, 7);
    expect(step?.delta.y).toBe(0);
    expect(step?.touching).toEqual(["wall"]);
  });

  it.each(["block", "push", "magnet"] as const)("preserves a locked axis at a slanted obstacle in %s mode", (mode) => {
    const holder: Plane = { w: 500, h: 300, matrix: identity };
    const frame = child(holder, 10, 60, 10, 10);
    const wall = { id: "wall", frame: child(holder, 50, 10, 2, 100, { rotateZ: -25 }), push: true };
    const step = stepPlaneDrag(begin(holder, frame, {}, [wall]), { x: 200, y: 30 }, loose, prefs({ mode }), "horizontal");
    expect(step?.delta.y).toBe(0);
    expect(step?.delta.x).toBeGreaterThan(0);
    expect(step?.delta.x).toBeLessThan(100);
    expect(step?.pushed.size).toBe(0);
    const body = boxBody({ x: 10, y: 60, w: 10, h: 10 });
    const obstacle = { kind: "poly" as const, pts: planeQuad(wall.frame.matrix, wall.frame)! };
    expect(collide(moveBody(body, step!.delta), obstacle)).toBeNull();
  });

  it("keeps unrestricted push results in holder-local CSS pixels", () => {
    const holder: Plane = { ...rotated, w: 500, h: 300 };
    const frame = child(holder, 10, 40, 20, 20);
    const peer = { id: "peer", frame: child(holder, 60, 40, 20, 20), push: true };
    const step = stepPlaneDrag(begin(holder, frame, {}, [peer]), { x: 0, y: 100 }, loose, prefs({ mode: "push" }), "both");
    expect(step?.delta.x).toBeCloseTo(50, 1);
    expect(step?.delta.y).toBeCloseTo(0, 10);
    expect(step?.pushed.get("peer")?.x).toBeCloseTo(20, 1);
    expect(step?.pushed.get("peer")?.y).toBeCloseTo(0, 10);
  });

  it("removes a guide when pushing moves the peer that supplied its alignment", () => {
    const holder: Plane = { w: 500, h: 300, matrix: identity };
    const frame = child(holder, 10, 40, 20, 20);
    const peer = { id: "peer", frame: child(holder, 60, 40, 20, 20), push: true };
    const drag = begin(holder, frame, {}, [peer]);
    const step = stepPlaneDrag(drag, { x: 50, y: 0 }, snapping, prefs({ mode: "push" }), "both");
    expect(step?.delta.x).toBeCloseTo(50, 1);
    expect(step?.pushed.get("peer")?.x).toBeGreaterThan(19);
    expect(step?.guides.some((g) => g.x1 === g.x2)).toBe(false);
    const next = stepPlaneDrag(drag, { x: 90, y: 0 }, snapping, prefs({ mode: "overlap" }), "both");
    expect(next?.guides.find((g) => g.x1 === g.x2)?.x1).toBeCloseTo(100, 1);
  });

  it("projects equal-gap marks and keeps grid distances in local CSS pixels", () => {
    const holder: Plane = { w: 600, h: 400, matrix: [2, 0, 100, 0, 3, 50, 0, 0, 1] };
    const row = [0, 70, 140].map((x, i) => ({ id: `peer${i}`, frame: child(holder, x, 0, 50, 50) }));
    const drag = begin(holder, child(holder, 400, 300, 50, 50), {}, row, point(holder, 405, 305));
    const step = stepPlaneDrag(drag, { x: -374, y: -900 }, snapping, prefs({ gaps: true }), "both");
    expect(step?.delta.x).toBeCloseTo(-190, 8);
    expect(step?.delta.y).toBeCloseTo(-300, 8);
    expect(step?.marks.map((m) => m.length)).toEqual([40, 40]);
    const grid = stepPlaneDrag(begin(holder), { x: 26, y: 0 }, snapping, prefs({ grid: 8 }), "horizontal");
    expect(grid?.delta).toEqual({ x: 14, y: 0 });
  });

  it("keeps the last valid result when a requested projective position crosses the camera plane", () => {
    const holder: Plane = { w: 500, h: 300, matrix: [1, 0, 0, 0, 1, 0, 0.001, 0, 1] };
    const drag = begin(holder);
    const first = stepPlaneDrag(drag, screenMove(holder, 55, 45, 20, 0), loose, prefs({ inside: false }), "free");
    expect(first?.delta.x).toBeCloseTo(20);
    expect(stepPlaneDrag(drag, { x: 2000, y: 0 }, loose, prefs({ inside: false }), "free")).toBeNull();
    expect(drag.last.x).toBeCloseTo(20);
  });

  it("rejects singular and unsupported contexts, and preserves the last state after invalid input", () => {
    expect(startPlaneDrag(child(rotated), { ...rotated, matrix: [0, 0, 0, 0, 0, 0, 0, 0, 1] }, {}, false, { x: 0, y: 0 }, [])).toBeNull();
    expect(startPlaneDrag(child(rotated, 50, 40, 20, 10, { scale: 2 }), rotated, {}, false, point(rotated, 55, 45), [])).toBeNull();
    const drag = begin(rotated);
    expect(stepPlaneDrag(drag, { x: 0, y: 40 }, loose, prefs(), "horizontal")?.delta.x).toBeCloseTo(20);
    expect(stepPlaneDrag(drag, { x: NaN, y: 0 }, snapping, prefs(), "horizontal")).toBeNull();
    expect(stepPlaneDrag(drag, { x: 0, y: 60 }, loose, prefs(), "horizontal")?.delta.x).toBeCloseTo(30);
  });
});
