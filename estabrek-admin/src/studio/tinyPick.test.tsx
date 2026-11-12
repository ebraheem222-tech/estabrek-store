import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HANDLE_OFF, SelectionHandles } from "./CanvasHandles";
import { MIN_HIT, SpatialGrid, outlineIsBox, pickAt, tinyNear, tinyPad, type Shape } from "./geometry";
import { candidateStack } from "./selectionPicking";
import { indexTree } from "./treeIndex";

afterEach(cleanup);
const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
const shape = (id: string, b: ReturnType<typeof box>, depth: number, parentId: string | null): Shape => ({ id, box: b, depth, parentId });

// A section, a card in it, a 6 px dot in the card, a big picture beside the card, and a 6 px dot in the section
// right next to the picture.
const section = shape("section", box(0, 0, 600, 400), 1, "page");
const card = shape("card", box(20, 20, 200, 200), 2, "section");
const dot = shape("dot", box(100, 100, 6, 6), 3, "card");
const picture = shape("picture", box(300, 20, 200, 200), 2, "section");
const loose = shape("loose", box(290, 100, 6, 6), 2, "section");
const all = [section, card, dot, picture, loose];

describe("picking tiny elements", () => {
  it("a small element's hit area grows to 20 px; a big one's doesn't", () => {
    expect(tinyPad(box(0, 0, 6, 6))).toBe((MIN_HIT - 6) / 2);
    expect(tinyPad(box(0, 0, 2, 40))).toBe(8); // never further than the pick threshold
    expect(tinyPad(box(0, 0, 20, 20))).toBe(0);
    expect(tinyPad(box(0, 0, 0, 0))).toBe(0);
  });

  it("a press just outside a tiny element picks it over the card it lies in; further away picks the card", () => {
    expect(pickAt(all, { x: 97, y: 103 })?.id).toBe("dot"); // 3 px left of it, on the card
    expect(pickAt(all, { x: 103, y: 111 })?.id).toBe("dot"); // 5 px below it
    expect(pickAt(all, { x: 103, y: 103 })?.id).toBe("dot"); // on it
    expect(pickAt(all, { x: 80, y: 103 })?.id).toBe("card"); // 20 px away
    expect(pickAt(all, { x: 97, y: 103 })).toMatchObject({ inside: true, nearEdge: false });
  });

  it("never over a neighbour the pointer is really on", () => {
    // 4 px right of the loose dot, but that's on the picture, which the dot doesn't lie in.
    expect(pickAt(all, { x: 300, y: 103 })?.id).toBe("picture");
    // 4 px left of it, on the section it lies in: the dot.
    expect(pickAt(all, { x: 286, y: 103 })?.id).toBe("loose");
    expect(tinyNear(all, { x: 300, y: 103 }, picture)).toBeNull();
    expect(tinyNear(all, { x: 286, y: 103 }, section)?.s.id).toBe("loose");
  });

  it("a tiny element placed over a bigger one beside it in the tree is picked just outside itself too", () => {
    const over = shape("over", box(350, 60, 6, 6), 2, "section"); // on the picture, its sibling
    expect(pickAt([...all, over], { x: 346, y: 63 })?.id).toBe("over");
    expect(pickAt([...all, over], { x: 330, y: 63 })?.id).toBe("picture");
  });

  it("the grid's nearby shapes give the same pick as all of them", () => {
    const grid = new SpatialGrid(all);
    for (const p of [{ x: 97, y: 103 }, { x: 80, y: 103 }, { x: 300, y: 103 }, { x: 286, y: 103 }, { x: 550, y: 380 }, { x: 103, y: 111 }]) expect(pickAt(grid.near(p), p)?.id).toBe(pickAt(all, p)?.id);
  });

  it("a click's candidates start with the tiny element pressed just outside itself", () => {
    const index = indexTree({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [{ id: "card", type: "stack", props: {}, children: [{ id: "dot", type: "icon", props: {} }] }, { id: "picture", type: "image", props: {} }, { id: "loose", type: "icon", props: {} }] }] } });
    const stack = (p: { x: number; y: number }, painted: string[] = []) => candidateStack(all, p, painted, index, new Map(), new Set(), true);
    expect(stack({ x: 97, y: 103 }, ["card", "section"])).toEqual(["dot", "card", "section"]);
    expect(stack({ x: 80, y: 103 }, ["card", "section"])).toEqual(["card", "section"]);
    expect(stack({ x: 300, y: 103 })[0]).toBe("picture");
  });

  it("an outline is just its box unless it's turned or skewed", () => {
    const b = box(10, 10, 100, 50);
    expect(outlineIsBox(undefined, b)).toBe(true);
    expect(outlineIsBox([{ x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 60 }, { x: 10, y: 60 }], b)).toBe(true);
    expect(outlineIsBox([{ x: 30, y: 10 }, { x: 110, y: 25 }, { x: 90, y: 60 }, { x: 10, y: 45 }], b)).toBe(false);
  });
});

describe("handles on a small element", () => {
  const props = (b: ReturnType<typeof box>) => ({
    box: b, zoom: 1, sides: "all" as const, turn: null,
    local: (e: { clientX: number; clientY: number }) => ({ x: e.clientX, y: e.clientY }),
    onSize: vi.fn(), onSizeLive: vi.fn(), onCancel: vi.fn(), onReset: vi.fn(), onTurnLive: vi.fn(), onTurn: vi.fn(),
  });
  const at = (name: string) => { const el = screen.getAllByTestId("studio-handle").find((h) => h.dataset.handle === name)!; return { x: parseFloat(el.style.left), y: parseFloat(el.style.top), off: el.dataset.off }; };

  it("stand off it, and the ones in the middle of its short sides go: its middle stays free", () => {
    render(<SelectionHandles {...props(box(100, 100, 8, 8))} />);
    expect(screen.getAllByTestId("studio-handle").map((h) => h.dataset.handle).sort()).toEqual(["ne", "nw", "se", "sw"]);
    const nw = at("nw"), se = at("se");
    expect(nw.off).toBe("1");
    // Each corner's handle is HANDLE_OFF px further out along its diagonal.
    expect(Math.hypot(nw.x - 100, nw.y - 100)).toBeCloseTo(HANDLE_OFF, 1);
    expect(nw.x).toBeLessThan(100);
    expect(se.x).toBeGreaterThan(108);
    expect(se.y).toBeGreaterThan(108);
  });

  it("a long thin one keeps the handles on its long sides' ends; a normal one is as before", () => {
    render(<SelectionHandles {...props(box(100, 100, 200, 10))} />);
    expect(screen.getAllByTestId("studio-handle").map((h) => h.dataset.handle).sort()).toEqual(["n", "ne", "nw", "s", "se", "sw"]);
    cleanup();
    render(<SelectionHandles {...props(box(100, 100, 200, 100))} />);
    expect(screen.getAllByTestId("studio-handle")).toHaveLength(8);
    expect(at("nw")).toMatchObject({ x: 100, y: 100, off: undefined });
  });
});
