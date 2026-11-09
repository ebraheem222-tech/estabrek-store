import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { newScrollScene, readyScrollStory, readyScrollVideo, readyScrollZoom, atChapter } from "../../../estabrek-admin/src/studio/scrollScene";
import { KEY_PRESETS, partsFor } from "../../../estabrek-admin/src/studio/keyframes";
import { ACTS, newAction, TRIGGER_PRESETS } from "../../../estabrek-admin/src/studio/triggers";

type Node = { id: string; type: string; props: Record<string, unknown>; style?: Record<string, unknown>; motion?: Record<string, unknown>; children?: Node[] };
const page = (...children: Node[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children } });
const section = (...children: Node[]): Node => ({ id: "sec", type: "section", props: {}, children });
const ids = () => {
  let n = 0;
  return (prefix: string) => `${prefix.replace(/[^A-Za-z0-9_-]/g, "x")}-${n++}`;
};
const dropped = (a: unknown, b: unknown, path: string, out: string[] = []): string[] => {
  if (a && typeof a === "object") for (const [k, v] of Object.entries(a)) {
    const there = b && typeof b === "object" ? (b as Record<string, unknown>)[k] : undefined;
    if (there === undefined) out.push(`${path}.${k}`); else dropped(v, there, `${path}.${k}`, out);
  }
  return out;
};
const issues = (tree: unknown) => {
  const r = checkTree(tree);
  return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`);
};

describe("scroll scenes", () => {
  test.each(["ar", "en", "he"] as const)("the ready scenes pass the page check in %s, nothing dropped", (lang) => {
    for (const [name, make] of [["video", readyScrollVideo], ["story", readyScrollStory], ["zoom", readyScrollZoom]] as const) {
      const made = make(lang, ids(), name === "video" ? "https://res.cloudinary.com/x/video/upload/clip.mp4" : "https://res.cloudinary.com/x/image/upload/pic.jpg") as Node;
      const r = checkTree(page(made));
      expect(r.ok ? [] : r.issues, name).toEqual([]);
      if (r.ok) expect(dropped(JSON.parse(JSON.stringify(made)), r.tree.root.children![0], name), name).toEqual([]);
    }
  });

  test("a scene without a clip yet, and anything added at a chapter, are fine", () => {
    const scene = newScrollScene("en", ids()) as Node;
    const added = atChapter({ id: "x1", type: "heading", props: { text: { en: "Hi" } }, motion: { enter: { kind: "up" } } }, 10, 3) as Node;
    expect(added.motion).toEqual({ cue: { from: 30, to: 40, in: "up", out: "fade" } });
    scene.children!.push(added);
    expect(issues(page(section(scene)))).toEqual([]);
  });

  test("its settings are checked", () => {
    const bad = (props: Record<string, unknown>) => issues(page(section({ id: "s1", type: "scrollScene", props, children: [] })));
    expect(bad({ media: { kind: "video", src: "javascript:alert(1)" } }).length).toBeGreaterThan(0);
    expect(bad({ length: 40 }).length).toBeGreaterThan(0);
    expect(bad({ chapters: 0 }).length).toBeGreaterThan(0);
    expect(bad({ blur: { from: 0, to: 50, amount: 99 } }).length).toBeGreaterThan(0);
    expect(bad({ mode: "sideways" }).length).toBeGreaterThan(0);
    // A scene goes inside a section, not straight on the page.
    expect(issues(page({ id: "s1", type: "scrollScene", props: {}, children: [] })).length).toBeGreaterThan(0);
  });

  test("a moment in the scene ends after it starts", () => {
    const at = (cue: unknown) => issues(page(section({ id: "s1", type: "scrollScene", props: {}, children: [{ id: "h", type: "heading", props: { text: { en: "x" } }, motion: { cue } }] })));
    expect(at({ from: 10, to: 40, in: "zoom", out: "stay" })).toEqual([]);
    expect(at({ from: 40, to: 40 }).length).toBeGreaterThan(0);
    expect(at({ from: 10, to: 40, in: "explode" }).length).toBeGreaterThan(0);
  });
});

describe("keyframes, layers and overflow", () => {
  const kinds: Record<string, Node> = {
    button: { id: "n", type: "button", props: { label: { en: "Go" }, href: "/shop" } },
    heading: { id: "n", type: "heading", props: { text: { en: "Hi" } } },
    text: { id: "n", type: "text", props: { text: { en: "Hi" } } },
    image: { id: "n", type: "image", props: { src: "https://x.test/a.jpg" } },
    video: { id: "n", type: "video", props: { src: "https://x.test/a.mp4" } },
    stack: { id: "n", type: "stack", props: {}, children: [] },
    section: { id: "n", type: "section", props: {}, children: [] },
    icon: { id: "n", type: "icon", props: { name: "heart" } },
  };
  test("every ready animation saves as it is on what it suits", () => {
    expect(KEY_PRESETS.length).toBeGreaterThanOrEqual(35);
    for (const p of KEY_PRESETS) {
      for (const [type, base] of Object.entries(kinds)) {
        if (p.only && !p.only.has(type)) continue;
        if (!Object.keys(p.keys.parts).every((part) => partsFor(type).includes(part as never))) continue;
        const node: Node = { ...structuredClone(base), motion: { keys: p.keys }, props: { ...base.props, ...(p.layers ? { layers: p.layers } : {}) }, ...(p.overflow ? { style: { base: { overflow: p.overflow } } } : {}) };
        const tree = type === "section" ? page(node) : page(section(node));
        const r = checkTree(tree);
        expect(r.ok ? [] : r.issues, `${p.key} on ${type}`).toEqual([]);
        if (r.ok) {
          const saved = type === "section" ? r.tree.root.children![0] : r.tree.root.children![0].children![0];
          expect(dropped(JSON.parse(JSON.stringify(node)), saved, p.key), `${p.key} on ${type}`).toEqual([]);
        }
      }
    }
  });

  test("keyframes need two moments, known names and numbers in range", () => {
    const keyed = (keys: unknown) => issues(page(section({ id: "h", type: "heading", props: { text: { en: "x" } }, motion: { keys } })));
    expect(keyed({ on: "hover", parts: { self: [{ at: 0 }, { at: 100, x: 20, clip: [0, 10, 0, 10], color: "accent" }] } })).toEqual([]);
    expect(keyed({ on: "hover", parts: { self: [{ at: 0 }] } }).length).toBeGreaterThan(0);
    expect(keyed({ on: "hover", parts: {} }).length).toBeGreaterThan(0);
    expect(keyed({ on: "always", parts: { self: [{ at: 0 }, { at: 100 }] } }).length).toBeGreaterThan(0);
    expect(keyed({ on: "loop", parts: { self: [{ at: 0, scale: 9 }, { at: 100 }] } }).length).toBeGreaterThan(0);
    expect(keyed({ on: "loop", parts: { self: [{ at: 0, color: "url(x)" }, { at: 100 }] } }).length).toBeGreaterThan(0);
  });

  test("layers and overflow are checked", () => {
    const one = (props: Record<string, unknown>, style?: Record<string, unknown>) => issues(page(section({ id: "b", type: "button", props: { label: { en: "Go" }, href: "/shop", ...props }, ...(style ? { style } : {}) })));
    expect(one({ layers: { before: { bg: "accent", at: "bottom", h: 2 }, after: { border: { width: 2, color: "#fff" }, front: true } } })).toEqual([]);
    expect(one({ layers: { before: { at: "middle" } } }).length).toBeGreaterThan(0);
    expect(one({}, { base: { overflow: "clip", overflowX: "auto" } })).toEqual([]);
    expect(one({}, { base: { overflow: "sideways" } }).length).toBeGreaterThan(0);
  });

  test("a row can slide sideways with the scroll", () => {
    expect(issues(page(section({ id: "row", type: "stack", props: {}, motion: { scroll: { kind: "sideways" } }, children: [] })))).toEqual([]);
  });
});

describe("triggers", () => {
  const on = (triggers: unknown) => issues(page(section({ id: "b", type: "button", props: { label: { en: "Go" }, href: "/shop", triggers } })));
  test("every ready trigger and every fresh action saves as it is", () => {
    for (const p of TRIGGER_PRESETS) expect(on([p.make("en")]), p.key).toEqual([]);
    for (const [act] of ACTS) expect(on([{ on: "click", do: [newAction(act, "ar")] }]), act).toEqual([]);
    const node: Node = { id: "b", type: "button", props: { label: { en: "Go" }, href: "/shop", triggers: TRIGGER_PRESETS.map((p) => p.make("he")) } };
    const r = checkTree(page(section(node)));
    if (r.ok) expect(dropped(JSON.parse(JSON.stringify(node)), r.tree.root.children![0].children![0], "triggers")).toEqual([]);
  });

  test("unknown events and actions, unsafe links and too many are refused", () => {
    expect(on([{ on: "shake", do: [{ act: "vibrate" }] }]).length).toBeGreaterThan(0);
    expect(on([{ on: "click", do: [{ act: "explode" }] }]).length).toBeGreaterThan(0);
    expect(on([{ on: "click", do: [{ act: "link", href: "javascript:alert(1)" }] }]).length).toBeGreaterThan(0);
    expect(on([{ on: "click", do: [] }]).length).toBeGreaterThan(0);
    expect(on(Array.from({ length: 9 }, () => ({ on: "click", do: [{ act: "vibrate" }] }))).length).toBeGreaterThan(0);
    expect(on([{ on: "click", do: [{ act: "play", target: "a b", what: "pulse" }] }]).length).toBeGreaterThan(0);
  });
});
