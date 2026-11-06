import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SvgPanel } from "./SvgPanel";
import { ART_LIMITS } from "./svgArt";
import type { PageTreeNode } from "../api/pages.api";

const source = '<svg viewBox="0 0 10 10"><path fill="#ff0000" d="M0 0 L10 10"/></svg>';
const drawing = (id: string): PageTreeNode => ({ id, type: "svg", props: { label: { en: "Logo", ar: "شعار" } } });
afterEach(cleanup);
function mount() {
  const onOps = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const panel = (id: string, busy = false) => <QueryClientProvider client={client}><SvgPanel node={drawing(id)} lang="en" busy={busy} onOps={onOps} /></QueryClientProvider>;
  const view = render(panel("first"));
  const choose = (file: object) => fireEvent.change(screen.getByTestId("studio-svg-file"), { target: { files: [file] } });
  return { onOps, view, panel, choose };
}

test("pasted SVG becomes editable art while keeping translated descriptions", () => {
  const { onOps } = mount();
  fireEvent.change(screen.getByTestId("studio-svg-paste"), { target: { value: source } });
  fireEvent.click(screen.getByTestId("studio-svg-take"));
  expect(onOps).toHaveBeenCalledOnce();
  expect(onOps.mock.lastCall![1][0]).toMatchObject({ op: "setProps", nodeId: "first", props: { label: { en: "Logo", ar: "شعار" }, art: { viewBox: "0 0 10 10" } } });
});

test("a file read abandoned by changing the selection cannot edit the old drawing", async () => {
  const { onOps, choose, view, panel } = mount();
  let finish!: (text: string) => void;
  choose({ size: 90, text: () => new Promise<string>(resolve => { finish = resolve; }) });
  view.rerender(panel("second"));
  await act(async () => finish(source));
  expect(onOps).not.toHaveBeenCalled();
});

test("a file read abandoned by closing the panel cannot save", async () => {
  const { onOps, choose, view } = mount();
  let finish!: (text: string) => void;
  choose({ size: 90, text: () => new Promise<string>(resolve => { finish = resolve; }) });
  view.unmount();
  await act(async () => finish(source));
  expect(onOps).not.toHaveBeenCalled();
});

test("the newest import wins over an older slow file read", async () => {
  const { onOps, choose } = mount();
  let finish!: (text: string) => void;
  choose({ size: 90, text: () => new Promise<string>(resolve => { finish = resolve; }) });
  fireEvent.change(screen.getByTestId("studio-svg-paste"), { target: { value: source } });
  fireEvent.click(screen.getByTestId("studio-svg-take"));
  await act(async () => finish(source));
  expect(onOps).toHaveBeenCalledOnce();
});

test("an unreadable file reports an error without applying art", async () => {
  const { onOps, choose } = mount();
  await act(async () => choose({ size: 90, text: () => Promise.reject(new Error("Read failed")) }));
  expect(screen.getByTestId("studio-svg-note")).toBeVisible();
  expect(onOps).not.toHaveBeenCalled();
});

test("an oversized file is rejected before reading it", () => {
  const { onOps, choose } = mount();
  const text = vi.fn(() => Promise.resolve(source));
  choose({ size: ART_LIMITS.file + 1, text });
  expect(text).not.toHaveBeenCalled();
  expect(screen.getByTestId("studio-svg-note")).toBeVisible();
  expect(onOps).not.toHaveBeenCalled();
});
