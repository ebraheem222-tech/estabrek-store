import { describe, expect, it } from "vitest";
import {
  DIRECTIONS, HoverFilter, SpatialGrid, clickTarget, distToBox, insidePolygon, pickAt, queenStep, rayHitsBox, toScreen, zoomAround,
  type Shape,
} from "./geometry";

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
const shape = (id: string, b: ReturnType<typeof box>, depth = 1, parentId: string | null = "page"): Shape => ({ id, box: b, depth, parentId });

describe("distance and rays", () => {
  it("measures from a point to a box, 0 inside", () => {
    expect(distToBox({ x: 5, y: 5 }, box(0, 0, 10, 10))).toBe(0);
    expect(distToBox({ x: 13, y: 14 }, box(0, 0, 10, 10))).toBe(5);
    expect(distToBox({ x: -2, y: 5 }, box(0, 0, 10, 10))).toBe(2);
  });
  it("finds where a ray meets a box", () => {
    expect(rayHitsBox({ x: 0, y: 5 }, { x: 1, y: 0 }, box(10, 0, 5, 10))).toBe(10);
    expect(rayHitsBox({ x: 0, y: 5 }, { x: -1, y: 0 }, box(10, 0, 5, 10))).toBeNull();
    expect(rayHitsBox({ x: 0, y: 50 }, { x: 1, y: 0 }, box(10, 0, 5, 10))).toBeNull();
  });
  it("odd-even: inside a slanted shape or not", () => {
    const diamond = [{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }];
    expect(insidePolygon({ x: 50, y: 50 }, diamond)).toBe(true);
    expect(insidePolygon({ x: 5, y: 5 }, diamond)).toBe(false); // inside its box, outside the shape
  });
});

describe("picking the element under the pointer", () => {
  const section = shape("section", box(0, 0, 400, 300), 1);
  const card = shape("card", box(20, 20, 200, 200), 2, "section");
  const button = shape("button", box(40, 150, 80, 30), 3, "card");
  const all = [section, card, button];

  it("inside nested elements, the deepest wins", () => {
    expect(pickAt(all, { x: 60, y: 160 })).toMatchObject({ id: "button", inside: true, nearEdge: false });
    expect(pickAt(all, { x: 30, y: 30 })).toMatchObject({ id: "card" });
    expect(pickAt(all, { x: 390, y: 290 })).toMatchObject({ id: "section", nearEdge: false });
  });

  it("same depth: the smaller one", () => {
    const a = shape("a", box(0, 0, 100, 100), 2);
    const b = shape("b", box(40, 40, 20, 20), 2);
    expect(pickAt([a, b], { x: 50, y: 50 })?.id).toBe("b");
  });

  it("outside everything: the nearest within 8 px, else nothing", () => {
    const small = shape("small", box(110, 103, 20, 5));
    const big = shape("big", box(0, 0, 80, 400));
    // The queen's-lines counter-example: the big box crosses more lines, the small one is nearer.
    expect(pickAt([small, big], { x: 104, y: 100 })).toMatchObject({ id: "small", inside: false });
    expect(pickAt([small, big], { x: 300, y: 300 })).toBeNull();
  });

  it("the threshold is in screen pixels: zooming in makes a near miss a miss", () => {
    const tiny = box(100, 100, 4, 4);
    const p = { x: 98, y: 102 }; // 2 page px left of it
    const at = (zoom: number) => pickAt([shape("t", toScreen(tiny, { x: 0, y: 0 }, { x: 0, y: 0 }, zoom))], { x: p.x * zoom, y: p.y * zoom });
    expect(at(1)?.id).toBe("t"); // 2 screen px away
    expect(at(5)).toBeNull(); // 10 screen px away
  });

  it("a near tie goes to the box the pointer is heading for", () => {
    const left = shape("left", box(0, 0, 10, 10));
    const right = shape("right", box(20, 0, 10, 10));
    const mid = { x: 15, y: 5 };
    expect(pickAt([left, right], mid, { heading: { x: 1, y: 0 } })?.id).toBe("right");
    expect(pickAt([left, right], mid, { heading: { x: -1, y: 0 } })?.id).toBe("left");
  });

  it("near a border, a click takes the steady highlight", () => {
    const now = pickAt(all, { x: 41, y: 160 }); // 1 px inside the button
    expect(now).toMatchObject({ id: "button", nearEdge: true });
    expect(clickTarget(now, "card")).toBe("card");
    expect(clickTarget(pickAt(all, { x: 80, y: 165 }), "card")).toBe("button");
  });
});

describe("the spatial grid", () => {
  it("gives the same answer as checking every element, on thousands of random ones", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const shapes: Shape[] = Array.from({ length: 3000 }, (_, i) => {
      const w = 4 + rnd() * 300;
      const h = 4 + rnd() * 200;
      return shape(`s${i}`, box(rnd() * 2400, rnd() * 4000, w, h), 1 + Math.floor(rnd() * 6));
    });
    const grid = new SpatialGrid(shapes);
    for (let i = 0; i < 2000; i++) {
      const p = { x: rnd() * 2400, y: rnd() * 4000 };
      expect(pickAt(grid.near(p), p)?.id ?? null).toBe(pickAt(shapes, p)?.id ?? null);
    }
  });

  it("leaves out what is outside the visible canvas", () => {
    const grid = new SpatialGrid([shape("off", box(5000, 5000, 10, 10)), shape("on", box(10, 10, 10, 10))], 64, box(0, 0, 1000, 800));
    expect(grid.near({ x: 5005, y: 5005 })).toEqual([]);
    expect(grid.near({ x: 15, y: 15 }).map((s) => s.id)).toEqual(["on"]);
  });
});

describe("the steady highlight", () => {
  it("doesn't flicker when a hand shakes on a border", () => {
    const f = new HoverFilter();
    const seen = ["button", "card", "button", "button", "card", "button"].map((id, i) => f.push(i * 16, id));
    expect(seen).toEqual(["button", "button", "button", "button", "button", "button"]);
  });
  it("moves on once the pointer really is somewhere else", () => {
    const f = new HoverFilter();
    for (let t = 0; t <= 160; t += 16) f.push(t, "a");
    let t = 176;
    let moved = -1;
    for (let i = 0; i < 20; i++, t += 16) if (f.push(t, "b") === "b" && moved < 0) moved = t;
    expect(moved).toBeGreaterThan(176); // not on the first sample…
    expect(moved - 176).toBeLessThan(120); // …but within a few frames
    for (let i = 0; i < 30; i++, t += 16) f.push(t, null);
    expect(f.current).toBeNull();
  });
});

describe("arrow keys move like a queen", () => {
  //  a  b
  //  c     d (lower)
  const a = shape("a", box(0, 0, 100, 50));
  const b = shape("b", box(200, 0, 100, 50));
  const c = shape("c", box(0, 100, 100, 50));
  const d = shape("d", box(400, 300, 100, 50));
  const kids = shape("a1", box(10, 10, 20, 20), 2, "a");
  const all = [a, b, c, d, kids];
  const related = (x: Shape, y: Shape) => x.id === y.parentId || y.id === x.parentId;

  it("goes to the nearest in the direction, inside a narrow cone", () => {
    expect(queenStep(a, all, DIRECTIONS.right, { related })?.id).toBe("b");
    expect(queenStep(a, all, DIRECTIONS.down, { related })?.id).toBe("c");
    expect(queenStep(a, all, DIRECTIONS.downRight, { related })?.id).toBe("d");
    expect(queenStep(b, all, DIRECTIONS.left, { related })?.id).toBe("a");
    expect(queenStep(c, all, DIRECTIONS.up, { related })?.id).toBe("a");
    expect(queenStep(b, all, DIRECTIONS.up, { related })).toBeNull();
  });
  it("skips its own children, and prefers elements with the same parent", () => {
    expect(queenStep(a, all, DIRECTIONS.right, { related })?.id).not.toBe("a1");
    const sib = shape("a2", box(40, 10, 20, 20), 2, "a");
    expect(queenStep(kids, [...all, sib], DIRECTIONS.right, { related })?.id).toBe("a2");
  });
});

describe("zoom and pan", () => {
  it("keeps the point under the cursor still, within 10%–400%", () => {
    const pan = { x: 100, y: 50 };
    const cursor = { x: 600, y: 400 };
    const pagePoint = { x: (cursor.x - pan.x) / 1, y: (cursor.y - pan.y) / 1 };
    const next = zoomAround(pan, 1, cursor, 2);
    expect(next.zoom).toBe(2);
    expect({ x: next.pan.x + pagePoint.x * 2, y: next.pan.y + pagePoint.y * 2 }).toEqual(cursor);
    expect(zoomAround(pan, 1, cursor, 9).zoom).toBe(4);
    expect(zoomAround(pan, 1, cursor, 0.01).zoom).toBe(0.1);
  });
  it("puts a page box on the screen with the frame's scroll", () => {
    expect(toScreen(box(100, 1000, 50, 20), { x: 0, y: 900 }, { x: 40, y: 60 }, 0.5)).toEqual(box(90, 110, 25, 10));
  });
});
