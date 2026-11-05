import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScenePanel } from "./ScenePanel";
import { setLangForTests } from "../lib/lang";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";

afterEach(cleanup);

describe("section scene editor", () => {
  it("edits every background knob through undoable props operations while keeping existing section settings", () => {
    setLangForTests("en");
    let node: PageTreeNode = { id: "hero", type: "section", props: { contained: true, particles: { kind: "stars" } } };
    const edits: PageDraftOp[] = [];
    const onOps = (_label: string, ops: PageDraftOp[]) => { edits.push(...ops); node = { ...node, props: (ops[0] as { props: Record<string, unknown> }).props }; view.rerender(<ScenePanel node={node} busy={false} onOps={onOps} />); };
    const view = render(<ScenePanel node={node} busy={false} onOps={onOps} />);
    for (const kind of ["constellation", "orbs", "waves", "grid", "starfield", "ribbons", "snow", "fireworks"]) {
      fireEvent.click(view.container.querySelector(`[data-scene-kind="${kind}"]`)!);
      expect(node.props?.scene).toMatchObject({ kind });
    }
    for (const [key, value] of [["amount", "88"], ["speed", "0"], ["intensity", "1.7"]]) {
      fireEvent.change(screen.getByTestId(`studio-scene-${key}`), { target: { value } });
      fireEvent.pointerUp(screen.getByTestId(`studio-scene-${key}`));
    }
    fireEvent.change(screen.getByTestId("studio-scene-color"), { target: { value: "white" } });
    fireEvent.change(screen.getByTestId("studio-scene-secondary"), { target: { value: "black" } });
    fireEvent.click(screen.getByTestId("studio-scene-interactive"));
    expect(node.props).toEqual({ contained: true, particles: { kind: "stars" }, scene: { kind: "fireworks", color: "white", secondary: "black", amount: 88, speed: 0, intensity: 1.7, interactive: true } });
    expect(edits.every((op) => op.op === "setProps" && op.nodeId === "hero")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove scene" }));
    expect(node.props).toEqual({ contained: true, particles: { kind: "stars" }, scene: undefined });
  });

  it("disables all edits while saving", () => {
    const view = render(<ScenePanel node={{ id: "hero", type: "section", props: { scene: { kind: "waves" } } }} busy onOps={() => { throw new Error("busy edit"); }} />);
    for (const field of view.container.querySelectorAll("button,input,select")) expect(field).toBeDisabled();
  });
});
