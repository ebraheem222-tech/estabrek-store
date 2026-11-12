import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../../api/pages.api";
import type { Art } from "../svgArt";
import { artNodeAt } from "./focusKinds";
import { EaseField } from "./EaseField";
import { PathHandles, compose } from "./PathHandles";
import { parsePath, pathBox } from "./pathData";
import { SvgPartPanel, readTurn, writeTurn } from "./SvgPartPanel";

afterEach(cleanup);

const art: Art = { viewBox: "0 0 100 100", nodes: [{ t: "circle", a: { cx: "50", cy: "50", r: "40", fill: "#ff3366" } }, { t: "path", a: { d: "M10 10 L30 10 L30 30 Z" } }] };
const node = (props: Record<string, unknown> = {}) => ({ id: "art", type: "svg", props: { art, ...props } }) as PageTreeNode;
const lastProps = (fn: ReturnType<typeof vi.fn>) => fn.mock.lastCall![1][0].props as { art: Art; morph?: { on: string; pairs: Array<{ part: string; to: string }>; ease?: string } };

test("a circle turns into a path that looks the same, keeping its colours", () => {
  const onOps = vi.fn();
  render(<SvgPartPanel node={node()} part={{ id: "0", label: "Circle", kind: "circle", depth: 0 }} busy={false} onOps={onOps} />);
  fireEvent.click(screen.getByTestId("studio-focus-svg-topath"));
  const shape = artNodeAt(lastProps(onOps).art, "0")!;
  expect(shape.t).toBe("path");
  expect(shape.a.fill).toBe("#ff3366");
  expect(shape.a.r).toBeUndefined();
  const box = pathBox(parsePath(shape.a.d))!;
  expect(box.w).toBeCloseTo(80, 0);
});

test("choosing a ready shape makes the circle a path that morphs into it, fitted where the circle is", () => {
  const onOps = vi.fn();
  render(<SvgPartPanel node={node()} part={{ id: "0", label: "Circle", kind: "circle", depth: 0 }} busy={false} onOps={onOps} />);
  fireEvent.change(screen.getByTestId("studio-focus-svg-morph-to"), { target: { value: "shape:heart" } });
  const props = lastProps(onOps);
  expect(artNodeAt(props.art, "0")!.t).toBe("path");
  expect(props.morph).toMatchObject({ on: "hover", pairs: [{ part: "0" }] });
  const target = pathBox(parsePath(props.morph!.pairs[0].to))!;
  // Inside the circle's box (10–90), touching it on its longer side.
  expect(target.x).toBeGreaterThanOrEqual(9.5);
  expect(target.x + target.w).toBeLessThanOrEqual(90.5);
  expect(Math.max(target.w, target.h)).toBeCloseTo(80, 0);
});

test("another of the drawing's shapes, or a pasted one, can be the target; the morph's settings change and it's taken off", () => {
  const onOps = vi.fn();
  const morph = { on: "hover", duration: 0.6, pairs: [{ part: "1", to: "M0 0 L10 0 L5 9 Z" }] };
  const view = render(<SvgPartPanel node={node({ morph })} part={{ id: "1", label: "Path", kind: "path", depth: 0 }} busy={false} onOps={onOps} />);
  fireEvent.change(screen.getByTestId("studio-morph-on"), { target: { value: "click" } });
  expect(lastProps(onOps).morph).toMatchObject({ on: "click" });
  fireEvent.change(screen.getByTestId("studio-focus-svg-morph-paste"), { target: { value: '<svg viewBox="0 0 10 10"><rect x="0" y="0" width="10" height="10"/></svg>' } });
  fireEvent.click(screen.getByTestId("studio-focus-svg-morph-take"));
  expect(lastProps(onOps).morph!.pairs).toHaveLength(1);
  fireEvent.change(screen.getByTestId("studio-focus-svg-morph-to"), { target: { value: "part:0" } });
  expect(lastProps(onOps).morph!.pairs[0].to).toMatch(/^M10 50 A40 40/);
  fireEvent.click(screen.getByTestId("studio-morph-remove"));
  expect(lastProps(onOps).morph).toBeUndefined();
  view.unmount();
});

test("a part moves, turns and sizes around its own middle; a transform from its file isn't read as ours", () => {
  const t = writeTurn({ x: 5, y: -3, deg: 30, size: 1.5 }, { x: 20, y: 20 })!;
  expect(readTurn(t)).toEqual({ x: 5, y: -3, deg: 30, size: 1.5 });
  expect(writeTurn({ x: 0, y: 0, deg: 0, size: 1 }, { x: 1, y: 1 })).toBeNull();
  expect(readTurn(undefined)).toEqual({ x: 0, y: 0, deg: 0, size: 1 });
  expect(readTurn("matrix(1 0 0 1 3 3)")).toBeNull();
});

test("the curve field writes a spring or a named curve as the text the shop reads", () => {
  const onSave = vi.fn();
  render(<EaseField label="Curve" value="power2.out" busy={false} onSave={onSave} />);
  expect(screen.getByTestId("studio-ease")).toHaveAttribute("data-ease", "power2.out");
  fireEvent.change(screen.getByTestId("studio-ease-family"), { target: { value: "elastic" } });
  expect(onSave).toHaveBeenLastCalledWith("elastic.out");
  fireEvent.click(screen.getByTestId("studio-ease-spring"));
  expect(onSave).toHaveBeenLastCalledWith("spring(1,170,14)");
  fireEvent.click(screen.getByTestId("studio-ease-bezier"));
  expect(onSave).toHaveBeenLastCalledWith("cubic-bezier(0.25,0.1,0.25,1)");
  expect(screen.getAllByTestId("studio-ease-handle")).toHaveLength(2);
});

test("a path's point dragged on the canvas moves in the path's own numbers, through the matrix", () => {
  const onLive = vi.fn(), onDone = vi.fn();
  // The path's numbers are drawn at twice the size, 100px in.
  const matrix = compose([1, 0, 0, 1, 100, 100], [2, 0, 0, 2, 0, 0]);
  render(<PathHandles d="M10 10 L30 10" matrix={matrix} area={{ w: 400, h: 300 }} busy={false} onLive={onLive} onDone={onDone} />);
  const point = screen.getAllByTestId("studio-path-point")[1];
  expect(point.getAttribute("x")).toBe(String(160 - 4.5));
  const svg = screen.getByTestId("studio-path-handles");
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) });
  (point as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
  fireEvent.pointerDown(point, { button: 0, pointerId: 1, clientX: 160, clientY: 120 });
  fireEvent.pointerMove(point, { pointerId: 1, clientX: 180, clientY: 140 });
  expect(onLive).toHaveBeenLastCalledWith("M10 10 L40 20");
  fireEvent.pointerUp(point, { pointerId: 1, clientX: 180, clientY: 140 });
  expect(onDone).toHaveBeenLastCalledWith("M10 10 L40 20");
});
