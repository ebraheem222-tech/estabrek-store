import { describe, test, expect } from "vitest";
import { DraftError, applyOps, draftFromPage, locate, needsTree, publishOrder, sectionsHash, setTranslated, storedDraft } from "../lib/pageDraft.js";

// The new editor's draft (src/lib/pageDraft.ts); no database needed.
const rows = [
  { id: "hero", type: "HERO", order: 0, isVisible: true, data: { title: "أهلاً", primaryButton: { label: "تسوّقي", href: "/shop" } }, translations: [{ locale: "en", data: { title: "Hello" } }] },
  { id: "faq", type: "FAQ", order: 1, isVisible: true, data: { title: "أسئلة", items: [{ question: "س١", answer: "ج١" }, { question: "س٢", answer: "ج٢" }] } },
  { id: "cta", type: "CTA", order: 2, isVisible: true, data: { title: "زورونا" } },
];
const fresh = () => draftFromPage({ tree: null, sections: rows });
const ctx = { main: "ar" as const };
const order = (d: ReturnType<typeof fresh>) => (d.tree.root.children ?? []).map((n) => (n.type === "legacy" ? n.props.sectionId : n.id));

describe("a page's draft", () => {
  test("starts as a copy of the page, words in every language included", () => {
    const d = fresh();
    expect(order(d)).toEqual(["hero", "faq", "cta"]);
    expect(d.sections[0].tr).toEqual({ en: { title: "Hello" } });
    expect(d.baseHash).toBe(sectionsHash(rows, null));
    expect(storedDraft(JSON.parse(JSON.stringify(d)))?.rev).toBe(0);
    expect(storedDraft({ version: 2 })).toBeNull();
  });

  test("a word in the main language changes the section; in another language, its translation", () => {
    let d = applyOps(fresh(), [{ op: "setField", sectionId: "hero", lang: "ar", path: ["primaryButton", "label"], value: "تسوّقوا" }], ctx);
    expect((d.sections[0].data as any).primaryButton).toEqual({ label: "تسوّقوا", href: "/shop" });
    d = applyOps(d, [{ op: "setField", sectionId: "hero", lang: "he", path: ["title"], value: "שלום" }], ctx);
    expect(d.sections[0].tr).toEqual({ en: { title: "Hello" }, he: { title: "שלום" } });
    expect(d.rev).toBe(2);
  });

  test("a translated list item copies the whole list first, so nothing goes missing", () => {
    const d = applyOps(fresh(), [{ op: "setField", sectionId: "faq", lang: "en", path: ["items", 1, "question"], value: "Q2" }], ctx);
    expect(d.sections[1].tr.en).toEqual({ items: [{ question: "س١", answer: "ج١" }, { question: "Q2", answer: "ج٢" }] });
    expect(setTranslated({ items: [{ a: 1 }, { a: 2 }] }, { items: [{ a: "x" }] }, ["items", 1, "a"], "y")).toEqual({ items: [{ a: "x" }, { a: "y" }] });
  });

  test("move, hide, delete and bring back", () => {
    let d = applyOps(fresh(), [{ op: "move", nodeId: "s-cta", index: 0 }, { op: "setVisible", sectionId: "faq", visible: false }], ctx);
    expect(order(d)).toEqual(["cta", "hero", "faq"]);
    expect(d.sections.find((s) => s.id === "faq")?.isVisible).toBe(false);
    d = applyOps(d, [{ op: "remove", nodeId: "s-hero" }], ctx);
    expect(order(d)).toEqual(["cta", "faq"]);
    expect(d.trash.map((t) => t.section.id)).toEqual(["hero"]);
    d = applyOps(d, [{ op: "restore", sectionId: "hero" }], ctx);
    expect(order(d)).toEqual(["cta", "hero", "faq"]);
    expect(d.trash).toEqual([]);
    expect([...publishOrder(d)]).toEqual([["cta", 0], ["hero", 1], ["faq", 2]]);
  });

  test("the rose blocks get a place on the page, and can leave it", () => {
    let d = applyOps(fresh(), [{ op: "placeBlock", block: "seasons", index: 1 }], ctx);
    expect(order(d)).toEqual(["hero", "rb-seasons", "faq", "cta"]);
    expect(needsTree(d.tree)).toBe(true);
    d = applyOps(d, [{ op: "placeBlock", block: "seasons", index: 3 }], ctx);
    expect(order(d)).toEqual(["hero", "faq", "cta", "rb-seasons"]);
    d = applyOps(d, [{ op: "placeBlock", block: "seasons", index: null }], ctx);
    expect(needsTree(d.tree)).toBe(false);
  });

  test("new elements: columns go in, cells take content, things move between cells and come out again", () => {
    const text = (id: string, ar: string) => ({ id, type: "text", props: { text: { ar } } });
    const cols = {
      id: "cols", type: "columns", props: {}, style: { base: { widths: [1, 1] } },
      children: [{ id: "c1", type: "cell", props: {}, children: [text("t1", "واحد")] }, { id: "c2", type: "cell", props: {}, children: [] }],
    };
    let d = applyOps(fresh(), [{ op: "insert", parentId: "page", index: 1, node: { id: "box", type: "section", props: { contained: true }, children: [] } as any }], ctx);
    d = applyOps(d, [{ op: "insert", parentId: "box", index: 0, node: cols as any }], ctx);
    expect(order(d)).toEqual(["hero", "box", "faq", "cta"]);
    expect(needsTree(d.tree)).toBe(true);
    // Into the other cell, then a look and new words.
    d = applyOps(d, [{ op: "move", nodeId: "t1", parentId: "c2", index: 0 }, { op: "insert", parentId: "c1", index: 0, node: { id: "go", type: "button", props: { label: { ar: "تسوّق" }, href: "/shop" } } as any }], ctx);
    expect(locate(d.tree, "t1")?.parent?.id).toBe("c2");
    expect(locate(d.tree, "go")?.node.props).toMatchObject({ variant: "solid" });
    d = applyOps(d, [{ op: "setStyle", nodeId: "cols", screen: "base", style: { widths: [1, 2], gap: 32 } }, { op: "setStyle", nodeId: "c2", screen: "mobile", style: { hidden: true } }], ctx);
    expect(locate(d.tree, "cols")?.node.style).toEqual({ base: { widths: [1, 2], gap: 32 } });
    expect(locate(d.tree, "c2")?.node.style).toEqual({ mobile: { hidden: true } });
    d = applyOps(d, [{ op: "setStyle", nodeId: "c2", screen: "mobile", style: null }, { op: "setProps", nodeId: "t1", props: { text: { ar: "اثنين", en: "Two" } } }], ctx);
    expect(locate(d.tree, "c2")?.node.style).toBeUndefined();
    expect(locate(d.tree, "t1")?.node.props).toEqual({ text: { ar: "اثنين", en: "Two" } });
    // Out of the cell and off the page.
    d = applyOps(d, [{ op: "remove", nodeId: "t1" }], ctx);
    expect(locate(d.tree, "t1")).toBeNull();
    d = applyOps(d, [{ op: "remove", nodeId: "box" }], ctx);
    expect(order(d)).toEqual(["hero", "faq", "cta"]);
    expect(d.trash).toEqual([]);
  });

  test("an element's motion is set, changed and stopped; the old sections don't take it", () => {
    let d = applyOps(fresh(), [{ op: "insert", parentId: "page", index: 0, node: { id: "box", type: "section", props: {}, children: [{ id: "v", type: "video", props: { src: "/clips/a.mp4" } }] } as any }], ctx);
    d = applyOps(d, [{ op: "setMotion", nodeId: "v", motion: { scroll: { kind: "keys", from: { rx: 25 }, to: { rx: 0 } } } }], ctx);
    expect(locate(d.tree, "v")?.node.motion).toEqual({ scroll: { kind: "keys", from: { rx: 25 }, to: { rx: 0 } } });
    d = applyOps(d, [{ op: "setStyle", nodeId: "v", screen: "base", style: { rotateX: 20, perspective: 1200, overlay: { color: "#000", opacity: 0.4 } } }], ctx);
    expect(locate(d.tree, "v")?.node.style?.base).toMatchObject({ rotateX: 20, overlay: { opacity: 0.4 } });
    d = applyOps(d, [{ op: "setMotion", nodeId: "v", motion: null }], ctx);
    expect(locate(d.tree, "v")?.node.motion).toBeUndefined();
    expect(() => applyOps(d, [{ op: "setMotion", nodeId: "s-hero", motion: { enter: { kind: "fade" } } }], ctx)).toThrow(/that moves/);
    expect(() => applyOps(d, [{ op: "setMotion", nodeId: "v", motion: { enter: { kind: "explode" } } }], ctx)).toThrow(DraftError);
  });

  test("the tree's rules hold for every change", () => {
    const cols = { id: "cols", type: "columns", props: {}, children: [{ id: "c1", type: "cell", props: {}, children: [{ id: "t", type: "text", props: { text: { ar: "x" } } }] }] };
    const d = applyOps(fresh(), [{ op: "insert", parentId: "page", index: 0, node: { id: "box", type: "section", props: {}, children: [cols] } as any }], ctx);
    const refuse = (ops: unknown, why: RegExp) => expect(() => applyOps(d, ops, ctx)).toThrow(why);
    refuse([{ op: "insert", parentId: "cols", index: 0, node: { id: "t2", type: "text", props: { text: { ar: "y" } } } }], /inside a cell/);
    refuse([{ op: "insert", parentId: "t", index: 0, node: { id: "t2", type: "text", props: {} } }], /can't hold other elements/);
    refuse([{ op: "insert", parentId: "c1", index: 0, node: { id: "t", type: "divider", props: {} } }], /used twice/);
    refuse([{ op: "insert", parentId: "c1", index: 0, node: { id: "old", type: "legacy", props: { sectionId: "hero" } } }], /their own changes/);
    refuse([{ op: "move", nodeId: "box", parentId: "c1", index: 0 }], /inside itself/);
    refuse([{ op: "move", nodeId: "s-hero", parentId: "c1", index: 0 }], /to move/);
    refuse([{ op: "remove", nodeId: "c1" }], /Columns hold 1–4 cells/);
    refuse([{ op: "setProps", nodeId: "s-hero", props: {} }], /with settings/);
    refuse([{ op: "setProps", nodeId: "t", props: { text: { ar: 5 } } }], /string/i);
    refuse([{ op: "setStyle", nodeId: "t", screen: "watch", style: {} }], /Not a screen/);
    refuse([{ op: "setStyle", nodeId: "cols", screen: "base", style: { widths: [13] } }], /12/);
    expect(locate(d.tree, "t")?.parent?.id).toBe("c1");
  });

  test("objects placed freely over an old section or a scene: added, moved, kept through delete and back", () => {
    const words = { id: "o1", type: "heading", props: { text: { ar: "فوق" } }, style: { base: { layer: { x: 30, y: 40, anchor: "center" } } } };
    let d = applyOps(fresh(), [{ op: "insert", parentId: "s-hero", index: 0, node: words }], ctx);
    expect(locate(d.tree, "o1")?.parent?.id).toBe("s-hero");
    expect(needsTree(d.tree)).toBe(true);
    // A scene gets its place first, then holds objects too.
    d = applyOps(d, [{ op: "placeBlock", block: "seasons", index: 1 }, { op: "insert", parentId: "rb-seasons", index: 0, node: { id: "o2", type: "image", props: { src: "/x.webp" } } }], ctx);
    expect(locate(d.tree, "o2")?.parent?.id).toBe("rb-seasons");
    d = applyOps(d, [{ op: "move", nodeId: "o2", parentId: "s-cta", index: 0 }], ctx);
    expect(locate(d.tree, "o2")?.parent?.id).toBe("s-cta");
    // A deleted section keeps its objects in the bin, and they come back with it.
    d = applyOps(d, [{ op: "remove", nodeId: "s-hero" }], ctx);
    expect(locate(d.tree, "o1")).toBeNull();
    d = applyOps(d, [{ op: "restore", sectionId: "hero" }], ctx);
    expect(locate(d.tree, "o1")?.parent?.id).toBe("s-hero");
    // Only content goes over a section: no sections, columns or other old sections.
    const refuse = (ops: unknown, why: RegExp) => expect(() => applyOps(d, ops, ctx)).toThrow(why);
    refuse([{ op: "insert", parentId: "s-faq", index: 0, node: { id: "c9", type: "columns", props: {}, children: [{ id: "c9a", type: "cell", props: {}, children: [] }] } }], /placed over a section/);
    refuse([{ op: "insert", parentId: "s-faq", index: 0, node: { id: "x9", type: "section", props: {}, children: [] } }], /straight on the page/);
  });

  test("a part of an old section or scene gets its own look and motion, per screen, and loses them again", () => {
    const title = "s:faq/title";
    let d = applyOps(fresh(), [
      { op: "setLookStyle", target: title, kind: "text", screen: "base", style: { font: "serif", size: 40, color: "#7d2448", textAlign: "center" } },
      { op: "setLookStyle", target: "b:seasons/@card-image", kind: "image", screen: "mobile", style: { focus: { x: 30, y: 20 }, radius: 24 } },
      { op: "setLookMotion", target: title, kind: "text", motion: { enter: { kind: "up", duration: 0.8 } } },
    ], ctx);
    const looks = d.tree.root.props.looks as Record<string, any>;
    expect(looks[title]).toEqual({ kind: "text", style: { base: { font: "serif", size: 40, color: "#7d2448", textAlign: "center" } }, motion: { enter: { kind: "up", duration: 0.8 } } });
    expect(looks["b:seasons/@card-image"].style.mobile.focus).toEqual({ x: 30, y: 20 });
    expect(needsTree(d.tree)).toBe(true);
    d = applyOps(d, [
      { op: "setLookStyle", target: title, kind: "text", screen: "base", style: null },
      { op: "setLookMotion", target: title, kind: "text", motion: null },
      { op: "setLookStyle", target: "b:seasons/@card-image", kind: "image", screen: "mobile", style: null },
    ], ctx);
    expect(d.tree.root.props.looks).toBeUndefined();
    expect(needsTree(d.tree)).toBe(false);
    const refuse = (ops: unknown, why: RegExp) => expect(() => applyOps(fresh(), ops, ctx)).toThrow(why);
    refuse([{ op: "setLookStyle", target: "s:faq/<script>", kind: "text", screen: "base", style: {} }], /Not a part/);
    refuse([{ op: "setLookStyle", target: "s:faq", kind: "wheel", screen: "base", style: {} }], /Not a kind/);
    refuse([{ op: "setLookStyle", target: "s:faq", kind: "box", screen: "base", style: { size: 900 } }], /200/);
  });

  test("bad changes are refused and nothing is applied", () => {
    const d = fresh();
    const refuse = (ops: unknown) => expect(() => applyOps(d, ops, ctx)).toThrow(DraftError);
    refuse([]);
    refuse([{ op: "setField", sectionId: "nope", lang: "ar", path: ["title"], value: "x" }]);
    refuse([{ op: "setField", sectionId: "hero", lang: "ar", path: ["__proto__", "x"], value: "x" }]);
    refuse([{ op: "setField", sectionId: "hero", lang: "ar", path: ["title"], value: { html: "<script>" } }]);
    refuse([{ op: "setField", sectionId: "hero", lang: "ar", path: ["title"], value: "x".repeat(6000) }]);
    refuse([{ op: "move", nodeId: "s-hero", index: 1 }, { op: "explode" }]);
    refuse([{ op: "placeBlock", block: "fireworks", index: 0 }]);
    // The section type's own check runs on main-language changes.
    expect(() => applyOps(d, [{ op: "setField", sectionId: "hero", lang: "ar", path: ["title"], value: 5 }], { main: "ar", checkSection: (_t, data: any) => { if (typeof data.title !== "string") throw new Error("title"); return data; } })).toThrow();
    expect(order(d)).toEqual(["hero", "faq", "cta"]);
  });
});
