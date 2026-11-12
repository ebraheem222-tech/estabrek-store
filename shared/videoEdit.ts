/**
 * A video made in the editor (docs/cms-big-engine-plan.ar.md A4): clips one after another (each trimmed, sped up or
 * slowed, muted, faded), words over the video at their times, music under it, and the frame's shape (as filmed,
 * 16:9, 9:16 for phones, square, 4:5). The editor plays it live (its own preview); the backend makes the real video
 * (its lib/videoEdit.ts reads the same project: Cloudinary joins and trims the clips, so the server doesn't work).
 * The project stays with the element, so the video is edited again later. Plain TypeScript: no React, no "@/".
 */

export const RATIOS = ["original", "16:9", "9:16", "1:1", "4:5"] as const;
export type Ratio = (typeof RATIOS)[number];
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export type Clip = {
  id: string;
  /** The video's address (a video of the library). */
  src: string;
  /** What's kept of it, in its own seconds. */
  in: number;
  out: number;
  speed?: number;
  mute?: boolean;
};
export type Words = {
  id: string;
  text: string;
  /** When it shows on the finished video, and for how long (seconds). */
  at: number;
  dur: number;
  place?: "top" | "middle" | "bottom";
  size?: number;
  color?: string;
  box?: boolean;
};
export type Music = { src: string; volume?: number };
export type Project = { clips: Clip[]; words?: Words[]; music?: Music; ratio?: Ratio; mute?: boolean; fade?: boolean };

export const LIMITS = { clips: 20, words: 20, text: 120, length: 600 } as const;
const r2 = (v: number) => Math.round(v * 100) / 100;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** How long a clip lasts on the finished video. */
export const clipLength = (c: Clip) => Math.max(0, (c.out - c.in) / (c.speed || 1));
/** How long the finished video is. */
export const projectLength = (p: Project) => r2(p.clips.reduce((s, c) => s + clipLength(c), 0));

/** Where each clip starts on the finished video. */
export function clipStarts(p: Project): number[] {
  const out: number[] = [];
  let t = 0;
  for (const c of p.clips) {
    out.push(r2(t));
    t += clipLength(c);
  }
  return out;
}

/** The clip playing at `t` (seconds of the finished video) and the moment of its own video then. */
export function clipAt(p: Project, t: number): { index: number; local: number } | null {
  let start = 0;
  for (let i = 0; i < p.clips.length; i++) {
    const c = p.clips[i], len = clipLength(c);
    if (t < start + len || i === p.clips.length - 1) return { index: i, local: Math.min(c.out, c.in + Math.max(0, t - start) * (c.speed || 1)) };
    start += len;
  }
  return null;
}

/** The project with the clip at `index` cut in two at `t` (seconds of the finished video), or as it was. */
export function splitAt(p: Project, t: number, newId: string): Project {
  const at = clipAt(p, t);
  if (!at) return p;
  const c = p.clips[at.index];
  if (at.local - c.in < 0.2 || c.out - at.local < 0.2) return p;
  const local = r2(at.local);
  const clips = [...p.clips];
  clips.splice(at.index, 1, { ...c, out: local }, { ...c, id: newId, in: local });
  return { ...p, clips };
}

/** A clip moved to another place in the row. */
export function moveClip(p: Project, from: number, to: number): Project {
  if (from === to || from < 0 || from >= p.clips.length) return p;
  const clips = [...p.clips];
  const [c] = clips.splice(from, 1);
  clips.splice(Math.max(0, Math.min(clips.length, to)), 0, c);
  return { ...p, clips };
}

/** The finished video's frame size for a shape (the first clip's own size when "as filmed"). */
export function outputSize(ratio: Ratio | undefined, first?: { w: number; h: number } | null): { w: number; h: number } {
  switch (ratio) {
    case "16:9": return { w: 1280, h: 720 };
    case "9:16": return { w: 720, h: 1280 };
    case "1:1": return { w: 1080, h: 1080 };
    case "4:5": return { w: 1080, h: 1350 };
    default: {
      if (!first?.w || !first?.h) return { w: 1280, h: 720 };
      // Even numbers, at most 1920 on the long side.
      const k = Math.min(1, 1920 / Math.max(first.w, first.h));
      const even = (v: number) => Math.max(2, Math.round((v * k) / 2) * 2);
      return { w: even(first.w), h: even(first.h) };
    }
  }
}

/** A project the editor may play and the backend may make: values in range, nothing else. */
export function safeProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? r2(v) : undefined);
  const id = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : null);
  const src = (v: unknown) => (typeof v === "string" && v.length <= 2000 && /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/.test(v) ? v : null);
  const clips: Clip[] = [];
  for (const c of Array.isArray(r.clips) ? r.clips.slice(0, LIMITS.clips) : []) {
    const x = (c ?? {}) as Record<string, unknown>;
    const cid = id(x.id), s = src(x.src), a = num(x.in, 0, 36000), b = num(x.out, 0, 36000);
    if (!cid || !s || a === undefined || b === undefined || b - a < 0.1) continue;
    const speed = num(x.speed, 0.25, 4);
    clips.push({ id: cid, src: s, in: a, out: b, ...(speed && speed !== 1 ? { speed } : {}), ...(x.mute === true ? { mute: true } : {}) });
  }
  if (!clips.length) return null;
  const out: Project = { clips };
  const words: Words[] = [];
  for (const w of Array.isArray(r.words) ? r.words.slice(0, LIMITS.words) : []) {
    const x = (w ?? {}) as Record<string, unknown>;
    const wid = id(x.id), at = num(x.at, 0, LIMITS.length), dur = num(x.dur, 0.2, LIMITS.length);
    const text = typeof x.text === "string" ? x.text.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, LIMITS.text) : "";
    if (!wid || at === undefined || dur === undefined || !text) continue;
    const item: Words = { id: wid, text, at, dur };
    if (x.place === "top" || x.place === "middle" || x.place === "bottom") item.place = x.place;
    const size = num(x.size, 12, 160);
    if (size) item.size = size;
    if (typeof x.color === "string" && HEX.test(x.color)) item.color = x.color;
    if (x.box === true) item.box = true;
    words.push(item);
  }
  if (words.length) out.words = words;
  const m = (r.music ?? null) as Record<string, unknown> | null;
  const ms = m ? src(m.src) : null;
  if (ms) out.music = { src: ms, ...(num(m!.volume, 0, 1) !== undefined ? { volume: num(m!.volume, 0, 1) } : {}) };
  if (typeof r.ratio === "string" && (RATIOS as readonly string[]).includes(r.ratio) && r.ratio !== "original") out.ratio = r.ratio as Ratio;
  if (r.mute === true) out.mute = true;
  if (r.fade === true) out.fade = true;
  return projectLength(out) <= LIMITS.length ? out : null;
}
