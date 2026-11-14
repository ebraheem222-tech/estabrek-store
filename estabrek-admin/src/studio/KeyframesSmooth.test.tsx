import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { KeyframesPanel } from "./KeyframesPanel";
import { KEY_PRESETS } from "./keyframes";

afterEach(cleanup);

type KeysOp = { op: string; motion: { keys: { smooth?: boolean; on: string; parts: { self: unknown[] } } } };
const withKeys = (keys: Record<string, unknown>): PageTreeNode => ({ id: "h", type: "heading", props: { text: { en: "Hello" } }, motion: { keys: { on: "loop", duration: 2, parts: { self: [{ at: 0, x: 0, y: 0 }, { at: 50, x: 100, y: 0 }, { at: 100, x: 100, y: 100 }] }, ...keys } } });

test("keyframes are made smooth with one tick, and straight again with another", () => {
  const edits: PageDraftOp[][] = [];
  const view = render(<KeyframesPanel node={withKeys({})} busy={false} onOps={(_label, ops) => edits.push(ops)} onPlay={() => {}} />);
  const tick = () => screen.getByTestId("keys-smooth") as HTMLInputElement;
  expect(tick().checked).toBe(false);
  fireEvent.click(tick());
  const on = edits.at(-1)![0] as unknown as KeysOp;
  expect(on.op).toBe("setMotion");
  expect(on.motion.keys.smooth).toBe(true);
  // The moments themselves are kept as they were.
  expect(on.motion.keys.parts.self).toHaveLength(3);

  view.rerender(<KeyframesPanel node={withKeys({ smooth: true })} busy={false} onOps={(_label, ops) => edits.push(ops)} onPlay={() => {}} />);
  expect(tick().checked).toBe(true);
  fireEvent.click(tick());
  expect((edits.at(-1)![0] as unknown as KeysOp).motion.keys).not.toHaveProperty("smooth");
});

test("the ready orbit goes round smoothly", () => {
  expect(KEY_PRESETS.find((p) => p.key === "orbit")!.keys.smooth).toBe(true);
});
