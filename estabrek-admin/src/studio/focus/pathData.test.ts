import { expect, test } from "vitest";
import { fitPath, handlesOf, invert, apply, moveHandle, parsePath, pathBox, shapePath, transformPath, writePath, type Matrix } from "./pathData";

test("any path is read as absolute moves, lines and curves, and written back", () => {
  const segs = parsePath("m10 10 h20 v20 l-20 0 z");
  expect(writePath(segs)).toBe("M10 10 L30 10 L30 30 L10 30 Z");
  // Smooth curves take the mirrored handle; quadratic ones too.
  expect(writePath(parsePath("M0 0 C0 10 10 10 10 0 S20 -10 20 0"))).toBe("M0 0 C0 10 10 10 10 0 C10 -10 20 -10 20 0");
  expect(writePath(parsePath("M0 0 Q5 10 10 0 T20 0"))).toBe("M0 0 Q5 10 10 0 Q15 -10 20 0");
  // Numbers glued together, and implicit lines after a move.
  expect(writePath(parsePath("M0,0 10,0 10-10"))).toBe("M0 0 L10 0 L10 -10");
});

test("arcs become cubic curves that pass through the same points (flags written without spaces too)", () => {
  const segs = parsePath("M0 50 A50 50 0 1 0 100 50 a50 50 0 110-1");
  expect(segs.every((s) => s.c === "M" || s.c === "C")).toBe(true);
  const box = pathBox(segs)!;
  expect(box.x).toBeCloseTo(0, 0);
  expect(box.w).toBeCloseTo(100, 0);
  expect(box.h).toBeCloseTo(100, 0);
});

test("shapes turn into paths with the same box", () => {
  for (const [n, want] of [
    [{ t: "circle", a: { cx: "50", cy: "50", r: "40" } }, { x: 10, y: 10, w: 80, h: 80 }],
    [{ t: "rect", a: { x: "5", y: "5", width: "30", height: "20", rx: "4" } }, { x: 5, y: 5, w: 30, h: 20 }],
    [{ t: "polygon", a: { points: "0,0 10,0 5,8" } }, { x: 0, y: 0, w: 10, h: 8 }],
  ] as const) {
    const d = shapePath(n as any)!;
    const b = pathBox(parsePath(d))!;
    expect(b.x).toBeCloseTo(want.x, 0);
    expect(b.w).toBeCloseTo(want.w, 0);
    expect(b.h).toBeCloseTo(want.h, 0);
  }
  expect(shapePath({ t: "g", a: {} })).toBeNull();
});

test("a morph's target is fitted onto the part's box, keeping its proportions, centred", () => {
  const d = fitPath("M0 0 L10 0 L10 20 L0 20 Z", { x: 100, y: 100, w: 40, h: 40 })!;
  const b = pathBox(parsePath(d))!;
  expect(b).toMatchObject({ x: 110, y: 100, w: 20, h: 40 });
  const stretched = pathBox(parsePath(fitPath("M0 0 L10 0 L10 20 Z", { x: 0, y: 0, w: 40, h: 40 }, false)!))!;
  expect(stretched.w).toBeCloseTo(40);
  expect(stretched.h).toBeCloseTo(40);
});

test("a moved anchor takes its handles; a moved handle moves alone; matrices go both ways", () => {
  const segs = parsePath("M0 0 C0 10 10 10 10 0 C10 -10 20 -10 20 0");
  const handles = handlesOf(segs);
  expect(handles.filter((h) => h.k === "p")).toHaveLength(3);
  const moved = moveHandle(segs, { i: 1, k: "p" }, { x: 12, y: 2 });
  expect(writePath(moved)).toBe("M0 0 C0 10 12 12 12 2 C12 -8 20 -10 20 0");
  expect(writePath(moveHandle(segs, { i: 1, k: "c1" }, { x: 1, y: 1 }))).toBe("M0 0 C1 1 10 10 10 0 C10 -10 20 -10 20 0");
  const m: Matrix = [2, 0, 0, 2, 5, 7];
  expect(writePath(transformPath(parsePath("M1 1 L2 2"), m))).toBe("M7 9 L9 11");
  const back = apply(invert(m)!, apply(m, { x: 3, y: 4 }));
  expect(back.x).toBeCloseTo(3);
  expect(back.y).toBeCloseTo(4);
});
