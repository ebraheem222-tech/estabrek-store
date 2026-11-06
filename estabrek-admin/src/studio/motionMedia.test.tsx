import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageDraft, PageTreeNode } from "../api/pages.api";
import { MotionPanel, VideoOverlayPanel } from "./LookPanels";
import { pageMotionOps, motionProfileQuery } from "./motionProfiles";
import { sendDraftBatches } from "./draftBatches";
import { simulate, undoOf } from "./draft";
import { makeNode, NEEDS } from "./insert";

afterEach(cleanup);
const draft = (children: PageTreeNode[]): PageDraft => ({ version: 1, rev: 1, baseHash: "x", sections: [], trash: [], startedAt: "", updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children } } });

describe("merchant motion and media controls", () => {
  it.each([
    ["rise", "enter"], ["parallax", "scroll"], ["float", "loop"], ["tilt-hover", "hover"], ["shine", "fx"],
  ])("clicking active %s again removes its channel and preserves the other motion", (preset, channel) => {
    const initial = { engine: "anime", phone: "lite", ...(channel === "loop" ? { hover: { kind: "lift" } } : { loop: { kind: "spin" } }) };
    let saved: PageTreeNode["motion"];
    function Editor() {
      const [motion, setMotion] = useState<PageTreeNode["motion"]>(initial);
      return <MotionPanel node={{ id: "h", type: "heading", props: { text: { en: "Hello" } }, motion }} busy={false} onPlay={() => {}} onOps={(_label, ops) => {
        const op = ops[0];
        if (op.op === "setMotion") { saved = op.motion ?? undefined; setMotion(saved); }
      }} />;
    }
    render(<Editor />);
    const button = screen.getByTestId("studio-motion-presets").querySelector(`[data-preset="${preset}"]`)!;
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(saved).toHaveProperty(channel);
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(saved).toEqual(initial);
  });

  it("removing the only preset persists null motion and disables play", () => {
    let saved: unknown = "unsaved";
    function Editor() {
      const [motion, setMotion] = useState<PageTreeNode["motion"]>({ loop: { kind: "float", duration: 4 } });
      return <MotionPanel node={{ id: "h", type: "heading", props: {}, motion }} busy={false} onPlay={() => {}} onOps={(_label, ops) => {
        const op = ops[0];
        if (op.op === "setMotion") { saved = op.motion; setMotion(op.motion ?? undefined); }
      }} />;
    }
    render(<Editor />);
    fireEvent.click(screen.getByTestId("studio-motion-presets").querySelector('[data-preset="float"]')!);
    expect(saved).toBeNull();
    expect(screen.getByTestId("studio-motion-play")).toBeDisabled();
    expect(screen.queryByTestId("studio-motion-clear")).not.toBeInTheDocument();
  });

  it("clicking the selected scroll choice clears it without resetting other channels", () => {
    const onOps = vi.fn();
    render(<MotionPanel node={{ id: "h", type: "heading", props: {}, motion: { engine: "anime", scroll: { kind: "parallax", speed: 0.7 }, hover: { kind: "lift" } } }} busy={false} onOps={onOps} onPlay={() => {}} />);
    fireEvent.click(screen.getByTestId("studio-scroll-kind").querySelector('[data-value="parallax"]')!);
    expect(onOps).toHaveBeenCalledWith(expect.any(String), [{ op: "setMotion", nodeId: "h", motion: { engine: "anime", hover: { kind: "lift" } } }]);
  });

  it.each(["enter", "loop", "hover", "fx"])("selecting None removes just %s", (channel) => {
    const onOps = vi.fn();
    render(<MotionPanel node={{ id: "h", type: "heading", props: {}, motion: { engine: "anime", phone: "lite", [channel]: { kind: channel === "enter" ? "fade" : channel === "loop" ? "float" : channel === "hover" ? "lift" : "shine" } } }} busy={false} onOps={onOps} onPlay={() => {}} />);
    fireEvent.change(screen.getByTestId(`studio-${channel}-kind`), { target: { value: "" } });
    expect(onOps).toHaveBeenCalledWith(expect.any(String), [{ op: "setMotion", nodeId: "h", motion: { engine: "anime", phone: "lite" } }]);
  });

  it("switches engines while preserving every effect, and keeps the engine when choosing a preset", () => {
    const onOps = vi.fn();
    const node: PageTreeNode = { id: "h", type: "heading", props: { text: { en: "Hello" } }, motion: { enter: { kind: "words" }, scroll: { kind: "parallax", speed: 0.3 }, hover: { kind: "spring" }, phone: "lite" } };
    const view = render(<MotionPanel node={node} busy={false} onOps={onOps} onPlay={vi.fn()} />);
    fireEvent.change(screen.getByTestId("studio-motion-engine"), { target: { value: "anime" } });
    const op = onOps.mock.calls[0][1][0];
    expect(op).toEqual({ op: "setMotion", nodeId: "h", motion: { ...node.motion, engine: "anime" } });
    view.rerender(<MotionPanel node={{ ...node, motion: op.motion }} busy={false} onOps={onOps} onPlay={vi.fn()} />);
    fireEvent.click(screen.getByTestId("studio-motion-presets").querySelector('[data-preset="float"]')!);
    expect(onOps.mock.lastCall![1][0].motion).toMatchObject({ engine: "anime", enter: { kind: "words" }, hover: { kind: "spring" }, loop: { kind: "float" } });
  });

  it("changes a video's overlay on the shown screen with normalized opacity and preserved gradient", () => {
    const onOps = vi.fn();
    const node: PageTreeNode = { id: "v", type: "video", props: { src: "/merchant.mp4" }, style: { base: { overlay: { color: "#000000", opacity: 0.5, to: "accent", blend: "multiply" }, width: "100%" } } };
    render(<VideoOverlayPanel node={node} screen="mobile" busy={false} onOps={onOps} onPreview={vi.fn()} />);
    fireEvent.change(screen.getByTestId("studio-video-overlay-colour"), { target: { value: "accent" } });
    expect(onOps.mock.lastCall![1][0]).toMatchObject({ op: "setStyle", nodeId: "v", screen: "mobile", style: { overlay: { color: "accent", opacity: 0.5, to: "accent", blend: "multiply" } } });
    const slider = screen.getByTestId("studio-video-overlay-opacity");
    fireEvent.change(slider, { target: { value: "75" } });
    fireEvent.keyUp(slider, { key: "ArrowRight" });
    expect(onOps.mock.lastCall![1][0]).toMatchObject({ screen: "mobile", style: { overlay: { color: "#000000", opacity: 0.75, to: "accent", blend: "multiply" } } });
    expect(node.style).not.toHaveProperty("mobile");
  });

  it("builds safe ready media sections with merchant media and editable foreground content", () => {
    let count = 0;
    const ids = (prefix: string) => `${prefix}${++count}`;
    expect(NEEDS["ready-video"]).toBe("video");
    const video = makeNode("ready-video", "en", ids, "/merchant.mp4");
    expect(video).toMatchObject({ type: "section", props: { contained: false } });
    expect(video.children![0]).toMatchObject({ type: "video", props: { src: "/merchant.mp4", label: { en: expect.any(String) } }, style: { base: { overlay: { color: "#000000", opacity: 0.5 } } } });
    expect(video.children!.slice(1).map((n) => n.type)).toEqual(["heading", "button"]);
    expect(video.children![1].style).toMatchObject({ base: { z: 1, color: "white", layer: { x: 50 } } });
    const showcase = makeNode("ready-model3d", "he", ids);
    const model = showcase.children![0].children![0].children![0];
    expect(model).toMatchObject({ type: "model3d", props: { model: "sneaker", drag: true, lights: { preset: "studio" } } });
    expect(model.props).not.toHaveProperty("poster");
    expect(model.props).not.toHaveProperty("file");
    expect(showcase.children![0].children![1].children!.map((n) => n.type)).toEqual(["heading", "text", "button"]);
  });

  it("can turn off an inherited video overlay on a phone without changing desktop", () => {
    const onOps = vi.fn();
    const node: PageTreeNode = { id: "v", type: "video", props: { src: "/merchant.mp4" }, style: { base: { overlay: { color: "#000000", opacity: 0.5 } } } };
    render(<VideoOverlayPanel node={node} screen="mobile" busy={false} onOps={onOps} onPreview={vi.fn()} />);
    fireEvent.click(screen.getByTestId("studio-video-overlay-on"));
    expect(onOps.mock.lastCall![1][0]).toMatchObject({ op: "setStyle", screen: "mobile", style: { overlay: { color: "#000000", opacity: 0 } } });
    expect(node.style).toEqual({ base: { overlay: { color: "#000000", opacity: 0.5 } } });
  });

  it("generates undoable page operations with the same shared motion profile as imports", () => {
    const d = draft([{ id: "sec", type: "section", props: {}, children: [{ id: "h", type: "heading", props: { text: { en: "Hello" } }, motion: { enter: { kind: "words" }, engine: "gsap" } }] }]);
    const before = structuredClone(d);
    const ops = pageMotionOps(d.tree.root, { engine: "anime", preset: "calm" });
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.every((op) => op.op === "setMotion" && op.nodeId !== "page")).toBe(true);
    const undo = undoOf(ops, d, "en");
    const after = ops.reduce(simulate, d);
    expect(after.tree.root.children![0].children![0].motion?.engine).toBe("anime");
    expect(undo.reduce(simulate, after)).toEqual(before);
    expect(d).toEqual(before);
    expect(motionProfileQuery()).toBe("");
    expect(motionProfileQuery({ engine: "anime", preset: "rich" })).toBe("motionEngine=anime&motionPreset=rich");
  });

  it("changes legacy part engines through undoable look operations without touching styles", () => {
    const d = draft([{ id: "legacy", type: "legacy", props: { sectionId: "hero" } }]);
    d.tree.root.props.looks = {
      "s:hero/title": { kind: "text", style: { base: { color: "accent", size: 40 } }, motion: { engine: "gsap", enter: { kind: "words" }, phone: "lite" } },
      "s:hero/clip": { kind: "video", style: { mobile: { opacity: 0.8 } }, motion: { hover: { kind: "grow" } } },
      "s:hero/plain": { kind: "box", style: { base: { bg: "surface" } } },
    };
    const ops = pageMotionOps(d.tree.root, { engine: "anime", preset: "original" });
    expect(ops).toEqual([
      { op: "setLookMotion", target: "s:hero/title", kind: "text", motion: { engine: "anime", enter: { kind: "words" }, phone: "lite" } },
      { op: "setLookMotion", target: "s:hero/clip", kind: "video", motion: { engine: "anime", hover: { kind: "grow" } } },
    ]);
    const after = ops.reduce(simulate, d);
    expect((after.tree.root.props.looks as Record<string, { style: unknown }>)["s:hero/title"].style).toEqual({ base: { color: "accent", size: 40 } });
    expect(undoOf(ops, d, "en").reduce(simulate, after)).toEqual(d);
  });

  it("removes legacy motion with the none profile while keeping style-only parts and restoring motion on undo", () => {
    const d = draft([{ id: "legacy", type: "legacy", props: { sectionId: "hero" } }]);
    d.tree.root.props.looks = {
      "s:hero/title": { kind: "text", style: { base: { color: "accent" } }, motion: { enter: { kind: "words" } } },
      "s:hero/clip": { kind: "video", motion: { hover: { kind: "grow" } } },
      "s:hero/plain": { kind: "box", style: { base: { bg: "surface" } } },
    };
    const ops = pageMotionOps(d.tree.root, { preset: "none" });
    expect(ops).toEqual([
      { op: "setLookMotion", target: "s:hero/title", kind: "text", motion: null },
      { op: "setLookMotion", target: "s:hero/clip", kind: "video", motion: null },
    ]);
    const after = ops.reduce(simulate, d);
    expect(after.tree.root.props.looks).toEqual({
      "s:hero/title": { kind: "text", style: { base: { color: "accent" } } },
      "s:hero/plain": { kind: "box", style: { base: { bg: "surface" } } },
    });
    expect(undoOf(ops, d, "en").reduce(simulate, after)).toEqual(d);
  });

  it("sends large changes and their undo in revision-checked batches within the server limit", async () => {
    const d = draft(Array.from({ length: 121 }, (_, i) => ({ id: `h${i}`, type: "heading", props: { text: { en: "Heading" } } })));
    const ops = pageMotionOps(d.tree.root, { engine: "anime", preset: "calm" });
    const send = vi.fn(async (chunk, rev) => {
      expect(chunk.length).toBeLessThanOrEqual(50);
      expect(rev).toBe(current.rev);
      current = { ...chunk.reduce(simulate, current), rev: current.rev + 1 };
      return current;
    });
    let current = d;
    const saved = await sendDraftBatches(ops, d, send);
    expect(send).toHaveBeenCalledTimes(3);
    const restored = await sendDraftBatches(undoOf(ops, d, "en"), saved, send);
    expect(send).toHaveBeenCalledTimes(6);
    expect(restored.tree).toEqual(d.tree);
  });

  it("reports only saved batches when a later request fails, so those changes retain an undo", async () => {
    const d = draft(Array.from({ length: 70 }, (_, i) => ({ id: `h${i}`, type: "heading", props: {} })));
    const ops = pageMotionOps(d.tree.root, { preset: "calm" });
    const saved: typeof ops = [];
    let current = d;
    const failure = new Error("Connection lost");
    const send = vi.fn(async (chunk) => {
      if (send.mock.calls.length === 2) throw failure;
      return { ...chunk.reduce(simulate, current), rev: current.rev + 1 };
    });
    await expect(sendDraftBatches(ops, d, send, (next, chunk) => { current = next; saved.push(...chunk); })).rejects.toBe(failure);
    expect(saved).toHaveLength(50);
    expect(undoOf(saved, d, "en").reduce(simulate, current).tree).toEqual(d.tree);
  });
});
