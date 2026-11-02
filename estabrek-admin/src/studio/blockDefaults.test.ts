import { describe, expect, it } from "vitest";
import { BLOCK_KINDS, inAWeek, newBlock, newItem, newPopup } from "./blockDefaults";

const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${++n}`;
};

describe("new content blocks", () => {
  it("come with ready items in the language shown only", () => {
    for (const kind of BLOCK_KINDS) {
      const node = newBlock(kind, "he", ids(), "/a.jpg");
      expect(node.type).toBe(kind);
      const items = node.props.items as unknown[] | undefined;
      if (["accordion", "testimonials", "pricing", "team", "marquee", "tabs"].includes(kind)) expect(items!.length, kind).toBe(3);
      // Words only in Hebrew: the store adds its other languages.
      const words = JSON.stringify(node.props);
      expect(words, kind).not.toMatch(/"ar":|"en":/);
    }
    expect(newBlock("beforeAfter", "ar", ids(), "/x.jpg").props).toMatchObject({ before: "/x.jpg", after: "/x.jpg", start: 50 });
    expect(newItem("hotspots", "en")).toMatchObject({ x: 50, y: 50, title: { en: "Look at this" } });
  });

  it("a countdown a week from now, as a local date and time; a popup with its content", () => {
    expect(inAWeek(new Date(2026, 10, 1, 9, 5))).toBe("2026-11-08T09:05");
    const pop = newPopup("ar", ids());
    expect(pop.type).toBe("popup");
    expect(pop.props).toMatchObject({ trigger: "load", often: "visit", place: "center" });
    expect(pop.children!.map((c) => c.type)).toEqual(["heading", "text", "button"]);
  });
});
