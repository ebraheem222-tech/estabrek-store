import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SpacePanel } from "./SpacePanel";
import { makeNode, READY } from "./insert";
import { setLangForTests } from "../lib/lang";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";

afterEach(cleanup);
const ids = () => {
  let n = 0;
  return (prefix: string) => `${prefix}-${n++}`;
};
const recorder = () => {
  const edits: PageDraftOp[] = [];
  return { edits, onOps: (_l: string, ops: PageDraftOp[]) => void edits.push(...ops) };
};
const spaceIn = (op: PageDraftOp | undefined) => (op as unknown as { props: { space?: unknown } }).props.space;
const kids = (n: number): PageTreeNode[] => Array.from({ length: n }, (_, i) => ({ id: `k${i}`, type: "text", props: { text: { en: `${i}` } } }));

describe("the 3D layouts in the editor", () => {
  it("lays a box's things on a ring, and back to flat; its own settings per kind", () => {
    setLangForTests("en");
    const box: PageTreeNode = { id: "box", type: "stack", props: { gap: 8 }, children: kids(6) };
    const r = recorder();
    render(<SpacePanel node={box} busy={false} onOps={r.onOps} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "A turning ring (drag it round)" }));
    expect(spaceIn(r.edits.at(-1))).toEqual({ kind: "ring" });
    expect((r.edits.at(-1) as unknown as { props: { gap: number } }).props.gap).toBe(8);
    cleanup();

    const ring: PageTreeNode = { ...box, props: { space: { kind: "ring", speed: 2 } } };
    const p = recorder();
    render(<SpacePanel node={ring} busy={false} onOps={p.onOps} />);
    expect(screen.getByTestId("studio-space-speed")).toBeTruthy();
    expect(screen.getByTestId("studio-space-tilt")).toBeTruthy();
    fireEvent.click(screen.getByTestId("studio-space-drag"));
    expect(spaceIn(p.edits.at(-1))).toEqual({ kind: "ring", speed: 2, drag: false });
    // Another kind keeps its speed; the same one again lays it flat.
    fireEvent.click(screen.getByRole("button", { name: "A helix, like DNA" }));
    expect(spaceIn(p.edits.at(-1))).toEqual({ kind: "helix", speed: 2 });
    fireEvent.click(screen.getByRole("button", { name: "A turning ring (drag it round)" }));
    expect(spaceIn(p.edits.at(-1))).toBeUndefined();
    cleanup();

    // A book turns by hand only: no speed, no lean.
    render(<SpacePanel node={{ ...box, props: { space: { kind: "book" } } }} busy={false} onOps={() => {}} />);
    expect(screen.queryByTestId("studio-space-speed")).toBeNull();
    expect(screen.queryByTestId("studio-space-tilt")).toBeNull();
  });

  it("offers a ready ring of cards, a book and a phone, each a box laid out in 3D", () => {
    for (const k of ["ready-ring3d", "ready-book3d", "ready-phone3d"] as const) expect(READY).toContain(k);
    const holder = (n: PageTreeNode) => n.children!.find((c) => c.props?.space)!;
    expect(holder(makeNode("ready-ring3d", "ar", ids())).props.space).toEqual({ kind: "ring" });
    expect(holder(makeNode("ready-ring3d", "ar", ids())).children).toHaveLength(8);
    expect(holder(makeNode("ready-book3d", "en", ids())).children).toHaveLength(6);
    expect(holder(makeNode("ready-phone3d", "he", ids())).props.space).toEqual({ kind: "phone" });
  });
});
