import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";

// The shop element's own words: each up to 40 letters in each language; nothing else on it.
const page = (props: Record<string, unknown>) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "shop", type: "shop", props }] }] } });

describe("the shop's own words", () => {
  test("its words are kept, too long or unknown ones refused", () => {
    const r = checkTree(page({ categoriesLabel: { en: "Browse", ar: "تصفّح" }, moreLabel: { he: "עוד" } }));
    expect(r.ok && (r.tree as any).root.children[0].children[0].props).toEqual({ categoriesLabel: { en: "Browse", ar: "تصفّح" }, moreLabel: { he: "עוד" } });
    expect(checkTree(page({ sortLabel: { en: "x".repeat(41) } })).ok).toBe(false);
    expect(checkTree(page({ nameLabel: { en: "x" } })).ok).toBe(false);
  });
});
