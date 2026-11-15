// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { PICTURE_FX, canvasSize, fitUv, pictureFxOf, pictureFxOnPointer } from "../../../shared/pictureFx";
import { PICTURE_FX_NAMES, PictureFxPanel } from "./PictureFxPanel";

// A picture's live effect (shared/pictureFx.ts): how its setting is read, where a point of its box falls in the
// picture (the sum the shop's shader does), and the editor's panel.

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});
const near = (got: { u: number; v: number } | null, u: number, v: number) => {
  expect(got).not.toBeNull();
  expect(got!.u).toBeCloseTo(u, 4);
  expect(got!.v).toBeCloseTo(v, 4);
};

test("a picture's effect is one of the four kinds, its strength kept in range; anything else is none", () => {
  expect([...PICTURE_FX]).toEqual(["ripple", "liquid", "shift", "reveal"]);
  expect(pictureFxOf({ kind: "ripple" })).toEqual({ kind: "ripple" });
  expect(pictureFxOf({ kind: "liquid", strength: 0.35, more: 1 })).toEqual({ kind: "liquid", strength: 0.35 });
  expect(pictureFxOf({ kind: "shift", strength: 7 })).toEqual({ kind: "shift", strength: 1 });
  expect(pictureFxOf({ kind: "reveal", strength: -2 })).toEqual({ kind: "reveal", strength: 0.1 });
  expect(pictureFxOf({ kind: "reveal", strength: "0.5" })).toEqual({ kind: "reveal" });
  for (const bad of [null, undefined, "ripple", {}, { kind: "melt" }, { kind: 3 }, []]) expect(pictureFxOf(bad)).toBeNull();
  // Three answer the pointer; a reveal plays once when the picture comes into view.
  expect(PICTURE_FX.map(pictureFxOnPointer)).toEqual([true, true, true, false]);
});

test("a point of the box falls where CSS puts the picture: filling the box, or shown whole", () => {
  const pic = { w: 400, h: 300 };
  // The box has the picture's own proportions: the same point.
  near(fitUv(0.7375, 0.683, { w: 400, h: 300 }, pic, "cover"), 0.7375, 0.683);
  near(fitUv(0.2, 0.9, { w: 800, h: 600 }, pic, "contain"), 0.2, 0.9);
  // A square box filled by a wide picture: three quarters of its width show, centred.
  near(fitUv(0, 0.5, { w: 300, h: 300 }, pic, "cover"), 0.125, 0.5);
  near(fitUv(1, 0.5, { w: 300, h: 300 }, pic, "cover"), 0.875, 0.5);
  near(fitUv(0.8167, 0.683, { w: 300, h: 300 }, pic, "cover"), 0.7375, 0.683);
  // The focus point moves what shows: at the start, the picture's start; at the end, its end.
  near(fitUv(0, 0.5, { w: 300, h: 300 }, pic, "cover", { x: 0, y: 0.5 }), 0, 0.5);
  near(fitUv(1, 0.5, { w: 300, h: 300 }, pic, "cover", { x: 1, y: 0.5 }), 1, 0.5);
  // A tall box filled by a wide picture: all its height, a share of its width.
  near(fitUv(0.5, 0.25, { w: 200, h: 400 }, pic, "cover"), 0.5, 0.25);
  near(fitUv(0, 0, { w: 200, h: 400 }, pic, "cover"), 0.3125, 0);
  // Shown whole in a square box: it takes three quarters of the height, with empty bands above and below.
  near(fitUv(0.5, 0.5, { w: 300, h: 300 }, pic, "contain"), 0.5, 0.5);
  near(fitUv(0, 0.125, { w: 300, h: 300 }, pic, "contain"), 0, 0);
  near(fitUv(1, 0.875, { w: 300, h: 300 }, pic, "contain"), 1, 1);
  expect(fitUv(0.5, 0.05, { w: 300, h: 300 }, pic, "contain")).toBeNull();
  expect(fitUv(0.5, 0.95, { w: 300, h: 300 }, pic, "contain")).toBeNull();
  // Shown whole at the top: the band is all below.
  near(fitUv(0.5, 0, { w: 300, h: 300 }, pic, "contain", { x: 0.5, y: 0 }), 0.5, 0);
  expect(fitUv(0.5, 0.8, { w: 300, h: 300 }, pic, "contain", { x: 0.5, y: 0 })).toBeNull();
  // Nothing to place.
  expect(fitUv(0.5, 0.5, { w: 0, h: 300 }, pic, "cover")).toBeNull();
  expect(fitUv(0.5, 0.5, { w: 300, h: 300 }, { w: 400, h: 0 }, "cover")).toBeNull();
});

test("the canvas is as sharp as the screen, up to twice, and never bigger than a graphics card should fill", () => {
  expect(canvasSize({ w: 400, h: 300 }, 1)).toEqual({ w: 400, h: 300 });
  expect(canvasSize({ w: 400, h: 300 }, 2)).toEqual({ w: 800, h: 600 });
  expect(canvasSize({ w: 400, h: 300 }, 3)).toEqual({ w: 800, h: 600 });
  expect(canvasSize({ w: 400, h: 300 }, 0)).toEqual({ w: 400, h: 300 });
  const big = canvasSize({ w: 1920, h: 1080 }, 2);
  expect(big.w * big.h).toBeLessThanOrEqual(1_600_000);
  expect(big.w / big.h).toBeCloseTo(16 / 9, 1);
  expect(canvasSize({ w: 0, h: 0 }, 1)).toEqual({ w: 1, h: 1 });
});

test("the panel: a kind, its strength, a try on the page; none takes it off", () => {
  setLangForTests("en");
  const edits: unknown[] = [];
  const onTry = vi.fn();
  const panel = (props: Record<string, unknown>) => <PictureFxPanel node={{ id: "p", type: "image", props } as PageTreeNode} busy={false} onOps={(_l, ops) => edits.push(ops[0])} onTry={onTry} />;
  const view = render(panel({ src: "/a.webp" }));
  const kind = () => screen.getByTestId("studio-picture-fx-kind") as HTMLSelectElement;
  // None yet: the four kinds are offered by name, and nothing else shows.
  expect(kind().value).toBe("");
  expect([...kind().options].map((o) => o.value)).toEqual(["", "ripple", "liquid", "shift", "reveal"]);
  expect([...kind().options][1].textContent).toBe("Water ripple (when the shopper is on it)");
  expect(screen.queryByTestId("studio-picture-fx-try")).toBeNull();
  fireEvent.change(kind(), { target: { value: "ripple" } });
  expect(edits.at(-1)).toEqual({ op: "setProps", nodeId: "p", props: { src: "/a.webp", glfx: { kind: "ripple" } } });
  // With one: what it does, its strength (60 % when not set), and a try.
  view.rerender(panel({ src: "/a.webp", glfx: { kind: "ripple" } }));
  expect(screen.getByTestId("studio-picture-fx").dataset.kind).toBe("ripple");
  expect(screen.getByTestId("studio-picture-fx-hint").textContent).toContain("Rings of water");
  expect(screen.getByTestId("studio-picture-fx-try").textContent).toContain("the pointer crosses by itself");
  fireEvent.click(screen.getByTestId("studio-picture-fx-try"));
  expect(onTry).toHaveBeenCalledTimes(1);
  // Another kind keeps the strength that was set.
  view.rerender(panel({ src: "/a.webp", glfx: { kind: "ripple", strength: 0.3 } }));
  fireEvent.change(kind(), { target: { value: "reveal" } });
  expect(edits.at(-1)).toEqual({ op: "setProps", nodeId: "p", props: { src: "/a.webp", glfx: { kind: "reveal", strength: 0.3 } } });
  view.rerender(panel({ src: "/a.webp", glfx: { kind: "reveal", strength: 0.3 } }));
  expect(screen.getByTestId("studio-picture-fx-try").textContent).not.toContain("pointer");
  // None: the effect goes, the picture's other settings stay.
  fireEvent.change(kind(), { target: { value: "" } });
  expect(edits.at(-1)).toEqual({ op: "setProps", nodeId: "p", props: { src: "/a.webp", glfx: undefined } });
  // Every kind has its name in the three languages.
  for (const k of PICTURE_FX) expect(PICTURE_FX_NAMES[k].split("|")).toHaveLength(3);
});
