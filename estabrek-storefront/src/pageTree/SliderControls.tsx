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
import { animateSlider, bindSliderInput, scrollSlider, sliderSettings, type SliderSettings } from "./sliderEffects";
const DEFAULT_SETTINGS = sliderSettings();

export type SliderWords = { prev: string; next: string; slide: string; pause: string; play: string };

/** The slide whose start is nearest the row's start. */
function shownSlide(track: HTMLElement, vertical = false): number {
  const dir = getComputedStyle(track).direction === "rtl";
  const t = track.getBoundingClientRect();
  let best = 0;
  let gap = Infinity;
  Array.from(track.children).forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const d = Math.abs(vertical ? r.top - t.top : dir ? r.right - t.right : r.left - t.left);
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

export function SliderControls({ count, seconds, loop, arrows, dots, words, settings = DEFAULT_SETTINGS, slides = [] }: { count: number; seconds: number; loop: boolean; arrows: boolean; dots: boolean; words: SliderWords; settings?: SliderSettings; slides?: Array<{ src: string; kind: "image" | "video"; label: string }> }) {
  const ref = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [at, setAt] = useState(0);
  const [still, setStill] = useState(false); // reduced motion
  const [paused, setPaused] = useState(false); // the pause button
  const [held, setHeld] = useState({ hover: false, focus: false, away: false, hidden: false });
  const hasClip = useRef(false);
  const current = useRef(0);
  const previous = useRef(0);
  const scrollCleanup = useRef<() => void>(() => {});
  const enhanced = settings.effect !== "slide";
  const vertical = settings.axis === "y";

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".pt-slider");
    const row = root?.querySelector<HTMLElement>(".pt-slides");
    if (!root || !row) return;
    track.current = row;
    hasClip.current = Boolean(row.querySelector("video"));
    root.setAttribute("data-ready", "");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => { if (motion.matches) scrollCleanup.current(); setStill(motion.matches); };
    onMotion();
    motion.addEventListener("change", onMotion);
    current.current = shownSlide(row, vertical);
    setAt(current.current);
    setReady(true);

    let frame = 0;
    const onScroll = () => {
      if (enhanced || row.hasAttribute("data-scrolling")) return;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        current.current = shownSlide(row, vertical);
        setAt(current.current);
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
    seen();
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
      scrollCleanup.current();
      root.removeAttribute("data-ready");
      root.removeAttribute("data-enhanced");
      root.removeAttribute("data-at");
      Array.from(row.children).forEach((child) => {
        const slide = child as HTMLElement;
        slide.inert = false; slide.removeAttribute("aria-hidden"); delete slide.dataset.sliderActive;
        ["transform", "opacity", "z-index", "visibility", "transition"].forEach((key) => slide.style.removeProperty(key));
        slide.querySelectorAll("video").forEach((v) => v.pause());
      });
    };
  }, [count, vertical, enhanced]);

  const go = useCallback(
    (i: number) => {
      const row = track.current;
      const n = row?.children.length ?? 0;
      if (!row || !n) return;
      const to = loop ? (i + n) % n : Math.max(0, Math.min(n - 1, i));
      if (enhanced && to !== current.current && row.children[current.current]?.contains(document.activeElement)) row.focus({ preventScroll: true });
      current.current = to;
      setAt(to);
      if (enhanced) return;
      const slide = row.children[to] as HTMLElement;
      const rtl = getComputedStyle(row).direction === "rtl";
      const [s, t] = [slide.getBoundingClientRect(), row.getBoundingClientRect()];
      // To a place, not by a step: a step stops at every slide on the way (scroll-snap-stop), so a jump of several or round to the first would end early.
      scrollCleanup.current();
      scrollCleanup.current = scrollSlider(row, vertical ? row.scrollTop + s.top - t.top : row.scrollLeft + (rtl ? s.right - t.right : s.left - t.left), settings, still);
    },
    [loop, still, enhanced, vertical, settings],
  );

  useEffect(() => {
    const row = track.current;
    if (!ready || !row) return;
    const root = row.closest<HTMLElement>(".pt-slider");
    if (root) root.dataset.at = String(at);
    if (!enhanced) return;
    const cleanup = animateSlider(row, previous.current, at, settings, loop, still);
    root?.setAttribute("data-enhanced", "");
    previous.current = at;
    return cleanup;
  }, [ready, at, settings, loop, still, enhanced]);

  useEffect(() => {
    const row = track.current;
    const root = row?.closest<HTMLElement>(".pt-slider");
    if (!ready || !root || !row) return;
    return bindSliderInput(root, row, settings, () => current.current, go, loop);
  }, [ready, settings, go, loop]);

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
      v.controls = still && !v.closest("a");
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
      {ready && settings.thumbnails && count > 1 ? <div className="pt-slider-thumbs" role="group" aria-label={words.slide}>{slides.map((s, i) => <button key={i} type="button" className="pt-slider-thumb" aria-label={`${words.slide} ${i + 1}${s.label ? `: ${s.label}` : ""}`} aria-current={i === at ? "true" : undefined} onClick={() => go(i)}>{s.kind === "image" ? <img src={s.src} alt="" loading="lazy" draggable={false} /> : <span aria-hidden="true">▶</span>}</button>)}</div> : null}
      {ready && settings.progress ? <div className="pt-slider-progress" role="progressbar" aria-label={words.slide} aria-valuemin={1} aria-valuemax={count} aria-valuenow={at + 1}><span key={`${at}-${waiting}-${paused}-${still}`} className={turning && (loop || at < count - 1) ? "pt-slider-timer" : undefined} style={turning && (loop || at < count - 1) ? { animationDuration: `${seconds}s`, animationPlayState: waiting ? "paused" : "running" } : { width: `${(at + 1) / count * 100}%` }} /></div> : null}
      {ready ? <span className="pt-slider-status" aria-live={turning && !waiting ? "off" : "polite"} aria-atomic="true">{words.slide} {at + 1} / {count}</span> : null}
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
