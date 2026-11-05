import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";

const page = (scene?: unknown) => ({ version: 1, root: { id: "page", type: "page", children: [{ id: "hero", type: "section", props: scene === undefined ? {} : { scene }, children: [{ id: "link", type: "button", props: { label: { en: "Continue" }, href: "/shop" } }] }] } });

describe("section scene contract", () => {
  test("keeps every procedural scene and supplies bounded defaults without changing old sections", () => {
    for (const kind of ["constellation", "orbs", "waves", "grid", "starfield", "ribbons", "snow", "fireworks"]) {
      const result = checkTree(page({ kind, color: "accent", secondary: "#123456" }));
      expect(result.ok, kind).toBe(true);
      if (!result.ok) continue;
      expect(result.tree.root.children![0].props!.scene).toEqual({ kind, color: "accent", secondary: "#123456", amount: 32, speed: 1, intensity: 1, interactive: false });
    }
    const old = checkTree(page());
    expect(old.ok).toBe(true);
    if (old.ok) expect(old.tree.root.children![0].props).not.toHaveProperty("scene");
  });

  test("rejects unsafe colors, unknown kinds and invalid knobs before saving", () => {
    for (const patch of [{ kind: "unknown" }, { color: "url(javascript:x)" }, { secondary: "red;display:none" }, { amount: 7 }, { amount: 101 }, { amount: 12.5 }, { speed: -0.1 }, { speed: 3.1 }, { intensity: -1 }, { intensity: 2.1 }, { interactive: "yes" }]) {
      expect(checkTree(page({ kind: "waves", ...patch })).ok, JSON.stringify(patch)).toBe(false);
    }
    for (const patch of [{ amount: 8, speed: 0, intensity: 0, interactive: true }, { amount: 100, speed: 3, intensity: 2 }]) {
      expect(checkTree(page({ kind: "waves", ...patch })).ok).toBe(true);
    }
  });
});
