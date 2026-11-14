import { expect, test } from "@playwright/test";
import { MASKS } from "../src/pageTree/css";
import { bodyOf } from "../src/pageTree/physics";
import { bodyOutline, centroid, convexHull, cssLength, maskPath, middleOf, polygonArea, polygonCorners, ropeTaut, straightPath } from "../src/pageTree/physicsShape";

// A body's real outline in a physics world (pageTree/physicsShape.ts) and a body's link to another one.

const maskOf = (d: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;
const round = (pts: Array<{ x: number; y: number }>) => pts.map((p) => [Math.round(p.x), Math.round(p.y)]);

test("a CSS length reads as px along its side: a percent, px, nought, or a sum of them", () => {
  expect(cssLength("40%", 200)).toBe(80);
  expect(cssLength("12px", 200)).toBe(12);
  expect(cssLength("0", 200)).toBe(0);
  expect(cssLength("calc(100% - 12px)", 200)).toBe(188);
  expect(cssLength("calc(50% + 7.5px)", 300)).toBe(157.5);
  expect(cssLength("calc(12px + 25%)", 80)).toBe(32);
  expect(cssLength("-8px", 100)).toBe(-8);
  for (const bad of ["", "12", "12em", "calc(50% * 2)", "50% 10px", "auto", "calc(50% + )"]) expect(cssLength(bad, 100), bad).toBeNull();
});

test("a polygon clip gives its corners on the element's box", () => {
  expect(polygonCorners("polygon(50% 0%, 100% 100%, 0% 100%)", 200, 100)).toEqual([{ x: 100, y: 0 }, { x: 200, y: 100 }, { x: 0, y: 100 }]);
  // As a shape by equations writes it, and as a browser gives it back.
  expect(polygonCorners("polygon(calc(0% + 12px) 0px, calc(100% - 12px) 0px, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)", 100, 60)).toEqual([
    { x: 12, y: 0 }, { x: 88, y: 0 }, { x: 100, y: 30 }, { x: 88, y: 60 }, { x: 12, y: 60 }, { x: 0, y: 30 },
  ]);
  expect(polygonCorners("polygon(evenodd, 0% 0%, 100% 0%, 50% 100%)", 10, 10)).toHaveLength(3);
  for (const bad of ["none", "circle(50%)", "polygon(0% 0%, 100% 0%)", "polygon(0% 0% 5%, 1% 1%, 2% 2%)", "inset(10px)"]) expect(polygonCorners(bad, 100, 100), bad).toBeNull();
});

test("a mask gives its path when it is one of the shop's own; a path of straight lines gives its corners", () => {
  expect(maskPath(maskOf(MASKS.diamond))).toBe(MASKS.diamond);
  expect(maskPath(`${maskOf(MASKS.star)}, linear-gradient(red, blue)`)).toBe(MASKS.star);
  for (const other of ["none", "linear-gradient(#000, #fff)", 'url("https://example.com/mask.svg")', 'url("data:image/svg+xml,%3Csvg%20viewBox%3D\'0%200%2050%2050\'%3E%3Cpath%20d%3D\'M0%200L50%200L25%2050Z\'%2F%3E%3C%2Fsvg%3E")']) expect(maskPath(other), other).toBeNull();
  expect(straightPath(MASKS.diamond)).toEqual([{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }]);
  expect(straightPath(MASKS.triangle)).toEqual([{ x: 50, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
  expect(straightPath(MASKS.octagon)).toHaveLength(8);
  expect(straightPath(MASKS.plus)).toHaveLength(12);
  // Curves are left for the browser to measure.
  for (const curved of [MASKS.heart, MASKS.drop, MASKS.leaf, MASKS.ticket]) expect(straightPath(curved)).toBeNull();
  // Every mask of the shop is either straight or curved: none is refused as a path.
  for (const [name, d] of Object.entries(MASKS)) expect(straightPath(d) !== null || /[CAQS]/.test(d), name).toBe(true);
});

test("the hull is the tight outline round the points: dents and inner points are left out", () => {
  // A star's hull is the pentagon through its five tips.
  const star = convexHull(straightPath(MASKS.star)!);
  expect(star).toHaveLength(5);
  expect(round(star).map((p) => p.join(",")).sort()).toEqual(["2,35", "20,93", "50,0", "80,93", "98,35"].sort());
  // A plus sign's hull is the octagon round it.
  expect(convexHull(straightPath(MASKS.plus)!)).toHaveLength(8);
  // Points inside and along a side are dropped.
  expect(round(convexHull([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 4, y: 4 }]))).toHaveLength(4);
  // It goes one way round all the way: every turn has the same sign.
  const turns = star.map((p, i) => { const a = star[(i + 1) % 5], b = star[(i + 2) % 5]; return Math.sign((a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x)); });
  expect(new Set(turns).size).toBe(1);
  expect(convexHull([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toEqual([]);
  expect(convexHull([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }])).toEqual([]);
});

test("area and the centre of area: a triangle's weight sits a third of the way up, not at its box's middle", () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  expect(polygonArea(square)).toBe(100);
  expect(centroid(square)).toEqual({ x: 5, y: 5 });
  const triangle = straightPath(MASKS.triangle)!;
  expect(polygonArea(triangle)).toBe(5000);
  const c = centroid(triangle);
  expect(c.x).toBeCloseTo(50, 9);
  expect(c.y).toBeCloseTo(200 / 3, 9);
  // The same whichever way round the corners are given.
  const back = centroid([...triangle].reverse());
  expect(back.x).toBeCloseTo(c.x, 9);
  expect(back.y).toBeCloseTo(c.y, 9);
  // A diamond balances at its middle.
  expect(centroid(straightPath(MASKS.diamond)!)).toEqual({ x: 50, y: 50 });
});

test("an outline becomes a body only when it is neither the box itself nor a sliver", () => {
  const scale = (pts: Array<{ x: number; y: number }>, w: number, h: number) => pts.map((p) => ({ x: (p.x / 100) * w, y: (p.y / 100) * h }));
  // A diamond on a 200 × 100 box: half the box.
  const diamond = bodyOutline(scale(straightPath(MASKS.diamond)!, 200, 100), 200, 100)!;
  expect(round(diamond).map((p) => p.join(",")).sort()).toEqual(["0,50", "100,0", "100,100", "200,50"].sort());
  // A full rectangle is left as the box it is.
  expect(bodyOutline([{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 0, y: 100 }], 200, 100)).toBeNull();
  // A sliver, nothing, or a box with no size: no outline.
  expect(bodyOutline([{ x: 0, y: 0 }, { x: 200, y: 1 }, { x: 0, y: 2 }], 200, 100)).toBeNull();
  expect(bodyOutline(null, 200, 100)).toBeNull();
  expect(bodyOutline(scale(straightPath(MASKS.diamond)!, 200, 100), 0, 100)).toBeNull();
  // Corners outside the box are brought to its edge.
  expect(round(bodyOutline([{ x: -50, y: 50 }, { x: 100, y: -40 }, { x: 250, y: 50 }, { x: 100, y: 140 }], 200, 100)!).every(([x, y]) => x >= 0 && x <= 200 && y >= 0 && y <= 100)).toBe(true);
});

test("the element's middle follows its body's centre, turned with it", () => {
  // No offset: the middle is the body's place whatever its turn.
  expect(middleOf({ x: 100, y: 80 }, 1.2, { x: 0, y: 0 })).toEqual({ x: 100, y: 80 });
  // A triangle's centre is 1/6 of its height below its middle: upright, the middle is that far above the body.
  const off = { x: 0, y: 20 };
  expect(middleOf({ x: 100, y: 80 }, 0, off)).toEqual({ x: 100, y: 60 });
  // A quarter turn clockwise: what was below is now to the left, so the middle is to the right.
  const quarter = middleOf({ x: 100, y: 80 }, Math.PI / 2, off);
  expect(quarter.x).toBeCloseTo(120, 9);
  expect(quarter.y).toBeCloseTo(80, 9);
  // Upside down: the middle is below the body.
  const over = middleOf({ x: 100, y: 80 }, Math.PI, off);
  expect(over.x).toBeCloseTo(100, 9);
  expect(over.y).toBeCloseTo(100, 9);
});

test("a rope pulls only once it is taut; a body's link keeps a known id and kind", () => {
  expect(ropeTaut(99, 100)).toBe(false);
  expect(ropeTaut(100, 100)).toBe(false);
  expect(ropeTaut(100.5, 100)).toBe(true);
  expect(bodyOf({ link: "anchor", linkKind: "rod" })).toEqual({ link: "anchor", linkKind: "rod" });
  expect(bodyOf({ link: "anchor" })).toEqual({ link: "anchor" });
  // A kind without a link, an unknown kind, an id that isn't one: left out.
  expect(bodyOf({ linkKind: "rod" })).toBeNull();
  expect(bodyOf({ link: "anchor", linkKind: "chain" })).toEqual({ link: "anchor" });
  expect(bodyOf({ link: "not an id!", fixed: true })).toEqual({ fixed: true });
});
