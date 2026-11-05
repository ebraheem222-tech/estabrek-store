import { expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
const tree = (props: Record<string, unknown>, children: unknown[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [{ id: "deck", type: "deck", props, children }] }] } });
const panel = (id: string) => ({ id, type: "stack", props: {}, children: [{ id: `${id}-title`, type: "heading", props: { level: 2, text: { en: id } } }] });
test("native decks and tab presentations own editable panel trees with safe labels", () => {
  for (const presentation of ["deck", "tabs", "vertical-tabs"]) {
    const result = checkTree(tree({ presentation, labels: { one: { en: "Work" }, two: { en: "About" } }, initial: 9, duration: .6, transition: "wipe", arrows: true, dots: true, menu: true }, [panel("one"), panel("two")]));
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (result.ok) expect(result.tree.root.children![0].children![0].props.initial).toBe(1);
  }
  expect(checkTree(tree({}, [])).ok).toBe(true);
  expect(checkTree(tree({}, [{ id: "bad", type: "text", props: { text: { en: "Not a panel" } } }])).ok).toBe(false);
  expect(checkTree(tree({ transition: "script" }, [panel("one")])).ok).toBe(false);
  expect(checkTree(tree({ duration: 3 }, [panel("one")])).ok).toBe(false);
  expect(checkTree(tree({}, Array.from({ length: 13 }, (_, index) => panel(`p${index}`)))).ok).toBe(false);
});
