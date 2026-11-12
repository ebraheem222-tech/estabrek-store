import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../../api/pages.api";
import { focusParts } from "./focusKinds";
import { SparkleHandles } from "./SparkleHandles";
import { SparklePanel } from "./SparklePanel";

afterEach(cleanup);
const photo = (sparkle?: unknown) => ({ id: "photo", type: "image", props: { src: "/a.webp", alt: { en: "A" }, ...(sparkle ? { sparkle } : {}) } }) as PageTreeNode;
const lastProps = (fn: ReturnType<typeof vi.fn>) => fn.mock.lastCall![1][0].props as { src: string; sparkle?: { points: Array<{ x: number; y: number; s?: number }>; shape?: string; color?: string; when?: string } };

test("finding asks the frame with the chosen way, count and spread; the pen is a switch", () => {
  const onFind = vi.fn(), onPen = vi.fn();
  render(<SparklePanel node={photo()} busy={false} onOps={vi.fn()} onFind={onFind} finding={false} note={null} pen={false} onPen={onPen} />);
  fireEvent.change(screen.getByTestId("studio-sparkle-mode"), { target: { value: "corners" } });
  fireEvent.click(screen.getByTestId("studio-sparkle-find"));
  expect(onFind).toHaveBeenLastCalledWith({ mode: "corners", count: 18, spread: 0.06, productOnly: false });
  fireEvent.click(screen.getByTestId("studio-sparkle-pen"));
  expect(onPen).toHaveBeenLastCalledWith(true);
  // No look settings before there are stars.
  expect(screen.queryByTestId("studio-sparkle-look")).toBeNull();
});

test("the stars' look changes and keeps their places; one chosen star is sized or taken away; all are cleared", () => {
  const onOps = vi.fn();
  const sparkle = { points: [{ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 }] };
  render(<SparklePanel node={photo(sparkle)} busy={false} onOps={onOps} onFind={vi.fn()} finding={false} note={null} pen={false} onPen={vi.fn()} chosen="s1" />);
  fireEvent.click(screen.getAllByTestId("studio-sparkle-shape").find((b) => b.getAttribute("data-shape") === "star")!);
  expect(lastProps(onOps).sparkle).toMatchObject({ shape: "star", points: sparkle.points });
  expect(lastProps(onOps).src).toBe("/a.webp");
  fireEvent.change(screen.getByTestId("studio-sparkle-colour"), { target: { value: "#ffd76a" } });
  expect(lastProps(onOps).sparkle!.color).toBe("#ffd76a");
  fireEvent.change(screen.getByTestId("studio-sparkle-when"), { target: { value: "hover" } });
  expect(lastProps(onOps).sparkle!.when).toBe("hover");
  fireEvent.click(screen.getByTestId("studio-sparkle-one-remove"));
  expect(lastProps(onOps).sparkle!.points).toEqual([{ x: 0.2, y: 0.3 }]);
  fireEvent.click(screen.getByTestId("studio-sparkle-clear"));
  expect(lastProps(onOps).sparkle).toBeUndefined();
});

test("a picture's parts are its stars", () => {
  expect(focusParts(photo({ points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }] }), null).map((p) => p.id)).toEqual(["s0", "s1"]);
  expect(focusParts(photo(), null)).toEqual([]);
});

test("a star dragged on the canvas lands at its new place over the picture; a double-click takes it away", () => {
  const onMove = vi.fn(), onRemove = vi.fn(), onPick = vi.fn();
  render(<SparkleHandles box={{ x: 100, y: 50, w: 200, h: 100 }} points={[{ x: 0.5, y: 0.5 }]} chosen={null} busy={false} onMove={onMove} onRemove={onRemove} onPick={onPick} />);
  const area = screen.getByTestId("studio-sparkle-handles");
  area.getBoundingClientRect = () => ({ left: 100, top: 50, right: 300, bottom: 150, width: 200, height: 100, x: 100, y: 50, toJSON: () => ({}) });
  const dot = screen.getByTestId("studio-sparkle-dot");
  (dot as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
  fireEvent.pointerDown(dot, { button: 0, pointerId: 3, clientX: 200, clientY: 100 });
  expect(onPick).toHaveBeenLastCalledWith(0);
  fireEvent.pointerMove(dot, { pointerId: 3, clientX: 250, clientY: 125 });
  fireEvent.pointerUp(dot, { pointerId: 3, clientX: 250, clientY: 125 });
  expect(onMove).toHaveBeenLastCalledWith(0, { x: 0.75, y: 0.75 });
  fireEvent.doubleClick(dot);
  expect(onRemove).toHaveBeenLastCalledWith(0);
});
