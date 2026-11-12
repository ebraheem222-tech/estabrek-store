import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../api/pages.api";
import { MotionPanel } from "./LookPanels";
import { BodyPanel, WorldPanel, bakeOps, unbakeOps } from "./PhysicsPanels";
import { costOf } from "./focus/perfCost";

afterEach(cleanup);
const kids: PageTreeNode[] = [
  { id: "a", type: "heading", props: { text: { en: "A" } } } as PageTreeNode,
  { id: "b", type: "button", props: { label: { en: "B" } }, motion: { hover: { kind: "lift" } } } as PageTreeNode,
];
const host = (world?: Record<string, unknown>) => ({ id: "w", type: "section", props: world ? { world } : {}, children: kids }) as PageTreeNode;

test("an element's own physics: a kind picked, its settings shown for it", () => {
  const onOps = vi.fn();
  const node = { id: "h", type: "heading", props: { text: { en: "Hi" } } } as PageTreeNode;
  const { rerender } = render(<MotionPanel node={node} busy={false} onOps={onOps} onPlay={() => {}} />);
  fireEvent.change(screen.getByTestId("studio-physics-kind"), { target: { value: "drop" } });
  expect(onOps.mock.lastCall![1]).toEqual([{ op: "setMotion", nodeId: "h", motion: { physics: { kind: "drop" } } }]);
  rerender(<MotionPanel node={{ ...node, motion: { physics: { kind: "drop" } } } as PageTreeNode} busy={false} onOps={onOps} onPlay={() => {}} />);
  expect(screen.getByTestId("studio-physics-bounce")).toBeTruthy();
  expect(screen.queryByTestId("studio-physics-stiffness")).toBeNull();
  rerender(<MotionPanel node={{ ...node, motion: { physics: { kind: "magnet" } } } as PageTreeNode} busy={false} onOps={onOps} onPlay={() => {}} />);
  expect(screen.getByTestId("studio-physics-stiffness")).toBeTruthy();
});

test("a world: switched on, gravity turned over, tried, baked into each body's keyframes", async () => {
  const onOps = vi.fn();
  const { rerender } = render(<WorldPanel node={host()} busy={false} onOps={onOps} onPlay={() => {}} onStop={() => {}} onBake={async () => null} />);
  fireEvent.click(screen.getByTestId("studio-world-on"));
  expect(onOps.mock.lastCall![1]).toEqual([{ op: "setProps", nodeId: "w", props: { world: { start: "drop", walls: "open", bounce: 0.4, drag: true } } }]);

  const onPlay = vi.fn();
  const frames = [{ at: 0, x: 0, y: -200, rz: 0 }, { at: 100, x: 0, y: 0, rz: 4, ease: "fall" }];
  const onBake = vi.fn(async () => ({ a: frames }));
  rerender(<WorldPanel node={host({ start: "drop" })} busy={false} onOps={onOps} onPlay={onPlay} onStop={() => {}} onBake={onBake} />);
  fireEvent.click(screen.getAllByTestId("studio-world-gravity").find((b) => b.dataset.way === "up")!);
  expect(onOps.mock.lastCall![1][0].props.world).toMatchObject({ gx: 0, gy: -1 });
  fireEvent.click(screen.getByTestId("studio-world-play"));
  expect(onPlay).toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByTestId("studio-world-bake")); });
  expect(onBake).toHaveBeenCalledWith(4);
  const ops = onOps.mock.lastCall![1];
  expect(ops[0]).toEqual({ op: "setMotion", nodeId: "a", motion: { keys: { on: "view", duration: 4, ease: "linear", parts: { self: frames } } } });
  expect(ops[ops.length - 1].props.world).toEqual({ start: "drop", baked: true });
  // Only the bodies that moved get keyframes.
  expect(ops.some((o: { nodeId: string }) => o.nodeId === "b")).toBe(false);
});

test("baking keeps a body's other motion; making it live again takes the keyframes off", () => {
  const world = { start: "burst", again: 6 };
  const ops = bakeOps(host(world), world, { b: [{ at: 0, y: 0 }, { at: 100, y: 40 }] }, 3);
  expect(ops[0]).toMatchObject({ nodeId: "b", motion: { hover: { kind: "lift" }, keys: { repeat: -1, duration: 3 } } });
  const baked = { ...host({ ...world, baked: true }), children: [kids[0], { ...kids[1], motion: (ops[0] as { motion: object }).motion } as PageTreeNode] };
  const back = unbakeOps(baked, { ...world, baked: true });
  expect(back[0]).toEqual({ op: "setMotion", nodeId: "b", motion: { hover: { kind: "lift" } } });
  expect(back[1]).toMatchObject({ op: "setProps", nodeId: "w", props: { world } });
});

test("a body: hung from a rope, fixed, left out; a world costs the device until it's baked", () => {
  const onOps = vi.fn();
  const { rerender } = render(<BodyPanel node={kids[0]} busy={false} onOps={onOps} />);
  fireEvent.change(screen.getByTestId("studio-body-hang"), { target: { value: "rope" } });
  expect(onOps.mock.lastCall![1][0].props.body).toEqual({ hang: "rope" });
  rerender(<BodyPanel node={{ ...kids[0], props: { ...kids[0].props, body: { hang: "rope" } } } as PageTreeNode} busy={false} onOps={onOps} />);
  fireEvent.click(screen.getByTestId("studio-body-fixed"));
  expect(onOps.mock.lastCall![1][0].props.body).toEqual({ hang: "rope", fixed: true });
  fireEvent.click(screen.getByTestId("studio-body-out"));
  expect(onOps.mock.lastCall![1][0].props.body).toEqual({ hang: "rope", out: true });

  expect(costOf(host({ start: "drop" })).reasons.map((r) => r.key)).toContain("world");
  expect(costOf(host({ start: "drop", baked: true })).reasons.map((r) => r.key)).not.toContain("world");
  expect(costOf({ id: "f", type: "image", props: {}, motion: { physics: { kind: "float" } } } as PageTreeNode).endless).toBe(true);
});
