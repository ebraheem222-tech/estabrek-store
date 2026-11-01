import { describe, expect, it } from "vitest";
import type { SiteStyle } from "../api/siteStyles.api";
import { styleOp } from "./columns";
import { autoFor, kindFor, listOf, newStyleId, styleNode, styleOf, withOps } from "./siteStyles";

const card: SiteStyle = { id: "card", kind: "box", name: "Card", style: { base: { bg: "surface", radius: 24 } } };
const h2: SiteStyle = { id: "h2", kind: "text", style: { base: { size: 44 } } };

describe("the page editor's shared styles", () => {
  it("each kind lists the styles taken by themselves first (saved or not), then the named ones", () => {
    expect(listOf([card, h2], "text").map((s) => s.id)).toEqual(["h1", "h2", "h3", "h4", "h5", "h6", "body"]);
    expect(listOf([card, h2], "text")[1]).toBe(h2);
    expect(listOf([card, h2], "box").map((s) => s.id)).toEqual(["card"]);
    expect(listOf([], "button").map((s) => s.id)).toEqual(["solid", "outline", "link"]);
    expect(styleOf([], "h3")).toEqual({ id: "h3", kind: "text", style: {} });
    expect(styleOf([], "nope")).toBeNull();
  });

  it("a style is edited as a node; the panels' changes become the new list", () => {
    const node = styleNode(h2);
    expect(node).toMatchObject({ id: "site:h2", type: "heading", style: h2.style });
    expect(styleNode(card).type).toBe("section");
    // A change to a style that's not saved yet adds it.
    const added = withOps([card], "h3", [styleOp(styleNode(styleOf([card], "h3")!), "base", { size: 30 })]);
    expect(added).toEqual([card, { id: "h3", kind: "text", style: { base: { size: 30 } } }]);
    // A change keeps its place in the list; other screens stay.
    const both = withOps([h2, card], "h2", [styleOp(node, "mobile", { size: 28 })]);
    expect(both[0]).toEqual({ id: "h2", kind: "text", style: { base: { size: 44 }, mobile: { size: 28 } } });
    // Emptied: a style taken by itself goes; a named one stays (empty) until it's deleted.
    expect(withOps([h2, card], "h2", [styleOp(node, "base", { size: null })])).toEqual([card]);
    expect(withOps([card], "card", [styleOp(styleNode(card), "base", { bg: null, radius: null })])).toEqual([{ ...card, style: {} }]);
  });

  it("new ids come from English names, else style-N; never one that's taken", () => {
    expect(newStyleId("Hero Card!", [])).toBe("hero-card");
    expect(newStyleId("Card", [card])).toBe("card-1");
    expect(newStyleId("بطاقة", [])).toBe("style-1");
    expect(newStyleId("H2", [])).toBe("h2-1");
    expect(newStyleId("2 cols", [])).toBe("cols");
  });

  it("which style an element takes by itself, and which kind it can name", () => {
    expect(autoFor({ id: "a", type: "heading", props: { level: 3 } })).toBe("h3");
    expect(autoFor({ id: "a", type: "heading", props: {} })).toBe("h2");
    expect(autoFor({ id: "a", type: "text", props: {} })).toBe("body");
    expect(autoFor({ id: "a", type: "button", props: { variant: "outline" } })).toBe("outline");
    expect(autoFor({ id: "a", type: "cell", props: {} })).toBeNull();
    expect([kindFor("heading"), kindFor("button"), kindFor("image")]).toEqual(["text", "button", "box"]);
  });
});
