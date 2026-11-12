import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PageTreeNode } from "../../api/pages.api";
import { costOf, pageBudget } from "./perfCost";
import { PageBudget, PerfPanel } from "./PerfPanel";

afterEach(cleanup);
const n = (type: string, props: Record<string, unknown> = {}, extra: Partial<PageTreeNode> = {}) => ({ id: `${type}-1`, type, props, ...extra }) as PageTreeNode;

test("a plain heading is light; frosted glass, a 3D model and a clip that plays by itself are not", () => {
  expect(costOf(n("heading", { text: { en: "Hi" } })).level).toBe("low");
  const glass = costOf(n("stack", {}, { style: { base: { backdrop: { blur: 20 } } } as never }));
  expect(glass.reasons.map((r) => r.key)).toContain("glass");
  expect(glass.level).toBe("mid");
  const model = costOf(n("model3d", { model: "sneaker", anim: { type: "spin" } }));
  expect(model).toMatchObject({ level: "high", canvas: true });
  expect(model.reasons.find((r) => r.key === "3d")!.fix).toEqual({ fps: 30 });
  expect(costOf(n("video", { src: "/v.mp4", autoplay: true }))).toMatchObject({ autoplay: true, endless: true });
  // A state's look counts too.
  expect(costOf(n("button", {}, { style: { base: { states: { hover: { glow: { color: "#fff", size: 20 } } } } } as never })).reasons.map((r) => r.key)).toContain("glow");
});

test("its own speed settings bring the cost down, or up when it keeps moving off screen", () => {
  const heavy = costOf(n("model3d", { model: "sneaker" })).points;
  expect(costOf(n("model3d", { model: "sneaker", perf: { tier: "light" } })).points).toBeLessThan(heavy / 3);
  const loop = n("text", {}, { motion: { loop: { kind: "float" } } as never });
  expect(costOf({ ...loop, props: { perf: { offscreen: "keep" } } }).points).toBeGreaterThan(costOf(loop).points);
});

test("the page's budget adds them up and says what it has too many of", () => {
  const root = { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [
    n("model3d", { model: "sneaker" }), { ...n("model3d", { model: "sneaker" }), id: "m2" }, { ...n("model3d", { model: "sneaker" }), id: "m3" }, { ...n("model3d", { model: "sneaker" }), id: "m4" },
    n("video", { src: "/v.mp4", autoplay: true }),
  ] }] } as PageTreeNode;
  const b = pageBudget(root);
  expect(b).toMatchObject({ canvases: 4, autoplay: 1, level: "high" });
  expect(b.warnings.join(" ")).toMatch(/4/);
  expect(b.heavy[0].points).toBeGreaterThan(30);
});

test("the panel lightens with a click on a reason, and drops the defaults it saves", () => {
  const onOps = vi.fn();
  render(<PerfPanel node={n("model3d", { model: "sneaker" })} busy={false} onOps={onOps} />);
  expect(screen.getByTestId("studio-perf-badge")).toHaveAttribute("data-level", "high");
  fireEvent.click(screen.getAllByTestId("studio-perf-fix").find((b) => b.getAttribute("data-key") === "3d")!);
  expect(onOps.mock.lastCall![1][0].props.perf).toEqual({ fps: 30 });
  fireEvent.click(screen.getAllByTestId("studio-perf-tier").find((b) => b.getAttribute("data-tier") === "full")!);
  expect(onOps.mock.lastCall![1][0].props.perf).toBeUndefined();
  fireEvent.click(screen.getByTestId("studio-perf-phone"));
  expect(onOps.mock.lastCall![1][0].props.perf).toEqual({ phone: "light" });
});

test("the budget measures the page and picks its heaviest", async () => {
  const onPick = vi.fn();
  const onMeasure = vi.fn(async () => ({ fps: 58, longMs: 12, animations: 3, canvases: 1, videos: 0, nodes: 400 }));
  const root = { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [n("model3d", { model: "sneaker" })] }] } as PageTreeNode;
  render(<PageBudget root={root} busy={false} onPick={onPick} onMeasure={onMeasure} />);
  fireEvent.click(screen.getByTestId("studio-budget-heavy"));
  expect(onPick).toHaveBeenLastCalledWith("model3d-1");
  fireEvent.click(screen.getByTestId("studio-budget-measure"));
  expect(await screen.findByTestId("studio-budget-sample")).toHaveAttribute("data-fps", "58");
});
