import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { coverOfNode, readyCover } from "../../../estabrek-admin/src/studio/coverPin";

// A section held on the screen, then covered by the next one sliding up over it.

type Node = { id: string; type: string; props: Record<string, unknown>; style?: Record<string, unknown>; children?: Node[] };
const page = (...children: Node[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children } });
const ids = () => {
  let n = 0;
  return (prefix: string) => `${prefix}-${n++}`;
};
const dropped = (a: unknown, b: unknown, path: string, out: string[] = []): string[] => {
  if (a && typeof a === "object") for (const [k, v] of Object.entries(a)) {
    const there = b && typeof b === "object" ? (b as Record<string, unknown>)[k] : undefined;
    if (there === undefined) out.push(`${path}.${k}`); else dropped(v, there, `${path}.${k}`, out);
  }
  return out;
};
const held = (cover: unknown): Node => ({ id: "s", type: "section", props: { cover }, children: [] });
const after: Node = { id: "next", type: "section", props: {}, children: [] };

describe("held and covered sections", () => {
  test.each(["ar", "en", "he"] as const)("the ready picture passes the page check in %s, nothing dropped", (lang) => {
    const made = readyCover(lang, ids(), "https://res.cloudinary.com/x/image/upload/pic.jpg") as Node;
    const r = checkTree(page(made, after));
    expect(r.ok ? [] : r.issues).toEqual([]);
    if (!r.ok) return;
    expect(dropped(made, (r.tree as any).root.children[0], "ready")).toEqual([]);
    expect((r.tree as any).root.children[0].props.cover).toEqual({ hold: 1, under: "dim", phone: true, enter: "rise" });
  });

  test("its settings get their defaults, and values out of range are refused", () => {
    const r = checkTree(page(held({}), after));
    expect(r.ok && (r.tree as any).root.children[0].props.cover).toEqual({ hold: 0, under: "none", phone: true, enter: "rise" });
    for (const bad of [{ hold: 7 }, { hold: -1 }, { under: "spin" }, { phone: "no" }]) expect(checkTree(page(held(bad), after)).ok).toBe(false);
    for (const under of ["none", "dim", "shrink", "blur", "slow", "fade"]) expect(checkTree(page(held({ hold: 2.5, under, phone: false }), after)).ok).toBe(true);
  });

  test("the editor reads its settings back in range", () => {
    expect(coverOfNode({ id: "s", type: "section", props: {} } as any)).toBeNull();
    expect(coverOfNode({ id: "s", type: "section", props: { cover: { hold: 9, under: "x", phone: false } } } as any)).toEqual({ hold: 6, under: "none", phone: false });
  });
});
