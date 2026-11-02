import { describe, expect, it } from "vitest";
import { toScreen } from "./geometry";
import {
  apply, bodyOf, boxBody, boxOfBody, chain, clearOf, collide, cornersOf, equalGaps, hull, invert, keepInside, lockAxis,
  moveBody, outlinePoints, pageToScreen, rotate, scale, settle, slotAt, snapToGrid, translate, turnedOf, type Body, type Obstacle,
} from "./space";

const near = (a: number, b: number, d = 0.05) => expect(Math.abs(a - b)).toBeLessThanOrEqual(d);
const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });

describe("dragging as plane geometry", () => {
  it("maps compose, turn clockwise on the screen and undo exactly", () => {
    const m = chain(translate(40, -10), rotate(30, { x: 5, y: 5 }), scale(2, 0.5));
    const p = { x: 13, y: -7 };
    const back = apply(invert(m), apply(m, p));
    near(back.x, p.x, 1e-9);
    near(back.y, p.y, 1e-9);
    // A quarter turn takes "right" to "down" (y goes down), about its own middle.
    const q = apply(rotate(90, { x: 10, y: 10 }), { x: 20, y: 10 });
    near(q.x, 10, 1e-9);
    near(q.y, 20, 1e-9);
    // The page on the screen is the same as the editor's toScreen.
    const b = box(100, 900, 50, 20);
    const m2 = pageToScreen({ x: 0, y: 800 }, { x: 30, y: 60 }, 0.5);
    const tl = apply(m2, b);
    expect({ x: tl.x, y: tl.y }).toEqual({ x: toScreen(b, { x: 0, y: 800 }, { x: 30, y: 60 }, 0.5).x, y: toScreen(b, { x: 0, y: 800 }, { x: 30, y: 60 }, 0.5).y });
    expect(() => invert(scale(0))).toThrow();
  });

  it("finds a turned element's own size from the box around it", () => {
    const t = { c: { x: 200, y: 100 }, w: 120, h: 40, deg: 30 };
    const around = (() => {
      const pts = cornersOf(t);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      return box(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    })();
    const back = turnedOf(around, 30);
    near(back.w, 120, 0.01);
    near(back.h, 40, 0.01);
    near(back.c.x, 200, 1e-9);
    expect(turnedOf(around, 30, { w: 7, h: 9 })).toMatchObject({ w: 7, h: 9 });
    // At 45° the two sides can't be told apart: a square.
    const sq = turnedOf(box(0, 0, 100, 100), 45);
    near(sq.w, sq.h, 1e-9);
    expect(cornersOf({ c: { x: 5, y: 5 }, w: 10, h: 10, deg: 0 })).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  });

  it("reads SVG outlines: lines, curves and arcs (a circle's points are all on it)", () => {
    expect(outlinePoints("M0 0H100V100H0Z")).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
    const circle = outlinePoints("M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z", 16);
    expect(circle.length).toBeGreaterThan(30);
    for (const p of circle) near(Math.hypot(p.x - 50, p.y - 50), 50, 1e-6);
    // Relative moves and a curve's end.
    expect(outlinePoints("m10 10l5 0h5v5z").slice(-1)[0]).toEqual({ x: 20, y: 15 });
    const curve = outlinePoints("M0 0C0 50 100 50 100 0", 4);
    expect(curve.at(-1)).toEqual({ x: 100, y: 0 });
    // A star's convex outline is its five points.
    expect(hull(outlinePoints("M50 0L61.8 35.4H98.1L68.7 57.3L79.9 92.7L50 70.8L20.1 92.7L31.3 57.3L1.9 35.4H38.2Z"))).toHaveLength(5);
  });

  it("collides boxes, turned boxes, cut shapes and circles (SAT), touching isn't overlapping", () => {
    const a = boxBody(box(0, 0, 100, 100));
    const hit = collide(a, boxBody(box(90, 20, 50, 50)))!;
    expect(hit.depth).toBeCloseTo(10, 6);
    expect(hit.normal).toEqual({ x: -1, y: 0 });
    expect(collide(a, boxBody(box(100, 0, 50, 50)))).toBeNull();
    expect(collide(a, boxBody(box(140, 0, 50, 50)))).toBeNull();
    // A diamond whose box overlaps the square's corner but whose sides don't.
    const diamond = bodyOf({ c: { x: 135, y: 135 }, w: 60, h: 60, deg: 45 });
    const r = boxOfBody(diamond);
    expect(r.x).toBeLessThan(100);
    expect(collide(a, diamond)).toBeNull();
    expect(collide(a, bodyOf({ c: { x: 115, y: 115 }, w: 60, h: 60, deg: 45 }))).not.toBeNull();
    // A circle off a corner: boxes overlap, the circle doesn't.
    const ball: Body = { kind: "circle", c: { x: 120, y: 120 }, r: 25 };
    expect(collide(a, ball)).toBeNull();
    expect(collide(a, { kind: "circle", c: { x: 115, y: 50 }, r: 25 })!.depth).toBeCloseTo(10, 6);
    const two = collide({ kind: "circle", c: { x: 0, y: 0 }, r: 10 }, { kind: "circle", c: { x: 15, y: 0 }, r: 10 })!;
    expect([two.depth, two.normal.x, Math.abs(two.normal.y)]).toEqual([5, -1, 0]);
    // A round cut on a square is a circle; a star is its outline inside the box.
    expect(bodyOf({ c: { x: 50, y: 50 }, w: 100, h: 100, deg: 0 }, "circle")).toEqual({ kind: "circle", c: { x: 50, y: 50 }, r: 50 });
    const star = bodyOf({ c: { x: 50, y: 50 }, w: 100, h: 100, deg: 0 }, "star");
    expect(star.kind === "poly" && star.pts).toHaveLength(5);
    expect(collide(star, boxBody(box(85, 85, 15, 15)))).toBeNull();
  });

  it("passes over, stops and slides along an edge, and isn't jumped through", () => {
    const me = boxBody(box(0, 0, 50, 50));
    const wall: Obstacle[] = [{ id: "wall", body: boxBody(box(100, -500, 10, 1000)) }];
    expect(settle(me, { x: 0, y: 0 }, { x: 80, y: 0 }, wall, { mode: "overlap" }).d).toEqual({ x: 80, y: 0 });
    const stop = settle(me, { x: 0, y: 0 }, { x: 80, y: 0 }, wall, { mode: "block" });
    near(stop.d.x, 50, 0.05);
    expect(stop.touching).toEqual(["wall"]);
    // Towards the wall at a slant: what's left of the move goes along it.
    const slide = settle(me, { x: 0, y: 0 }, { x: 90, y: 60 }, wall, { mode: "block" });
    near(slide.d.x, 50, 0.05);
    near(slide.d.y, 60, 0.05);
    // One big jump past a thin wall is still stopped.
    const jump = settle(me, { x: 0, y: 0 }, { x: 400, y: 0 }, wall, { mode: "block" });
    near(jump.d.x, 50, 0.05);
    // Kept inside its holder.
    const kept = settle(me, { x: 0, y: 0 }, { x: -30, y: 500 }, [], { mode: "block", bounds: box(0, 0, 300, 300) });
    expect(kept.d).toEqual({ x: 0, y: 250 });
    expect(keepInside(boxBody(box(-10, 290, 50, 50)), box(0, 0, 300, 300))).toEqual({ x: 10, y: -40 });
    // What it starts over doesn't stop it.
    expect(clearOf(me, [{ id: "under", body: boxBody(box(10, 10, 10, 10)) }, ...wall]).map((o) => o.id)).toEqual(["wall"]);
  });

  it("pushes what can move, through a chain, up to the holder's edge", () => {
    const me = boxBody(box(0, 0, 40, 40));
    const obstacles: Obstacle[] = [
      { id: "a", body: boxBody(box(60, 0, 40, 40)), push: true },
      { id: "b", body: boxBody(box(110, 0, 40, 40)), push: true },
    ];
    const r = settle(me, { x: 0, y: 0 }, { x: 50, y: 0 }, obstacles, { mode: "push", bounds: box(0, 0, 400, 100) });
    near(r.d.x, 50, 0.1);
    near(r.pushed.get("a")!.x, 30, 0.2);
    near(r.pushed.get("b")!.x, 20, 0.3);
    // Against the holder's edge they stop, and so does the drag.
    const walled = settle(me, { x: 0, y: 0 }, { x: 200, y: 0 }, obstacles, { mode: "push", bounds: box(0, 0, 200, 100) });
    near(walled.pushed.get("b")!.x, 50, 0.3);
    near(walled.pushed.get("a")!.x, 60, 0.5);
    expect(walled.d.x).toBeLessThanOrEqual(80.6);
    // Something that can't be pushed stops it.
    const fixed = settle(me, { x: 0, y: 0 }, { x: 50, y: 0 }, [{ id: "a", body: boxBody(box(60, 0, 40, 40)) }], { mode: "push" });
    near(fixed.d.x, 20, 0.05);
    expect(fixed.pushed.size).toBe(0);
  });

  it("pulls flush like a magnet, a gap apart when asked", () => {
    const me = boxBody(box(0, 0, 40, 40));
    const next: Obstacle[] = [{ id: "n", body: boxBody(box(100, 10, 40, 40)) }];
    const r = settle(me, { x: 0, y: 0 }, { x: 50, y: 0 }, next, { mode: "magnet", magnet: 12 });
    near(r.d.x, 60, 0.05);
    expect(r.touching).toEqual(["n"]);
    const spaced = settle(me, { x: 0, y: 0 }, { x: 45, y: 0 }, next, { mode: "magnet", magnet: 12, gap: 8 });
    near(spaced.d.x, 52, 0.05);
    // Too far: left where it was put.
    expect(settle(me, { x: 0, y: 0 }, { x: 30, y: 0 }, next, { mode: "magnet", magnet: 12 }).d).toEqual({ x: 30, y: 0 });
  });

  it("locks Shift's drag to a straight or 45° line, and snaps to a grid", () => {
    expect(lockAxis({ x: 50, y: 10 })).toEqual({ x: 50, y: 0 });
    expect(lockAxis({ x: -4, y: 40 })).toEqual({ x: 0, y: 40 });
    expect(lockAxis({ x: 30, y: -34 })).toEqual({ x: 32, y: -32 });
    expect(snapToGrid(box(13, 29, 10, 10), 8)).toMatchObject({ x: 16, y: 32 });
    expect(snapToGrid(box(13, 29, 10, 10), 8, { x: 5, y: 5 })).toMatchObject({ x: 13, y: 29 });
  });

  it("snaps to equal gaps in a row and to the middle between two neighbours", () => {
    const row = [box(0, 0, 50, 50), box(70, 0, 50, 50), box(140, 0, 50, 50)];
    const g = equalGaps(box(213, 0, 50, 50), row);
    expect(g.dx).toBeCloseTo(-3, 6);
    expect(g.dy).toBe(0);
    expect(g.marks.map((m) => Math.round(m.length))).toEqual([20, 20]);
    const between = equalGaps(box(68, 100, 40, 40), [box(0, 100, 40, 40), box(140, 100, 40, 40)]);
    expect(between.dx).toBeCloseTo(2, 6);
    expect(equalGaps(box(300, 0, 50, 50), row).dx).toBe(0);
  });

  it("finds the place in a list, a row and a wrapping grid (right to left too)", () => {
    const holder = box(0, 0, 300, 400);
    const list = [box(0, 0, 300, 50), box(0, 60, 300, 50), box(0, 120, 300, 50)];
    expect(slotAt({ x: 10, y: 70 }, list, holder, false).index).toBe(1);
    expect(slotAt({ x: 10, y: 100 }, list, holder, false)).toMatchObject({ index: 2, line: { y: 114 } });
    expect(slotAt({ x: 10, y: 390 }, list, holder, false).index).toBe(3);
    // Three in a row, wrapping: the second row by height, then the place in it.
    const grid = [0, 1, 2, 3, 4].map((i) => box((i % 3) * 100, Math.floor(i / 3) * 100, 90, 90));
    expect(slotAt({ x: 120, y: 150 }, grid, holder, false)).toMatchObject({ index: 4 });
    expect(slotAt({ x: 250, y: 140 }, grid, holder, false)).toMatchObject({ index: 5 });
    expect(slotAt({ x: 10, y: 20 }, grid, holder, false)).toMatchObject({ index: 0, line: { x: -1, y: 0, h: 90 } });
    // Right to left the row starts on the right.
    const rtl = [box(200, 0, 100, 50), box(100, 0, 100, 50), box(0, 0, 100, 50)];
    expect(slotAt({ x: 280, y: 20 }, rtl, holder, true).index).toBe(0);
    expect(slotAt({ x: 130, y: 20 }, rtl, holder, true).index).toBe(2);
    expect(slotAt({ x: 5, y: 5 }, [], holder, false)).toEqual({ index: 0, line: { x: 0, y: 199, w: 300, h: 3 } });
    void moveBody;
  });
});
