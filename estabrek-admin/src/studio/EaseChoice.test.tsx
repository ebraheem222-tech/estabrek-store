import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { EaseChoice, FREE_CURVE, isFreeCurve } from "./EaseChoice";
import { KeyframesPanel } from "./KeyframesPanel";
import { MotionPanel } from "./LookPanels";

afterEach(cleanup);
const NAMES: Array<[string, string]> = [["smooth", "Smooth"], ["bounce", "Bouncy"]];

test("a curve is one of the panel's names, or a free curve that opens the curve field", () => {
  const onPick = vi.fn();
  const view = render(<EaseChoice label="Kind of motion" value="smooth" names={NAMES} busy={false} onPick={onPick} testId="ease" />);
  const select = () => screen.getByTestId("ease") as HTMLSelectElement;
  expect(select().value).toBe("smooth");
  expect(screen.queryByTestId("ease-field")).toBeNull();

  // Picking "a free curve or a spring" starts from a ready curve.
  fireEvent.change(select(), { target: { value: "__free" } });
  expect(onPick).toHaveBeenLastCalledWith(FREE_CURVE);

  // A saved free curve shows as that choice, with its field: handles or a spring.
  view.rerender(<EaseChoice label="Kind of motion" value="spring(1,120,14)" names={NAMES} busy={false} onPick={onPick} testId="ease" />);
  expect(select().value).toBe("__free");
  expect(screen.getByTestId("ease-field")).toHaveAttribute("data-ease", "spring(1,120,14)");

  // Back to a name.
  fireEvent.change(select(), { target: { value: "bounce" } });
  expect(onPick).toHaveBeenLastCalledWith("bounce");
});

test("a panel with 'as the whole' gives no curve for that choice", () => {
  const onPick = vi.fn();
  render(<EaseChoice label="Getting here" value="cubic-bezier(0.6,0,0.4,1)" names={NAMES} none="As the whole" busy={false} onPick={onPick} testId="ease" />);
  expect((screen.getByTestId("ease") as HTMLSelectElement).value).toBe("__free");
  fireEvent.change(screen.getByTestId("ease"), { target: { value: "" } });
  expect(onPick).toHaveBeenLastCalledWith(undefined);
  expect(isFreeCurve("smooth", NAMES)).toBe(false);
  expect(isFreeCurve("power3.out", NAMES)).toBe(true);
  expect(isFreeCurve("not a curve", NAMES)).toBe(false);
  expect(isFreeCurve(undefined, NAMES)).toBe(false);
});

/** The motion panel on an element, keeping what it saves. */
function mountMotion(start: PageTreeNode["motion"], type = "stack") {
  let saved: PageTreeNode["motion"] = start;
  function Editor() {
    const [motion, setMotion] = useState<PageTreeNode["motion"]>(start);
    const node: PageTreeNode = { id: "n", type, props: type === "heading" ? { text: { en: "Hello" } } : {}, motion, ...(type === "stack" ? { children: [{ id: "a", type: "heading", props: { text: { en: "A" } } }, { id: "b", type: "heading", props: { text: { en: "B" } } }] } : {}) };
    return <MotionPanel node={node} busy={false} onPlay={() => {}} onOps={(_label, ops) => {
      const op = ops[0];
      if (op.op === "setMotion") { saved = op.motion ?? undefined; setMotion(saved); }
    }} />;
  }
  render(<Editor />);
  return () => saved as { enter?: Record<string, unknown> } | undefined;
}

test("an entrance takes a free curve, and a stagger an order", () => {
  const saved = mountMotion({ enter: { kind: "up", duration: 0.8, stagger: 0.1 } });
  // The order shows once things come in one after another.
  const order = screen.getByTestId("studio-enter-order") as HTMLSelectElement;
  expect(order.value).toBe("first");
  fireEvent.change(order, { target: { value: "center" } });
  expect(saved()?.enter).toMatchObject({ kind: "up", stagger: 0.1, order: "center" });
  // The usual order isn't written.
  fireEvent.change(screen.getByTestId("studio-enter-order"), { target: { value: "first" } });
  expect(saved()?.enter).not.toHaveProperty("order");

  // A free curve.
  fireEvent.change(screen.getByTestId("studio-enter-ease"), { target: { value: "__free" } });
  expect(saved()?.enter).toMatchObject({ ease: FREE_CURVE });
  expect(screen.getByTestId("studio-enter-ease-field")).toHaveAttribute("data-ease", FREE_CURVE);
  fireEvent.change(screen.getByTestId("studio-enter-ease"), { target: { value: "bounce" } });
  expect(saved()?.enter).toMatchObject({ ease: "bounce" });
  expect(screen.queryByTestId("studio-enter-ease-field")).toBeNull();
});

test("no order is offered while nothing comes in one after another", () => {
  mountMotion({ enter: { kind: "up", duration: 0.8 } });
  expect(screen.queryByTestId("studio-enter-order")).toBeNull();
});

test("keyframes take a free curve for the whole animation", () => {
  const edits: PageDraftOp[][] = [];
  const node: PageTreeNode = { id: "h", type: "heading", props: { text: { en: "Hello" } }, motion: { keys: { on: "view", duration: 1, parts: { self: [{ at: 0, opacity: 0 }, { at: 100, opacity: 1 }] } } } };
  render(<KeyframesPanel node={node} busy={false} onOps={(_label, ops) => edits.push(ops)} onPlay={() => {}} />);
  fireEvent.change(screen.getByTestId("keys-ease"), { target: { value: "__free" } });
  const op = edits.at(-1)![0] as { op: string; motion: { keys: { ease: string } } };
  expect(op.op).toBe("setMotion");
  expect(op.motion.keys.ease).toBe(FREE_CURVE);
});
