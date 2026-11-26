import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { READY_GAMES } from "../../../estabrek-storefront/src/pageTree/gameReady";
import { GameEditor } from "./GameEditor";
import { ROSE_COLOURS } from "./templates/colours";
import type { Obj } from "./gameEdit";

vi.mock("../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));
vi.mock("../components/ui/Modal", () => ({ Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null) }));

// G0b: the game editor: the world dragged into place, things added and taken out, rules built from menus, and the
// game tried right there.
afterEach(cleanup);
const rect = { x: 0, y: 0, left: 0, top: 0, width: 960, height: 540, right: 960, bottom: 540, toJSON: () => ({}) };
beforeEach(() => { vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect as DOMRect); });

function Harness({ start, onChange }: { start: Obj; onChange: (label: string, next: Obj) => void }) {
  const [game, setGame] = useState(start);
  return <GameEditor open onClose={() => {}} game={game} lang="en" colours={ROSE_COLOURS} busy={false} onChange={(l, next) => { onChange(l, next); setGame(next); }} />;
}
const mount = (key = "catch") => {
  const onChange = vi.fn();
  render(<Harness start={structuredClone(READY_GAMES.find((g) => g.key === key)!.game)} onChange={onChange} />);
  const last = () => onChange.mock.calls.at(-1)![1] as Obj;
  const things = () => last().things as Obj[];
  return { onChange, last, things };
};

describe("the game editor", () => {
  test("a thing dragged in the world moves there, in the world's units; its corner sizes it", () => {
    const { onChange, things } = mount();
    const bag = screen.getAllByTestId("game-ed-thing").find((t) => t.getAttribute("data-thing") === "bag")!;
    const world = screen.getByTestId("game-ed-world");
    fireEvent.pointerDown(bag, { clientX: 480, clientY: 480, pointerId: 1 });
    fireEvent.pointerMove(world, { clientX: 300, clientY: 400, pointerId: 1 });
    fireEvent.pointerUp(world, { pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(things().find((t) => t.id === "bag")).toMatchObject({ x: 300, y: 400 });
    // The corner of the picked thing.
    fireEvent.pointerDown(screen.getByTestId("game-ed-size-handle"), { clientX: 0, clientY: 0, pointerId: 2 });
    fireEvent.pointerMove(world, { clientX: 10, clientY: 5, pointerId: 2 });
    fireEvent.pointerUp(world, { pointerId: 2 });
    expect(things().find((t) => t.id === "bag")).toMatchObject({ w: 116, h: 106 });
  });

  test("a thing added, its settings changed, and taken out with the rules that named it", () => {
    const { last, things } = mount();
    fireEvent.click(screen.getAllByTestId("game-ed-add").find((b) => b.getAttribute("data-look") === "box")!);
    expect(things().some((t) => t.id === "box")).toBe(true);
    fireEvent.change(screen.getByTestId("game-ed-control"), { target: { value: "fourWay" } });
    expect(things().find((t) => t.id === "box")!.control).toBe("fourWay");
    const tags = screen.getByTestId("game-ed-tags");
    fireEvent.change(tags, { target: { value: "hero, 9bad!, enemy" } });
    fireEvent.blur(tags);
    expect(things().find((t) => t.id === "box")!.tags).toEqual(["hero", "enemy"]);
    // The gift: picked from the shelf of what the rules make, and taken out.
    fireEvent.click(screen.getAllByTestId("game-ed-pick").find((b) => b.getAttribute("data-thing") === "gift")!);
    fireEvent.click(screen.getByTestId("game-ed-remove"));
    expect(things().some((t) => t.id === "gift")).toBe(false);
    expect(JSON.stringify(last().rules)).not.toMatch(/gift|#good/);
  });

  test("a rule built from the menus, told in words", () => {
    const { last } = mount();
    const before = screen.getAllByTestId("game-ed-rule").length;
    fireEvent.click(screen.getByTestId("game-ed-rule-add"));
    expect(screen.getAllByTestId("game-ed-rule")).toHaveLength(before + 1);
    fireEvent.change(screen.getByTestId("game-ed-when"), { target: { value: "hit" } });
    fireEvent.change(screen.getByTestId("game-ed-hit-a"), { target: { value: "#player" } });
    fireEvent.change(screen.getByTestId("game-ed-hit-b"), { target: { value: "#bad" } });
    fireEvent.change(screen.getByTestId("game-ed-act-add"), { target: { value: "lives" } });
    const rule = (last().rules as Obj[]).at(-1)!;
    expect(rule).toEqual({ when: { on: "hit", a: "#player", b: "#bad" }, do: [{ act: "score", add: 1 }, { act: "lives", add: -1 }] });
    expect(screen.getAllByTestId("game-ed-rule").at(-1)!.textContent).toMatch(/#player.*#bad.*\+1.*-1/);
    fireEvent.click(screen.getByTestId("game-ed-rule-remove"));
    expect(screen.getAllByTestId("game-ed-rule")).toHaveLength(before);
  });

  test("tried right here: the shop's engine plays it", async () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { frames.push(cb); return frames.length; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mount("tap");
    fireEvent.click(screen.getByTestId("game-ed-try"));
    const trying = screen.getByTestId("game-ed-trying");
    expect(trying.getAttribute("data-phase")).toBe("ready");
    fireEvent.click(screen.getByTestId("game-ed-play"));
    // Two seconds of frames.
    await act(async () => { for (let i = 0; i < 120; i++) { now += 1000 / 60; frames.shift()?.(now); } });
    expect(screen.getByTestId("game-ed-trying").getAttribute("data-phase")).toBe("playing");
    // The clock ran (30 seconds less the two played).
    expect(screen.getByTestId("game-ed-trying").textContent).toMatch(/: (28|29)/);
  });
});
