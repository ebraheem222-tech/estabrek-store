import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { applyOps, draftFromPage } from "../lib/pageDraft.js";
import { readyCounters, readyOrbit, readyPaint, readyPortal } from "../../../estabrek-admin/src/studio/scrollTricks";

// Scroll tricks: things travelling around a circle, an arc or a wave; numbers counting and lines
// drawing with the scroll; the next section's edge; a picture through a growing window; a section
// that colours the page; the page's cursor and an element's word for it.

type Node = { id: string; type: string; props: Record<string, unknown>; style?: Record<string, unknown>; motion?: Record<string, unknown>; children?: Node[] };
const page = (children: Node[], props: Record<string, unknown> = {}) => ({ version: 1, root: { id: "page", type: "page", props, children } });
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
const ok = (tree: unknown) => {
  const r = checkTree(tree);
  return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`);
};
const sec = (props: Record<string, unknown>, children: Node[] = [], id = "s"): Node => ({ id, type: "section", props, children });

describe("scroll tricks", () => {
  test.each(["ar", "en", "he"] as const)("the ready sections pass the page check in %s, nothing dropped", (lang) => {
    for (const make of [readyOrbit, readyCounters, (l: typeof lang, i: ReturnType<typeof ids>) => readyPortal(l, i, "https://res.cloudinary.com/x/image/upload/pic.jpg"), readyPaint]) {
      const made = make(lang, ids()) as Node;
      const r = checkTree(page([made]));
      expect(r.ok ? [] : r.issues).toEqual([]);
      if (r.ok) expect(dropped(made, (r.tree as any).root.children[0], made.name ?? made.id)).toEqual([]);
    }
  });

  test("travelling, counting and drawing with the scroll; out-of-range values are refused", () => {
    const stack = (scroll: unknown, id = "k"): Node => ({ id, type: "stack", props: {}, motion: { scroll }, children: [{ id: `${id}-a`, type: "text", props: { text: { en: "a" } } }] });
    expect(ok(page([sec({}, [stack({ kind: "orbit", orbit: { shape: "wave", radius: 40, turn: -1.5 } })])]))).toEqual([]);
    expect(ok(page([sec({}, [stack({ kind: "count" }), stack({ kind: "draw" }, "k2")])]))).toEqual([]);
    expect(ok(page([sec({}, [stack({ kind: "orbit", orbit: { shape: "spiral" } })])]))).not.toEqual([]);
    expect(ok(page([sec({}, [stack({ kind: "orbit", orbit: { shape: "arc", turn: 3 } })])]))).not.toEqual([]);
  });

  test("the next section's edge, the page's colour and a picture's window", () => {
    expect(ok(page([sec({ cover: { enter: "arch" }, paint: "#1b2a78" }), sec({ paint: "$brand" }, [], "s2")]))).toEqual([]);
    expect(ok(page([sec({ cover: { enter: "zigzag" } })]))).not.toEqual([]);
    expect(ok(page([sec({ paint: "javascript:x" })]))).not.toEqual([]);
    const scene = (window: unknown): Node => sec({}, [{ id: "sc", type: "scrollScene", props: { media: { kind: "none" }, window }, children: [] }]);
    expect(ok(page([scene({ shape: "diamond", from: 10, to: 70 })]))).toEqual([]);
    expect(ok(page([scene({ shape: "star", from: 0, to: 50 })]))).not.toEqual([]);
  });

  test("the page's cursor and an element's word for it; the draft keeps smooth scrolling apart", () => {
    const word: Node = { id: "b", type: "button", props: { label: { en: "Go" }, href: "/shop", cursorText: { en: "Shop", ar: "تسوّقي" } } };
    expect(ok(page([sec({}, [word])], { cursor: { kind: "blend", size: 24 } }))).toEqual([]);
    expect(ok(page([sec({})], { cursor: { kind: "star" } }))).not.toEqual([]);
    expect(ok(page([sec({}, [{ ...word, props: { ...word.props, cursorText: { en: "x".repeat(40) } } }])]))).not.toEqual([]);
    const start = draftFromPage({ tree: page([sec({})], { smooth: true }), sections: [] } as any);
    const withCursor = applyOps(start, [{ op: "setProps", nodeId: "page", props: { cursor: { kind: "ring", color: "accent" } } }], { main: "en" });
    expect(withCursor.tree.root.props).toEqual({ smooth: true, cursor: { kind: "ring", color: "accent" } });
    const without = applyOps(withCursor, [{ op: "setProps", nodeId: "page", props: { cursor: null } }], { main: "en" });
    expect(without.tree.root.props).toEqual({ smooth: true });
    expect(applyOps(without, [{ op: "setProps", nodeId: "page", props: {} }], { main: "en" }).tree.root.props).toEqual({});
  });
});
