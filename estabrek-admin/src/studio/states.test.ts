import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../api/pages.api";
import { styleOp } from "./columns";
import { HOVER_PRESETS, presetsOf, stateOps, stateView, statesOf } from "./states";

const btn = (style?: Record<string, unknown>): PageTreeNode => ({ id: "b", type: "button", props: {}, style });

describe("an element's states (mouse over, focused, pressed)", () => {
  it("a state's view holds only that state's values, per screen", () => {
    const node = btn({ base: { bg: "accent", hover: { bg: "text", scale: 1.05 } }, mobile: { pad: [1, 1, 1, 1], hover: { color: "white" } } });
    expect(stateView(node, "hover").style).toEqual({ base: { bg: "text", scale: 1.05 }, mobile: { color: "white" } });
    expect(stateView(node, "pressed").style).toEqual({});
    expect(statesOf(node)).toEqual(["hover"]);
  });

  it("the panels' changes go back inside the screen's look, keeping its own values", () => {
    const node = btn({ base: { bg: "accent", radius: 12, hover: { bg: "text" } } });
    const view = stateView(node, "hover");
    const [op] = stateOps(node, "hover", [styleOp(view, "base", { scale: 1.05 })]);
    expect(op).toEqual({ op: "setStyle", nodeId: "b", screen: "base", style: { bg: "accent", radius: 12, hover: { bg: "text", scale: 1.05 } } });
    // A screen without a look of its own gets one holding only the state.
    const [tab] = stateOps(node, "focused", [styleOp(stateView(node, "focused"), "tablet", { glow: { color: "accent", size: 12 } })]);
    expect(tab).toEqual({ op: "setStyle", nodeId: "b", screen: "tablet", style: { focused: { glow: { color: "accent", size: 12 } } } });
  });

  it("keys a state can't take are dropped, and an emptied state goes", () => {
    const node = btn({ base: { hover: { bg: "text" } } });
    const view = stateView(node, "hover");
    const [sized] = stateOps(node, "hover", [styleOp(view, "base", { pad: [9, 9, 9, 9], size: 40 })]);
    expect(sized).toEqual({ op: "setStyle", nodeId: "b", screen: "base", style: { hover: { bg: "text" } } });
    const [gone] = stateOps(node, "hover", [styleOp(view, "base", { bg: null })]);
    expect(gone).toEqual({ op: "setStyle", nodeId: "b", screen: "base", style: null });
    // Ops for other elements pass through untouched.
    const other = { op: "setStyle" as const, nodeId: "x", screen: "base" as const, style: { bg: "accent" } };
    expect(stateOps(node, "hover", [other])).toEqual([other]);
  });

  it("ready looks suit the element", () => {
    expect(presetsOf("hover", "image").map((p) => p.key)).toContain("colour");
    expect(presetsOf("hover", "section").map((p) => p.key)).not.toContain("underline");
    for (const p of HOVER_PRESETS) expect(Object.keys(p.look).length).toBeGreaterThan(0);
  });
});
