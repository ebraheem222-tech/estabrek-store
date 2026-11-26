import { expect, test } from "@playwright/test";
import RAPIER from "@dimforge/rapier2d-deterministic-compat";
import { NO_INPUT, endGame, newGame, startGame, stepGame, type GameInput, type GameState } from "../src/pageTree/gameEngine";
import { gameOf } from "../src/pageTree/gameSpec";
import { aimPath, type Rapier } from "../src/pageTree/gamePhysics";
import { READY_GAMES } from "../src/pageTree/gameReady";

// G2 of the games stage (docs/game-engine-plan.ar.md): rigid things worked out by Rapier, the sling, rest and home,
// explosions; and without Rapier, the arcade's bodies instead.
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const input = (more: Partial<GameInput> = {}): GameInput => ({ ...NO_INPUT, pressed: [], taps: [], ...more });
const steps = (s: GameState, n: number, i: GameInput = NO_INPUT) => { for (let k = 0; k < n; k++) stepGame(s, i); };
const body = (s: GameState, id: string) => s.bodies.find((b) => b.of === id)!;
let R: Rapier;
test.beforeAll(async () => { await RAPIER.init(); R = RAPIER as unknown as Rapier; });

const WALL = { look: { kind: "box", color: "text" }, solid: true };
/** A room 800 × 400 with a floor of tiles (row 9 of 10, 40 px each), and the game's things. */
function room(things: unknown[], more: Record<string, unknown> = {}, physics = true) {
  const s = newGame(gameOf({
    w: 800, h: 400, edges: "walls", gravity: 2000,
    tiles: { size: 40, cols: 20, rows: 10, map: [...Array(9).fill("."), "#".repeat(20)], kinds: { "#": WALL } },
    things, ...more,
  }, say)!, physics ? R : null);
  startGame(s);
  return s;
}
const crate = (id: string, x: number, y: number, more: Record<string, unknown> = {}) => ({ id, look: { kind: "box", color: "accent" }, x, y, w: 40, h: 40, body: "rigid", density: 1, friction: 0.7, ...more });

test("a rigid box falls onto the map's floor and rests there; a stack of three stays standing", () => {
  const s = room([crate("a", 400, 100), crate("b", 600, 320), crate("c", 600, 280), crate("d", 600, 240)]);
  expect(s.phys).not.toBeNull();
  steps(s, 120);
  const a = body(s, "a");
  expect(a.y).toBeCloseTo(360 - 20, 0);
  expect(Math.abs(a.vy)).toBeLessThan(2);
  // The stack: each on the one below, none fallen.
  steps(s, 120);
  expect(body(s, "b").y).toBeCloseTo(340, 0);
  expect(body(s, "c").y).toBeCloseTo(300, 0);
  expect(body(s, "d").y).toBeCloseTo(260, 0);
  expect(Math.abs(body(s, "d").x - 600)).toBeLessThan(2);
  endGame(s);
});

test("without Rapier, rigid things are the arcade's dynamic bodies (they still fall and land)", () => {
  const s = room([crate("a", 400, 100)], {}, false);
  expect(s.phys).toBeNull();
  expect(body(s, "a").thing.body).toBe("dynamic");
  steps(s, 120);
  expect(body(s, "a").y).toBeCloseTo(340, 0);
});

test("a fast thing never passes through a thin wall; two rigid things meet once as they touch", () => {
  const s = room([
    { id: "bullet", look: { kind: "circle", color: "text" }, x: 100, y: 200, w: 12, h: 12, body: "rigid", gravity: 0, fast: true, vx: 6000, tags: ["shot"] },
    { id: "pane", look: { kind: "box", color: "muted" }, x: 500, y: 200, w: 4, h: 300, body: "static", solid: true },
    // One crate dropped onto another: they meet as it lands, and stay together.
    crate("low", 300, 340, { tags: ["box"] }),
    crate("high", 300, 230, { tags: ["box"] }),
  ], { rules: [{ when: { on: "hit", a: "high", b: "low" }, do: [{ act: "score", add: 1 }] }] });
  steps(s, 90);
  expect(body(s, "bullet").x).toBeLessThan(500);
  expect(s.score).toBe(1);
  steps(s, 30);
  expect(s.score).toBe(1);
  endGame(s);
});

test("the sling: pulled back near the thing, the shot's way shown; let go, it flies that way, the shot's rules run; at rest it goes home", () => {
  const ball = { id: "ball", look: { kind: "circle", color: "accent" }, x: 120, y: 330, w: 30, h: 30, body: "rigid", control: "sling", speed: 1400, bounce: 0.2, friction: 0.8, drag: 0.4, tags: ["ball"] };
  const s = room([ball], {
    rules: [
      { when: { on: "shot", who: "#ball" }, do: [{ act: "score", add: 1 }] },
      { when: { on: "rest", who: "#ball" }, do: [{ act: "home", who: "self" }, { act: "score", add: 10 }] },
    ],
  });
  steps(s, 30);
  const b = body(s, "ball");
  const start = { x: b.x, y: b.y };
  // Too far from the thing: no aim.
  stepGame(s, input({ pointer: { x: 600, y: 100 }, pointerDown: true }));
  expect(s.aim).toBeNull();
  stepGame(s, input({ pointer: { x: 600, y: 100 }, pointerDown: false }));
  // Pulled back down-left of it: it will go up-right.
  stepGame(s, input({ pointer: { x: b.x, y: b.y }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: b.x - 120, y: b.y + 120 }, pointerDown: true }));
  expect(s.aim).not.toBeNull();
  const aim = s.aim!;
  expect(aim.vx).toBeGreaterThan(0);
  expect(aim.vy).toBeLessThan(0);
  expect(aim.pts.length).toBeGreaterThan(10);
  stepGame(s, input({ pointer: { x: b.x - 120, y: b.y + 120 }, pointerDown: false }));
  expect(s.aim).toBeNull();
  expect(s.score).toBe(1);
  // Its flight is the way that was shown (to within a few pixels, the first half second).
  steps(s, 29);
  expect(Math.hypot(b.x - aim.pts[9][0], b.y - aim.pts[9][1])).toBeLessThan(12);
  // It comes down, rolls to rest, and goes home.
  for (let k = 0; k < 900 && s.score < 11; k++) stepGame(s);
  expect(s.score).toBe(11);
  // Home is where it was put (it settles from there again).
  expect(Math.hypot(b.x - 120, b.y - 330)).toBeLessThan(2);
  expect(start.y).toBeCloseTo(345, 0);
  endGame(s);
});

test("an explosion pushes the rigid things near it away, the nearer the harder; out of the world, a rule can bring a thing home", () => {
  const s = room([
    { id: "bomb", look: { kind: "emoji", emoji: "💣" }, x: 400, y: 340, w: 30, h: 30, body: "none", tags: ["bomb"] },
    crate("near", 460, 340),
    crate("far", 640, 340),
    { id: "ball", look: { kind: "circle" }, x: 100, y: 100, w: 20, h: 20, body: "rigid", gravity: 0, vx: -3000, fast: true },
  ], {
    edges: "floor",
    rules: [
      { when: { on: "tap", who: "#bomb" }, do: [{ act: "explode", who: "self", radius: 300, power: 1200 }] },
      { when: { on: "out", who: "ball" }, do: [{ act: "home", who: "self" }, { act: "score", add: 1 }] },
    ],
  });
  steps(s, 30);
  const bomb = body(s, "bomb");
  stepGame(s, input({ taps: [{ x: bomb.x, y: bomb.y }] }));
  steps(s, 2);
  const near = body(s, "near"), far = body(s, "far");
  expect(near.vx).toBeGreaterThan(far.vx);
  expect(far.vx).toBeGreaterThan(0);
  steps(s, 60);
  // The ball flew out to the left: home again, and still in the world.
  expect(s.score).toBeGreaterThanOrEqual(1);
  expect(s.bodies.some((x) => x.of === "ball")).toBe(true);
  endGame(s);
});

test("the shot's way: gravity bends it down, drag shortens it", () => {
  const spec = gameOf({ gravity: 1000, things: [{ id: "a", look: { kind: "box" }, x: 0, y: 0, w: 10, h: 10, body: "rigid" }] }, say)!;
  const t = spec.things[0];
  const free = aimPath(spec, t, 0, 0, 600, -600);
  expect(free[free.length - 1][1]).toBeGreaterThan(free[5][1]);
  const dragged = aimPath(spec, { ...t, drag: 2 }, 0, 0, 600, -600);
  expect(dragged[dragged.length - 1][0]).toBeLessThan(free[free.length - 1][0]);
});

test("the ready cans: ten cans stand on the table until the ball comes; a good shot knocks some off, and the ball comes home", () => {
  const s = newGame(gameOf(READY_GAMES.find((g) => g.key === "cans")!.game, say)!, R);
  startGame(s);
  steps(s, 120);
  const cans = () => s.bodies.filter((b) => b.of.startsWith("can-"));
  expect(cans()).toHaveLength(10);
  expect(cans().every((c) => Math.abs(c.rot) < 0.05 && c.y < 400)).toBe(true);
  const ball = body(s, "ball");
  expect(ball.y).toBeCloseTo(360, 0);
  // Pulled back down-left, let go: up and over toward the cans.
  stepGame(s, input({ pointer: { x: ball.x, y: ball.y }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: ball.x - 160, y: ball.y + 40 }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: ball.x - 160, y: ball.y + 40 }, pointerDown: false }));
  for (let k = 0; k < 600 && s.score === 0; k++) stepGame(s);
  expect(s.score).toBeGreaterThan(0);
  for (let k = 0; k < 900 && body(s, "ball").flying; k++) stepGame(s);
  expect(body(s, "ball").x).toBeCloseTo(150, 0);
  endGame(s);
});

test("the ready mini golf: three holes; the ball starts at its mark, a stroke counts, and the grass slows it to a stop", () => {
  const spec = gameOf(READY_GAMES.find((g) => g.key === "golf")!.game, say)!;
  expect(spec.tiles!.levels).toHaveLength(2);
  expect([spec.ww, spec.wh]).toEqual([945, 540]);
  const s = newGame(spec, R);
  startGame(s);
  const ball = body(s, "ball");
  expect([ball.x, ball.y]).toEqual([4 * 45 + 22.5, 3 * 45 + 22.5]);
  stepGame(s, input({ pointer: { x: ball.x, y: ball.y }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: ball.x - 60, y: ball.y + 40 }, pointerDown: true }));
  stepGame(s, input({ pointer: { x: ball.x - 60, y: ball.y + 40 }, pointerDown: false }));
  expect(s.score).toBe(1);
  steps(s, 20);
  expect(Math.hypot(ball.vx, ball.vy)).toBeGreaterThan(100);
  steps(s, 600);
  expect(Math.hypot(ball.vx, ball.vy)).toBeLessThan(12);
  expect(s.phase).toBe("playing");
  endGame(s);
});
