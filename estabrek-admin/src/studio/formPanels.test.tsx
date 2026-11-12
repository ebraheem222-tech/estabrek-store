import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../api/pages.api";
import { CodePanel, FormPanel } from "./FormPanels";

afterEach(cleanup);
const node = (style?: Record<string, unknown>, props: Record<string, unknown> = {}) => ({ id: "card", type: "stack", props, style: style ? { base: style } : undefined }) as unknown as PageTreeNode;
const lastStyle = (onOps: ReturnType<typeof vi.fn>) => onOps.mock.lastCall![1][0].style?.form;

test("a corner and an edge picked on the drawing, each its own kind; a ready shape; the whole shape", () => {
  const onOps = vi.fn();
  const { rerender } = render(<FormPanel node={node()} screen="base" busy={false} onOps={onOps} />);
  fireEvent.click(screen.getAllByTestId("studio-form-corner-kind").find((b) => b.dataset.kind === "squircle")!);
  expect(lastStyle(onOps)).toEqual({ corners: { tl: { kind: "squircle", size: 24 } } });

  rerender(<FormPanel node={node({ form: { corners: { tl: { kind: "squircle", size: 24 } } } })} screen="base" busy={false} onOps={onOps} />);
  fireEvent.click(screen.getByTestId("studio-form-corner-all"));
  expect(Object.keys(lastStyle(onOps).corners)).toEqual(["tl", "tr", "br", "bl"]);

  fireEvent.click(screen.getAllByTestId("studio-form-target").find((b) => b.getAttribute("data-target") === "bottom")!);
  fireEvent.click(screen.getAllByTestId("studio-form-edge-kind").find((b) => b.dataset.kind === "wave")!);
  expect(lastStyle(onOps)).toEqual({ corners: { tl: { kind: "squircle", size: 24 } }, edges: { bottom: { kind: "wave", depth: 16 } } });

  fireEvent.click(screen.getAllByTestId("studio-form-preset").find((b) => b.dataset.key === "ticket")!);
  expect(lastStyle(onOps).edges).toEqual({ left: { kind: "notch", depth: 14 }, right: { kind: "notch", depth: 14 } });
  fireEvent.click(screen.getAllByTestId("studio-form-preset").find((b) => b.dataset.key === "star")!);
  expect(lastStyle(onOps)).toEqual({ whole: { kind: "polygon", n: 5, inner: 0.48 } });
  // The drawing shows the shape.
  rerender(<FormPanel node={node({ form: { whole: { kind: "polygon", n: 5, inner: 0.48 } } })} screen="base" busy={false} onOps={onOps} />);
  expect(screen.getByTestId("studio-form-path").getAttribute("d")!.split("L")).toHaveLength(10);
});

test("a typed equation is checked as it's typed; only a good one is kept", () => {
  const onOps = vi.fn();
  render(<FormPanel node={node({ form: { edges: { top: { kind: "fn", depth: 20, fn: "x" } } } })} screen="base" busy={false} onOps={onOps} />);
  fireEvent.click(screen.getAllByTestId("studio-form-target").find((b) => b.getAttribute("data-target") === "top")!);
  const input = screen.getByTestId("studio-form-edge-fn");
  fireEvent.change(input, { target: { value: "alert(1)" } });
  expect(screen.getByTestId("studio-form-fn-bad")).toBeTruthy();
  fireEvent.blur(input, { target: { value: "alert(1)" } });
  expect(onOps).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "0.5 + 0.5*sin(x*PI*6)" } });
  fireEvent.blur(input, { target: { value: "0.5 + 0.5*sin(x*PI*6)" } });
  expect(lastStyle(onOps).edges.top.fn).toBe("0.5 + 0.5*sin(x*PI*6)");
});

test("its own CSS: Tailwind built for the element and saved; an unknown class says which", async () => {
  const onOps = vi.fn();
  render(<CodePanel node={node(undefined, { gap: 8 })} busy={false} onOps={onOps} />);
  fireEvent.change(screen.getByTestId("studio-code-tw"), { target: { value: "rounded-xl hover:scale-105 nope-nope" } });
  await act(async () => { fireEvent.click(screen.getByTestId("studio-code-apply")); });
  expect((await screen.findByTestId("studio-code-error", {}, { timeout: 10000 })).textContent).toContain("nope-nope");
  expect(onOps).not.toHaveBeenCalled();
  fireEvent.change(screen.getByTestId("studio-code-tw"), { target: { value: "rounded-xl hover:scale-105" } });
  fireEvent.change(screen.getByTestId("studio-code-css"), { target: { value: "color: #8b1538;" } });
  await act(async () => { fireEvent.click(screen.getByTestId("studio-code-apply")); });
  await vi.waitFor(() => expect(onOps).toHaveBeenCalled(), { timeout: 10000 });
  const props = onOps.mock.lastCall![1][0].props;
  expect(props.gap).toBe(8);
  expect(props.code.tw).toBe("rounded-xl hover:scale-105");
  expect(props.code.out.startsWith(".pt-card{")).toBe(true);
  expect(props.code.out.endsWith(".pt-card{color: #8b1538;}")).toBe(true);
});
