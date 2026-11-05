import { expect, test } from "@playwright/test";
import { instrumentOf, pianoNotes, guitarTuning, chordNotes, melodyNotes } from "../src/pageTree/instrument";
import { createInstrumentAudio } from "../src/pageTree/instrumentAudio";

test("instrument defaults are silent and invalid settings cannot escape bounds", () => {
  expect(instrumentOf({})).toMatchObject({ kind: "piano", sound: false, volume: .25, octave: 4, octaves: 1, frets: 8, tempo: 100 });
  expect(instrumentOf({ kind: "script", volume: Infinity, octave: 99, waveform: "script", tempo: 0 })).toMatchObject({ kind: "piano", volume: .25, octave: 4, waveform: "triangle", tempo: 100 });
  expect(instrumentOf({ volume: 0, sustain: .1, octave: 2, octaves: 2, frets: 12, tempo: 200, repeat: true })).toMatchObject({ volume: 0, sustain: .1, octave: 2, octaves: 2, frets: 12, tempo: 200, repeat: true });
});

test("piano, guitar chords and original melodies use reproducible pitches", () => {
  expect(instrumentOf({ showPlayer: true, melody: "jingle", playlist: ["jingle", "wish", "silent", "script", "jingle"] })).toMatchObject({ showPlayer: true, melody: "jingle", playlist: ["jingle", "wish", "silent"] });
  expect(melodyNotes("jingle", 4).slice(0, 3)).toEqual([[64], [64], [64]]);
  expect(melodyNotes("wish", 4).slice(0, 4)).toEqual([[67], [72], [72], [74]]);
  expect(melodyNotes("silent", 4).slice(0, 4)).toEqual([[67], [69], [67], [64]]);
  const keys = pianoNotes(4, 1);
  expect(keys).toHaveLength(13);
  expect(keys[0]).toMatchObject({ midi: 60, label: "C4", sharp: false });
  expect(keys[1]).toMatchObject({ midi: 61, label: "C♯4", sharp: true });
  expect(keys.at(-1)?.midi).toBe(72);
  expect(pianoNotes(4, 2)).toHaveLength(25);
  expect(guitarTuning(4)).toEqual([40, 45, 50, 55, 59, 64]);
  expect(chordNotes("C", 4)).toEqual([48, 52, 55, 60, 64]);
  for (const kind of ["scale", "arpeggio", "chords"] as const) expect(melodyNotes(kind, 4).every(notes => notes.length >= 1 && notes.length <= 6 && notes.every(Number.isFinite))).toBe(true);
});

function fixture() {
  const oscillators: any[] = [];
  const gains: any[] = [];
  let created = 0, closed = 0, resumed = 0;
  const param = () => ({ value: 0, setValueAtTime(value: number) { this.value = value; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const context: any = { state: "suspended", currentTime: 0, destination: {}, resume: async () => { resumed++; context.state = "running"; }, close: async () => { closed++; context.state = "closed"; },
    createOscillator: () => { const osc: any = { frequency: param(), type: "sine", start() { osc.started = true; }, stop() { osc.stopped = true; }, connect() {}, disconnect() { osc.disconnected = true; }, onended: null }; oscillators.push(osc); return osc; },
    createGain: () => { const gain = { gain: param(), connect() {}, disconnect() {} }; gains.push(gain); return gain; },
  };
  return { audio: createInstrumentAudio(() => { created++; return context; }), oscillators, gains, stats: () => ({ created, closed, resumed }) };
}

test("audio is lazy, pitches are accurate, voices are bounded and unmount closes resources", async () => {
  const { audio, oscillators, stats } = fixture();
  expect(stats().created).toBe(0);
  expect(await audio.play(NaN, { volume: .2, sustain: .5, waveform: "triangle" })).toBe(false);
  expect(stats().created).toBe(0);
  expect(await audio.play(69, { volume: .2, sustain: .5, waveform: "triangle" })).toBe(true);
  expect(oscillators[0].frequency.value).toBe(440);
  expect(stats().resumed).toBe(1);
  for (let note = 40; note < 65; note++) await audio.play(note, { volume: .2, sustain: 1, waveform: "sine" });
  expect(audio.active()).toBeLessThanOrEqual(12);
  audio.stop();
  expect(audio.active()).toBe(0);
  expect(oscillators.every(osc => osc.stopped && osc.disconnected)).toBe(true);
  await audio.dispose();
  expect(stats().closed).toBe(1);
  expect(await audio.play(60, { volume: .2, sustain: 1, waveform: "sine" })).toBe(false);
});

test("unavailable audio and pending resume cleanup leave the visual instrument usable", async () => {
  const missing = createInstrumentAudio(() => null);
  expect(await missing.play(60, { volume: .2, sustain: 1, waveform: "sine" })).toBe(false);
  await missing.dispose();
  let resume!: () => void;
  let started = 0;
  const ctx: any = { state: "suspended", resume: () => new Promise<void>(resolve => { resume = resolve; }), close: async () => {}, createOscillator: () => { started++; } };
  const pending = createInstrumentAudio(() => ctx);
  const playing = pending.play(60, { volume: .2, sustain: 1, waveform: "sine" });
  await pending.dispose();
  resume();
  expect(await playing).toBe(false);
  expect(started).toBe(0);
});

test("releasing a first note cancels pending audio resume without reporting an audio failure", async () => {
  let resume!: () => void;
  let started = 0;
  const ctx: any = { state: "suspended", resume: () => new Promise<void>(resolve => { resume = resolve; }), close: async () => {}, createOscillator: () => { started++; } };
  const audio = createInstrumentAudio(() => ctx);
  const playing = audio.play(60, { volume: .2, sustain: 1, waveform: "sine" });
  audio.release(60);
  resume();
  expect(await playing).toBe(false);
  expect(started).toBe(0);
  expect(audio.unavailable()).toBe(false);
  await audio.dispose();
});
