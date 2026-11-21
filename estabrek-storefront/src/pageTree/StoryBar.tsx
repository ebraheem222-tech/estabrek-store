"use client";
/**
 * The page editor's story bar (props: look, size, names): the store's story circles in a row (admin → القصص), the
 * ones not seen yet first with a coloured ring. Pressed, a circle plays full screen: its pictures and clips one after
 * another with a line for each at the top, its words, and a button to its product or link. Tapping the far side goes
 * on, the near side back (the page's direction); holding pauses; swiping down or Escape closes; sideways goes to the
 * next circle; after the last slide the next circle plays. The browser tells the store a circle was opened and a
 * button pressed (sendBeacon), and remembers which it saw to the end. Drawn on the server first (the row of circles);
 * in the editor's frame the circles don't open, so the bar can be picked like anything else.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { STORY_SECONDS, storyProductIds, storyReelsOf, storyViews, unseenFirst, type StoryProduct, type StoryReelView } from "./storyData";

const SEEN_KEY = "pt-stories-seen";
const inStudio = () => window.parent !== window && /\/studio-frame/.test(window.location.pathname);
const lessMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export type StoryWords = { label: string; open: string; close: string; prev: string; next: string; pause: string; play: string; sound: string; mute: string; shopThis: string; empty: string; seen: string };

function readSeen(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") as Record<string, string>; } catch { return {}; }
}
function markSeen(r: StoryReelView) {
  try {
    const seen = readSeen();
    seen[r.id] = r.version;
    const keys = Object.keys(seen);
    if (keys.length > 80) for (const k of keys.slice(0, keys.length - 80)) delete seen[k];
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch { /* no storage */ }
}
function tell(id: string, event: "view" | "tap") {
  try { navigator.sendBeacon?.(`${apiBaseClient()}/storefront/stories/${encodeURIComponent(id)}/${event}`); } catch { /* never in the way */ }
}

/**
 * The bar. `reels` are drawn by the server for the page; null where the page didn't fetch them (a header drawn on its
 * own): then they're fetched here, with the page's language and its links' prefix.
 */
export function StoryBar({ reels: given, only, look, size, names, lang, main, prefix, words }: {
  reels: StoryReelView[] | null; only?: string[]; look: "circles" | "rounded" | "cards"; size: "s" | "m" | "l"; names: boolean;
  lang: string; main: string; prefix: string; words: StoryWords;
}) {
  const [reels, setReels] = useState<StoryReelView[] | null>(given);
  const [seen, setSeen] = useState<Record<string, string>>({});
  // The circles in the order they had when one was opened: a circle seen to its end moves back in the row, never
  // under the player.
  const [playing, setPlaying] = useState<{ reels: StoryReelView[]; start: number } | null>(null);
  const [studio, setStudio] = useState(false);
  useEffect(() => { setSeen(readSeen()); setStudio(inStudio()); }, []);
  useEffect(() => {
    if (given) return void setReels(given);
    let gone = false;
    (async () => {
      try {
        const base = apiBaseClient();
        const raw = storyReelsOf(await (await fetch(`${base}/storefront/stories`)).json());
        const ids = storyProductIds(raw);
        const products: Record<string, StoryProduct> = {};
        if (ids.length) {
          const res = await fetch(`${base}/catalog/products/by-ids`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, lite: true }) });
          const json = res.ok ? await res.json() : null;
          const items = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
          for (const p of items) if (p?.id && p.slug) products[p.id] = { slug: p.slug, title: String(p.title ?? ""), image: p.primaryImageUrl ?? null };
        }
        const link = (path: string) => (path.startsWith("/") ? `${prefix}${path}` : path);
        if (!gone) setReels(storyViews(raw, products, { lang, main, link, shopThis: words.shopThis, only }));
      } catch {
        if (!gone) setReels([]);
      }
    })();
    return () => { gone = true; };
  }, [given, only, lang, main, prefix, words.shopThis]);

  const ordered = reels ? unseenFirst(reels, seen) : [];
  const done = useCallback((r: StoryReelView) => { markSeen(r); setSeen(readSeen()); }, []);
  if (reels && !reels.length) return studio ? <p className="pt-sb-empty">{words.empty}</p> : null;
  return (
    <>
      <div className={`pt-sb pt-sb-${look} pt-sb-${size}`} role="list" aria-label={words.label}>
        {(reels ? ordered : []).map((r, i) => {
          const isSeen = seen[r.id] !== undefined && seen[r.id] === r.version;
          return (
            <div key={r.id} role="listitem" className="pt-sb-item">
              <button
                type="button" className={`pt-sb-ring${isSeen ? " pt-sb-seen" : ""}`} data-story={r.id}
                aria-label={`${words.open}: ${r.title || words.label}${isSeen ? ` (${words.seen})` : ""}`}
                onClick={() => { if (!studio) setPlaying({ reels: ordered, start: i }); }}
              >
                <span className="pt-sb-pic">
                  {r.cover ? <img src={r.cover} alt="" loading="lazy" decoding="async" /> : <span className="pt-sb-blank" aria-hidden="true">{r.title.slice(0, 1)}</span>}
                </span>
                {look === "cards" && r.title ? <span className="pt-sb-on">{r.title}</span> : null}
              </button>
              {names && look !== "cards" && r.title ? <span className="pt-sb-name" aria-hidden="true">{r.title}</span> : null}
            </div>
          );
        })}
      </div>
      {playing ? <StoryViewer reels={playing.reels} start={playing.start} words={words} onDone={done} onClose={() => setPlaying(null)} /> : null}
    </>
  );
}

/** The full-screen player. */
function StoryViewer({ reels, start, words, onDone, onClose }: { reels: StoryReelView[]; start: number; words: StoryWords; onDone: (r: StoryReelView) => void; onClose: () => void }) {
  const box = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const fill = useRef<HTMLSpanElement | null>(null);
  const [at, setAt] = useState({ reel: start, slide: 0 });
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const reel = reels[at.reel];
  const slide = reel?.slides[at.slide];
  // Progress of the slide shown, 0…1 (kept here so a pause carries on from where it was).
  const progress = useRef(0);
  const told = useRef(new Set<string>());

  useEffect(() => {
    const d = box.current;
    if (d && !d.open) d.showModal();
    const was = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = was; };
  }, []);
  // The circle was opened: told once per opening.
  useEffect(() => {
    if (!reel || told.current.has(reel.id)) return;
    told.current.add(reel.id);
    tell(reel.id, "view");
  }, [reel]);

  // Kept in a ref: the bar draws again (a circle marked seen) and its new callback mustn't restart the clock.
  const closed = useRef(onClose);
  closed.current = onClose;
  const close = useCallback(() => { box.current?.close(); closed.current(); }, []);
  const go = useCallback((by: 1 | -1) => {
    progress.current = 0;
    setAt((now) => {
      const r = reels[now.reel];
      if (by === 1) {
        if (now.slide + 1 < r.slides.length) return { reel: now.reel, slide: now.slide + 1 };
        onDone(r);
        if (now.reel + 1 < reels.length) return { reel: now.reel + 1, slide: 0 };
        queueMicrotask(close);
        return now;
      }
      if (now.slide > 0) return { reel: now.reel, slide: now.slide - 1 };
      if (now.reel > 0) return { reel: now.reel - 1, slide: 0 };
      return { reel: now.reel, slide: 0 };
    });
  }, [reels, onDone, close]);
  const jumpReel = useCallback((by: 1 | -1) => {
    progress.current = 0;
    setAt((now) => {
      const to = now.reel + by;
      if (to < 0) return now;
      if (to >= reels.length) { onDone(reels[now.reel]); queueMicrotask(close); return now; }
      if (by === 1) onDone(reels[now.reel]);
      return { reel: to, slide: 0 };
    });
  }, [reels, onDone, close]);

  // The clock: a picture's seconds, a clip's own length (at most a minute); the line at the top fills with it.
  useEffect(() => {
    if (!slide) return;
    let frame = 0;
    let last = performance.now();
    const length = slide.kind === "image" ? slide.seconds * 1000 : 0;
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      if (!paused) {
        if (slide.kind === "image") progress.current += dt / length;
        else {
          const v = video.current;
          progress.current = v && v.duration ? Math.min(v.currentTime, STORY_SECONDS.video) / Math.min(v.duration, STORY_SECONDS.video) : progress.current;
        }
      }
      fill.current?.style.setProperty("--pt-sv-p", String(Math.min(1, progress.current)));
      // A picture's time is up; a clip goes on at its end (onEnded), or at a minute when it's longer.
      const v = video.current;
      if (slide.kind === "image" ? progress.current >= 1 : Boolean(v && v.duration > STORY_SECONDS.video && v.currentTime >= STORY_SECONDS.video)) return void go(1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [slide, paused, go]);
  // A clip plays and pauses with the player; the next picture is fetched ahead.
  useEffect(() => {
    const v = video.current;
    if (v) { if (paused) v.pause(); else void v.play().catch(() => undefined); }
  }, [paused, slide]);
  useEffect(() => {
    const next = reel?.slides[at.slide + 1] ?? reels[at.reel + 1]?.slides[0];
    if (next?.kind === "image") { const img = new Image(); img.src = next.src; }
  }, [at, reel, reels]);
  // Keys: the arrows go back and on (the page's direction), the space bar pauses; Escape closes (the dialog's own).
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "ArrowRight") go(rtl ? -1 : 1);
      else if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
      // The space bar on a focused button is that button's own press.
      else if (e.key === " ") { if ((e.target as Element | null)?.closest?.("button,a")) return; setPaused((p) => !p); }
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", keys);
    return () => removeEventListener("keydown", keys);
  }, [go]);

  // A press: held → paused while held; a short one on the far side → on, the near side → back; a swipe → down closes,
  // sideways → another circle.
  const press = useRef<{ x: number; y: number; t: number; held: boolean; timer: number } | null>(null);
  const down = (e: ReactPointerEvent) => {
    if ((e.target as Element).closest("a,button")) return;
    const timer = window.setTimeout(() => { if (press.current) { press.current.held = true; setPaused(true); } }, 220);
    press.current = { x: e.clientX, y: e.clientY, t: Date.now(), held: false, timer };
  };
  const up = (e: ReactPointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.held) return void setPaused(false);
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) return close();
    const rtl = document.documentElement.dir === "rtl";
    if (Math.abs(dx) > 60) return jumpReel((dx < 0) !== rtl ? 1 : -1);
    // The page's start side (a third of it) goes back, the rest goes on.
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const across = (e.clientX - r.left) / r.width;
    go((rtl ? 1 - across : across) < 0.35 ? -1 : 1);
  };

  if (!reel || !slide) return null;
  return (
    <dialog ref={box} className="pt-sv" aria-label={reel.title || words.label} onClose={onClose} onCancel={(e) => { e.preventDefault(); close(); }}>
      <div className={`pt-sv-stage${lessMotion() ? " pt-sv-still" : ""}`} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { if (press.current) clearTimeout(press.current.timer); press.current = null; setPaused(false); }}>
        {/* Behind the picture: itself, blurred, so a picture of any shape fills the screen. */}
        <div className="pt-sv-back" aria-hidden="true" style={{ backgroundImage: `url("${(slide.kind === "image" ? slide.src : slide.poster) ?? ""}")` }} />
        {slide.kind === "image"
          ? <img key={slide.id} className="pt-sv-media" src={slide.src} alt={slide.caption || reel.title} />
          : <video key={slide.id} ref={video} className="pt-sv-media" src={slide.src} poster={slide.poster ?? undefined} muted={muted} playsInline autoPlay preload="auto" onEnded={() => go(1)} aria-label={slide.caption || reel.title} />}
        <div className="pt-sv-top">
          <div className="pt-sv-lines" aria-hidden="true">
            {reel.slides.map((s, i) => (
              <span key={s.id} className="pt-sv-line"><span ref={i === at.slide ? fill : undefined} className="pt-sv-fill" style={{ "--pt-sv-p": i < at.slide ? 1 : 0 } as React.CSSProperties} /></span>
            ))}
          </div>
          <div className="pt-sv-head">
            <span className="pt-sv-who">
              {reel.cover ? <img src={reel.cover} alt="" /> : null}
              <span>{reel.title}</span>
            </span>
            <span className="pt-sv-tools">
              {slide.kind === "video" ? <button type="button" className="pt-sv-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? words.sound : words.mute}>{muted ? "🔇" : "🔊"}</button> : null}
              <button type="button" className="pt-sv-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? words.play : words.pause}>{paused ? "▶" : "❚❚"}</button>
              <button type="button" className="pt-sv-btn" onClick={close} aria-label={words.close}>✕</button>
            </span>
          </div>
        </div>
        <div className="pt-sv-bottom">
          {slide.caption ? <p className="pt-sv-caption">{slide.caption}</p> : null}
          {slide.link ? (
            <a className="pt-sv-link" href={slide.link.href} onClick={() => tell(reel.id, "tap")} {...(/^https?:/i.test(slide.link.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {slide.link.product?.image ? <img src={slide.link.product.image} alt="" /> : null}
              <span className="pt-sv-link-words">
                {slide.link.product ? <small>{slide.link.product.title}</small> : null}
                <strong>{slide.link.label}</strong>
              </span>
            </a>
          ) : null}
        </div>
        <span className="pt-sr" aria-live="polite">{`${at.slide + 1} / ${reel.slides.length}`}</span>
        <button type="button" className="pt-sr" onClick={() => go(-1)}>{words.prev}</button>
        <button type="button" className="pt-sr" onClick={() => go(1)}>{words.next}</button>
      </div>
    </dialog>
  );
}
