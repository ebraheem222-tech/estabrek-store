import { expect, test } from "@playwright/test";
import { NO_INPUT, newGame, startGame, stepGame, type GameInput, type GameState } from "../src/pageTree/gameEngine";
import { gameOf } from "../src/pageTree/gameSpec";

// G1 of the games stage (docs/game-engine-plan.ar.md): the tile map, the camera, a platformer's feel, frames' states.
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const input = (more: Partial<GameInput> = {}): GameInput => ({ ...NO_INPUT, ...more });
const steps = (s: GameState, n: number, i: GameInput = NO_INPUT) => { for (let k = 0; k < n; k++) stepGame(s, i); };
const Z = 40;
const kinds = {
  "#": { look: { kind: "box", color: "text" }, solid: true },
  "=": { look: { kind: "box", color: "accent" }, oneWay: true },
  "^": { look: { kind: "emoji", emoji: "🔥" }, tags: ["spike"] },
  "B": { look: { kind: "box", color: "muted" }, solid: true, tags: ["brick"] },
  "o": { look: { kind: "box" }, thing: "coin" },
};
/** A level: rows of the map (the hero "@" stands where it's written, as a thing, not a tile). */
function level(rows: string[], more: Record<string, unknown> = {}, hero: Record<string, unknown> = {}) {
  let hx = 60, hy = 60;
  const map = rows.map((line, r) => line.replace(/@/g, (_m, c: number) => { hx = c * Z + Z / 2; hy = r * Z + Z - 18; return "."; }));
  const g = gameOf({
    w: 400, h: 240, edges: "open", gravity: 2400, lives: 3,
    tiles: { size: Z, cols: rows[0].length, rows: rows.length, map, kinds },
    things: [
      { id: "hero", look: { kind: "box" }, x: hx, y: hy, w: 30, h: 36, body: "dynamic", control: "platform", speed: 300, jump: 760, tags: ["player"], ...hero },
      { id: "coin", look: { kind: "emoji", emoji: "💎" }, x: 0, y: 0, w: 24, h: 24, body: "none", template: true, tags: ["coin"] },
    ],
    ...more,
  }, say)!;
  const s = newGame(g);
  startGame(s);
  return s;
}
const hero = (s: GameState) => s.bodies.find((b) => b.of === "hero")!;

test("a map is read safely: rows as wide as the map, unknown letters empty, a thing tile only for a thing of the game; the world as big as the map", () => {
  const g = gameOf({ w: 400, h: 240, things: [{ id: "a", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9 }], tiles: { size: 40, cols: 4, rows: 3, map: ["##", "x?#.##", null], kinds: { "#": { look: { kind: "box" }, solid: true }, "?": { look: { kind: "box" }, thing: "a" }, ".": { look: { kind: "box" } } } } }, say)!;
  expect(g.tiles!.map).toEqual(["##..", ".?#.", "...."]);
  // "a" isn't a template: its tile is where it starts (G1b); "." is never a kind; a thing the game hasn't, no thing.
  expect(Object.keys(g.tiles!.kinds)).toEqual(["#", "?"]);
  expect(g.tiles!.kinds["?"].thing).toBe("a");
  expect(gameOf({ things: [{ id: "a", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9 }], tiles: { size: 40, cols: 1, rows: 1, map: ["?"], kinds: { "?": { look: { kind: "box" }, thing: "zed" } } } }, say)!.tiles!.kinds["?"].thing).toBe("");
  expect([g.ww, g.wh]).toEqual([400, 240]);
  const big = gameOf({ w: 400, h: 240, things: [{ id: "a", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9 }], tiles: { size: 50, cols: 30, rows: 6, map: [], kinds: {} } }, say)!;
  expect([big.ww, big.wh]).toEqual([1500, 300]);
  // A map alone (no thing in the world) is still something to play.
  expect(gameOf({ things: [], tiles: { size: 40, cols: 2, rows: 1, map: ["##"], kinds: { "#": { look: { kind: "box" }, solid: true } } } }, say)).not.toBeNull();
});

test("on the tiles: it lands on them, walks across their seams without snagging, and stops at a wall", () => {
  const s = level([
    "..........",
    "..@.....#.",
    "##########",
  ]);
  steps(s, 40);
  expect(hero(s).grounded).toBe(true);
  expect(hero(s).y).toBeCloseTo(2 * Z - 18, 3);
  const xs: number[] = [];
  for (let k = 0; k < 90; k++) { stepGame(s, input({ right: true })); xs.push(hero(s).x); }
  // Steady over every seam until the wall, then pressed against it.
  expect(xs.slice(10, 40).every((x, i, a) => i === 0 || x > a[i - 1])).toBe(true);
  expect(hero(s).x).toBeCloseTo(8 * Z - 15, 3);
  expect(hero(s).grounded).toBe(true);
});

test("a one-way platform: jumped through from below, stood on from above", () => {
  const s = level([
    "..........",
    "...====...",
    "..........",
    "....@.....",
    "##########",
  ], {}, { jump: 900 });
  steps(s, 30);
  const floor = hero(s).y;
  stepGame(s, input({ pressed: ["Space"], jumpHeld: true }));
  // Up through the platform, and down onto it.
  let highest = floor;
  for (let k = 0; k < 90; k++) { stepGame(s, input({ jumpHeld: true })); highest = Math.min(highest, hero(s).y); }
  expect(highest).toBeLessThan(2 * Z);
  expect(hero(s).grounded).toBe(true);
  expect(hero(s).y).toBeCloseTo(Z - 18, 3);
});

test("a tile with a tag meets the rules once as it's touched; a rule can take a tile away; tiles that are things start as things", () => {
  const s = level([
    "...o......",
    "..@.^.....",
    "####BB####",
  ], {
    rules: [
      { when: { on: "hit", a: "#player", b: "#spike" }, do: [{ act: "lives", add: -1 }] },
      { when: { on: "hit", a: "#player", b: "#brick" }, do: [{ act: "destroy", who: "other" }, { act: "score", add: 1 }] },
      { when: { on: "hit", a: "#player", b: "#coin" }, do: [{ act: "destroy", who: "other" }, { act: "score", add: 10 }] },
    ],
  });
  // The coin was put in its cell as a thing.
  expect(s.bodies.some((b) => b.of === "coin")).toBe(true);
  expect(s.tiles![0][3]).toBe(".");
  steps(s, 20);
  const v = s.tilesV;
  for (let k = 0; k < 40; k++) stepGame(s, input({ right: true }));
  // Through the spike (once), over the bricks: each brick touched is taken away.
  expect(s.lives).toBe(2);
  expect(s.tilesV).toBeGreaterThan(v);
  expect(s.tiles![2].join("")).toContain(".");
  expect(s.score).toBeGreaterThanOrEqual(1);
});

test("the camera follows the player through a world bigger than the view, and stays inside it", () => {
  const row = "#".repeat(40);
  const s = level(["." + "@" + ".".repeat(38), ".".repeat(40), row], { w: 400, h: 120 });
  steps(s, 20);
  expect(s.cx).toBe(0);
  steps(s, 200, input({ right: true }));
  expect(s.cx).toBeGreaterThan(200);
  expect(Math.abs(hero(s).x - (s.cx + 200))).toBeLessThan(80);
  steps(s, 400, input({ right: true }));
  // The world's right end: the camera stops at it.
  expect(s.cx).toBeCloseTo(40 * Z - 400, 0);
});

test("a platformer's feel: a little time to jump after leaving an edge, a press kept a moment before landing, a shorter jump when let go", () => {
  // Off an edge: a jump 4 frames later still jumps; 20 frames later it doesn't.
  const late = (frames: number) => {
    const s = level(["......", "..@...", "###...", "......", "......"]);
    steps(s, 20);
    while (hero(s).grounded) stepGame(s, input({ right: true }));
    steps(s, frames, input({ right: true }));
    stepGame(s, input({ pressed: ["Space"], jumpHeld: true }));
    return hero(s).vy < 0;
  };
  expect(late(4)).toBe(true);
  expect(late(20)).toBe(false);
  // A press 4 frames before landing jumps on landing.
  const s = level(["......", "..@...", "......", "......", "######"]);
  while (hero(s).y < 4 * Z - 18 - 40) stepGame(s);
  stepGame(s, input({ pressed: ["Space"], jumpHeld: true }));
  let jumped = false;
  for (let k = 0; k < 12; k++) { stepGame(s, input({ jumpHeld: true })); if (hero(s).vy < -100) jumped = true; }
  expect(jumped).toBe(true);
  // Held, it goes higher than let go at once.
  const peak = (held: boolean) => {
    const g = level(["......", "......", "......", "......", "..@...", "######"]);
    steps(g, 20);
    stepGame(g, input({ pressed: ["Space"], jumpHeld: true }));
    let top = hero(g).y;
    for (let k = 0; k < 60; k++) { stepGame(g, input({ jumpHeld: held })); top = Math.min(top, hero(g).y); }
    return top;
  };
  expect(peak(true)).toBeLessThan(peak(false) - 20);
});

test("a body's frames' state and the way it faces; a patrol turns back at a ledge", () => {
  const s = level(["..........", "..@.......", "##########"]);
  steps(s, 30);
  expect(hero(s).anim).toBe("idle");
  steps(s, 10, input({ left: true }));
  expect([hero(s).anim, hero(s).face]).toEqual(["run", -1]);
  stepGame(s, input({ pressed: ["Space"], jumpHeld: true }));
  steps(s, 3, input({ jumpHeld: true }));
  expect(hero(s).anim).toBe("jump");
  steps(s, 25, input({ jumpHeld: true }));
  expect(hero(s).anim).toBe("fall");

  const p = level(["........", "...@....", "..###...", "........"], {}, { control: "none", behave: "patrol", speed: 120 });
  steps(p, 240);
  const xs: number[] = [];
  for (let k = 0; k < 240; k++) { stepGame(p); xs.push(hero(p).x); }
  // It walks back and forth on its three tiles and never falls off.
  expect(hero(p).y).toBeLessThan(2 * Z);
  expect(Math.min(...xs)).toBeGreaterThanOrEqual(2 * Z - 20);
  expect(Math.max(...xs)).toBeLessThanOrEqual(5 * Z + 20);
});
