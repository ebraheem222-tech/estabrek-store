import { expect, test } from "@playwright/test";
import { NO_INPUT, newGame, startGame, stepGame, timeLeft, type GameInput, type GameState } from "../src/pageTree/gameEngine";
import { GAME_LIMITS, gameOf, isWho } from "../src/pageTree/gameSpec";
import { READY_GAMES, readyGame } from "../src/pageTree/gameReady";

// G0 of the games stage (docs/game-engine-plan.ar.md): the spec read safely and the engine run step by step.
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const spec = (raw: Record<string, unknown>) => gameOf(raw, say)!;
const input = (more: Partial<GameInput> = {}): GameInput => ({ ...NO_INPUT, ...more });
const steps = (s: GameState, n: number, i: GameInput = NO_INPUT) => { for (let k = 0; k < n; k++) stepGame(s, i); };
const thing = (id: string, more: Record<string, unknown> = {}) => ({ id, look: { kind: "box", color: "accent" }, x: 480, y: 270, w: 40, h: 40, ...more });

test("a game is read safely: bad names, numbers and actions left out; nothing to play is nothing", () => {
  expect(gameOf({ things: [thing("a", { template: true })] })).toBeNull();
  expect(gameOf({ things: [] })).toBeNull();
  const g = spec({
    w: 99999, lives: 42, gravity: -5, edges: "nope", bg: "url(x)",
    things: [thing("Bad Id"), thing("ok", { x: 1e9, speed: -3, tags: ["fine", "NOT OK", "a", "b", "c", "d"] }), thing("ok"), thing("img", { look: { kind: "image", src: "javascript:alert(1)" } })],
    rules: [
      { when: { on: "hit", a: "#fine", b: "ok" }, do: [{ act: "score", add: 5 }, { act: "explode" }] },
      { when: { on: "nope" }, do: [{ act: "win" }] },
      { when: { on: "start" }, do: [] },
      { when: { on: "every", seconds: 0 }, do: Array.from({ length: 20 }, () => ({ act: "score", add: 1 })) },
    ],
  });
  expect(g.w).toBe(1920);
  expect(g.lives).toBe(9);
  expect(g.gravity).toBe(0);
  expect(g.edges).toBe("walls");
  expect(g.bg).toBe("surface");
  // A name is said once; a picture without a safe address is a box.
  expect(g.things.map((t) => t.id)).toEqual(["ok", "img"]);
  expect(g.things[0].x).toBe(4000);
  expect(g.things[0].speed).toBe(0);
  expect(g.things[0].tags).toEqual(["fine", "a", "b", "c"]);
  expect(g.things[1].look.kind).toBe("box");
  expect(g.rules).toHaveLength(2);
  expect(g.rules[0].do).toEqual([{ act: "score", add: 5 }]);
  expect(g.rules[1].when).toEqual({ on: "every", seconds: 0.2 });
  expect(g.rules[1].do).toHaveLength(GAME_LIMITS.acts);
  expect(isWho("#fine", g.things[0])).toBe(true);
  expect(isWho("ok", g.things[0])).toBe(true);
});

test("the same presses give the same game (its own random numbers from the seed)", () => {
  const play = () => {
    const s = newGame(gameOf(readyGame("catch")!.game, say)!);
    startGame(s);
    for (let k = 0; k < 900; k++) stepGame(s, input({ left: k % 120 < 60, right: k % 120 >= 60 }));
    return JSON.stringify({ score: s.score, lives: s.lives, t: s.t, bodies: s.bodies.map((b) => [b.of, Math.round(b.x), Math.round(b.y)]) });
  };
  expect(play()).toBe(play());
});

test("catch: a gift that meets the bag scores once; one that leaves the world takes a life; no lives left is the end", () => {
  const g = spec({
    edges: "open", lives: 2,
    things: [thing("bag", { y: 480, w: 100, body: "kinematic", control: "leftRight", keepIn: true, tags: ["player"] }), thing("gift", { template: true, body: "kinematic", vy: 600 })],
    rules: [
      { when: { on: "hit", a: "#player", b: "gift" }, do: [{ act: "destroy", who: "other" }, { act: "score", add: 1 }] },
      { when: { on: "out", who: "gift" }, do: [{ act: "lives", add: -1 }] },
      { when: { on: "key", key: "Enter" }, do: [{ act: "spawn", what: "gift", at: "center" }] },
    ],
  });
  const s = newGame(g);
  stepGame(s);
  expect(s.t).toBe(0); // waiting to start
  startGame(s);
  stepGame(s, input({ pressed: ["Enter"] }));
  steps(s, 60);
  expect(s.score).toBe(1);
  expect(s.bodies.filter((b) => b.of === "gift")).toHaveLength(0);
  // Moved aside: the next one falls past the bag and out.
  steps(s, 60, input({ left: true }));
  stepGame(s, input({ pressed: ["Enter"] }));
  steps(s, 90);
  expect(s.score).toBe(1);
  expect(s.lives).toBe(1);
  stepGame(s, input({ pressed: ["Enter"] }));
  steps(s, 90);
  expect(s.phase).toBe("lost");
  // Once over, nothing moves until it starts again.
  const t = s.t;
  steps(s, 10);
  expect(s.t).toBe(t);
  startGame(s);
  expect([s.phase, s.score, s.lives]).toEqual(["playing", 0, 2]);
});

test("the score that wins, and the clock that wins or ends it", () => {
  const scoring = newGame(spec({ winScore: 3, things: [thing("p")], rules: [{ when: { on: "every", seconds: 0.5 }, do: [{ act: "score", add: 1 }] }] }));
  startGame(scoring);
  steps(scoring, 200);
  expect(scoring.phase).toBe("won");
  expect(scoring.effects).toContainEqual({ kind: "sound", sound: "success" });
  const lasting = newGame(spec({ time: 5, timeWins: true, things: [thing("p")] }));
  startGame(lasting);
  steps(lasting, 60);
  expect(timeLeft(lasting)).toBe(4);
  steps(lasting, 300);
  expect(lasting.phase).toBe("won");
  const racing = newGame(spec({ time: 2, things: [thing("p")] }));
  startGame(racing);
  steps(racing, 200);
  expect(racing.phase).toBe("lost");
});

test("a platformer jumps only from the ground, and gravity brings it back", () => {
  const s = newGame(spec({ edges: "floor", gravity: 2400, things: [thing("hero", { y: 100, body: "dynamic", control: "platform", jump: 900, speed: 300 })] }));
  startGame(s);
  const hero = () => s.bodies[0];
  steps(s, 120);
  expect(hero().grounded).toBe(true);
  expect(Math.round(hero().y)).toBe(540 - 20);
  stepGame(s, input({ pressed: ["Space"] }));
  steps(s, 6);
  expect(hero().y).toBeLessThan(500);
  // In the air: another press does nothing.
  const vy = hero().vy;
  stepGame(s, input({ pressed: ["Space"] }));
  expect(hero().vy).toBeGreaterThan(vy);
  steps(s, 50, input({ right: true }));
  expect(hero().grounded).toBe(true);
  expect(hero().x).toBeGreaterThan(560);
  // The world's sides are open (a floor only): run on and the hero leaves it.
  steps(s, 200, input({ right: true }));
  expect(s.bodies).toHaveLength(0);
});

test("bricks: the ball bounces off walls and the paddle and breaks the bricks it meets", () => {
  const s = newGame(gameOf(readyGame("bricks")!.game, say)!);
  startGame(s);
  let bounced = false;
  for (let k = 0; k < 60 * 20 && s.phase === "playing"; k++) {
    const ball = s.bodies.find((b) => b.thing.tags.includes("ball"));
    const paddle = s.bodies.find((b) => b.of === "paddle")!;
    // The paddle follows the ball.
    stepGame(s, input({ left: !!ball && ball.x < paddle.x - 10, right: !!ball && ball.x > paddle.x + 10 }));
    if (ball && ball.vy > 0 && ball.y > 300) bounced = true;
  }
  expect(bounced).toBe(true);
  expect(s.score).toBeGreaterThan(3);
  expect(s.bodies.filter((b) => b.thing.tags.includes("brick")).length).toBe(24 - s.score);
});

test("a tap meets the thing under it, and only that", () => {
  const s = newGame(spec({ edges: "walls", things: [thing("star", { tags: ["target"] }), thing("moon", { x: 100, y: 100 })], rules: [{ when: { on: "tap", who: "#target" }, do: [{ act: "destroy", who: "self" }, { act: "score", add: 1 }] }] }));
  startGame(s);
  stepGame(s, input({ taps: [{ x: 100, y: 100 }, { x: 700, y: 400 }] }));
  expect(s.score).toBe(0);
  stepGame(s, input({ taps: [{ x: 490, y: 280 }] }));
  expect(s.score).toBe(1);
  expect(s.bodies.map((b) => b.of)).toEqual(["moon"]);
});

test("every ready game: named in three languages, its rules name its own things, and twenty seconds of play hold", () => {
  for (const r of READY_GAMES) {
    for (const x of [r.name, r.line]) expect(x.ar && x.en && x.he, r.key).toBeTruthy();
    const g = gameOf(r.game, say);
    expect(g, r.key).not.toBeNull();
    // Things' names and tags, and the tile map's tags.
    const names = new Set([...g!.things.flatMap((t) => [t.id, ...t.tags.map((x) => `#${x}`)]), ...Object.values(g!.tiles?.kinds ?? {}).flatMap((k) => k.tags.map((x) => `#${x}`))]);
    for (const rule of g!.rules) {
      for (const who of [(rule.when as { a?: string }).a, (rule.when as { b?: string }).b, (rule.when as { who?: string }).who]) if (who) expect(names.has(who), `${r.key}: ${who}`).toBe(true);
      for (const a of rule.do) if (a.act === "spawn") expect(g!.things.some((t) => t.id === a.what && t.template), `${r.key}: ${a.what}`).toBe(true);
    }
    expect(g!.words.title && g!.words.help, r.key).toBeTruthy();
    const s = newGame(g!);
    startGame(s);
    for (let k = 0; k < 60 * 20; k++) {
      stepGame(s, input({ left: k % 90 < 45, right: k % 90 >= 45, pressed: k % 50 === 0 ? ["Space"] : [], taps: k % 20 === 0 ? [{ x: 480, y: 270 }] : [], pointer: { x: 480, y: 270 } }));
      expect(s.bodies.length, r.key).toBeLessThanOrEqual(GAME_LIMITS.alive);
    }
    expect(s.t, r.key).toBeGreaterThan(1);
  }
});
