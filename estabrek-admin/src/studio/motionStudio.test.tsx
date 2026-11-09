import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { KeyframesPanel, OverflowPanel } from "./KeyframesPanel";
import { CuePanel, ScrollScenePanel } from "./ScrollScenePanel";
import { TriggersPanel } from "./TriggersPanel";
import { addFrame, dropFrame, KEY_PRESETS, partsFor, presetsFor, setFrame } from "./keyframes";
import { chapterAt, chapterRange, newScrollScene, withCue } from "./scrollScene";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});
type Edit = [string, PageDraftOp[]];
const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${n++}`;
};

describe("keyframes", () => {
  it("pieces by kind, moments in between and in order, two always stay", () => {
    expect(partsFor("button")).toEqual(["self", "before", "after", "inner"]);
    expect(partsFor("stack")).toEqual(["self", "before", "after"]);
    expect(partsFor("svg")).toEqual(["self"]);
    const frames = addFrame([{ at: 0, x: 0, color: "accent" }, { at: 100, x: 100 }], 25);
    expect(frames).toEqual([{ at: 0, x: 0, color: "accent" }, { at: 25, x: 25, color: "accent" }, { at: 100, x: 100 }]);
    expect(setFrame(frames, 1, { at: 90, x: undefined })).toEqual([{ at: 0, x: 0, color: "accent" }, { at: 90, color: "accent" }, { at: 100, x: 100 }]);
    expect(dropFrame(dropFrame(frames, 1), 0)).toHaveLength(2);
    expect(KEY_PRESETS.length).toBeGreaterThanOrEqual(35);
    expect(new Set(KEY_PRESETS.map((p) => p.key)).size).toBe(KEY_PRESETS.length);
    // A button gets the layer fills; a drawing only what moves the whole of it.
    expect(presetsFor("button").some((p) => p.key === "fill-start")).toBe(true);
    expect(presetsFor("svg").every((p) => Object.keys(p.keys.parts).every((part) => part === "self"))).toBe(true);
  });

  it("a ready one puts its keyframes, its layer and its overflow on in one step; moments are edited per piece", () => {
    setLangForTests("en");
    const edits: Edit[] = [];
    const play = vi.fn();
    let node: PageTreeNode = { id: "b", type: "button", props: { label: { en: "Go" }, href: "/shop" }, motion: { enter: { kind: "fade" } } };
    const view = render(<KeyframesPanel node={node} busy={false} onOps={(l, ops) => edits.push([l, ops])} onPlay={play} />);
    fireEvent.click(view.container.querySelector('[data-key-preset="fill-start"]')!);
    const [keys, layers, overflow] = edits.at(-1)![1] as Array<Record<string, any>>;
    expect(keys).toMatchObject({ op: "setMotion", motion: { enter: { kind: "fade" }, keys: { on: "hover", parts: { before: [{ at: 0, xp: -101 }, { at: 100, xp: 0 }] } } } });
    // A solid button is the accent already: its fill comes in the text colour.
    expect(layers).toMatchObject({ op: "setProps", props: { label: { en: "Go" }, layers: { before: { bg: "text" } } } });
    expect(overflow).toMatchObject({ op: "setStyle", screen: "base", style: { overflow: "hidden" } });
    expect(play).toHaveBeenCalled();
    node = { ...node, motion: keys.motion, props: layers.props };
    view.rerender(<KeyframesPanel node={node} busy={false} onOps={(l, ops) => edits.push([l, ops])} onPlay={play} />);
    // Its "before" piece is open, with its own layer look; a moment at 50 % comes in between.
    expect(screen.getByTestId("layer-before")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "+ 50%" }));
    expect((edits.at(-1)![1][0] as any).motion.keys.parts.before).toEqual([{ at: 0, xp: -101 }, { at: 50, xp: -50.5 }, { at: 100, xp: 0 }]);
    // The trigger changes in place; removing takes only the keyframes off.
    fireEvent.change(screen.getByTestId("keys-on"), { target: { value: "click" } });
    expect((edits.at(-1)![1][0] as any).motion.keys.on).toBe("click");
    fireEvent.click(screen.getByTestId("keys-remove"));
    expect((edits.at(-1)![1][0] as any).motion).toEqual({ enter: { kind: "fade" } });
  });

  it("overflow per screen, both ways or one", () => {
    setLangForTests("en");
    const edits: Edit[] = [];
    render(<OverflowPanel node={{ id: "s", type: "stack", props: {} }} screen="mobile" busy={false} onOps={(l, ops) => edits.push([l, ops])} />);
    fireEvent.change(screen.getByTestId("overflow-x"), { target: { value: "auto" } });
    expect(edits.at(-1)![1][0]).toEqual({ op: "setStyle", nodeId: "s", screen: "mobile", style: { overflowX: "auto" } });
  });
});

describe("scroll scenes", () => {
  it("chapters split the scene; a moment ends after it starts", () => {
    expect(chapterRange(10, 2)).toEqual([20, 30]);
    expect(chapterAt(10, 100)).toBe(9);
    expect(chapterAt(4, 30)).toBe(1);
    expect(withCue({ enter: { kind: "up" } }, { from: 50, to: 40 })).toEqual({ enter: { kind: "up" } });
    const scene = newScrollScene("en", ids(), "https://x.test/clip.mp4");
    expect(scene.props).toMatchObject({ media: { kind: "video", src: "https://x.test/clip.mp4" }, chapters: 10, mode: "pin" });
    expect(scene.children!.map((c) => (c.motion as any).cue.from)).toEqual([0, 35, 75]);
  });

  it("the timeline previews a moment, and adds things at the chosen chapter", () => {
    setLangForTests("en");
    const edits: Edit[] = [];
    const seek = vi.fn();
    const scene = newScrollScene("en", ids(), "https://x.test/clip.mp4");
    render(<QueryClientProvider client={new QueryClient()}><ScrollScenePanel node={scene} lang="en" busy={false} ids={ids()} onOps={(l, ops) => edits.push([l, ops])} onSeek={seek} onSelect={() => {}} /></QueryClientProvider>);
    fireEvent.click(document.querySelector('[data-chapter="4"]')!);
    expect(seek).toHaveBeenLastCalledWith(35);
    fireEvent.click(screen.getByTestId("scene-add-heading"));
    const insert = edits.at(-1)![1][0] as any;
    expect(insert).toMatchObject({ op: "insert", parentId: scene.id, index: 3, node: { type: "heading", motion: { cue: { from: 30, to: 40 } } } });
    fireEvent.click(screen.getByTestId("scene-blur"));
    expect((edits.at(-1)![1][0] as any).props.blur).toEqual({ from: 20, to: 60, amount: 10 });
    fireEvent.click(screen.getByTestId("scene-mode").querySelector('[data-value="flow"]')!);
    expect((edits.at(-1)![1][0] as any).props.mode).toBe("flow");
  });

  it("something inside a scene picks its chapter and how it comes and goes", () => {
    setLangForTests("en");
    const edits: Edit[] = [];
    const scene = newScrollScene("en", ids());
    const child = scene.children![0];
    render(<CuePanel node={child} scene={scene} busy={false} onOps={(l, ops) => edits.push([l, ops])} onSeek={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect((edits.at(-1)![1][0] as any).motion.cue).toMatchObject({ from: 40, to: 50, in: "up", out: "fade" });
    fireEvent.change(screen.getByTestId("cue-out"), { target: { value: "stay" } });
    expect((edits.at(-1)![1][0] as any).motion.cue.out).toBe("stay");
  });
});

describe("triggers", () => {
  it("a ready trigger, a new step, and a test in the preview", () => {
    setLangForTests("en");
    const edits: Edit[] = [];
    const test = vi.fn();
    let node: PageTreeNode = { id: "b", type: "button", props: { label: { en: "Go" }, href: "/shop" } };
    const view = render(<TriggersPanel node={node} lang="en" targets={[{ id: "pop", label: "Offer", type: "popup" }]} busy={false} onOps={(l, ops) => edits.push([l, ops])} onTest={test} />);
    fireEvent.click(view.container.querySelector('[data-trigger-preset="coupon"]')!);
    const props = (edits.at(-1)![1][0] as any).props;
    expect(props.triggers[0]).toMatchObject({ on: "click", do: [{ act: "copy", text: { en: "WELCOME10" } }, { act: "burst", kind: "sparkles" }] });
    node = { ...node, props };
    view.rerender(<TriggersPanel node={node} lang="en" targets={[{ id: "pop", label: "Offer", type: "popup" }]} busy={false} onOps={(l, ops) => edits.push([l, ops])} onTest={test} />);
    fireEvent.change(screen.getByTestId("trigger-0-act-1"), { target: { value: "popup" } });
    expect((edits.at(-1)![1][0] as any).props.triggers[0].do[1]).toEqual({ act: "popup", target: "self", value: "open" });
    fireEvent.click(screen.getByTestId("trigger-0-test"));
    expect(test).toHaveBeenCalledWith(0);
  });
});
