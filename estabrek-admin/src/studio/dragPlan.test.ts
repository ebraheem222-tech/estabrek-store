import { describe, expect, it } from "vitest";
import { DRAG_DEFAULTS, around, moveAllOps, placedBox, readDragPrefs, saveDragPrefs, startFreeDrag, stepFreeDrag, type Beside, type DragPrefs } from "./dragPlan";
import { boxBody } from "./space";

const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
const beside = (id: string, b: ReturnType<typeof box>, push = false): Beside => ({ id, box: b, body: boxBody(b), push });
const holder = box(0, 0, 600, 400);
const prefs = (over: Partial<DragPrefs> = {}): DragPrefs => ({ ...DRAG_DEFAULTS, gaps: false, ...over });
const keys = { straight: false, loose: false };

describe("what a drag on the canvas does", () => {
  it("keeps its settings in this browser, and falls back on odd ones", () => {
    localStorage.removeItem("studio-drag");
    expect(readDragPrefs()).toEqual(DRAG_DEFAULTS);
    saveDragPrefs({ mode: "push", inside: false, grid: 8, gaps: false });
    expect(readDragPrefs()).toEqual({ mode: "push", inside: false, grid: 8, gaps: false });
    localStorage.setItem("studio-drag", JSON.stringify({ mode: "fly", grid: 7, inside: "yes" }));
    expect(readDragPrefs()).toEqual(DRAG_DEFAULTS);
    localStorage.setItem("studio-drag", "{");
    expect(readDragPrefs()).toEqual(DRAG_DEFAULTS);
  });

  it("snaps to the holder's edges, keeps Shift's line, and lets go with Ctrl", () => {
    const start = box(100, 100, 50, 50);
    const drag = () => startFreeDrag(["a"], start, boxBody(start), holder, []);
    // 4px from the holder's middle: pulled onto it.
    const mid = stepFreeDrag(drag(), { x: 171, y: 0 }, keys, prefs());
    expect(mid.box.x).toBe(275);
    expect(mid.guides).toHaveLength(1);
    expect(stepFreeDrag(drag(), { x: 171, y: 0 }, { straight: false, loose: true }, prefs()).box.x).toBe(271);
    // Shift: straight across, even when a snap down was near.
    const line = stepFreeDrag(drag(), { x: 60, y: 9 }, { straight: true, loose: false }, prefs());
    expect(line.box.y).toBe(100);
    // A grid where nothing else snapped.
    const g = stepFreeDrag(drag(), { x: 13, y: 33 }, keys, prefs({ grid: 8 }));
    expect([g.box.x, g.box.y]).toEqual([112, 136]);
  });

  it("matches the gaps beside it", () => {
    const start = box(400, 300, 50, 50);
    const row = [beside("a", box(0, 0, 50, 50)), beside("b", box(70, 0, 50, 50)), beside("c", box(140, 0, 50, 50))];
    const s = stepFreeDrag(startFreeDrag(["d"], start, boxBody(start), holder, row), { x: -187, y: -300 }, keys, prefs({ gaps: true }));
    expect(s.box.x).toBe(210);
    expect(s.marks.length).toBeGreaterThan(0);
  });

  it("stops at what it meets, pushes what's free, and stays inside its holder", () => {
    const start = box(0, 0, 50, 50);
    const wall = [beside("w", box(100, 0, 20, 50))];
    const blocked = stepFreeDrag(startFreeDrag(["a"], start, boxBody(start), holder, wall), { x: 90, y: 0 }, keys, prefs({ mode: "block" }));
    expect(Math.round(blocked.box.x)).toBe(50);
    expect(blocked.touching).toEqual(["w"]);
    const pushed = stepFreeDrag(startFreeDrag(["a"], start, boxBody(start), holder, [beside("w", box(100, 0, 20, 50), true)]), { x: 90, y: 0 }, { straight: false, loose: true }, prefs({ mode: "push" }));
    expect(Math.round(pushed.box.x)).toBe(90);
    expect(Math.round(pushed.pushed.get("w")!.x)).toBe(40);
    // Inside: at the holder's edge, however far the pointer goes.
    const edge = stepFreeDrag(startFreeDrag(["a"], start, boxBody(start), holder, []), { x: 900, y: -40 }, keys, prefs());
    expect([edge.box.x, edge.box.y]).toEqual([550, 0]);
    expect(stepFreeDrag(startFreeDrag(["a"], start, boxBody(start), holder, []), { x: 900, y: 0 }, keys, prefs({ inside: false })).box.x).toBe(900);
    // What it starts over doesn't stop it.
    const under = stepFreeDrag(startFreeDrag(["a"], start, boxBody(start), holder, [beside("u", box(10, 10, 20, 20))]), { x: 200, y: 0 }, keys, prefs({ mode: "block" }));
    expect(under.box.x).toBe(200);
  });

  it("places by the element's own box: its middle less its move, its size before the turn", () => {
    expect(placedBox(box(90, 40, 120, 120), { x: 10, y: -20 }, { w: 100, h: 50 })).toEqual(box(90, 95, 100, 50));
    expect(placedBox(box(0, 0, 10, 10), { x: 0, y: 0 })).toEqual(box(0, 0, 10, 10));
    expect(around([box(0, 0, 10, 10), box(20, 5, 10, 20)])).toEqual(box(0, 0, 30, 25));
  });

  it("puts several elements one after another at a place", () => {
    const tree: Record<string, string[]> = { s: ["a", "b", "c", "d"], t: ["x", "y"] };
    const parentOf = (id: string) => Object.keys(tree).find((p) => tree[p].includes(id)) ?? null;
    const kids = (p: string) => tree[p];
    // a and c after d: among b, d that's index 2.
    expect(moveAllOps(kids, parentOf, ["a", "c"], { parentId: "s", index: 2 })).toEqual([
      { op: "move", nodeId: "a", parentId: "s", index: 3 },
      { op: "move", nodeId: "c", parentId: "s", index: 3 },
    ]);
    // Into another holder, between x and y.
    expect(moveAllOps(kids, parentOf, ["b", "d"], { parentId: "t", index: 1 })).toEqual([
      { op: "move", nodeId: "b", parentId: "t", index: 1 },
      { op: "move", nodeId: "d", parentId: "t", index: 2 },
    ]);
    // Where they already are: nothing.
    expect(moveAllOps(kids, parentOf, ["b", "c"], { parentId: "s", index: 1 })).toEqual([]);
  });
});
