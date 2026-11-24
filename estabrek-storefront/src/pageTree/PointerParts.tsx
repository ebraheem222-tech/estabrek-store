"use client";
/**
 * Pointer and scroll tricks from the theme library (its Premium "Scroll-speed Marquee", "Flashlight Reveal" and
 * "Cursor Image Trail"), as the page tree's own:
 * - MarqueeSpeed: words running along a line (blocks.tsx) run faster the faster the page scrolls, turn round when it
 *   scrolls up, and lean with the speed;
 * - FlashReveal: a picture's second picture, seen through a light that follows the pointer (wandering by itself
 *   when the pointer is elsewhere); a press widens it;
 * - TrailView: pictures left along the pointer's way over a section, each popping in and fading.
 * Nothing moves for whoever asked for less motion (the trail, the speed); the flashlight then stays still.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

const calm = () => typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

/** `target`: the marquee's node id (it is drawn beside it). */
export function MarqueeSpeed({ target }: { target: string }) {
  useEffect(() => {
    const host = document.querySelector<HTMLElement>(`[data-tree-node="${CSS.escape(target)}"]`);
    const track = host?.querySelector<HTMLElement>(".pt-mq-track");
    if (!host || !track || calm()) return;
    host.dataset.ptMqSpeed = "on";
    let last = window.scrollY, lastT = performance.now(), v = 0, dir = 1, raf = 0, near = false;
    const tick = () => {
      raf = 0;
      const now = performance.now(), y = window.scrollY;
      const inst = ((y - last) / Math.max(1, now - lastT)) * 1000;
      last = y;
      lastT = now;
      v += (inst - v) * 0.15;
      const factor = Math.max(-5, Math.min(5, v / 200));
      if (factor < -0.1) dir = -1;
      else if (factor > 0.1) dir = 1;
      for (const a of track.getAnimations()) a.playbackRate = dir * (1 + Math.abs(factor));
      host.style.transform = Math.abs(v) > 20 ? `skewX(${Math.max(-14, Math.min(14, -v / 180)).toFixed(2)}deg)` : "";
      if (near) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      near = e.isIntersecting;
      if (near && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(host);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      host.style.removeProperty("transform");
      for (const a of track.getAnimations()) a.playbackRate = 1;
      delete host.dataset.ptMqSpeed;
    };
  }, [target]);
  return null;
}

export function FlashReveal({ src, radius }: { src: string; radius: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const still = calm();
    let w = host.clientWidth, h = host.clientHeight;
    let tx = w / 2, ty = h / 2, x = tx, y = ty, r = radius, tr = radius, inside = false, raf = 0, near = false;
    const put = () => {
      el.style.setProperty("--pt-fl-x", `${x.toFixed(1)}px`);
      el.style.setProperty("--pt-fl-y", `${y.toFixed(1)}px`);
      el.style.setProperty("--pt-fl-r", `${r.toFixed(1)}px`);
    };
    const loop = (t: number) => {
      raf = 0;
      w = host.clientWidth;
      h = host.clientHeight;
      if (!inside && !still) {
        tx = w / 2 + Math.cos(t / 1400) * w * 0.32;
        ty = h / 2 + Math.sin(t / 900) * h * 0.28;
      }
      x += (tx - x) * 0.15;
      y += (ty - y) * 0.15;
      r += (tr - r) * 0.2;
      put();
      if (near && (!still || inside)) raf = requestAnimationFrame(loop);
    };
    const go = () => { if (!raf && near) raf = requestAnimationFrame(loop); };
    const onMove = (e: PointerEvent) => {
      const b = host.getBoundingClientRect();
      inside = true;
      tx = e.clientX - b.left;
      ty = e.clientY - b.top;
      go();
    };
    const onLeave = () => { inside = false; go(); };
    const onDown = () => { tr = radius * 1.8; go(); };
    const onUp = () => { tr = radius; go(); };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    const io = new IntersectionObserver(([e]) => { near = e.isIntersecting; go(); });
    io.observe(host);
    put();
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [radius]);
  return (
    <span ref={ref} className="pt-flash" aria-hidden="true" data-pt-flash="">
      <img src={src} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

type Tile = { id: number; x: number; y: number; src: string; rot: number };

export function TrailView({ images, size }: { images: string[]; size: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host || !images.length || calm()) return;
    let last: { x: number; y: number } | null = null;
    let n = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (last && Math.hypot(x - last.x, y - last.y) < Math.max(60, size * 0.6)) return;
      last = { x, y };
      const id = ++n;
      setTiles((t) => [...t.slice(-13), { id, x, y, src: images[id % images.length], rot: ((id * 47) % 40) - 20 }]);
      const timer = setTimeout(() => {
        timers.delete(timer);
        setTiles((t) => t.filter((k) => k.id !== id));
      }, 1100);
      timers.add(timer);
    };
    host.addEventListener("pointermove", onMove);
    return () => {
      host.removeEventListener("pointermove", onMove);
      for (const t of timers) clearTimeout(t);
    };
  }, [images, size]);
  return (
    <div ref={ref} className="pt-trail" aria-hidden="true" data-pt-trail={tiles.length}>
      {tiles.map((t) => (
        <img key={t.id} className="pt-trail-tile" src={t.src} alt="" decoding="async" style={{ left: t.x, top: t.y, width: size, height: Math.round(size * 1.28), "--pt-tr": `${t.rot}deg` } as CSSProperties} />
      ))}
    </div>
  );
}
