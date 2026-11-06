import { describe, expect, it } from "vitest";
import { checkTree } from "../lib/pageTree.js";

const page = (scene: unknown) => ({ version: 1, root: { id: "page", type: "page", children: [{ id: "hero", type: "section", props: { scene } }] } });

describe("matrix section scene schema", () => {
  it("persists matrix scenes with the existing default and bounded settings", () => {
    const result = checkTree(page({ kind: "matrix", color: "#00ffff", secondary: "text" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tree.root.children?.[0].props.scene).toEqual({ kind: "matrix", color: "#00ffff", secondary: "text", amount: 32, speed: 1, intensity: 1, interactive: false });
    expect(checkTree(page({ kind: "matrix", amount: 100, speed: 3, intensity: 2, interactive: true })).ok).toBe(true);
  });

  it("rejects invalid matrix parameters instead of persisting an unsafe scene", () => {
    for (const patch of [{ amount: 101 }, { amount: 8.5 }, { speed: Infinity }, { speed: 3.1 }, { intensity: -1 }, { color: "url(evil)" }, { interactive: "true" }]) {
      expect(checkTree(page({ kind: "matrix", ...patch })).ok).toBe(false);
    }
  });
});
