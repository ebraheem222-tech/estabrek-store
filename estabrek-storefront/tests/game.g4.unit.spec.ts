import { expect, test } from "@playwright/test";
import { NO_INPUT, newGame, startGame, stepGame, type GameInput, type GameState } from "../src/pageTree/gameEngine";
import { gameOf } from "../src/pageTree/gameSpec";
import { READY_GAMES } from "../src/pageTree/gameReady";
import { heightOf3d, shapeOf3d } from "../src/pageTree/gameScene3d";

// G4a of the games stage (docs/game-engine-plan.ar.md): the 3D view's settings, a thing's shape in 3D, and the car.
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const input = (more: Partial<GameInput> = {}): GameInput => ({ ...NO_INPUT, pressed: [], taps: [], ...more });
const steps = (s: GameState, n: number, i: GameInput = NO_INPUT) => { for (let k = 0; k < n; k++) stepGame(s, i); };

test("the 3D view and a thing's 3D read safely: flat unless asked, each number in its range, a model only with its file", () => {
  const flat = gameOf({ things: [{ id: "a", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9 }] }, say)!;
  expect(flat.view3d).toEqual({ mode: "", camera: "follow", tilt: 55, distance: 1, light: "day", shadows: true, fog: false });
  expect(flat.things[0].d3).toEqual({ shape: "auto", height: 0, lift: 0, metal: 0.1, rough: 0.6 });
  const g = gameOf({
    view3d: { mode: "ground", camera: "top", tilt: 200, distance: 9, light: "night", shadows: false, fog: true },
    things: [
      { id: "a", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9, d3: { shape: "model", src: "/m/car.glb", height: 30, lift: 5, metal: 3, rough: -1 } },
      { id: "b", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9, d3: { shape: "model", src: "javascript:alert(1)" } },
      { id: "c", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9, d3: { shape: "pyramid" } },
    ],
    tiles: { size: 40, cols: 1, rows: 1, map: ["#"], kinds: { "#": { look: { kind: "box" }, solid: true, height: 25 } } },
  }, say)!;
  expect(g.view3d).toEqual({ mode: "ground", camera: "top", tilt: 89, distance: 3, light: "night", shadows: false, fog: true });
  expect(g.things[0].d3).toEqual({ shape: "model", src: "/m/car.glb", height: 30, lift: 5, metal: 1, rough: 0 });
  expect(g.things[1].d3.shape).toBe("auto");
  expect(g.things[2].d3.shape).toBe("auto");
  expect(g.tiles!.kinds["#"].height).toBe(25);
});

test("a thing's 3D shape from its look: a box, a ball, a raised convex shape, a card for a picture; its height from its size", () => {
  const spec = gameOf({ things: [
    { id: "box", look: { kind: "box" }, x: 1, y: 1, w: 40, h: 60 },
    { id: "ball", look: { kind: "circle" }, x: 1, y: 1, w: 30, h: 30 },
    { id: "ramp", look: { kind: "box" }, x: 1, y: 1, w: 40, h: 40, body: "rigid", shape: "poly", points: [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5]] },
    { id: "fox", look: { kind: "emoji", emoji: "🦊" }, x: 1, y: 1, w: 50, h: 40 },
    { id: "cone", look: { kind: "emoji", emoji: "🔺" }, x: 1, y: 1, w: 50, h: 40, d3: { shape: "cone", height: 70 } },
    { id: "car", look: { kind: "box" }, x: 1, y: 1, w: 30, h: 50, d3: { shape: "model", src: "/m/car.glb" } },
  ] }, say)!;
  const by = (id: string) => spec.things.find((t) => t.id === id)!;
  expect(["box", "ball", "ramp", "fox", "cone", "car"].map((id) => shapeOf3d(by(id)))).toEqual(["box", "ball", "poly", "card", "cone", "model"]);
  expect(heightOf3d(by("box"), 40, 60)).toBe(40);
  expect(heightOf3d(by("fox"), 50, 40)).toBe(50);
  expect(heightOf3d(by("cone"), 50, 40)).toBe(70);
});

/** A car on an open floor seen from above (no gravity), facing up the world. */
function lot(more: Record<string, unknown> = {}) {
  const s = newGame(gameOf({
    w: 800, h: 800, ww: 4000, wh: 4000, edges: "walls", gravity: 0,
    things: [{ id: "car", look: { kind: "box" }, x: 2000, y: 3600, w: 30, h: 50, body: "dynamic", control: "car", speed: 500, tags: ["player"], ...more }],
  }, say)!);
  startGame(s);
  return { s, car: s.bodies[0] };
}

test("the car: up drives it the way it faces, faster up to its top speed; it turns only as it moves; down brakes then backs it slowly", () => {
  const { s, car } = lot();
  // Still, it doesn't turn.
  steps(s, 30, input({ left: true }));
  expect(car.rot).toBe(0);
  steps(s, 30, input({ up: true }));
  expect(car.y).toBeLessThan(3600);
  expect(Math.abs(car.x - 2000)).toBeLessThan(0.01);
  steps(s, 60, input({ up: true }));
  expect(Math.hypot(car.vx, car.vy)).toBeCloseTo(500, -1);
  // Turning right as it goes: its heading turns, and it goes that way (gripping, not sliding on).
  steps(s, 20, input({ up: true, right: true }));
  expect(car.rot).toBeGreaterThan(0.5);
  const dir = Math.atan2(car.vx, -car.vy);
  expect(Math.abs(dir - car.rot)).toBeLessThan(0.25);
  // Down: it stops, then backs up, slower than it goes forward.
  steps(s, 120, input({ down: true }));
  const along = car.vx * Math.sin(car.rot) - car.vy * Math.cos(car.rot);
  expect(along).toBeLessThan(0);
  expect(Math.abs(along)).toBeLessThanOrEqual(500 * 0.4 + 1);
  // Let go: it rolls to a stop.
  steps(s, 300);
  expect(Math.hypot(car.vx, car.vy)).toBeLessThan(5);
});

test("the car stops at a wall of the map; the ready rally and the 3D adventure are whole games in 3D", () => {
  const s = newGame(gameOf({
    w: 400, h: 400, gravity: 0, edges: "walls",
    tiles: { size: 40, cols: 10, rows: 10, map: ["##########", ...Array(8).fill("#........#"), "##########"], kinds: { "#": { look: { kind: "box" }, solid: true } } },
    things: [{ id: "car", look: { kind: "box" }, x: 200, y: 300, w: 30, h: 30, body: "dynamic", control: "car", speed: 600, tags: ["player"] }],
  }, say)!);
  startGame(s);
  steps(s, 180, input({ up: true }));
  expect(s.bodies[0].y).toBeGreaterThanOrEqual(40 + 15 - 0.01);
  const rally = gameOf(READY_GAMES.find((g) => g.key === "rally")!.game, say)!;
  expect(rally.view3d.mode).toBe("ground");
  const r = newGame(rally);
  expect(r.bodies.filter((b) => b.of === "coin")).toHaveLength(14);
  expect(r.bodies.find((b) => b.of === "car")!.thing.control).toBe("car");
  startGame(r);
  steps(r, 120, input({ up: true }));
  expect(r.bodies.find((b) => b.of === "car")!.y).toBeLessThan(15 * 60);
  const adv = gameOf(READY_GAMES.find((g) => g.key === "adventure3d")!.game, say)!;
  expect([adv.view3d.mode, adv.view3d.light, adv.tiles!.levels.length]).toEqual(["wall", "sunset", 1]);
});
