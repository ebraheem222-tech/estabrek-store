import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../api/pages.api";
import { pickCanvasContainer } from "./canvasContainers";
import { SpatialGrid, type Box, type Shape } from "./geometry";
import { indexTree, type TreeIndex } from "./treeIndex";

const node = (id: string, type: string, children?: PageTreeNode[]): PageTreeNode => ({ id, type, props: {}, ...(children ? { children } : {}) });
const tree = (...children: PageTreeNode[]) => indexTree({ version: 1, root: node("page", "page", children) });
const shape = (index: TreeIndex, id: string, box: Box): Shape => ({ id, box, depth: index.nodes.get(id)!.depth, parentId: index.nodes.get(id)!.parentId });
const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

function nested() {
  const index = tree(node("section", "section", [node("holder", "stack", [
    node("moving", "text"),
    node("inner", "grid", [node("deepest", "stack", [node("label", "text")])]),
    node("sibling", "stack"),
  ])]));
  const shapes = [
    shape(index, "section", box(0, 0, 600, 500)),
    shape(index, "holder", box(20, 20, 400, 400)),
    shape(index, "moving", box(30, 30, 80, 30)),
    shape(index, "inner", box(100, 100, 200, 200)),
    shape(index, "deepest", box(120, 120, 120, 120)),
    shape(index, "label", box(130, 130, 80, 30)),
    shape(index, "sibling", box(320, 100, 80, 200)),
  ];
  return { index, shapes };
}

describe("canvas drop containers", () => {
  it("checks a reached ancestor's actual polygon rather than its AABB", () => {
    const index = tree(node("source", "section", [node("moving", "text")]), node("target", "stack", [node("label", "text")]));
    const target: Shape = { ...shape(index, "target", box(0, 0, 100, 100)), outline: [{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }] };
    const label = shape(index, "label", box(0, 0, 10, 10));
    expect(pickCanvasContainer(index, [target, label], { x: 5, y: 5 }, ["moving"], "source")).toBeNull();
  });
  it("nests inside the deepest eligible container while still inside the original holder", () => {
    const { index, shapes } = nested();
    const point = { x: 150, y: 140 };
    const candidates = new SpatialGrid(shapes).near(point);
    expect(pickCanvasContainer(index, candidates, point, ["moving"], "holder")).toBe("deepest");
  });

  it("moves between nested siblings", () => {
    const { index, shapes } = nested();
    expect(pickCanvasContainer(index, shapes, { x: 350, y: 150 }, ["deepest"], "inner")).toBe("sibling");
  });

  it("keeps an ordinary move in the current parent's empty area", () => {
    const { index, shapes } = nested();
    expect(pickCanvasContainer(index, shapes, { x: 80, y: 350 }, ["moving"], "holder")).toBeNull();
  });

  it("lifts into a measured ancestor after leaving the current parent", () => {
    const { index, shapes } = nested();
    expect(pickCanvasContainer(index, shapes, { x: 450, y: 150 }, ["moving"], "holder")).toBe("section");
  });

  it("ignores the dragged subtree so its own descendants cannot hide another target", () => {
    const index = tree(node("section", "section", [
      node("moving", "stack", [node("own-child", "stack")]), node("target", "stack"),
    ]));
    const shapes = ["section", "moving", "own-child", "target"].map((id) => shape(index, id, box(0, 0, 100, 100)));
    expect(pickCanvasContainer(index, shapes, { x: 50, y: 50 }, ["moving"], "section")).toBe("target");
    expect(pickCanvasContainer(index, shapes.filter((s) => s.id !== "target"), { x: 50, y: 50 }, ["moving"], "section")).toBeNull();
  });

  it("skips targets locked directly or through an ancestor", () => {
    const { index, shapes } = nested();
    expect(pickCanvasContainer(index, shapes, { x: 150, y: 140 }, ["moving"], "holder", new Set(["deepest"]))).toBe("inner");
    expect(pickCanvasContainer(index, shapes, { x: 150, y: 140 }, ["moving"], "holder", new Set(["inner"]))).toBeNull();
  });

  it("rejects a move that would put any dragged descendant past depth twelve", () => {
    let branch = node("target11", "stack");
    for (let depth = 10; depth >= 2; depth--) branch = node(`target${depth}`, "stack", [branch]);
    const index = tree(node("section", "section", [node("moving", "stack", [node("leaf", "text")]), branch]));
    const shapes = [shape(index, "target11", box(20, 20, 100, 100)), shape(index, "target10", box(0, 0, 200, 200))];
    expect(pickCanvasContainer(index, shapes, { x: 50, y: 50 }, ["moving"], "section")).toBe("target10");
    expect(pickCanvasContainer(index, shapes.slice(0, 1), { x: 50, y: 50 }, ["moving"], "section")).toBeNull();
  });

  it("can place a leaf at depth twelve", () => {
    let branch = node("target11", "stack");
    for (let depth = 10; depth >= 2; depth--) branch = node(`target${depth}`, "stack", [branch]);
    const index = tree(node("section", "section", [node("moving", "text"), branch]));
    expect(pickCanvasContainer(index, [shape(index, "target11", box(0, 0, 100, 100))], { x: 50, y: 50 }, ["moving"], "section")).toBe("target11");
  });

  it("walks measured bridge descendants to their native legacy container", () => {
    const index = tree(node("legacy", "legacy"), node("section", "section", [node("moving", "text")]));
    const shapes = [
      shape(index, "legacy", box(0, 0, 400, 400)),
      { id: "slot", parentId: "legacy", depth: 2, box: box(20, 20, 100, 50) },
    ];
    expect(pickCanvasContainer(index, shapes, { x: 50, y: 50 }, ["moving"], "section")).toBe("legacy");
  });

  it("rejects missing or empty drag selections", () => {
    const { index, shapes } = nested();
    expect(pickCanvasContainer(index, shapes, { x: 150, y: 140 }, [], "holder")).toBeNull();
    expect(pickCanvasContainer(index, shapes, { x: 150, y: 140 }, ["missing"], "holder")).toBeNull();
  });

  it("does not use a nearby box or an off-pointer ancestor as a target", () => {
    const { index } = nested();
    const shapes = [
      shape(index, "section", box(0, 0, 100, 100)),
      shape(index, "inner", box(20, 20, 60, 60)),
      shape(index, "label", box(200, 200, 50, 50)),
    ];
    expect(pickCanvasContainer(index, shapes, { x: 103, y: 50 }, ["moving"], "holder")).toBeNull();
    expect(pickCanvasContainer(index, shapes, { x: 220, y: 220 }, ["moving"], "holder")).toBeNull();
  });

  it.each(["section", "cell", "stack", "grid", "popup", "legacy"])("accepts a text overlay inside a %s", (type) => {
    const index = tree(node("source", "section", [node("moving", "text")]), node("target", type));
    expect(pickCanvasContainer(index, [shape(index, "target", box(0, 0, 100, 100))], { x: 50, y: 50 }, ["moving"], "source")).toBe("target");
  });

  it.each(["deck", "columns"])("does not free-position a schema-compatible panel directly inside %s", (type) => {
    const movingType = type === "deck" ? "stack" : "cell";
    const index = tree(node("source", "section", [node("moving", movingType)]), node("target", type));
    expect(pickCanvasContainer(index, [shape(index, "target", box(0, 0, 100, 100))], { x: 50, y: 50 }, ["moving"], "source")).toBeNull();
  });

  it("requires a target to accept every dragged node", () => {
    const index = tree(node("source", "section", [node("text", "text"), node("stack", "stack")]), node("target", "legacy"));
    expect(pickCanvasContainer(index, [shape(index, "target", box(0, 0, 100, 100))], { x: 50, y: 50 }, ["text", "stack"], "source")).toBeNull();
  });

  it("falls back when nesting the moved columns would exceed the columns limit", () => {
    const index = tree(node("source", "section", [node("moving", "columns", [node("moving-cell", "cell")])]), node("section", "section", [
      node("columns1", "columns", [node("cell1", "cell", [node("columns2", "columns", [node("cell2", "cell")])])]),
    ]));
    const shapes = [shape(index, "cell1", box(0, 0, 200, 200)), shape(index, "cell2", box(20, 20, 100, 100))];
    expect(pickCanvasContainer(index, shapes, { x: 50, y: 50 }, ["moving"], "source")).toBe("cell1");
  });

  it("does not treat unmeasured ancestors as containing a hit child", () => {
    const { index, shapes } = nested();
    expect(pickCanvasContainer(index, shapes.filter((s) => s.id === "label"), { x: 150, y: 140 }, ["moving"], "holder")).toBeNull();
  });

  it("does not select a collapsed ancestor reached through an overflowing child", () => {
    const { index, shapes } = nested();
    const candidates = [shapes.find((s) => s.id === "label")!, shape(index, "inner", box(150, 100, 0, 200))];
    expect(pickCanvasContainer(index, candidates, { x: 150, y: 140 }, ["moving"], "holder")).toBeNull();
  });
});
