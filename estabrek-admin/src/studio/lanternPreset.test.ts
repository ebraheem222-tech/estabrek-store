import { expect, test } from "vitest";
import { makeNode, type AddKind } from "./insert";
import type { PageTreeNode } from "../api/pages.api";

const flatten = (node: PageTreeNode): PageTreeNode[] => [node, ...(node.children ?? []).flatMap(flatten)];
test("a ready lantern section has editable 3D, text and a button with unique node IDs", () => {
  let next = 0;
  const section = makeNode("ready-lantern" as AddKind, "ar", (prefix) => `${prefix}-${next++}`);
  const nodes = flatten(section);
  const model = nodes.find((node) => node.type === "model3d");
  expect(model?.props).toMatchObject({ model: "lantern", finish: "matte", lights: { preset: "warm" }, drag: true, colours: { screen: "#ffe6b2" } });
  expect(nodes.some((node) => node.type === "heading")).toBe(true);
  expect(nodes.some((node) => node.type === "button")).toBe(true);
  expect(new Set(nodes.map((node) => node.id)).size).toBe(nodes.length);
  expect(section.props.particles).toMatchObject({ kind: "fireflies" });
  expect(JSON.stringify(section)).not.toMatch(/estabrek|editorial\/|http/i);
});
