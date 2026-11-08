import { expect, test } from "vitest";
import { partDragOffset } from "./partDrag";
import { isAffineXY } from "../../../shared/geometry/plane";
test("part dragging measures pointer displacement in its rotated and scaled parent plane", () => {
  const parent = { matrix: [0, -2, 100, 2, 0, 50, 0, 0, 1] as const, w: 200, h: 100 };
  expect(partDragOffset(parent, { x: 100, y: 50 }, { x: 60, y: 110 }, { x: 7, y: 9 })).toEqual({ x: 37, y: 29 });
});
test("part movement rejects singular planes and respects the persisted offset bounds", () => {
  const parent = { matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] as const, w: 200, h: 100 };
  expect(partDragOffset(parent, { x: 0, y: 0 }, { x: 5000, y: -5000 }, { x: 0, y: 0 })).toEqual({ x: 1000, y: -1000 });
  expect(partDragOffset({ ...parent, matrix: [0,0,0,0,0,0,0,0,0] }, { x: 0, y: 0 }, { x: 10, y: 20 }, { x: 0, y: 0 })).toBeNull();
});
test("own perspective and out-of-plane turns need manual position controls", () => {
  expect(isAffineXY([1,0,0,15,0,1,0,20,0,0,1,0,0,0,0,1])).toBe(true);
  expect(isAffineXY([.5,0,.866,0,0,1,0,0,-.866,0,.5,0,0,0,-.005,1])).toBe(false);
  expect(isAffineXY([1,0,0,15,0,1,0,20,0,0,1,0,0,0,-1/1200,1])).toBe(true);
});
