// Admin → القصص: small helpers the page uses (no React): a new slide, a reel as it's sent, the times as the date
// boxes show them, where a reel stands now, and its words in a language.
import type { StoryReel, StoryReelInput, StorySlide, StoryWords } from "../../api/stories.api";

/** A clip by its address (a picture otherwise). */
export function kindOf(url: string): StorySlide["kind"] {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) || /\/video\/upload\//i.test(url) ? "video" : "image";
}

/** A fresh slide id, none of the reel's own. */
export function slideId(taken: StorySlide[], random = Math.random): string {
  const have = new Set(taken.map((s) => s.id));
  for (;;) {
    const id = `s-${random().toString(36).slice(2, 8)}`;
    if (!have.has(id)) return id;
  }
}

/** A new slide from a chosen picture or clip (a clip's cover when it has one). */
export function newSlide(url: string, taken: StorySlide[], poster?: string | null): StorySlide {
  const kind = kindOf(url);
  return { id: slideId(taken), kind, src: url, ...(kind === "video" && poster ? { poster } : {}) };
}

/** Words with one language changed (an empty one taken out). */
export function withWords(w: StoryWords | undefined, lang: keyof StoryWords, value: string): StoryWords {
  const out: StoryWords = { ...(w ?? {}) };
  if (value.trim()) out[lang] = value;
  else delete out[lang];
  return out;
}
/** Words in a language, else any. */
export function wordsIn(w: StoryWords | undefined, lang: keyof StoryWords): string {
  return w?.[lang] ?? "";
}
export function anyWords(w: StoryWords | undefined): string {
  return w?.ar || w?.en || w?.he || "";
}

/** A moment as a date-and-time box shows it (this computer's own time). */
export function toLocalBox(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
}
/** A date-and-time box's value as a moment (null for an empty box). */
export function fromLocalBox(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Where a reel stands now: shown, switched off, waiting for its start, over, or empty. */
export function reelState(r: Pick<StoryReel, "isActive" | "startsAt" | "endsAt" | "slides">, now = Date.now()): "live" | "off" | "soon" | "over" | "empty" {
  if (!r.slides.length) return "empty";
  if (!r.isActive) return "off";
  if (r.startsAt && Date.parse(r.startsAt) > now) return "soon";
  if (r.endsAt && Date.parse(r.endsAt) <= now) return "over";
  return "live";
}

/** A reel as it's sent (only what the server takes). */
export function inputOf(r: StoryReelInput): StoryReelInput {
  return { title: r.title, cover: r.cover ?? null, slides: r.slides, isActive: r.isActive, startsAt: r.startsAt ?? null, endsAt: r.endsAt ?? null };
}

/** The list with one reel moved up or down (by its index). */
export function moved<T>(list: T[], i: number, by: -1 | 1): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
