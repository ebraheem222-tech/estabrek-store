import { describe, test, expect } from "vitest";
import { SITE_STYLES_LIMIT, checkSiteStyles, storedSiteStyles } from "../lib/siteStyles.js";
import { checkTree } from "../lib/pageTree.js";

// The page editor's shared styles (src/lib/siteStyles.ts); no database needed.
describe("site styles", () => {
  test("text, button and box styles come back clean, states and screens included", () => {
    const styles = [
      { id: "h2", kind: "text", style: { base: { family: "reem-kufi", size: 48, sizeMin: 30, hover: { color: "accent" } }, mobile: { lineHeight: 1.2 } } },
      { id: "body", kind: "text", style: { base: { size: 17, lineHeight: 1.8 } } },
      { id: "solid", kind: "button", name: "  Main button ", style: { base: { radius: 999, pressed: { scale: 0.96 }, transition: { duration: 0.2 } } } },
      { id: "card", kind: "box", name: "Card", style: { base: { bg: "surface", radius: 24, shadow: "md", backdrop: { blur: 10 } } } },
    ];
    const r = checkSiteStyles(styles);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.styles[2].name).toBe("Main button");
    expect(r.styles[0].style).toEqual(styles[0].style);
    expect(storedSiteStyles(styles)).toHaveLength(4);
  });

  test("ids are unique, a level's or button kind's style keeps its kind, values are checked", () => {
    const where = (raw: unknown) => {
      const r = checkSiteStyles(raw);
      return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`);
    };
    expect(where([{ id: "card", kind: "box", style: {} }, { id: "card", kind: "box", style: {} }])[0]).toMatch(/1\.id: The id “card” is used twice/);
    expect(where([{ id: "h2", kind: "button", style: {} }])[0]).toMatch(/0\.kind: “h2” is a text style/);
    expect(where([{ id: "Lead!", kind: "text", style: {} }])[0]).toMatch(/0\.id/);
    expect(where([{ id: "lead", kind: "text", style: { base: { size: 999 } } }])[0]).toMatch(/0\.style\.base\.size/);
    expect(where(Array.from({ length: SITE_STYLES_LIMIT + 1 }, (_, i) => ({ id: `s${i}`, kind: "box", style: {} })))[0]).toMatch(/At most/);
    // Broken saved styles read as none (the shop then shows the elements' own looks only).
    expect(storedSiteStyles([{ id: "x", kind: "nope" }])).toBeNull();
    expect(storedSiteStyles(undefined)).toBeNull();
  });

  test("an element names the shared style it takes; the page and old sections don't", () => {
    const page = (children: unknown[]) => ({ version: 1, root: { id: "page", type: "page", props: { styleId: "x" }, children } });
    const r = checkTree(page([{ id: "s", type: "section", props: { styleId: "band" }, children: [{ id: "h", type: "heading", props: { text: { ar: "عنوان" }, styleId: "lead" } }] }, { id: "old", type: "legacy", props: { sectionId: "a", styleId: "x" } }]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tree.root.props).toEqual({});
    expect(r.tree.root.children![0].props).toEqual({ styleId: "band" });
    expect(r.tree.root.children![0].children![0].props).toMatchObject({ styleId: "lead" });
    expect(r.tree.root.children![1].props).toEqual({ sectionId: "a" });
    const bad = checkTree(page([{ id: "s", type: "section", props: { styleId: "Band; color:red" }, children: [] }]));
    expect(bad.ok).toBe(false);
  });
});
