/** Pure instrument settings, note maps and original practice patterns. */
export const MELODIES = ["scale", "arpeggio", "chords", "jingle", "wish", "silent"] as const;
export type Melody = typeof MELODIES[number];
export type InstrumentSpec = {
  kind: "piano" | "guitar"; sound: boolean; volume: number; octave: number; octaves: number; frets: number; sustain: number;
  waveform: "sine" | "triangle" | "sawtooth"; theme: "dark" | "light"; showNotes: boolean; melody: Melody; tempo: number; repeat: boolean; playlist?: Melody[]; showPlayer?: boolean;
};
const num = (v: unknown, min: number, max: number, fallback: number, integer = false) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v)) ? v : fallback;
export function instrumentOf(p: Record<string, unknown>): InstrumentSpec {
  const melody = MELODIES.includes(p.melody as Melody) ? p.melody as Melody : "scale";
  const playlist = Array.isArray(p.playlist) ? [...new Set(p.playlist.filter((value): value is Melody => MELODIES.includes(value as Melody)))].slice(0, 6) : [];
  return { kind: p.kind === "guitar" ? "guitar" : "piano", sound: p.sound === true, volume: num(p.volume, 0, 1, .25), octave: num(p.octave, 2, 6, 4, true), octaves: num(p.octaves, 1, 2, 1, true), frets: num(p.frets, 4, 12, 8, true), sustain: num(p.sustain, .1, 3, .8), waveform: p.waveform === "sine" || p.waveform === "sawtooth" ? p.waveform : "triangle", theme: p.theme === "light" ? "light" : "dark", showNotes: p.showNotes !== false, melody, tempo: num(p.tempo, 40, 200, 100, true), repeat: p.repeat === true, ...(p.showPlayer === true ? { showPlayer: true, playlist: playlist.length ? playlist : [...MELODIES.slice(0, 3)] } : {}) };
}
const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const noteName = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
const SHORTCUTS = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k"];
export const pianoNotes = (octave: number, octaves = 1) => Array.from({ length: 12 * octaves + 1 }, (_, index) => {
  const midi = (octave + 1) * 12 + index;
  return { midi, label: noteName(midi), sharp: NAMES[midi % 12].includes("♯"), shortcut: SHORTCUTS[index] ?? "" };
});
export const guitarTuning = (octave: number) => [40, 45, 50, 55, 59, 64].map(midi => midi + (octave - 4) * 12);
export const CHORDS: Record<string, number[]> = { C: [-1, 3, 2, 0, 1, 0], G: [3, 2, 0, 0, 0, 3], Am: [-1, 0, 2, 2, 1, 0], Em: [0, 2, 2, 0, 0, 0], D: [-1, -1, 0, 2, 3, 2], F: [1, 3, 3, 2, 1, 1] };
export const chordNotes = (chord: string, octave: number) => guitarTuning(octave).flatMap((midi, string) => (CHORDS[chord]?.[string] ?? -1) < 0 ? [] : [midi + CHORDS[chord][string]]);
export function melodyNotes(kind: InstrumentSpec["melody"], octave: number): number[][] {
  const base = (octave + 1) * 12;
  if (kind === "chords") return ["C", "Am", "F", "G"].map(chord => chordNotes(chord, octave));
  // Traditional public-domain melodies, expressed as MIDI intervals, without recordings.
  const songs: Partial<Record<Melody, number[]>> = {
    jingle: [4,4,4,4,4,4,4,7,0,2,4,5,5,5,5,5,4,4,4,4,2,2,4,2,7,4,4,4,4,4,4,4,7,0,2,4,5,5,5,5,5,4,4,4,7,7,5,2,0],
    wish: [7,12,12,14,12,11,9,9,9,14,14,16,14,12,11,7,7,16,16,17,16,14,12,9,7,7,9,14,11,12],
    silent: [7,9,7,4,7,9,7,4,14,14,11,12,12,7,9,9,12,11,9,7,9,7,4,9,9,12,11,9,7,9,7,4,14,14,17,14,11,12,16,12,7,4,7,5,2,0],
  };
  if (songs[kind]) return songs[kind]!.map(note => [base + note]);
  return (kind === "arpeggio" ? [0, 4, 7, 12, 7, 4, 0, 7] : [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0]).map(note => [base + note]);
}
