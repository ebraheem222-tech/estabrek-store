import { expect, test } from "vitest";
import type { PageTree, PageTreeNode } from "../api/pages.api";
import { BOUND_KINDS, partBounds } from "./canvasBounds";
import type { Box, Shape } from "./geometry";
import { indexTree } from "./treeIndex";

const node = (id: string, type: string, children?: PageTreeNode[]): PageTreeNode => ({ id, type, props: {}, ...(children ? { children } : {}) });
const tree: PageTree = { version: 1, root: node("page", "page", [
  node("hero", "section", [node("title", "heading"), node("row", "stack", [node("pic", "image"), node("cta", "button")])]),
  node("grid-sec", "section", [node("cards", "grid", [node("cell-a", "cell", [node("a-text", "text")])])]),
]) };
const index = indexTree(tree);
const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const shape = (id: string, b: Box): Shape => ({ id, box: b, parentId: index.nodes.get(id)?.parentId ?? null } as Shape);
const frame = box(0, 0, 1000, 600);

const shapes: Shape[] = [
  shape("page", box(0, 0, 1000, 2000)),
  shape("hero", box(0, 0, 1000, 400)),
  shape("title", box(40, 40, 400, 60)),
  shape("row", box(40, 140, 600, 200)),
  shape("pic", box(40, 140, 200, 200)),
  shape("cta", box(260, 200, 120, 40)),
  shape("grid-sec", box(0, 400, 1000, 500)),
  shape("cards", box(40, 440, 920, 400)),
  shape("cell-a", box(40, 440, 60, 20)),
  shape("a-text", box(44, 444, 50, 12)),
];

test("only the parts that hold others are outlined, the page itself is not, the outer ones first", () => {
  const bounds = partBounds(index, shapes, frame);
  expect(bounds.map((b) => b.id)).toEqual(["hero", "grid-sec", "row", "cards", "cell-a"]);
  expect(bounds.filter((b) => b.section).map((b) => b.id)).toEqual(["hero", "grid-sec"]);
  for (const kind of ["heading", "image", "button", "text", "page"]) expect(BOUND_KINDS.has(kind)).toBe(false);
});

test("a part is outlined where it shows in the frame, and carries its name only when it is big enough", () => {
  const by = Object.fromEntries(partBounds(index, shapes, frame).map((b) => [b.id, b]));
  // The second section goes on below the frame: its box stops at the frame's edge.
  expect(by["grid-sec"].box).toEqual(box(0, 400, 1000, 200));
  expect(by.cards.box).toEqual(box(40, 440, 920, 160));
  expect(by.hero.named).toBe(true);
  // A small cell is outlined without a name over it.
  expect(by["cell-a"].named).toBe(false);
});

test("what is out of the frame is left out, and so is anything past the limit", () => {
  const scrolled = box(0, 1200, 1000, 600);
  expect(partBounds(index, shapes, scrolled)).toEqual([]);
  expect(partBounds(index, shapes, frame, 2).map((b) => b.id)).toEqual(["hero", "grid-sec"]);
  // A shape of something no longer in the page is ignored.
  expect(partBounds(index, [shape("gone", box(0, 0, 100, 100))], frame)).toEqual([]);
});

test("names at the same corner sit one under the other, and one with no room left goes without", () => {
  const same: Shape[] = [
    shape("hero", box(0, 0, 1000, 400)),
    shape("row", box(2, 3, 600, 200)),
    shape("grid-sec", box(0, 400, 1000, 200)),
    shape("cards", box(0, 400, 920, 30)),
  ];
  const by = Object.fromEntries(partBounds(index, same, frame).map((b) => [b.id, b]));
  expect([by.hero.row, by.row.row]).toEqual([0, 1]);
  expect(by.row.named).toBe(true);
  expect(by["grid-sec"].row).toBe(0);
  // A second name needs 32 pixels of height; this part shows 30.
  expect(by.cards.named).toBe(false);
});
