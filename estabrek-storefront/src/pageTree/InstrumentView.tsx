"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { CHORDS, chordNotes, guitarTuning, melodyNotes, noteName, pianoNotes, type InstrumentSpec, type Melody } from "./instrument";
import { createInstrumentAudio } from "./instrumentAudio";
import type { TreeLang } from "./tree";
import styles from "./InstrumentView.module.css";

const WORDS = {
  ar: { piano: "بيانو تفاعلي", guitar: "غيتار تفاعلي", sound: "الصوت", play: "تشغيل اللحن", pause: "إيقاف مؤقت", stop: "إيقاف", volume: "مستوى الصوت", quiet: "الصوت مكتوم؛ يمكنك تشغيله من الزر.", unavailable: "الصوت غير متاح في هذا المتصفح؛ المفاتيح البصرية ما زالت تعمل.", hint: "اضغط المفاتيح أو استخدم A W S E D F T G Y H U J K داخل الآلة.", progress: "تقدم اللحن", string: "وتر", fret: "فريت", played: "النغمة الحالية" },
  en: { piano: "Interactive piano", guitar: "Interactive guitar", sound: "Sound", play: "Play melody", pause: "Pause", stop: "Stop", volume: "Volume", quiet: "Sound is muted; use the sound button to enable it.", unavailable: "Audio is unavailable in this browser; visual keys still work.", hint: "Press the keys or use A W S E D F T G Y H U J K inside the instrument.", progress: "Melody progress", string: "String", fret: "Fret", played: "Current note" },
  he: { piano: "פסנתר אינטראקטיבי", guitar: "גיטרה אינטראקטיבית", sound: "צליל", play: "נגנו מנגינה", pause: "השהיה", stop: "עצירה", volume: "עוצמה", quiet: "הצליל מושתק; אפשר להפעיל אותו בכפתור הצליל.", unavailable: "שמע לא זמין בדפדפן הזה; המקשים החזותיים עדיין עובדים.", hint: "לחצו על המקשים או השתמשו ב-A W S E D F T G Y H U J K בתוך הכלי.", progress: "התקדמות המנגינה", string: "מיתר", fret: "סריג", played: "התו הנוכחי" },
};

export function InstrumentView({ spec, lang, label }: { spec: InstrumentSpec; lang: TreeLang; label?: string }) {
  const words = WORDS[lang];
  const audio = useRef<ReturnType<typeof createInstrumentAudio> | null>(null);
  const [muted, setMuted] = useState(!spec.sound);
  const [volume, setVolume] = useState(spec.volume);
  const [unavailable, setUnavailable] = useState(false);
  const [pressed, setPressed] = useState<number[]>([]);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [melody, setMelody] = useState(spec.melody);
  const [tempo, setTempo] = useState(spec.tempo);
  const [repeat, setRepeat] = useState(spec.repeat);
  const playerWords = { ar: ["الأغنية", "السرعة", "تكرار"], en: ["Song", "Tempo", "Repeat"], he: ["שיר", "קצב", "חזרה"] }[lang];
  const songNames: Record<Melody, string> = { scale: {ar:"سلم موسيقي",en:"Scale",he:"סולם"}[lang], arpeggio: {ar:"أربيجيو",en:"Arpeggio",he:"ארפג׳יו"}[lang], chords: {ar:"أوتار",en:"Chords",he:"אקורדים"}[lang], jingle: "Jingle Bells", wish: "We Wish You a Merry Christmas", silent: "Silent Night" };
  const playlist = Array.from(new Set([spec.melody, ...(spec.playlist ?? [])]));
  const pointers = useRef(new Map<number, number>());
  const keys = useRef(new Map<string, number>());
  const heldNotes = useRef(new Set<number>());
  const alive = useRef(false);
  const pattern = useMemo(() => melodyNotes(melody, spec.octave), [melody, spec.octave]);
  const notes = useMemo(() => pianoNotes(spec.octave, spec.octaves), [spec.octave, spec.octaves]);
  const stop = useCallback(() => {
    audio.current?.stop(); keys.current.clear(); pointers.current.clear(); heldNotes.current.clear();
    setPressed([]); setSequence([]); setPlaying(false);
  }, []);
  useEffect(() => {
    alive.current = true;
    const engine = createInstrumentAudio();
    audio.current = engine;
    const hidden = () => { if (document.visibilityState === "hidden") stop(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", stop);
    return () => {
      alive.current = false; audio.current = null;
      document.removeEventListener("visibilitychange", hidden); window.removeEventListener("blur", stop);
      void engine.dispose();
    };
  }, [stop]);
  const playNotes = useCallback((values: number[]) => {
    if (muted || volume <= 0) return;
    for (const midi of values) void audio.current?.play(midi, { volume, sustain: spec.sustain, waveform: spec.waveform }).then(ok => { if (alive.current && !ok && audio.current?.unavailable()) setUnavailable(true); });
  }, [muted, volume, spec.sustain, spec.waveform]);
  useEffect(() => { if (muted) audio.current?.stop(); }, [muted]);
  useEffect(() => {
    if (!playing || step < 0) return;
    const values = pattern[step] ?? pattern[0];
    setSequence(values); playNotes(values);
    const timer = window.setTimeout(() => {
      if (step + 1 < pattern.length) setStep(step + 1);
      else if (repeat) setStep(0);
      else { setPlaying(false); setSequence([]); }
    }, 60000 / tempo);
    return () => window.clearTimeout(timer);
  }, [playing, step, pattern, tempo, repeat, playNotes]);

  const press = (midi: number) => { heldNotes.current.add(midi); setPressed([...heldNotes.current]); playNotes([midi]); };
  const release = (midi: number) => { heldNotes.current.delete(midi); setPressed([...heldNotes.current]); audio.current?.release(midi); };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>, down: boolean) => {
    const key = event.key.toLowerCase();
    if (!down) {
      const midi = keys.current.get(key);
      if (midi !== undefined) { event.preventDefault(); keys.current.delete(key); release(midi); }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || ["INPUT", "SELECT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) return;
    const match = notes.find(note => note.shortcut && note.shortcut === key);
    if (!match) return;
    event.preventDefault();
    if (!event.repeat && !keys.current.has(key)) { keys.current.set(key, match.midi); press(match.midi); }
  };
  const pointerDown = (event: PointerEvent<HTMLButtonElement>, midi: number) => {
    event.preventDefault(); event.currentTarget.focus();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    pointers.current.set(event.pointerId, midi); press(midi);
  };
  const pointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const midi = pointers.current.get(event.pointerId);
    if (midi !== undefined) { pointers.current.delete(event.pointerId); release(midi); }
  };
  const active = (midi: number) => pressed.includes(midi) || sequence.includes(midi);
  let white = 0;
  const whiteCount = notes.filter(note => !note.sharp).length;
  const keyButton = (midi: number, name: string, content: React.ReactNode, extra?: { style?: CSSProperties; sharp?: boolean }) => <button key={name} type="button" className={extra?.sharp ? styles.black : styles.key} style={extra?.style} data-note={midi} data-active={active(midi)} aria-label={name} aria-pressed={active(midi)} onPointerDown={event => pointerDown(event, midi)} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp} onClick={event => { if (event.detail === 0) { setSequence([midi]); playNotes([midi]); } }}>{content}</button>;
  return <div className={styles.instrument} data-instrument={spec.kind} data-player={spec.showPlayer || undefined} data-theme={spec.theme} role="group" aria-label={label || words[spec.kind]} onKeyDown={event => keyboard(event, true)} onKeyUp={event => keyboard(event, false)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) stop(); }}>
    {spec.showPlayer ? <div className={styles.songControls}><label>{playerWords[0]}<select value={melody} onChange={event => { stop(); setStep(-1); setMelody(event.target.value as Melody); }} data-instrument-song>{playlist.map(song => <option key={song} value={song}>{songNames[song]}</option>)}</select></label><label>{playerWords[1]}<input type="range" min={40} max={200} value={tempo} onChange={event => setTempo(Number(event.target.value))} aria-label={playerWords[1]} /><output>{tempo}</output></label><label><input type="checkbox" checked={repeat} onChange={event => setRepeat(event.target.checked)} />{playerWords[2]}</label></div> : null}
    <div className={styles.toolbar}>
      <strong>{label || words[spec.kind]}</strong>
      <button type="button" data-instrument-sound aria-pressed={!muted} onClick={() => setMuted(!muted)}>{words.sound} {muted ? "○" : "●"}</button>
      <button type="button" data-instrument-play aria-pressed={playing} onClick={() => { if (playing) { setPlaying(false); setSequence([]); audio.current?.stop(); } else { setStep(step < 0 || step === pattern.length - 1 ? 0 : step); setPlaying(true); } }}>{playing ? words.pause : words.play}</button>
      <button type="button" data-instrument-stop onClick={() => { stop(); setStep(-1); }}>{words.stop}</button>
      <label>{words.volume}<input type="range" min="0" max="1" step=".05" value={volume} aria-label={words.volume} onChange={event => setVolume(Number(event.target.value))} /></label>
    </div>
    <div className={styles.progress}><progress max={pattern.length} value={step + 1} aria-label={words.progress} /></div>
    <div className={styles.viewport}>
      {spec.kind === "piano" ? <div className={styles.piano} dir="ltr" style={{ minWidth: spec.showPlayer ? 340 : spec.octaves === 2 ? 760 : 460 }}>
        {notes.map(note => {
          const position = white;
          if (!note.sharp) white++;
          const style: CSSProperties = { left: `${(note.sharp ? position - .32 : position) * 100 / whiteCount}%`, width: `${(note.sharp ? .64 : 1) * 100 / whiteCount}%` };
          return keyButton(note.midi, note.label, <><span>{spec.showNotes ? note.label : ""}</span><small>{note.shortcut.toUpperCase()}</small></>, { style, sharp: note.sharp });
        })}
      </div> : <div className={styles.fretboard} dir="ltr" style={{ gridTemplateColumns: `repeat(${spec.frets + 1},minmax(48px,1fr))` }}>
        {guitarTuning(spec.octave).slice().reverse().flatMap((base, string) => Array.from({ length: spec.frets + 1 }, (_, fret) => keyButton(base + fret, `${words.string} ${string + 1}, ${words.fret} ${fret}, ${noteName(base + fret)}`, <>{spec.showNotes ? noteName(base + fret) : fret}</>)))}
      </div>}
    </div>
    {spec.kind === "guitar" ? <div className={styles.chords}>{Object.keys(CHORDS).map(chord => <button key={chord} type="button" data-chord={chord} onClick={() => { const values = chordNotes(chord, spec.octave); setSequence(values); playNotes(values); }}>{chord}</button>)}</div> : null}
    <p className={styles.hint}>{spec.kind === "piano" ? words.hint : "E · A · D · G · B · E"}</p>
    <p className={styles.status} role="status">{unavailable ? words.unavailable : muted ? words.quiet : ""}</p>
  </div>;
}
