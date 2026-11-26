import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
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
    // Held right for three seconds the fox runs on into the first pit (a life, and the level again from its start):
    // the camera went with it on the way.
    let far = 0;
    for (let k = 0; k < 18; k++) {
      await act(async () => { for (let i = 0; i < 10; i++) { now += 1000 / 60; frames.shift()?.(now); } });
      far = Math.max(far, Number(screen.getByTestId("game-ed-trying").getAttribute("data-cam")));
    }
    expect(screen.getByTestId("game-ed-trying").getAttribute("data-phase")).toBe("playing");
    expect(far).toBeGreaterThan(100);
  });

  test("G1b: levels picked, painted one at a time, added as a copy and removed; a maze made by itself, another one; the cover between levels", () => {
    const { last } = mount("adventure");
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "tiles")!);
    expect(screen.getAllByTestId("game-ed-level")).toHaveLength(2);
    fireEvent.click(screen.getAllByTestId("game-ed-level").find((b) => b.getAttribute("data-level") === "1")!);
    vi.mocked(Element.prototype.getBoundingClientRect).mockReturnValue({ ...rect, width: 2880, height: 540, right: 2880, bottom: 540 } as DOMRect);
    const world = screen.getByTestId("game-ed-world");
    fireEvent.pointerDown(world, { clientX: 10, clientY: 10, pointerId: 5 });
    fireEvent.pointerUp(world, { pointerId: 5 });
    const tiles = () => last().tiles as { map: string[]; levels: string[][]; gen?: string };
    expect(tiles().levels[0][0][0]).toBe("#");
    expect(tiles().map[0][0]).toBe(".");
    fireEvent.click(screen.getByTestId("game-ed-level-add"));
    expect(tiles().levels).toHaveLength(2);
    expect(tiles().levels[1][0][0]).toBe("#");
    fireEvent.click(screen.getByTestId("game-ed-level-remove"));
    expect(tiles().levels).toHaveLength(1);
    // A maze: its walls made from the game's number; another number, another maze.
    fireEvent.click(screen.getByTestId("game-ed-maze"));
    expect(tiles().gen).toBe("maze");
    const seed = Number(last().seed);
    fireEvent.click(screen.getByTestId("game-ed-maze-again"));
    expect(Number(last().seed)).toBe(seed + 1);
    fireEvent.click(screen.getByTestId("game-ed-maze"));
    expect(tiles().gen).toBeUndefined();
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "camera")!);
    fireEvent.change(screen.getByTestId("game-ed-transition"), { target: { value: "wipe" } });
    expect(last().transition).toBe("wipe");
  });

  test("G1b: a thing that goes along its path: points put in the world and dragged there; a guard's sight; the new rules", () => {
    const { last, things } = mount();
    fireEvent.click(screen.getAllByTestId("game-ed-pick").find((b) => b.getAttribute("data-thing") === "bag")!);
    fireEvent.change(screen.getByTestId("game-ed-behave"), { target: { value: "path" } });
    expect(things().find((t) => t.id === "bag")!.path).toEqual({ points: [[200, 0]] });
    expect(screen.getAllByTestId("game-ed-path-point")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("game-ed-path-add"));
    const world = screen.getByTestId("game-ed-world");
    fireEvent.pointerDown(world, { clientX: 600, clientY: 300, pointerId: 6 });
    fireEvent.pointerUp(world, { pointerId: 6 });
    // From the bag (480, 480).
    expect((things().find((t) => t.id === "bag")!.path as Obj).points).toEqual([[200, 0], [120, -180]]);
    fireEvent.click(screen.getByTestId("game-ed-path-add"));
    fireEvent.pointerDown(screen.getAllByTestId("game-ed-path-point")[0], { clientX: 680, clientY: 480, pointerId: 7 });
    fireEvent.pointerMove(world, { clientX: 700, clientY: 440, pointerId: 7 });
    fireEvent.pointerUp(world, { pointerId: 7 });
    expect((things().find((t) => t.id === "bag")!.path as Obj).points).toEqual([[220, -40], [120, -180]]);
    fireEvent.click(screen.getByTestId("game-ed-path-loop"));
    expect((things().find((t) => t.id === "bag")!.path as Obj).loop).toBe(true);
    // A guard sees so far.
    fireEvent.change(screen.getByTestId("game-ed-behave"), { target: { value: "guard" } });
    const sight = screen.getByTestId("game-ed-sight");
    fireEvent.change(sight, { target: { value: "250" } });
    fireEvent.blur(sight);
    expect(things().find((t) => t.id === "bag")!.sight).toBe(250);
    // A rule: when the bag sees a gift, on to the next level.
    fireEvent.click(screen.getByTestId("game-ed-rule-add"));
    fireEvent.change(screen.getByTestId("game-ed-when"), { target: { value: "see" } });
    expect(screen.getByTestId("game-ed-hit-a")).toBeTruthy();
    fireEvent.change(screen.getAllByTestId("game-ed-act-kind").at(-1)!, { target: { value: "next" } });
    const rule = (last().rules as Obj[]).at(-1)!;
    expect(rule).toMatchObject({ when: { on: "see" }, do: [{ act: "next" }] });
  });

  test("G1b: the maze tried here: its level in the bar, played without a hitch", async () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { frames.push(cb); return frames.length; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mount("maze");
    fireEvent.click(screen.getByTestId("game-ed-try"));
    fireEvent.click(screen.getByTestId("game-ed-play"));
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await act(async () => { for (let i = 0; i < 120; i++) { now += 1000 / 60; frames.shift()?.(now); } });
    const trying = screen.getByTestId("game-ed-trying");
    expect(trying.getAttribute("data-level")).toBe("1");
    expect(["playing", "lost"]).toContain(trying.getAttribute("data-phase"));
    expect(trying.textContent).toMatch(/1\/3/);
  });

  test("G2: a rigid thing: its shape (a ramp drawn as one), its material, never through a wall; the sling; the rules for a slung thing", () => {
    const { last, things } = mount();
    fireEvent.click(screen.getAllByTestId("game-ed-pick").find((b) => b.getAttribute("data-thing") === "bag")!);
    fireEvent.change(screen.getByTestId("game-ed-body"), { target: { value: "rigid" } });
    expect(screen.getByTestId("game-ed-rigid")).toBeTruthy();
    fireEvent.change(screen.getByTestId("game-ed-shape"), { target: { value: "ramp" } });
    const bag = () => things().find((t) => t.id === "bag")!;
    expect(bag()).toMatchObject({ body: "rigid", shape: "poly", points: [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5]] });
    const look = obj(bag().look);
    // A box look is drawn as the ramp in the world (an emoji keeps its own look).
    fireEvent.change(screen.getByTestId("game-ed-look"), { target: { value: "box" } });
    expect(obj(bag().look).kind).toBe("box");
    expect(screen.getAllByTestId("game-ed-thing").find((t) => t.getAttribute("data-thing") === "bag")!.querySelector("polygon")).toBeTruthy();
    expect(look.kind).toBe("emoji");
    const density = screen.getByTestId("game-ed-density");
    fireEvent.change(density, { target: { value: "4" } });
    fireEvent.blur(density);
    fireEvent.click(screen.getByTestId("game-ed-fast"));
    expect(bag()).toMatchObject({ density: 4, fast: true });
    fireEvent.change(screen.getByTestId("game-ed-shape"), { target: { value: "circle" } });
    expect(bag().shape).toBe("circle");
    expect(bag().points).toBeUndefined();
    fireEvent.change(screen.getByTestId("game-ed-control"), { target: { value: "sling" } });
    expect(bag().control).toBe("sling");
    // When it comes to rest: back home, and an explosion there.
    fireEvent.click(screen.getByTestId("game-ed-rule-add"));
    fireEvent.change(screen.getByTestId("game-ed-when"), { target: { value: "rest" } });
    fireEvent.change(screen.getByTestId("game-ed-who"), { target: { value: "bag" } });
    fireEvent.change(screen.getAllByTestId("game-ed-act-kind").at(-1)!, { target: { value: "home" } });
    fireEvent.change(screen.getByTestId("game-ed-act-add"), { target: { value: "explode" } });
    const power = screen.getByTestId("game-ed-blast-power");
    fireEvent.change(power, { target: { value: "1500" } });
    fireEvent.blur(power);
    expect((last().rules as Obj[]).at(-1)).toMatchObject({ when: { on: "rest", who: "bag" }, do: [{ act: "home", who: "self" }, { act: "explode", who: "self", radius: 160, power: 1500 }] });
  });

  test("G2: mini golf tried here: Rapier loaded, the ball slung from the canvas, a stroke counted", async () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { frames.push(cb); return frames.length; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mount("golf");
    vi.mocked(Element.prototype.getBoundingClientRect).mockReturnValue({ ...rect, width: 945, height: 540, right: 945, bottom: 540 } as DOMRect);
    fireEvent.click(screen.getByTestId("game-ed-try"));
    const play = screen.getByTestId("game-ed-play");
    await waitFor(() => expect(play.hasAttribute("disabled")).toBe(false), { timeout: 15_000 });
    fireEvent.click(play);
    const run = async (n: number) => { await act(async () => { for (let i = 0; i < n; i++) { now += 1000 / 60; frames.shift()?.(now); } }); };
    await run(5);
    // The ball's mark: cell (4, 3) of 45-pixel tiles.
    const canvas = screen.getByTestId("game-ed-trying").querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 202, clientY: 157, pointerId: 9 });
    await run(2);
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 190, pointerId: 9 });
    await run(2);
    fireEvent.pointerUp(canvas, { pointerId: 9 });
    await run(3);
    expect(screen.getByTestId("game-ed-trying").getAttribute("data-score")).toBe("1");
  }, 30_000);

  test("G2b: the joints tab: a joint added, made a flipper (a pin at its end, limits, a motor on a key, a strength), then a rope to another thing; drawn in the world", () => {
    const { last } = mount();
    // A second thing in the world to tie a rope to.
    fireEvent.click(screen.getAllByTestId("game-ed-add").find((b) => b.getAttribute("data-look") === "box")!);
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "joints")!);
    fireEvent.click(screen.getByTestId("game-ed-joint-add"));
    const joints = () => last().joints as Obj[];
    expect(joints()).toEqual([{ kind: "pin", a: "bag", b: "" }]);
    const ax = screen.getByTestId("game-ed-joint-ax");
    fireEvent.change(ax, { target: { value: "-40" } });
    fireEvent.blur(ax);
    fireEvent.click(screen.getByTestId("game-ed-joint-limits"));
    fireEvent.click(screen.getByTestId("game-ed-joint-motor"));
    fireEvent.change(screen.getByTestId("game-ed-joint-key"), { target: { value: "ArrowLeft" } });
    const speed = screen.getByTestId("game-ed-joint-speed");
    fireEvent.change(speed, { target: { value: "-900" } });
    fireEvent.blur(speed);
    const strength = screen.getByTestId("game-ed-joint-break");
    fireEvent.change(strength, { target: { value: "300" } });
    fireEvent.blur(strength);
    expect(joints()[0]).toMatchObject({ kind: "pin", a: "bag", b: "", ax: -40, limits: [-30, 30], motor: { speed: -900, key: "ArrowLeft" }, breakAt: 300 });
    // The pin drawn at its place on the bag (480 - 40, 480).
    const dot = screen.getByTestId("game-ed-joint-lines").querySelector("circle")!;
    expect([dot.getAttribute("cx"), dot.getAttribute("cy")]).toEqual(["440", "480"]);
    // A rope from the bag to the new box, 120 long: no motor or limits on a rope.
    fireEvent.change(screen.getByTestId("game-ed-joint-kind"), { target: { value: "rope" } });
    fireEvent.change(screen.getByTestId("game-ed-joint-b"), { target: { value: "box" } });
    const length = screen.getByTestId("game-ed-joint-length");
    fireEvent.change(length, { target: { value: "120" } });
    fireEvent.blur(length);
    expect(joints()[0]).toMatchObject({ kind: "rope", b: "box", length: 120 });
    expect(joints()[0].motor).toBeUndefined();
    expect(screen.getByTestId("game-ed-joint-lines").querySelector("line")).toBeTruthy();
    fireEvent.click(screen.getByTestId("game-ed-joint-remove"));
    expect(joints()).toEqual([]);
  });

  test("G3: the effects tab (weather, an effect over the picture, music for a mood heard here), a thing's trail and effect, a note in a rule", () => {
    const { last, things } = mount();
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "effects")!);
    fireEvent.change(screen.getByTestId("game-ed-weather"), { target: { value: "snow" } });
    fireEvent.change(screen.getByTestId("game-ed-post"), { target: { value: "crt" } });
    fireEvent.change(screen.getByTestId("game-ed-mood"), { target: { value: "spooky" } });
    const tempo = screen.getByTestId("game-ed-tempo");
    fireEvent.change(tempo, { target: { value: "300" } });
    fireEvent.blur(tempo);
    expect(last()).toMatchObject({ weather: "snow", post: "crt", music: { mood: "spooky", tempo: 180 } });
    // Heard here (no Web Audio in this test's page: it only says it plays).
    fireEvent.click(screen.getByTestId("game-ed-hear"));
    expect(screen.getByTestId("game-ed-hear").textContent).toMatch(/■/);
    fireEvent.click(screen.getByTestId("game-ed-hear"));
    fireEvent.change(screen.getByTestId("game-ed-mood"), { target: { value: "" } });
    expect(obj(last().music).mood).toBeUndefined();
    // The bag: sparkles behind it, and a glow.
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "things")!);
    fireEvent.click(screen.getAllByTestId("game-ed-pick").find((b) => b.getAttribute("data-thing") === "bag")!);
    fireEvent.change(screen.getByTestId("game-ed-trail"), { target: { value: "sparkle" } });
    fireEvent.change(screen.getByTestId("game-ed-fx"), { target: { value: "glow" } });
    expect(things().find((t) => t.id === "bag")).toMatchObject({ trail: "sparkle", fx: "glow" });
    // A rule's note: a piano, the minor scale, at random.
    fireEvent.click(screen.getByTestId("game-ed-rule-add"));
    fireEvent.change(screen.getAllByTestId("game-ed-act-kind").at(-1)!, { target: { value: "note" } });
    fireEvent.change(screen.getByTestId("game-ed-note-instrument"), { target: { value: "piano" } });
    fireEvent.change(screen.getByTestId("game-ed-note-scale"), { target: { value: "minor" } });
    fireEvent.change(screen.getByTestId("game-ed-note-step"), { target: { value: "-2" } });
    expect((last().rules as Obj[]).at(-1)!.do).toEqual([{ act: "note", instrument: "piano", scale: "minor", step: -2 }]);
  });

  test("G3: the night stars tried here: its music and sounds asked for, its particles and effects drawn, a vignette over it", async () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { frames.push(cb); return frames.length; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mount("night");
    fireEvent.click(screen.getByTestId("game-ed-try"));
    fireEvent.click(screen.getByTestId("game-ed-play"));
    await act(async () => { for (let i = 0; i < 240; i++) { now += 1000 / 60; frames.shift()?.(now); } });
    const trying = screen.getByTestId("game-ed-trying");
    expect(trying.getAttribute("data-phase")).toBe("playing");
    expect(trying.querySelector("canvas")!.getAttribute("data-post")).toBe("vignette");
    expect(trying.querySelector("div.pointer-events-none")).toBeTruthy();
  });

  test("G3b: a rule on the beat (every, from), one for a key pressed as one thing touches another, a flash", () => {
    const { last } = mount();
    fireEvent.click(screen.getByTestId("game-ed-rule-add"));
    fireEvent.change(screen.getByTestId("game-ed-when"), { target: { value: "beat" } });
    const every = screen.getByTestId("game-ed-beat-every");
    fireEvent.change(every, { target: { value: "2" } });
    fireEvent.blur(every);
    const from = screen.getByTestId("game-ed-beat-offset");
    fireEvent.change(from, { target: { value: "0.5" } });
    fireEvent.blur(from);
    expect((last().rules as Obj[]).at(-1)!.when).toEqual({ on: "beat", every: 2, offset: 0.5 });
    fireEvent.change(screen.getByTestId("game-ed-when"), { target: { value: "press" } });
    fireEvent.change(screen.getByTestId("game-ed-press-key"), { target: { value: "ArrowLeft" } });
    fireEvent.change(screen.getByTestId("game-ed-hit-b"), { target: { value: "#good" } });
    fireEvent.change(screen.getAllByTestId("game-ed-act-kind").at(-1)!, { target: { value: "flash" } });
    expect((last().rules as Obj[]).at(-1)).toMatchObject({ when: { on: "press", key: "ArrowLeft", a: "bag", b: "#good" }, do: [{ act: "flash", who: "self" }] });
  });

  test("G4a: the 3D tab (on the ground, the camera, the light, shadows), a thing's 3D (a model's address, metal), the car", () => {
    const { last, things } = mount();
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "3d")!);
    expect(screen.queryByTestId("game-ed-3d-camera")).toBeNull();
    fireEvent.change(screen.getByTestId("game-ed-3d-mode"), { target: { value: "ground" } });
    fireEvent.change(screen.getByTestId("game-ed-3d-camera"), { target: { value: "top" } });
    fireEvent.change(screen.getByTestId("game-ed-3d-light"), { target: { value: "night" } });
    fireEvent.click(screen.getByTestId("game-ed-3d-shadows"));
    const tilt = screen.getByTestId("game-ed-3d-tilt");
    fireEvent.change(tilt, { target: { value: "120" } });
    fireEvent.blur(tilt);
    expect(last().view3d).toEqual({ mode: "ground", camera: "top", light: "night", shadows: false, tilt: 89 });
    // In 3D, a thing's own 3D settings show.
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "things")!);
    fireEvent.click(screen.getAllByTestId("game-ed-pick").find((b) => b.getAttribute("data-thing") === "bag")!);
    fireEvent.change(screen.getByTestId("game-ed-3d-shape"), { target: { value: "model" } });
    const src = screen.getByTestId("game-ed-3d-src");
    fireEvent.change(src, { target: { value: "javascript:alert(1)" } });
    fireEvent.blur(src);
    expect(obj(things().find((t) => t.id === "bag")!.d3).src).toBeUndefined();
    fireEvent.change(src, { target: { value: "https://cdn.example.com/bag.glb" } });
    fireEvent.blur(src);
    const metal = screen.getByTestId("game-ed-3d-metal");
    fireEvent.change(metal, { target: { value: "0.8" } });
    fireEvent.blur(metal);
    expect(things().find((t) => t.id === "bag")!.d3).toEqual({ shape: "model", src: "https://cdn.example.com/bag.glb", metal: 0.8 });
    fireEvent.change(screen.getByTestId("game-ed-control"), { target: { value: "car" } });
    expect(things().find((t) => t.id === "bag")!.control).toBe("car");
    // Flat again: no 3D settings on the thing.
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "3d")!);
    fireEvent.change(screen.getByTestId("game-ed-3d-mode"), { target: { value: "" } });
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "things")!);
    expect(screen.queryByTestId("game-ed-thing-3d")).toBeNull();
  });

  test("G4b: real 3D physics on the ground (its gravity), the walker, a rule for a thing that tips over", () => {
    const { last, things } = mount();
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "3d")!);
    fireEvent.change(screen.getByTestId("game-ed-3d-mode"), { target: { value: "wall" } });
    expect(screen.queryByTestId("game-ed-3d-physics")).toBeNull();
    fireEvent.change(screen.getByTestId("game-ed-3d-mode"), { target: { value: "ground" } });
    fireEvent.click(screen.getByTestId("game-ed-3d-physics"));
    const g = screen.getByTestId("game-ed-3d-gravity");
    fireEvent.change(g, { target: { value: "2600" } });
    fireEvent.blur(g);
    expect(last().view3d).toEqual({ mode: "ground", physics: true, gravity: 2600 });
    fireEvent.click(screen.getAllByTestId("game-ed-tab").find((b) => b.getAttribute("data-tab") === "things")!);
    fireEvent.click(screen.getAllByTestId("game-ed-pick").find((b) => b.getAttribute("data-thing") === "bag")!);
    fireEvent.change(screen.getByTestId("game-ed-control"), { target: { value: "walk" } });
    expect(things().find((t) => t.id === "bag")!.control).toBe("walk");
    fireEvent.click(screen.getByTestId("game-ed-rule-add"));
    fireEvent.change(screen.getByTestId("game-ed-when"), { target: { value: "tip" } });
    fireEvent.change(screen.getByTestId("game-ed-who"), { target: { value: "#good" } });
    expect((last().rules as Obj[]).at(-1)!.when).toEqual({ on: "tip", who: "#good" });
  });
});
