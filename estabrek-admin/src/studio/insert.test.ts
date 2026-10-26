import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../api/pages.api";
import { idMaker } from "./columns";
import { insertOps, makeNode, pageItemOf, type InsertCtx } from "./insert";
import { indexTree, type Extra } from "./treeIndex";

// The page: an opening, a section of the tree's own with a heading, the FAQ, and the seasons
// scene shown in its usual spot (no place of its own yet) between the opening and the section.
const tree = {
  version: 1 as const,
  root: { id: "page", type: "page", props: {}, children: [
    { id: "s-hero", type: "legacy", props: { sectionId: "hero" } },
    { id: "sec1", type: "section", props: { contained: true }, children: [{ id: "h1", type: "heading", props: { text: { ar: "أهلاً" } } }] },
    { id: "s-faq", type: "legacy", props: { sectionId: "faq" } },
  ] as PageTreeNode[] },
};
const index = indexTree(tree);
const extras = new Map<string, Extra>([
  ["block:seasons", { kind: "block", block: "seasons" }],
  ["block:fabric", { kind: "block", block: "fabric" }],
  ["bslot:seasons:roseScenes.seasons.winter.title.ar", { kind: "slot", owner: "b:seasons", sectionId: "hero", block: "seasons", path: "roseScenes.seasons.winter.title.ar", edit: "lines" }],
  ["slot:faq:title", { kind: "slot", owner: "s:faq", sectionId: "faq", path: "title", edit: "text" }],
]);
const up = new Map<string, string | null>([
  ["block:seasons", "page"],
  ["block:fabric", "page"],
  ["bslot:seasons:roseScenes.seasons.winter.title.ar", "block:seasons"],
  ["slot:faq:title", "s-faq"],
]);
// Where the scenes without a place show: seasons before the section, the fabric study after it.
const shownAt: Record<string, number> = { "block:seasons": 1, "block:fabric": 2 };
const ctx = (): InsertCtx => ({ index, up, extras, pageIndex: (id) => shownAt[id] ?? 3, ids: idMaker((x) => index.nodes.has(x)) });
const text = () => ({ id: "new", type: "text", props: { text: { ar: "جديد" } } });

describe("where something new goes", () => {
  it("inside a place of the tree, or beside the element in it", () => {
    expect(insertOps(ctx(), "sec1", text(), "inside")?.ops).toEqual([{ op: "insert", parentId: "sec1", index: 1, node: text() }]);
    expect(insertOps(ctx(), "h1", text(), "before")?.ops).toEqual([{ op: "insert", parentId: "sec1", index: 0, node: text() }]);
    expect(insertOps(ctx(), "h1", text(), "inside")).toBeNull(); // a heading holds nothing
  });

  it("beside an old section: in a new section of its own, on the page", () => {
    const r = insertOps(ctx(), "slot:faq:title", text(), "after")!;
    expect(r.ops).toHaveLength(1);
    expect(r.ops[0]).toMatchObject({ op: "insert", parentId: "page", index: 3, node: { type: "section", children: [text()] } });
    expect(r.select).toBe("new");
    // A section goes as it is.
    const sec = makeNode("section", "ar", ctx().ids);
    expect(insertOps(ctx(), "s-hero", sec, "before")?.ops).toEqual([{ op: "insert", parentId: "page", index: 0, node: sec }]);
  });

  it("over an old section or a scene: placed freely, a scene getting its place first", () => {
    const over = insertOps(ctx(), "s-faq", text(), "inside", { x: 20, y: 70 })!;
    expect(over.ops).toEqual([{ op: "insert", parentId: "s-faq", index: 0, node: { ...text(), style: { base: { layer: { x: 20, y: 70, anchor: "center" } } } } }]);
    const scene = insertOps(ctx(), "bslot:seasons:roseScenes.seasons.winter.title.ar", text(), "inside")!;
    expect(scene.ops[0]).toEqual({ op: "placeBlock", block: "seasons", index: 1 });
    expect(scene.ops[1]).toMatchObject({ op: "insert", parentId: "rb-seasons", node: { style: { base: { layer: { x: 50, y: 50 } } } } });
    // Sections and columns don't go over a section.
    expect(insertOps(ctx(), "s-faq", makeNode("columns", "ar", ctx().ids), "inside")).toBeNull();
  });

  it("beside a scene shown in its usual spot: the scene takes that spot, the new section lands beside it", () => {
    const after = insertOps(ctx(), "block:seasons", text(), "after")!;
    expect(after.ops[0]).toEqual({ op: "placeBlock", block: "seasons", index: 1 });
    expect(after.ops[1]).toMatchObject({ op: "insert", parentId: "page", index: 2 });
    expect(insertOps(ctx(), "block:seasons", text(), "before")!.ops[1]).toMatchObject({ index: 1 });
    // The fabric study keeps its spot: only after it.
    expect(insertOps(ctx(), "block:fabric", text(), "after")?.ops).toEqual([{ op: "insert", parentId: "page", index: 2, node: expect.objectContaining({ type: "section" }) }]);
    expect(insertOps(ctx(), "block:fabric", text(), "before")).toBeNull();
    expect(pageItemOf(ctx(), "bslot:seasons:roseScenes.seasons.winter.title.ar")).toBe("block:seasons");
  });

  it("with nothing selected, at the end of the page", () => {
    expect(insertOps(ctx(), null, text(), "after")?.ops[0]).toMatchObject({ op: "insert", parentId: "page", index: 3 });
  });

  it("ready blocks come put together", () => {
    const split = makeNode("ready-split", "en", ctx().ids, "/x.webp");
    expect(split.type).toBe("section");
    expect(split.children![0].type).toBe("columns");
    expect(split.children![0].children![0].children![0]).toMatchObject({ type: "image", props: { src: "/x.webp" } });
    const video = makeNode("ready-video", "en", ctx().ids, "https://x/clip.mp4");
    expect(video.children!.map((n) => n.type)).toEqual(["video", "heading", "button"]);
    expect(video.children![1].style).toMatchObject({ base: { layer: { x: 50 } } });
  });
});
