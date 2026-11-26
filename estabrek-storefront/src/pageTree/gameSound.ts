/**
 * Sound for the games stage (G3 of docs/game-engine-plan.ar.md), made in the browser by the Web Audio API (no files, no
 * packages): the shop's stage and the editor's try-out both use it.
 *  - Sounds: short tones and noise shaped for a click, a pop, a chime, a whoosh, success, a hit, a coin, a jump, a laser,
 *    a boom, a power-up and a blip; each one panned left or right by where in the view it happened, and softer the
 *    further outside the view.
 *  - Notes on five instruments (piano, bell, pluck, bass, drum) up a scale (major, minor, pentatonic, blues).
 *  - Music made for a mood (lively, calm, spooky, arcade) from the game's seed: drums, a bass and chords, and a tune that
 *    walks the scale; four bars that go round, scheduled a little ahead on the audio clock. Nothing borrowed: every
 *    tune is drawn from the seed.
 * The pure parts (scales, a note's pitch, a mood's pattern, a place's pan) work without a browser; the rest does
 * nothing where there's no Web Audio (a server, a test).
 */

export const SCALES: Record<"major" | "minor" | "pentatonic" | "blues", number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
};
/** The pitch (Hz) of a scale's step from middle C (step 0), going up an octave each time round the scale. */
export function noteFreq(scale: keyof typeof SCALES, step: number, base = 261.63): number {
  const sc = SCALES[scale], len = sc.length;
  const oct = Math.floor(step / len), semi = sc[((step % len) + len) % len] + oct * 12;
  return base * Math.pow(2, semi / 12);
}
/** Left (-1) to right (1) by where across the view a sound is, and how loud (1 inside the view, less further out). */
export function placeOf(x: number | undefined, cx: number, w: number): { pan: number; gain: number } {
  if (x === undefined || !Number.isFinite(x)) return { pan: 0, gain: 1 };
  const d = x - (cx + w / 2);
  return { pan: Math.max(-1, Math.min(1, d / (w / 2))) * 0.8, gain: 1 / (1 + Math.max(0, Math.abs(d) - w / 2) / w) };
}

/* ---------------------------------------------------------------- the music's patterns (pure) */

export type Mood = "lively" | "calm" | "spooky" | "arcade";
/** One bar of sixteen steps for each part, and four bars of chords (each the scale step of its root). */
export type Pattern = {
  scale: keyof typeof SCALES;
  kick: boolean[]; snare: boolean[]; hat: boolean[];
  /** The bass's and the tune's steps of the scale, or null for a rest, for each of 64 steps (four bars). */
  bass: Array<number | null>; lead: Array<number | null>;
  chords: number[];
  voice: "bell" | "pluck" | "piano";
};
function rng(seed: number) {
  let s = seed | 0;
  return () => { let t = (s = (s + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const at = (steps: number[]) => Array.from({ length: 16 }, (_, i) => steps.includes(i));
/** A mood's pattern from a seed: the same seed, the same tune. */
export function musicPattern(mood: Mood, seed: number): Pattern {
  const r = rng(seed * 7919 + mood.length);
  const minor = mood === "spooky";
  const scale: Pattern["scale"] = minor ? "minor" : "major";
  // Chords as scale steps of their roots: I–V–vi–IV, i–VI–III–VII, I–IV–I–V.
  const chords = minor ? [0, 5, 2, 6] : mood === "calm" ? [0, 3, 0, 4] : [0, 4, 5, 3];
  const kick = at(mood === "calm" ? [0, 8] : mood === "spooky" ? [0, 10] : [0, 4, 8, 12]);
  const snare = at(mood === "calm" || mood === "spooky" ? [] : [4, 12]);
  const hat = at(mood === "lively" ? [0, 2, 4, 6, 8, 10, 12, 14] : mood === "arcade" ? [1, 3, 5, 7, 9, 11, 13, 15] : mood === "calm" ? [] : [6, 14]);
  const bassAt = mood === "spooky" ? [0] : mood === "calm" ? [0, 8] : mood === "arcade" ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 3, 6, 8, 11, 14];
  const bass: Array<number | null> = [];
  const lead: Array<number | null> = [];
  const density = mood === "calm" ? 0.28 : mood === "spooky" ? 0.22 : mood === "arcade" ? 0.7 : 0.5;
  // The tune walks the scale near the chord's root, a step or two at a time.
  let walk = 7;
  for (let bar = 0; bar < 4; bar++) {
    const root = chords[bar];
    for (let i = 0; i < 16; i++) {
      bass.push(bassAt.includes(i) ? root - 7 + (mood === "arcade" && i % 4 === 2 ? 7 : 0) : null);
      if (r() < density && (mood !== "arcade" || i % 2 === 0)) {
        walk += Math.round((r() - 0.5) * 4);
        walk = Math.max(root + 3, Math.min(root + 11, walk));
        lead.push(mood === "arcade" ? root + 7 + [0, 2, 4][i / 2 % 3] : walk);
      } else lead.push(null);
    }
  }
  return { scale, kick, snare, hat, bass, lead, chords, voice: mood === "spooky" || mood === "calm" ? "bell" : mood === "arcade" ? "pluck" : "piano" };
}

/* ---------------------------------------------------------------- the browser's sound */

type Out = { ctx: AudioContext; fx: GainNode; music: GainNode; noise: AudioBuffer };
let out: Out | null = null;
/** The page's sound, made on first use (after a press, as browsers ask), or null where there's none. */
function sound(): Out | null {
  if (typeof window === "undefined") return null;
  try {
    if (!out) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      const ctx = new C();
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      const fx = ctx.createGain(), music = ctx.createGain();
      fx.connect(master);
      music.connect(master);
      music.gain.value = 0;
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      out = { ctx, fx, music, noise };
    }
    if (out.ctx.state === "suspended") void out.ctx.resume();
    return out;
  } catch { return null; }
}

/** Where a sound goes: panned, at its loudness, into the effects or the music. */
function into(o: Out, to: AudioNode, pan: number, gain: number, when: number, len: number): GainNode {
  const g = o.ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + len);
  if (pan && o.ctx.createStereoPanner) { const p = o.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(to); } else g.connect(to);
  return g;
}
function tone(o: Out, to: AudioNode, type: OscillatorType, from: number, upto: number, len: number, gain: number, pan = 0, when = o.ctx.currentTime) {
  const osc = o.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, when);
  if (upto !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(30, upto), when + len);
  osc.connect(into(o, to, pan, gain, when, len));
  osc.start(when);
  osc.stop(when + len + 0.05);
}
function hiss(o: Out, to: AudioNode, len: number, gain: number, filter: BiquadFilterType, freq: number, pan = 0, when = o.ctx.currentTime) {
  const src = o.ctx.createBufferSource();
  src.buffer = o.noise;
  const f = o.ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  src.connect(f).connect(into(o, to, pan, gain, when, len));
  src.start(when);
  src.stop(when + len + 0.05);
}

/** A sound of the game, where it happened (`x` in the world; the view's left `cx` and width `w`). */
export function playSound(kind: string, x?: number, cx = 0, w = 1) {
  const o = sound();
  if (!o) return;
  const { pan, gain } = placeOf(x, cx, w), v = 0.12 * gain, t = o.ctx.currentTime, to = o.fx;
  switch (kind) {
    case "click": tone(o, to, "square", 520, 520, 0.05, v, pan); break;
    case "pop": tone(o, to, "sine", 660, 990, 0.09, v, pan); break;
    case "chime": tone(o, to, "triangle", 880, 1320, 0.25, v, pan); tone(o, to, "sine", 1760, 1760, 0.4, v * 0.4, pan); break;
    case "whoosh": hiss(o, to, 0.18, v * 0.8, "bandpass", 900, pan); break;
    case "success": [523, 659, 784, 1047].forEach((f, i) => tone(o, to, "triangle", f, f, 0.22, v, pan, t + i * 0.08)); break;
    case "hit": tone(o, to, "square", 180, 70, 0.18, v, pan); hiss(o, to, 0.1, v * 0.6, "lowpass", 1200, pan); break;
    case "coin": tone(o, to, "square", 988, 988, 0.06, v * 0.8, pan); tone(o, to, "square", 1319, 1319, 0.2, v * 0.8, pan, t + 0.06); break;
    case "jump": tone(o, to, "square", 300, 620, 0.14, v * 0.8, pan); break;
    case "laser": tone(o, to, "sawtooth", 1400, 180, 0.16, v * 0.7, pan); break;
    case "boom": hiss(o, to, 0.6, v * 2, "lowpass", 400, pan); tone(o, to, "sine", 120, 40, 0.5, v * 1.5, pan); break;
    case "power": [392, 523, 659, 784, 1047].forEach((f, i) => tone(o, to, "square", f, f, 0.08, v * 0.6, pan, t + i * 0.05)); break;
    case "blip": tone(o, to, "sine", 880, 880, 0.05, v, pan); break;
    default: tone(o, to, "sine", 660, 990, 0.09, v, pan);
  }
}

/** A note on an instrument (its pitch in Hz), into the effects or the music. */
export function playNote(instrument: string, freq: number, x?: number, cx = 0, w = 1, when?: number, music = false) {
  const o = sound();
  if (!o) return;
  const { pan, gain } = placeOf(x, cx, w), to = music ? o.music : o.fx, t = when ?? o.ctx.currentTime, v = 0.14 * gain;
  switch (instrument) {
    case "bell": tone(o, to, "sine", freq, freq, 1.6, v, pan, t); tone(o, to, "sine", freq * 2.76, freq * 2.76, 0.7, v * 0.35, pan, t); break;
    case "pluck": tone(o, to, "sawtooth", freq, freq * 0.995, 0.35, v * 0.6, pan, t); tone(o, to, "triangle", freq * 2, freq * 2, 0.15, v * 0.3, pan, t); break;
    case "bass": tone(o, to, "square", freq / 2, freq / 2, 0.3, v * 0.6, pan, t); tone(o, to, "sine", freq / 4, freq / 4, 0.35, v, pan, t); break;
    case "drum": {
      // Low pitches a kick, middle ones a snare, high ones a hat.
      if (freq < 300) tone(o, to, "sine", 150, 40, 0.3, v * 1.6, pan, t);
      else if (freq < 450) { hiss(o, to, 0.15, v, "bandpass", 1800, pan, t); tone(o, to, "triangle", 200, 120, 0.1, v * 0.6, pan, t); }
      else hiss(o, to, 0.05, v * 0.6, "highpass", 7000, pan, t);
      break;
    }
    default: tone(o, to, "triangle", freq, freq, 0.9, v, pan, t); tone(o, to, "sine", freq * 2, freq * 2, 0.5, v * 0.3, pan, t);
  }
}

/**
 * The music: a mood's pattern from the seed, at a tempo, scheduled a little ahead on the audio clock while it plays;
 * started `at` the game's own time (seconds played), so its beats fall where the game's beat rules do.
 */
export class Music {
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private next = 0;
  start(mood: Mood, tempo: number, seed: number, volume: number, at = 0) {
    const o = sound();
    if (!o || this.timer) return;
    const pat = musicPattern(mood, seed), len = 60 / tempo / 4;
    o.music.gain.setTargetAtTime(volume * 0.5, o.ctx.currentTime, 0.2);
    // The next sixteenth of the game's time, that far ahead on the audio clock.
    this.step = Math.ceil(at / len - 1e-6);
    this.next = o.ctx.currentTime + 0.05 + (this.step * len - at);
    const kick = 98, snare = 330, hat = 900;
    this.timer = setInterval(() => {
      while (this.next < o.ctx.currentTime + 0.2) {
        const i = this.step % 64, b = i % 16, at = this.next;
        if (pat.kick[b]) playNote("drum", kick, undefined, 0, 1, at, true);
        if (pat.snare[b]) playNote("drum", snare, undefined, 0, 1, at, true);
        if (pat.hat[b]) playNote("drum", hat, undefined, 0, 1, at, true);
        const bass = pat.bass[i], lead = pat.lead[i];
        if (bass !== null) playNote("bass", noteFreq(pat.scale, bass), undefined, 0, 1, at, true);
        if (lead !== null) playNote(pat.voice, noteFreq(pat.scale, lead), undefined, 0, 1, at, true);
        // A soft chord at the start of each bar.
        if (b === 0) for (const k of [0, 2, 4]) playNote("bell", noteFreq(pat.scale, pat.chords[Math.floor(i / 16)] + k) / 2, undefined, 0, 1, at, true);
        this.next += len;
        this.step++;
      }
    }, 25);
  }
  /** Softer or louder (0: quiet), without stopping. */
  volume(v: number) { const o = sound(); if (o && this.timer) o.music.gain.setTargetAtTime(v * 0.5, o.ctx.currentTime, 0.1); }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const o = out;
    if (o) o.music.gain.setTargetAtTime(0, o.ctx.currentTime, 0.1);
  }
}
