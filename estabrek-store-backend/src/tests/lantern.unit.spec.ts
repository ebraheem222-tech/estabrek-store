import { expect, test } from "vitest";
import { checkTree, FINISHES_3D } from "../lib/pageTree.js";

const page = (props: Record<string, unknown>) => ({ version: 1, root: { id: "page", type: "page", children: [{ id: "s", type: "section", children: [{ id: "lantern", type: "model3d", props }] }] } });

test("the lantern roundtrips through the existing editable model contract with every finish and fallback poster", () => {
  for (const finish of FINISHES_3D) {
    const props = { model: "lantern", finish, knobs: { width: 0.9, height: 1.2, ribs: 12, handle: 0 }, colours: { body: "#482e25", trim: "#8c593d", accent: "accent", glow: "#ffbc64", screen: "#ffe6ac", metal: "#b3935e" }, poster: "/templates/home/lantern.svg", lights: { preset: "warm" }, anim: { type: "swing", speed: 0.6, amount: 0.4, trigger: "hover" }, camera: { fov: 30 }, turn: { x: 0, y: 15, z: 0 }, floor: "disc", drag: true, label: { ar: "فانوس ورقي", en: "Paper lantern", he: "עששית נייר" } };
    const result = checkTree(page(props));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tree.root.children![0].children![0].props).toEqual(props);
  }
  expect(checkTree(page({ model: "lantern", knobs: { ribs: Infinity } })).ok).toBe(false);
  expect(checkTree(page({ model: "lantern", poster: "javascript:alert(1)" })).ok).toBe(false);
});
