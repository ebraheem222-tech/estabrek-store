import { describe, expect, it } from "vitest";
import type { PageDraft } from "../api/pages.api";
import { History, fieldValue, inverseOf, locate, mergeTranslated, parsePath, simulate, undoOf } from "./draft";

const draft = (): PageDraft => ({
  version: 1,
  rev: 3,
  baseHash: "x",
  startedAt: "",
  updatedAt: "",
  trash: [],
  sections: [
    { id: "hero", type: "HERO", isVisible: true, data: { title: "أهلاً", items: [{ q: "س" }, { q: "ص" }] }, tr: { en: { title: "Hello" } } },
    { id: "faq", type: "FAQ", isVisible: false, data: {}, tr: {} },
  ],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [
    { id: "s-hero", type: "legacy", props: { sectionId: "hero" } },
    { id: "rb-seasons", type: "roseBlock", props: { block: "seasons" } },
    { id: "s-faq", type: "legacy", props: { sectionId: "faq" } },
  ] } },
});

describe("objects placed over a section or scene", () => {
  it("a scene given a place and an object over it come off again with one undo", () => {
    const d = draft();
    d.tree.root.children = d.tree.root.children!.filter((n) => n.id !== "rb-seasons");
    const obj = { id: "o1", type: "text", props: {}, style: { base: { layer: { x: 10, y: 20 } } } };
    const ops = [{ op: "placeBlock" as const, block: "seasons" as const, index: 1 }, { op: "insert" as const, parentId: "rb-seasons", index: 0, node: obj }];
    expect(undoOf(ops, d, "ar")).toEqual([{ op: "remove", nodeId: "o1" }, { op: "placeBlock", block: "seasons", index: null }]);
    const after = ops.reduce(simulate, d);
    expect(locate(after.tree, "o1")?.parent?.id).toBe("rb-seasons");
    // Taking the scene off the page brings its objects back on undo.
    expect(inverseOf({ op: "placeBlock", block: "seasons", index: null }, after, "ar")).toEqual([{ op: "placeBlock", block: "seasons", index: 1 }, { op: "insert", parentId: "rb-seasons", index: 0, node: obj }]);
  });
});

describe("the editor's draft", () => {
  it("reads a field as the shopper sees it in each language", () => {
    const d = draft();
    expect(fieldValue(d.sections[0], "ar", "ar", ["title"])).toBe("أهلاً");
    expect(fieldValue(d.sections[0], "en", "ar", ["title"])).toBe("Hello");
    expect(fieldValue(d.sections[0], "he", "ar", ["title"])).toBe("أهلاً"); // no Hebrew yet: the main words
    expect(fieldValue(d.sections[0], "en", "ar", parsePath("items.1.q"))).toBe("ص");
    expect(parsePath("items.2.question")).toEqual(["items", 2, "question"]);
    expect(mergeTranslated({ a: [1, 2], b: { c: 1, d: 2 } }, { a: [9], b: { c: 5 } })).toEqual({ a: [9], b: { c: 5, d: 2 } });
  });

  it("knows how to take back each change", () => {
    const d = draft();
    expect(inverseOf({ op: "setField", sectionId: "hero", lang: "en", path: ["title"], value: "Hi" }, d, "ar")).toEqual([{ op: "setField", sectionId: "hero", lang: "en", path: ["title"], value: "Hello" }]);
    // A language that had no words of its own goes back to having none.
    expect(inverseOf({ op: "setField", sectionId: "hero", lang: "he", path: ["title"], value: "שלום" }, d, "ar")[0]).toMatchObject({ value: null });
    expect(inverseOf({ op: "move", nodeId: "s-faq", index: 0 }, d, "ar")).toEqual([{ op: "move", nodeId: "s-faq", index: 2 }]);
    expect(inverseOf({ op: "remove", nodeId: "s-hero" }, d, "ar")).toEqual([{ op: "restore", sectionId: "hero" }]);
    expect(inverseOf({ op: "setVisible", sectionId: "faq", visible: true }, d, "ar")).toEqual([{ op: "setVisible", sectionId: "faq", visible: false }]);
    expect(inverseOf({ op: "placeBlock", block: "seasons", index: 0 }, d, "ar")).toEqual([{ op: "placeBlock", block: "seasons", index: 1 }]);
    expect(inverseOf({ op: "placeBlock", block: "stories", index: 0 }, d, "ar")).toEqual([{ op: "placeBlock", block: "stories", index: null }]);
  });

  it("takes back the tree's own changes at any depth", () => {
    const d = draft();
    d.tree.root.children!.push({ id: "box", type: "section", props: {}, style: { base: { bg: "accent" } }, children: [
      { id: "cols", type: "columns", props: {}, children: [{ id: "c1", type: "cell", props: {}, children: [{ id: "t", type: "text", props: { text: { ar: "نص" } } }] }, { id: "c2", type: "cell", props: {}, children: [] }] },
    ] });
    expect(inverseOf({ op: "insert", parentId: "c2", index: 0, node: { id: "n", type: "divider", props: {} } }, d, "ar")).toEqual([{ op: "remove", nodeId: "n" }]);
    expect(inverseOf({ op: "move", nodeId: "t", parentId: "c2", index: 0 }, d, "ar")).toEqual([{ op: "move", nodeId: "t", parentId: "c1", index: 0 }]);
    expect(inverseOf({ op: "remove", nodeId: "t" }, d, "ar")).toEqual([{ op: "insert", parentId: "c1", index: 0, node: { id: "t", type: "text", props: { text: { ar: "نص" } } } }]);
    expect(inverseOf({ op: "remove", nodeId: "rb-seasons" }, d, "ar")).toEqual([{ op: "placeBlock", block: "seasons", index: 1 }]);
    expect(inverseOf({ op: "setProps", nodeId: "t", props: { text: { ar: "جديد" } } }, d, "ar")).toEqual([{ op: "setProps", nodeId: "t", props: { text: { ar: "نص" } } }]);
    expect(inverseOf({ op: "setStyle", nodeId: "box", screen: "base", style: null }, d, "ar")).toEqual([{ op: "setStyle", nodeId: "box", screen: "base", style: { bg: "accent" } }]);
    expect(inverseOf({ op: "setStyle", nodeId: "box", screen: "mobile", style: { hidden: true } }, d, "ar")).toEqual([{ op: "setStyle", nodeId: "box", screen: "mobile", style: null }]);
    expect(inverseOf({ op: "setMotion", nodeId: "t", motion: { enter: { kind: "up" } } }, d, "ar")).toEqual([{ op: "setMotion", nodeId: "t", motion: null }]);
    const moving = simulate(d, { op: "setMotion", nodeId: "t", motion: { loop: { kind: "float" } } });
    expect(locate(moving.tree, "t")?.node.motion).toEqual({ loop: { kind: "float" } });
    expect(inverseOf({ op: "setMotion", nodeId: "t", motion: null }, moving, "ar")).toEqual([{ op: "setMotion", nodeId: "t", motion: { loop: { kind: "float" } } }]);
    // A batch is undone step by step: the text moves out, its cell goes, and both come back.
    const ops = [{ op: "move", nodeId: "t", parentId: "c2", index: 0 }, { op: "remove", nodeId: "c1" }] as const;
    const after = ops.reduce(simulate, d);
    expect(locate(after.tree, "c1")).toBeNull();
    expect(undoOf([...ops], d, "ar").reduce(simulate, after).tree).toEqual(d.tree);
  });

  it("undo and redo in order; a new change clears redo", () => {
    const h = new History();
    const a = { label: "a", ops: [], undo: [] };
    const b = { label: "b", ops: [], undo: [] };
    h.push(a);
    h.push(b);
    expect(h.takeUndo()).toBe(b);
    expect(h.takeRedo()).toBe(b);
    expect(h.takeUndo()).toBe(b);
    h.push({ label: "c", ops: [], undo: [] });
    expect(h.takeRedo()).toBeNull();
    h.drop(a);
    expect(h.done.map((e) => e.label)).toEqual(["c"]);
  });
});
