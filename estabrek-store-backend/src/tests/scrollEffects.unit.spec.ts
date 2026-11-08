import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { SCROLL_EFFECTS } from "../../../estabrek-admin/src/studio/scrollEffects";

// The editor's ready scroll effects (admin studio/scrollEffects.ts) must save as they are.
describe("ready scroll effects", () => {
  test("every one passes the page check on what it suits, nothing dropped", () => {
    expect(SCROLL_EFFECTS.length).toBeGreaterThanOrEqual(30);
    for (const effect of SCROLL_EFFECTS) {
      const words = effect.only?.has("heading") && !effect.only.has("section");
      const node = words
        ? { id: "s", type: "section", props: {}, children: [{ id: "h", type: "heading", props: { text: { en: "Hi" } }, motion: { scroll: effect.scroll } }] }
        : { id: "s", type: "section", props: {}, motion: { scroll: effect.scroll }, children: [] };
      const result = checkTree({ version: 1, root: { id: "page", type: "page", props: {}, children: [node] } });
      expect(result.ok ? [] : result.issues, effect.key).toEqual([]);
      if (result.ok) {
        const saved = words ? result.tree.root.children![0].children![0].motion : result.tree.root.children![0].motion;
        expect(saved?.scroll, effect.key).toEqual(effect.scroll);
      }
    }
  });
});
