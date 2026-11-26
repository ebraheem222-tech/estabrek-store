import { expect, test } from "@playwright/test";
import { NO_INPUT, newGame, startGame, stepGame, type GameInput, type GameState } from "../src/pageTree/gameEngine";
import { gameOf } from "../src/pageTree/gameSpec";
import { READY_GAMES } from "../src/pageTree/gameReady";

// G3b of the games stage (docs/game-engine-plan.ar.md): on the beat, a key pressed (or a thing tapped) while two things
// touch, a copy where its template stands, a thing flashed; the beats and the pads.
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const input = (more: Partial<GameInput> = {}): GameInput => ({ ...NO_INPUT, pressed: [], taps: [], ...more });
const box = (id: string, x: number, y: number, more: Record<string, unknown> = {}) => ({ id, look: { kind: "box" }, x, y, w: 40, h: 40, ...more });

test("on the beat: every so many beats of the game's tempo, from an offset in", () => {
  const s = newGame(gameOf({
    music: { tempo: 120 },
    things: [box("a", 100, 100)],
    rules: [
      { when: { on: "beat", every: 1, offset: 0 }, do: [{ act: "score", add: 1 }] },
      { when: { on: "beat", every: 2, offset: 1 }, do: [{ act: "lives", add: 1 }] },
    ],
    lives: 0,
  }, say)!);
  startGame(s);
  const times: number[] = [];
  for (let k = 0; k < 180; k++) { const before = s.score; stepGame(s); if (s.score > before) times.push(Math.round(s.t * 100) / 100); }
  // A beat is half a second: at the start, then each half second.
  expect(times.slice(0, 4)).toEqual([0.02, 0.5, 1, 1.5]);
  expect(times.length).toBe(7);
  // Every two beats from one beat in: at 0.5 s, 1.5 s, 2.5 s.
  expect(s.lives).toBe(3);
});

test("a key pressed while two things touch, or the first tapped while they do: each pair once a press; nothing when they don't", () => {
  const s = newGame(gameOf({
    edges: "open",
    things: [box("pad", 100, 100, { tags: ["pad"] }), box("near", 120, 100, { tags: ["note"] }), box("far", 400, 100, { tags: ["note"] }), box("lone", 600, 100, { tags: ["pad"] })],
    rules: [{ when: { on: "press", key: "Space", a: "#pad", b: "#note" }, do: [{ act: "score", add: 1 }, { act: "flash", who: "self" }, { act: "destroy", who: "other" }] }],
  }, say)!);
  startGame(s);
  stepGame(s);
  stepGame(s, input({ pressed: ["Enter"] }));
  expect(s.score).toBe(0);
  stepGame(s, input({ pressed: ["Space"] }));
  expect(s.score).toBe(1);
  expect(s.bodies.find((b) => b.of === "pad")!.flash).toBeCloseTo(s.t, 5);
  expect(s.bodies.some((b) => b.of === "near")).toBe(false);
  // Nothing touches the pad now; the far note touches nothing.
  stepGame(s, input({ pressed: ["Space"] }));
  expect(s.score).toBe(1);
  // A tap on the lone pad while a note is put on it.
  s.bodies.find((b) => b.of === "far")!.x = 610;
  stepGame(s, input({ taps: [{ x: 300, y: 300 }] }));
  expect(s.score).toBe(1);
  stepGame(s, input({ taps: [{ x: 600, y: 100 }] }));
  expect(s.score).toBe(2);
});

test("a copy made where its template stands", () => {
  const s = newGame(gameOf({
    edges: "open",
    things: [box("a", 100, 100), box("lane", 333, -20, { template: true, body: "kinematic", vy: 100 })],
    rules: [{ when: { on: "start" }, do: [{ act: "spawn", what: "lane", at: "own" }] }],
  }, say)!);
  startGame(s);
  const copy = s.bodies.find((b) => b.of === "lane")!;
  expect([copy.x, copy.y]).toEqual([333, -20]);
});

/** Plays the beats: presses each lane's arrow as one is in the middle of its bar (or does nothing). */
function playBeats(seconds: number, hit: boolean) {
  const s = newGame(gameOf(READY_GAMES.find((g) => g.key === "beats")!.game, say)!);
  startGame(s);
  const keys: Record<string, string> = { l: "ArrowLeft", d: "ArrowDown", u: "ArrowUp", r: "ArrowRight" };
  const arrivals: number[] = [];
  for (let k = 0; k < seconds * 60 && s.phase === "playing"; k++) {
    const pressed: string[] = [];
    for (const b of s.bodies) {
      const lane = b.of.startsWith("arrow-") ? b.of.slice(6) : "";
      if (lane && Math.abs(b.y - 470) <= 4) { arrivals.push(s.t); if (hit) pressed.push(keys[lane]); }
    }
    stepGame(s, input({ pressed: [...new Set(pressed)] }));
  }
  return { s, arrivals };
}

test("the beats: arrows reach their bars on the beat; played well, every one scores and no life goes; left alone, lives go", () => {
  const good = playBeats(20, true);
  expect(good.s.score).toBeGreaterThan(20);
  expect(good.s.lives).toBe(5);
  // Each arrival is on a half beat of 0.6 s (within a frame or two).
  for (const t of good.arrivals) expect(Math.abs(t / 0.3 - Math.round(t / 0.3))).toBeLessThan(0.15);
  const idle = playBeats(20, false);
  expect(idle.s.score).toBe(0);
  expect(idle.s.lives < 5 || idle.s.phase === "lost").toBe(true);
});

test("the pads: each key a higher note, each drum its own, each one lit and counted", () => {
  const s = newGame(gameOf(READY_GAMES.find((g) => g.key === "pads")!.game, say)!);
  startGame(s);
  const freqs: number[] = [];
  for (let i = 0; i < 8; i++) {
    stepGame(s, input({ taps: [{ x: 165 + i * 90, y: 190 }] }));
    const note = s.effects.find((e) => e.kind === "note") as { freq: number; instrument: string };
    expect(note.instrument).toBe("piano");
    freqs.push(note.freq);
    expect(s.bodies.find((b) => b.of === `key-${i + 1}`)!.flash).toBeCloseTo(s.t, 5);
    s.effects.length = 0;
  }
  expect(freqs.every((f, i) => i === 0 || f > freqs[i - 1])).toBe(true);
  const drums: number[] = [];
  for (let i = 0; i < 3; i++) {
    stepGame(s, input({ taps: [{ x: 255 + i * 150, y: 430 }] }));
    const note = s.effects.find((e) => e.kind === "note") as { freq: number; instrument: string };
    expect(note.instrument).toBe("drum");
    drums.push(note.freq);
    s.effects.length = 0;
  }
  // A kick (under 300 Hz), a snare (under 450), a hat.
  expect(drums[0]).toBeLessThan(300);
  expect(drums[1]).toBeGreaterThan(300);
  expect(drums[1]).toBeLessThan(450);
  expect(drums[2]).toBeGreaterThan(450);
  expect(s.score).toBe(11);
});
