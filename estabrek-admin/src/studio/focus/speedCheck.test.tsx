import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../../api/pages.api";
import { SlowdownAlert, SpeedCheck, keepLab, lastLab, verdictOf } from "./SpeedCheck";
import { PageBudget } from "./PerfPanel";
import { autoOf, lightenAll } from "./perfCost";

afterEach(() => { cleanup(); localStorage.clear(); });

test("the verdict uses the shoppers' lines: smooth and still is fast, under 30 frames or jumping is slow", () => {
  expect(verdictOf({ fps: 58, slow: 2, longMs: 80, cls: 0.02, ms: 2400 })).toBe("good");
  expect(verdictOf({ fps: 42, slow: 8, longMs: 250, cls: 0.05, ms: 2400 })).toBe("okay");
  expect(verdictOf({ fps: 24, slow: 30, longMs: 900, cls: 0.4, ms: 2400 })).toBe("poor");
});

test("the check before publishing: its verdict, compared with the last publish, a slow page offered to be lightened", () => {
  keepLab("p1", { fps: 58, slow: 2, longMs: 50, cls: 0, ms: 2400 });
  expect(lastLab("p1")?.fps).toBe(58);
  const onLighten = vi.fn();
  const { rerender } = render(<SpeedCheck pageId="p1" lab="waiting" fixes={3} onLighten={onLighten} />);
  expect(screen.getByTestId("studio-speed-check").dataset.state).toBe("waiting");
  rerender(<SpeedCheck pageId="p1" lab={{ fps: 26, slow: 22, longMs: 700, cls: 0.02, ms: 2400 }} fixes={3} onLighten={onLighten} />);
  expect(screen.getByTestId("studio-speed-check").dataset.verdict).toBe("poor");
  expect(screen.getByTestId("studio-speed-slower")).toBeTruthy();
  fireEvent.click(screen.getByTestId("studio-speed-lighten"));
  expect(onLighten).toHaveBeenCalled();
  rerender(<SpeedCheck pageId="p1" lab={null} fixes={3} onLighten={onLighten} />);
  expect(screen.getByTestId("studio-speed-check").dataset.state).toBe("none");
});

test("shoppers' speed got worse on this kind of page: what, and back to before its last publish (asked twice)", () => {
  const onRollback = vi.fn();
  const alerts = {
    now: 0,
    alerts: [{ page: "home", device: "phone" as const, visits: 900, worse: [{ metric: "lcp" as const, before: 2100, now: 4300, rating: "poor" as const }] }],
    publishes: [{ pageId: "p1", name: "Home", slug: "/", kind: "page", at: "2026-11-11T10:00:00.000Z", revisionId: "r1", rumPage: "home" }],
  };
  const { rerender } = render(<SlowdownAlert alerts={alerts} pageId="p1" rumPage="home" busy={false} onRollback={onRollback} />);
  expect(screen.getByTestId("studio-slowdown").textContent).toContain("lcp 2.1 s → 4.3 s");
  fireEvent.click(screen.getByTestId("studio-slowdown-rollback"));
  expect(onRollback).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("studio-slowdown-rollback-yes"));
  expect(onRollback).toHaveBeenCalledWith("r1");
  // Another kind of page: nothing to say.
  rerender(<SlowdownAlert alerts={alerts} pageId="p2" rumPage="page" busy={false} onRollback={onRollback} />);
  expect(screen.queryByTestId("studio-slowdown")).toBeNull();
});

test("the automatic lightening: what it does on this page, turned off for it; and lightening them all in one go", () => {
  const root = {
    id: "page", type: "page", props: {},
    children: [
      { id: "s1", type: "section", props: {}, children: [{ id: "hero", type: "image", name: "Hero", props: { src: "/a.webp" } }, { id: "m", type: "model3d", props: { model: "sneaker" } }] },
      { id: "s2", type: "section", props: {}, children: [{ id: "glass", type: "stack", props: {}, style: { base: { backdrop: { blur: 20 } } } }] },
      { id: "s3", type: "section", props: {}, style: { base: { overflow: "hidden" } }, children: [] },
      { id: "s4", type: "section", props: {}, style: { base: { overflow: "hidden" } }, motion: { scroll: { kind: "parallax" } }, children: [] },
    ],
  } as unknown as PageTreeNode;
  expect(autoOf(root)).toEqual({ on: true, lead: "Hero", far: 1, glass: 1, canvases: 1, autoplay: 0 });
  expect(lightenAll(root)).toEqual([{ id: "m", props: { model: "sneaker", perf: { fps: 30 } } }]);
  const onOps = vi.fn();
  render(<PageBudget root={root} busy={false} onPick={() => {}} onMeasure={async () => null} onOps={onOps} />);
  expect(screen.getAllByTestId("studio-budget-auto-item").map((x) => x.dataset.key)).toEqual(["lead", "far", "glass", "canvases"]);
  fireEvent.click(screen.getByTestId("studio-budget-auto-on"));
  expect(onOps.mock.lastCall![1]).toEqual([{ op: "setProps", nodeId: "page", props: { perfAuto: false } }]);
  fireEvent.click(screen.getByTestId("studio-budget-fix-all"));
  expect(onOps.mock.lastCall![1]).toEqual([{ op: "setProps", nodeId: "m", props: { model: "sneaker", perf: { fps: 30 } } }]);
});
