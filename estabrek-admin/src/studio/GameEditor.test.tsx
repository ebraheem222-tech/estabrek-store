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

  test("G1: a tile map turned on, a stroke painted in the world as one change, a kind added and its ways set", () => {
    const { onChange, last } = mount();
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "tiles")!);
    fireEvent.click(screen.getByTestId("game-ed-tiles-on"));
    const tiles = () => last().tiles as { map: string[]; kinds: Record<string, Obj>; cols: number };
    expect(tiles().cols).toBe(60);
    // The world is three views wide now (scrolled across): the stage's rect is the whole world.
    vi.mocked(Element.prototype.getBoundingClientRect).mockReturnValue({ ...rect, width: 2880, height: 576, right: 2880, bottom: 576 } as DOMRect);
    onChange.mockClear();
    const world = screen.getByTestId("game-ed-world");
    fireEvent.pointerDown(world, { clientX: 10, clientY: 10, pointerId: 3 });
    fireEvent.pointerMove(world, { clientX: 60, clientY: 10, pointerId: 3 });
    fireEvent.pointerMove(world, { clientX: 110, clientY: 10, pointerId: 3 });
    fireEvent.pointerUp(world, { pointerId: 3 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(tiles().map[0].slice(0, 4)).toBe("###.");
    // A new kind: a one-way platform; the rubber takes cells away.
    fireEvent.click(screen.getByTestId("game-ed-kind-add"));
    expect(Object.keys(tiles().kinds)).toEqual(["#", "="]);
    fireEvent.click(screen.getByTestId("game-ed-kind-oneway"));
    expect(tiles().kinds["="]).toMatchObject({ oneWay: true });
    expect(tiles().kinds["="].solid).toBeUndefined();
    fireEvent.click(screen.getAllByTestId("game-ed-brush").find((b) => b.getAttribute("data-char") === ".")!);
    fireEvent.pointerDown(world, { clientX: 60, clientY: 10, pointerId: 4 });
    fireEvent.pointerUp(world, { pointerId: 4 });
    expect(tiles().map[0].slice(0, 4)).toBe("#.#.");
  });

  test("G1: the camera and the layers behind; a thing drawn from a sprite sheet", () => {
    const { last } = mount("adventure");
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "camera")!);
    fireEvent.change(screen.getByTestId("game-ed-follow"), { target: { value: "fox" } });
    expect((last().camera as Obj).follow).toBe("fox");
    const before = (last().layers as Obj[]).length;
    fireEvent.click(screen.getByTestId("game-ed-layer-add"));
    expect((last().layers as Obj[]).length).toBe(before + 1);
    // The fox drawn from a sheet (its picture chosen): the sheet's settings show.
    const game = structuredClone(last());
    (game.things as Obj[]).find((t) => t.id === "fox")!.look = { kind: "sprite", src: "https://cdn.example.com/fox.png", sheet: { cols: 4, rows: 1, fps: 10, anims: { idle: [0, 1], run: [0, 4] } } };
    cleanup();
    const onChange = vi.fn();
    render(<Harness start={game} onChange={onChange} />);
    fireEvent.click(screen.getAllByTestId("game-ed-pick").find((b) => b.getAttribute("data-thing") === "fox")!);
    expect(screen.getByTestId("game-ed-sheet")).toBeTruthy();
    const cols = screen.getByTestId("game-ed-sheet-cols");
    fireEvent.change(cols, { target: { value: "6" } });
    fireEvent.blur(cols);
    const fox = (onChange.mock.calls.at(-1)![1].things as Obj[]).find((t) => t.id === "fox")!;
    expect((fox.look as Obj).sheet).toMatchObject({ cols: 6, anims: { run: [0, 4] } });
  });

  test("G1: the adventure tried here: the camera follows the fox across its wide world", async () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { frames.push(cb); return frames.length; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mount("adventure");
    fireEvent.click(screen.getByTestId("game-ed-try"));
    fireEvent.click(screen.getByTestId("game-ed-play"));
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await act(async () => { for (let i = 0; i < 180; i++) { now += 1000 / 60; frames.shift()?.(now); } });
    // Held right for three seconds the fox runs into the first pit (and loses): the camera went with it.
    expect(["playing", "lost"]).toContain(screen.getByTestId("game-ed-trying").getAttribute("data-phase"));
    expect(Number(screen.getByTestId("game-ed-trying").getAttribute("data-cam"))).toBeGreaterThan(100);
  });
});
