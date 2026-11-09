"use client";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";

export type RingPiece = { slug: string; title: string; image: string };

/*
 * The shop's own pieces on a 3D ring turning slowly around the opening's arch (rose-showcase.css): drag it to
 * turn it faster or back, it settles to its own pace again; a tap opens the piece. It rests while it is off
 * screen, and stands still for shoppers who ask for less motion.
 */
export function RoseShopRing({ pieces, label }: { pieces: RingPiece[]; label: string }) {
  const ring = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    const el = ring.current;
    if (!el || pieces.length < 3) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pace = reduced ? 0 : 6; // degrees a second
    let angle = 0;
    let velocity = pace;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let drag: null | { id: number; x: number; angle: number; lastX: number; lastT: number; v: number } = null;
    const apply = () => el.style.setProperty("--ring-turn", `${angle.toFixed(2)}deg`);
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!drag) {
        velocity += (pace - velocity) * Math.min(1, dt * 1.2);
        angle += velocity * dt;
        apply();
      }
      raf = visible && (!reduced || drag || Math.abs(velocity) > 0.05) ? requestAnimationFrame(frame) : 0;
    };
    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    io.observe(el);

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, angle, lastX: e.clientX, lastT: performance.now(), v: 0 };
      moved.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6 && !moved.current) {
        moved.current = true;
        el.setPointerCapture?.(e.pointerId);
        el.dataset.dragging = "true";
      }
      if (!moved.current) return;
      const now = performance.now();
      angle = drag.angle + dx * 0.32;
      drag.v = ((e.clientX - drag.lastX) * 0.32) / Math.max(0.008, (now - drag.lastT) / 1000);
      drag.lastX = e.clientX;
      drag.lastT = now;
      apply();
      wake();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (moved.current) velocity = Math.max(-240, Math.min(240, drag.v));
      drag = null;
      delete el.dataset.dragging;
      wake();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    wake();
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [pieces.length]);

  if (pieces.length < 3) return null;
  return (
    <div className="rose-ring" ref={ring} role="group" aria-label={label} style={{ "--ring-n": pieces.length } as CSSProperties}
      // A drag turns the ring; it doesn't open the piece under the finger.
      onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; } }}>
      {pieces.map((piece, i) => (
        <Link key={piece.slug} href={`/p/${piece.slug}`} className="rose-ring-piece" style={{ "--i": i } as CSSProperties} draggable={false}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={piece.image} alt={piece.title} loading="lazy" draggable={false} />
        </Link>
      ))}
    </div>
  );
}
