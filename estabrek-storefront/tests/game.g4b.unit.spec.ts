import { expect, test } from "@playwright/test";
import RAPIER3 from "@dimforge/rapier3d-deterministic-compat";
import { NO_INPUT, endGame, newGame, startGame, stepGame, type GameInput, type GameState } from "../src/pageTree/gameEngine";
import { gameOf } from "../src/pageTree/gameSpec";
import type { Rapier3 } from "../src/pageTree/gamePhysics3d";
import { READY_GAMES } from "../src/pageTree/gameReady";

// G4b of the games stage (docs/game-engine-plan.ar.md): real 3D physics on the ground: things fall, rest, stack, roll,
// tip over; a walker walks and jumps up onto a block; things meet only when their heights meet.
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const input = (more: Partial<GameInput> = {}): GameInput => ({ ...NO_INPUT, pressed: [], taps: [], ...more });
const steps = (s: GameState, n: number, i: GameInput = NO_INPUT) => { for (let k = 0; k < n; k++) stepGame(s, i); };
const body = (s: GameState, id: string) => s.bodies.find((b) => b.of === id)!;
let R3: Rapier3;
test.beforeAll(async () => { await RAPIER3.init(); R3 = RAPIER3 as unknown as Rapier3; });

/** A floor 1200 × 1200 seen in 3D on the ground, with real 3D physics. */
function floor(things: unknown[], more: Record<string, unknown> = {}, given = true) {
  const s = newGame(gameOf({
    w: 960, h: 540, ww: 1200, wh: 1200, edges: "walls", gravity: 0,
    view3d: { mode: "ground", physics: true, gravity: 2000 },
    things, ...more,
  }, say)!, null, given ? R3 : null);
  startGame(s);
  return s;
}
const crate = (id: string, x: number, y: number, lift: number, more: Record<string, unknown> = {}) => ({ id, look: { kind: "box", color: "accent" }, x, y, w: 40, h: 40, body: "rigid", d3: { height: 40, lift }, friction: 0.7, ...more });

test("crates fall to the ground and rest on it; three stacked stay standing; without the 3D build they're the flat game's", () => {
  const s = floor([crate("a", 300, 300, 200), crate("b", 600, 600, 0), crate("c", 600, 600, 40), crate("d", 600, 600, 80)]);
  expect(s.phys3).not.toBeNull();
  steps(s, 120);
  expect(body(s, "a").z).toBeCloseTo(20, 0);
  expect(body(s, "a").q).not.toBeNull();
  expect([body(s, "b").z, body(s, "c").z, body(s, "d").z].map((z) => Math.round(z))).toEqual([20, 60, 100]);
  expect(Math.abs(body(s, "d").x - 600)).toBeLessThan(2);
  endGame(s);
  const flat = floor([crate("a", 300, 300, 200)], {}, false);
  expect(flat.phys3).toBeNull();
});

test("a ball slung across the ground rolls on, slowed by its drag, and turns as it rolls", () => {
  const s = floor([{ id: "ball", look: { kind: "circle", color: "text" }, x: 200, y: 1000, w: 40, h: 40, body: "rigid", control: "sling", speed: 1200, drag: 0.6, friction: 0.5, tags: ["ball"] }]);
  steps(s, 20);
  const b = body(s, "ball");
  stepGame(s, input({ pointer: { x: b.x, y: b.y }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: b.x, y: b.y + 120 }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: b.x, y: b.y + 120 }, pointerDown: false }));
  steps(s, 30);
  expect(b.y).toBeLessThan(900);
  expect(Math.abs(b.z - 20)).toBeLessThan(2);
  const speed = Math.hypot(b.vx, b.vy);
  steps(s, 60);
  expect(Math.hypot(b.vx, b.vy)).toBeLessThan(speed);
  // It rolls: its turn isn't still upright-and-the-same.
  expect(Math.abs(b.q![0]) + Math.abs(b.q![2])).toBeGreaterThan(0.05);
  endGame(s);
});

test("a walker walks across the ground, jumps on Space only from the ground, and up onto a block, standing on its top", () => {
  const s = floor([{ id: "hop", look: { kind: "emoji", emoji: "🐸" }, x: 300, y: 600, w: 40, h: 40, body: "dynamic", control: "walk", speed: 300, jump: 900, tags: ["player"] }], {
    tiles: { size: 60, cols: 20, rows: 20, map: Array.from({ length: 20 }, (_, r) => (r === 10 ? ".......BB..........." : "....................")), kinds: { B: { look: { kind: "box" }, solid: true, height: 60 } } },
  });
  steps(s, 40);
  const hop = body(s, "hop");
  expect(hop.grounded).toBe(true);
  const z0 = hop.z;
  steps(s, 30, input({ right: true }));
  expect(hop.x).toBeGreaterThan(380);
  expect(hop.z).toBeCloseTo(z0, 0);
  // A jump: up, and down again.
  stepGame(s, input({ pressed: ["Space"] }));
  steps(s, 10);
  expect(hop.z).toBeGreaterThan(z0 + 60);
  steps(s, 60);
  expect(hop.z).toBeCloseTo(z0, 0);
  // The block at cells 7–8 of row 10 (x 420…540, y 600…660): jump and walk onto it, and stand on its top.
  hop.y;
  for (let k = 0; k < 90; k++) stepGame(s, input({ right: k < 22, pressed: k === 2 ? ["Space"] : [] }));
  expect(hop.x).toBeGreaterThan(420);
  expect(hop.z).toBeGreaterThan(60 + z0 - 2);
  expect(hop.grounded).toBe(true);
  endGame(s);
});

test("a pin knocked over tips (its rule once); a coin up high isn't met by a walker passing under it", () => {
  const s = floor([
    { id: "pin", look: { kind: "box", color: "white" }, x: 600, y: 300, w: 20, h: 20, body: "rigid", d3: { shape: "cylinder", height: 80 }, density: 0.5, tags: ["pin"] },
    { id: "ball", look: { kind: "circle" }, x: 600, y: 700, w: 44, h: 44, body: "rigid", density: 6, vy: -1500, fast: true },
    { id: "you", look: { kind: "emoji", emoji: "🐸" }, x: 200, y: 900, w: 40, h: 40, body: "dynamic", control: "walk", speed: 300, tags: ["player"] },
    { id: "coin", look: { kind: "circle", color: "#ffc83d" }, x: 400, y: 900, w: 30, h: 30, body: "none", d3: { lift: 120 }, tags: ["coin"] },
  ], {
    rules: [
      { when: { on: "tip", who: "#pin" }, do: [{ act: "score", add: 1 }] },
      { when: { on: "hit", a: "#player", b: "#coin" }, do: [{ act: "score", add: 10 }] },
    ],
  });
  steps(s, 90, input({ right: true }));
  expect(s.score).toBe(1);
  expect(body(s, "you").x).toBeGreaterThan(400);
  steps(s, 30);
  expect(s.score).toBe(1);
  endGame(s);
});

test("the ready bowling: a straight roll up the lane knocks pins over (each tipped a point) and the ball comes home", () => {
  const s = newGame(gameOf(READY_GAMES.find((g) => g.key === "bowling")!.game, say)!, null, R3);
  startGame(s);
  steps(s, 30);
  const pins = s.bodies.filter((b) => b.of.startsWith("pin-"));
  expect(pins).toHaveLength(10);
  expect(pins.every((p) => Math.abs(p.z - 32) < 2)).toBe(true);
  const ball = body(s, "ball");
  stepGame(s, input({ pointer: { x: ball.x, y: ball.y }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: ball.x + 4, y: ball.y + 170 }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: ball.x + 4, y: ball.y + 170 }, pointerDown: false }));
  for (let k = 0; k < 600 && s.score < 5; k++) stepGame(s);
  expect(s.score).toBeGreaterThanOrEqual(5);
  for (let k = 0; k < 900 && body(s, "ball").flying; k++) stepGame(s);
  expect(Math.abs(body(s, "ball").y - 1850)).toBeLessThan(30);
  endGame(s);
});

test("the ready hop and golf 3D: the frog stands at its start, the coins and the flag where they go, the golf ball rolls on the grass", () => {
  const hop = newGame(gameOf(READY_GAMES.find((g) => g.key === "hop")!.game, say)!, null, R3);
  startGame(hop);
  steps(hop, 40);
  const frog = body(hop, "frog");
  expect(frog.grounded).toBe(true);
  expect([frog.x, frog.y]).toEqual([expect.closeTo(450, 0), expect.closeTo(2250, 0)]);
  expect(hop.bodies.filter((b) => b.thing.tags.includes("coin"))).toHaveLength(8);
  // Jump onto the first block (50 high) from beside it: on its top.

  // Up toward it (its edge at y 1980), a jump a little before.
  for (let k = 0; k < 62; k++) stepGame(hop, input({ up: true, pressed: k === 40 ? ["Space"] : [] }));
  steps(hop, 40);
  expect(frog.z).toBeGreaterThan(70);
  endGame(hop);
  const golf = newGame(gameOf(READY_GAMES.find((g) => g.key === "golf3d")!.game, say)!, null, R3);
  startGame(golf);
  const ball = body(golf, "ball");
  stepGame(golf, input({ pointer: { x: ball.x, y: ball.y }, pointerDown: true }));
  stepGame(golf, input({ pointer: { x: ball.x - 80, y: ball.y + 30 }, pointerDown: true }));
  stepGame(golf, input({ pointer: { x: ball.x - 80, y: ball.y + 30 }, pointerDown: false }));
  expect(golf.score).toBe(1);
  steps(golf, 30);
  expect(Math.hypot(ball.vx, ball.vy)).toBeGreaterThan(100);
  expect(Math.abs(ball.z - 10)).toBeLessThan(2);
  endGame(golf);
});
