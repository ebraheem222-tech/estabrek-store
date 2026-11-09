import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { componentIdsOf, expandComponents, variantsOf } from "../lib/componentTree.js";
import { acceptOverride } from "../lib/pageComponents.js";

// Main components (W2): change the main one and every page changes; variants; each instance's own changes.

type N = { id: string; type: string; name?: string; props: Record<string, unknown>; style?: Record<string, Record<string, unknown>>; children?: N[] };
const button = (id: string, label: string, variant: string): N => ({ id, type: "button", name: variant, props: { label: { en: label }, href: "/shop", variant: variant === "Secondary" ? "outline" : "solid" }, style: { base: { radius: 999, width: "220px" } } });
const card: N = { id: "card", type: "stack", name: "Card", props: {}, style: { base: { pad: [20, 20, 20, 20], bg: "surface" } }, children: [
  { id: "card-title", type: "heading", props: { level: 3, text: { en: "Title" } } },
  { id: "card-go", type: "button", props: { label: { en: "Open" }, href: "/shop" } },
] };
const comps = new Map<string, N[]>([
  ["btn", [button("primary", "Buy", "Primary"), button("secondary", "Buy", "Secondary")]],
  ["card", [card]],
  ["loop", [{ id: "self", type: "component", props: { componentId: "loop" } }]],
  ["wrap", [{ id: "wrap", type: "stack", props: {}, children: [{ id: "inner-btn", type: "component", props: { componentId: "btn", variant: "secondary" } }] }]],
]);
const page = (...children: N[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children }] } });
const kids = (t: { root: N }) => t.root.children![0].children!;

describe("main components", () => {
  test("an instance draws its variant in its place, renamed after it, with its own place and size", () => {
    const out = expandComponents(page({ id: "i1", type: "component", props: { componentId: "btn", variant: "secondary" }, style: { base: { width: "300px", layer: { x: 10, y: 20, anchor: "center" } } } }) as never, comps as never);
    const [b] = kids(out as never);
    expect(b).toMatchObject({ id: "i1", type: "button", name: "Secondary", props: { label: { en: "Buy" }, variant: "outline" } });
    // Its own width and place win; the rest of the look is the component's.
    expect(b.style!.base).toEqual({ radius: 999, width: "300px", layer: { x: 10, y: 20, anchor: "center" } });
    // Without a variant: the first.
    expect(kids(expandComponents(page({ id: "i2", type: "component", props: { componentId: "btn" } }) as never, comps as never) as never)[0].name).toBe("Primary");
  });

  test("each instance changes its own words and links; inner ids are unique per instance", () => {
    const tree = page(
      { id: "a", type: "component", props: { componentId: "card", overrides: { "card-title": { text: { en: "Summer" } }, "card-go": { href: "/c/summer" } } } },
      { id: "b", type: "component", props: { componentId: "card" } },
    );
    const [a, b] = kids(expandComponents(tree as never, comps as never, acceptOverride) as never);
    expect(a.children!.map((c) => c.props.text ?? c.props.href)).toEqual([{ en: "Summer" }, "/c/summer"]);
    expect(b.children!.map((c) => c.props.text ?? c.props.href)).toEqual([{ en: "Title" }, "/shop"]);
    const ids = [a, b].flatMap((x) => [x.id, ...x.children!.map((c) => c.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(a.children![0].id).toBe("a_0");
  });

  test("a change that would break an element is not kept; a gone component draws nothing; no endless loops", () => {
    const bad = kids(expandComponents(page({ id: "a", type: "component", props: { componentId: "card", overrides: { "card-title": { level: 9 } } } }) as never, comps as never, acceptOverride) as never)[0];
    expect(bad.children![0].props.level).toBe(3);
    expect(kids(expandComponents(page({ id: "x", type: "component", props: { componentId: "gone" } }, { id: "h", type: "heading", props: { text: { en: "Stays" } } }) as never, comps as never) as never).map((n) => n.id)).toEqual(["h"]);
    expect(kids(expandComponents(page({ id: "l", type: "component", props: { componentId: "loop" } }) as never, comps as never) as never)).toEqual([]);
  });

  test("a component can use another one", () => {
    const [w] = kids(expandComponents(page({ id: "w", type: "component", props: { componentId: "wrap" } }) as never, comps as never) as never);
    expect(w.children![0]).toMatchObject({ type: "button", name: "Secondary", props: { variant: "outline" } });
    expect(componentIdsOf(page({ id: "w", type: "component", props: { componentId: "wrap" } }) as never)).toEqual(["wrap"]);
    expect(variantsOf({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "variants", type: "section", props: {}, children: [card] }] } } as never)).toEqual([card]);
  });

  test("the page check takes instances, and refuses odd changes", () => {
    const ok = (t: unknown) => { const r = checkTree(t); return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`); };
    expect(ok(page({ id: "i", type: "component", props: { componentId: "card", variant: "card", overrides: { "card-title": { text: { en: "x" } } } }, style: { base: { width: "300px" } } }))).toEqual([]);
    expect(ok(page({ id: "i", type: "component", props: { componentId: "card", overrides: { "card-title": { "bad key": 1 } } } }))).not.toEqual([]);
    expect(ok(page({ id: "i", type: "component", props: {} }))).not.toEqual([]);
  });
});
