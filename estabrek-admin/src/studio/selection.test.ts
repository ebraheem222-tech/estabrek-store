import { beforeEach, describe, expect, it } from "vitest";
import type { PageTree, PageTreeNode } from "../api/pages.api";
import { idMaker } from "./columns";
import type { Shape } from "./geometry";
import { alignOps, boxOf, clipboardLook, clipboardNodes, copyLook, copyNodes, distributeOps, groupOps, inBox, inTreeOrder, pasteLookOps, pasteOps, ungroupOps } from "./selection";
import { indexTree } from "./treeIndex";

const text = (id: string, style?: PageTreeNode["style"]): PageTreeNode => ({ id, type: "text", props: { text: { ar: id } }, ...(style ? { style } : {}) });
const tree = (): PageTree => ({
  version: 1,
  root: {
    id: "page", type: "page", props: {},
    children: [
      { id: "s1", type: "section", props: {}, children: [{ id: "st", type: "stack", props: {}, children: [text("a"), text("b"), text("c")] }] },
      { id: "s2", type: "section", props: {}, children: [text("d")] },
    ],
  },
});
const shape = (id: string, x: number, y: number, w: number, h: number, depth = 3, parentId: string | null = null): Shape => ({ id, box: { x, y, w, h }, depth, parentId });
const ids = () => idMaker(() => false);

describe("several elements at once", () => {
  it("a dragged box picks the outermost elements it holds whole", () => {
    const index = indexTree(tree());
    const shapes = [shape("page", 0, 0, 1000, 2000, 0), shape("s1", 0, 0, 1000, 400, 1), shape("st", 100, 50, 300, 300, 2), shape("a", 100, 50, 300, 90), shape("b", 100, 150, 300, 90), shape("c", 100, 250, 300, 90), shape("s2", 0, 400, 1000, 300, 1), shape("d", 100, 450, 300, 90)];
    expect(inBox(boxOf({ x: 90, y: 140 }, { x: 420, y: 345 }), shapes, index)).toEqual(["b", "c"]);
    // The whole stack inside: the stack, not what's in it.
    expect(inBox(boxOf({ x: 420, y: 360 }, { x: 90, y: 40 }), shapes, index)).toEqual(["st"]);
    // A locked one is left out.
    expect(inBox({ x: 90, y: 140, w: 330, h: 205 }, shapes, index, (id) => id === "c")).toEqual(["b"]);
    expect(inTreeOrder(index, ["d", "a", "c"])).toEqual(["a", "c", "d"]);
  });

  it("grouping wraps siblings in a stack where the first was; ungrouping puts them back", () => {
    const index = indexTree(tree());
    const g = groupOps(index, ["c", "b"], ids());
    expect(g?.ops[0]).toMatchObject({ op: "insert", parentId: "st", index: 1, node: { type: "stack", children: [] } });
    expect(g?.ops.slice(1)).toEqual([{ op: "move", nodeId: "b", parentId: g!.group, index: 0 }, { op: "move", nodeId: "c", parentId: g!.group, index: 1 }]);
    // Not siblings: no group.
    expect(groupOps(index, ["a", "d"], ids())).toBeNull();
    expect(ungroupOps(index, "st")).toEqual([
      { op: "move", nodeId: "a", parentId: "s1", index: 1 },
      { op: "move", nodeId: "b", parentId: "s1", index: 2 },
      { op: "move", nodeId: "c", parentId: "s1", index: 3 },
      { op: "remove", nodeId: "st" },
    ]);
    expect(ungroupOps(index, "a")).toBeNull();
  });

  it("freely placed elements line up and space out evenly, each over its own container", () => {
    const holder = { x: 0, y: 0, w: 1000, h: 1000 };
    const placed = (id: string, x: number) => text(id, { base: { layer: { x, y: 50, anchor: "top-start" } } });
    const items = [
      { node: placed("a", 10), box: { x: 100, y: 500, w: 100, h: 50 }, holder },
      { node: placed("b", 30), box: { x: 300, y: 520, w: 100, h: 50 }, holder },
      { node: placed("c", 60), box: { x: 600, y: 480, w: 200, h: 50 }, holder },
    ];
    // Left-to-right page: start = the left edge (10%).
    const start = alignOps(items, "start", "base", false);
    expect(start.map((o: any) => o.style.layer.x)).toEqual([10, 10]);
    expect(start.map((o: any) => o.nodeId)).toEqual(["b", "c"]);
    // Top: every top at the highest one's (48%).
    expect(alignOps(items, "top", "base", false).map((o: any) => o.style.layer.y)).toEqual([48, 48, 48]);
    // Evenly across: the middle one between the first's end (200) and the last's start (600): 350.
    const spread = distributeOps(items, true, "base", false);
    expect(spread).toHaveLength(1);
    expect((spread[0] as any).style.layer.x).toBe(35);
    // Elements in the flow have no place to change.
    expect(alignOps([{ node: text("x"), box: items[0].box, holder }, { node: text("y"), box: items[1].box, holder }], "start", "base", false)).toEqual([]);
  });
});

describe("the clipboard", () => {
  beforeEach(() => localStorage.clear());

  it("copied elements paste after the selection with new ids, inside a holder, or in a section of their own", () => {
    const index = indexTree(tree());
    copyNodes([text("a"), text("b")]);
    expect(clipboardNodes().map((n) => n.id)).toEqual(["a", "b"]);
    const after = pasteOps(index, "d", clipboardNodes(), ids())!;
    expect(after.ops.map((o: any) => [o.parentId, o.index])).toEqual([["s2", 1], ["s2", 2]]);
    expect(after.ops.every((o: any) => !["a", "b"].includes(o.node.id))).toBe(true);
    // A holder selected: inside it, at its end.
    expect(pasteOps(index, "st", clipboardNodes(), ids())!.ops.map((o: any) => [o.parentId, o.index])).toEqual([["st", 3], ["st", 4]]);
    // Nothing selected: at the end of the page, each in a section.
    const end = pasteOps(index, null, clipboardNodes(), ids())!;
    expect(end.ops.map((o: any) => [o.parentId, o.index, o.node.type, o.node.children?.[0]?.type])).toEqual([["page", 2, "section", "text"], ["page", 3, "section", "text"]]);
  });

  it("a copied look replaces each screen's look and brings its motion", () => {
    copyLook(text("a", { base: { color: "accent", hover: { scale: 1.05 } }, mobile: { size: 14 } }));
    const ops = pasteLookOps(text("b", { tablet: { size: 30 } }), clipboardLook()!);
    expect(ops).toEqual([
      { op: "setStyle", nodeId: "b", screen: "base", style: { color: "accent", hover: { scale: 1.05 } } },
      { op: "setStyle", nodeId: "b", screen: "tablet", style: null },
      { op: "setStyle", nodeId: "b", screen: "mobile", style: { size: 14 } },
    ]);
  });
});
