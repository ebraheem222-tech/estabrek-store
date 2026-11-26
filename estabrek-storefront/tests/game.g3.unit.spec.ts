import { expect, test } from "@playwright/test";
import { NO_INPUT, newGame, startGame, stepGame, type GameState } from "../src/pageTree/gameEngine";
import { gameOf } from "../src/pageTree/gameSpec";
import { READY_GAMES } from "../src/pageTree/gameReady";
import { musicPattern, noteFreq, placeOf as soundPlace } from "../src/pageTree/gameSound";
import { burst, confetti, newParticles, stepParticles } from "../src/pageTree/gameParticles";

// G3 of the games stage (docs/game-engine-plan.ar.md): notes and scales, where a sound is, music from a seed, the
// particles (trails, weather, bursts, confetti), and the effects a game names.
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).en ?? "" : typeof v === "string" ? v : "");
const steps = (s: GameState, n: number) => { for (let k = 0; k < n; k++) stepGame(s, NO_INPUT); };

test("a scale's notes go up from middle C, an octave each time round; a sound is panned and softened by where it is", () => {
  expect(noteFreq("pentatonic", 0)).toBeCloseTo(261.63, 1);
  expect(noteFreq("pentatonic", 5)).toBeCloseTo(523.26, 1);
  expect(noteFreq("major", 7)).toBeCloseTo(523.26, 1);
  expect(noteFreq("major", 2)).toBeCloseTo(329.63, 1);
  expect(noteFreq("minor", 2)).toBeCloseTo(311.13, 1);
  const ups = Array.from({ length: 10 }, (_, i) => noteFreq("blues", i));
  expect(ups.every((f, i) => i === 0 || f > ups[i - 1])).toBe(true);
  // A view 0…1000: its middle, its edges, and further out.
  expect(soundPlace(500, 0, 1000)).toEqual({ pan: 0, gain: 1 });
  expect(soundPlace(0, 0, 1000).pan).toBeCloseTo(-0.8);
  expect(soundPlace(1000, 0, 1000).pan).toBeCloseTo(0.8);
  expect(soundPlace(2500, 0, 1000).gain).toBeLessThan(0.5);
  expect(soundPlace(undefined, 0, 1000)).toEqual({ pan: 0, gain: 1 });
});

test("music for a mood from a seed: the same seed the same tune, another seed another; each mood its own drums", () => {
  const a = musicPattern("lively", 5), b = musicPattern("lively", 5), c = musicPattern("lively", 6);
  expect(a).toEqual(b);
  expect(a.lead).not.toEqual(c.lead);
  expect([a.kick.length, a.bass.length, a.lead.length, a.chords.length]).toEqual([16, 64, 64, 4]);
  expect(a.kick.map((k, i) => (k ? i : -1)).filter((i) => i >= 0)).toEqual([0, 4, 8, 12]);
  expect(musicPattern("calm", 1).snare.some(Boolean)).toBe(false);
  expect(musicPattern("spooky", 1).scale).toBe("minor");
  // The tune stays near each bar's chord.
  for (const mood of ["lively", "calm", "spooky", "arcade"] as const) {
    const p = musicPattern(mood, 9);
    p.lead.forEach((n, i) => { if (n !== null) { const root = p.chords[Math.floor(i / 16)]; expect(n).toBeGreaterThanOrEqual(root); expect(n).toBeLessThanOrEqual(root + 12); } });
  }
});

test("a game's effects read safely; a note's rule goes up the scale, at random, or on one step; confetti and a sound's place", () => {
  const g = gameOf({
    weather: "snow", post: "crt", music: { mood: "arcade", tempo: 999, volume: 3 },
    things: [
      { id: "a", look: { kind: "box" }, x: 100, y: 100, w: 20, h: 20, trail: "fire", fx: "rainbow", tags: ["a"] },
      { id: "b", look: { kind: "box" }, x: 300, y: 100, w: 20, h: 20, trail: "glitter", fx: "melt" },
    ],
    rules: [
      { when: { on: "tap", who: "a" }, do: [{ act: "note", instrument: "bell", scale: "major", step: -1 }, { act: "sound", kind: "laser" }, { act: "confetti" }] },
      { when: { on: "key", key: "Space" }, do: [{ act: "note", instrument: "harp", scale: "jazz", step: 99 }] },
    ],
  }, say)!;
  expect([g.weather, g.post, g.music]).toEqual(["snow", "crt", { mood: "arcade", tempo: 180, volume: 1 }]);
  expect([g.things[0].trail, g.things[0].fx, g.things[1].trail, g.things[1].fx]).toEqual(["fire", "rainbow", "", ""]);
  expect(g.rules[1].do[0]).toEqual({ act: "note", instrument: "piano", scale: "pentatonic", step: 20 });
  expect(gameOf({ weather: "hail", post: "blur", things: [{ id: "a", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9 }] }, say)).toMatchObject({ weather: "", post: "", music: { mood: "" } });
  const s = newGame(g);
  startGame(s);
  const freqs: number[] = [];
  for (let k = 0; k < 6; k++) {
    stepGame(s, { ...NO_INPUT, pressed: [], taps: [{ x: 100, y: 100 }] });
    const note = s.effects.find((e) => e.kind === "note") as { freq: number; x?: number } | undefined;
    expect(s.effects.some((e) => e.kind === "confetti")).toBe(true);
    const laser = s.effects.find((e) => e.kind === "sound" && e.sound === "laser") as { x?: number };
    expect(laser.x).toBe(100);
    freqs.push(note!.freq);
    expect(note!.x).toBe(100);
    s.effects.length = 0;
  }
  expect(freqs.every((f, i) => i === 0 || f > freqs[i - 1])).toBe(true);
});

test("particles: a moving thing's sparkles (none when it's still), fire even when still, falling snow, stars that stay, bursts, confetti; all let go in time", () => {
  const s = newGame(gameOf({
    w: 800, h: 400, weather: "snow", edges: "open",
    things: [
      { id: "mover", look: { kind: "box" }, x: 100, y: 100, w: 30, h: 30, body: "kinematic", vx: 200, trail: "sparkle" },
      { id: "still", look: { kind: "box" }, x: 300, y: 100, w: 30, h: 30, body: "kinematic", trail: "sparkle" },
      { id: "torch", look: { kind: "box" }, x: 500, y: 100, w: 30, h: 30, body: "kinematic", trail: "fire" },
    ],
  }, say)!);
  startGame(s);
  steps(s, 2);
  const p = newParticles(5000);
  for (let k = 0; k < 30; k++) stepParticles(p, s, 1 / 60);
  const near = (x: number) => p.list.filter((q) => Math.abs(q.x - x) < 40 && q.y < 200 && q.y > 0 && q.color !== "#ffffff").length;
  expect(near(110)).toBeGreaterThan(5);
  expect(near(300)).toBe(0);
  expect(near(500)).toBeGreaterThan(5);
  const flakes = p.list.filter((q) => q.color === "#ffffff");
  expect(flakes.length).toBeGreaterThan(5);
  const y0 = flakes[0].y;
  stepParticles(p, s, 0.5);
  expect(flakes[0].y).toBeGreaterThan(y0);
  // Less motion: no falling weather.
  const few = newParticles();
  for (let k = 0; k < 30; k++) stepParticles(few, s, 1 / 60, true);
  expect(few.list.some((q) => q.color === "#ffffff")).toBe(false);
  // Stars across the view: made once, they stay.
  const night = newGame(gameOf({ w: 800, h: 400, weather: "stars", things: [{ id: "a", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9 }] }, say)!);
  const sky = newParticles();
  stepParticles(sky, night, 1 / 60);
  const count = sky.list.length;
  for (let k = 0; k < 120; k++) stepParticles(sky, night, 1 / 60);
  expect(count).toBeGreaterThan(30);
  expect(sky.list.length).toBe(count);
  // A burst and confetti, gone after their time.
  const b = newParticles();
  burst(b, 10, 10, "#ff0000");
  confetti(b, 0, 0, 800);
  expect(b.list.length).toBe(16 + 140);
  const empty = newGame(gameOf({ things: [{ id: "a", look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9 }] }, say)!);
  for (let k = 0; k < 60 * 6; k++) stepParticles(b, empty, 1 / 60);
  expect(b.list.length).toBe(0);
});

test("the ready night stars: twenty seconds hold, and each star caught plays the next note up", () => {
  const spec = gameOf(READY_GAMES.find((g) => g.key === "night")!.game, say)!;
  expect([spec.weather, spec.post, spec.music.mood]).toEqual(["stars", "vignette", "calm"]);
  expect(spec.things.find((t) => t.id === "basket")!.fx).toBe("glow");
  const s = newGame(spec);
  startGame(s);
  const notes: number[] = [];
  for (let k = 0; k < 60 * 20 && s.phase === "playing"; k++) {
    // Follow the lowest star.
    const star = s.bodies.filter((b) => b.of === "star").sort((a, b) => b.y - a.y)[0], basket = s.bodies.find((b) => b.of === "basket")!;
    stepGame(s, { ...NO_INPUT, pressed: [], taps: [], left: Boolean(star && star.x < basket.x - 10), right: Boolean(star && star.x > basket.x + 10) });
    for (const e of s.effects) if (e.kind === "note") notes.push(e.freq);
    s.effects.length = 0;
  }
  expect(notes.length).toBeGreaterThan(3);
  expect(notes[1]).toBeGreaterThan(notes[0]);
});
