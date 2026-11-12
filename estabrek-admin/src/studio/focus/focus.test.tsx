import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../../api/pages.api";
import type { Art } from "../svgArt";
import { indexTree } from "../treeIndex";
import { artNodeAt, artParts, canFocus, focusGroup, focusParts, focusTrail, withArtAttrs } from "./focusKinds";
import { focusView, sameView, viewAt } from "./focusView";
import { FocusBar, FocusMask, FocusParts } from "./FocusChrome";
import { SvgPartPanel } from "./SvgPartPanel";

afterEach(cleanup);

const art: Art = {
  viewBox: "0 0 100 100",
  nodes: [
    { t: "defs", a: {}, c: [{ t: "linearGradient", a: { id: "g1" }, c: [{ t: "stop", a: { offset: "0", "stop-color": "#fff" } }] }] },
    { t: "g", a: { id: "petal-ring" }, c: [{ t: "circle", a: { cx: "50", cy: "50", r: "10", fill: "#ff0000" } }, { t: "path", a: { d: "M0 0L10 10", stroke: "#000" } }] },
    { t: "rect", a: { x: "0", y: "0", width: "10", height: "10" } },
  ],
};

test("each kind of element opens its own editor; containers are those that hold elements", () => {
  expect(focusGroup({ type: "svg" })).toBe("svg");
  expect(focusGroup({ type: "image" })).toBe("image");
  expect(focusGroup({ type: "video" })).toBe("video");
  expect(focusGroup({ type: "model3d" })).toBe("model");
  expect(focusGroup({ type: "button" })).toBe("text");
  expect(focusGroup({ type: "section" })).toBe("container");
  expect(focusGroup({ type: "testimonials" })).toBe("other");
  expect(focusGroup({ type: "testimonials", children: [{ id: "x", type: "text" } as PageTreeNode] })).toBe("container");
  expect(canFocus({ type: "page" })).toBe(false);
  expect(canFocus({ type: "image" })).toBe(true);
});

test("a drawing's parts are its shapes, nested under their groups, without definitions or gradients", () => {
  const parts = artParts(art);
  expect(parts.map((p) => [p.id, p.kind, p.depth])).toEqual([["1", "g", 0], ["1.0", "circle", 1], ["1.1", "path", 1], ["2", "rect", 0]]);
  // A named shape shows its name; the others are numbered by kind.
  expect(parts[0].label).toBe("petal ring");
  expect(parts[3].label).toMatch(/1$/);
  expect(artNodeAt(art, "1.0")?.t).toBe("circle");
  expect(artNodeAt(art, "9")).toBeNull();
  expect(artNodeAt(art, "x")).toBeNull();
});

test("one shape's colour changes alone, and an empty value takes it away; the rest of the drawing is untouched", () => {
  const next = withArtAttrs(art, "1.0", { fill: "#00ff00", stroke: "accent" });
  expect(artNodeAt(next, "1.0")?.a).toMatchObject({ fill: "#00ff00", stroke: "accent", r: "10" });
  expect(artNodeAt(next, "1.1")).toBe(artNodeAt(art, "1.1"));
  expect(next.nodes[0]).toBe(art.nodes[0]);
  expect(artNodeAt(withArtAttrs(next, "1.0", { fill: null }), "1.0")?.a.fill).toBeUndefined();
  expect(withArtAttrs(art, "7", { fill: "#000" })).toBe(art);
});

test("a container lists its elements; the path runs from the opened element to what's chosen in it", () => {
  const tree = { root: { id: "page", type: "page", children: [{ id: "s1", type: "section", children: [{ id: "h", type: "heading", name: "Title" }, { id: "pic", type: "image" }] }] } } as unknown as Parameters<typeof indexTree>[0];
  const index = indexTree(tree);
  const parts = focusParts(index.nodes.get("s1")!.node, index);
  expect(parts.map((p) => [p.id, p.nodeId, p.label])).toEqual([["h", "h", "Title"], ["pic", "pic", expect.any(String)]]);
  expect(focusTrail(index, "s1", "pic")).toEqual(["s1", "pic"]);
  expect(focusTrail(index, "s1", "s1")).toEqual(["s1"]);
  expect(focusTrail(index, "pic", "h")).toBeNull();
});

test("the focus view fills most of the canvas, centred under the path bar, and never comes closer than 4×", () => {
  const view = { zoom: 0.5, pan: { x: 100, y: 50 } };
  // A 200×100 page box, now drawn at half size at (200, 150).
  const v = focusView({ x: 200, y: 150, w: 100, h: 50 }, view, { w: 1000, h: 700 }, 0.8, 40);
  expect(v.zoom).toBeCloseTo(4);
  const tiny = focusView({ x: 200, y: 150, w: 400, h: 100 }, view, { w: 1000, h: 700 }, 0.8, 40);
  // 800×200 on the page fills 80% of the width: zoom 1.
  expect(tiny.zoom).toBeCloseTo(1);
  // Its middle lands in the middle of the room under the bar.
  const midX = (200 + 200 - 100) / 0.5, midY = (150 + 50 - 50) / 0.5;
  expect(tiny.pan.x + midX * tiny.zoom).toBeCloseTo(500);
  expect(tiny.pan.y + midY * tiny.zoom).toBeCloseTo(40 + 330);
});

test("the glide starts and ends on the views, and zooms around one still point", () => {
  const a = { zoom: 0.5, pan: { x: 0, y: 0 } }, b = { zoom: 2, pan: { x: -300, y: -150 } };
  expect(sameView(viewAt(a, b, 0), a)).toBe(true);
  expect(sameView(viewAt(a, b, 1), b)).toBe(true);
  // The point the zoom goes around: pan = c - P·zoom for every step.
  const P = { x: (b.pan.x - a.pan.x) / (a.zoom - b.zoom), y: (b.pan.y - a.pan.y) / (a.zoom - b.zoom) };
  const c = { x: a.pan.x + P.x * a.zoom, y: a.pan.y + P.y * a.zoom };
  const mid = viewAt(a, b, 0.4);
  expect(mid.pan.x + P.x * mid.zoom).toBeCloseTo(c.x);
  expect(mid.pan.y + P.y * mid.zoom).toBeCloseTo(c.y);
});

test("the mask leaves a hole over the opened element; the bar's path leaves or picks; the parts list picks and opens", () => {
  const { container } = render(<FocusMask box={{ x: 10, y: 20, w: 100, h: 50 }} area={{ w: 400, h: 300 }} />);
  expect(container.querySelector('[data-testid="studio-focus-mask"] path')?.getAttribute("fill-rule")).toBe("evenodd");
  cleanup();
  const onCrumb = vi.fn(), onExit = vi.fn(), onShowAll = vi.fn();
  render(<FocusBar group="svg" crumbs={[{ id: "page", label: "Page", inside: false }, { id: "art", label: "Drawing", inside: true }]} current="art" part={null} showAll={false} onCrumb={onCrumb} onPart={() => undefined} onShowAll={onShowAll} onExit={onExit} />);
  fireEvent.click(screen.getByText("Page"));
  expect(onCrumb).toHaveBeenLastCalledWith("page", false);
  fireEvent.click(screen.getByTestId("studio-focus-all"));
  expect(onShowAll).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByTestId("studio-focus-exit"));
  expect(onExit).toHaveBeenCalledOnce();
  cleanup();
  const onPick = vi.fn(), onOpen = vi.fn();
  render(<FocusParts title="Parts" parts={[{ id: "h", nodeId: "h", label: "Title", kind: "heading", depth: 0 }]} chosen={null} onPick={onPick} onOpen={onOpen} empty="none" />);
  fireEvent.click(screen.getByTestId("studio-focus-part"));
  expect(onPick).toHaveBeenCalledOnce();
  fireEvent.doubleClick(screen.getByTestId("studio-focus-part"));
  expect(onOpen).toHaveBeenCalledOnce();
});

test("a drawing's part panel changes that shape only, and refuses values the drawing's rules don't take", () => {
  const onOps = vi.fn();
  const node = { id: "art", type: "svg", props: { art, label: { en: "Logo" } } } as PageTreeNode;
  render(<SvgPartPanel node={node} part={{ id: "1.0", label: "Circle", kind: "circle", depth: 1 }} busy={false} onOps={onOps} />);
  fireEvent.change(screen.getByTestId("studio-focus-svg-fill"), { target: { value: "none" } });
  const props = onOps.mock.lastCall![1][0].props as { art: Art; label: unknown };
  expect(artNodeAt(props.art, "1.0")?.a.fill).toBe("none");
  expect(props.label).toEqual({ en: "Logo" });
  fireEvent.click(screen.getByTestId("studio-focus-svg-hide"));
  expect(artNodeAt(onOps.mock.lastCall![1][0].props.art, "1.0")?.a.opacity).toBe("0");
});
