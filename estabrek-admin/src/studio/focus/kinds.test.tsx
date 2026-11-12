import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../../api/pages.api";
import { curvePath, plainWords, safeCurve } from "../../../../shared/textCurve";
import { focusParts } from "./focusKinds";
import { CurvePanel, SlidePanel } from "./KindPanels";

afterEach(cleanup);

test("an arc bends up or down, a wave swings, a circle has its words' middle at the top", () => {
  const up = curvePath("arc", 80), down = curvePath("arc", -80);
  // The control point above the ends when bent up, below when bent down.
  const ctrl = (d: string) => Number(/Q500 (-?[\d.]+)/.exec(d)![1]);
  const end = (d: string) => Number(/^M40 ([\d.]+)/.exec(d)![1]);
  expect(ctrl(up.d)).toBeLessThan(end(up.d));
  expect(ctrl(down.d)).toBeGreaterThan(end(down.d));
  expect(curvePath("wave", 50).d).toMatch(/^M40 150 C270/);
  expect(curvePath("circle").viewBox).toBe("0 0 1000 1000");
  expect(safeCurve({ kind: "wave", bend: 30, size: 90, space: 4 })).toEqual({ kind: "wave", bend: 30, size: 90, space: 4 });
  expect(safeCurve({ kind: "spiral" })).toBeNull();
  expect(safeCurve({ kind: "arc", bend: 400 })).toEqual({ kind: "arc" });
  expect(plainWords("[b]Summer[/b] [color=#f00]sale[/color]")).toBe("Summer sale");
});

test("the curve panel puts the words on an arc, bends it and takes it off", () => {
  const onOps = vi.fn();
  const node = { id: "h", type: "heading", props: { text: { en: "Hi" }, level: 2 } } as PageTreeNode;
  const view = render(<CurvePanel node={node} busy={false} onOps={onOps} />);
  fireEvent.click(screen.getAllByTestId("studio-curve-kind").find((b) => b.getAttribute("data-kind") === "arc")!);
  expect(onOps.mock.lastCall![1][0].props).toMatchObject({ text: { en: "Hi" }, curve: { kind: "arc" } });
  view.unmount();
  render(<CurvePanel node={{ ...node, props: { ...node.props, curve: { kind: "arc" } } }} busy={false} onOps={onOps} />);
  fireEvent.click(screen.getAllByTestId("studio-curve-kind").find((b) => b.getAttribute("data-kind") === "none")!);
  expect(onOps.mock.lastCall![1][0].props.curve).toBeUndefined();
});

test("a slider's parts are its slides; a slide moves, is captioned and taken away", () => {
  const slides = [{ src: "/a.webp", kind: "image", caption: { en: "A" } }, { src: "/b.webp", kind: "image" }, { src: "/c.webp", kind: "image" }];
  const node = { id: "s", type: "slider", props: { slides } } as PageTreeNode;
  expect(focusParts(node, null).map((p) => p.id)).toEqual(["slide-0", "slide-1", "slide-2"]);
  expect(focusParts(node, null)[0].label).toMatch(/A$/);
  const onOps = vi.fn(), onShow = vi.fn();
  render(<SlidePanel node={node} index={1} lang="en" busy={false} onOps={onOps} onShow={onShow} />);
  fireEvent.click(screen.getByTestId("studio-focus-slide-show"));
  expect(onShow).toHaveBeenLastCalledWith(1);
  fireEvent.click(screen.getByTestId("studio-focus-slide-after"));
  expect(onOps.mock.lastCall![1][0].props.slides.map((x: { src: string }) => x.src)).toEqual(["/a.webp", "/c.webp", "/b.webp"]);
  fireEvent.change(screen.getByTestId("studio-focus-slide-caption"), { target: { value: "B" } });
  fireEvent.blur(screen.getByTestId("studio-focus-slide-caption"));
  expect(onOps.mock.lastCall![1][0].props.slides[1].caption).toEqual({ en: "B" });
  fireEvent.click(screen.getByTestId("studio-focus-slide-remove"));
  expect(onOps.mock.lastCall![1][0].props.slides).toHaveLength(2);
});
