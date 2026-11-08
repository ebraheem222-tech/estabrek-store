import { expect, test } from "vitest";
import { checkTree, LOOK_TARGET } from "../lib/pageTree.js";
import { applyOps, draftFromPage } from "../lib/pageDraft.js";
import { lookSelector, looksOf } from "../../../estabrek-storefront/src/pageTree/tree";
import { treeCss } from "../../../estabrek-storefront/src/pageTree/css";
import { expandBlocks } from "../lib/pageBlocks.js";
const tree = () => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [{ id: "shop", type: "shop", props: {} }] }] } });
test("native semantic and guarded structural targets agree across API and public CSS", () => {
  for (const target of ["n:shop/@card-name", "n:shop/~div.1.h3.2", "s:old/~div.1.button.1", "b:stories/@card"]) { expect(LOOK_TARGET.test(target)).toBe(true); expect(lookSelector(target)).toBeTruthy(); }
  for (const target of ["n:shop/~div.0", "n:shop/~div.1,body", "n:shop/~div.1[onclick]", "n:shop/@card;body", "n:shop/~div.1000"]) { expect(LOOK_TARGET.test(target)).toBe(false); expect(lookSelector(target)).toBeNull(); }
});
test("native part looks live on the owner and survive validation, publication CSS and independent edits", () => {
  const draft = draftFromPage({ id: "p", sections: [], tree: tree(), format: 2 } as any);
  const edited = applyOps(draft, [{ op: "setLookStyle", target: "n:shop/@card-name", kind: "text", screen: "base", style: { size: 31, color: "#123456" } }], { main: "en" });
  const node = edited.tree.root.children![0].children![0];
  expect(node.props.partLooks).toEqual({ "@card-name": { kind: "text", style: { base: { size: 31, color: "#123456" } } } });
  expect(edited.tree.root.props.looks).toBeUndefined();
  expect(checkTree(edited.tree).ok).toBe(true);
  expect(looksOf(edited.tree as any).some(([target]) => target === "n:shop/@card-name")).toBe(true);
  expect(treeCss(edited.tree as any)).toContain("font-size:31px");
  const cleared = applyOps(edited, [{ op: "setLookStyle", target: "n:shop/@card-name", kind: "text", screen: "base", style: null }], { main: "en" });
  expect(cleared.tree.root.children![0].children![0].props.partLooks).toBeUndefined();
});
test("each repeated published block keeps all of its validated part appearances", () => {
  const block = tree();
  block.root.children[0].children[0].props = { partLooks: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`@part-${i}`, { kind: "text", style: { base: { size: 20 } } }])) } as any;
  expect(checkTree(block).ok).toBe(true);
  const source = { version: 1, root: { id: "page", type: "page", props: {}, children: ["first", "second"].map(id => ({ id, type: "block", props: { blockId: "saved" } })) } };
  expect(checkTree(source).ok).toBe(true);
  const expanded = expandBlocks(source as any, new Map([["saved", block.root.children as any]]));
  expect(looksOf(expanded as any)).toHaveLength(400);
  expect(treeCss(expanded as any)).toContain('data-tree-node="second_0"');
});
