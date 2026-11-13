import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { orbitSpot } from "../../../estabrek-storefront/src/pageTree/orbit";
import { CoverPanel, PaintPanel } from "./CoverPanel";
import { CursorTextPanel, PageCursorPanel } from "./CursorPanel";
import { makeNode, NEEDS, READY } from "./insert";
import { SCROLL_EFFECTS, scrollEffectsFor } from "./scrollEffects";
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

describe("scroll tricks in the editor", () => {
  it("offers travelling for boxes, counting for words and drawing for lines", () => {
    const keys = (type: string) => scrollEffectsFor(type).map((e) => e.key);
    expect(keys("stack")).toEqual(expect.arrayContaining(["orbit-ring", "orbit-ring-held", "orbit-arc", "orbit-wave"]));
    expect(keys("heading")).toContain("count-scroll");
    expect(keys("heading")).not.toContain("orbit-ring");
    expect(keys("svg")).toContain("draw-scroll");
    // Every orbit the editor offers is one the shop can place.
    for (const e of SCROLL_EFFECTS.filter((x) => x.scroll.kind === "orbit")) expect(orbitSpot(e.scroll.orbit!.shape, 0, 3, 0.3, e.scroll.orbit!.turn ?? 0.5, 800, e.scroll.orbit!.radius ?? 45).opacity).toBeGreaterThanOrEqual(0);
  });

  it("the next section's edge and the page's colour", () => {
    setLangForTests("en");
    const node: PageTreeNode = { id: "hero", type: "section", props: { cover: { hold: 1, under: "dim", phone: true } } };
    const r = recorder();
    render(<CoverPanel node={node} isLast={false} busy={false} onOps={r.onOps} />);
    fireEvent.click(screen.getByRole("button", { name: "An arch that flattens" }));
    expect((r.edits.at(-1) as unknown as { props: { cover: unknown } }).props.cover).toEqual({ hold: 1, under: "dim", phone: true, enter: "arch" });
    cleanup();
    const p = recorder();
    render(<PaintPanel node={{ id: "night", type: "section", props: { contained: true } }} busy={false} onOps={p.onOps} />);
    expect(screen.getByTestId("studio-paint")).toBeTruthy();
  });

  it("the page's cursor and an element's word for it", () => {
    setLangForTests("en");
    const root: PageTreeNode = { id: "page", type: "page", props: { smooth: true } };
    const r = recorder();
    const view = render(<PageCursorPanel root={root} busy={false} onOps={r.onOps} />);
    fireEvent.click(view.container.querySelector('[data-cursor-kind="ring"]')!);
    expect(r.edits.at(-1)).toEqual({ op: "setProps", nodeId: "page", props: { cursor: { kind: "ring" } } });
    view.rerender(<PageCursorPanel root={{ ...root, props: { cursor: { kind: "ring" } } }} busy={false} onOps={r.onOps} />);
    fireEvent.click(view.container.querySelector('[data-cursor-kind="none"]')!);
    expect(r.edits.at(-1)).toEqual({ op: "setProps", nodeId: "page", props: { cursor: null } });
    cleanup();
    const w = recorder();
    render(<CursorTextPanel node={{ id: "b", type: "button", props: { label: { en: "Go" } } }} lang="en" busy={false} onOps={w.onOps} />);
    const input = screen.getByTestId("studio-cursor-text").querySelector("input")!;
    fireEvent.change(input, { target: { value: "  Shop  " } });
    fireEvent.blur(input);
    expect(w.edits.at(-1)).toEqual({ op: "setProps", nodeId: "b", props: { label: { en: "Go" }, cursorText: { en: "Shop" } } });
  });

  it("the ready sections come from the Add panel", () => {
    for (const k of ["ready-orbit", "ready-counters", "ready-portal", "ready-paint"] as const) expect(READY).toContain(k);
    expect(NEEDS["ready-portal"]).toBe("image");
    const ring = makeNode("ready-orbit", "ar", ids());
    expect(ring.children?.[1].motion).toMatchObject({ scroll: { kind: "orbit", orbit: { shape: "circle" }, length: 150 } });
    expect(ring.children?.[1].children).toHaveLength(6);
    const portal = makeNode("ready-portal", "en", ids(), "https://res.cloudinary.com/x/image/upload/p.jpg");
    expect(portal.children?.[0].props).toMatchObject({ window: { shape: "circle" }, media: { kind: "image" } });
    expect(makeNode("ready-paint", "he", ids()).props).toMatchObject({ paint: "#1b2a78" });
    expect(makeNode("ready-counters", "en", ids()).children?.[0].children?.[0].children?.[0].motion).toEqual({ scroll: { kind: "count" } });
  });
});
