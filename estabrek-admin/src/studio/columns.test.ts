import { describe, expect, it } from "vitest";
import type { PageDraft, PageTreeNode } from "../api/pages.api";
import { ADDABLE, MAX_SLIDES, PRESETS, accepts, addSlides, canHold, changeSlide, copyOf, dragLine, dropCellOps, idMaker, layoutOps, moveSlide, newColumns, newElement, newSection, reduceWidths, sameWidths, shownWidths, slidesOf, styleOp, twelfths, type Slide } from "./columns";
import { locate, simulate, undoOf } from "./draft";
import { indexTree } from "./treeIndex";

const text = (id: string): PageTreeNode => ({ id, type: "text", props: { text: { ar: id } } });
const cell = (id: string, children: PageTreeNode[] = []): PageTreeNode => ({ id, type: "cell", props: {}, children });
const page = (cols: PageTreeNode): PageDraft => ({
  version: 1, rev: 1, baseHash: "", startedAt: "", updatedAt: "", trash: [], sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children: [cols] }] } },
});
const three = (): PageTreeNode => ({
  id: "cols", type: "columns", props: {}, style: { base: { widths: [1, 1, 1], gap: 24 }, tablet: { widths: [2, 1, 1] } },
  children: [cell("c1", [text("a")]), cell("c2", [text("b")]), cell("c3", [text("x"), text("y")])],
});
const ids = (d: PageDraft) => idMaker((id) => Boolean(locate(d.tree, id)));
const cellsOf = (d: PageDraft) => (locate(d.tree, "cols")!.node.children ?? []).map((c) => c.children!.map((x) => x.id));
const run = (d: PageDraft, ops: Parameters<typeof undoOf>[0]) => ops.reduce(simulate, d);
const layoutOpsFree = (d: PageDraft, i: number) => dropCellOps(locate(d.tree, "cols")!.node, i);

describe("columns in the editor", () => {
  it("shares: reduced, compared, and as twelfths (measured widths too)", () => {
    expect(reduceWidths([4, 8])).toEqual([1, 2]);
    expect(sameWidths([2, 4], [1, 2])).toBe(true);
    expect(sameWidths([1, 2], [2, 1])).toBe(false);
    expect(twelfths([1, 2])).toEqual([4, 8]);
    expect(twelfths([1, 2, 1])).toEqual([3, 6, 3]);
    expect(twelfths([300, 612])).toEqual([4, 8]);
    expect(twelfths([1, 1, 1, 1, 1].slice(0, 4))).toEqual([3, 3, 3, 3]);
    expect(twelfths([3, 3, 5]).reduce((a, b) => a + b)).toBe(12);
    expect(PRESETS.every((p) => p.widths.length >= 2 && p.widths.length <= 4)).toBe(true);
  });

  it("dragging the line between two cells moves only those two, a twelfth at a time", () => {
    expect(dragLine([4, 8], 0, 0.5)).toEqual([6, 6]);
    expect(dragLine([4, 4, 4], 1, 0.74)).toEqual([4, 6, 2]);
    expect(dragLine([6, 6], 0, 0.01)).toEqual([1, 11]);
    expect(dragLine([6, 6], 0, 1.5)).toEqual([11, 1]);
  });

  it("fewer cells: what the gone cells held moves to the last one that stays, and undo puts it all back", () => {
    const d = page(three());
    const ops = layoutOps(locate(d.tree, "cols")!.node, [1, 2], ids(d));
    const after = run(d, ops);
    expect(cellsOf(after)).toEqual([["a"], ["b", "x", "y"]]);
    expect(locate(after.tree, "cols")!.node.style).toEqual({ base: { widths: [1, 2], gap: 24 } });
    const back = run(after, undoOf(ops, d, "ar"));
    expect(back.tree).toEqual(d.tree);
  });

  it("more cells: new empty ones at the end, the tablet's own split kept when it still fits", () => {
    const two: PageTreeNode = { id: "cols", type: "columns", props: {}, style: { mobile: { widths: [1, 1] } }, children: [cell("c1", [text("a")]), cell("c2")] };
    const d = page(two);
    const ops = layoutOps(two, [1, 2, 1], ids(d));
    const after = run(d, ops);
    expect(cellsOf(after)).toEqual([["a"], [], []]);
    expect(locate(after.tree, "cols")!.node.style).toEqual({ base: { widths: [1, 2, 1] } });
    expect(run(after, undoOf(ops, d, "ar")).tree).toEqual(d.tree);
    // The split each screen shows.
    expect(shownWidths(three(), "tablet")).toEqual([2, 1, 1]);
    expect(shownWidths(three(), "mobile")).toEqual([1, 1, 1]);
    expect(shownWidths(two, "base")).toEqual([1, 1]);
  });

  it("taking one cell out hands what it held to its neighbour and drops its share", () => {
    const d = page(three());
    const first = layoutOpsFree(d, 0);
    expect(cellsOf(run(d, first))).toEqual([["a", "b"], ["x", "y"]]);
    const middle = dropCellOps(locate(d.tree, "cols")!.node, 1);
    const after = run(d, middle);
    expect(cellsOf(after)).toEqual([["a", "b"], ["x", "y"]]);
    expect(locate(after.tree, "cols")!.node.style).toEqual({ base: { widths: [1, 1], gap: 24 }, tablet: { widths: [2, 1] } });
    expect(run(after, undoOf(middle, d, "ar")).tree).toEqual(d.tree);
    expect(dropCellOps({ id: "one", type: "columns", props: {}, children: [cell("only")] }, 0)).toEqual([]);
  });

  it("a look changes on one screen only; empty drops it", () => {
    const n = three();
    expect(styleOp(n, "base", { gap: 40, align: "center" })).toEqual({ op: "setStyle", nodeId: "cols", screen: "base", style: { widths: [1, 1, 1], gap: 40, align: "center" } });
    expect(styleOp(n, "tablet", { widths: null })).toEqual({ op: "setStyle", nodeId: "cols", screen: "tablet", style: null });
  });

  it("new elements, sections and copies get fresh ids", () => {
    const d = page(three());
    const id = ids(d);
    const sec = newSection([1, 2], id);
    expect(sec).toMatchObject({ type: "section", props: { contained: true }, children: [{ type: "columns", style: { base: { widths: [1, 2] } } }] });
    expect(sec.children![0].children!.map((c) => c.type)).toEqual(["cell", "cell"]);
    expect(newElement("button", "en", id).props).toEqual({ label: { en: "More" }, href: "/shop", variant: "solid" });
    expect(newElement("video", "ar", id, "https://x.test/a.mp4").props).toEqual({ src: "https://x.test/a.mp4", controls: true });
    const copy = copyOf(three(), id);
    const all = (n: PageTreeNode): string[] => [n.id, ...(n.children ?? []).flatMap(all)];
    expect(all(copy).some((x) => all(three()).includes(x))).toBe(false);
    expect(new Set([...all(copy), ...all(sec)]).size).toBe(all(copy).length + all(sec).length);
    expect(newColumns([1, 1, 1], id).children).toHaveLength(3);
  });

  it("a slider: added with its first picture into a cell, its slides added, moved, changed and taken out", () => {
    const d = page(three());
    const index = indexTree(d.tree);
    const sl = newElement("slider", "ar", ids(d), "https://res.cloudinary.com/x/a.jpg");
    expect(ADDABLE).toContain("slider");
    expect(sl).toMatchObject({ type: "slider", props: { slides: [{ src: "https://res.cloudinary.com/x/a.jpg", kind: "image" }], loop: true, arrows: true, dots: true } });
    expect(sl.children).toBeUndefined();
    expect(accepts("cell", "slider") && accepts("section", "slider")).toBe(true);
    expect(canHold(index, "c1", sl)).toBe(true);
    expect(canHold(index, "cols", sl)).toBe(false);
    // Inserted into a cell, and undo takes it out again.
    const ops = [{ op: "insert" as const, parentId: "c2", index: 1, node: sl }];
    const after = run(d, ops);
    expect(cellsOf(after)[1]).toEqual(["b", sl.id]);
    expect(run(after, undoOf(ops, d, "ar")).tree).toEqual(d.tree);

    const a: Slide = { src: "/a.webp", kind: "image" };
    const b: Slide = { src: "/b.mp4", kind: "video" };
    const c: Slide = { src: "/c.webp", kind: "image", caption: { ar: "ج" } };
    expect(slidesOf(sl)).toHaveLength(1);
    expect(slidesOf({ id: "x", type: "slider", props: {} })).toEqual([]);
    // Several pictures at once, never past 12.
    expect(addSlides([a], ["/1.webp", "/2.webp"], "image").map((s) => s.src)).toEqual(["/a.webp", "/1.webp", "/2.webp"]);
    expect(addSlides(Array(11).fill(a), ["/1.webp", "/2.webp", "/3.webp"], "image")).toHaveLength(MAX_SLIDES);
    // Moved one place; the ends stop it.
    expect(moveSlide([a, b, c], 2, -1)).toEqual([a, c, b]);
    expect(moveSlide([a, b, c], 0, -1)).toEqual([a, b, c]);
    expect(moveSlide([a, b, c], 2, 1)).toEqual([a, b, c]);
    // Changed: empty words and links drop out; the others stay as they were.
    expect(changeSlide([a, c], 1, { caption: {}, href: "/shop" })).toEqual([a, { src: "/c.webp", kind: "image", href: "/shop" }]);
    expect(changeSlide([a, c], 0, { href: undefined, alt: { en: "A" } })).toEqual([{ ...a, alt: { en: "A" } }, c]);
  });

  it("knows what goes where: cells only in columns, columns two deep at most, never inside itself", () => {
    expect(accepts("columns", "cell")).toBe(true);
    expect(accepts("columns", "text")).toBe(false);
    expect(accepts("cell", "video")).toBe(true);
    expect(accepts("cell", "section")).toBe(false);
    expect(accepts("page", "section")).toBe(true);
    expect(accepts("text", "text")).toBe(false);
    const d = page(three());
    const index = indexTree(d.tree);
    const id = ids(d);
    expect(canHold(index, "c1", newColumns([1, 1], id))).toBe(true);
    expect(canHold(index, "c1", { id: "deep", type: "columns", props: {}, children: [cell("q", [newColumns([1, 1], id)])] })).toBe(false);
    expect(canHold(index, "c1", locate(d.tree, "cols")!.node)).toBe(false);
    expect(canHold(index, "c2", text("a"))).toBe(true);
    expect(canHold(index, "cols", text("a"))).toBe(false);
  });
});
