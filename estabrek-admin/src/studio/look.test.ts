import { describe, expect, it } from "vitest";
import type { PageTreeNode } from "../api/pages.api";
import { MOTION_PRESETS, hasPreset, motionOp, placeFor, placedOn, presetsFor, previewOf, shownLook, withPreset } from "./look";

const node = (style: Record<string, unknown>, motion?: Record<string, unknown>): PageTreeNode => ({ id: "n", type: "video", props: {}, style, motion });

describe("an element's look and motion in the editor", () => {
  it("a screen shows its own value, else the bigger screens'", () => {
    const n = node({ base: { rotateX: 20, layer: { x: 50, y: 50 } }, tablet: { rotateX: 10 }, mobile: { layer: false } });
    expect(shownLook(n, "base", "rotateX")).toBe(20);
    expect(shownLook(n, "tablet", "rotateX")).toBe(10);
    expect(shownLook(n, "mobile", "rotateX")).toBe(10);
    expect(placedOn(n, "tablet")).toEqual({ x: 50, y: 50 });
    expect(placedOn(n, "mobile")).toBeNull();
  });

  it("sliders preview the shop's own variables", () => {
    expect(previewOf("rotateX", 25)).toEqual({ "--pt-rx": "25deg" });
    expect(previewOf("scale", 0.88)).toEqual({ "--pt-s": "0.88" });
    expect(previewOf("opacity", 0.5)).toEqual({ opacity: 0.5 });
    expect(previewOf("overlayOpacity", 0.4)).toEqual({ "--pt-ovo": "0.4" });
    expect(previewOf("nope", 1)).toEqual({});
  });

  it("a dragged element's place is its anchor's share of the container, from the line's start", () => {
    const holder = { x: 100, y: 50, w: 200, h: 100 };
    const box = { x: 140, y: 95, w: 20, h: 10 }; // centre at (150, 100)
    expect(placeFor(box, holder, "center", false)).toEqual({ x: 25, y: 50 });
    expect(placeFor(box, holder, "center", true)).toEqual({ x: 75, y: 50 });
    expect(placeFor(box, holder, "top-start", false)).toEqual({ x: 20, y: 45 });
    expect(placeFor({ ...box, x: -500 }, holder, "center", false).x).toBe(0);
  });

  it("ready motions fit the element and set only their own part", () => {
    const keys = (type: string) => presetsFor(type).map((p) => p.key);
    expect(keys("heading")).toContain("words");
    expect(keys("video")).not.toContain("words");
    expect(keys("video")).not.toContain("stagger");
    expect(keys("cell")).toContain("stagger");
    const tilt = MOTION_PRESETS.find((p) => p.key === "tilt-scroll")!;
    const float = MOTION_PRESETS.find((p) => p.key === "float")!;
    const m = withPreset(withPreset({ enter: { kind: "fade" } }, tilt), float);
    expect(Object.keys(m).sort()).toEqual(["enter", "loop", "scroll"]);
    expect(hasPreset(m, tilt) && hasPreset(m, float)).toBe(true);
    expect(hasPreset({ loop: { kind: "pulse" } }, float)).toBe(false);
  });

  it("a motion change drops empty parts, and nothing left stops the motion", () => {
    const n = node({});
    expect(motionOp(n, { enter: { kind: "up" }, loop: undefined })).toEqual({ op: "setMotion", nodeId: "n", motion: { enter: { kind: "up" } } });
    expect(motionOp(n, { loop: undefined })).toEqual({ op: "setMotion", nodeId: "n", motion: null });
    expect(motionOp(n, null)).toEqual({ op: "setMotion", nodeId: "n", motion: null });
  });
});
