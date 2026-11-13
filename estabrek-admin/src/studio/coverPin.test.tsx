import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { coverOf } from "../../../estabrek-storefront/src/pageTree/pieces";
import { CoverPanel } from "./CoverPanel";
import { canCover, COVER_UNDERS, readyCover } from "./coverPin";
import { makeNode, NEEDS, READY } from "./insert";
import { setLangForTests } from "../lib/lang";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";

afterEach(cleanup);
const ids = () => {
  let n = 0;
  return (prefix: string) => `${prefix}-${n++}`;
};

describe("held, then covered by the next section", () => {
  it("offers what the shop can draw while it's covered", () => {
    expect(COVER_UNDERS.map(([k]) => k)).toEqual(["none", "dim", "shrink", "blur", "slow", "fade"]);
    for (const [k] of COVER_UNDERS) expect(coverOf({ under: k })?.under).toBe(k);
    expect(canCover({ id: "s", type: "section", props: {} })).toBe(true);
    expect(canCover({ id: "s", type: "section", props: { tag: "footer" } })).toBe(false);
    expect(canCover({ id: "g", type: "grid", props: {} })).toBe(false);
  });

  it("turns on held for a screen and darkening, then saves the hold, the look and phones", () => {
    setLangForTests("en");
    const edits: PageDraftOp[] = [];
    let node: PageTreeNode = { id: "hero", type: "section", props: { contained: true } };
    const onOps = (_l: string, ops: PageDraftOp[]) => {
      edits.push(...ops);
      const op = ops[0] as { props: Record<string, unknown> };
      node = { ...node, props: op.props };
    };
    const view = render(<CoverPanel node={node} isLast={false} busy={false} onOps={onOps} />);
    expect(screen.queryByTestId("studio-cover-settings")).toBeNull();
    fireEvent.click(screen.getByTestId("studio-cover-on"));
    expect(edits.at(-1)).toEqual({ op: "setProps", nodeId: "hero", props: { contained: true, cover: { hold: 1, under: "dim", phone: true } } });
    view.rerender(<CoverPanel node={node} isLast={false} busy={false} onOps={onOps} />);
    expect(screen.getByRole("button", { name: "Darkens" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Shrinks back" }));
    expect((edits.at(-1) as unknown as { props: { cover: unknown } }).props.cover).toEqual({ hold: 1, under: "shrink", phone: true });
    view.rerender(<CoverPanel node={node} isLast={false} busy={false} onOps={onOps} />);
    fireEvent.click(screen.getByTestId("studio-cover-phone"));
    expect((edits.at(-1) as unknown as { props: { cover: unknown } }).props.cover).toEqual({ hold: 1, under: "shrink", phone: false });
    view.rerender(<CoverPanel node={node} isLast busy={false} onOps={onOps} />);
    expect(screen.getByTestId("studio-cover-last").textContent).toMatch(/last section/);
    // Off again: nothing of it left on the section.
    fireEvent.click(screen.getByTestId("studio-cover-on"));
    expect(edits.at(-1)).toEqual({ op: "setProps", nodeId: "hero", props: { contained: true, cover: undefined } });
  });

  it("the ready one is a full-screen picture with words over it, held and covered", () => {
    expect(READY).toContain("ready-cover");
    expect(NEEDS["ready-cover"]).toBe("image");
    const made = makeNode("ready-cover", "ar", ids(), "https://res.cloudinary.com/x/image/upload/pic.jpg");
    expect(made).toEqual(readyCover("ar", ids(), "https://res.cloudinary.com/x/image/upload/pic.jpg"));
    expect(made.props).toMatchObject({ contained: false, cover: { hold: 1, under: "dim", phone: true } });
    expect(made.children?.map((c) => c.type)).toEqual(["image", "heading", "text"]);
    expect((made.children?.[1].props.text as Record<string, string>).ar).toBe("بتضل قدامك");
  });
});
