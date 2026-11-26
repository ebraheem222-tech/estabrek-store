import { expect, test } from "@playwright/test";
import { NO_INPUT, coverOf, levelCount, levelMap, newGame, startGame, stepGame, timeLeft, type GameInput, type GameState } from "../src/pageTree/gameEngine";
import { gameOf } from "../src/pageTree/gameSpec";
import { READY_GAMES } from "../src/pageTree/gameReady";
import { findPath, mazeOf, onTrack, rayBox, rayCells, trackOf } from "../src/pageTree/gameWorld";

// G1b of the games stage (docs/game-engine-plan.ar.md): mazes, the shortest way, sight, paths, levels and the cover
// between them, and the brains (guard, flee, homing, path).
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const input = (more: Partial<GameInput> = {}): GameInput => ({ ...NO_INPUT, ...more });
const steps = (s: GameState, n: number, i: GameInput = NO_INPUT) => { for (let k = 0; k < n; k++) stepGame(s, i); };
const body = (s: GameState, id: string) => s.bodies.find((b) => b.of === id)!;
const WALL = { look: { kind: "box", color: "text" }, solid: true };

test("a maze from a seed: walls all round, every corridor reached from the start, the marks on corridors; the same seed the same maze", () => {
  const marks = ["P....", ".....", "...o.", ".....", "....H"].map((r) => r.padEnd(21, ".")).concat(Array(6).fill(".".repeat(21)));
  const m = mazeOf(marks, 21, 11, "#", (c) => c === "#", 5);
  expect(m).toHaveLength(11);
  expect(m.every((r) => r.length === 21)).toBe(true);
  expect(m[0]).toBe("#".repeat(21));
  expect(m[10]).toBe("#".repeat(21));
  expect(m.every((r) => r[0] === "#" && r[20] === "#")).toBe(true);
  // Every open cell is reached from (1, 1).
  const open = (c: number, r: number) => m[r]?.[c] !== undefined && m[r][c] !== "#";
  const seen = new Set(["1,1"]), todo: Array<[number, number]> = [[1, 1]];
  while (todo.length) {
    const [c, r] = todo.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${c + dx},${r + dy}`; if (open(c + dx, r + dy) && !seen.has(k)) { seen.add(k); todo.push([c + dx, r + dy]); } }
  }
  const all = m.flatMap((r, y) => [...r].map((ch, x) => [ch, x, y] as const)).filter(([ch]) => ch !== "#");
  expect(seen.size).toBe(all.length);
  for (const ch of ["P", "o", "H"]) expect(m.join("")).toContain(ch);
  expect(mazeOf(marks, 21, 11, "#", (c) => c === "#", 5)).toEqual(m);
  expect(mazeOf(marks, 21, 11, "#", (c) => c === "#", 6)).not.toEqual(m);
});

test("the shortest way through a grid, never through a wall; none when there's no way", () => {
  const rows = [
    ".....",
    ".###.",
    ".#...",
    ".#.#.",
    "...#.",
  ];
  const g = { cols: 5, rows: 5, blocked: (c: number, r: number) => rows[r][c] === "#" };
  const way = findPath(g, [0, 0], [2, 2])!;
  // Round the top and down the right (6 steps), never through "#".
  expect(way).toHaveLength(8);
  expect(way.at(-1)).toEqual([2, 2]);
  expect(way.every(([c, r]) => rows[r][c] !== "#")).toBe(true);
  for (let i = 1; i < way.length; i++) expect(Math.abs(way[i][0] - way[i - 1][0]) + Math.abs(way[i][1] - way[i - 1][1])).toBe(1);
  expect(findPath(g, [2, 2], [2, 2])).toEqual([]);
  expect(findPath(g, [0, 0], [1, 1])).toBeNull();
  const shut = { cols: 3, rows: 1, blocked: (c: number) => c === 1 };
  expect(findPath(shut, [0, 0], [2, 0])).toBeNull();
});

test("a ray stops at the first closed cell or box on its way", () => {
  const closed = (c: number, r: number) => c === 3 && r === 1;
  // Across row 1 from cell 0 to cell 5: the closed cell at 3 is met at x = 120 (of 0…200 from x 20).
  expect(rayCells(40, closed, 20, 60, 220, 60)).toBeCloseTo(0.5, 3);
  expect(rayCells(40, closed, 20, 20, 220, 20)).toBe(1);
  expect(rayCells(40, closed, 20, 100, 220, 20)).toBeLessThan(1);
  expect(rayBox(0, 0, 100, 0, { x: 50, y: 0, w: 10, h: 10 })).toBeCloseTo(0.45, 3);
  expect(rayBox(0, 0, 100, 0, { x: 50, y: 30, w: 10, h: 10 })).toBe(1);
});

test("a path walked by distance: there and back, round a loop, a smooth one through its points", () => {
  const line = trackOf([[0, 0], [100, 0]], false, false);
  expect(onTrack(line, 50)).toEqual([50, 0]);
  expect(onTrack(line, 150)).toEqual([50, 0]);
  expect(onTrack(line, 200)).toEqual([0, 0]);
  const square = trackOf([[0, 0], [100, 0], [100, 100], [0, 100]], true, false);
  expect(square.total).toBe(400);
  expect(onTrack(square, 250)).toEqual([50, 100]);
  expect(onTrack(square, 400)).toEqual([0, 0]);
  const smooth = trackOf([[0, 0], [100, 50], [200, 0]], false, true);
  expect(smooth.pts.some(([x, y]) => Math.abs(x - 100) < 1e-6 && Math.abs(y - 50) < 1e-6)).toBe(true);
  expect(smooth.total).toBeGreaterThan(Math.hypot(100, 50) * 2 - 1);
});

/** Levels: three small maps; the flag "F" goes on, "X" takes a life and starts the level again. */
function levels(more: Record<string, unknown> = {}) {
  const lvl = (extra: string) => ["......", `.P..${extra}.`, "######"];
  return gameOf({
    w: 240, h: 120, edges: "open", gravity: 2400, lives: 3, time: 20, transition: "fade",
    tiles: {
      size: 40, cols: 6, rows: 3, map: lvl("F"), levels: [lvl("X"), lvl("F")],
      kinds: { "#": WALL, P: { look: { kind: "box" }, thing: "hero" }, F: { look: { kind: "box" }, thing: "flag" }, X: { look: { kind: "box" }, thing: "spike" } },
    },
    things: [
      { id: "hero", look: { kind: "box" }, x: 200, y: 20, w: 20, h: 20, body: "dynamic", control: "platform", speed: 300, tags: ["player"] },
      { id: "flag", look: { kind: "box" }, x: 0, y: 0, w: 20, h: 20, body: "none", template: true, tags: ["goal"] },
      { id: "spike", look: { kind: "box" }, x: 0, y: 0, w: 20, h: 20, body: "none", template: true, tags: ["spike"] },
    ],
    rules: [
      { when: { on: "hit", a: "#player", b: "#goal" }, do: [{ act: "next" }] },
      { when: { on: "hit", a: "#player", b: "#spike" }, do: [{ act: "lives", add: -1 }, { act: "retry" }] },
      { when: { on: "level", at: 2 }, do: [{ act: "score", add: 100 }] },
      { when: { on: "level", at: 0 }, do: [{ act: "score", add: 1 }] },
    ],
    ...more,
  }, say)!;
}

test("levels: the player at its level's start cell, the flag goes on under a cover that closes then opens; a spike starts the level again; the last flag wins", () => {
  const spec = levels();
  expect(levelCount(spec)).toBe(3);
  const s = newGame(spec);
  startGame(s);
  expect(s.score).toBe(1);
  // "P" is where the hero starts (not its own x, y): in cell 1, on its floor.
  expect([body(s, "hero").x, body(s, "hero").y]).toEqual([60, 70]);
  // Walk right to the flag: the cover begins, closing on level 1.
  let k = 0;
  while (s.trans === 0 && k++ < 200) stepGame(s, input({ right: true }));
  expect(s.level).toBe(0);
  expect(coverOf(s).closing).toBe(true);
  const frozen = body(s, "hero").x;
  steps(s, 10, input({ right: true }));
  expect(body(s, "hero").x).toBe(frozen);
  // Half way the new level is made under it (its rule runs), and it opens.
  steps(s, 24);
  expect(s.level).toBe(1);
  expect(s.score).toBe(102);
  expect(coverOf(s).closing).toBe(false);
  steps(s, 40);
  expect(coverOf(s).k).toBe(0);
  expect(timeLeft(s)).toBe(20);
  // Level 2's spike: a life, and level 2 again from its start.
  k = 0;
  while (s.trans === 0 && k++ < 200) stepGame(s, input({ right: true }));
  steps(s, 60);
  expect(s.level).toBe(1);
  expect(s.lives).toBe(2);
  expect(body(s, "hero").x).toBe(60);
  // Without a cover (transition "none") the next level comes at the next step; the last one's flag wins.
  const quick = newGame(levels({ transition: "none" }));
  startGame(quick);
  quick.level = 2;
  for (k = 0; k < 200 && quick.phase === "playing"; k++) stepGame(quick, input({ right: true }));
  expect(quick.phase).toBe("won");
});

test("a maze level is made from the seed, the map's marks in its corridors; each level its own maze", () => {
  const maze = READY_GAMES.find((g) => g.key === "maze")!;
  const spec = gameOf(maze.game, say)!;
  expect(levelCount(spec)).toBe(3);
  const [a, b] = [levelMap(spec, 0), levelMap(spec, 1)];
  expect(a.join("")).toMatch(/#/);
  expect(a).not.toEqual(b);
  const s = newGame(spec);
  // The bee at its start, in the maze's first corridor; spiders and flowers made from the marks.
  expect([body(s, "bee").x, body(s, "bee").y]).toEqual([54, 54]);
  expect(s.bodies.filter((x) => x.of === "spider")).toHaveLength(2);
  expect(s.bodies.filter((x) => x.of === "flower")).toHaveLength(10);
  expect(s.tiles!.flat().filter((c) => c === "#").length).toBeGreaterThan(150);
});

/** A guard in a small maze seen from above, and the player. */
function guarded(rows: string[], guard: Record<string, unknown> = {}) {
  const at: Record<string, [number, number]> = {};
  const map = rows.map((line, r) => line.replace(/[GPR]/g, (m, c: number) => { at[m] = [c * 40 + 20, r * 40 + 20]; return "."; }));
  const s = newGame(gameOf({
    w: 400, h: 400, edges: "walls", gravity: 0, lives: 3,
    tiles: { size: 40, cols: rows[0].length, rows: rows.length, map, kinds: { "#": WALL } },
    things: [
      { id: "you", look: { kind: "box" }, x: at.P[0], y: at.P[1], w: 24, h: 24, body: "dynamic", control: "fourWay", speed: 150, tags: ["player"] },
      { id: "guard", look: { kind: "box" }, x: at.G[0], y: at.G[1], w: 24, h: 24, body: "dynamic", behave: "guard", speed: 120, sight: 400, tags: ["enemy"], ...guard },
      ...(at.R ? [{ id: "rock", look: { kind: "box" }, x: at.R[0], y: at.R[1], w: 30, h: 30, body: "static", solid: true }] : []),
    ],
    rules: [
      { when: { on: "hit", a: "#enemy", b: "#player" }, do: [{ act: "lose" }] },
      { when: { on: "see", a: "#enemy", b: "#player" }, do: [{ act: "score", add: 1 }] },
    ],
  }, say)!);
  startGame(s);
  return s;
}

test("a guard sees the player down a corridor (once, as it begins), marks it, and chases it along the way to catch it", () => {
  const s = guarded([
    "##########",
    "#G.......#",
    "#.######.#",
    "#........#",
    "##########",
  ].map((r, i) => (i === 1 ? r.replace("..#", "P.#") : r)));
  stepGame(s);
  expect(body(s, "guard").mind).toBe("chase");
  expect(s.effects.some((e) => e.kind === "alert")).toBe(true);
  expect(s.score).toBe(1);
  steps(s, 5);
  expect(s.score).toBe(1);
  for (let k = 0; k < 400 && s.phase === "playing"; k++) stepGame(s);
  expect(s.phase).toBe("lost");
});

test("a guard doesn't see through a wall or a solid thing; it goes round its cells instead", () => {
  const s = guarded([
    "##########",
    "#G.R..P..#",
    "##########",
  ]);
  stepGame(s);
  expect(body(s, "guard").mind).toBe("patrol");
  expect(s.score).toBe(0);
  const w = guarded([
    "#######",
    "#G.#.P#",
    "#..#..#",
    "#######",
  ]);
  steps(w, 30);
  expect(w.score).toBe(0);
  expect(["patrol"]).toContain(body(w, "guard").mind);
});

test("on foot: a chasing guard jumps a low wall; a moving platform carries what stands on it; a homing thing turns toward the player; one that flees runs off", () => {
  const side = newGame(gameOf({
    w: 800, h: 240, edges: "walls", gravity: 2400,
    tiles: { size: 40, cols: 20, rows: 6, map: ["....................", "....................", "....................", "....................", "........#...........", "####################"], kinds: { "#": WALL } },
    things: [
      { id: "you", look: { kind: "box" }, x: 100, y: 180, w: 24, h: 30, body: "dynamic", control: "platform", tags: ["player"] },
      { id: "guard", look: { kind: "box" }, x: 500, y: 180, w: 24, h: 30, body: "dynamic", behave: "guard", speed: 150, sight: 600, jump: 800, tags: ["enemy"] },
    ],
  }, say)!);
  startGame(side);
  // It saw the player go past the wall (sight is blocked by it now): it goes to look where it was.
  const g = side.bodies.find((b) => b.of === "guard")!;
  Object.assign(g, { mind: "search", lx: 100, ly: 185, seen: side.t, face: -1 });
  steps(side, 150);
  // Past the wall at x 320…360, toward the player.
  expect(body(side, "guard").x).toBeLessThan(320);

  const ride = newGame(gameOf({
    w: 800, h: 400, edges: "walls", gravity: 2400,
    things: [
      { id: "lift", look: { kind: "box" }, x: 200, y: 300, w: 120, h: 20, body: "kinematic", solid: true, behave: "path", speed: 100, path: { points: [[300, 0]] } },
      { id: "you", look: { kind: "box" }, x: 200, y: 270, w: 24, h: 30, body: "dynamic", control: "platform", tags: ["player"] },
    ],
  }, say)!);
  startGame(ride);
  steps(ride, 120);
  const lift = body(ride, "lift"), you = body(ride, "you");
  expect(lift.x).toBeGreaterThan(380);
  expect(Math.abs(you.x - lift.x)).toBeLessThan(12);
  expect(you.grounded).toBe(true);

  const sky = newGame(gameOf({
    w: 800, h: 400, edges: "open", gravity: 0,
    things: [
      { id: "you", look: { kind: "box" }, x: 400, y: 200, w: 24, h: 24, body: "kinematic", control: "fourWay", tags: ["player"] },
      { id: "missile", look: { kind: "box" }, x: 100, y: 350, w: 20, h: 10, body: "kinematic", behave: "homing", speed: 200, vx: 0, vy: -200 },
      { id: "hare", look: { kind: "box" }, x: 460, y: 200, w: 20, h: 20, body: "kinematic", behave: "flee", speed: 120, sight: 300, keepIn: true },
    ],
  }, say)!);
  startGame(sky);
  const d0 = Math.hypot(body(sky, "missile").x - 400, body(sky, "missile").y - 200);
  steps(sky, 60);
  const m = body(sky, "missile");
  expect(Math.hypot(m.x - 400, m.y - 200)).toBeLessThan(d0 - 100);
  expect(m.rot).not.toBe(0);
  expect(body(sky, "hare").x).toBeGreaterThan(520);
});

test("the ready games with levels: the adventure has two (a lift and a hedgehog on the second) and the maze three", () => {
  const adv = gameOf(READY_GAMES.find((g) => g.key === "adventure")!.game, say)!;
  expect(levelCount(adv)).toBe(2);
  const s = newGame(adv);
  startGame(s);
  s.goTo = 1;
  steps(s, 40);
  expect(s.level).toBe(1);
  expect(s.bodies.some((b) => b.of === "lift")).toBe(true);
  expect(s.bodies.find((b) => b.of === "hedgehog")?.thing.behave).toBe("guard");
  steps(s, 60);
  expect(body(s, "lift").x).toBeGreaterThan(23 * 45 + 22.5 + 50);
});
