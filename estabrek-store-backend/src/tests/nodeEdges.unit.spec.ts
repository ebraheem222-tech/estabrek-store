import { expect, test } from "vitest";
import { checkTree, NODE_PROPS, type NodeType } from "../lib/pageTree.js";

const art = { viewBox: "0 0 200 40", nodes: [{ t: "path", a: { d: "M0 20L100 0L200 20V40H0Z", fill: "currentColor" } }] };
const edges = { top: { art, height: 24, phone: 12, color: "accent", flip: true }, bottom: { art, height: 32, color: "#ffffff", front: true } };
const fixtures: Array<[NodeType, Record<string, unknown>]> = [
  ["heading", { text: { en: "Title" } }], ["text", { text: { en: "Copy" } }],
  ["button", { label: { en: "Shop" }, href: "/shop" }],
  ["image", { src: "/uploads/image.webp" }], ["video", { src: "/uploads/clip.mp4" }],
  ["svg", { art }], ["model3d", { model: "sneaker" }],
  ["stack", {}], ["grid", {}], ["columns", {}], ["cell", {}],
  ["spacer", {}], ["divider", {}], ["accordion", { items: [] }],
];

test.each(fixtures)("%s preserves independent SVG top/bottom settings", (type, props) => {
  const result = NODE_PROPS[type].safeParse({ ...props, edges });
  expect(result.success).toBe(true);
  if (result.success) expect(result.data).toMatchObject({ edges });
});

test.each(fixtures)("%s validates decorative SVGs with the same bounds as section edges", (type, props) => {
  expect(NODE_PROPS[type].safeParse({ ...props, edges: { top: { ...edges.top, height: 900 } } }).success).toBe(false);
  expect(NODE_PROPS[type].safeParse({ ...props, edges: { top: { ...edges.top, art: { viewBox: "0 0 1 1", nodes: [{ t: "script", a: {} }] } } } }).success).toBe(false);
});

test("tree validation keeps text decoration and surrounding content after a save", () => {
  const result = checkTree({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [{ id: "copy", type: "text", props: { text: { en: "Copy" }, edges } }] }] } });
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.tree.root.children![0].children![0].props).toEqual({ text: { en: "Copy" }, edges });
});
