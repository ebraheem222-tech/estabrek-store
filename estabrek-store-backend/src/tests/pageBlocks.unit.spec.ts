import { describe, test, expect } from "vitest";
import { blockIdsOf, expandBlocks } from "../lib/pageBlocks.js";
import { checkTree, type PageTree, type TreeNode } from "../lib/pageTree.js";

// Saved blocks drawn where a page links them (src/lib/pageBlocks.ts); no database needed.
const heading = (id: string): TreeNode => ({ id, type: "heading", props: { text: { ar: "عرض" }, level: 2 } });
const band: TreeNode = { id: "band", type: "section", props: {}, style: { base: { bg: "accent" } }, children: [{ id: "cols", type: "stack", props: {}, children: [heading("t"), heading("u")] }] };
const page = (children: TreeNode[]): PageTree => ({ version: 1, root: { id: "page", type: "page", props: {}, children } });
const ids = (n: TreeNode): string[] => [n.id, ...(n.children ?? []).flatMap(ids)];

describe("saved blocks", () => {
  test("a link becomes the block's sections, renamed after the link so ids stay unique", () => {
    const tree = page([
      { id: "top", type: "section", props: {}, children: [] },
      { id: "lnk-a", type: "block", props: { blockId: "b1" } },
      { id: "lnk-b", type: "block", props: { blockId: "b1" } },
      { id: "gone", type: "block", props: { blockId: "nope" } },
    ]);
    expect(blockIdsOf(tree)).toEqual(["b1", "nope"]);
    const out = expandBlocks(tree, new Map([["b1", [band, { id: "second", type: "section", props: {}, children: [] }]]]));
    const kids = out.root.children!;
    // Two links of the same block (two sections each); a link to a missing block draws nothing.
    expect(kids.map((n) => n.id)).toEqual(["top", "lnk-a", "lnk-a_3", "lnk-b", "lnk-b_3"]);
    expect(ids(kids[1])).toEqual(["lnk-a", "lnk-a_0", "lnk-a_1", "lnk-a_2"]);
    // The look comes along; the block itself is untouched.
    expect(kids[1].style).toEqual({ base: { bg: "accent" } });
    expect(band.id).toBe("band");
    const all = kids.flatMap(ids);
    expect(new Set(all).size).toBe(all.length);
    // What the shop gets is still a good tree.
    expect(checkTree(out).ok).toBe(true);
    // A page without links comes back as it was.
    const plain = page([band]);
    expect(expandBlocks(plain, new Map())).toBe(plain);
  });

  test("a link sits straight on the page and takes no look or motion of its own", () => {
    const issues = (children: unknown[]) => {
      const r = checkTree({ version: 1, root: { id: "page", type: "page", children } });
      return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`);
    };
    expect(issues([{ id: "l", type: "block", props: { blockId: "b1" } }])).toEqual([]);
    expect(issues([{ id: "s", type: "section", children: [{ id: "l", type: "block", props: { blockId: "b1" } }] }])[0]).toMatch(/goes straight on the page/);
    expect(issues([{ id: "l", type: "block", props: {} }])[0]).toMatch(/props\.blockId/);
    expect(issues([{ id: "l", type: "block", props: { blockId: "b1" }, style: { base: { bg: "accent" } } }])[0]).toMatch(/takes its look from the block/);
    expect(issues([{ id: "l", type: "block", props: { blockId: "b1" }, motion: { enter: { kind: "fade" } } }])[0]).toMatch(/moves with its own settings/);
  });
});
