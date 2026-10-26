"use client";
/**
 * A slider's buttons (the page tree's `slider` element). The slides are drawn on the
 * server as a row that snaps, so they swipe, scroll and take the keyboard without
 * this. Once the page runs, this adds the arrows, the dots and a pause button, turns
 * the slides by itself every few seconds (not while a pointer is over it, the keyboard
 * is in it, or it's out of sight), plays the clip that is showing (muted) and stops
 * the others. Reduced motion: nothing turns or plays by itself, and nothing glides.
 * Left and right follow the text direction: in Arabic and Hebrew the next slide is
 * to the left.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type SliderWords = { prev: string; next: string; slide: string; pause: string; play: string };

/** The slide whose start is nearest the row's start. */
function shownSlide(track: HTMLElement): number {
  const dir = getComputedStyle(track).direction === "rtl";
  const t = track.getBoundingClientRect();
  let best = 0;
  let gap = Infinity;
  Array.from(track.children).forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const d = Math.abs(dir ? r.right - t.right : r.left - t.left);
    if (d < gap) {
      gap = d;
      best = i;
    }
  });
  return best;
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export function SliderControls({ count, seconds, loop, arrows, dots, words }: { count: number; seconds: number; loop: boolean; arrows: boolean; dots: boolean; words: SliderWords }) {
  const ref = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [at, setAt] = useState(0);
  const [still, setStill] = useState(false); // reduced motion
  const [paused, setPaused] = useState(false); // the pause button
  const [held, setHeld] = useState({ hover: false, focus: false, away: false, hidden: false });
  const hasClip = useRef(false);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".pt-slider");
    const row = root?.querySelector<HTMLElement>(".pt-slides");
    if (!root || !row) return;
    track.current = row;
    hasClip.current = Boolean(row.querySelector("video"));
    root.setAttribute("data-ready", "");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setStill(motion.matches);
    onMotion();
    motion.addEventListener("change", onMotion);
    setAt(shownSlide(row));
    setReady(true);

    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        setAt(shownSlide(row));
      });
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    const hold = (k: keyof typeof held, v: boolean) => setHeld((h) => (h[k] === v ? h : { ...h, [k]: v }));
    const enter = (e: PointerEvent) => e.pointerType === "mouse" && hold("hover", true);
    const leave = () => hold("hover", false);
    const focusIn = () => hold("focus", true);
    const focusOut = (e: FocusEvent) => !root.contains(e.relatedTarget as Node | null) && hold("focus", false);
    const seen = () => hold("hidden", document.visibilityState === "hidden");
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("focusin", focusIn);
    root.addEventListener("focusout", focusOut);
    document.addEventListener("visibilitychange", seen);
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([e]) => hold("away", !e.isIntersecting), { threshold: 0.25 }) : null;
    io?.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", onMotion);
      row.removeEventListener("scroll", onScroll);
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("focusin", focusIn);
      root.removeEventListener("focusout", focusOut);
      document.removeEventListener("visibilitychange", seen);
      io?.disconnect();
      root.removeAttribute("data-ready");
    };
  }, []);

  const go = useCallback(
    (i: number) => {
      const row = track.current;
      const n = row?.children.length ?? 0;
      if (!row || !n) return;
      const to = loop ? (i + n) % n : Math.max(0, Math.min(n - 1, i));
      const slide = row.children[to] as HTMLElement;
      const rtl = getComputedStyle(row).direction === "rtl";
      const [s, t] = [slide.getBoundingClientRect(), row.getBoundingClientRect()];
      // To a place, not by a step: a step stops at every slide on the way (scroll-snap-stop), so a jump of several or round to the first would end early.
      row.scrollTo({ left: row.scrollLeft + (rtl ? s.right - t.right : s.left - t.left), behavior: (still ? "instant" : "smooth") as ScrollBehavior });
      setAt(to);
    },
    [loop, still],
  );

  // Turning by itself: a whole wait after every change, and only while nobody is looking closer.
  const turning = ready && seconds > 0 && count > 1 && !still && !paused;
  const waiting = held.hover || held.focus || held.away || held.hidden;
  useEffect(() => {
    if (!turning || waiting || (!loop && at >= count - 1)) return;
    const t = window.setTimeout(() => go(at + 1), seconds * 1000);
    return () => window.clearTimeout(t);
  }, [turning, waiting, at, count, loop, seconds, go]);

  // The clip that shows plays (muted); the rest wait. The next picture starts loading.
  useEffect(() => {
    const row = track.current;
    if (!ready || !row) return;
    Array.from(row.children).forEach((slide, i) => {
      const v = slide.querySelector("video");
      if (!v) return;
      const play = i === at && !still && !paused && !held.away && !held.hidden;
      v.muted = true;
      if (still && !v.closest("a")) v.controls = true;
      if (play) void v.play().catch(() => undefined);
      else v.pause();
    });
    const next = row.children[at + 1]?.querySelector("img");
    if (next && next.loading === "lazy") next.loading = "eager";
  }, [ready, at, still, paused, held.away, held.hidden]);

  const showPause = ready && !still && ((seconds > 0 && count > 1) || hasClip.current);
  return (
    <div ref={ref} className="pt-slider-ui">
      {ready && arrows && count > 1 ? (
        <>
          <button type="button" className="pt-slider-arrow pt-slider-prev" aria-label={words.prev} disabled={!loop && at <= 0} onClick={() => go(at - 1)}>
            <Arrow />
          </button>
          <button type="button" className="pt-slider-arrow pt-slider-next" aria-label={words.next} disabled={!loop && at >= count - 1} onClick={() => go(at + 1)}>
            <Arrow />
          </button>
        </>
      ) : null}
      {ready && dots && count > 1 ? (
        <div className="pt-slider-dots">
          {Array.from({ length: count }, (_, i) => (
            <button key={i} type="button" className="pt-slider-dot" aria-label={`${words.slide} ${i + 1}`} aria-current={i === at ? "true" : undefined} onClick={() => go(i)} />
          ))}
        </div>
      ) : null}
      {showPause ? (
        <button type="button" className="pt-slider-pause" aria-label={paused ? words.play : words.pause} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paused ? <path d="M8 5.5v13l10.5-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}</svg>
        </button>
      ) : null}
    </div>
  );
}
