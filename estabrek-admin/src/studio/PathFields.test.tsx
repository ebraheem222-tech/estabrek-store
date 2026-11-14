import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { PathSpec } from "../../../estabrek-storefront/src/pageTree/motionPath";
import { KeyframesPanel } from "./KeyframesPanel";
import { KEY_PRESETS } from "./keyframes";
import { PathFields, starterPath } from "./PathFields";

afterEach(cleanup);

/** The path fields, keeping what they save. */
function mount(start?: PathSpec) {
  const onSave = vi.fn();
  function Editor() {
    const [path, setPath] = useState<PathSpec | undefined>(start);
    return <PathFields path={path} busy={false} onSave={(next) => { onSave(next); setPath(next); }} />;
  }
  render(<Editor />);
  return onSave;
}

test("picking a shape starts a path, drawn at once; picking none takes it away", () => {
  const onSave = mount();
  expect(screen.queryByTestId("keys-path-drawing")).toBeNull();
  fireEvent.change(screen.getByTestId("keys-path-kind"), { target: { value: "arc" } });
  expect(onSave).toHaveBeenLastCalledWith(starterPath("arc"));
  // The curve as the shop plays it: from before its place to its place.
  const curve = screen.getByTestId("keys-path-drawing").querySelector("path")!.getAttribute("d")!;
  expect(curve.startsWith("M")).toBe(true);
  expect(curve.endsWith("L0 0")).toBe(true);
  fireEvent.change(screen.getByTestId("keys-path-kind"), { target: { value: "" } });
  expect(onSave).toHaveBeenLastCalledWith(undefined);
});

test("another shape keeps the size; turning, its place and its turns are saved", () => {
  const onSave = mount({ kind: "arc", w: 300, h: 90 });
  fireEvent.change(screen.getByTestId("keys-path-kind"), { target: { value: "wave" } });
  expect(onSave).toHaveBeenLastCalledWith({ kind: "wave", w: 300, h: 90 });
  // A wave goes up and down a number of times; an arc doesn't.
  expect(screen.getByTestId("keys-path-turns")).toBeTruthy();

  fireEvent.click(screen.getByTestId("keys-path-turn"));
  expect(onSave).toHaveBeenLastCalledWith({ kind: "wave", w: 300, h: 90, turn: true });
  fireEvent.change(screen.getByTestId("keys-path-rest"), { target: { value: "start" } });
  expect(onSave).toHaveBeenLastCalledWith({ kind: "wave", w: 300, h: 90, turn: true, rest: "start" });
});

test("a shape that ends where it began has no choice of place, and an arc no turns", () => {
  mount({ kind: "loop", w: 120, h: 120 });
  expect(screen.queryByTestId("keys-path-rest")).toBeNull();
  expect(screen.getByTestId("keys-path-turns")).toBeTruthy();
  cleanup();
  mount({ kind: "arc", w: 200, h: 60 });
  expect(screen.getByTestId("keys-path-rest")).toBeTruthy();
  expect(screen.queryByTestId("keys-path-turns")).toBeNull();
});

test("the keyframes panel saves the path with the animation, and the ready ones carry theirs", () => {
  const edits: PageDraftOp[][] = [];
  const node: PageTreeNode = { id: "h", type: "heading", props: { text: { en: "Hello" } }, motion: { keys: { on: "view", duration: 1, parts: { self: [{ at: 0, opacity: 0 }, { at: 100, opacity: 1 }] } } } };
  render(<KeyframesPanel node={node} busy={false} onOps={(_label, ops) => edits.push(ops)} onPlay={() => {}} />);
  fireEvent.change(screen.getByTestId("keys-path-kind"), { target: { value: "spiral" } });
  const op = edits.at(-1)![0] as unknown as { op: string; motion: { keys: { on: string; path: PathSpec; parts: unknown } } };
  expect(op.op).toBe("setMotion");
  expect(op.motion.keys.path).toEqual(starterPath("spiral"));
  // The rest of the animation is kept.
  expect(op.motion.keys.on).toBe("view");

  const ready = KEY_PRESETS.filter((p) => p.keys.path);
  expect(ready.map((p) => p.key)).toEqual(["path-arc", "path-spiral", "path-eight", "path-wave"]);
});
