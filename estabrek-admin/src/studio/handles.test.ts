import { describe, expect, it } from "vitest";
import { angleAt, gapsBetween, handleAt, nudgeOf, resizeBox, snapBox, turnTo } from "./handles";

const b = { x: 100, y: 100, w: 200, h: 100 };

describe("changing an element on the page", () => {
  it("handles resize from the side or corner dragged; Shift keeps the proportions", () => {
    expect(handleAt(b, "se")).toEqual({ x: 300, y: 200 });
    expect(handleAt(b, "n")).toEqual({ x: 200, y: 100 });
    expect(resizeBox(b, "e", 50, 999)).toEqual({ x: 100, y: 100, w: 250, h: 100 });
    // The left and top handles move that side; the other stays put.
    expect(resizeBox(b, "nw", 20, 10)).toEqual({ x: 120, y: 110, w: 180, h: 90 });
    expect(resizeBox(b, "se", 100, 0, true)).toEqual({ x: 100, y: 100, w: 300, h: 150 });
    expect(resizeBox(b, "w", -100, 0, true)).toEqual({ x: 0, y: 100, w: 300, h: 150 });
    // Never smaller than the minimum.
    expect(resizeBox(b, "e", -500, 0).w).toBe(8);
  });

  it("the turn handle gives degrees clockwise from up, snapping with Shift", () => {
    const c = { x: 0, y: 0 };
    expect(angleAt(c, { x: 0, y: -10 })).toBe(0);
    expect(angleAt(c, { x: 10, y: 0 })).toBe(90);
    expect(Math.abs(angleAt(c, { x: 0, y: 10 }))).toBe(180);
    expect(turnTo(370)).toBe(10);
    expect(turnTo(-200)).toBe(160);
    expect(turnTo(22, 15)).toBe(15);
    expect(turnTo(23, 15)).toBe(30);
  });

  it("a dragged box snaps to the nearest edge or middle within reach, with a guide", () => {
    const holder = { x: 0, y: 0, w: 1000, h: 600 };
    // Its middle 4px off the container's middle: pulled onto it.
    const r = snapBox({ x: 404, y: 37, w: 200, h: 50 }, [holder]);
    expect(r.box.x).toBe(400);
    expect(r.guides[0]).toEqual({ x1: 500, y1: 0, x2: 500, y2: 600 });
    // Its top 3px under another's bottom… and nothing across within reach.
    const s = snapBox({ x: 720, y: 153, w: 100, h: 40 }, [{ x: 50, y: 100, w: 80, h: 50 }]);
    expect(s.box).toEqual({ x: 720, y: 150, w: 100, h: 40 });
    expect(s.guides).toHaveLength(1);
    // Too far: untouched.
    expect(snapBox({ x: 420, y: 37, w: 200, h: 50 }, [holder], 6).box.x).toBe(420);
  });

  it("Alt shows the gaps between two apart, or from each edge when one holds the other", () => {
    const a = { x: 0, y: 0, w: 100, h: 50 };
    expect(gapsBetween(a, { x: 130, y: 10, w: 50, h: 20 }).map((g) => g.length)).toEqual([30]);
    expect(gapsBetween(a, { x: 10, y: 80, w: 50, h: 20 }).map((g) => g.length)).toEqual([30]);
    expect(gapsBetween({ x: 10, y: 10, w: 20, h: 20 }, { x: 0, y: 0, w: 100, h: 50 }).map((g) => g.length)).toEqual([10, 70, 10, 20]);
    expect(nudgeOf("ArrowLeft", true)).toEqual({ x: -10, y: 0 });
    expect(nudgeOf("a", false)).toBeNull();
  });
});
