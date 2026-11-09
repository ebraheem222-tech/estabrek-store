// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { ElementPanel } from "./StudioTreePanels";
import { CommercePanel } from "./CommercePanel";
import { CardDesignFields } from "../features/settings/VisualControlsForm";
import { CARD_PRESETS } from "../features/settings/cardPresets";
import { makeNode } from "./insert";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});
const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${n++}`;
};

describe("slider shapes in the editor", () => {
  it("a shape is one click; plain, round arrows and dots are left unset", () => {
    setLangForTests("en");
    const initial: PageTreeNode = { id: "slider", type: "slider", props: { slides: [{ src: "/a.svg", kind: "image" }] } };
    let saved = initial;
    function Harness() {
      const [node, setNode] = useState(initial);
      return <ElementPanel node={node} lang="en" busy={false} onOps={(_l, ops) => { const op = ops[0]; if (op.op === "setProps") { saved = { ...node, props: op.props }; setNode(saved); } }} />;
    }
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}><Harness /></QueryClientProvider>);
    expect(screen.getByTestId("studio-slider-looks").querySelectorAll("button")).toHaveLength(16);
    fireEvent.click(screen.getByTestId("studio-slider-look-phone"));
    fireEvent.change(screen.getByTestId("studio-slider-arrowLook"), { target: { value: "glass" } });
    fireEvent.change(screen.getByTestId("studio-slider-dotLook"), { target: { value: "numbers" } });
    expect(saved.props).toMatchObject({ look: "phone", arrowLook: "glass", dotLook: "numbers" });
    expect(screen.getByTestId("studio-slider-look-phone").getAttribute("aria-pressed")).toBe("true");
    // Three at once needs the plain sliding effect: the panel says so.
    fireEvent.change(screen.getByTestId("studio-slider-effect"), { target: { value: "fade" } });
    fireEvent.click(screen.getByTestId("studio-slider-look-trio"));
    expect(screen.getByText(/more than one slide with the "Slide" effect only/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("studio-slider-look-plain"));
    fireEvent.change(screen.getByTestId("studio-slider-arrowLook"), { target: { value: "round" } });
    expect(saved.props.look).toBeUndefined();
    expect(saved.props.arrowLook).toBeUndefined();
  });
});

describe("product cards in the editor", () => {
  it("a ready design sets everything at once; each motion is its own choice", () => {
    setLangForTests("en");
    const changes: unknown[] = [];
    const view = render(<CardDesignFields value={{ buttonColor: "#aa0000" }} onChange={(v) => changes.push(v)} />);
    fireEvent.click(view.container.querySelector('[data-card-preset="gallery"]')!);
    expect(changes.at(-1)).toEqual({ buttonColor: "#aa0000", ...CARD_PRESETS.find((p) => p.key === "gallery")!.design });
    fireEvent.change(screen.getByTestId("card-hover"), { target: { value: "flip" } });
    expect(changes.at(-1)).toMatchObject({ hover: "flip", buttonColor: "#aa0000" });
    fireEvent.change(screen.getByTestId("card-enter"), { target: { value: "blur" } });
    expect(changes.at(-1)).toMatchObject({ enter: "blur" });
    fireEvent.click(screen.getByTestId("card-showBadge"));
    expect(changes.at(-1)).toMatchObject({ showBadge: true });
    fireEvent.change(screen.getByTestId("card-imageRatio"), { target: { value: "wide" } });
    expect(changes.at(-1)).toMatchObject({ imageRatio: "wide" });
  });

  it("the shop page: space between cards, filters at the end, filters that stay", () => {
    setLangForTests("en");
    const edits: PageDraftOp[][] = [];
    render(<CommercePanel node={{ id: "shop", type: "shop", props: { columns: 3 } }} busy={false} onOps={(_l, ops) => edits.push(ops)} />);
    fireEvent.change(screen.getByTestId("commerce-filters-side"), { target: { value: "end" } });
    expect(edits.at(-1)![0]).toMatchObject({ op: "setProps", props: { columns: 3, filtersSide: "end" } });
    fireEvent.click(screen.getByTestId("commerce-sticky-filters"));
    expect(edits.at(-1)![0]).toMatchObject({ props: { stickyFilters: true } });
    const gap = screen.getByTestId("commerce-gap");
    fireEvent.change(gap, { target: { value: "36" } });
    fireEvent.blur(gap);
    expect(edits.at(-1)![0]).toMatchObject({ props: { gap: 36 } });
  });
});

describe("ready blocks keep their full width", () => {
  it("the picture of a split block and a gallery fill their place; a lone picture starts smaller", () => {
    const split = makeNode("ready-split", "en", ids(), "/a.jpg");
    expect((split.children![0].children![0].children![0].style as any).base.width).toBe("100%");
    const gallery = makeNode("ready-gallery", "en", ids(), "/a.jpg");
    expect((gallery.children![0].style as any).base.width).toBe("100%");
    expect((makeNode("image", "en", ids(), "/a.jpg").style as any).base).toEqual({ width: "480px", maxWidth: "100%", self: "center" });
  });
});
