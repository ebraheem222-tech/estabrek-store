/** Bounded, lazy Web Audio voices. Nothing plays or allocates an AudioContext until play(). */
type NoteOptions = { volume: number; sustain: number; waveform: "sine" | "triangle" | "sawtooth" };
type Voice = { note: number; oscillator: OscillatorNode; gain: GainNode };
export function createInstrumentAudio(factory: () => AudioContext | null = () => {
  const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Constructor ? new Constructor() : null;
}) {
  let context: AudioContext | null = null;
  let disposed = false;
  let generation = 0;
  let unavailable = false;
  const noteGeneration = new Map<number, number>();
  const voices = new Set<Voice>();
  const end = (voice: Voice) => {
    voices.delete(voice);
    voice.oscillator.onended = null;
    try { voice.oscillator.stop(); } catch {}
    voice.oscillator.disconnect();
    voice.gain.disconnect();
  };
  return {
    async play(note: number, options: NoteOptions): Promise<boolean> {
      if (disposed || !Number.isFinite(note) || note < 0 || note > 127 || options.volume <= 0) return false;
      const run = generation;
      const noteRun = noteGeneration.get(note) ?? 0;
      try {
        context ??= factory();
        if (!context || context.state === "closed") { unavailable = true; return false; }
        if (context.state === "suspended") await context.resume();
        if (disposed || run !== generation || noteRun !== (noteGeneration.get(note) ?? 0)) return false;
        while (voices.size >= 12) end(voices.values().next().value!);
        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const voice = { note, oscillator, gain };
        oscillator.type = options.waveform;
        oscillator.frequency.setValueAtTime(440 * 2 ** ((note - 69) / 12), now);
        const volume = Math.max(0, Math.min(1, options.volume)) * .12;
        const sustain = Math.max(.1, Math.min(3, options.sustain));
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.linearRampToValueAtTime(volume, now + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, now + sustain);
        oscillator.connect(gain);
        gain.connect(context.destination);
        voices.add(voice);
        oscillator.onended = () => end(voice);
        oscillator.start(now);
        oscillator.stop(now + sustain + .03);
        return true;
      } catch { if (!disposed && run === generation) unavailable = true; return false; }
    },
    release(note: number) { noteGeneration.set(note, (noteGeneration.get(note) ?? 0) + 1); for (const voice of Array.from(voices)) if (voice.note === note) end(voice); },
    stop() { generation++; for (const voice of Array.from(voices)) end(voice); },
    active() { return voices.size; },
    unavailable() { return unavailable; },
    async dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      for (const voice of Array.from(voices)) end(voice);
      if (context && context.state !== "closed") { try { await context.close(); } catch {} }
      context = null;
    },
  };
}
