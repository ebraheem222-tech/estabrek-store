import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScrollEffectsPanel } from "./ScrollEffectsPanel";
import { SCROLL_EFFECTS, scrollEffectsFor } from "./scrollEffects";
import { setLangForTests } from "../lib/lang";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";

afterEach(cleanup);
const sec = (id: string, motion?: Record<string, unknown>): PageTreeNode => ({ id, type: "section", props: {}, ...(motion ? { motion } : {}) });

describe("scroll effects", () => {
  it("offers 31 effects; pins only on sections, words only on words", () => {
    expect(SCROLL_EFFECTS).toHaveLength(31);
    expect(new Set(SCROLL_EFFECTS.map((e) => e.key)).size).toBe(31);
    expect(scrollEffectsFor("image").some((e) => e.group === "pin" || e.group === "words")).toBe(false);
    expect(scrollEffectsFor("section").some((e) => e.key === "pin")).toBe(true);
    expect(scrollEffectsFor("heading").some((e) => e.key === "words-light")).toBe(true);
  });

  it("puts one on keeping the rest of the motion, takes it off, and spreads it to every section in one step", () => {
    setLangForTests("en");
    const edits: Array<[string, PageDraftOp[]]> = [];
    let node = sec("a", { enter: { kind: "fade" } });
    const sections = [node, sec("b"), sec("c", { scroll: { kind: "parallax", speed: 0.4 } })];
    const view = render(<ScrollEffectsPanel node={node} sections={sections} busy={false} onOps={(l, ops) => edits.push([l, ops])} />);
    fireEvent.click(view.container.querySelector('[data-scroll-effect="zoom-in"]')!);
    const first = edits.at(-1)![1][0] as { op: string; motion: Record<string, unknown> };
    expect(first.op).toBe("setMotion");
    expect(first.motion).toMatchObject({ enter: { kind: "fade" }, scroll: { kind: "keys", from: { opacity: 0, scale: 0.8 }, to: { opacity: 1, scale: 1 } } });
    node = { ...node, motion: first.motion };
    view.rerender(<ScrollEffectsPanel node={node} sections={[node, sections[1], sections[2]]} busy={false} onOps={(l, ops) => edits.push([l, ops])} />);
    fireEvent.click(screen.getByTestId("studio-scroll-all"));
    const all = edits.at(-1)![1] as Array<{ nodeId: string; motion: Record<string, unknown> }>;
    expect(all.map((o) => o.nodeId)).toEqual(["a", "b", "c"]);
    for (const o of all) expect(o.motion.scroll).toEqual(first.motion.scroll);
    fireEvent.click(view.container.querySelector('[data-scroll-effect="zoom-in"]')!);
    expect((edits.at(-1)![1][0] as { motion: unknown }).motion).toEqual({ enter: { kind: "fade" } });
  });
});
