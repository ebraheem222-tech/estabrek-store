/**
 * The video editor (docs/cms-big-engine-plan.ar.md A4), opened from focus mode on a video: a page of its own.
 *  - The preview plays the project live on a canvas: each clip from its own trim, at its speed, cut to the frame's
 *    shape; the words at their times (a short fade), the music under it, a fade in and out.
 *  - The timeline: clips in a row (drag one to change its place, drag its edges to trim it), the words on their own
 *    row (drag to move, the right edge for how long), the play head (a click on the ruler moves it).
 *  - Cut at the play head, take away, add a clip or the music from the library, add words, the frame's shape,
 *    sound off, fade.
 *  - "Make the video": the backend makes it (Cloudinary, lib/videoEdit.ts) and the element shows it; the project
 *    stays with the element, so it opens here again.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { PageTreeNode } from "../../api/pages.api";
import { VideoPickerModal } from "../../components/media/VideoPickerModal";
import { LIMITS, RATIOS, SPEEDS, clipAt, clipLength, clipStarts, moveClip, outputSize, projectLength, safeProject, splitAt, type Clip, type Project, type Ratio, type Words } from "../../../../shared/videoEdit";
import { say } from "../say";

const btn = "rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs hover:bg-white/[0.12] disabled:opacity-40";
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-[11px] ${on ? "bg-accent-500/30 text-white" : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"}`;
const input = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";
let seq = 0;
const newId = (k: string) => `${k}${Date.now().toString(36)}${(seq++).toString(36)}`;
const time = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}.${Math.floor((t % 1) * 10)}`;
const RTL = /[֐-ࣿ]/;

/** One frame of the project at `t`, on a canvas of the frame's size. */
function draw(ctx: CanvasRenderingContext2D, video: HTMLVideoElement | undefined, p: Project, t: number, W: number, H: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (video && video.videoWidth) {
    // Cut to the frame's shape (as the backend's c_fill: the middle).
    const k = Math.max(W / video.videoWidth, H / video.videoHeight);
    const sw = W / k, sh = H / k;
    ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, W, H);
  }
  for (const w of p.words ?? []) {
    if (t < w.at || t > w.at + w.dur) continue;
    const a = Math.min(1, (t - w.at) / 0.3, (w.at + w.dur - t) / 0.3);
    const size = (w.size ?? 48) * (H / 720);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `700 ${size}px "Noto Sans Arabic", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = RTL.test(w.text) ? "rtl" : "ltr";
    const y = w.place === "top" ? H * 0.08 + size / 2 : w.place === "middle" ? H / 2 : H * 0.92 - size / 2;
    if (w.box) {
      const m = ctx.measureText(w.text).width;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W / 2 - m / 2 - size * 0.4, y - size * 0.7, m + size * 0.8, size * 1.4);
    }
    ctx.fillStyle = w.color ?? "#fff";
    ctx.fillText(w.text, W / 2, y);
    ctx.restore();
  }
  if (p.fade) {
    const len = projectLength(p);
    const dark = Math.max(0, 1 - t / 0.6, 1 - (len - t) / 0.6);
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, dark)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

export function VideoEditor({ node, abs, busy, onClose, onSave }: {
  node: PageTreeNode;
  /** A video's address as the editor can load it (the shop's own paths on the shop's address). */
  abs: (src: string) => string;
  busy: boolean;
  onClose: () => void;
  /** Make the video; resolves with an error to show, or null when done. */
  onSave: (project: Project) => Promise<string | null>;
}) {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const saved = safeProject((props.edit as { project?: unknown } | undefined)?.project);
  const [project, setProject] = useState<Project | null>(saved);
  const [lengths, setLengths] = useState<Record<string, { d: number; w: number; h: number }>>({});
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [chosen, setChosen] = useState<{ kind: "clip" | "words"; id: string } | null>(null);
  const [picking, setPicking] = useState<null | "clip" | "music">(null);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const music = useRef<HTMLAudioElement>(null);
  const clock = useRef({ t: 0, last: 0 });

  // A video's length and size as soon as its details load (the first clip starts the project when there's none).
  const first = String(props.src ?? "");
  const known = (src: string, v: HTMLVideoElement) => {
    if (!v.duration || !Number.isFinite(v.duration)) return;
    setLengths((m) => (m[src] ? m : { ...m, [src]: { d: Math.round(v.duration * 100) / 100, w: v.videoWidth, h: v.videoHeight } }));
    if (src === first) setProject((p) => p ?? { clips: [{ id: newId("c"), src, in: 0, out: Math.round(v.duration * 100) / 100 }] });
  };
  const sources = useMemo(() => [...new Set([first, ...(project?.clips.map((c) => c.src) ?? [])])].filter(Boolean), [first, project]);
  const length = project ? projectLength(project) : 0;
  const size = outputSize(project?.ratio, project ? lengths[project.clips[0].src] : null);
  const scale = Math.min(1, 560 / size.w, 315 / size.h);
  const view = { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };

  // Playing: the clock runs, the clip at the play head plays from its own trim at its speed, the others wait.
  useEffect(() => {
    if (!project) return;
    let raf = 0;
    const tick = (now: number) => {
      const c = clock.current;
      if (playing) {
        c.t = Math.min(length, c.t + (c.last ? (now - c.last) / 1000 : 0));
        if (c.t >= length) setPlaying(false);
        setT(c.t);
      }
      c.last = now;
      const at = clipAt(project, c.t);
      const clip = at ? project.clips[at.index] : null;
      videos.current.forEach((v, src) => {
        if (!clip || src !== clip.src) {
          if (!v.paused) v.pause();
          return;
        }
        v.muted = Boolean(project.mute || clip.mute);
        v.playbackRate = clip.speed ?? 1;
        if (Math.abs(v.currentTime - at!.local) > (playing ? 0.35 : 0.04)) v.currentTime = at!.local;
        if (playing && v.paused) void v.play().catch(() => undefined);
        if (!playing && !v.paused) v.pause();
      });
      const m = music.current;
      if (m) {
        m.volume = project.music?.volume ?? 0.6;
        if (Math.abs(m.currentTime - c.t) > 0.35) m.currentTime = c.t;
        if (playing && m.paused) void m.play().catch(() => undefined);
        if (!playing && !m.paused) m.pause();
      }
      const ctx = canvas.current?.getContext("2d");
      if (ctx) draw(ctx, clip ? videos.current.get(clip.src) : undefined, project, c.t, size.w, size.h);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [project, playing, length, size.w, size.h]);
  useEffect(() => () => videos.current.forEach((v) => v.pause()), []);

  const seek = (to: number) => {
    clock.current.t = Math.max(0, Math.min(length, to));
    setT(clock.current.t);
  };
  const change = (next: Project) => setProject(next);
  const clipOf = (id: string) => project?.clips.find((c) => c.id === id) ?? null;
  const wordsOf = (id: string) => project?.words?.find((w) => w.id === id) ?? null;
  const setClip = (id: string, patch: Partial<Clip>) => project && change({ ...project, clips: project.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const setWords = (id: string, patch: Partial<Words>) => project && change({ ...project, words: (project.words ?? []).map((w) => (w.id === id ? { ...w, ...patch } : w)) });

  // The timeline's scale: the whole video in the row's width.
  const row = useRef<HTMLDivElement>(null);
  const [rowW, setRowW] = useState(800);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRowW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [project === null]); // eslint-disable-line react-hooks/exhaustive-deps
  const pps = Math.max(8, (rowW - 8) / Math.max(1, length));
  const drag = useRef<null | { kind: "trimIn" | "trimOut" | "move" | "wordsMove" | "wordsDur"; id: string; x: number; start: Project }>(null);
  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !project) return;
    const ds = (e.clientX - d.x) / pps;
    const base = d.start;
    if (d.kind === "trimIn" || d.kind === "trimOut") {
      const c = base.clips.find((x) => x.id === d.id)!;
      const full = lengths[c.src]?.d ?? 36000;
      const k = c.speed ?? 1;
      if (d.kind === "trimIn") setClip(d.id, { in: Math.round(Math.max(0, Math.min(c.out - 0.2, c.in + ds * k)) * 100) / 100 });
      else setClip(d.id, { out: Math.round(Math.max(c.in + 0.2, Math.min(full, c.out + ds * k)) * 100) / 100 });
    } else if (d.kind === "wordsMove" || d.kind === "wordsDur") {
      const w = base.words!.find((x) => x.id === d.id)!;
      if (d.kind === "wordsMove") setWords(d.id, { at: Math.round(Math.max(0, Math.min(projectLength(base) - 0.2, w.at + ds)) * 100) / 100 });
      else setWords(d.id, { dur: Math.round(Math.max(0.2, w.dur + ds) * 100) / 100 });
    }
  };
  const onDragEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.kind !== "move" || !project) return;
    // Dropped: the clip goes where the pointer is among the others' middles.
    const x = (e.clientX - row.current!.getBoundingClientRect().left) / pps;
    const starts = clipStarts(d.start);
    const from = d.start.clips.findIndex((c) => c.id === d.id);
    let to = d.start.clips.findIndex((c, i) => x < starts[i] + clipLength(c) / 2);
    if (to < 0) to = d.start.clips.length - 1;
    if (to !== from) change(moveClip(d.start, from, to));
  };

  const one = chosen?.kind === "clip" ? clipOf(chosen.id) : null;
  const words = chosen?.kind === "words" ? wordsOf(chosen.id) : null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-950 text-white" role="dialog" aria-modal="true" aria-label={say("محرّر الفيديو|The video editor|עורך הווידאו")} data-testid="studio-video-editor">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3 py-2">
        <span className="text-sm font-semibold">🎬 {say("محرّر الفيديو|The video editor|עורך הווידאו")}</span>
        <span className="text-xs text-white/45">{node.name ?? node.id}</span>
        <span className="flex-1" />
        <div className="flex gap-1" role="radiogroup" aria-label={say("شكل الإطار|The frame's shape|צורת המסגרת")}>
          {RATIOS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={(project?.ratio ?? "original") === r} className={chip((project?.ratio ?? "original") === r)} disabled={!project} onClick={() => project && change({ ...project, ratio: r === "original" ? undefined : (r as Ratio) })} data-testid="video-ratio" data-ratio={r}>
              {r === "original" ? say("متل ما انصوّر|As filmed|כפי שצולם") : r}
            </button>
          ))}
        </div>
        <button type="button" className={btn} onClick={onClose} data-testid="video-close">{say("إغلاق|Close|סגירה")}</button>
        <button
          type="button" className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40" disabled={!project || busy || working}
          onClick={async () => {
            if (!project) return;
            const checked = safeProject(project);
            if (!checked) return setNote(say("الفيديو فاضي أو أطول من 10 دقايق.|The video is empty or longer than 10 minutes.|הווידאו ריק או ארוך מ־10 דקות."));
            setWorking(true);
            setNote(null);
            const problem = await onSave(checked);
            setWorking(false);
            setNote(problem ?? say("انعمل الفيديو، والصفحة بتعرضه. المشروع محفوظ معه.|The video is made and the page shows it. The project is kept with it.|הווידאו נוצר והעמוד מציג אותו."));
          }}
          data-testid="video-save"
        >
          {working ? say("عم نعمله…|Making it…|יוצרים…") : say("اعمل الفيديو|Make the video|צור את הווידאו")}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 p-3">
          {project ? (
            <canvas ref={canvas} width={size.w} height={size.h} style={{ width: view.w, height: view.h }} className="rounded-lg bg-black shadow-2xl" data-testid="video-preview" data-ratio={project.ratio ?? "original"} />
          ) : (
            <p className="text-sm text-white/50" data-testid="video-loading">{say("عم نقرا الفيديو…|Reading the video…|קוראים את הווידאו…")}</p>
          )}
          <div className="flex items-center gap-2 text-xs">
            <button type="button" className={btn} disabled={!project} onClick={() => { if (clock.current.t >= length) seek(0); clock.current.last = 0; setPlaying((p) => !p); }} data-testid="video-play" aria-pressed={playing}>
              {playing ? "⏸" : "▶"}
            </button>
            <span className="font-mono text-white/70" dir="ltr" data-testid="video-time">{time(t)} / {time(length)}</span>
          </div>
          {note ? <p className="max-w-xl text-center text-[11px] text-white/60" data-testid="video-note">{note}</p> : null}
        </main>

        <aside className="w-72 shrink-0 space-y-3 overflow-y-auto border-s border-white/[0.08] p-3" data-testid="video-inspector">
          {one && project ? (
            <div className="space-y-2" data-testid="video-clip-panel">
              <div className="text-xs font-medium">{say("المقطع|The clip|הקטע")} {project.clips.indexOf(one) + 1}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-white/55">
                <label>{say("من|From|מ")}<input type="number" step={0.1} min={0} className={input} value={one.in} onChange={(e) => setClip(one.id, { in: Math.max(0, Math.min(one.out - 0.2, Number(e.target.value))) })} data-testid="video-clip-in" /></label>
                <label>{say("لـ|To|עד")}<input type="number" step={0.1} min={0} className={input} value={one.out} onChange={(e) => setClip(one.id, { out: Math.max(one.in + 0.2, Math.min(lengths[one.src]?.d ?? 36000, Number(e.target.value))) })} data-testid="video-clip-out" /></label>
              </div>
              <label className="block text-[11px] text-white/55">{say("السرعة|Speed|מהירות")}
                <select className={input} value={one.speed ?? 1} onChange={(e) => setClip(one.id, { speed: Number(e.target.value) === 1 ? undefined : Number(e.target.value) })} data-testid="video-clip-speed">
                  {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={one.mute === true} onChange={(e) => setClip(one.id, { mute: e.target.checked || undefined })} data-testid="video-clip-mute" />{say("بدون صوت|No sound|ללא קול")}</label>
            </div>
          ) : null}
          {words && project ? (
            <div className="space-y-2" data-testid="video-words-panel">
              <div className="text-xs font-medium">{say("الكلام|The words|המילים")}</div>
              <input className={input} dir="auto" maxLength={LIMITS.text} value={words.text} onChange={(e) => setWords(words.id, { text: e.target.value })} data-testid="video-words-text" />
              <div className="grid grid-cols-2 gap-2 text-[11px] text-white/55">
                <label>{say("من الثانية|From second|משנייה")}<input type="number" step={0.1} min={0} className={input} value={words.at} onChange={(e) => setWords(words.id, { at: Math.max(0, Number(e.target.value)) })} data-testid="video-words-at" /></label>
                <label>{say("لمدة|For|למשך")}<input type="number" step={0.1} min={0.2} className={input} value={words.dur} onChange={(e) => setWords(words.id, { dur: Math.max(0.2, Number(e.target.value)) })} data-testid="video-words-dur" /></label>
              </div>
              <div className="flex gap-1">
                {(["top", "middle", "bottom"] as const).map((pl) => (
                  <button key={pl} type="button" className={chip((words.place ?? "bottom") === pl)} onClick={() => setWords(words.id, { place: pl === "bottom" ? undefined : pl })} data-testid="video-words-place" data-place={pl}>
                    {pl === "top" ? say("فوق|Top|למעלה") : pl === "middle" ? say("نص|Middle|אמצע") : say("تحت|Bottom|למטה")}
                  </button>
                ))}
              </div>
              <label className="block text-[11px] text-white/55">{say("الحجم|Size|גודל")}<input type="range" min={12} max={160} value={words.size ?? 48} onChange={(e) => setWords(words.id, { size: Number(e.target.value) })} className="w-full" data-testid="video-words-size" /></label>
              <label className="flex items-center gap-2 text-[11px] text-white/55">{say("اللون|Colour|צבע")}<input type="color" value={words.color ?? "#ffffff"} onChange={(e) => setWords(words.id, { color: e.target.value })} data-testid="video-words-colour" /></label>
              <label className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={words.box === true} onChange={(e) => setWords(words.id, { box: e.target.checked || undefined })} data-testid="video-words-box" />{say("خلفية داكنة ورا الكلام|A dark band behind the words|רקע כהה מאחורי המילים")}</label>
            </div>
          ) : null}
          {!one && !words ? <p className="text-[11px] leading-5 text-white/45">{say("كبسة على مقطع أو كلام بالخط الزمني لتعديله. اسحب المقطع لتغيّر مكانه، وحوافه لتقصّه.|Click a clip or words on the timeline to change them. Drag a clip to move it, its edges to trim it.|לחץ על קטע או מילים בציר הזמן.")}</p> : null}
          {project ? (
            <div className="space-y-2 border-t border-white/[0.08] pt-3">
              <label className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={project.mute === true} onChange={(e) => change({ ...project, mute: e.target.checked || undefined })} data-testid="video-mute" />{say("كل الفيديو بدون صوته|The whole video without its sound|כל הווידאו ללא קול")}</label>
              <label className="flex items-center gap-2 text-[11px] text-white/60"><input type="checkbox" checked={project.fade === true} onChange={(e) => change({ ...project, fade: e.target.checked || undefined })} data-testid="video-fade" />{say("يبين ويختفي بنعومة|Fades in and out|נכנס ויוצא בהדרגה")}</label>
              {project.music ? (
                <div className="space-y-1 text-[11px] text-white/60" data-testid="video-music">
                  ♪ {say("موسيقى|Music|מוזיקה")}
                  <input type="range" min={0} max={1} step={0.05} value={project.music.volume ?? 0.6} onChange={(e) => change({ ...project, music: { ...project.music!, volume: Number(e.target.value) } })} className="w-full" data-testid="video-music-volume" />
                  <button type="button" className={btn} onClick={() => change({ ...project, music: undefined })}>{say("شيل الموسيقى|Remove the music|הסר מוזיקה")}</button>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="space-y-2 border-t border-white/[0.08] p-3" data-testid="video-timeline">
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" className={btn} disabled={!project} onClick={() => project && change(splitAt(project, t, newId("c")))} data-testid="video-split">✂ {say("قص هون|Cut here|חתוך כאן")}</button>
          <button
            type="button" className={btn} disabled={!project || !chosen || (chosen.kind === "clip" && project.clips.length < 2)}
            onClick={() => {
              if (!project || !chosen) return;
              if (chosen.kind === "clip") change({ ...project, clips: project.clips.filter((c) => c.id !== chosen.id) });
              else change({ ...project, words: (project.words ?? []).filter((w) => w.id !== chosen.id) });
              setChosen(null);
            }}
            data-testid="video-delete"
          >
            🗑 {say("شيل|Remove|הסר")}
          </button>
          <button type="button" className={btn} disabled={!project || project.clips.length >= LIMITS.clips} onClick={() => setPicking("clip")} data-testid="video-add-clip">+ {say("مقطع|Clip|קטע")}</button>
          <button
            type="button" className={btn} disabled={!project || (project.words?.length ?? 0) >= LIMITS.words}
            onClick={() => {
              if (!project) return;
              const w: Words = { id: newId("w"), text: say("كلام جديد|New words|מילים חדשות"), at: Math.round(Math.min(t, Math.max(0, length - 2)) * 100) / 100, dur: Math.min(3, Math.max(0.5, length)) };
              change({ ...project, words: [...(project.words ?? []), w] });
              setChosen({ kind: "words", id: w.id });
            }}
            data-testid="video-add-words"
          >
            + {say("كلام|Words|מילים")}
          </button>
          <button type="button" className={btn} disabled={!project} onClick={() => setPicking("music")} data-testid="video-add-music">♪ {say("موسيقى|Music|מוזיקה")}</button>
        </div>
        {project ? (
          <div className="relative select-none" onPointerMove={onDragMove} onPointerUp={onDragEnd}>
            <div
              className="relative h-5 cursor-pointer rounded bg-white/[0.04]"
              onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / pps); }}
              data-testid="video-ruler"
            >
              {Array.from({ length: Math.floor(length) + 1 }, (_, s) => s).filter((s) => s % Math.max(1, Math.round(40 / pps)) === 0).map((s) => (
                <span key={s} className="absolute top-0 text-[9px] text-white/35" style={{ left: s * pps }} dir="ltr">{s}s</span>
              ))}
            </div>
            <div ref={row} className="relative mt-1 h-14 rounded bg-white/[0.03]" data-testid="video-clips">
              {project.clips.map((c, i) => {
                const left = clipStarts(project)[i] * pps, w = clipLength(c) * pps;
                const on = chosen?.kind === "clip" && chosen.id === c.id;
                const start = (kind: "trimIn" | "trimOut" | "move") => (e: React.PointerEvent) => {
                  e.stopPropagation();
                  (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                  drag.current = { kind, id: c.id, x: e.clientX, start: project };
                  setChosen({ kind: "clip", id: c.id });
                };
                return (
                  <div key={c.id} className={`absolute top-1 bottom-1 overflow-hidden rounded-md border ${on ? "border-sky-300 bg-sky-500/40" : "border-white/20 bg-accent-500/35"} cursor-grab`} style={{ left, width: Math.max(6, w) }} onPointerDown={start("move")} data-testid="video-clip" data-id={c.id}>
                    <span className="pointer-events-none absolute inset-x-3 top-1 truncate text-[10px] text-white/85">{i + 1} · {clipLength(c).toFixed(1)}s{c.speed && c.speed !== 1 ? ` · ${c.speed}×` : ""}</span>
                    <span className="absolute inset-y-0 start-0 w-2 cursor-ew-resize bg-white/40" onPointerDown={start("trimIn")} data-testid="video-trim-in" />
                    <span className="absolute inset-y-0 end-0 w-2 cursor-ew-resize bg-white/40" onPointerDown={start("trimOut")} data-testid="video-trim-out" />
                  </div>
                );
              })}
            </div>
            <div className="relative mt-1 h-8 rounded bg-white/[0.03]" data-testid="video-words-row">
              {(project.words ?? []).map((w) => {
                const on = chosen?.kind === "words" && chosen.id === w.id;
                const start = (kind: "wordsMove" | "wordsDur") => (e: React.PointerEvent) => {
                  e.stopPropagation();
                  (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                  drag.current = { kind, id: w.id, x: e.clientX, start: project };
                  setChosen({ kind: "words", id: w.id });
                };
                return (
                  <div key={w.id} className={`absolute top-1 bottom-1 cursor-grab overflow-hidden rounded border ${on ? "border-sky-300 bg-sky-500/40" : "border-amber-200/40 bg-amber-400/25"}`} style={{ left: w.at * pps, width: Math.max(10, w.dur * pps) }} onPointerDown={start("wordsMove")} data-testid="video-words" data-id={w.id}>
                    <span className="pointer-events-none absolute inset-x-1 top-0.5 truncate text-[10px]" dir="auto">{w.text}</span>
                    <span className="absolute inset-y-0 end-0 w-2 cursor-ew-resize bg-white/40" onPointerDown={start("wordsDur")} />
                  </div>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-rose-400" style={{ left: t * pps }} data-testid="video-playhead" />
          </div>
        ) : null}
      </footer>

      {/* The clips' and the music's own videos, played behind the preview. */}
      <div className="hidden" aria-hidden="true">
        {sources.map((src) => (
          <video
            key={src} src={abs(src)} preload="auto" playsInline muted
            ref={(v) => { if (v) videos.current.set(src, v); else videos.current.delete(src); }}
            onLoadedMetadata={(e) => known(src, e.currentTarget)}
          />
        ))}
        {project?.music ? <audio ref={music} src={abs(project.music.src)} preload="auto" /> : null}
      </div>

      <VideoPickerModal
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={({ url, video }) => {
          const kind = picking;
          setPicking(null);
          if (!project) return;
          if (kind === "music") return change({ ...project, music: { src: url, volume: 0.6 } });
          const d = video.durationMs ? Math.round(video.durationMs / 10) / 100 : 10;
          change({ ...project, clips: [...project.clips, { id: newId("c"), src: url, in: 0, out: d }] });
        }}
      />
    </div>
  );
}
