import { describe, expect, test } from "vitest";
import { VisualControls, InteractionPolicy, CardDesign } from "../lib/visualControls.js";
import { resolveActions, readVisualControls } from "../../../estabrek-storefront/src/lib/visualControls";
import { checkTree } from "../lib/pageTree.js";
import { applyOps, draftFromPage } from "../lib/pageDraft.js";

describe("visual controls contract", () => {
  test("page visual edits survive draft operations without resetting existing root settings", () => {
    const draft = draftFromPage({ id: "p", sections: [], format: 2, tree: { version: 1, root: { id: "page", type: "page", props: { smooth: true, commerceVersion: 1 }, children: [] } } } as any);
    const edited = applyOps(draft, [{ op: "setProps", nodeId: "page", controls: true, props: { cardDesign: { swatchSize: 30 }, interactions: { version: 1, bindings: { click: [] } } } }], { main: "en" });
    expect(edited.tree.root.props).toMatchObject({ smooth: true, commerceVersion: 1, cardDesign: { swatchSize: 30 } });
    const cleared = applyOps(edited, [{ op: "setProps", nodeId: "page", controls: true, props: {} }], { main: "en" });
    expect(cleared.tree.root.props).toEqual({ smooth: true, commerceVersion: 1 });
  });
  test("stores independent bounded events and validated card dimensions", () => {
    const value = { version: 1, revision: 0, cardDesign: { layout: "horizontal", swatchSize: 32, swatchShape: "square" }, interactions: { version: 1, bindings: { colorChange: [{ type: "theme", color: "event" }], cartAdded: [{ type: "animate", target: "cart-title", preset: "pulse" }] } } };
    expect(VisualControls.parse(value)).toEqual(value);
    expect(readVisualControls(value)).toEqual(value);
    for (const bad of [{ swatchSize: 300 }, { imageRatio: "javascript:bad" }, { padding: -1 }, { titleSize: Infinity }, { background: "url(https://bad)" }]) expect(CardDesign.safeParse(bad).success).toBe(false);
  });
  test("rejects code, selectors, unknown fields and excessive actions", () => {
    for (const action of [{ type: "javascript", code: "alert(1)" }, { type: "scroll", target: "#a > button" }, { type: "theme", color: "red;display:none" }, { type: "themeReset", script: "bad" }]) expect(InteractionPolicy.safeParse({ version: 1, bindings: { click: [action] } }).success).toBe(false);
    expect(InteractionPolicy.safeParse({ version: 1, bindings: { click: Array(9).fill({ type: "themeReset" }) } }).success).toBe(false);
  });
  test("each event inherits independently, and an empty list disables it", () => {
    const store: any = { version: 1, bindings: { colorChange: [{ type: "theme", color: "event" }], cartAdded: [{ type: "themeReset" }] } };
    const page: any = { version: 1, bindings: { colorChange: [] } };
    const node: any = { version: 1, bindings: { click: [{ type: "scroll", target: "end" }] } };
    expect(resolveActions("colorChange", [node, page, store])).toEqual([]);
    expect(resolveActions("cartAdded", [node, page, store])).toEqual(store.bindings.cartAdded);
    expect(resolveActions("cartClick", [node, page, store])).toBeUndefined();
  });
  test("page and element overrides survive native tree validation", () => {
    const result = checkTree({ version: 1, root: { id: "root", type: "page", props: { interactions: { version: 1, bindings: { click: [] } }, cardDesign: null }, children: [{ id: "s", type: "section", children: [{ id: "shop", type: "shop", props: { cardDesign: { swatchSize: 26 }, interactions: { version: 1, bindings: { cartAdded: [{ type: "theme", color: "#112233" }] } } } }] }] } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tree.root.props?.interactions).toBeDefined();
      expect(result.tree.root.children?.[0].children?.[0].props?.cardDesign).toEqual({ swatchSize: 26 });
    }
  });
});
