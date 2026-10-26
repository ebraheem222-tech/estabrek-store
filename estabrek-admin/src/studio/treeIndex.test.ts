import { describe, expect, it } from "vitest";
import { fieldLabel, indexTree, nodeName, pathTo, sectionLabel, shapesOf, type BridgeLayout } from "./treeIndex";

describe("what's inside old sections and rose scenes", () => {
  const index = indexTree({ version: 1, root: { id: "page", type: "page", props: {}, children: [
    { id: "s-hero", type: "legacy", props: { sectionId: "hero" } },
    { id: "s-products", type: "legacy", props: { sectionId: "products" } },
  ] } });
  const r = (y: number, h = 40) => ({ x: 0, y, w: 100, h });
  const layout: BridgeLayout = {
    pageId: "home", lang: "ar", dir: "rtl", viewport: { w: 1280, h: 800 }, scroll: { x: 0, y: 0 }, doc: { w: 1280, h: 4000 },
    items: [
      { kind: "legacy", sectionId: "hero", rect: r(0, 3000) },
      { kind: "legacy", sectionId: "products", rect: r(3000, 600) },
      { kind: "block", block: "seasons", rect: r(3600, 2000) },
      // A scene's word lives in the opening's data; its button is measured whole, with its link.
      { kind: "slot", owner: "b:seasons", sectionId: "hero", block: "seasons", path: "roseScenes.seasons.winter.cta.ar", edit: "text", link: undefined, rect: r(3700) },
      { kind: "part", owner: "b:seasons", name: "card", n: 0, count: 2, rect: r(3800, 200) },
      { kind: "part", owner: "b:seasons", name: "card-image", n: 0, count: 2, within: "p:card:0", rect: r(3810, 100) },
      { kind: "slot", owner: "s:hero", sectionId: "hero", path: "primaryButton.label", edit: "text", link: "primaryButton.href", rect: r(200) },
      { kind: "auto", owner: "s:products", n: 3, tag: "h3", label: "عباية", within: "p:card:9", rect: r(3100) },
      // A field from a shop that doesn't send its owner yet.
      { kind: "slot", sectionId: "products", path: "title", edit: "text", rect: r(3020) },
    ],
  };
  const { shapes, extras, up } = shapesOf(index, layout, { x: 0, y: 0 }, 1);
  const parentOf = (id: string) => shapes.find((s) => s.id === id)?.parentId;

  it("puts each one under the piece around it, else its section or scene", () => {
    expect(parentOf("bslot:seasons:roseScenes.seasons.winter.cta.ar")).toBe("block:seasons");
    expect(parentOf("part:b:seasons:card-image:0")).toBe("part:b:seasons:card:0");
    expect(parentOf("part:b:seasons:card:0")).toBe("block:seasons");
    expect(parentOf("slot:hero:primaryButton.label")).toBe("s-hero");
    // The piece around it isn't measured (hidden): its section then.
    expect(parentOf("auto:s:products:3")).toBe("s-products");
    expect(parentOf("slot:products:title")).toBe("s-products");
    expect(pathTo(index, "part:b:seasons:card-image:0", up)).toEqual(["page", "block:seasons", "part:b:seasons:card:0", "part:b:seasons:card-image:0"]);
  });

  it("is deeper than what holds it, so a click finds it first", () => {
    const depth = (id: string) => shapes.find((s) => s.id === id)!.depth;
    expect(depth("part:b:seasons:card-image:0")).toBeGreaterThan(depth("part:b:seasons:card:0"));
    expect(depth("part:b:seasons:card:0")).toBeGreaterThan(depth("block:seasons"));
    expect(extras.get("slot:hero:primaryButton.label")).toMatchObject({ kind: "slot", link: "primaryButton.href", owner: "s:hero" });
    expect(extras.get("bslot:seasons:roseScenes.seasons.winter.cta.ar")).toMatchObject({ sectionId: "hero", block: "seasons" });
  });

  it("names a scene's words by what and where they are", () => {
    expect(fieldLabel("roseScenes.seasons.winter.title.en")).toBe("العنوان · الشتاء");
    expect(fieldLabel("roseScenes.instagram.text.ar")).toBe("النص");
  });
});

describe("names in the editor", () => {
  it("calls fields and old sections by what they are", () => {
    expect(fieldLabel("roseTitle")).toBe("العنوان الكبير");
    expect(fieldLabel("primaryButton.label")).toBe("الزر الأول");
    expect(fieldLabel("items.2.question")).toBe("سؤال 3");
    expect(fieldLabel("somethingNew")).toBe("somethingNew");
    expect(sectionLabel("HERO")).toBe("الافتتاح");
    expect(nodeName({ id: "s-1", type: "legacy", props: { sectionId: "1" } }, "FAQ")).toBe("أسئلة شائعة");
  });
});
