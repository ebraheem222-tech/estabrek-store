import { expect, test } from "@playwright/test";
import RAPIER from "@dimforge/rapier2d-deterministic-compat";
import { NO_INPUT, endGame, newGame, startGame, stepGame, type GameInput, type GameState } from "../src/pageTree/gameEngine";
import { gameOf } from "../src/pageTree/gameSpec";
import { physJoints, type Rapier } from "../src/pageTree/gamePhysics";
import { READY_GAMES } from "../src/pageTree/gameReady";

// G2b of the games stage (docs/game-engine-plan.ar.md): joints (pin, weld, rope, spring, slider), their limits and
// motors on keys, breaking and cutting them; a crate pushed by the player; the pinball.
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const input = (more: Partial<GameInput> = {}): GameInput => ({ ...NO_INPUT, pressed: [], taps: [], ...more });
const steps = (s: GameState, n: number, i: GameInput = NO_INPUT) => { for (let k = 0; k < n; k++) stepGame(s, i); };
const body = (s: GameState, id: string) => s.bodies.find((b) => b.of === id)!;
const deg = (r: number) => (r * 180) / Math.PI;
let R: Rapier;
test.beforeAll(async () => { await RAPIER.init(); R = RAPIER as unknown as Rapier; });

const WALL = { look: { kind: "box", color: "text" }, solid: true };
function world(things: unknown[], joints: unknown[], more: Record<string, unknown> = {}) {
  const s = newGame(gameOf({
    w: 800, h: 400, edges: "walls", gravity: 2000,
    tiles: { size: 40, cols: 20, rows: 10, map: [...Array(9).fill("."), "#".repeat(20)], kinds: { "#": WALL } },
    things, joints, ...more,
  }, say)!, R);
  startGame(s);
  return s;
}
const box = (id: string, x: number, y: number, more: Record<string, unknown> = {}) => ({ id, look: { kind: "box", color: "accent" }, x, y, w: 40, h: 40, body: "rigid", ...more });

test("a pin to the world: a pendulum swings about it at its length; a weld holds two boxes as one", () => {
  const s = world([box("bob", 400, 100, { shape: "circle", w: 30, h: 30 }), box("left", 200, 200), box("right", 240, 200)], [
    { kind: "pin", a: "bob", b: "", ax: -150, ay: 0 },
    { kind: "weld", a: "left", b: "right", ax: 20, ay: 0 },
  ]);
  for (let k = 0; k < 90; k++) {
    stepGame(s);
    const bob = body(s, "bob");
    expect(Math.abs(Math.hypot(bob.x - 250, bob.y - 100) - 150)).toBeLessThan(3);
  }
  expect(body(s, "bob").y).toBeGreaterThan(150);
  steps(s, 90);
  const l = body(s, "left"), r = body(s, "right");
  // Landed together, side by side as they were.
  expect(Math.hypot(r.x - l.x, r.y - l.y)).toBeCloseTo(40, 0);
  expect(l.y).toBeCloseTo(340, 0);
  // Drawn: the pin's two ends at one point.
  const [pin] = physJoints(s.phys, s);
  expect(Math.hypot(pin.from.x - pin.to.x, pin.from.y - pin.to.y)).toBeLessThan(3);
  endGame(s);
});

test("a rope holds no further than its length; a spring bounces back; a slider goes only along its line, within its limits", () => {
  const s = world([
    box("hung", 200, 100, { shape: "circle", w: 24, h: 24 }),
    box("bouncer", 400, 100),
    box("rail", 600, 100, { gravity: 0 }),
    { id: "bomb", look: { kind: "box" }, x: 560, y: 100, w: 10, h: 10, body: "none", tags: ["bomb"] },
  ], [
    { kind: "rope", a: "hung", b: "", bx: 200, by: 50, length: 100 },
    { kind: "spring", a: "bouncer", b: "", bx: 400, by: 40, length: 60, stiffness: 30, damping: 0.5 },
    { kind: "slider", a: "rail", b: "", axis: 0, limits: [-50, 50] },
  ], { rules: [{ when: { on: "tap", who: "#bomb" }, do: [{ act: "explode", who: "self", radius: 200, power: 3000 }] }] });
  let lowest = 0;
  for (let k = 0; k < 120; k++) {
    stepGame(s);
    const h = body(s, "hung");
    expect(Math.hypot(h.x - 200, h.y - 50)).toBeLessThan(103);
    lowest = Math.max(lowest, body(s, "bouncer").y);
  }
  // The spring stretched under the box, then pulled it back up.
  expect(lowest).toBeGreaterThan(130);
  expect(body(s, "bouncer").y).toBeLessThan(lowest - 5);
  // The bomb pushes the slider's box hard to the right: it goes along x only, as far as its limit.
  stepGame(s, input({ taps: [{ x: 560, y: 100 }] }));
  steps(s, 60);
  const rail = body(s, "rail");
  expect(rail.y).toBeCloseTo(100, 0);
  expect(rail.x).toBeGreaterThan(630);
  expect(rail.x).toBeLessThan(653);
  endGame(s);
});

test("a motor on a key: a flipper rests down, lifts while the key is held, and falls back; one always on turns on", () => {
  const s = world([
    box("flip", 400, 200, { w: 120, h: 20, density: 4, gravity: 0 }),
    box("spin", 200, 150, { w: 100, h: 12, gravity: 0 }),
  ], [
    { kind: "pin", a: "flip", b: "", ax: -60, ay: 0, limits: [-30, 30], motor: { speed: -900, key: "ArrowLeft", power: 200 } },
    { kind: "pin", a: "spin", b: "", motor: { speed: 180, key: "", power: 40 } },
  ]);
  steps(s, 30);
  expect(deg(body(s, "flip").rot)).toBeCloseTo(30, 0);
  steps(s, 12, input({ left: true }));
  expect(deg(body(s, "flip").rot)).toBeCloseTo(-30, 0);
  steps(s, 20);
  expect(deg(body(s, "flip").rot)).toBeCloseTo(30, 0);
  // Pinned at its end: that end stays put.
  const f = body(s, "flip");
  expect(f.x - 60 * Math.cos(f.rot)).toBeCloseTo(340, 0);
  // About 180° a second.
  expect(Math.abs(deg(body(s, "spin").rot))).toBeGreaterThan(60);
  endGame(s);
});

test("a joint breaks when its thing is hit harder than its strength (an explosion), or cut by a rule: the rules for its things run", () => {
  const s = world([
    box("bob", 400, 100, { shape: "circle", w: 30, h: 30, tags: ["bob"] }),
    box("lamp", 600, 100, { shape: "circle", w: 30, h: 30, tags: ["lamp"] }),
    { id: "bomb", look: { kind: "box" }, x: 400, y: 160, w: 10, h: 10, body: "none", tags: ["bomb"] },
  ], [
    { kind: "pin", a: "bob", b: "", ax: 0, ay: -60, breakAt: 300 },
    { kind: "rope", a: "lamp", b: "", bx: 600, by: 20, length: 80 },
  ], {
    rules: [
      { when: { on: "tap", who: "#bomb" }, do: [{ act: "explode", who: "self", radius: 200, power: 5000 }] },
      { when: { on: "tap", who: "#lamp" }, do: [{ act: "cut", who: "self" }] },
      { when: { on: "break", who: "#bob" }, do: [{ act: "score", add: 1 }] },
      { when: { on: "break", who: "#lamp" }, do: [{ act: "score", add: 10 }] },
    ],
  });
  steps(s, 30);
  expect(s.phys!.joints.filter((j) => !j.gone)).toHaveLength(2);
  stepGame(s, input({ taps: [{ x: 400, y: 160 }] }));
  steps(s, 5);
  expect(s.score).toBe(1);
  // The lamp hangs at its rope's length; cut, it falls to the floor.
  const lamp = body(s, "lamp");
  stepGame(s, input({ taps: [{ x: lamp.x, y: lamp.y }] }));
  expect(s.score).toBe(11);
  steps(s, 90);
  expect(body(s, "lamp").y).toBeGreaterThan(300);
  expect(s.phys!.joints.every((j) => j.gone)).toBe(true);
  endGame(s);
});

test("a plank welded to the world holds a light box set on it and breaks under a heavy one (its weight past its strength)", () => {
  const plank = (id: string, x: number) => box(id, x, 200, { w: 160, h: 16, gravity: 0 });
  const s = world([plank("light-plank", 200), plank("heavy-plank", 560), box("light", 200, 172, { density: 1 }), box("heavy", 560, 172, { density: 12 })], [
    { kind: "weld", a: "light-plank", b: "", breakAt: 120 },
    { kind: "weld", a: "heavy-plank", b: "", breakAt: 120 },
  ], { rules: [{ when: { on: "break", who: "heavy-plank" }, do: [{ act: "score", add: 1 }] }] });
  steps(s, 90);
  expect(body(s, "light-plank").y).toBeCloseTo(200, 0);
  expect(body(s, "light").y).toBeCloseTo(172, 0);
  expect(s.score).toBe(1);
  expect(body(s, "heavy-plank").y).toBeGreaterThan(250);
  endGame(s);
});

test("the player walks into a rigid crate's side and pushes it along; a heavy crate goes slower", () => {
  const s = world([
    { id: "hero", look: { kind: "box" }, x: 100, y: 335, w: 30, h: 50, body: "dynamic", control: "platform", speed: 240, tags: ["player"] },
    box("crate", 200, 340, { solid: true, friction: 0.3 }),
    box("safe", 500, 340, { solid: true, friction: 0.3, density: 6 }),
  ], []);
  steps(s, 20);
  steps(s, 60, input({ right: true }));
  const hero = body(s, "hero"), crate = body(s, "crate");
  expect(crate.x).toBeGreaterThan(260);
  expect(hero.x).toBeLessThan(crate.x - 30);
  // On to the heavy one: it moves, slowly.
  steps(s, 120, input({ right: true }));
  const safe = body(s, "safe");
  expect(safe.x).toBeGreaterThan(500);
  expect(safe.x).toBeLessThan(crate.x + 400);
  endGame(s);
});

test("the ready pinball: the flippers rest down and lift on their arrows; a bumper kicks the ball off and scores", () => {
  const s = newGame(gameOf(READY_GAMES.find((g) => g.key === "pinball")!.game, say)!, R);
  startGame(s);
  steps(s, 30);
  expect(deg(body(s, "flipper-l").rot)).toBeCloseTo(30, 0);
  expect(deg(body(s, "flipper-r").rot)).toBeCloseTo(-30, 0);
  steps(s, 12, input({ left: true, right: true }));
  expect(deg(body(s, "flipper-l").rot)).toBeCloseTo(-30, 0);
  expect(deg(body(s, "flipper-r").rot)).toBeCloseTo(30, 0);
  for (let k = 0; k < 300 && s.score < 10; k++) stepGame(s);
  expect(s.score).toBeGreaterThanOrEqual(10);
  expect(body(s, "ball").vy).toBeLessThan(0);
  endGame(s);
});
